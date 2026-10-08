import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Model is configurable via GEMINI_MODEL. The default is Google's auto-updating Flash alias, because
// pinned versions get retired (gemini-2.0-flash started returning 404, which silently forced the
// generic fallback questions).
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";

const generationConfig = {
  temperature: 0.7,
  topP: 1,
  topK: 32,
  // Newer Flash models spend part of this budget on internal reasoning, so 2000 could cut the JSON short
  maxOutputTokens: 8192,
  // Every call here expects a JSON object back
  responseMimeType: "application/json",
};

// Models to try in order. If one is overloaded (503), retired (404) or hangs, the next one is used
// before giving up and falling back to the generic questions. The last entry is a fast "lite" model
// that stays available when the bigger ones are under heavy demand.
const MODEL_CHAIN = Array.from(
  new Set([GEMINI_MODEL, "gemini-3.5-flash", "gemini-flash-lite-latest"])
);

const REQUEST_TIMEOUT = 40_000; // one call; a hung model must not use up the whole budget
const TOTAL_DEADLINE = 120_000; // all attempts together, so the user isn't left waiting indefinitely
const RETRY_DELAY = 2000;
// Rate limits and transient server errors are worth one more try on the same model.
// Overload (503), retirement (404) and timeouts move on to the next model instead.
const RETRY_SAME_MODEL_STATUSES = [429, 500];

// Models that recently failed (overloaded, timed out, retired) are skipped for a while instead of
// being waited on again on every call. Lives in server memory, so it resets on restart.
const UNHEALTHY_FOR_MS = 5 * 60_000;
const unhealthyUntil = new Map<string, number>();
const markUnhealthy = (modelName: string, error: any) => {
  const retired = error?.status === 404;
  unhealthyUntil.set(modelName, Date.now() + (retired ? 60 * 60_000 : UNHEALTHY_FOR_MS));
};

/**
 * Calls Gemini, retrying transient errors and falling through MODEL_CHAIN when a model is unusable.
 */
const generateWithFallback = async (prompt: string) => {
  const startedAt = Date.now();
  let lastError: any;

  // Healthy models first, in chain order; recently failed ones only as a last resort
  const now = Date.now();
  const healthy = MODEL_CHAIN.filter((m) => (unhealthyUntil.get(m) ?? 0) <= now);
  const models = [...healthy, ...MODEL_CHAIN.filter((m) => !healthy.includes(m))];

  for (const modelName of models) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      const remaining = TOTAL_DEADLINE - (Date.now() - startedAt);
      if (remaining <= 1000) {
        throw lastError ?? new Error("Gemini request deadline exceeded");
      }

      const model = genAI.getGenerativeModel(
        { model: modelName, generationConfig },
        { timeout: Math.min(REQUEST_TIMEOUT, remaining) }
      );

      try {
        const result = await model.generateContent(prompt);
        unhealthyUntil.delete(modelName);
        if (modelName !== MODEL_CHAIN[0]) console.log(`Gemini: succeeded with fallback model ${modelName}`);
        return result;
      } catch (error: any) {
        lastError = error;
        const status = error?.status;
        console.warn(`Gemini ${modelName} attempt ${attempt} failed (${status ?? error?.name ?? "error"})`);

        if (attempt === 1 && RETRY_SAME_MODEL_STATUSES.includes(status)) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
          continue;
        }
        markUnhealthy(modelName, error);
        break; // try the next model
      }
    }
  }

  throw lastError ?? new Error("All Gemini models failed");
};

interface GeneratedQuestions {
  questions: string[];
}

interface AnalysisResult {
  score: number;
  technicalFeedback: string;
  communicationFeedback: string;
  improvementSuggestions: string[];
  idealAnswer?: string;
}

interface LearningResource {
  title: string;
  url: string;
  type: 'article' | 'video' | 'course' | 'documentation' | 'tutorial' | 'forum';
  description: string;
}

interface FeedbackResult {
  overallFeedback: string;
  strengths: string[];
  areasForImprovement: string[];
  nextSteps: string[];
}

export const generateInterviewQuestions = async (
  context: string
): Promise<string[]> => {
  try {
    const prompt = `You are an expert technical interviewer. Generate 15 interview questions based on the provided context:

${context}

GUIDELINES:

1. SOURCE PRIORITY:
   - If resume content is provided, generate questions primarily from the resume
   - If no resume but job description/content is provided, use that as the main source
   - If both are provided, combine information from both
   - If neither is provided, generate general technical questions

2. TECHNICAL QUESTIONS (10 total):
   - Must be based on technologies mentioned in resume/description
   - Include questions about specific projects and implementations
   - Cover both breadth and depth of technical knowledge
   - Include 2-3 system design questions if senior role
   - Focus on practical scenarios they might encounter

3. SOFT-SKILL QUESTIONS (5 total):
   - First 3: General behavioral questions
   - Next 2: Role-specific scenarios or resume-based experiences
   - Focus on real workplace situations

4. WHEN RESUME IS PROVIDED:
   - Analyze work history, projects, and skills
   - Ask about specific technologies and experiences mentioned
   - Include questions about their contributions and challenges

5. WHEN ONLY DESCRIPTION/CONTENT IS PROVIDED:
   - Focus on the technologies and requirements mentioned
   - Include scenario-based questions relevant to the role
   - Cover both fundamental and advanced concepts

6. FORMAT REQUIREMENTS:
   - Return ONLY valid JSON: { "questions": ["Q1?", "Q2?", ...] }
   - Exactly 15 questions total
   - Each question must end with "?"
   - No numbering or labels
   - Use double quotes for strings

7. QUALITY CHECKS:
   - No generic questions
   - Questions should be progressive in difficulty
   - Include at least one question about problem-solving approach
   - Ensure technical depth matches the experience level

OUTPUT RULES:
- Only return the JSON object
- No markdown formatting
- No explanations
- No code blocks
- No trailing commas
- Ensure valid JSON

Now generate the questions based on the available content.`;

    const result = await generateWithFallback(prompt);

    const text = await result.response.text();

    // Clean response and parse
    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    const parsed: GeneratedQuestions = JSON.parse(cleaned);

    if (!parsed.questions || !Array.isArray(parsed.questions)) {
      throw new Error("Invalid question format from API");
    }

    return parsed.questions;
  } catch (error) {
    console.error("Error generating questions:", error);
    throw new Error("Failed to generate interview questions");
  }
};

export const analyzeResponse = async (
  question: string,
  answer: string
): Promise<AnalysisResult> => {
  try {
    const prompt = `Analyze this interview response (1-100 score) considering:
      - Technical accuracy (40%)
      - Communication clarity (30%)
      - Problem-solving (20%)
      - Best practices (10%)
      
      Question: ${question}
      Answer: ${answer}
      
      Return valid JSON format:
      {
        "score": number,
        "technicalFeedback": string,
        "communicationFeedback": string,
        "improvementSuggestions": string[],
        "idealAnswer": string
      }
      idealAnswer: a strong sample answer to the question (4-6 sentences), written as the candidate would say it.`;

    // Use retry mechanism for API call
    const result = await generateWithFallback(prompt);

    const text = await result.response.text();

    // Clean and validate response
    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    const parsed: AnalysisResult = JSON.parse(cleaned);

    // Validate response structure
    if (
      typeof parsed.score !== "number" ||
      typeof parsed.technicalFeedback !== "string" ||
      typeof parsed.communicationFeedback !== "string" ||
      !Array.isArray(parsed.improvementSuggestions)
    ) {
      throw new Error("Invalid analysis format from API");
    }
    if (typeof parsed.idealAnswer !== "string" || !parsed.idealAnswer.trim()) delete parsed.idealAnswer;

    return parsed;
  } catch (error) {
    console.error("Error analyzing response:", error);
    throw new Error("Failed to analyze interview response");
  }
};

/**
 * Writes a sample ideal answer for each question (used for questions the candidate skipped, so the
 * analysis page can still show what a good answer looks like). Returns one string per question,
 * "" where none could be generated.
 */
export const generateIdealAnswers = async (questions: string[]): Promise<string[]> => {
  if (questions.length === 0) return [];
  const prompt = `For each of these job interview questions, write a strong sample answer (4-6 sentences),
      written as the candidate would say it.

      Questions:
      ${questions.map((q, i) => `${i + 1}. ${q}`).join("\n      ")}

      Return valid JSON format, with exactly one answer per question, in the same order:
      {
        "answers": string[]
      }`;

  const result = await generateWithFallback(prompt);
  const parsed = JSON.parse(
    (await result.response.text()).replace(/```json/g, "").replace(/```/g, "").trim()
  );
  const answers: unknown[] = Array.isArray(parsed?.answers) ? parsed.answers : [];
  return questions.map((_, i) => (typeof answers[i] === "string" ? (answers[i] as string).trim() : ""));
};

export const generateInterviewFeedback = async (
  interview: any
): Promise<FeedbackResult> => {
  try {
    // Prepare the interview data for the prompt
    const questionsAndAnswers = interview.questions
      .map((q: any, index: number) => {
        return `
      Question ${index + 1}: ${q.text}
      Answer: ${q.answer || "No answer provided"}
      Score: ${q.analysis?.score ?? "N/A"}
      Technical Feedback: ${q.analysis?.technicalFeedback || "N/A"}
      Communication Feedback: ${q.analysis?.communicationFeedback || "N/A"}
      `;
      })
      .join("\n");

    const prompt = `You are an expert technical interviewer providing detailed feedback and learning resources. 
    Generate comprehensive interview feedback based on the following interview for a ${
      interview.jobRole
    } position with ${
      interview.yearsOfExperience
    } years of experience in ${interview.techStack.join(", ")}.
    
    ${questionsAndAnswers}
    
    Provide:
    1. An overall assessment of the candidate's performance
    2. Key strengths demonstrated
    3. Areas needing improvement
    4. Actionable next steps for growth
    
    Return valid JSON format:
    {
      "overallFeedback": "Overall assessment of the interview performance",
      "strengths": ["strength 1", "strength 2"],
      "areasForImprovement": ["area 1", "area 2"],
      "nextSteps": ["actionable step 1", "actionable step 2"],
      "learningResources": {
        "area 1": [
          {
            "title": "Resource Title",
            "url": "https://example.com/resource",
            "type": "article|video|course|documentation|tutorial|forum",
            "description": "Brief description of what the resource covers"
          }
        ]
      }
    }`;

    const result = await generateWithFallback(prompt);

    const text = await result.response.text();

    // Clean and validate response
    const cleaned = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();
    const parsed: FeedbackResult = JSON.parse(cleaned);

    // Validate response structure
    if (
      typeof parsed.overallFeedback !== "string" ||
      !Array.isArray(parsed.strengths) ||
      !Array.isArray(parsed.areasForImprovement) ||
      !Array.isArray(parsed.nextSteps)
    ) {
      throw new Error("Invalid feedback format from API");
    }

    console.log('Processed feedback successfully');

    return parsed;
  } catch (error) {
    console.error("Error generating interview feedback:", error);
    throw new Error("Failed to generate interview feedback");
  }
};

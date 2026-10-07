import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// Configure for Flash model
const generationConfig = {
  temperature: 0.7,
  topP: 1,
  topK: 32,
  maxOutputTokens: 2000,
};

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 2000;

/**
 * Helper function to implement exponential backoff for API calls
 */
const retryWithExponentialBackoff = async <T>(
  fn: () => Promise<T>,
  retries = MAX_RETRIES,
  delay = INITIAL_RETRY_DELAY
): Promise<T> => {
  try {
    return await fn();
  } catch (error: any) {
    // Check if it's a rate limit error (429)
    if (retries > 0 && error?.status === 429) {
      console.log(
        `Rate limit exceeded. Retrying in ${delay}ms... (${retries} retries left)`
      );

      // Wait for the specified delay
      await new Promise((resolve) => setTimeout(resolve, delay));

      // Retry with increased delay (exponential backoff)
      return retryWithExponentialBackoff(fn, retries - 1, delay * 2);
    }

    // If it's not a rate limit error or we've exhausted retries, throw the error
    throw error;
  }
};

interface GeneratedQuestions {
  questions: string[];
}

interface AnalysisResult {
  score: number;
  technicalFeedback: string;
  communicationFeedback: string;
  improvementSuggestions: string[];
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
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig,
    });

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

    const result = await retryWithExponentialBackoff(() =>
      model.generateContent(prompt)
    );

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
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig,
    });

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
        "improvementSuggestions": string[]
      }`;

    // Use retry mechanism for API call
    const result = await retryWithExponentialBackoff(() =>
      model.generateContent(prompt)
    );

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

    return parsed;
  } catch (error) {
    console.error("Error analyzing response:", error);
    throw new Error("Failed to analyze interview response");
  }
};

export const generateInterviewFeedback = async (
  interview: any
): Promise<FeedbackResult> => {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig,
    });

    // Prepare the interview data for the prompt
    const questionsAndAnswers = interview.questions
      .map((q: any, index: number) => {
        return `
      Question ${index + 1}: ${q.text}
      Answer: ${q.answer || "No answer provided"}
      Score: ${q.analysis?.score || "N/A"}
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

    const result = await retryWithExponentialBackoff(() =>
      model.generateContent(prompt)
    );

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

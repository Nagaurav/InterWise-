import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Interview from "@/models/Interview";
import { getUserIdFromToken } from "@/lib/auth";
import { generateInterviewQuestions } from "@/lib/gemini";
import { extractTextFromDocument } from "@/lib/docxExtractor";

// default questions by category for fallback
const DEFAULT_QUESTIONS = {
  frontend: [
    "Explain the difference between localStorage, sessionStorage, and cookies.",
    "What are React hooks and how do they improve component development?",
    "Describe how you would optimize a web application's performance.",
    "Explain the concept of responsive design and how you implement it.",
    "What is the virtual DOM in React and why is it important?",
    "Describe your experience with state management libraries like Redux or Context API.",
  ],
  backend: [
    "Explain RESTful API design principles and best practices.",
    "How do you handle database transactions and ensure data integrity?",
    "Describe your experience with authentication and authorization mechanisms.",
    "How would you design a scalable microservice architecture?",
    "Explain how you would implement error handling in a backend application.",
    "Describe your approach to API security and preventing common vulnerabilities.",
  ],
  fullstack: [
    "Explain how you would structure a full-stack application from frontend to backend.",
    "Describe your experience with API integration between frontend and backend.",
    "How do you handle state management across the full application stack?",
    "Explain your approach to testing in a full-stack application.",
    "Describe your experience with deployment and CI/CD pipelines.",
    "How would you implement real-time features in a full-stack application?",
  ],
  default: [
    "Describe a challenging technical problem you've solved recently.",
    "How do you stay updated with the latest technologies in your field?",
    "Explain your approach to debugging complex issues.",
    "Describe your experience working in agile development environments.",
    "How do you ensure code quality and maintainability?",
    "Describe your experience with version control and collaborative development.",
  ],
};

const getFallBackQuestions = (
  jobRole: string,
  techStack: string[]
): string[] => {
  const role = jobRole.toLowerCase();
  const stack = techStack.map((tech) => tech.toLowerCase());

  if (
    role.includes("frontend") ||
    stack.some((tech) =>
      [
        "react",
        "vue",
        "angular",
        "javascript",
        "typescript",
        "html",
        "css",
      ].includes(tech)
    )
  ) {
    return DEFAULT_QUESTIONS.frontend;
  }

  if (
    role.includes("backend") ||
    stack.some((tech) =>
      [
        "node",
        "express",
        "django",
        "flask",
        "spring",
        "java",
        "python",
        "c#",
        ".net",
      ].includes(tech)
    )
  ) {
    return DEFAULT_QUESTIONS.backend;
  }

  if (
    role.includes("fullstack") ||
    role.includes("full stack") ||
    (stack.some((tech) => ["react", "vue", "angular"].includes(tech)) &&
      stack.some((tech) => ["node", "express", "django"].includes(tech)))
  ) {
    return DEFAULT_QUESTIONS.fullstack;
  }

  return DEFAULT_QUESTIONS.default;
};

export async function POST(req: Request) {
  try {
    await connectDB();

    // get token from authorization header
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : null;

    if (!token) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // get user id from token
    const userId = getUserIdFromToken(token);

    // parse form data
    let formData;
    let jobRole: string;
    let techStack: string[];
    let yearsOfExperience: number;
    let resumeFile: File | null;
    
    try {
      formData = await req.formData();
      jobRole = formData.get("jobRole") as string;
      
      const techStackString = formData.get("techStack") as string;
      techStack = techStackString ? JSON.parse(techStackString) : [];
      
      const yearsString = formData.get("yearsOfExperience") as string;
      yearsOfExperience = yearsString ? JSON.parse(yearsString) : 0;
      
      resumeFile = formData.get("resume") as File | null;
      
      console.log("Form data parsed successfully:", {
        jobRole: jobRole || "(empty)",
        techStack: techStack.length ? techStack : "(empty array)",
        yearsOfExperience,
        resumeFile: resumeFile ? `${resumeFile.name} (${resumeFile.size} bytes)` : "(no file)"
      });
    } catch (parseError) {
      console.error("Error parsing form data:", parseError);
      return NextResponse.json(
        { message: "Invalid form data format" },
        { status: 400 }
      );
    }

    // Check if we have resume text (either from file or pasted)
    let resumeText = (formData.get("resumeText") as string) || "";
    console.log("Initial resume text length:", resumeText.length);
    console.log("Resume text preview:", resumeText ? resumeText.substring(0, 100) + "..." : "(empty)");
    
    // If a file is uploaded, validate it's a PDF and extract text from it
    if (resumeFile && resumeFile.size > 0) {
      console.log(`Processing uploaded document: ${resumeFile.name}, Size: ${resumeFile.size} bytes, Type: ${resumeFile.type}`);
      
      // Validate file type
      const fileType = resumeFile.type.toLowerCase();
      const fileName = resumeFile.name.toLowerCase();
      const isPDF = fileType === 'application/pdf' || fileName.endsWith('.pdf');
      
      if (!isPDF) {
        console.warn(`Rejected non-PDF file: ${resumeFile.name} (${fileType})`);
        return NextResponse.json(
          { message: `Unsupported file type: ${fileType || 'unknown'}. Please upload a PDF document.` },
          { status: 400 }
        );
      }
      
      try {
        const extractedText = await extractTextFromDocument(resumeFile);
        console.log(`Document extraction result: ${extractedText ? extractedText.length : 0} characters extracted`);
        
        if (extractedText && extractedText.trim().length > 0) {
          resumeText = extractedText;
          console.log("Successfully updated resumeText with extracted PDF content");
        } else {
          console.warn("PDF extraction returned empty or invalid text");
          // Set a fallback message to indicate document was processed but no text was extracted
          resumeText = `PDF file processed but no text could be extracted from: ${resumeFile.name} - Please ensure job role and tech stack are filled manually`;
        }
      } catch (error) {
        console.error("Error processing PDF file: ", error);
        // Set a fallback message and continue
        resumeText = `Error processing PDF file (${resumeFile.name}): ${error instanceof Error ? error.message : 'Unknown error'}. Please ensure job role and tech stack are filled manually.`;
      }
    } else if (resumeFile) {
      console.log("Resume file provided but has 0 size");
    } else {
      console.log("No resume file provided, using pasted text only");
    }

    // Validate: either we have manual fields OR we have resume content
    const hasResume = resumeText && resumeText.trim().length > 0;
    const hasManualFields = jobRole && jobRole.trim() && techStack && techStack.length > 0;
    
    if (!hasResume && !hasManualFields) {
      return NextResponse.json(
        { message: "Please provide either a resume or fill in the job role and tech stack fields" },
        { status: 400 }
      );
    }

    // Create context for question generation based on available information
    let context: string;
    
    if (hasResume && !hasManualFields) {
      // Generate questions based solely on resume content
      context = `RESUME CONTENT:
      ${resumeText}
      
      INSTRUCTIONS:
      You are an expert technical interviewer analyzing a candidate's resume. Generate 15 interview questions STRICTLY based on the resume content above.
      
      REQUIREMENTS:
      1. ALL questions MUST be directly based on the resume content
      2. First 3 questions: Soft-skill questions about their work experience and projects
      3. Next 7 questions: Technical questions about specific skills, tools, and technologies mentioned
      4. Next 2 questions: Behavioral questions based on their work history and achievements
      5. Final 3 questions: In-depth technical questions about their most prominent projects
      
      FOCUS ON:
      - Specific technologies and frameworks mentioned
      - Work experience details
      - Projects listed
      - Education and certifications
      - Any achievements or special mentions
      
      IMPORTANT:
      - Do NOT generate generic questions
      - Every question must be traceable to specific content in the resume
      - If the resume mentions specific projects, ask about their role and contributions
      - For technical skills, ask specific questions that test their claimed expertise
      `;
    } else if (hasManualFields && !hasResume) {
      // Generate questions based on manual fields only
      context = `
      Job Role: ${jobRole}
      Tech Stack: ${techStack.join(", ")}
      Years of Experience: ${yearsOfExperience}
      
      Instructions for generating questions:
      1. First 3 questions should be soft-skill questions (behavioral, problem-solving, teamwork)
      2. Next 7 questions should be technical questions based on the job role and tech stack
      3. Include 2 more soft-skill questions (communication, leadership, etc.)
      4. Final 3 questions should be more advanced technical questions
      5. Generate general questions based on the job role and tech stack
      `;
    } else {
      // Both resume and manual fields are available
      context = `
      Job Role: ${jobRole}
      Tech Stack: ${techStack.join(", ")}
      Years of Experience: ${yearsOfExperience}
      
      Resume/Candidate Information:
      ${resumeText}
      
      Instructions for generating questions:
      1. First 3 questions should be soft-skill questions (behavioral, problem-solving, teamwork)
      2. Next 7 questions should be technical questions based on the candidate's experience and tech stack
      3. Include 2 more soft-skill questions (communication, leadership, etc.)
      4. Final 3 questions should be more advanced technical questions
      5. Tailor the questions to the candidate's specific experience and skills from the resume
      `;
    }

    // Log the context being sent to AI for debugging
    console.log("=== QUESTION GENERATION CONTEXT ===");
    console.log("Has Resume:", hasResume);
    console.log("Has Manual Fields:", hasManualFields);
    console.log("Job Role:", jobRole || "(empty)");
    console.log("Tech Stack:", techStack.length ? techStack : "(empty)");
    console.log("Years of Experience:", yearsOfExperience);
    console.log("Resume Text Length:", resumeText ? resumeText.length : 0);
    console.log("Resume Content Preview:", resumeText ? resumeText.substring(0, 200) + (resumeText.length > 200 ? "..." : "") : "(no resume)");
    console.log("Context Length:", context.length);
    console.log("Context Type:", hasResume && !hasManualFields ? "Resume Only" : hasManualFields && !hasResume ? "Manual Fields Only" : "Full Context");
    console.log("=== END CONTEXT ===");

    let questions;
    let usedFallBack = false;

    try {
      console.log("Attempting to generate questions with Gemini AI...");
      questions = await generateInterviewQuestions(context);
      console.log("✅ Successfully generated questions with AI:", questions.length, "questions");
    } catch (error: any) {
      console.error(
        "Failed to generate questions with gemini api, using fall back questions: ",
        error
      );

      // check if it's rate limit error
      const isRateLimitError =
        error.message &&
        (error.message.includes("429") ||
          error.message.includes("Too Many Requests") ||
          error.message.includes("RATE_LIMIT_EXCEEDED"));

      console.log("🔄 Using fallback questions due to AI failure");
      questions = getFallBackQuestions(jobRole, techStack);
      usedFallBack = true;
      console.log("📝 Generated", questions.length, "fallback questions based on job role and tech stack");
    }

    // create new interview session
    const newInterview = new Interview({
      user: userId,
      jobRole,
      techStack,
      yearsOfExperience,
      resumeText,
      questions: questions.map((question) => ({
        text: question,
        answer: "",
        analysis: null,
      })),
      status: "in-progress",
      usedFallbackQuestions: usedFallBack,
    });

    await newInterview.save();

    return NextResponse.json(
      {
        message: usedFallBack
          ? "interview created with default questions due to AI service limitation. Try again later for personalized questions."
          : "interview created successfully",
        interview: newInterview,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating interview: ", error);

    //provide more specific errors
    let errorMessage = "Internal server error";
    let statusCode = 500;

    if (
      (error.message && error.message.includes("rate limit")) ||
      (error.message && error.message.includes("429")) ||
      (error.message && error.message.includes("Too Many Requests"))
    ) {
      errorMessage =
        "AI service is currently busy. Please try again in few minutes.";
      statusCode = 429;
    } else if (
      error.message &&
      error.message.includes("failed to generate interview questions")
    ) {
      errorMessage =
        "Unable to generate interview questions. Please try again later.";
    }

    return NextResponse.json({ message: errorMessage }, { status: statusCode });
  }
}

import { NextRequest, NextResponse, after } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Interview from "@/models/Interview";
import { getUserIdFromToken } from "@/lib/auth";
import { analyzeResponse } from "@/lib/gemini";
import { recalculateOverallScore } from "@/lib/interviewScore";

// Fields the interview session needs back after a save
const interviewPayload = (interview: any) => ({
  _id: interview._id,
  jobRole: interview.jobRole,
  techStack: interview.techStack,
  yearsOfExperience: interview.yearsOfExperience,
  questions: interview.questions,
  overallScore: interview.overallScore,
  status: interview.status,
  usedFallbackQuestions: interview.usedFallbackQuestions,
  createdAt: interview.createdAt,
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log("Received request for interview:", id);

    // connect to MongoDB
    try {
      await connectDB();
      console.log("MongoDB connected successfully");
    } catch (dbError) {
      console.error("MongoDB connection error:", dbError);
      return NextResponse.json(
        {
          message: "Database connection error",
          error: "Failed to connect to database",
        },
        { status: 500 }
      );
    }

    // get and validate token
    const authHeader = request.headers.get("Authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.substring(7)
      : null;

    if (!token) {
      console.log("No token provided");
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // get user ID from token
    let userId;
    try {
      userId = getUserIdFromToken(token);
      console.log("User ID from token:", userId);
    } catch (tokenError) {
      console.error("Token verification error:", tokenError);
      return NextResponse.json(
        {
          message: "Invalid or expired token",
          error: "Authentication failed",
        },
        { status: 401 }
      );
    }

    // get interview ID from params
    const interviewId = id;
    console.log("Looking for interview:", interviewId);

    // parse request body
    const { questionIndex, answer } = await request.json();
    console.log("Received answer for question index:", questionIndex);

    // validate request body
    if (questionIndex === undefined || !answer) {
      return NextResponse.json(
        {
          message: "Question index and answer are required",
          received: { questionIndex, answer: answer ? "present" : "missing" },
        },
        { status: 400 }
      );
    }

    // find the interview
    const interview = await Interview.findById(interviewId);
    if (!interview) {
      console.log("Interview not found:", interviewId);
      return NextResponse.json(
        { message: "Interview not found" },
        { status: 404 }
      );
    }

    // verify that the interview belongs to the user
    if (interview.user.toString() !== userId) {
      console.log("Unauthorized access attempt:", {
        userId,
        interviewUserId: interview.user,
      });
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // check if the question index is valid
    if (questionIndex < 0 || questionIndex >= interview.questions.length) {
      return NextResponse.json(
        {
          message: "Invalid question index",
          received: questionIndex,
          validRange: `0 to ${interview.questions.length - 1}`,
        },
        { status: 400 }
      );
    }

    // Save the answer right away and analyze it in the background. Waiting for the AI here made
    // every "Submit Answer" take 10-45s; the analysis is only needed later on the results pages.
    const trimmedAnswer = String(answer).trim();

    // Unchanged answer that already has its analysis (e.g. re-saved when moving between questions):
    // nothing to do, and no reason to throw that analysis away
    const existing = interview.questions[questionIndex];
    // (analysis is a nested object that Mongoose returns as {} when empty, so check for a real score)
    if (existing.answer === trimmedAnswer && typeof existing.analysis?.score === "number") {
      return NextResponse.json(
        { message: "Answer unchanged", interview: interviewPayload(interview) },
        { status: 200 }
      );
    }
    const updated = await Interview.findOneAndUpdate(
      { _id: interviewId },
      {
        $set: {
          [`questions.${questionIndex}.answer`]: trimmedAnswer,
          [`questions.${questionIndex}.analysis`]: null, // replaced once the new analysis is ready
        },
      },
      { new: true }
    );
    console.log(`Answer saved for question ${questionIndex}; analysis queued`);

    const questionText = interview.questions[questionIndex].text;
    after(async () => {
      try {
        const analysis = await analyzeResponse(questionText, trimmedAnswer);
        // Only store it if the answer hasn't been changed again in the meantime
        const result = await Interview.updateOne(
          { _id: interviewId, [`questions.${questionIndex}.answer`]: trimmedAnswer },
          { $set: { [`questions.${questionIndex}.analysis`]: analysis } }
        );
        if (result.modifiedCount === 0) {
          console.log(`Analysis for question ${questionIndex} discarded: answer changed meanwhile`);
          return;
        }
        await recalculateOverallScore(interviewId);
        console.log(`Background analysis stored for question ${questionIndex} (score ${analysis.score})`);
      } catch (analysisError) {
        // The interview completion step re-analyzes any answer that is still missing an analysis
        console.error(`Background analysis failed for question ${questionIndex}:`, analysisError);
      }
    });

    return NextResponse.json(
      {
        message: "Answer submitted successfully",
        interview: interviewPayload(updated),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in answer submission route:", error);

    // check for specific error types
    if (error instanceof Error) {
      if (error.message.includes("GEMINI_API_KEY")) {
        return NextResponse.json(
          {
            message: "AI analysis service configuration error",
            error: "Gemini API key is not properly configured",
          },
          { status: 500 }
        );
      }
      if (error.message.includes("MongoDB")) {
        return NextResponse.json(
          {
            message: "Database error",
            error: "Failed to connect to database",
          },
          { status: 500 }
        );
      }
    }

    // default error response
    return NextResponse.json(
      {
        message: "Internal server error",
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}

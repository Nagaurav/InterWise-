import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import Interview from "@/models/Interview";
import { getUserIdFromToken } from "@/lib/auth";
import { generateInterviewFeedback } from "@/lib/gemini";
import { addIdealAnswersForUnanswered, analyzeMissingAnswers, markUnansweredQuestions } from "@/lib/interviewScore";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // get interview id from params
    const { id: interviewId } = await params;
    console.log(`Completing interview: ${interviewId}`);

    //find the interview
    let interview = await Interview.findById(interviewId);
    if (!interview) {
      return NextResponse.json(
        { message: "Interview not found" },
        { status: 404 }
      );
    }

    // verify that the interview belongs to the user
    if (interview.user.toString() !== userId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Unanswered questions (e.g. skipped by the inactivity timer) don't block completion:
    // they are recorded as "no answer given" and score 0
    const skippedCount = await markUnansweredQuestions(interviewId);
    if (skippedCount > 0) console.log(`${skippedCount} unanswered question(s) scored 0`);

    // Answers are analyzed in the background when saved; make sure none are still missing
    // (e.g. the last answer, submitted just before this) so the score and feedback cover them all.
    // Meanwhile, skipped questions get a sample ideal answer for the analysis page.
    await Promise.all([analyzeMissingAnswers(interviewId), addIdealAnswersForUnanswered(interviewId)]);
    interview = (await Interview.findById(interviewId))!;

    // Overall score: average over all questions (unanswered ones count as 0)
    const scores = interview.questions.map((q: any) =>
      typeof q.analysis?.score === "number" ? q.analysis.score : 0
    );
    const overallScore = scores.length
      ? Math.round(scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length)
      : 0;
    console.log(
      `Generating feedback for interview with overall score: ${overallScore}`
    );

    // generate overall feedback using gemini
    const feedback = await generateInterviewFeedback(interview);
    console.log("Feedback generated successfully", JSON.stringify(feedback, null, 2));

    // update the interview with the overall score and feedback
    interview.overallScore = overallScore;
    interview.feedback = feedback;
    interview.status = "completed";
    interview.completedAt = new Date();
    
    // Mark feedback as modified to ensure it gets saved
    interview.markModified('feedback');

    await interview.save();
    console.log("interview marked as completed");

    // get the updated interview
    const updatedInterview = await Interview.findById(interviewId);
    if (!updatedInterview) {
      return NextResponse.json(
        { message: "Interview not found after completion" },
        { status: 404 }
      );
    }

    // return a simplified response
    return NextResponse.json(
      {
        message: "Interview completed successfully",
        success: true,
        interviewId: updatedInterview._id,
        status: "completed",
        redirectUrl: `/interview/${updatedInterview._id}/results`,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Internal server error", error: String(error) },
      { status: 500 }
    );
  }
}

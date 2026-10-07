import Interview from "@/models/Interview";
import { analyzeResponse } from "@/lib/gemini";

/**
 * Recomputes overallScore. While in progress: the average of the answered, analyzed questions.
 * Once completed: the average over all questions, unanswered ones counting as 0 (same as the
 * completion step, so a late background analysis can't overwrite the final score with a higher one).
 */
export async function recalculateOverallScore(interviewId: string) {
  const interview = await Interview.findById(interviewId);
  if (!interview) return;

  const scores =
    interview.status === "completed"
      ? interview.questions.map((q: any) =>
          typeof q.analysis?.score === "number" ? (q.analysis.score as number) : 0
        )
      : interview.questions
          .filter((q: any) => q.answer && q.analysis && typeof q.analysis.score === "number")
          .map((q: any) => q.analysis.score as number);
  if (scores.length === 0) return;

  const overallScore = Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length);
  await Interview.updateOne({ _id: interviewId }, { $set: { overallScore } });
}

/**
 * Records every unanswered question as "no answer given" with a score of 0, so an interview
 * with skipped questions can still be completed. Returns how many were marked.
 */
export async function markUnansweredQuestions(interviewId: string) {
  const interview = await Interview.findById(interviewId);
  if (!interview) return 0;

  const updates: Record<string, unknown> = {};
  interview.questions.forEach((q: any, index: number) => {
    if (!q.answer || !q.answer.trim()) {
      updates[`questions.${index}.answer`] = "";
      updates[`questions.${index}.analysis`] = {
        score: 0,
        technicalFeedback: "No answer was given for this question.",
        communicationFeedback: "No answer was given for this question.",
        improvementSuggestions: [
          "Attempt every question, even briefly: a partial answer that shows your reasoning scores better than none.",
          "If you are unsure, explain how you would approach the problem or what you would look up.",
        ],
      };
    }
  });

  const count = Object.keys(updates).length / 2;
  if (count > 0) await Interview.updateOne({ _id: interviewId }, { $set: updates });
  return count;
}

/**
 * Analyzes every answered question that has no analysis yet (e.g. its background analysis was
 * still running or failed). Runs in parallel and stores each result. Used before completing an
 * interview so the final score and feedback cover every answer.
 */
export async function analyzeMissingAnswers(interviewId: string) {
  const interview = await Interview.findById(interviewId);
  if (!interview) return;

  const missing = interview.questions
    .map((q: any, index: number) => ({ q, index }))
    // analysis is a nested object that Mongoose returns as {} when empty, so check for a real score
    .filter(({ q }: any) => q.answer && q.answer.trim() && typeof q.analysis?.score !== "number");
  if (missing.length === 0) return;

  console.log(`Analyzing ${missing.length} answer(s) that have no analysis yet`);
  await Promise.all(
    missing.map(async ({ q, index }: any) => {
      try {
        const analysis = await analyzeResponse(q.text, q.answer);
        await Interview.updateOne(
          { _id: interviewId, [`questions.${index}.answer`]: q.answer },
          { $set: { [`questions.${index}.analysis`]: analysis } }
        );
      } catch (error) {
        console.error(`Analysis failed for question ${index}:`, error);
      }
    })
  );
}

import React from "react";
import { scoreHex } from "../ResultsPage/score";

interface QuestionListProps {
  interview: any;
  onClick: (index: number) => void;
  activeQuestionIndex: number;
}

const ScoreChip = ({ question }: { question: any }) => {
  if (!question.answer) {
    return <span className="px-2 py-0.5 text-[10px] rounded-full bg-zinc-800 text-zinc-500 shrink-0">Not answered</span>;
  }
  if (!question.analysis) return null;
  const score = question.analysis.score;
  return (
    <span
      className="px-2 py-0.5 text-xs font-bold border rounded-full shrink-0"
      style={{ color: scoreHex(score), borderColor: `${scoreHex(score)}55`, background: `${scoreHex(score)}14` }}
    >
      {score}
    </span>
  );
};

const QuestionList = ({ interview, onClick, activeQuestionIndex }: QuestionListProps) => {
  return (
    <>
      {/* Mobile: horizontal chip row */}
      <div className="flex gap-2 pb-2 -mx-6 px-6 overflow-x-auto md:hidden">
        {interview.questions.map((question: any, index: number) => {
          const active = activeQuestionIndex === index;
          const score = question.answer && question.analysis ? question.analysis.score : null;
          return (
            <button
              key={index}
              onClick={() => onClick(index)}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-full border-2 shrink-0 cursor-pointer transition-colors ${
                active ? "border-[var(--theme-color)] bg-[var(--theme-color)]/20 text-white" : "border-[#352a31] bg-[#1f1f1f] text-zinc-400"
              } ${!question.answer ? "opacity-50" : ""}`}
            >
              Q{index + 1}
              {score !== null && (
                <span className="w-2 h-2 rounded-full" style={{ background: scoreHex(score) }} />
              )}
            </button>
          );
        })}
      </div>

      {/* Desktop: sticky sidebar */}
      <div className="max-md:hidden md:col-span-1 md:sticky md:top-6 h-fit p-4 bg border border-[#352a31] rounded-2xl">
        <div className="flex items-center justify-between px-1 mb-3">
          <h2 className="text-lg font-semibold">Questions</h2>
          <span className="text-xs text-[var(--nav-text)]">{interview.questions.length} total</span>
        </div>
        <div className="space-y-1.5 max-h-[70vh] overflow-y-auto pr-1">
          {interview.questions.map((question: any, index: number) => {
            const active = activeQuestionIndex === index;
            return (
              <button
                key={index}
                onClick={() => onClick(index)}
                className={`w-full text-left px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                  active
                    ? "border-[var(--theme-color)]/70 bg-[var(--theme-color)]/15"
                    : "border-transparent hover:bg-[#1f1f1f] hover:border-[#352a31]"
                } ${!question.answer ? "opacity-50" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm font-bold ${active ? "text-[var(--theme-hover)]" : "text-zinc-300"}`}>
                    Q{index + 1}
                  </span>
                  <ScoreChip question={question} />
                </div>
                <p className="mt-1 text-xs truncate text-zinc-400">{question.text}</p>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default QuestionList;

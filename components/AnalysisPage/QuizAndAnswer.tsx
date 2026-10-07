import React from "react";
import { PlayCircle } from "lucide-react";
import { scoreHex, scoreLabel } from "../ResultsPage/score";

interface QuizAndAnswerProps {
  activeQuestionIndex: number;
  activeQuestion: any;
  interview: any;
  onClick: () => void;
}

const QuizAndAnswer = ({ activeQuestionIndex, activeQuestion, interview, onClick }: QuizAndAnswerProps) => {
  const score = activeQuestion.analysis && activeQuestion.answer ? activeQuestion.analysis.score : null;

  return (
    <div className="p-8 bg border border-[#352a31] rounded-2xl max-sm:p-6">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <p className="text-sm font-medium text-[var(--theme-hover)]">
            Question {activeQuestionIndex + 1} of {interview.questions.length}
          </p>
          <h2 className="mt-2 text-xl font-semibold leading-snug text-white max-sm:text-lg">{activeQuestion.text}</h2>
        </div>

        {score !== null && (
          <div className="flex flex-col items-center gap-1 shrink-0">
            <div
              className="flex items-center justify-center w-16 h-16 rounded-full"
              style={{ background: `conic-gradient(${scoreHex(score)} ${score * 3.6}deg, #352a31 0deg)` }}
            >
              <div className="flex items-center justify-center rounded-full w-[52px] h-[52px] bg-[#1a1518]">
                <span className="text-lg font-bold" style={{ color: scoreHex(score) }}>{score}</span>
              </div>
            </div>
            <span className="text-xs font-medium" style={{ color: scoreHex(score) }}>{scoreLabel(score)}</span>
          </div>
        )}
      </div>

      <h3 className="mb-2 text-sm font-semibold tracking-wide uppercase text-zinc-500">Your Answer</h3>
      <div className="p-5 rounded-xl bg-[#1f1f1f]/70 border border-[#352a31] border-l-4 border-l-[var(--theme-color)]">
        {activeQuestion.answer ? (
          <p className="leading-relaxed text-gray-300 whitespace-pre-line">{activeQuestion.answer}</p>
        ) : (
          <div className="py-4 text-center">
            <p className="mb-4 italic text-zinc-400">No answer provided yet</p>
            {interview.status === "in-progress" && (
              <button
                onClick={onClick}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white transition-all duration-500 rounded-full cursor-pointer btn"
              >
                <PlayCircle className="w-4 h-4" />
                Continue Interview to Answer
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizAndAnswer;

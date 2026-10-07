import React from "react";
import { scoreHex } from "../ResultsPage/score";

interface TechnicalAnalysisProps {
  activeQuestion: any;
  text: string;
  feedback: string;
  score: string;
  icon: React.ElementType;
}

const TechnicalAndCommunication = ({ activeQuestion, text, feedback, score, icon: Icon }: TechnicalAnalysisProps) => {
  const value = activeQuestion.analysis[score];

  return (
    <div className="p-5 rounded-xl bg-[#1f1f1f]/70 border border-[#352a31]">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="flex items-center gap-2 font-semibold text-gray-200">
          <Icon className="w-4 h-4 text-[var(--theme-hover)]" />
          {text}
        </h3>
        {typeof value === "number" && (
          <span className="text-sm font-bold" style={{ color: scoreHex(value) }}>
            {value}/100
          </span>
        )}
      </div>
      <p className="text-sm leading-relaxed text-gray-400">{activeQuestion.analysis[feedback]}</p>
    </div>
  );
};

export default TechnicalAndCommunication;

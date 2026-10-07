import React from "react";
import { Code2, MessageCircle, Lightbulb, KeyRound, Sparkles } from "lucide-react";
import TechnicalAndCommunication from "./TechnicalAndCommunication";

const AnswerAnalysis = ({ activeQuestion }: { activeQuestion: any }) => {
  const { keyPoints, improvementSuggestions, idealAnswer } = activeQuestion.analysis;

  return (
    <div className="p-8 bg border border-[#352a31] rounded-2xl max-sm:p-6">
      <h2 className="mb-5 text-xl font-bold">Analysis</h2>

      {/* technical and communication assessment */}
      <div className="grid gap-4 mb-6 md:grid-cols-2">
        <TechnicalAndCommunication
          icon={Code2}
          score="technicalScore"
          feedback="technicalFeedback"
          text="Technical Assessment"
          activeQuestion={activeQuestion}
        />
        <TechnicalAndCommunication
          icon={MessageCircle}
          score="communicationScore"
          feedback="communicationFeedback"
          text="Communication Assessment"
          activeQuestion={activeQuestion}
        />
      </div>

      {/* key points (only when the analysis includes them) */}
      {Array.isArray(keyPoints) && keyPoints.length > 0 && (
        <div className="mb-6">
          <h3 className="flex items-center gap-2 mb-3 font-semibold text-gray-200">
            <KeyRound className="w-4 h-4 text-[var(--theme-hover)]" />
            Key Points
          </h3>
          <ul className="space-y-2">
            {keyPoints.map((point: string, index: number) => (
              <li key={index} className="flex gap-3 text-gray-300">
                <span className="mt-2 w-1.5 h-1.5 rounded-full shrink-0 bg-[var(--theme-hover)]" />
                {point}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* improvement suggestions */}
      {Array.isArray(improvementSuggestions) && improvementSuggestions.length > 0 && (
        <div>
          <h3 className="flex items-center gap-2 mb-3 font-semibold text-gray-200">
            <Lightbulb className="w-4 h-4 text-amber-400" />
            Improvement Suggestions
          </h3>
          <ol className="space-y-3">
            {improvementSuggestions.map((suggestion: string, index: number) => (
              <li key={index} className="flex gap-3 text-gray-300">
                <span className="flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full shrink-0 bg-amber-900/30 border border-amber-700/40 text-amber-400">
                  {index + 1}
                </span>
                {suggestion}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* sample ideal answer */}
      {idealAnswer && (
        <div className="mt-6">
          <h3 className="flex items-center gap-2 mb-3 font-semibold text-gray-200">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            Sample Ideal Answer
          </h3>
          <div className="p-5 border rounded-xl bg-emerald-900/10 border-emerald-800/40">
            <p className="italic leading-relaxed text-gray-300">{idealAnswer}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnswerAnalysis;

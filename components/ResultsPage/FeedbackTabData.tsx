import React, { useState } from "react";
import { Code2, MessageCircle, Target, Lightbulb, MessageSquareText, ChevronDown } from "lucide-react";
import LearningResources from "./LearningResources";
import { scoreHex } from "./score";

const FeedbackTabData = ({ interview }: { interview: any }) => {
  // question cards are collapsible; the first one starts open
  const [openQuestions, setOpenQuestions] = useState<Set<number>>(new Set([0]));
  const allOpen = openQuestions.size === interview.questions.length;

  const toggleQuestion = (index: number) => {
    setOpenQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const toggleAll = () => {
    setOpenQuestions(allOpen ? new Set() : new Set(interview.questions.map((_: any, i: number) => i)));
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="p-8 bg border border-[#352a31] rounded-2xl max-sm:p-6">
          <h2 className="flex items-center gap-3 mb-4 text-xl font-bold">
            <MessageSquareText className="w-5 h-5 text-[var(--theme-hover)]" />
            Overall Assessment
          </h2>
          <p className="leading-relaxed text-gray-300">{interview.feedback.overallFeedback}</p>
        </div>

        <div className="p-8 bg border border-[#352a31] rounded-2xl max-sm:p-6">
          <h2 className="flex items-center gap-3 mb-4 text-xl font-bold">
            <Target className="w-5 h-5 text-[var(--theme-hover)]" />
            Improvement Goals
          </h2>
          <ol className="space-y-3">
            {interview.feedback.nextSteps.map((step: string, index: number) => (
              <li key={index} className="flex gap-3 text-gray-300">
                <span className="flex items-center justify-center w-6 h-6 text-xs font-bold rounded-full shrink-0 bg-[var(--theme-color)] text-white">
                  {index + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 mt-4">
        <h2 className="text-2xl font-semibold max-sm:text-xl">Question-by-Question Feedback</h2>
        <button
          onClick={toggleAll}
          className="px-4 py-1.5 text-sm font-medium text-white transition-colors border-2 rounded-full cursor-pointer border-[#413239] hover:border-[var(--theme-color)] shrink-0"
        >
          {allOpen ? "Collapse all" : "Expand all"}
        </button>
      </div>

      {interview.questions.map((question: any, index: number) => {
        const score = typeof question.analysis?.score === "number" ? question.analysis.score : null;
        const tips: string[] = Array.isArray(question.analysis?.improvementSuggestions)
          ? question.analysis.improvementSuggestions
          : [];
        const isOpen = openQuestions.has(index);

        return (
          <div key={index} className="bg border border-[#352a31] rounded-2xl">
            <button
              onClick={() => toggleQuestion(index)}
              aria-expanded={isOpen}
              className="flex items-start justify-between w-full gap-4 p-6 text-left cursor-pointer max-sm:p-5"
            >
              <div className="flex gap-4">
                <span className="flex items-center justify-center text-sm font-bold rounded-lg w-9 h-9 shrink-0 bg-[#352a31]/60 border border-[#453841]/60 text-[var(--theme-hover)]">
                  Q{index + 1}
                </span>
                <h3 className="pt-1.5 font-medium text-white">{question.text}</h3>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {score !== null && (
                  <span
                    className="px-3 py-1 text-sm font-bold border rounded-full"
                    style={{ color: scoreHex(score), borderColor: `${scoreHex(score)}55`, background: `${scoreHex(score)}14` }}
                  >
                    {score}/100
                  </span>
                )}
                <ChevronDown
                  className={`w-5 h-5 text-zinc-400 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                />
              </div>
            </button>

            {isOpen && (
              <div className="px-6 pb-6 max-sm:px-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 rounded-xl bg-[#1f1f1f]/70 border border-[#352a31]">
                    <h4 className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-200">
                      <Code2 className="w-4 h-4 text-[var(--theme-hover)]" />
                      Technical Feedback
                    </h4>
                    <p className="text-sm leading-relaxed text-gray-400">{question.analysis?.technicalFeedback}</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#1f1f1f]/70 border border-[#352a31]">
                    <h4 className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-200">
                      <MessageCircle className="w-4 h-4 text-[var(--theme-hover)]" />
                      Communication Feedback
                    </h4>
                    <p className="text-sm leading-relaxed text-gray-400">{question.analysis?.communicationFeedback}</p>
                  </div>
                </div>

                {tips.length > 0 && (
                  <div className="mt-4">
                    <h4 className="flex items-center gap-2 mb-2 text-sm font-semibold text-gray-200">
                      <Lightbulb className="w-4 h-4 text-amber-400" />
                      Suggestions
                    </h4>
                    <ul className="space-y-1.5">
                      {tips.map((tip, i) => (
                        <li key={i} className="flex gap-2 text-sm text-gray-400">
                          <span className="text-amber-400">•</span>
                          {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Learning Resources Section */}
      {interview.feedback.learningResources && (
        <LearningResources resources={interview.feedback.learningResources} />
      )}
    </div>
  );
};

export default FeedbackTabData;

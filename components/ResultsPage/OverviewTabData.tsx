import React from "react";
import { CheckCircle2, TrendingUp, MessageSquareText } from "lucide-react";

const OverviewTabData = ({ interview }: { interview: any }) => {
  if (!interview.feedback) return null;

  return (
    <div className="flex flex-col gap-5">
      <div className="p-8 bg border border-[#352a31] rounded-2xl max-sm:p-6">
        <h2 className="flex items-center gap-3 mb-4 text-xl font-bold">
          <MessageSquareText className="w-5 h-5 text-[var(--theme-hover)]" />
          Overall Feedback
        </h2>
        <p className="leading-relaxed text-gray-300">{interview.feedback.overallFeedback}</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="p-8 bg border border-[#352a31] rounded-2xl max-sm:p-6">
          <h3 className="flex items-center gap-3 mb-5 text-lg font-bold">
            <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-900/20 border border-emerald-700/30">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            </span>
            Strengths
          </h3>
          <ul className="space-y-3">
            {interview.feedback.strengths.map((strength: string, index: number) => (
              <li key={index} className="flex gap-3 text-gray-300">
                <CheckCircle2 className="w-4 h-4 mt-1 shrink-0 text-emerald-400" />
                {strength}
              </li>
            ))}
          </ul>
        </div>

        <div className="p-8 bg border border-[#352a31] rounded-2xl max-sm:p-6">
          <h3 className="flex items-center gap-3 mb-5 text-lg font-bold">
            <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-900/20 border border-amber-700/30">
              <TrendingUp className="w-5 h-5 text-amber-400" />
            </span>
            Areas for Improvement
          </h3>
          <ul className="space-y-3">
            {interview.feedback.areasForImprovement.map((area: string, index: number) => (
              <li key={index} className="flex gap-3 text-gray-300">
                <TrendingUp className="w-4 h-4 mt-1 shrink-0 text-amber-400" />
                {area}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default OverviewTabData;

import React from "react";
import { Briefcase, CalendarDays, ListChecks, ThumbsUp, AlertCircle } from "lucide-react";
import { scoreHex, scoreLabel } from "./score";

// Score summary + interview details shown above the tabs
const InterviewDetails = ({ interview }: { interview: any }) => {
  const score = Math.max(0, Math.min(100, Math.round(interview.overallScore || 0)));
  const questionScores: number[] = (interview.questions || [])
    .map((q: any) => q?.analysis?.score)
    .filter((s: any) => typeof s === "number");
  const strong = questionScores.filter((s) => s >= 70).length;
  const needsWork = questionScores.filter((s) => s < 50).length;

  const stats = [
    { icon: ListChecks, label: "Questions", value: interview.questions?.length ?? 0 },
    { icon: ThumbsUp, label: "Strong answers", value: strong },
    { icon: AlertCircle, label: "Need work", value: needsWork },
  ];

  return (
    <div className="grid gap-5 mb-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
      {/* Score */}
      <div className="flex flex-col items-center justify-center gap-4 p-8 text-center bg border border-[#352a31] rounded-2xl">
        <div
          className="flex items-center justify-center rounded-full w-40 h-40"
          style={{ background: `conic-gradient(${scoreHex(score)} ${score * 3.6}deg, #352a31 0deg)` }}
        >
          <div className="flex flex-col items-center justify-center w-[136px] h-[136px] rounded-full bg-[#1a1518]">
            <span className="text-5xl font-bold leading-none" style={{ color: scoreHex(score) }}>
              {score}
            </span>
            <span className="mt-1 text-sm text-zinc-500">out of 100</span>
          </div>
        </div>
        <div>
          <p className="text-2xl font-semibold" style={{ color: scoreHex(score) }}>{scoreLabel(score)}</p>
          <p className="text-sm text-[var(--nav-text)]">Overall score</p>
        </div>
      </div>

      {/* Details */}
      <div className="flex flex-col justify-between gap-6 p-8 bg border border-[#352a31] rounded-2xl max-sm:p-6">
        <div>
          <h2 className="mb-4 text-xl font-bold">Interview Details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <Briefcase className="w-5 h-5 text-[var(--theme-hover)]" />
              <div>
                <p className="text-xs text-zinc-500">Experience</p>
                <p className="font-medium">
                  {interview.yearsOfExperience} {interview.yearsOfExperience <= 1 ? "Year" : "Years"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <CalendarDays className="w-5 h-5 text-[var(--theme-hover)]" />
              <div>
                <p className="text-xs text-zinc-500">Date</p>
                <p className="font-medium">
                  {new Date(interview.completedAt || interview.createdAt).toLocaleDateString(undefined, {
                    day: "numeric", month: "short", year: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-5">
            {interview.techStack.map((tech: string, index: number) => (
              <span
                key={index}
                className="text-xs px-2.5 py-1 rounded-full bg-[#352a31]/50 border border-[#453841]/50 text-gray-300"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {stats.map(({ icon: Icon, label, value }) => (
            <div key={label} className="px-4 py-4 rounded-xl bg-[#1f1f1f]/70 border border-[#352a31] max-sm:px-3">
              <Icon className="w-4 h-4 mb-2 text-[var(--theme-hover)]" />
              <p className="text-2xl font-semibold leading-none">{value}</p>
              <p className="mt-1 text-xs text-[var(--nav-text)]">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InterviewDetails;

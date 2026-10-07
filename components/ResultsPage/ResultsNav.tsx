import React from "react";
import { useRouter } from "next/navigation";
import { Printer, Share2, ClipboardList, Check } from "lucide-react";

interface ResultsNavProps {
  handlePrint: () => void;
  handleShare: () => void;
  interviewId: string;
  jobRole: string;
  date: string;
  shareCopied?: boolean;
}

const outlineBtn =
  "flex items-center gap-2 px-4 py-2 text-sm font-medium text-white transition-all duration-300 border-2 rounded-full cursor-pointer border-[#413239] hover:border-[var(--theme-color)] hover:bg-[#1f1f1f]";

const ResultsNav = ({ handlePrint, handleShare, interviewId, jobRole, date, shareCopied }: ResultsNavProps) => {
  const router = useRouter();
  return (
    <div className="flex items-end justify-between gap-6 mb-8 max-md:flex-col max-md:items-center max-md:text-center">
      <div className="flex flex-col gap-3 max-md:items-center">
        <span className="w-fit px-4 py-1.5 text-sm text-white rounded-full border-2 border-[#413239] bg-[#1f1f1f]">
          Interview Results
        </span>
        <h1 className="text-4xl font-semibold capitalize text-[var(--nav-text)] max-sm:text-3xl">
          <span className="text-[var(--theme-color)]">{jobRole}</span> Interview
        </h1>
        <p className="text-[var(--nav-text)]">Completed on {date}</p>
      </div>

      <div className="flex flex-wrap justify-center gap-3">
        <button onClick={handlePrint} className={outlineBtn}>
          <Printer className="w-4 h-4" />
          Print
        </button>
        <button onClick={handleShare} className={outlineBtn}>
          {shareCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
          {shareCopied ? "Link copied" : "Share"}
        </button>
        <button
          onClick={() => router.push(`/interview/${interviewId}/analysis`)}
          className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white transition-all duration-500 rounded-full cursor-pointer btn"
        >
          <ClipboardList className="w-4 h-4" />
          Detailed Analysis
        </button>
      </div>
    </div>
  );
};

export default ResultsNav;

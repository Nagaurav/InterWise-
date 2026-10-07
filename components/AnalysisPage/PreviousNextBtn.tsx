import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PreviousNextBtnProps {
  onClick: () => void;
  disabled: boolean;
  text: string;
  direction: "previous" | "next";
}

const PreviousNextBtn = ({ onClick, text, disabled, direction }: PreviousNextBtnProps) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 px-5 py-2.5 text-sm font-medium text-white transition-all duration-300 border-2 rounded-full cursor-pointer border-[#413239] hover:border-[var(--theme-color)] hover:bg-[#1f1f1f] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-[#413239] disabled:hover:bg-transparent max-sm:px-4"
    >
      {direction === "previous" && <ChevronLeft className="w-4 h-4" />}
      <span className="max-sm:hidden">{text}</span>
      <span className="sm:hidden">{direction === "previous" ? "Prev" : "Next"}</span>
      {direction === "next" && <ChevronRight className="w-4 h-4" />}
    </button>
  );
};

export default PreviousNextBtn;

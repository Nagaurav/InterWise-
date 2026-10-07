"use client";

import { ArrowLeft, Clock, Lock, Timer } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

const InterviewNav = ({ interview }: { interview: any }) => {
  return (
    <>
      <div className="sticky top-0 z-10 flex items-center justify-between p-4 text-white border-b shadow-lg md:py-6 md:px-10 border-[#352a31] bg-black/40 backdrop-blur-md">
        <div className="flex gap-4">
          <Image
            width={40}
            height={40}
            className="max-sm:hidden"
            src="/images/logo.svg"
            alt="Logo Image"
          />
          <div className="text-sm leading-2 max-sm:text-xs">
            <h1 className="text-3xl font-bold tracking-tighter capitalize max-sm:text-base">
              {interview.jobRole} interview
            </h1>
            <p className="font-light tracking-tight text-[var(--nav-text)]">
              Secure your future with the right answers
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6 text-white">
          <button className="p-3 max-sm:hidden rounded-full border border-[#413239] bg-[#1f1f1f] hover:bg-[#b87a9c]/20 hover:border-[#b87a9c]/50 cursor-pointer transition-all duration-300">
            <Timer className="h-4 w-4 text-[#d8a1bc]" />
          </button>
          <Link
            href={"/dashboard"}
            className="flex hover:border-[var(--theme-color)] border-2 border-[#413239] px-4 py-2 rounded-full items-center -space-x-1.5 hover:text-white transition-colors duration-400 group"
          >
            <ArrowLeft className="w-4 transition-all duration-300 text-[var(--nav-text)] group-hover:text-white" />
            <span className="ml-4 text-sm font-medium transition-all duration-300 max-sm:text-xs text-[var(--nav-text)] group-hover:text-white">
              Back to Dashboard
            </span>
          </Link>
        </div>
      </div>
      <div className="flex flex-col items-start justify-between gap-2 px-10 py-3 border-b bg-[#1f1f1f]/40 max-sm:p-4 sm:flex-row sm:items-center border-[#352a31]">
        <div className="flex items-center gap-2 max-sm:text-[10px] text-sm text-gray-300">
          <span className="font-medium text-[rgb(184,122,156)] bg-[#b87a9c]/10 px-2.5 py-1 rounded-full flex items-center gap-1">
            <Lock className="w-3 h-3" />
            Tech Stack:
          </span>
          <div className="flex gap-2">
            {interview.techStack.map((tech: string, index: number) => (
              <span
                key={index}
                className="bg-[#352a31]/50 px-2.5 py-1 max-sm:text-[8px] rounded-full text-xs border border-[#453841]/50 hover:border-[#b87a9c]/30 transition-all cursor-default"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1 text-sm border rounded-full max-sm:text-xs bg-[#1f1f1f] border-[#413239]">
          <Clock className="h-4 w-4 text-[#b87a9c]" />

          <p className="text-gray-300">
            Experience:{" "}
            <span className="font-medium text-white">
              {interview.yearsOfExperience}{" "}
              {interview.yearsOfExperience <= 1 ? "Year" : "Years"}
            </span>
          </p>
        </div>
      </div>
    </>
  );
};

export default InterviewNav;

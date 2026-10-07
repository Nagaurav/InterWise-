import React from "react";
import { Bot, MessageSquareText, Mic, UserCog } from "lucide-react";

const features = [
  {
    icon: Bot,
    title: "AI-Powered Interviews",
    description: "Questions tailored to your skills and experience. Prepare like never before.",
  },
  {
    icon: MessageSquareText,
    title: "Instant Feedback & Scoring",
    description: "AI-generated feedback on every answer, with a performance score to track progress.",
  },
  {
    icon: Mic,
    title: "Speech-to-Text Answers",
    description: "Answer out loud with voice recognition and edit the transcription before submitting.",
  },
  {
    icon: UserCog,
    title: "Personalized Mock Tests",
    description: "Pick a job role and tech stack, or upload your resume for a fully tailored interview.",
  },
];

const FormFeature = () => {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col items-start gap-4 max-lg:items-center max-lg:text-center">
        <span className="px-4 py-1.5 text-sm text-white rounded-full border-2 border-[#413239] bg-[#1f1f1f]">
          What you get
        </span>
        <h2 className="text-4xl font-semibold text-[var(--nav-text)] max-sm:text-3xl">
          Practice smarter with <span className="text-[var(--theme-color)]">AI</span>
        </h2>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {features.map(({ icon: Icon, title, description }) => (
          <div
            key={title}
            className="bg border border-[#352a31] rounded-xl px-6 py-7 transition-colors duration-300 hover:border-[var(--theme-color)]"
          >
            <div className="flex items-center justify-center w-11 h-11 mb-4 rounded-lg bg-[#352a31]/60 border border-[#453841]/60">
              <Icon className="w-5 h-5 text-[var(--theme-hover)]" />
            </div>
            <h3 className="mb-2 text-lg font-bold text-white">{title}</h3>
            <p className="text-sm text-gray-400">{description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FormFeature;

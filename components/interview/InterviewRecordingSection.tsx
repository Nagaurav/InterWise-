"use client";
import { useCallback } from "react";

interface InterviewRecordingSectionProps {
  interviewId: string;
  onRecordingComplete: (blob: Blob | null, url: string) => void;
  initialVideoUrl?: string | null;
  className?: string;
}


const InterviewRecordingSection = ({
  interviewId,
  onRecordingComplete,
  className = "",
}: InterviewRecordingSectionProps) => {
  // Notify parent that no video is available
  useCallback(() => {
    onRecordingComplete(null, '');
  }, [onRecordingComplete]);

  return (
    <div className={`${className} flex flex-col items-center`}>
      <div className="w-full max-w-3xl mx-auto p-6 bg-gray-50 dark:bg-gray-800 rounded-lg text-center">
        <p className="text-gray-600 dark:text-gray-300">
          Video response functionality is currently unavailable.
        </p>
      </div>
    </div>
  );
};

export default InterviewRecordingSection;

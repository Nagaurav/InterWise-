"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import NewInterviewForm from "@/components/interview/NewInterviewForm";

export default function NewInterviewPage() {
  const router = useRouter();

  const handleStartInterview = (interviewData: any) => {
    router.push(`/interview/${interviewData._id}`);
  };

  return (
    <div className="text-white">
      {/* The main navbar is hidden on interview pages, so give this page its own header */}
      <header className="flex items-center justify-between min-h-[100px] px-10 max-sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <Image width={35} height={35} src="/images/logo.svg" alt="Logo" style={{ width: "auto", height: "auto" }} />
          <span className="text-2xl font-medium sm:text-3xl">interwise</span>
        </Link>
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-2 rounded-full border-[#413239] text-[var(--nav-text)] hover:text-white hover:border-[var(--theme-color)]"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="max-sm:hidden">Back to Dashboard</span>
        </Link>
      </header>

      <NewInterviewForm
        onClose={() => router.push("/dashboard")}
        onStartInterview={handleStartInterview}
      />
    </div>
  );
}

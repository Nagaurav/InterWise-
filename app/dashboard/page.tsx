"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import InterviewList from "@/components/interview/InterviewList";
import Loader from "@/components/Loader";
import { Plus } from "lucide-react";

const Dashboard = () => {
  const router = useRouter();
  const { isAuthenticated, authLoading, userData } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    console.log('[Dashboard] Auth state:', { isAuthenticated, userData });
    
    if (!isAuthenticated) {
      console.log('[Dashboard] Not authenticated, redirecting to login');
      router.push("/login");
    } else {
      console.log('[Dashboard] Authenticated, showing dashboard');
      setIsLoading(false);
    }
  }, [isAuthenticated, userData, router, authLoading]);

  // loader
  if (isLoading) {
    return <Loader />;
  }

  const handleCreateInterview = () => {
    router.push(`/interview/new`);
  };

  const firstName = userData?.name?.split(" ")[0];

  return (
    <div className="px-10 pb-16 mx-auto max-w-7xl max-sm:px-6">
      <div className="flex items-end justify-between gap-6 mb-10 max-md:flex-col max-md:items-center max-md:text-center">
        <div className="flex flex-col gap-3 max-md:items-center">
          <span className="w-fit px-4 py-1.5 text-sm text-white rounded-full border-2 border-[#413239] bg-[#1f1f1f]">
            Dashboard
          </span>
          <h1 className="text-4xl font-semibold text-[var(--nav-text)] max-sm:text-3xl">
            Welcome back{firstName ? ", " : ""}
            {firstName && <span className="text-[var(--theme-color)]">{firstName}</span>}
          </h1>
          <p className="text-lg text-[var(--nav-text)] max-sm:text-base">
            Practice your interview skills with AI-powered feedback
          </p>
        </div>

        <button
          onClick={handleCreateInterview}
          className="flex items-center gap-2 px-6 py-3 font-semibold text-white transition-all duration-500 rounded-full cursor-pointer btn shrink-0"
        >
          <Plus className="w-5 h-5" />
          New Interview
        </button>
      </div>

      <InterviewList onCreateInterview={handleCreateInterview} />
    </div>
  );
};

export default Dashboard;

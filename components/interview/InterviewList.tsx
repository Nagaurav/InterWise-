"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Trash2, AlertTriangle, ListChecks, CheckCircle2, Clock, TrendingUp, Sparkles, Plus,
  Briefcase, CalendarDays, PlayCircle, BarChart3, ClipboardList, RotateCw,
} from "lucide-react";
import Loader from "../Loader";
import { useAuth } from "@/context/AuthContext";

interface Interview {
  _id: string;
  jobRole: string;
  techStack: string[];
  yearsOfExperience: number;
  status: string;
  overallScore: number;
  createdAt: string;
}

const scoreColor = (score: number) =>
  score >= 70 ? "#34d399" : score >= 50 ? "#fbbf24" : "#fb7185";

export default function InterviewList({ onCreateInterview }: { onCreateInterview?: () => void }) {
  const router = useRouter();
  const { getToken, isAuthenticated, authLoading } = useAuth();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{
    show: boolean;
    interviewId: string;
    jobRole: string;
  }>({ show: false, interviewId: "", jobRole: "" });
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    const fetchInterviews = async () => {
      try {
        // Wait for authentication state to be determined
        if (isAuthenticated === null || isAuthenticated === undefined) {
          console.log("Authentication state not yet determined, waiting...");
          return;
        }

        // Check if user is authenticated first
        if (!isAuthenticated) {
          console.log("User not authenticated, redirecting to login");
          router.push("/login");
          return;
        }

        // Get token from AuthContext
        const token = await getToken();
        console.log('[InterviewList] Token retrieved:', token ? 'Present' : 'Missing');

        if (!token) {
          console.error('[InterviewList] Authentication token not found - isAuthenticated:', isAuthenticated);
          throw new Error("Authentication token not found");
        }

        const response = await fetch("/api/interview/user", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch interviews");
        }

        const data = await response.json();
        // console.log(data);
        setInterviews(data.interviews || []);
      } catch (error) {
        console.error("error fetching interviews: ", error);
        setError("Failed to load interviews, Please try again later!");
      } finally {
        setLoading(false);
      }
    };

    fetchInterviews();
  }, [getToken, isAuthenticated, router, authLoading]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold border rounded-full bg-emerald-900/20 border-emerald-700/30 text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Completed
          </span>
        );
      case "in-progress":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold border rounded-full bg-[#B77895]/10 border-[#B77895]/40 text-[var(--theme-hover)]">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--theme-hover)] animate-pulse" />
            In Progress
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold border rounded-full bg-zinc-900/40 border-zinc-700/40 text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
            Pending
          </span>
        );
    }
  };

  const handleContinueInterview = (id: string) => {
    router.push(`/interview/${id}`);
  };

  const handleViewResults = (id: string) => {
    router.push(`/interview/${id}/results`);
  };

  const handleViewAnalysis = (id: string) => {
    router.push(`/interview/${id}/analysis`);
  };

  const handleDeleteClick = (interviewId: string, jobRole: string) => {
    setDeleteConfirm({
      show: true,
      interviewId,
      jobRole
    });
  };

  const handleDeleteConfirm = async () => {
    const { interviewId } = deleteConfirm;
    setDeleting(interviewId);
    
    try {
      const token = await getToken();
      
      if (!token) {
        throw new Error("Authentication token not found");
      }

      const response = await fetch(`/api/interview/${interviewId}/delete`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete interview");
      }

      // Remove the deleted interview from the list
      setInterviews(prev => prev.filter(interview => interview._id !== interviewId));
      
      // Close confirmation dialog
      setDeleteConfirm({ show: false, interviewId: "", jobRole: "" });
      
      console.log("Interview deleted successfully");
      
    } catch (error) {
      console.error("Error deleting interview:", error);
      setError(error instanceof Error ? error.message : "Failed to delete interview");
    } finally {
      setDeleting(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirm({ show: false, interviewId: "", jobRole: "" });
  };

  if (loading) {
    return <Loader />;
  }

  const completed = interviews.filter((i) => i.status === "completed");
  const inProgress = interviews.filter((i) => i.status === "in-progress");
  const averageScore = completed.length
    ? Math.round(completed.reduce((sum, i) => sum + (i.overallScore || 0), 0) / completed.length)
    : null;

  const stats = [
    { label: "Total Interviews", value: interviews.length, icon: ListChecks },
    { label: "Completed", value: completed.length, icon: CheckCircle2 },
    { label: "In Progress", value: inProgress.length, icon: Clock },
    { label: "Average Score", value: averageScore ?? "—", icon: TrendingUp },
  ];

  return (
    <div className="text-white">
      {error && (
        <div className="flex items-center justify-between gap-4 p-4 mb-8 border-l-4 rounded-lg border-red-500 bg-red-900/20">
          <p className="text-sm text-red-200">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium text-white rounded-full cursor-pointer border border-red-400/40 hover:bg-red-900/40 shrink-0"
          >
            <RotateCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      )}

      {!error && interviews.length > 0 && (
        <div className="grid grid-cols-2 gap-4 mb-10 lg:grid-cols-4">
          {stats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="flex items-center gap-4 px-5 py-5 bg border border-[#352a31] rounded-xl max-sm:px-4">
              <div className="flex items-center justify-center w-11 h-11 rounded-lg bg-[#352a31]/60 border border-[#453841]/60 shrink-0 max-sm:hidden">
                <Icon className="w-5 h-5 text-[var(--theme-hover)]" />
              </div>
              <div>
                <p className="text-3xl font-semibold leading-none">{value}</p>
                <p className="mt-1.5 text-sm text-[var(--nav-text)]">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {!error && interviews.length === 0 ? (
        <div className="flex flex-col items-center max-w-xl gap-4 px-8 py-14 mx-auto text-center bg border border-[#352a31] rounded-2xl">
          <div className="flex items-center justify-center rounded-full w-14 h-14 bg-[#352a31]/60 border border-[#453841]/60">
            <Sparkles className="w-6 h-6 text-[var(--theme-hover)]" />
          </div>
          <h2 className="text-2xl font-semibold">No interviews yet</h2>
          <p className="text-[var(--nav-text)]">
            Create your first AI interview to start practicing and get personalized feedback.
          </p>
          {onCreateInterview && (
            <button
              onClick={onCreateInterview}
              className="flex items-center gap-2 px-6 py-3 mt-2 font-semibold text-white transition-all duration-500 rounded-full cursor-pointer btn"
            >
              <Plus className="w-5 h-5" />
              Create Interview
            </button>
          )}
        </div>
      ) : interviews.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-2xl font-semibold">Your Interviews</h2>
            <span className="text-sm text-[var(--nav-text)]">
              {interviews.length} {interviews.length === 1 ? "interview" : "interviews"}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {interviews.map((interview) => {
              const showScore = interview.status === "completed" || interview.status === "in-progress";
              const score = Math.max(0, Math.min(100, interview.overallScore || 0));

              return (
                <div
                  key={interview._id}
                  className="flex flex-col bg border border-[#352a31] rounded-xl p-6 transition-colors duration-300 hover:border-[#5a4450]"
                >
                  {/* Title, status, delete */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="min-w-0">
                      <h3 className="text-xl font-bold capitalize truncate max-sm:text-lg">{interview.jobRole}</h3>
                      <div className="mt-2">{getStatusBadge(interview.status)}</div>
                    </div>
                    <button
                      onClick={() => handleDeleteClick(interview._id, interview.jobRole)}
                      disabled={deleting === interview._id}
                      className="p-2 -mt-1 -mr-2 text-gray-500 transition-colors rounded-full cursor-pointer hover:text-red-400 hover:bg-red-900/20 disabled:opacity-50"
                      title="Delete interview"
                    >
                      {deleting === interview._id ? (
                        <div className="w-4 h-4 border-2 border-gray-400 rounded-full border-t-transparent animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {/* Tech stack */}
                  <div className="flex flex-wrap gap-2 mb-5">
                    {interview.techStack.map((tech: string, index: number) => (
                      <span
                        className="text-xs px-2.5 py-1 rounded-full bg-[#352a31]/50 border border-[#453841]/50 text-gray-300"
                        key={index}
                      >
                        {tech}
                      </span>
                    ))}
                  </div>

                  {/* Meta and score */}
                  <div className="flex items-center justify-between gap-4 py-4 mb-5 border-y border-[#352a31]">
                    <div className="flex flex-col gap-2 text-sm text-gray-400">
                      <span className="flex items-center gap-2">
                        <Briefcase className="w-4 h-4 text-[var(--nav-text)]" />
                        {interview.yearsOfExperience} {interview.yearsOfExperience <= 1 ? "Year" : "Years"} experience
                      </span>
                      <span className="flex items-center gap-2">
                        <CalendarDays className="w-4 h-4 text-[var(--nav-text)]" />
                        {new Date(interview.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    </div>

                    {showScore && (
                      <div
                        className="relative flex items-center justify-center w-16 h-16 rounded-full shrink-0"
                        style={{ background: `conic-gradient(${scoreColor(score)} ${score * 3.6}deg, #352a31 0deg)` }}
                        title={`Score: ${score}/100`}
                      >
                        <div className="flex flex-col items-center justify-center rounded-full w-[52px] h-[52px] bg-[#1a1518]">
                          <span className="text-lg font-bold leading-none" style={{ color: scoreColor(score) }}>{score}</span>
                          <span className="text-[10px] text-zinc-500">/100</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 mt-auto">
                    {interview.status === "in-progress" && (
                      <button
                        onClick={() => handleContinueInterview(interview._id)}
                        className="flex items-center justify-center flex-1 gap-2 py-2.5 text-sm font-semibold text-white transition-all duration-500 rounded-full cursor-pointer btn"
                      >
                        <PlayCircle className="w-4 h-4" />
                        Continue
                      </button>
                    )}
                    {interview.status === "completed" && (
                      <button
                        onClick={() => handleViewResults(interview._id)}
                        className="flex items-center justify-center flex-1 gap-2 py-2.5 text-sm font-semibold text-white transition-all duration-500 rounded-full cursor-pointer btn"
                      >
                        <BarChart3 className="w-4 h-4" />
                        Results
                      </button>
                    )}
                    {showScore && (
                      <button
                        onClick={() => handleViewAnalysis(interview._id)}
                        className="flex items-center justify-center flex-1 gap-2 py-2.5 text-sm font-medium text-white transition-all duration-300 border-2 rounded-full cursor-pointer border-[#413239] hover:border-[var(--theme-color)] hover:bg-[#1f1f1f]"
                      >
                        <ClipboardList className="w-4 h-4" />
                        Analysis
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md p-6 mx-4 shadow-2xl bg border border-[#352a31] rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-full bg-red-900/30">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-xl font-bold text-white">Delete Interview</h3>
            </div>

            <p className="mb-6 text-gray-300">
              Are you sure you want to delete the interview for{" "}
              <span className="font-semibold text-white capitalize">&quot;{deleteConfirm.jobRole}&quot;</span>?
              <span className="block mt-2 text-sm text-red-400">
                This action cannot be undone and all interview data will be permanently lost.
              </span>
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={handleDeleteCancel}
                disabled={deleting !== null}
                className="px-5 py-2 text-sm font-medium text-white transition-colors border-2 rounded-full cursor-pointer border-[#413239] hover:border-[var(--theme-color)] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleting !== null}
                className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white transition-colors bg-red-600 rounded-full cursor-pointer hover:bg-red-700 disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white rounded-full border-t-transparent animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Interview
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

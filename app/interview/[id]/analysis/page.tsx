"use client";
import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Loader from "@/components/Loader";
import ErrorInterview from "@/components/errors/ErrorInterview";
import { AlertCircle, ArrowLeft, Hourglass, PlayCircle } from "lucide-react";
import QuestionList from "@/components/AnalysisPage/QuestionList";
import QuizAndAnswer from "@/components/AnalysisPage/QuizAndAnswer";
import AnswerAnalysis from "@/components/AnalysisPage/AnswerAnalysis";
import PreviousNextBtn from "@/components/AnalysisPage/PreviousNextBtn";
import InterviewNav from "@/components/interview/InterviewNav";
import { useAuth } from "@/context/AuthContext";

interface AnalysisProps {
  params: Promise<{
    id: string;
  }>;
}

export default function AnalysisPage({ params }: AnalysisProps) {
  // In Next.js 15, params are a Promise and need to be unwrapped
  const { id: interviewId } = use(params);

  const router = useRouter();
  const { getToken, isAuthenticated, authLoading } = useAuth();
  const [interview, setInterview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authLoading) return;
    // Fetch interview data
    const fetchInterview = async () => {
      try {
        // Check authentication
        if (!isAuthenticated) {
          router.push("/login");
          return;
        }

        // Get token from AuthContext
        const token = await getToken();
        if (!token) {
          router.push("/login");
          return;
        }

        // fetch interview
        const response = await fetch(`/api/interview/${interviewId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          // add cache: 'no-store' to prevent caching
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch interview data");
        }

        const data = await response.json();

        // allow both completed and in-progress interviews
        if (
          data.interview.status !== "completed" &&
          data.interview.status !== "in-progress"
        ) {
          router.push(`/interview/${interviewId}`);
          return;
        }
        setInterview(data.interview);
        console.log(data.interview);
      } catch (error) {
        console.error("Error fetching interviews: ", error);
        setError("Failed to load interview analysis. Please try again later");
      } finally {
        setLoading(false);
      }
    };

    if (isAuthenticated !== null) {
      fetchInterview();
    }
  }, [interviewId, router, isAuthenticated, getToken, authLoading]);

  // switch question and bring the start of its content into view
  const goToQuestion = (index: number) => {
    setActiveQuestionIndex(index);
    const top = contentRef.current?.getBoundingClientRect().top;
    if (top !== undefined && top < 0) {
      contentRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (loading) {
    return <Loader />;
  }

  if (error) {
    return <ErrorInterview errors={error} bg="red" />;
  }

  if (!interview || !interview.questions || interview.questions.length === 0) {
    return (
      <ErrorInterview
        bg="yellow"
        errors={"No questions found for this interview"}
      />
    );
  }

  const activeQuestion = interview.questions[activeQuestionIndex];
  const isInProgress = interview.status === "in-progress";
  const continueInterview = () => router.push(`/interview/${interviewId}`);

  return (
    <>
      <InterviewNav interview={interview} />
      <div className="px-10 pt-10 pb-16 mx-auto text-white max-w-7xl max-sm:px-6">
        {/* heading and actions */}
        <div className="flex items-end justify-between gap-6 mb-8 max-md:flex-col max-md:items-center max-md:text-center">
          <div className="flex flex-col gap-3 max-md:items-center">
            <span className="w-fit px-4 py-1.5 text-sm text-white rounded-full border-2 border-[#413239] bg-[#1f1f1f]">
              Answer Analysis
            </span>
            <h1 className="text-4xl font-semibold capitalize text-[var(--nav-text)] max-sm:text-3xl">
              <span className="text-[var(--theme-color)]">{interview.jobRole}</span> Interview
            </h1>
            {isInProgress ? (
              <p className="flex items-center gap-2 text-sm text-amber-400">
                <AlertCircle className="w-4 h-4 shrink-0" />
                This interview is still in progress. Analysis is only available for answered questions.
              </p>
            ) : (
              <p className="text-[var(--nav-text)]">Review each answer with detailed AI feedback</p>
            )}
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {interview.status === "completed" && (
              <Link
                href={`/interview/${interviewId}/results`}
                className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white transition-all duration-300 border-2 rounded-full border-[#413239] hover:border-[var(--theme-color)] hover:bg-[#1f1f1f]"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Results
              </Link>
            )}
            {isInProgress && (
              <button
                onClick={continueInterview}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white transition-all duration-500 rounded-full cursor-pointer btn"
              >
                <PlayCircle className="w-4 h-4" />
                Continue Interview
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
          {/* question list: chips on mobile, sidebar on desktop */}
          <QuestionList
            activeQuestionIndex={activeQuestionIndex}
            interview={interview}
            onClick={goToQuestion}
          />

          {/* question analysis */}
          <div ref={contentRef} className="space-y-6 md:col-span-3 scroll-mt-6">
            <QuizAndAnswer
              onClick={continueInterview}
              interview={interview}
              activeQuestion={activeQuestion}
              activeQuestionIndex={activeQuestionIndex}
            />

            {/* skipped questions of a finished interview also have an analysis (score 0) */}
            {typeof activeQuestion.analysis?.score === "number" ? (
              <AnswerAnalysis activeQuestion={activeQuestion} />
            ) : activeQuestion.answer ? (
              (
                <div className="p-8 text-center bg border border-[#352a31] rounded-2xl">
                  <Hourglass className="w-6 h-6 mx-auto mb-3 text-[var(--theme-hover)]" />
                  <p className="mb-1 text-gray-300">Analysis is being generated for this question.</p>
                  {isInProgress && (
                    <p className="text-sm text-[var(--nav-text)]">Complete the interview to see full analysis.</p>
                  )}
                </div>
              )
            ) : (
              <div className="p-8 text-center bg border border-[#352a31] rounded-2xl">
                <p className="mb-4 text-gray-300">Answer this question to see analysis.</p>
                {isInProgress && (
                  <button
                    onClick={continueInterview}
                    className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white transition-all duration-500 rounded-full cursor-pointer btn"
                  >
                    <PlayCircle className="w-4 h-4" />
                    Continue Interview
                  </button>
                )}
              </div>
            )}

            {/* previous / next */}
            <div className="flex items-center justify-between gap-4">
              <PreviousNextBtn
                direction="previous"
                text="Previous Question"
                disabled={activeQuestionIndex === 0}
                onClick={() => goToQuestion(Math.max(0, activeQuestionIndex - 1))}
              />
              <span className="text-sm text-[var(--nav-text)]">
                {activeQuestionIndex + 1} / {interview.questions.length}
              </span>
              <PreviousNextBtn
                direction="next"
                text="Next Question"
                disabled={activeQuestionIndex === interview.questions.length - 1}
                onClick={() => goToQuestion(Math.min(interview.questions.length - 1, activeQuestionIndex + 1))}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

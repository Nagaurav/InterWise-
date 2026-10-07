"use client";
import { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import Loader from "@/components/Loader";
import ErrorInterview from "@/components/errors/ErrorInterview";
import ResultsNav from "@/components/ResultsPage/ResultsNav";
import ResultTabBtn from "@/components/ResultsPage/ResultTabBtn";
import InterviewDetails from "@/components/ResultsPage/InterviewDetails";
import OverviewTabData from "@/components/ResultsPage/OverviewTabData";
import FeedbackTabData from "@/components/ResultsPage/FeedbackTabData";
import InterviewNav from "@/components/interview/InterviewNav";
import { useAuth } from "@/context/AuthContext";

interface ResultsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function ResultsPage({ params }: ResultsPageProps) {
  // In Next.js 15, params are a Promise and need to be unwrapped
  const { id: interviewId } = use(params);

  const router = useRouter();
  const { getToken, isAuthenticated, authLoading } = useAuth();
  const [interview, setInterview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [shareCopied, setShareCopied] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authLoading) return;
    const fetchInterview = async () => {
      try {
        setLoading(true);

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

        console.log(`Fetching results for interview: ${interviewId}`);
        const response = await fetch(`/api/interview/${interviewId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          // add cache: no-store to prevent chaching issue
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Failed to fetch interview results");
        }

        const data = await response.json();

        // verify that the interview is completed
        if (data.interview.status != "completed") {
          console.log(
            "Interview is not completed, redirecting to interview page"
          );
          router.push(`/interview/${interviewId}`);
          return;
        }

        console.log(
          "Results loaded successfully for interview: ",
          data.interview._id
        );
        console.log(data.interview);
        setInterview(data.interview);
      } catch (error) {
        console.error("Error fetching interview: ", error);
        setError("Failed to load interview results. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchInterview();
  }, [interviewId, router, isAuthenticated, getToken, authLoading]);

  const handlePrint = () => {
    const printContents = resultsRef.current?.innerHTML;
    if (!printContents) return;

    // Print from a separate window: overwriting document.body here would break the React app
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Interview Results - ${interview.jobRole}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #222; padding: 24px; }
            h1, h2, h3 { margin-top: 20px; }
            svg { width: 16px; height: 16px; vertical-align: middle; }
            ul, ol { padding-left: 20px; }
            li { margin-bottom: 6px; }
          </style>
        </head>
        <body>
          <h1>Interview Results - ${interview.jobRole}</h1>
          ${printContents}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  const handleShare = () => {
    // copy a shareable link to the clipboard
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => {
        setShareCopied(true);
        setTimeout(() => setShareCopied(false), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy link: ", err);
      });
  };

  if (loading) {
    return <Loader />;
  }

  if (error) {
    return <ErrorInterview errors={error} bg="red" />;
  }

  if (!interview) {
    return <ErrorInterview errors={"interview not found"} bg="yellow" />;
  }

  return (
    <>
      <InterviewNav interview={interview} />
      <div className="px-10 pt-10 pb-16 mx-auto text-white max-w-7xl max-sm:px-6">
        <ResultsNav
          interviewId={interviewId}
          jobRole={interview.jobRole}
          date={new Date(interview.completedAt || interview.createdAt).toLocaleDateString(undefined, {
            day: "numeric", month: "long", year: "numeric",
          })}
          handlePrint={handlePrint}
          handleShare={handleShare}
          shareCopied={shareCopied}
        />

        <div ref={resultsRef}>
          {/* score + interview details */}
          <InterviewDetails interview={interview} />

          {/* tabs */}
          <div className="flex w-fit p-1 mb-6 rounded-full bg-[#1f1f1f] border border-[#352a31] max-sm:mx-auto">
            <ResultTabBtn
              tabText="overview"
              onClick={() => setActiveTab("overview")}
              activeTab={activeTab}
              text="Overview"
            />
            <ResultTabBtn
              tabText="feedback"
              onClick={() => setActiveTab("feedback")}
              activeTab={activeTab}
              text="Detailed Feedback"
            />
          </div>

          {activeTab === "overview" && <OverviewTabData interview={interview} />}
          {activeTab === "feedback" && <FeedbackTabData interview={interview} />}
        </div>
      </div>
    </>
  );
}

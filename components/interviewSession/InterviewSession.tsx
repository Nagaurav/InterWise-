"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from 'next/navigation';
import { useAuth } from "@/context/AuthContext";
import {
  ISpeechRecognition,
  ISpeechRecognitionEvent,
  ISpeechRecognitionErrorEvent,
  InterviewSessionProps,
} from "./SessionTypes";
import PrevNextBtn from "./PrevNextBtn";
import { Mic, Sparkles, Lightbulb, Zap, CheckCircle2, Volume2, VolumeX } from "lucide-react";

// Extend the Window interface to include webkitSpeechRecognition
declare global {
  interface Window {
    webkitSpeechRecognition: typeof SpeechRecognition;
    SpeechRecognition: typeof SpeechRecognition;
  }
}

// Define the SpeechRecognition interface
interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: (event: ISpeechRecognitionEvent) => void;
  onerror: (event: ISpeechRecognitionErrorEvent) => void;
  onend: () => void;
  onstart: () => void;
}

// Define the SpeechRecognition constructor
declare const SpeechRecognition: {
  prototype: SpeechRecognition;
  new (): SpeechRecognition;
};

export default function InterviewSession({
  interview: initialInterview,
  onInterviewUpdate,
}: InterviewSessionProps) {
  const router = useRouter();
  const { getToken } = useAuth();
  
  // Local state for interview data
  const [interview, setInterview] = useState(initialInterview);
  
  // Update local state when initialInterview changes
  useEffect(() => {
    setInterview(initialInterview);
  }, [initialInterview]);

  // State management
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [progress, setProgress] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [recordingTime, setRecordingTime] = useState(0);
  const [isReadAloudEnabled, setIsReadAloudEnabled] = useState(true);
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false);

  // Refs
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const timeRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize interview session
  useEffect(() => {
    if (interview?.questions?.length) {
      try {
        const firstUnansweredIndex = interview.questions.findIndex(
          (q) => !q.answer || q.answer.trim() === ""
        );
        
        // BUGFIX: If all answered (-1), go to LAST question, not first (0).
        const newIndex = firstUnansweredIndex === -1
          ? interview.questions.length - 1
          : firstUnansweredIndex;
        setCurrentIndex(newIndex);
        setUserAnswer(interview.questions[newIndex]?.answer || "");
      } catch (err) {
        setError("Error initializing interview. Please refresh the page");
      }
    }
  }, [interview]);

  // Update progress when current index changes
  useEffect(() => {
    if (interview?.questions?.length) {
      setProgress(Math.round((currentIndex / interview.questions.length) * 100));
    }
  }, [currentIndex, interview]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (timeRef.current) {
        clearInterval(timeRef.current);
      }
      // NEW: Stop any speech when leaving the page
      window.speechSynthesis.cancel();
    };
  }, []);

  // NEW: Text-to-Speech for questions
  useEffect(() => {
    // Get the current question text safely
    const currentQuestionText = interview?.questions[currentIndex]?.text;

    if (isReadAloudEnabled && currentQuestionText) {
      // Stop any previous speech
      window.speechSynthesis.cancel();

      // Create and speak the new utterance
      const utterance = new SpeechSynthesisUtterance(currentQuestionText);
      utterance.lang = "en-US"; // Set language
      window.speechSynthesis.speak(utterance);
    }

    // Cleanup: stop speaking if the component unmounts or index changes
    return () => {
      window.speechSynthesis.cancel();
    };
  }, [currentIndex, interview?.questions, isReadAloudEnabled]); // Dependencies

  // Handle speech to text
  const handleSpeechToText = () => {
    if (isRecording) {
      stopRecording();
      return;
    }
    startRecording();
  };

  const startRecording = () => {
    try {
      // Get the appropriate SpeechRecognition implementation
      const SpeechRecognition = 
        (window as any).SpeechRecognition || 
        (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setError("Speech Recognition is not supported in your browser. Try using Chrome or Edge");
        return;
      }

      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = "en-US";
      recognition.continuous = true;
      recognition.interimResults = true;

      setTranscript("");
      setRecordingTime(0);
      
      timeRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      recognition.onstart = () => {
        console.log("Speech recognition started");
        setIsRecording(true);
      };

      recognition.onresult = (event: ISpeechRecognitionEvent) => {
        let finalTranscript = "";
        let interimResults = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + " ";
            setUserAnswer(prev => {
              const trimmedPrev = prev.trim();
              return trimmedPrev ? `${trimmedPrev} ${transcript}` : transcript;
            });
          } else {
            interimResults += transcript;
          }
        }
        setTranscript(interimResults);
      };

      recognition.onerror = (event: ISpeechRecognitionErrorEvent) => {
        console.error("Speech recognition error:", event.error);
        
        // Handle different types of speech recognition errors
        switch (event.error) {
          case 'no-speech':
            // Don't show error for no-speech, just stop recording silently
            console.log("No speech detected, stopping recording");
            break;
          case 'audio-capture':
            setError("Microphone access denied. Please allow microphone access and try again.");
            break;
          case 'not-allowed':
            setError("Microphone permission denied. Please enable microphone access in your browser settings.");
            break;
          case 'network':
            setError("Network error occurred during speech recognition. Please check your connection.");
            break;
          case 'aborted':
            // User manually stopped, don't show error
            console.log("Speech recognition was aborted by user");
            break;
          default:
            setError(`Speech recognition error: ${event.error}. Please try again.`);
        }
        
        stopRecording();
      };

      recognition.onend = () => {
        console.log("Speech recognition ended");
        stopRecording();
      };

      recognition.start();
    } catch (error) {
      console.error("Error starting speech recognition:", error);
      setError("Failed to start speech recognition. Please try again");
      stopRecording();
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    if (timeRef.current) {
      clearInterval(timeRef.current);
      timeRef.current = null;
    }
    setIsRecording(false);
  };

  // Format recording time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  // Navigation between questions
  const handleNextQuestion = async () => {
    if (currentIndex < interview.questions.length - 1) {
      if (isRecording) stopRecording();
      await saveCurrentAnswer();
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      setUserAnswer(interview.questions[newIndex]?.answer || "");
      setTranscript("");
    }
  };

  const handlePreviousQuestion = async () => {
    if (currentIndex > 0) {
      if (isRecording) stopRecording();
      await saveCurrentAnswer();
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      setUserAnswer(interview.questions[newIndex]?.answer || "");
      setTranscript("");
    }
  };

  // Save current answer
  const saveCurrentAnswer = async (): Promise<boolean> => {
    if (!userAnswer.trim()) return false;

    try {
      const token = await getToken();
      if (!token) {
        throw new Error("No authentication token found. Please log in again.");
      }

      const response = await fetch(`/api/interview/${interview._id}/answer`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          questionIndex: currentIndex,
          answer: userAnswer.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save answer");
      }

      const data = await response.json();
      
      // Update the parent component with the latest interview data
      if (onInterviewUpdate && data.interview) {
        onInterviewUpdate(data.interview);
        
        // Update the local state with the latest interview data
        // This ensures the UI is in sync with the server
        setInterview(data.interview);
      }

      return true;
    } catch (err) {
      console.error("Error saving answer:", err);
      setError(err instanceof Error ? err.message : "Failed to save answer");
      return false;
    }
  };

  // Handle interview completion
  const handleCompleteInterview = async () => {
    setIsSubmitting(true);
    setError("");

    try {
      // First, save the current answer
      const saved = await saveCurrentAnswer();
      if (!saved) {
        throw new Error("Failed to save your answer. Please try again.");
      }

      // Get the auth token
      const token = await getToken();
      if (!token) {
        throw new Error("Authentication required. Please sign in again.");
      }

      // Finalize the interview (to trigger AI feedback)
      const completeRes = await fetch(
        `/api/interview/${interview._id}/complete`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!completeRes.ok) {
        let errorData;
        try {
          errorData = await completeRes.json();
          console.error('Complete interview API error:', errorData);
          
          if (errorData.unansweredCount) {
            throw new Error(
              `Please answer all ${errorData.unansweredCount} remaining questions before submitting.`
            );
          }
          
          // If we have an error message from the server, use it
          const errorMessage = errorData.error || errorData.message || 'Unknown server error';
          throw new Error(
            `Failed to complete interview: ${errorMessage}. Please try again.`
          );
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
          throw new Error(
            `Failed to complete interview (status: ${completeRes.status}). Please try again.`
          );
        }
      }

      // Update the interview status
      const updatedInterview = await completeRes.json();
      setInterview(updatedInterview);
      onInterviewUpdate(updatedInterview);

      // Redirect to results page
      router.push(`/interview/${interview._id}/results`);
    } catch (err) {
      console.error("Error completing interview:", err);
      setError(
        err instanceof Error
          ? err.message
          : "An error occurred while submitting the interview."
      );
      throw err; // Re-throw to allow parent components to handle if needed
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!userAnswer.trim()) return;

    setIsSubmitting(true);
    setError("");

    try {
      // Save the answer
      await saveCurrentAnswer();

      // Move to next question or show submit confirmation
      const nextIndex = currentIndex + 1;
      if (nextIndex < interview.questions.length) {
        setCurrentIndex(nextIndex);
        setUserAnswer(interview.questions[nextIndex]?.answer || "");
      } else {
        // Show confirmation dialog instead of directly submitting
        setShowSubmitConfirmation(true);
      }
    } catch (err) {
      console.error("Error submitting answer:", err);
      setError(err instanceof Error ? err.message : "Failed to submit answer");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!interview || !interview.questions) {
    return <div className="p-6 text-white">Loading interview data...</div>;
  }

  const currentQuestion = interview.questions[currentIndex];
  if (!currentQuestion) {
    return <div className="p-6 text-white">No questions found in this interview.</div>;
  }

  // Handle confirmation dialog actions
  const handleConfirmSubmit = async () => {
    setShowSubmitConfirmation(false);
    try {
      await handleCompleteInterview();
    } catch (error) {
      console.error("Error completing interview:", error);
      setError(error instanceof Error ? error.message : "An error occurred while submitting the interview.");
    }
  };

  const handleCancelSubmit = () => {
    setShowSubmitConfirmation(false);
  };

  return (
    <div className="flex flex-col gap-6 p-6 text-white bg-[var(--input-bg)]/30 rounded-lg shadow-sm">
      {/* Submit Confirmation Dialog */}
      {showSubmitConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-[var(--card-bg)] p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Submit Interview</h3>
            <p className="mb-6">Are you sure you want to submit your interview? You won't be able to make changes after submission.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancelSubmit}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
                disabled={isSubmitting}
              >
                Review Answers
              </button>
              <button
                onClick={handleConfirmSubmit}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-blue-500 rounded-md hover:opacity-90 transition-opacity disabled:opacity-50"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Interview'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Navigation and progress */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-gray-400">
          <div className="flex items-center gap-2">
            Question
            <span className="bg-gradient-to-br from-[#b87a9c] to-[#d8a1bc] text-white font-bold rounded-full w-7 h-7 flex items-center justify-center text-xs shadow-lg shadow-[#b87a9c]/20">
              {currentIndex + 1}
            </span>{" "}
            <span>of {interview.questions.length}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <PrevNextBtn
            onClick={handlePreviousQuestion}
            disabled={currentIndex === 0 || isSubmitting}
            label="Previous"
          />
          <PrevNextBtn
            onClick={handleNextQuestion}
            disabled={currentIndex === interview.questions.length - 1 || isSubmitting}
            label="Next"
          />
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full rounded-full h-2.5 bg-slate-800">
        <div
          className="bg-gradient-to-r from-[#b87a9c] to-[#d8a1bc] h-2.5 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Question and answer section */}
        <div className="flex-1 space-y-6">
          {/* Question */}
          <div className="p-6 bg-gradient-to-r from-[#1e1e2d] to-[#2d1e2d] rounded-xl shadow-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Question</h2>
              <button
                type="button"
                onClick={() => setIsReadAloudEnabled(!isReadAloudEnabled)}
                title={
                  isReadAloudEnabled
                    ? "Disable Read Aloud"
                    : "Enable Read Aloud"
                }
                className="p-2 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                {isReadAloudEnabled ? (
                  <Volume2 className="w-5 h-5" />
                ) : (
                  <VolumeX className="w-5 h-5" />
                )}
              </button>
            </div>
            <p className="text-gray-300">{currentQuestion.text}</p>
          </div>

          {/* Answer */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">Your Answer</h2>
              <button
                type="button"
                onClick={handleSpeechToText}
                disabled={isSubmitting}
                className={`flex items-center gap-2 px-4 py-2 rounded-md ${
                  isRecording
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-blue-600 hover:bg-blue-700'
                } text-white transition-colors`}
              >
                <Mic className="w-4 h-4" />
                {isRecording ? `Recording... ${formatTime(recordingTime)}` : 'Use Voice Input'}
              </button>
            </div>

            <div className="relative">
              <textarea
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Type or record your answer here..."
                className="w-full min-h-[200px] p-4 bg-[#1e1e2d] border border-[#3a2a3a] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#b87a9c] focus:border-transparent"
                disabled={isSubmitting}
              />
              {transcript && (
                <div className="absolute bottom-2 left-2 right-2 p-2 text-sm text-gray-400 bg-black/50 rounded">
                  {transcript}
                </div>
              )}
            </div>

            {/* Submit button */}
            <button
              type="button"
              onClick={handleSubmitAnswer}
              disabled={isSubmitting || !userAnswer.trim()}
              className="w-full py-3 px-6 bg-gradient-to-r from-[#b87a9c] to-[#d8a1bc] text-white font-medium rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </span>
              ) : currentIndex < interview.questions.length - 1 ? (
                'Save & Continue'
              ) : (
                'Submit Interview'
              )}
            </button>

            {/* Error message */}
            {error && (
              <div className="p-3 text-red-500 bg-red-900/30 rounded-lg">
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

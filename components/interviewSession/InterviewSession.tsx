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
import { Mic, Sparkles, Lightbulb, Zap, CheckCircle2, Volume2, VolumeX, Timer } from "lucide-react";

// Seconds of inactivity (no typing, no voice input, question not being read aloud)
// before automatically moving to the next question
const QUESTION_TIME_LIMIT_SECONDS = 45;

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

  // Initialize interview session (only on first load: re-running this after every saved answer
  // would jump back to an earlier skipped question)
  const initializedRef = useRef(false);
  useEffect(() => {
    if (interview?.questions?.length && !initializedRef.current) {
      initializedRef.current = true;
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

  // Progress = share of questions answered (the old currentIndex-based value started at 0%
  // and never reached 100%, so it was always one question behind the "Question X of Y" label)
  useEffect(() => {
    if (interview?.questions?.length) {
      const answered = interview.questions.filter((q) => q.answer && q.answer.trim() !== "").length;
      setProgress(Math.round((answered / interview.questions.length) * 100));
    }
  }, [interview]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      wantListeningRef.current = false;
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
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
    // depends on the question text, not the whole interview object: saving an answer replaces that
    // object, which used to make the same question be read aloud again
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, interview?.questions[currentIndex]?.text, isReadAloudEnabled]);

  // ---------------------------------------------------------------------------
  // Voice input
  //
  // The button reflects what the user asked for (listening on/off), not the browser's own
  // start/end events. Chrome ends a recognition session by itself after a pause or a time
  // limit; while the user still wants to listen we quietly start a new session, so the button
  // doesn't flicker. Events from an old session are ignored so they can't affect a newer one,
  // except that a session being stopped may still deliver its last words (Chrome sends the
  // final text for the phrase in progress only after stop()).
  // ---------------------------------------------------------------------------
  const wantListeningRef = useRef(false);
  const restartTimesRef = useRef<number[]>([]); // recent automatic restarts, to stop runaway loops
  const networkRetriesRef = useRef(0);
  const stoppingRecognitionRef = useRef<any>(null); // session we stopped, still allowed to finish its words
  const flushWaitersRef = useRef<Array<() => void>>([]);
  const pendingInterimRef = useRef(""); // words heard but not yet finalized by the browser

  // Latest answer text, readable from async code (saving after the mic has delivered its last words)
  const userAnswerRef = useRef(userAnswer);
  userAnswerRef.current = userAnswer;
  const appendToAnswer = (text: string) => {
    setUserAnswer((prev) => {
      const next = prev.trim() ? `${prev.trim()} ${text}` : text;
      userAnswerRef.current = next;
      return next;
    });
  };

  // Recognition language; Indian English is recognized noticeably better with en-IN
  const [speechLang, setSpeechLangState] = useState("en-IN");
  const speechLangRef = useRef("en-IN");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("interwise:speechLang");
      if (saved) {
        setSpeechLangState(saved);
        speechLangRef.current = saved;
      }
    } catch {
      // storage unavailable: keep the default
    }
  }, []);
  // Saved only when the user changes it (saving from an effect could overwrite the stored value with the default)
  const setSpeechLang = (lang: string) => {
    setSpeechLangState(lang);
    speechLangRef.current = lang;
    try {
      localStorage.setItem("interwise:speechLang", lang);
    } catch {
      // storage unavailable: setting just won't be remembered
    }
  };

  const handleSpeechToText = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const startRecording = () => {
    const SpeechRecognitionImpl =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionImpl) {
      setError("Voice input is not supported in this browser. Please use Google Chrome, or type your answer.");
      return;
    }

    setError("");
    window.speechSynthesis.cancel(); // don't transcribe the question being read aloud
    wantListeningRef.current = true;
    restartTimesRef.current = [];
    networkRetriesRef.current = 0;
    setIsRecording(true);
    setTranscript("");
    setRecordingTime(0);
    if (timeRef.current) clearInterval(timeRef.current);
    timeRef.current = setInterval(() => setRecordingTime((prev) => prev + 1), 1000);

    startRecognitionSession(SpeechRecognitionImpl);
  };

  // Add words the browser heard but never finalized (e.g. cut off by a session ending)
  const commitPendingInterim = () => {
    const pending = pendingInterimRef.current.trim();
    pendingInterimRef.current = "";
    if (pending) appendToAnswer(pending);
  };

  const startRecognitionSession = (SpeechRecognitionImpl: any) => {
    let recognition: any;
    try {
      recognition = new SpeechRecognitionImpl();
    } catch (err) {
      console.warn("Could not create speech recognition:", err);
      failVoiceInput("Voice input could not be started. Please try again, or type your answer.");
      return;
    }
    recognitionRef.current = recognition;
    recognition.lang = speechLangRef.current;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    const isCurrent = () => recognitionRef.current === recognition;
    const isStopping = () => stoppingRecognitionRef.current === recognition;

    recognition.onresult = (event: ISpeechRecognitionEvent) => {
      if (!isCurrent() && !isStopping()) return;
      networkRetriesRef.current = 0;
      restartTimesRef.current = []; // speech is coming through, so restarts so far were healthy

      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = (event.results[i][0]?.transcript ?? "").trim();
        if (!text) continue;
        if (event.results[i].isFinal) {
          appendToAnswer(text);
        } else {
          interim += (interim ? " " : "") + text;
        }
      }
      pendingInterimRef.current = interim;
      setTranscript(interim);
    };

    recognition.onerror = (event: ISpeechRecognitionErrorEvent) => {
      if (!isCurrent()) return; // a stopping session just ends; nothing to report
      // warn, not error: these are expected and handled, and console.error triggers the Next.js dev overlay
      console.warn("Speech recognition error:", event.error);

      switch (event.error) {
        case "no-speech":
        case "aborted":
          return; // the session ends next; onend restarts it while the user still wants to listen
        case "network":
          networkRetriesRef.current += 1;
          if (networkRetriesRef.current <= 3) return; // onend retries after a short delay
          failVoiceInput(
            "Voice input couldn't reach the browser's speech service. It needs Google Chrome with an internet " +
              "connection, and may be blocked by some browsers (e.g. Brave, the desktop app), VPNs, firewalls or " +
              "ad-blockers. You can keep typing your answer instead."
          );
          return;
        case "audio-capture":
          failVoiceInput("No microphone was found. Please connect a microphone and try again.");
          return;
        case "not-allowed":
        case "service-not-allowed":
          failVoiceInput("Microphone access is blocked. Please allow microphone access for this site in your browser settings.");
          return;
        default:
          failVoiceInput(`Voice input stopped (${event.error}). Please try again, or type your answer.`);
      }
    };

    recognition.onend = () => {
      if (isStopping()) {
        // The session we stopped has delivered everything it will
        commitPendingInterim();
        stoppingRecognitionRef.current = null;
        setTranscript("");
        flushWaitersRef.current.splice(0).forEach((resolve) => resolve());
        return;
      }
      if (!isCurrent()) return;
      commitPendingInterim();
      setTranscript("");
      if (!wantListeningRef.current) return;

      // Chrome ended the session on its own: start a new one, unless it keeps ending without hearing anything
      const now = Date.now();
      restartTimesRef.current = [...restartTimesRef.current.filter((t) => now - t < 15000), now];
      if (restartTimesRef.current.length > 6) {
        failVoiceInput("Voice input keeps stopping. Please check your microphone and try again, or type your answer.");
        return;
      }
      const delay = networkRetriesRef.current > 0 ? 1000 * networkRetriesRef.current : 100;
      setTimeout(() => {
        if (wantListeningRef.current && isCurrent()) startRecognitionSession(SpeechRecognitionImpl);
      }, delay);
    };

    try {
      recognition.start();
    } catch (err) {
      console.warn("Could not start speech recognition:", err);
      failVoiceInput("Voice input could not be started. Please try again, or type your answer.");
    }
  };

  // Stop listening and wait (briefly) until the last words have been added to the answer.
  // Used before saving, so a phrase spoken right before Submit/Next isn't lost.
  const stopRecordingAndFlush = (): Promise<void> => {
    if (wantListeningRef.current || recognitionRef.current) stopRecording();
    if (!stoppingRecognitionRef.current) return Promise.resolve();
    return new Promise((resolve) => {
      flushWaitersRef.current.push(resolve);
      setTimeout(resolve, 1500); // don't hold up saving if the browser never reports the end
    });
  };

  // Stop listening and show why. Auto-start is switched off too, so the same error
  // doesn't come back on every new question.
  const failVoiceInput = (message: string) => {
    stopRecording();
    if (autoStartMicRef.current) {
      setAutoStartMic(false);
      setError(`${message} Auto-start mic has been turned off; you can turn it back on next to the voice button.`);
    } else {
      setError(message);
    }
  };

  // ---------------------------------------------------------------------------
  // Auto-start mic: once a new question has finished being read aloud (or straight away when
  // read-aloud is off), start listening so the user can simply begin talking.
  // ---------------------------------------------------------------------------
  const [autoStartMic, setAutoStartMicState] = useState(true);
  const autoStartMicRef = useRef(true);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("interwise:autoStartMic");
      if (saved !== null) {
        setAutoStartMicState(saved === "true");
        autoStartMicRef.current = saved === "true";
      }
    } catch {
      // storage unavailable: keep the default
    }
  }, []);
  // Saved only when changed (saving from an effect could overwrite the stored value with the default)
  const setAutoStartMic = (enabled: boolean) => {
    setAutoStartMicState(enabled);
    autoStartMicRef.current = enabled;
    try {
      localStorage.setItem("interwise:autoStartMic", String(enabled));
    } catch {
      // storage unavailable: setting just won't be remembered
    }
  };

  // Re-assigned every render so it always sees the latest state
  const autoStartRef = useRef<() => void>(() => {});
  autoStartRef.current = () => {
    if (!autoStartMicRef.current || isRecording || isSubmitting || showSubmitConfirmation) return;
    if (userAnswer.trim()) return; // already answered: don't start appending to it
    startRecording();
  };

  // When the question changes, wait until read-aloud has finished, then start the mic.
  // Polling speechSynthesis is more reliable than the utterance's "end" event, which Chrome
  // sometimes never fires for long text.
  useEffect(() => {
    if (!autoStartMic) return;
    let quietChecks = 0;
    const id = setInterval(() => {
      const synth = window.speechSynthesis;
      if (synth && (synth.speaking || synth.pending)) {
        quietChecks = 0;
        return;
      }
      quietChecks += 1;
      if (quietChecks >= 3) {
        clearInterval(id);
        autoStartRef.current();
      }
    }, 300);
    return () => clearInterval(id);
  }, [currentIndex, autoStartMic]);

  const stopRecording = () => {
    wantListeningRef.current = false;
    const recognition = recognitionRef.current;
    recognitionRef.current = null; // no more restarts or errors from this session...
    if (recognition) {
      stoppingRecognitionRef.current = recognition; // ...but it may still deliver its final words
      try {
        recognition.stop();
      } catch {
        stoppingRecognitionRef.current = null; // already stopped
      }
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

  // Inactivity timer: if there's no activity on a question for QUESTION_TIME_LIMIT_SECONDS,
  // save any draft and move on to the next question
  const [questionTimeLeft, setQuestionTimeLeft] = useState(QUESTION_TIME_LIMIT_SECONDS);
  const [timeoutNotice, setTimeoutNotice] = useState("");
  const questionDeadlineRef = useRef(Date.now() + QUESTION_TIME_LIMIT_SECONDS * 1000);
  const handleQuestionTimeoutRef = useRef<() => void>(() => {});

  const resetInactivityTimer = useCallback(() => {
    questionDeadlineRef.current = Date.now() + QUESTION_TIME_LIMIT_SECONDS * 1000;
    setQuestionTimeLeft(QUESTION_TIME_LIMIT_SECONDS);
  }, []);

  // A new question, typing/editing the answer, or new voice transcript all count as activity
  useEffect(() => {
    resetInactivityTimer();
  }, [currentIndex, userAnswer, transcript, resetInactivityTimer]);

  // Tick against a deadline so the timer stays accurate even if the tab is in the background
  useEffect(() => {
    if (showSubmitConfirmation || isSubmitting) return;
    const id = setInterval(() => {
      // The question still being read aloud counts as activity. A mic that is on but hearing nothing
      // does not; spoken words reset the timer through the transcript/answer changes above.
      const readingAloud = typeof window !== "undefined" && window.speechSynthesis?.speaking;
      if (readingAloud) {
        questionDeadlineRef.current = Date.now() + QUESTION_TIME_LIMIT_SECONDS * 1000;
      }
      const left = Math.max(0, Math.ceil((questionDeadlineRef.current - Date.now()) / 1000));
      setQuestionTimeLeft(left);
      if (left === 0) {
        clearInterval(id);
        handleQuestionTimeoutRef.current();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [currentIndex, showSubmitConfirmation, isSubmitting]);

  // Kept in a ref so the interval always calls the version that sees the latest answer
  handleQuestionTimeoutRef.current = async () => {
    await stopRecordingAndFlush();
    setIsSubmitting(true);
    try {
      await saveCurrentAnswer(); // saves the draft if there is one; an empty answer stays unanswered
    } finally {
      setIsSubmitting(false);
    }

    const nextIndex = currentIndex + 1;
    if (nextIndex < interview.questions.length) {
      setTimeoutNotice(`No activity on Question ${currentIndex + 1} for ${QUESTION_TIME_LIMIT_SECONDS} seconds, so you've been moved to the next question.`);
      setCurrentIndex(nextIndex);
      setUserAnswer(interview.questions[nextIndex]?.answer || "");
      setTranscript("");
    } else {
      setTimeoutNotice(`No activity on the last question for ${QUESTION_TIME_LIMIT_SECONDS} seconds.`);
      setShowSubmitConfirmation(true);
    }
  };

  // Hide the notice after a while
  useEffect(() => {
    if (!timeoutNotice) return;
    const id = setTimeout(() => setTimeoutNotice(""), 10000);
    return () => clearTimeout(id);
  }, [timeoutNotice]);

  // Navigation between questions
  const handleNextQuestion = async () => {
    if (currentIndex < interview.questions.length - 1) {
      await stopRecordingAndFlush();
      await saveCurrentAnswer();
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      setUserAnswer(interview.questions[newIndex]?.answer || "");
      setTranscript("");
    }
  };

  const handlePreviousQuestion = async () => {
    if (currentIndex > 0) {
      await stopRecordingAndFlush();
      await saveCurrentAnswer();
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      setUserAnswer(interview.questions[newIndex]?.answer || "");
      setTranscript("");
    }
  };

  // Save current answer
  const saveCurrentAnswer = async (): Promise<boolean> => {
    const answerToSave = userAnswerRef.current.trim();
    if (!answerToSave) return false;

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
          answer: answerToSave,
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
      // First, save the current answer (if any: an empty one is simply left unanswered and scores 0)
      await stopRecordingAndFlush();
      const hasAnswer = !!userAnswerRef.current.trim();
      const saved = await saveCurrentAnswer();
      if (hasAnswer && !saved) {
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
    await stopRecordingAndFlush(); // include words spoken right before clicking Submit
    if (!userAnswerRef.current.trim()) return;

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
            <p className="mb-4">Are you sure you want to submit your interview? You won't be able to make changes after submission.</p>
            {(() => {
              // unanswered = no saved answer, except the current question if something is typed in the box
              const unanswered = interview.questions.filter(
                (q, i) => !(q.answer && q.answer.trim()) && !(i === currentIndex && userAnswer.trim())
              ).length;
              return unanswered > 0 ? (
                <p className="p-3 mb-6 text-sm border-l-4 rounded-lg border-amber-500 bg-amber-900/20 text-amber-200">
                  {unanswered} {unanswered === 1 ? "question has" : "questions have"} no answer and will score 0.
                  Choose &quot;Review Answers&quot; to go back and answer {unanswered === 1 ? "it" : "them"}.
                </p>
              ) : (
                <div className="mb-6" />
              );
            })()}
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
      {/* The AI was unavailable when this interview was created, so it holds generic backup questions */}
      {interview.usedFallbackQuestions && (
        <div className="p-4 text-sm border-l-4 rounded-lg border-amber-500 bg-amber-900/20 text-amber-200">
          The AI service was unavailable when this interview was created, so these are general backup
          questions rather than ones based on your resume. Create a new interview to get personalized questions.
        </div>
      )}

      {timeoutNotice && (
        <div className="flex items-center gap-2 p-4 text-sm border-l-4 rounded-lg border-amber-500 bg-amber-900/20 text-amber-200">
          <Timer className="w-4 h-4 shrink-0" />
          {timeoutNotice}
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
      <div className="flex justify-between -mb-4 text-xs text-gray-400">
        <span>Progress</span>
        <span>
          {interview.questions.filter((q) => q.answer && q.answer.trim() !== "").length} of{" "}
          {interview.questions.length} answered
        </span>
      </div>
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
              <div className="flex items-center gap-2">
              <span
                title="Inactivity timer. Typing, voice input or the question being read aloud restarts it. If it runs out, your answer so far is saved and you move to the next question."
                className={`flex items-center gap-1.5 px-3 py-1 text-sm font-medium tabular-nums rounded-full border ${
                  questionTimeLeft <= 5
                    ? "text-rose-300 border-rose-500/50 bg-rose-900/20"
                    : questionTimeLeft <= 15
                    ? "text-amber-300 border-amber-500/50 bg-amber-900/20"
                    : "text-gray-300 border-[#413239] bg-[#1f1f1f]"
                }`}
              >
                <Timer className="w-4 h-4" />
                {formatTime(questionTimeLeft)}
              </span>
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
            </div>
            <p className="text-gray-300">{currentQuestion.text}</p>
          </div>

          {/* Answer */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold text-white">Your Answer</h2>
              <div className="flex items-center gap-3">
              <label
                className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer select-none"
                title="Start the mic automatically after each new question has been read aloud"
              >
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoStartMic}
                  aria-label="Auto-start mic"
                  onClick={() => setAutoStartMic(!autoStartMic)}
                  className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors cursor-pointer ${
                    autoStartMic ? "bg-[var(--theme-color)]" : "bg-zinc-700"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                      autoStartMic ? "translate-x-4" : "translate-x-0.5"
                    }`}
                  />
                </button>
                Auto-start mic
              </label>
              <select
                value={speechLang}
                onChange={(e) => setSpeechLang(e.target.value)}
                disabled={isRecording}
                title={isRecording ? "Stop the mic to change the voice language" : "Voice input language"}
                aria-label="Voice input language"
                className="px-2 py-1 text-xs text-gray-300 border rounded-full cursor-pointer bg-[#1f1f1f] border-[#413239] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="en-IN">English (India)</option>
                <option value="en-US">English (US)</option>
                <option value="en-GB">English (UK)</option>
              </select>
              <button
                type="button"
                onClick={handleSpeechToText}
                disabled={isSubmitting}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-full cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                  isRecording
                    ? "bg-rose-600 hover:bg-rose-700 text-white"
                    : "btn text-white"
                }`}
              >
                {isRecording ? (
                  <>
                    <span className="relative flex w-2.5 h-2.5">
                      <span className="absolute inline-flex w-full h-full rounded-full bg-white opacity-75 animate-ping" />
                      <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-white" />
                    </span>
                    Stop · {formatTime(recordingTime)}
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4" />
                    Start speaking
                  </>
                )}
              </button>
              </div>
            </div>

            <div className="relative">
              <textarea
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                placeholder="Type or record your answer here..."
                className="w-full min-h-[200px] p-4 bg-[#1e1e2d] border border-[#3a2a3a] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#b87a9c] focus:border-transparent"
                disabled={isSubmitting}
              />
              {isRecording && (
                <div className="absolute bottom-2 left-2 right-2 p-2 text-sm rounded bg-black/60">
                  {transcript ? (
                    <span className="italic text-gray-300">{transcript}</span>
                  ) : (
                    <span className="text-gray-500">Listening… speak your answer. Click Stop when you&apos;re done.</span>
                  )}
                </div>
              )}
            </div>

            {/* Submit button */}
            <button
              type="button"
              onClick={handleSubmitAnswer}
              disabled={isSubmitting || (!userAnswer.trim() && !transcript)}
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

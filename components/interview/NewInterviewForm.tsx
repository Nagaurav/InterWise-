"use client";
import { useState } from "react";
import { FileText, Upload, X } from "lucide-react";
import FormFeature from "../small-components/FormFeature";
import InterviwFormInputs from "../small-components/InterviwFormInputs";
import { useAuth } from "@/context/AuthContext";

interface NewInterviewFormProps {
  onClose: () => void;
  onStartInterview: (interviewData: any) => void;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const TECH_KEYWORDS = [
  "javascript","typescript","react","node","python","java","c#","c++","go","rust",
  "aws","azure","gcp","docker","kubernetes","sql","mongodb","postgresql","mysql"
];

const NewInterviewForm = ({ onClose, onStartInterview }: NewInterviewFormProps) => {
  const { getToken } = useAuth();
  const [form, setForm] = useState({
    jobRole: "",
    techStack: "",
    yearsOfExperience: 0,
    resumeText: "",
  });

  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [inputMode, setInputMode] = useState<"upload" | "paste">("upload");
  const [status, setStatus] = useState({
    fileError: "",
    error: "",
    apiWarning: "",
    isSubmitting: false
  });

  const updateForm = (key: string, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const resetErrors = () => {
    setStatus(prev => ({ ...prev, fileError: "", error: "", apiWarning: "" }));
  };

  const validateInputs = () => {
    const hasResume = (inputMode === "upload" && resumeFile) || (inputMode === "paste" && form.resumeText.trim());
    if (!hasResume && (!form.jobRole.trim() || !form.techStack.trim())) {
      return "Provide a resume or fill Job role & Tech stack.";
    }

    if (inputMode === "upload" && resumeFile) {
      if (resumeFile.size > MAX_FILE_SIZE) return "File size must be under 5MB";
      
      // The API only extracts text from PDFs
      const isPDF = resumeFile.type === "application/pdf" || resumeFile.name.toLowerCase().endsWith(".pdf");
      if (!isPDF) {
        return "Only PDF (.pdf) files are allowed";
      }
    }

    return "";
  };

  const prepareFormData = () => {
    const fd = new FormData();
    
    // If no resume is provided, ensure we have job role and tech stack
    const hasResume = (inputMode === "upload" && resumeFile) || (inputMode === "paste" && form.resumeText.trim());
    
    // Use provided values or fallback to defaults when resume is available
    const jobRole = form.jobRole.trim() || (hasResume ? "To be extracted from resume" : "");
    const techStackArray = form.techStack.trim() 
      ? form.techStack.split(",").map(i => i.trim()).filter(Boolean)
      : (hasResume ? ["To be extracted from resume"] : []);
    
    fd.append("jobRole", jobRole);
    fd.append("techStack", JSON.stringify(techStackArray));
    fd.append("yearsOfExperience", String(form.yearsOfExperience));

    // Always append resumeText (either from paste or as backup)
    fd.append("resumeText", form.resumeText);
    
    // Only append resume file if we're in upload mode and have a file
    if (inputMode === "upload" && resumeFile) {
      fd.append("resume", resumeFile);
    } else {
      // Don't send empty blob, just omit the resume field
      // The API will handle the case where only resumeText is provided
    }
    return fd;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetErrors();

    const validationMsg = validateInputs();
    if (validationMsg) {
      setStatus(prev => ({ ...prev, error: validationMsg }));
      return;
    }

    setStatus(prev => ({ ...prev, isSubmitting: true }));

    try {
      const token = await getToken();
      if (!token) throw new Error("Authentication token missing");

      const formData = prepareFormData();
      
      // Debug logging
      console.log("=== FORM SUBMISSION DEBUG ===");
      console.log("Resume file:", resumeFile);
      console.log("Input mode:", inputMode);
      console.log("Form data entries:");
      for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`${key}:`, { name: value.name, size: value.size, type: value.type });
        } else {
          console.log(`${key}:`, value);
        }
      }
      console.log("=== END DEBUG ===");

      const response = await fetch("/api/interview", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(response.status === 429 ? "AI busy, try later" : data.message || "Error starting interview");
      }

      if (data.message?.includes("default questions")) {
        setStatus(prev => ({ ...prev, apiWarning: data.message }));
      }

      onStartInterview(data.interview);
    } catch (err: any) {
      setStatus(prev => ({ ...prev, error: err.message || "Unexpected error" }));
    } finally {
      setStatus(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  const formIsOptional = !!(resumeFile || form.resumeText.trim());

  return (
    <section className="grid items-start w-full gap-12 px-10 pb-16 mx-auto max-w-7xl lg:grid-cols-2 max-sm:px-6">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xl mx-auto bg border border-[#352a31] rounded-2xl p-8 max-sm:p-6"
      >
        <div className="flex flex-col items-center gap-3 mb-8 text-center">
          <span className="px-4 py-1.5 text-sm text-white rounded-full border-2 border-[#413239] bg-[#1f1f1f]">
            New Interview
          </span>
          <h1 className="text-4xl font-semibold text-white max-sm:text-3xl">Create Your Interview</h1>
          <p className="text-[var(--nav-text)]">Tell us about the role, or upload your resume and we&apos;ll do the rest.</p>
        </div>

        <div className="flex flex-col gap-5">

          {/* Inputs */}
          {[
            {
              label: "Job Role",
              key: "jobRole",
              placeholder: formIsOptional ? "Frontend Developer (will be extracted from resume)" : "Frontend Developer",
              required: !formIsOptional
            },
            {
              label: "Tech-Stack (comma-separated)",
              key: "techStack",
              placeholder: formIsOptional ? "React, NodeJs, TypeScript (will be extracted from resume)" : "React, NodeJs, TypeScript",
              required: !formIsOptional
            }
          ].map(({ label, key, placeholder, required }) => (
            <div key={key} className="w-full">
              <InterviwFormInputs
                label={label}
                type="text"
                placeholder={placeholder}
                value={(form as any)[key]}
                required={required}
                isOptional={formIsOptional}
                onChange={(e) => updateForm(key, e.target.value)}
              />
              <p className="mt-1.5 text-xs text-zinc-500">
                {formIsOptional ? "Optional — will be extracted from resume if not provided" : "Required if no resume provided"}
              </p>
            </div>
          ))}

          {/* Experience */}
          <div className="w-full">
            <InterviwFormInputs
              label="Years of Experience"
              type="number"
              min={0} max={50}
              value={form.yearsOfExperience || ""}
              onChange={(e) => updateForm("yearsOfExperience", Number(e.target.value) || 0)}
              placeholder={formIsOptional ? "3 (will be extracted from resume)" : "3"}
              required={false}
              isOptional={true}
            />
            <p className="mt-1.5 text-xs text-zinc-500">
              Always optional — will be extracted from resume if not provided
            </p>
          </div>

          {/* Resume */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-200">Resume</span>
              <div className="flex p-1 rounded-full bg-[#1f1f1f] border border-[#352a31]">
                {["upload", "paste"].map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setInputMode(mode as any)}
                    className={`px-4 py-1.5 text-xs font-semibold rounded-full cursor-pointer transition-colors ${inputMode === mode ? "bg-[var(--theme-color)] text-white" : "text-zinc-400 hover:text-white"}`}
                  >
                    {mode === "upload" ? "Upload PDF" : "Paste Text"}
                  </button>
                ))}
              </div>
            </div>

            {/* Conditional Resume Input */}
            {inputMode === "upload" ? (
              resumeFile ? (
                <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-[var(--input-bg)] border border-[var(--theme-color)]/60">
                  <FileText className="flex-shrink-0 w-5 h-5 text-[var(--theme-hover)]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{resumeFile.name}</p>
                    <p className="text-xs text-zinc-500">{(resumeFile.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setResumeFile(null)}
                    aria-label="Remove file"
                    className="p-1.5 rounded-full cursor-pointer text-zinc-400 hover:text-white hover:bg-[#352a31]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center transition-colors border-2 border-dashed rounded-lg cursor-pointer bg-[var(--input-bg)] border-[#352a31] hover:border-[var(--theme-color)]">
                  <Upload className="w-6 h-6 text-[var(--theme-hover)]" />
                  <span className="text-sm font-medium text-white">Click to upload your resume</span>
                  <span className="text-xs text-zinc-500">PDF only, up to 5MB</span>
                  <input
                    className="hidden"
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                  />
                </label>
              )
            ) : (
              <textarea
                className="w-full h-40 p-4 text-sm text-white transition-colors border rounded-lg outline-none resize-none bg-[var(--input-bg)] border-[#352a31] placeholder-zinc-500 focus:border-[var(--theme-color)]"
                placeholder="Paste resume or type experience..."
                value={form.resumeText}
                onChange={(e) => updateForm("resumeText", e.target.value)}
              />
            )}

            {status.fileError && <p className="mt-1 text-sm text-red-400">{status.fileError}</p>}
          </div>

          {/* Warnings / Errors */}
          {status.apiWarning && <Alert text={status.apiWarning} type="warning" />}
          {status.error && <Alert text={status.error} type="error" />}

          {/* Buttons */}
          <div className="flex gap-3 mt-2 max-sm:flex-col">
            <button
              type="submit"
              disabled={status.isSubmitting}
              className="w-full py-3 font-semibold text-white transition-all duration-500 rounded-full cursor-pointer btn disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {status.isSubmitting ? "Creating..." : "Start Interview"}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 font-medium text-white transition-all duration-300 border-2 rounded-full cursor-pointer border-[#413239] hover:border-[var(--theme-color)] hover:bg-[#1f1f1f]"
            >
              Cancel
            </button>
          </div>
        </div>
      </form>

      <div className="lg:pt-10">
        <FormFeature />
      </div>
    </section>
  );
};

const Alert = ({ text, type }: { text: string; type: "error" | "warning" }) => (
  <div className={`p-4 border-l-4 rounded-lg ${type === "error" ? "border-red-500 bg-red-900/20" : "border-yellow-500 bg-yellow-900/20"}`}>
    <p className={`text-sm ${type === "error" ? "text-red-200" : "text-yellow-200"}`}>{text}</p>
  </div>
);

export default NewInterviewForm;

"use client";
import { useState } from "react";

export default function TestResumePage() {
  const [pdfResult, setPdfResult] = useState<any>(null);
  const [geminiResult, setGeminiResult] = useState<any>(null);
  const [loading, setLoading] = useState({ pdf: false, gemini: false });

  const testPDF = async (file: File) => {
    setLoading(prev => ({ ...prev, pdf: true }));
    try {
      const formData = new FormData();
      formData.append("pdf", file);
      
      const response = await fetch("/api/test-pdf", {
        method: "POST",
        body: formData
      });
      
      const result = await response.json();
      setPdfResult(result);
    } catch (error) {
      setPdfResult({ success: false, error: error instanceof Error ? error.message : "Unknown error" });
    } finally {
      setLoading(prev => ({ ...prev, pdf: false }));
    }
  };

  const testGemini = async (resumeText: string) => {
    setLoading(prev => ({ ...prev, gemini: true }));
    try {
      const response = await fetch("/api/test-gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText,
          jobRole: "Frontend Developer",
          techStack: ["React", "TypeScript", "Node.js"]
        })
      });
      
      const result = await response.json();
      setGeminiResult(result);
    } catch (error) {
      setGeminiResult({ success: false, error: error instanceof Error ? error.message : "Unknown error" });
    } finally {
      setLoading(prev => ({ ...prev, gemini: false }));
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Resume Parsing & Question Generation Test</h1>
      
      {/* PDF Test Section */}
      <div className="mb-8 p-6 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">1. Test Document Parsing (PDF Only)</h2>
        <input
          type="file"
          accept=".pdf"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) testPDF(file);
          }}
          className="mb-4 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
        
        {loading.pdf && <p className="text-blue-600">Testing PDF extraction...</p>}
        
        {pdfResult && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <h3 className="font-semibold">PDF Test Result:</h3>
            <pre className="text-sm overflow-auto">{JSON.stringify(pdfResult, null, 2)}</pre>
          </div>
        )}
      </div>

      {/* Gemini Test Section */}
      <div className="mb-8 p-6 border rounded-lg">
        <h2 className="text-xl font-semibold mb-4">2. Test Gemini Question Generation</h2>
        <textarea
          placeholder="Paste resume text here or use extracted text from PDF test above..."
          className="w-full h-32 p-3 border rounded mb-4"
          onChange={(e) => {
            if (e.target.value.trim()) {
              testGemini(e.target.value);
            }
          }}
        />
        
        {pdfResult?.success && (
          <button
            onClick={() => testGemini(pdfResult.fullText)}
            className="mb-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Test Gemini with Extracted PDF Text
          </button>
        )}
        
        {loading.gemini && <p className="text-blue-600">Testing question generation...</p>}
        
        {geminiResult && (
          <div className="mt-4 p-4 bg-gray-100 rounded">
            <h3 className="font-semibold">Gemini Test Result:</h3>
            <pre className="text-sm overflow-auto max-h-96">{JSON.stringify(geminiResult, null, 2)}</pre>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="p-6 bg-yellow-50 rounded-lg">
        <h3 className="font-semibold mb-2">How to use this test:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Upload a PDF resume (only .pdf files are supported)</li>
          <li>Check the console logs in your browser and server for detailed debugging info</li>
          <li>If PDF extraction works, click "Test Gemini with Extracted PDF Text" to test question generation</li>
          <li>Compare the generated questions to see if they're personalized to the resume content</li>
          <li>Check server console for detailed logs about the process</li>
        </ol>
      </div>
    </div>
  );
}

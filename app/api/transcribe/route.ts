import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getUserIdFromToken } from "@/lib/auth";

// Transcribes a spoken interview answer with Gemini. The browser's built-in speech recognition is
// used for the live preview only; this gives a far more accurate final text (accents, technical
// terms, words lost when Chrome restarts its recognition session).

export const maxDuration = 60;

// Vercel rejects request bodies over 4.5MB; the client records at a low bitrate so normal answers fit
const MAX_AUDIO_BYTES = 4 * 1024 * 1024;

// Lite first: for transcription it is as accurate as Flash and much faster (~3s vs. 15s+), and the user
// is waiting on it before their answer is saved. Configurable via GEMINI_TRANSCRIBE_MODEL.
const MODELS = Array.from(
  new Set([process.env.GEMINI_TRANSCRIBE_MODEL || "gemini-flash-lite-latest", "gemini-flash-latest"])
);
const REQUEST_TIMEOUT = 20_000; // per model, so a hung model falls through to the next one

const LANGUAGE_NAMES: Record<string, string> = {
  "en-IN": "English (Indian accent)",
  "en-US": "English (American accent)",
  "en-GB": "English (British accent)",
};

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : null;
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    getUserIdFromToken(token);
  } catch {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  let audio: File | null = null;
  let lang = "en-IN";
  try {
    const form = await request.formData();
    const file = form.get("audio");
    audio = file instanceof File ? file : null;
    lang = String(form.get("lang") || lang);
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }
  if (!audio || audio.size === 0) {
    return NextResponse.json({ error: "No audio provided" }, { status: 400 });
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json({ error: "Audio too large" }, { status: 413 });
  }

  const data = Buffer.from(await audio.arrayBuffer()).toString("base64");
  // Strip codec parameters ("audio/webm;codecs=opus"): Gemini only accepts the base type
  const mimeType = (audio.type || "audio/webm").split(";")[0];

  // The question itself is deliberately NOT given to the model: with silent audio it would answer the
  // question instead, and that "answer" ended up in the candidate's answer box.
  const prompt =
    `You are a speech-to-text engine. Transcribe the speech in this audio recording. ` +
    `The speaker is a job candidate speaking ${LANGUAGE_NAMES[lang] || "English"} about software and technology.\n` +
    `Rules:\n` +
    `- Write only words that are actually spoken in the audio, in English, with correct punctuation and capitalization.\n` +
    `- Spell technical terms, frameworks and programming languages correctly (e.g. React, Node.js, SQL, Kubernetes).\n` +
    `- Leave out filler sounds such as "um" and "uh", but never add, rephrase, summarize, complete or invent anything.\n` +
    `- If the audio is silent, contains only noise, or has no intelligible speech, set hasSpeech to false and transcript to "".\n` +
    `Respond with JSON: {"hasSpeech": boolean, "transcript": string}`;

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  let lastError: unknown;
  for (const modelName of MODELS) {
    try {
      const model = genAI.getGenerativeModel(
        {
          model: modelName,
          generationConfig: { temperature: 0, maxOutputTokens: 8192, responseMimeType: "application/json" },
        },
        { timeout: REQUEST_TIMEOUT }
      );
      const result = await model.generateContent([{ inlineData: { data, mimeType } }, { text: prompt }]);
      const parsed = JSON.parse(result.response.text());
      const text = parsed?.hasSpeech === false ? "" : String(parsed?.transcript ?? "").trim();
      return NextResponse.json({ text });
    } catch (err) {
      lastError = err;
      console.warn(`Transcription with ${modelName} failed:`, err);
    }
  }

  console.error("Transcription failed:", lastError);
  return NextResponse.json({ error: "Transcription failed" }, { status: 502 });
}

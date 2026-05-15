import { NextResponse } from "next/server";
import { chatCompletion } from "@/lib/ai";
import { parseJsonSafe } from "@/lib/json";
import { buildBilingualSystemPrompt } from "@/lib/bilingual";
import type { LanguagePref } from "@/lib/datastore";

export const runtime = "nodejs";

type IncorrectQuestion = {
  question: string;
  correctAnswer: string;
  userAnswer: string;
  topicSlug: string;
};

type ErrorAnalysis = {
  primaryCategory: "concept gap" | "calculation error" | "reading error" | "time pressure" | "careless mistake";
  explanation: string;
  remediationActions: string[];
};

export async function POST(req: Request) {
  let raw: unknown;
  try { raw = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const o = raw as Record<string, unknown>;
  const incorrectQuestions = Array.isArray(o.incorrectQuestions)
    ? (o.incorrectQuestions as IncorrectQuestion[])
    : [];
  const lang: LanguagePref = o.lang === "telugu-english" ? "telugu-english" : "english";

  if (incorrectQuestions.length < 3) {
    return NextResponse.json({ error: "Need at least 3 incorrect answers for analysis" }, { status: 400 });
  }

  const questionsText = incorrectQuestions
    .map((q, i) => `Q${i + 1} [${q.topicSlug}]: ${q.question}\nCorrect: ${q.correctAnswer}\nStudent chose: ${q.userAnswer}`)
    .join("\n\n");

  const baseSystem = `You are an SSC CGL exam coach analyzing a student's mock test mistakes.
Analyze the pattern of errors and return ONLY valid JSON:
{
  "primaryCategory": "concept gap" | "calculation error" | "reading error" | "time pressure" | "careless mistake",
  "explanation": string (1 paragraph explaining the error pattern),
  "remediationActions": string[] (exactly 3 specific actions the student should take)
}
Categories:
- concept gap: student doesn't understand the underlying concept
- calculation error: student understands but makes arithmetic mistakes
- reading error: student misreads the question or options
- time pressure: student rushes and makes avoidable mistakes
- careless mistake: student knows the concept but makes silly errors`;

  const system = buildBilingualSystemPrompt(baseSystem, lang);
  const user = `Analyze these ${incorrectQuestions.length} incorrect answers:\n\n${questionsText}`;

  async function attempt(): Promise<ErrorAnalysis | null> {
    try {
      const { text } = await chatCompletion(
        [{ role: "system", content: system }, { role: "user", content: user }],
        { temperature: 0.3, json: true },
      );
      const parsed = parseJsonSafe<ErrorAnalysis>(text);
      if (!parsed.primaryCategory || !parsed.explanation || !Array.isArray(parsed.remediationActions)) return null;
      return parsed;
    } catch { return null; }
  }

  let result = await attempt();
  if (!result) result = await attempt(); // retry once

  if (!result) {
    return NextResponse.json({ error: "Analysis failed after retry" }, { status: 503 });
  }

  return NextResponse.json({
    ...result,
    analyzedAt: new Date().toISOString(),
  });
}

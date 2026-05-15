import { NextResponse } from "next/server";
import { chatCompletion } from "@/lib/ai";
import { parseJsonSafe } from "@/lib/json";

export const runtime = "nodejs";

type AnalysisResult = {
  title: string;
  keyPoints: string[];
  formulas: string[];
  sscRelevance: string;
  shortcuts: string[];
  potentialQuestions: string[];
};

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const o = raw as Record<string, unknown>;
  const sourceText = typeof o.sourceText === "string" ? o.sourceText.trim() : "";
  const topicHint = typeof o.topicHint === "string" ? o.topicHint.trim() : "";

  if (!sourceText || sourceText.length < 30) {
    return NextResponse.json(
      { error: "sourceText required (min 30 chars)" },
      { status: 400 },
    );
  }

  if (sourceText.length > 15000) {
    return NextResponse.json(
      { error: "Source text too long (max ~15,000 chars / ~2,500 words)" },
      { status: 400 },
    );
  }

  const system = `You are an expert SSC CGL exam coach analysing study material for Indian students.
Given a passage of text (book excerpt, article, notes, PYQ solution, etc.), extract what matters for SSC CGL Tier-I.
Return ONLY valid JSON:
{
  "title": string (infer a short title for this content, max 8 words),
  "keyPoints": string[] (8-15 most important facts/concepts from the text, each one sentence),
  "formulas": string[] (any formulas, equations, or numerical rules found; empty array if none),
  "sscRelevance": string (2-3 sentences: how this topic/content appears in SSC CGL PYQs),
  "shortcuts": string[] (3-8 tricks or memory aids derivable from this content; empty if none),
  "potentialQuestions": string[] (4-6 SSC-style MCQ stems that could be asked from this content)
}
Rules:
- Focus only on what is examinable in SSC CGL Tier-I.
- Be concise — each key point max 20 words.
- If the text is not SSC-relevant, still extract what could be useful.
${topicHint ? `- Topic context hint: "${topicHint}"` : ""}`;

  const user = `Analyse this source material:\n\n${sourceText.slice(0, 12000)}`;

  try {
    let text: string;
    try {
      text = (
        await chatCompletion(
          [{ role: "system", content: system }, { role: "user", content: user }],
          { temperature: 0.2, json: true },
        )
      ).text;
    } catch {
      text = (
        await chatCompletion(
          [{ role: "system", content: system }, { role: "user", content: user }],
          { temperature: 0.2 },
        )
      ).text;
    }

    const parsed = parseJsonSafe<AnalysisResult>(text);
    if (!parsed.keyPoints?.length) {
      throw new Error("Could not extract key points from source");
    }

    return NextResponse.json({
      title: parsed.title || "Source analysis",
      keyPoints: parsed.keyPoints ?? [],
      formulas: parsed.formulas ?? [],
      sscRelevance: parsed.sscRelevance ?? "",
      shortcuts: parsed.shortcuts ?? [],
      potentialQuestions: parsed.potentialQuestions ?? [],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Analysis failed";
    return NextResponse.json(
      { error: msg, hint: "Add GEMINI_API_KEY, GROQ_API_KEY, or OPENAI_API_KEY in .env.local" },
      { status: 502 },
    );
  }
}

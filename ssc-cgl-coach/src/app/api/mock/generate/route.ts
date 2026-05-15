import { NextResponse } from "next/server";
import { chatCompletion } from "@/lib/ai";
import { parseJsonSafe } from "@/lib/json";
import { buildBilingualSystemPrompt } from "@/lib/bilingual";
import type { LanguagePref } from "@/lib/datastore";

export const runtime = "nodejs";

type Mcq = {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
};

export async function POST(req: Request) {
  let raw: unknown;
  try { raw = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const o = raw as Record<string, unknown>;
  const topicSlug = typeof o.topicSlug === "string" ? o.topicSlug.trim() : "";
  const topicNameRaw = typeof o.topicName === "string" ? o.topicName.trim() : "";
  const count = typeof o.count === "number" ? Math.min(50, Math.max(3, o.count)) : 10;
  const weakTopics = Array.isArray(o.weakTopics) ? (o.weakTopics as string[]).slice(0, 3) : [];
  const lang: LanguagePref = o.lang === "telugu-english" ? "telugu-english" : "english";
  const difficulty = o.difficulty && typeof o.difficulty === "object"
    ? (o.difficulty as { easy?: number; medium?: number; hard?: number })
    : { easy: 40, medium: 40, hard: 20 };

  const topicName = topicNameRaw || topicSlug.replace(/-/g, " ");
  if (!topicName) {
    return NextResponse.json({ error: "Provide topicName and/or topicSlug" }, { status: 400 });
  }

  const weakTopicHint = weakTopics.length > 0
    ? `\nFocus especially on these weak areas: ${weakTopics.join(", ")}.`
    : "";

  const difficultyHint = `\nDifficulty distribution: ${difficulty.easy ?? 40}% easy, ${difficulty.medium ?? 40}% medium, ${difficulty.hard ?? 20}% hard.`;

  const baseSystem = `You generate SSC CGL Tier-I style multiple choice questions.
Return ONLY valid JSON:
{"questions":[{"question":string,"options":[string,string,string,string],"answerIndex":0-3,"explanation":string,"difficulty":"easy"|"medium"|"hard"}]}
Topic: ${topicName}. Mix shortcut-friendly traps typical of SSC. Exactly ${count} questions.${weakTopicHint}${difficultyHint}`;

  const system = buildBilingualSystemPrompt(baseSystem, lang);

  async function attempt(): Promise<{ questions: Mcq[] } | null> {
    try {
      let text: string;
      try {
        text = (await chatCompletion([{ role: "system", content: system }, { role: "user", content: "Generate now." }], { temperature: 0.45, json: true })).text;
      } catch {
        text = (await chatCompletion([{ role: "system", content: system }, { role: "user", content: "Generate now." }], { temperature: 0.45 })).text;
      }
      const parsed = parseJsonSafe<{ questions: Mcq[] }>(text);
      if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) return null;
      return parsed;
    } catch { return null; }
  }

  let result = await attempt();
  if (!result) result = await attempt(); // retry once

  if (!result) {
    return NextResponse.json({ error: "Generation failed after retry" }, { status: 502 });
  }

  return NextResponse.json({ questions: result.questions ?? [] });
}

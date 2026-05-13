import { NextResponse } from "next/server";
import { chatCompletion } from "@/lib/ai";
import { parseJsonSafe } from "@/lib/json";

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
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const o = raw as Record<string, unknown>;
  const topicSlug = typeof o.topicSlug === "string" ? o.topicSlug.trim() : "";
  const topicNameRaw = typeof o.topicName === "string" ? o.topicName.trim() : "";
  const count = typeof o.count === "number" ? Math.min(20, Math.max(3, o.count)) : 10;

  const topicName = topicNameRaw || topicSlug.replace(/-/g, " ");
  if (!topicName) {
    return NextResponse.json(
      { error: "Provide topicName and/or topicSlug" },
      { status: 400 },
    );
  }

  const system = `You generate SSC CGL Tier-I style multiple choice questions.
Return ONLY valid JSON:
{"questions":[{"question":string,"options":[string,string,string,string],"answerIndex":0-3,"explanation":string,"difficulty":"easy"|"medium"|"hard"}]}
Topic: ${topicName}. Mix shortcut-friendly traps typical of SSC. Exactly ${count} questions.`;

  try {
    let text: string;
    try {
      text = (
        await chatCompletion(
          [{ role: "system", content: system }, { role: "user", content: "Generate now." }],
          { temperature: 0.45, json: true },
        )
      ).text;
    } catch {
      text = (
        await chatCompletion(
          [{ role: "system", content: system }, { role: "user", content: "Generate now." }],
          { temperature: 0.45 },
        )
      ).text;
    }

    const parsed = parseJsonSafe<{ questions: Mcq[] }>(text);
    return NextResponse.json({ questions: parsed.questions ?? [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Generation failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

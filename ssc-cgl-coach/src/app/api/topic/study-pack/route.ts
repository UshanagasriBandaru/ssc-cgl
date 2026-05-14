import { NextResponse } from "next/server";
import { chatCompletion } from "@/lib/ai";
import { parseJsonSafe } from "@/lib/json";

export const runtime = "nodejs";

type StudyPackPayload = {
  topicName?: string;
  importantNotes: string;
  formulas: string;
  shortcuts?: string[];
};

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const o = raw as Record<string, unknown>;
  const topicName =
    typeof o.topicName === "string" ? o.topicName.trim() : "";
  const exam =
    typeof o.exam === "string" ? o.exam.trim() : "SSC CGL Tier-I";

  if (!topicName || topicName.length > 200) {
    return NextResponse.json(
      { error: "topicName required (max 200 chars)" },
      { status: 400 },
    );
  }

  const system = `You are an expert SSC exam mentor (${exam}).
Given ONLY a topic name, produce dense revision material for Indian students.
Return ONLY valid JSON:
{
  "topicName": string (echo normalized title),
  "importantNotes": string (Markdown: use ## for sections, bullets for points; 400-900 words total),
  "formulas": string (Markdown: numbered list of formulas with symbols; SSC-relevant only),
  "shortcuts": string[] (5-12 short one-line tricks or PYQ patterns)
}
Rules:
- If topic is vague, assume SSC Quant / Reasoning / English / GK context as fits best.
- Prioritize what appears repeatedly in PYQs.
- No hallucinated exact PYQ text — patterns only.
- Formulas must be accurate; if unsure, omit rather than guess.`;

  const user = `Topic: "${topicName}"`;

  try {
    let text: string;
    try {
      text = (
        await chatCompletion(
          [{ role: "system", content: system }, { role: "user", content: user }],
          { temperature: 0.25, json: true },
        )
      ).text;
    } catch {
      text = (
        await chatCompletion(
          [{ role: "system", content: system }, { role: "user", content: user }],
          { temperature: 0.25 },
        )
      ).text;
    }

    const parsed = parseJsonSafe<StudyPackPayload>(text);
    if (!parsed.importantNotes?.trim() || !parsed.formulas?.trim()) {
      throw new Error("Incomplete study pack from model");
    }

    return NextResponse.json({
      topicName: parsed.topicName || topicName,
      importantNotes: parsed.importantNotes,
      formulas: parsed.formulas,
      shortcuts: parsed.shortcuts ?? [],
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Generation failed";
    return NextResponse.json(
      {
        error: msg,
        hint: "Add GEMINI_API_KEY (recommended), or GROQ_API_KEY / OPENAI_API_KEY in .env.local",
      },
      { status: 502 },
    );
  }
}

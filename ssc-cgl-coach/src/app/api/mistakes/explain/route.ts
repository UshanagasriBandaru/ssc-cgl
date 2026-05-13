import { NextResponse } from "next/server";
import { chatCompletion } from "@/lib/ai";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const o = raw as Record<string, unknown>;
  const topic_slug = typeof o.topic_slug === "string" ? o.topic_slug : "";
  const question = typeof o.question === "string" ? o.question : "";
  const correct_answer = typeof o.correct_answer === "string" ? o.correct_answer : "";
  const user_answer = typeof o.user_answer === "string" ? o.user_answer : "";

  if (!question.trim()) {
    return NextResponse.json({ error: "question required" }, { status: 400 });
  }

  const system =
    "You coach SSC CGL aspirants. Explain clearly in Indian English with a shortcut if possible.";
  const userMsg = `Topic tag: ${topic_slug}\nQuestion: ${question}\nCorrect: ${correct_answer}\nStudent picked: ${user_answer}\nGive: (1) concept recap (2) trap spotted (3) similar PYQ-style drill suggestion.`;

  try {
    const { text, provider } = await chatCompletion(
      [
        { role: "system", content: system },
        { role: "user", content: userMsg },
      ],
      { temperature: 0.35 },
    );
    return NextResponse.json({ explanation: text, provider });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

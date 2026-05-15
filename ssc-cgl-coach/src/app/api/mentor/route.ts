import { NextResponse } from "next/server";
import { chatCompletion, type ChatMessage } from "@/lib/ai";
import { buildMentorSystemPrompt, injectTopicLinks } from "@/lib/bilingual";
import { SSC_CGL_TOPICS } from "@/lib/ssc-topics";
import type { LanguagePref } from "@/lib/datastore";
import type { TopicPerformance } from "@/lib/performance";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let raw: unknown;
  try { raw = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const o = raw as Record<string, unknown>;
  const message = typeof o.message === "string" ? o.message.trim() : "";
  const history = Array.isArray(o.history) ? (o.history as ChatMessage[]) : [];
  const lang: LanguagePref = o.lang === "telugu-english" ? "telugu-english" : "english";
  const performances = Array.isArray(o.performances) ? (o.performances as TopicPerformance[]) : [];
  const streak = typeof o.streak === "number" ? o.streak : 0;
  const examDate = typeof o.examDate === "string" ? o.examDate : null;
  const recentScores = Array.isArray(o.recentScores) ? (o.recentScores as number[]) : [];

  if (!message) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }

  const systemPrompt = buildMentorSystemPrompt(performances, streak, examDate, recentScores, lang);

  // Keep last 10 exchange pairs (20 messages)
  const trimmedHistory = history.slice(-20);

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...trimmedHistory,
    { role: "user", content: message },
  ];

  try {
    const { text, provider } = await chatCompletion(messages, { temperature: 0.5 });
    const withLinks = injectTopicLinks(text, SSC_CGL_TOPICS);
    return NextResponse.json({ reply: withLinks, provider });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Mentor unavailable";
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}

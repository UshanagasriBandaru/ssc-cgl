import { NextResponse } from "next/server";
import { chatCompletion } from "@/lib/ai";
import { keywordOverlapScore } from "@/lib/text-chunk";
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
  const topicSlug = typeof o.topicSlug === "string" ? o.topicSlug.trim() : "";
  const question = typeof o.question === "string" ? o.question.trim() : "";

  if (!topicSlug || !question) {
    return NextResponse.json(
      { error: "topicSlug and question required" },
      { status: 400 },
    );
  }

  const { data: docs, error: dErr } = await supabase
    .from("documents")
    .select("id")
    .eq("user_id", user.id)
    .eq("topic_slug", topicSlug);

  if (dErr) {
    return NextResponse.json({ error: dErr.message }, { status: 500 });
  }

  const docIds = (docs ?? []).map((d) => d.id);
  if (!docIds.length) {
    return NextResponse.json(
      {
        answer:
          "No uploaded sources for this topic yet. Paste notes or upload a PDF from the topic hub.",
        citations: [],
      },
      { status: 200 },
    );
  }

  const { data: chunks, error: cErr } = await supabase
    .from("document_chunks")
    .select("id, content, document_id")
    .in("document_id", docIds)
    .limit(400);

  if (cErr || !chunks?.length) {
    return NextResponse.json(
      {
        answer: "Sources exist but no readable chunks were found.",
        citations: [],
      },
      { status: 200 },
    );
  }

  const ranked = [...chunks]
    .map((c) => ({
      ...c,
      score: keywordOverlapScore(c.content, question),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 14);

  const context = ranked.map((c, i) => `[#${i + 1}] ${c.content}`).join("\n\n---\n\n");

  const system = `You are an SSC CGL tutor. Answer ONLY using the provided CONTEXT excerpts.
If the answer is not contained in CONTEXT, say you cannot find it in the user's uploaded materials and suggest what to upload or study.
Cite snippet numbers like [#2] when useful.`;
  const userMsg = `CONTEXT:\n${context}\n\nQUESTION:\n${question}`;

  try {
    const { text, provider } = await chatCompletion(
      [
        { role: "system", content: system },
        { role: "user", content: userMsg },
      ],
      { temperature: 0.2 },
    );
    return NextResponse.json({
      answer: text,
      provider,
      citations: ranked.slice(0, 5).map((c) => ({
        chunkId: c.id,
        preview: c.content.slice(0, 220) + (c.content.length > 220 ? "…" : ""),
      })),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}

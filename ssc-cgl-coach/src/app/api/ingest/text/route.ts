import { NextResponse } from "next/server";
import { chunkText } from "@/lib/text-chunk";
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
  const title = typeof o.title === "string" ? o.title.trim() : "Pasted text";
  const text = typeof o.text === "string" ? o.text : "";

  if (!topicSlug || !text.trim()) {
    return NextResponse.json(
      { error: "topicSlug and text required" },
      { status: 400 },
    );
  }

  const chunks = chunkText(text);
  if (!chunks.length) {
    return NextResponse.json({ error: "Empty content" }, { status: 422 });
  }

  const { data: doc, error: docErr } = await supabase
    .from("documents")
    .insert({
      user_id: user.id,
      topic_slug: topicSlug,
      filename: title.slice(0, 200),
      raw_text: text.slice(0, 50000),
    })
    .select("id")
    .single();

  if (docErr || !doc?.id) {
    return NextResponse.json({ error: docErr?.message ?? "Insert failed" }, { status: 500 });
  }

  const rows = chunks.map((content, chunk_index) => ({
    document_id: doc.id,
    chunk_index,
    content,
  }));

  const { error: chErr } = await supabase.from("document_chunks").insert(rows);
  if (chErr) {
    return NextResponse.json({ error: chErr.message }, { status: 500 });
  }

  return NextResponse.json({ documentId: doc.id, chunks: chunks.length });
}

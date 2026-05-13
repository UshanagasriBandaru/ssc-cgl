import { NextResponse } from "next/server";
import pdfParse from "pdf-parse";
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

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form" }, { status: 400 });
  }

  const file = form.get("file");
  const topicSlug = String(form.get("topicSlug") ?? "").trim();
  const filename = String(form.get("filename") ?? "upload.pdf");

  if (!topicSlug) {
    return NextResponse.json({ error: "topicSlug required" }, { status: 400 });
  }

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "file required" }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  let rawText: string;
  try {
    const parsed = await pdfParse(buf);
    rawText = typeof parsed.text === "string" ? parsed.text : "";
  } catch {
    return NextResponse.json({ error: "PDF parse failed" }, { status: 422 });
  }

  if (!rawText.trim()) {
    return NextResponse.json({ error: "No extractable text in PDF" }, { status: 422 });
  }

  const chunks = chunkText(rawText);
  if (!chunks.length) {
    return NextResponse.json({ error: "Empty content after chunking" }, { status: 422 });
  }

  const { data: doc, error: docErr } = await supabase
    .from("documents")
    .insert({
      user_id: user.id,
      topic_slug: topicSlug,
      filename,
      raw_text: rawText.slice(0, 50000),
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

  return NextResponse.json({
    documentId: doc.id,
    chunks: chunks.length,
    ragMode: "keyword-overlap (add embeddings later via Supabase SQL + OpenAI)",
  });
}

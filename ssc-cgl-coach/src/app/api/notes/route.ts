import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  const url = new URL(req.url);
  const topicSlug = url.searchParams.get("topic_slug");

  let q = supabase
    .from("topic_notes")
    .select("id,topic_slug,title,body,source_url,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (topicSlug) q = q.eq("topic_slug", topicSlug);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notes: data ?? [] });
}

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
  const body = typeof o.body === "string" ? o.body : "";
  const title = typeof o.title === "string" ? o.title.trim() : null;
  const source_url = typeof o.source_url === "string" ? o.source_url : null;

  if (!topicSlug || !body.trim()) {
    return NextResponse.json(
      { error: "topicSlug and body required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("topic_notes")
    .insert({
      user_id: user.id,
      topic_slug: topicSlug,
      title,
      body,
      source_url,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data?.id });
}

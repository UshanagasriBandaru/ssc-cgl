import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x.toISOString().slice(0, 10);
}

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
    .from("mistakes")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (topicSlug) q = q.eq("topic_slug", topicSlug);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ mistakes: data ?? [] });
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
  const topic_slug = typeof o.topic_slug === "string" ? o.topic_slug.trim() : "";
  const question = typeof o.question === "string" ? o.question.trim() : "";

  if (!topic_slug || !question) {
    return NextResponse.json(
      { error: "topic_slug and question required" },
      { status: 400 },
    );
  }

  const next_review_at =
    typeof o.next_review_at === "string"
      ? o.next_review_at
      : addDays(new Date(), 1);

  const { data, error } = await supabase
    .from("mistakes")
    .insert({
      user_id: user.id,
      topic_slug,
      question,
      correct_answer:
        typeof o.correct_answer === "string" ? o.correct_answer : null,
      user_answer: typeof o.user_answer === "string" ? o.user_answer : null,
      explanation: typeof o.explanation === "string" ? o.explanation : null,
      next_review_at,
    })
    .select("id")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data?.id });
}

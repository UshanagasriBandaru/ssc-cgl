import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();

  const { data: top50, error } = await supabase
    .from("leaderboard")
    .select("user_id, display_name, correct_answers_30d")
    .eq("opted_in", true)
    .order("correct_answers_30d", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const entries = (top50 ?? []).map((row, i) => ({
    rank: i + 1,
    displayName: row.display_name,
    correctAnswers30d: row.correct_answers_30d,
    isMe: row.user_id === user?.id,
  }));

  let myRank: number | null = null;
  if (user) {
    const myEntry = entries.find((e) => e.isMe);
    if (myEntry) {
      myRank = myEntry.rank;
    } else {
      // Get rank outside top 50
      const { count } = await supabase
        .from("leaderboard")
        .select("*", { count: "exact", head: true })
        .eq("opted_in", true)
        .gt("correct_answers_30d", 0);
      myRank = (count ?? 0) + 1;
    }
  }

  return NextResponse.json({ entries, myRank });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });

  let raw: unknown;
  try { raw = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const o = raw as Record<string, unknown>;
  const optIn = typeof o.optIn === "boolean" ? o.optIn : true;
  const displayName = typeof o.displayName === "string" ? o.displayName.trim().slice(0, 30) : "Anonymous";
  const increment = typeof o.increment === "number" ? o.increment : 0;

  if (!optIn) {
    await supabase.from("leaderboard").delete().eq("user_id", user.id);
    return NextResponse.json({ success: true });
  }

  const { data: existing } = await supabase
    .from("leaderboard")
    .select("correct_answers_30d")
    .eq("user_id", user.id)
    .single();

  const newScore = (existing?.correct_answers_30d ?? 0) + increment;

  const { error } = await supabase.from("leaderboard").upsert({
    user_id: user.id,
    display_name: displayName,
    correct_answers_30d: newScore,
    opted_in: true,
    updated_at: new Date().toISOString(),
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, score: newScore });
}

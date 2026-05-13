import { NextResponse } from "next/server";
import { fetchTranscript } from "youtube-transcript";
import { chatCompletion } from "@/lib/ai";
import { extractYoutubeId } from "@/lib/youtube";
import { createClient } from "@/lib/supabase/server";
import { parseJsonSafe } from "@/lib/json";

export const runtime = "nodejs";

type ArtifactResponse = {
  shortNotes: string;
  importantPoints: string[];
  formulaSheet: string;
  flashcards: { front: string; back: string }[];
  quiz: {
    question: string;
    options: string[];
    answerIndex: number;
    explanation: string;
  }[];
};

async function generateArtifacts(
  topicLabel: string,
  transcript: string,
): Promise<ArtifactResponse> {
  const system = `You are an SSC CGL exam coach. Given a YouTube transcript, produce concise revision material.
Respond with ONLY valid JSON (no markdown fences) matching this shape:
{
  "shortNotes": string,
  "importantPoints": string[],
  "formulaSheet": string,
  "flashcards": {"front": string, "back": string}[],
  "quiz": {"question": string, "options": string[4], "answerIndex": number, "explanation": string}[]
}
Rules:
- 5–8 importantPoints
- 6–10 flashcards
- 5 quiz MCQs, exactly 4 options each, answerIndex 0-3
- Use Indian English; SSC CGL Tier-I style
Topic context name: ${topicLabel}`;

  const user = `Transcript (may be noisy):\n"""${transcript.slice(0, 28000)}"""`;

  try {
    const { text } = await chatCompletion(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { temperature: 0.35, json: true },
    );
    return parseJsonSafe<ArtifactResponse>(text);
  } catch {
    const { text } = await chatCompletion(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { temperature: 0.35 },
    );
    return parseJsonSafe<ArtifactResponse>(text);
  }
}

export async function POST(req: Request) {
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 503 },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const o = raw as Record<string, unknown>;
  const url = typeof o.url === "string" ? o.url : "";
  const topicSlug = typeof o.topicSlug === "string" ? o.topicSlug : "";
  const topicName = typeof o.topicName === "string" ? o.topicName : topicSlug;

  const videoId = extractYoutubeId(url);
  if (!videoId) {
    return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
  }

  let lines;
  try {
    lines = await fetchTranscript(videoId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Transcript unavailable";
    return NextResponse.json(
      {
        error:
          msg +
          " — video may have captions disabled or rate limits hit. Try another video.",
      },
      { status: 422 },
    );
  }

  const transcriptText = lines.map((l) => l.text).join(" ");
  if (!transcriptText.trim()) {
    return NextResponse.json({ error: "Empty transcript" }, { status: 422 });
  }

  let artifacts: ArtifactResponse;
  try {
    artifacts = await generateArtifacts(topicName || "SSC topic", transcriptText);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  const saveNote = o.saveNote === true;
  if (saveNote && topicSlug) {
    const body =
      `## Short notes\n${artifacts.shortNotes}\n\n## Important points\n` +
      artifacts.importantPoints.map((p) => `- ${p}`).join("\n") +
      `\n\n## Formula sheet\n${artifacts.formulaSheet}`;

    await supabase.from("topic_notes").insert({
      user_id: user.id,
      topic_slug: topicSlug,
      title: `YouTube ${videoId}`,
      body,
      source_url: url,
    });
  }

  return NextResponse.json({
    videoId,
    transcriptPreview: transcriptText.slice(0, 1200),
    artifacts,
  });
}

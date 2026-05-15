/**
 * Bilingual prompt builder — Telugu + English AI explanations.
 * Injects bilingual instructions into any AI system prompt.
 */

import type { ChatMessage } from "@/lib/ai";
import type { LanguagePref } from "@/lib/datastore";
import type { TopicPerformance } from "@/lib/performance";

const BILINGUAL_INSTRUCTION = `
LANGUAGE INSTRUCTION: Respond in a natural mix of Telugu and English, exactly like how a Telugu-speaking tutor talks to a student in real life. 
- Use Telugu script for explanations, reasoning steps, and encouragement.
- Use English for formulas, technical terms, numbers, and the final answer.
- Do NOT translate everything — mix naturally, like: "ఈ formula చాలా important: Profit% = (Profit/CP) × 100"
- Keep it conversational and warm, not formal.
`.trim();

const ENGLISH_INSTRUCTION = `Respond in clear, simple English suitable for SSC CGL aspirants.`;

/** Inject bilingual or English instruction into any system prompt */
export function buildBilingualSystemPrompt(basePrompt: string, lang: LanguagePref): string {
  const instruction = lang === "telugu-english" ? BILINGUAL_INSTRUCTION : ENGLISH_INSTRUCTION;
  return `${basePrompt}\n\n${instruction}`;
}

/** Build messages for a doubt-solving request */
export function buildDoubtSolvingPrompt(
  question: string,
  lang: LanguagePref,
  conversationHistory: ChatMessage[] = [],
): ChatMessage[] {
  const systemContent = buildBilingualSystemPrompt(
    `You are an expert SSC CGL tutor. When a student asks a doubt:
1. Break the solution into numbered steps.
2. Show intermediate calculations at each step.
3. Explain WHY each step is done, not just what.
4. If the question is outside SSC CGL scope, politely redirect to the closest relevant SSC topic.
5. If a topic name matches SSC CGL syllabus, mention it so the student can study it further.`,
    lang,
  );

  const messages: ChatMessage[] = [
    { role: "system", content: systemContent },
    ...conversationHistory.slice(-18), // keep last 9 exchanges (18 messages)
    { role: "user", content: question },
  ];

  return messages;
}

/** Build the AI Mentor system prompt with full performance context */
export function buildMentorSystemPrompt(
  performances: TopicPerformance[],
  streak: number,
  examDate: string | null,
  recentScores: number[],
  lang: LanguagePref,
): string {
  const weakTopics = performances
    .filter((p) => p.recentAccuracy < 0.6)
    .sort((a, b) => a.recentAccuracy - b.recentAccuracy)
    .slice(0, 5)
    .map((p) => `${p.topicSlug} (accuracy: ${Math.round(p.recentAccuracy * 100)}%)`)
    .join(", ");

  const strongTopics = performances
    .filter((p) => p.recentAccuracy >= 0.8)
    .slice(0, 3)
    .map((p) => p.topicSlug)
    .join(", ");

  const avgScore =
    recentScores.length > 0
      ? Math.round(recentScores.reduce((a, b) => a + b, 0) / recentScores.length)
      : null;

  const base = `You are an AI mentor for SSC CGL preparation. You know the student's performance data:

Student profile:
- Current streak: ${streak} day${streak !== 1 ? "s" : ""}
- Exam date: ${examDate ?? "not set"}
- Weak topics (accuracy < 60%): ${weakTopics || "none yet — take more mocks"}
- Strong topics: ${strongTopics || "none yet"}
- Recent mock average: ${avgScore !== null ? `${avgScore}/10` : "no mocks taken yet"}
- Total topics tracked: ${performances.length}

Your role:
- Give specific, actionable advice based on this data.
- When asked "What should I study today?", recommend specific topics from the weak list.
- When asked to predict score, use the SSC marking scheme: +2 correct, -0.5 wrong, max 200.
- When asked "Can I complete in N days?", be realistic based on weak topics and daily capacity.
- When asked to generate a study session, create a structured time-blocked plan.
- Always mention topic names exactly as they appear in the SSC CGL syllabus.
- Keep responses concise and actionable — no fluff.`;

  return buildBilingualSystemPrompt(base, lang);
}

/** Render topic names in AI responses as clickable link markers */
export function injectTopicLinks(
  text: string,
  topics: Array<{ name: string; slug: string }>,
): string {
  let result = text;
  for (const topic of topics) {
    // Replace exact topic name with a marker that the UI can convert to a link
    const escaped = topic.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "g");
    result = result.replace(regex, `[[TOPIC:${topic.slug}:${topic.name}]]`);
  }
  return result;
}

/** Parse topic link markers from AI response text */
export function parseTopicLinks(
  text: string,
): Array<{ type: "text" | "link"; content: string; slug?: string }> {
  const parts: Array<{ type: "text" | "link"; content: string; slug?: string }> = [];
  const regex = /\[\[TOPIC:([^:]+):([^\]]+)\]\]/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: "text", content: text.slice(lastIndex, match.index) });
    }
    parts.push({ type: "link", content: match[2], slug: match[1] });
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push({ type: "text", content: text.slice(lastIndex) });
  }

  return parts;
}

import {
  SSC_CGL_TOPICS,
  type SubjectId,
  type TopicWeightage,
} from "@/lib/ssc-topics";

export type PrepHorizon = "15d" | "30d" | "90d" | "180d";

export type Level = "weak" | "medium" | "strong";

export type PlanRequestBody = {
  horizon: PrepHorizon;
  examDate?: string;
  weekdayHours: number;
  weekendHours: number;
  targetScore?: number;
  levels: Record<SubjectId, Level>;
  survivalMode?: boolean;
  weakTopics?: string[];       // top weak topic names from performance data
  burnoutWarning?: boolean;    // true if > 6h studied yesterday
};

const WEIGHT_ORDER: TopicWeightage[] = [
  "highest",
  "high",
  "medium",
  "low",
];

function survivalCutoff(horizon: PrepHorizon): boolean {
  return horizon === "15d";
}

/** Topics prioritized by PYQ-style weightage; favors weak subjects when deciding tie-breaks. */
export function prioritizedTopics(body: PlanRequestBody): typeof SSC_CGL_TOPICS {
  const weakBoost = (subject: SubjectId) =>
    body.levels[subject] === "weak" ? 2 : body.levels[subject] === "medium" ? 1 : 0;

  const survival = body.survivalMode ?? survivalCutoff(body.horizon);

  const filtered = survival
    ? SSC_CGL_TOPICS.filter((t) => t.weightage === "highest" || t.weightage === "high")
    : [...SSC_CGL_TOPICS];

  return filtered.sort((a, b) => {
    const wa = WEIGHT_ORDER.indexOf(a.weightage);
    const wb = WEIGHT_ORDER.indexOf(b.weightage);
    if (wa !== wb) return wa - wb;
    return weakBoost(b.subject) - weakBoost(a.subject);
  });
}

/** Check if exam date is within 15 days from today */
export function isExamSoon(examDate?: string): boolean {
  if (!examDate) return false;
  const today = new Date();
  const exam = new Date(examDate);
  const diffDays = Math.ceil((exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays < 15;
}

export function buildPlannerSystemPrompt(body: PlanRequestBody): string {
  const autoSurvival = isExamSoon(body.examDate);
  const survival = body.survivalMode ?? survivalCutoff(body.horizon) ?? autoSurvival;
  const ordered = prioritizedTopics(body).slice(0, survival ? 12 : 24);

  const weakTopicHint = body.weakTopics && body.weakTopics.length > 0
    ? `\nPerformance data — student's top weak topics (prioritize these):\n${body.weakTopics.map((t) => `- ${t}`).join("\n")}`
    : "";

  const burnoutHint = body.burnoutWarning
    ? "\n⚠️ BURNOUT WARNING: Student studied > 6 hours yesterday. Include a mandatory rest/light-revision day in the plan."
    : "";

  return [
    "You are an SSC CGL Tier-I preparation coach.",
    "Prioritize high-frequency PYQ topics over rare ones.",
    survival
      ? "SURVIVAL MODE: user has very little time — prioritize only highest-yield topics, mocks, and revision over breadth."
      : "Balance new learning, PYQs, mocks, and revision across the horizon.",
    burnoutHint,
    "",
    "User constraints:",
    `- Horizon: ${body.horizon}`,
    body.examDate ? `- Exam date: ${body.examDate}${autoSurvival ? " (LESS THAN 15 DAYS — survival mode auto-activated)" : ""}` : "",
    `- Weekday hours/day: ${body.weekdayHours}`,
    `- Weekend hours/day: ${body.weekendHours}`,
    body.targetScore != null ? `- Target score (approx): ${body.targetScore}` : "",
    "",
    "Self-reported levels (weak/medium/strong):",
    `- Quant: ${body.levels.quant}`,
    `- Reasoning: ${body.levels.reasoning}`,
    `- English: ${body.levels.english}`,
    `- GK: ${body.levels.gk}`,
    weakTopicHint,
    "",
    "Topic priority hint list (do not ignore weightage):",
    ordered.map((t) => `- ${t.name} (${t.subject}, ${t.weightage})`).join("\n"),
    "",
    "Output format: Markdown with sections:",
    "## Week-by-week roadmap",
    "## Daily template (weekday vs weekend)",
    "## Mock strategy (frequency + analysis checklist)",
    "## Revision / mistake notebook habits",
    "## Resource focus (short bullets: PYQs, formulas, one-shots)",
  ]
    .filter(Boolean)
    .join("\n");
}

export function mockPlanMarkdown(body: PlanRequestBody): string {
  const survival = body.survivalMode ?? survivalCutoff(body.horizon);
  const top = prioritizedTopics(body).slice(0, survival ? 8 : 14);

  const weeks =
    body.horizon === "15d"
      ? 2
      : body.horizon === "30d"
        ? 4
        : body.horizon === "90d"
          ? 12
          : 24;

  return [
    `# SSC CGL plan (${body.horizon}${survival ? ", survival focus" : ""})`,
    "",
    "## Week-by-week roadmap",
    `- Scale this skeleton to **${weeks} weeks** for your horizon.`,
    "- **Early phase:** highest-weight quant reasoning topics + English vocab micro-drills + GK CA backlog cleanup.",
    "- **Middle phase:** mixed timed sets + sectional mocks + error tagging.",
    "- **Late phase:** full mocks, formula-only revision, weak-topic-only sessions.",
    "",
    "## High-yield topic focus (seed order)",
    top.map((t) => `- **${t.name}** (${t.subject}, ${t.weightage})`).join("\n"),
    "",
    "## Daily template",
    `- **Weekdays (${body.weekdayHours}h):** 10–15m revision → ${Math.max(1, Math.round(body.weekdayHours * 45))}m learning/practice split → 10m mistakes review.`,
    `- **Weekends (${body.weekendHours}h):** 1 full mock OR 2 sectional mocks + 60–90m AI/error-notebook analysis.`,
    "",
    "## Mock strategy",
    "- Minimum **2–3 analytics per mock:** accuracy by topic, speed per question-type, careless vs concept errors.",
    "- After each mock: **3 drills** on the top weak tags before the next mock.",
    "",
    "## Revision / mistake notebook",
    "- Every wrong item: topic tag + one-line reason + redo after 1d/3d/7d.",
    "",
    "_This mock plan works offline. Add `GEMINI_API_KEY`, `GROQ_API_KEY`, or `OPENAI_API_KEY` for AI-generated tailored plans._",
  ].join("\n");
}

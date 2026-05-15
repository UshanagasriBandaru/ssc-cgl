import { NextResponse } from "next/server";
import { chatCompletion } from "@/lib/ai";
import {
  buildPlannerSystemPrompt,
  mockPlanMarkdown,
  type PlanRequestBody,
} from "@/lib/plan-engine";

export const runtime = "nodejs";

function validateBody(raw: unknown): PlanRequestBody | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const horizon = o.horizon;
  const weekdayHours = o.weekdayHours;
  const weekendHours = o.weekendHours;
  const levels = o.levels;

  if (
    horizon !== "15d" &&
    horizon !== "30d" &&
    horizon !== "90d" &&
    horizon !== "180d"
  )
    return null;
  if (typeof weekdayHours !== "number" || typeof weekendHours !== "number")
    return null;
  if (!levels || typeof levels !== "object") return null;

  const lv = levels as Record<string, unknown>;
  const pick = (k: string) =>
    lv[k] === "weak" || lv[k] === "medium" || lv[k] === "strong"
      ? lv[k]
      : null;

  const quant = pick("quant");
  const reasoning = pick("reasoning");
  const english = pick("english");
  const gk = pick("gk");
  if (!quant || !reasoning || !english || !gk) return null;

  return {
    horizon,
    examDate: typeof o.examDate === "string" ? o.examDate : undefined,
    weekdayHours,
    weekendHours,
    targetScore:
      typeof o.targetScore === "number" ? o.targetScore : undefined,
    survivalMode: typeof o.survivalMode === "boolean" ? o.survivalMode : undefined,
    weakTopics: Array.isArray(o.weakTopics) ? (o.weakTopics as string[]) : undefined,
    burnoutWarning: typeof o.burnoutWarning === "boolean" ? o.burnoutWarning : undefined,
    levels: {
      quant,
      reasoning,
      english,
      gk,
    },
  };
}

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const body = validateBody(raw);
  if (!body) {
    return NextResponse.json(
      {
        error:
          "Invalid payload: need horizon, weekdayHours, weekendHours, levels.{quant,reasoning,english,gk}",
      },
      { status: 400 },
    );
  }

  const system = buildPlannerSystemPrompt(body);
  const user =
    "Generate the SSC CGL preparation plan now. Use Indian English. Keep it actionable.";

  try {
    const { text, provider } = await chatCompletion(
      [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      { temperature: 0.4 },
    );
    if (text.trim()) {
      return NextResponse.json({
        source: provider,
        markdown: text,
      });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "AI provider failed";
    return NextResponse.json(
      {
        source: "fallback",
        markdown: mockPlanMarkdown(body),
        warning: message,
      },
      { status: 200 },
    );
  }

  return NextResponse.json({
    source: "mock",
    markdown: mockPlanMarkdown(body),
  });
}

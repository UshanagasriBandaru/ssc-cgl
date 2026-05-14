"use client";

import { useMemo, useState } from "react";
import type { PrepHorizon, Level } from "@/lib/plan-engine";
import type { SubjectId } from "@/lib/ssc-topics";
import { markdownToHtml } from "@/lib/markdown";

type ApiOk = { source: string; markdown: string; warning?: string };

const horizons: { id: PrepHorizon; label: string; desc: string }[] = [
  { id: "15d", label: "15 days", desc: "Survival — high-yield only" },
  { id: "30d", label: "1 month", desc: "Focused sprint" },
  { id: "90d", label: "3 months", desc: "Balanced preparation" },
  { id: "180d", label: "6 months", desc: "Full syllabus coverage" },
];

const subjects: { id: SubjectId; label: string; icon: string }[] = [
  { id: "quant",     label: "Quantitative Aptitude", icon: "📐" },
  { id: "reasoning", label: "Reasoning",              icon: "🧩" },
  { id: "english",   label: "English",                icon: "📖" },
  { id: "gk",        label: "General Awareness",      icon: "🌍" },
];

const levelColors: Record<Level, string> = {
  weak:   "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300",
  medium: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300",
  strong: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300",
};

export function PlannerClient() {
  const [horizon, setHorizon] = useState<PrepHorizon>("30d");
  const [weekdayHours, setWeekdayHours] = useState(2);
  const [weekendHours, setWeekendHours] = useState(5);
  const [targetScore, setTargetScore] = useState<number | "">(150);
  const [examDate, setExamDate] = useState("");
  const [survivalMode, setSurvivalMode] = useState(false);
  const [levels, setLevels] = useState<Record<SubjectId, Level>>({
    quant: "medium",
    reasoning: "strong",
    english: "weak",
    gk: "weak",
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ApiOk | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [saveBusy, setSaveBusy] = useState(false);

  const autoSurvival = horizon === "15d";

  const payload = useMemo(
    () => ({
      horizon,
      examDate: examDate.trim() || undefined,
      weekdayHours,
      weekendHours,
      targetScore: targetScore === "" ? undefined : targetScore,
      survivalMode: survivalMode || autoSurvival,
      levels,
    }),
    [horizon, examDate, weekdayHours, weekendHours, targetScore, survivalMode, autoSurvival, levels],
  );

  async function generate() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Request failed");
        return;
      }
      setResult(data as ApiOk);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  async function savePlan() {
    if (!result?.markdown) return;
    setSaveBusy(true);
    setSaveMsg(null);
    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `SSC plan · ${horizon}`,
          markdown: result.markdown,
          horizon,
          payload,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSaveMsg(typeof data.error === "string" ? data.error : "Could not save");
        return;
      }
      setSaveMsg("✅ Saved to Supabase.");
    } catch {
      setSaveMsg("Network error while saving.");
    } finally {
      setSaveBusy(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr] lg:items-start">
      {/* Left: inputs */}
      <div className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
        <div>
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Your constraints</h2>
          <p className="mt-1 text-xs text-zinc-500">
            Planner biases high-PYQ topics and your weak subjects.
          </p>
        </div>

        {/* Horizon */}
        <div>
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Exam horizon</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {horizons.map((h) => (
              <button
                key={h.id}
                type="button"
                onClick={() => setHorizon(h.id)}
                className={`rounded-xl border p-3 text-left transition ${
                  horizon === h.id
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-amber-500 dark:bg-amber-500 dark:text-zinc-900"
                    : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-600"
                }`}
              >
                <div className="text-sm font-semibold">{h.label}</div>
                <div className={`text-xs ${horizon === h.id ? "opacity-80" : "text-zinc-500"}`}>{h.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Hours */}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Weekday hours</span>
            <input
              type="number" min={0.5} max={12} step={0.5}
              className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
              value={weekdayHours}
              onChange={(e) => setWeekdayHours(Number(e.target.value))}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Weekend hours</span>
            <input
              type="number" min={1} max={14} step={0.5}
              className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
              value={weekendHours}
              onChange={(e) => setWeekendHours(Number(e.target.value))}
            />
          </label>
        </div>

        {/* Target score + exam date */}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Target score</span>
            <input
              type="number" min={0} max={200}
              className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
              value={targetScore}
              onChange={(e) => setTargetScore(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="e.g. 150"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Exam date</span>
            <input
              type="date"
              className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
            />
          </label>
        </div>

        {/* Survival mode */}
        <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-zinc-200 p-3 dark:border-zinc-700">
          <input
            type="checkbox"
            checked={survivalMode || autoSurvival}
            disabled={autoSurvival}
            onChange={(e) => setSurvivalMode(e.target.checked)}
            className="h-4 w-4 rounded"
          />
          <div>
            <span className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Survival mode</span>
            <p className="text-xs text-zinc-500">
              {autoSurvival ? "Auto-on for 15-day horizon" : "High-yield topics only"}
            </p>
          </div>
        </label>

        {/* Subject levels */}
        <div>
          <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Current level by subject</p>
          <div className="mt-3 space-y-2">
            {subjects.map((s) => (
              <div key={s.id} className="flex items-center gap-3">
                <span className="w-6 text-base">{s.icon}</span>
                <span className="w-28 text-xs font-medium text-zinc-600 dark:text-zinc-400">{s.label}</span>
                <div className="flex gap-1">
                  {(["weak", "medium", "strong"] as Level[]).map((lv) => (
                    <button
                      key={lv}
                      type="button"
                      onClick={() => setLevels((prev) => ({ ...prev, [s.id]: lv }))}
                      className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                        levels[s.id] === lv
                          ? levelColors[lv]
                          : "border-zinc-200 text-zinc-500 hover:border-zinc-300 dark:border-zinc-700 dark:text-zinc-400"
                      }`}
                    >
                      {lv.charAt(0).toUpperCase() + lv.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => void generate()}
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-amber-500 dark:text-zinc-900 dark:hover:bg-amber-400"
        >
          {loading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white dark:border-zinc-900/40 dark:border-t-zinc-900" />
              Generating plan…
            </>
          ) : "📅 Generate study plan"}
        </button>

        {error ? (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            <span>⚠️</span> {error}
          </div>
        ) : null}
      </div>

      {/* Right: output */}
      <div className="min-h-[400px] rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Your study plan</h2>
          {result ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-semibold text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                via {result.source}
              </span>
              <button
                type="button"
                disabled={saveBusy}
                onClick={() => void savePlan()}
                className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
              >
                {saveBusy ? "Saving…" : "💾 Save plan"}
              </button>
            </div>
          ) : null}
        </div>

        <div className="p-6">
          {saveMsg ? (
            <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">{saveMsg}</p>
          ) : null}
          {result?.warning ? (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
              <span>⚠️</span> {result.warning}
            </div>
          ) : null}

          {result ? (
            <article
              className="prose-study"
              dangerouslySetInnerHTML={{ __html: markdownToHtml(result.markdown) }}
            />
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-200 border-t-zinc-600" />
              <p className="mt-4 text-sm text-zinc-500">Building your personalised plan…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="text-5xl">📅</div>
              <p className="mt-4 font-medium text-zinc-700 dark:text-zinc-300">Your plan will appear here</p>
              <p className="mt-2 max-w-sm text-sm text-zinc-500">
                Without API keys you still get a structured mock plan. Add{" "}
                <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">GEMINI_API_KEY</code> for AI-tailored output.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

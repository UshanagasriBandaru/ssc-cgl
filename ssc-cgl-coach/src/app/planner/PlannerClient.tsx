"use client";

import { useMemo, useState } from "react";
import type { PrepHorizon, Level } from "@/lib/plan-engine";
import type { SubjectId } from "@/lib/ssc-topics";

type ApiOk = { source: string; markdown: string; warning?: string };

const horizons: { id: PrepHorizon; label: string }[] = [
  { id: "15d", label: "15 days (survival-style)" },
  { id: "30d", label: "1 month" },
  { id: "90d", label: "3 months" },
  { id: "180d", label: "6 months" },
];

const subjects: { id: SubjectId; label: string }[] = [
  { id: "quant", label: "Quant" },
  { id: "reasoning", label: "Reasoning" },
  { id: "english", label: "English" },
  { id: "gk", label: "GK / GS" },
];

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
    [
      horizon,
      examDate,
      weekdayHours,
      weekendHours,
      targetScore,
      survivalMode,
      autoSurvival,
      levels,
    ],
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
      setSaveMsg("Saved to Supabase.");
    } catch {
      setSaveMsg("Network error while saving.");
    } finally {
      setSaveBusy(false);
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
      <div className="space-y-6 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <div>
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">Inputs</h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            Planner biases high-PYQ topics and your weak subjects. Toggle survival for last-mile
            cram strategy.
          </p>
        </div>

        <label className="block text-sm">
          <span className="font-medium text-zinc-800 dark:text-zinc-200">Horizon</span>
          <select
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            value={horizon}
            onChange={(e) => setHorizon(e.target.value as PrepHorizon)}
          >
            {horizons.map((h) => (
              <option key={h.id} value={h.id}>
                {h.label}
              </option>
            ))}
          </select>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-zinc-800 dark:text-zinc-200">Weekday hours</span>
            <input
              type="number"
              min={0.5}
              max={12}
              step={0.5}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
              value={weekdayHours}
              onChange={(e) => setWeekdayHours(Number(e.target.value))}
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-zinc-800 dark:text-zinc-200">Weekend hours</span>
            <input
              type="number"
              min={1}
              max={14}
              step={0.5}
              className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
              value={weekendHours}
              onChange={(e) => setWeekendHours(Number(e.target.value))}
            />
          </label>
        </div>

        <label className="block text-sm">
          <span className="font-medium text-zinc-800 dark:text-zinc-200">
            Target score (optional)
          </span>
          <input
            type="number"
            min={0}
            max={200}
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            value={targetScore}
            onChange={(e) =>
              setTargetScore(e.target.value === "" ? "" : Number(e.target.value))
            }
          />
        </label>

        <label className="block text-sm">
          <span className="font-medium text-zinc-800 dark:text-zinc-200">
            Exam date (optional)
          </span>
          <input
            type="date"
            className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            value={examDate}
            onChange={(e) => setExamDate(e.target.value)}
          />
        </label>

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={survivalMode || autoSurvival}
            disabled={autoSurvival}
            onChange={(e) => setSurvivalMode(e.target.checked)}
          />
          <span className="text-zinc-800 dark:text-zinc-200">
            Survival mode (high-yield only)
            {autoSurvival ? " — on automatically for 15-day horizon" : ""}
          </span>
        </label>

        <div>
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Current level by subject
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {subjects.map((s) => (
              <label key={s.id} className="block text-xs uppercase tracking-wide text-zinc-500">
                {s.label}
                <select
                  className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm normal-case text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                  value={levels[s.id]}
                  onChange={(e) =>
                    setLevels((prev) => ({
                      ...prev,
                      [s.id]: e.target.value as Level,
                    }))
                  }
                >
                  <option value="weak">Weak</option>
                  <option value="medium">Medium</option>
                  <option value="strong">Strong</option>
                </select>
              </label>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => void generate()}
          disabled={loading}
          className="w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {loading ? "Generating…" : "Generate plan"}
        </button>

        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <div className="min-h-[320px] rounded-xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">Plan output</h2>
          {result ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                Source: {result.source}
              </span>
              <button
                type="button"
                disabled={saveBusy}
                onClick={() => void savePlan()}
                className="rounded-full border border-zinc-300 px-3 py-0.5 text-xs font-medium hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:hover:bg-zinc-900"
              >
                {saveBusy ? "Saving…" : "Save plan"}
              </button>
            </div>
          ) : null}
        </div>
        {saveMsg ? (
          <p className="mb-2 text-xs text-zinc-600 dark:text-zinc-400">{saveMsg}</p>
        ) : null}
        {result?.warning ? (
          <p className="mb-3 text-xs text-amber-800 dark:text-amber-200">{result.warning}</p>
        ) : null}
        {result ? (
          <article className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-800 dark:text-zinc-200">
            {result.markdown}
          </article>
        ) : (
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Generated roadmap appears here. Without API keys you still get a structured mock plan;
            add Groq (free tier) or OpenAI for richer tailoring.
          </p>
        )}
      </div>
    </div>
  );
}

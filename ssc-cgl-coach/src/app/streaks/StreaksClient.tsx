"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { KEYS, readStore, writeStore } from "@/lib/datastore";
import {
  computeStreak, computeHabitCalendar, computeMilestoneBadges,
  checkReEngagement, validateTarget, todayStr,
  type DailyActivity, type DailyTarget, MILESTONE_DAYS,
} from "@/lib/streak";

const MILESTONE_LABELS: Record<number, string> = {
  7: "🔥 Week Warrior",
  14: "⚡ Fortnight Fighter",
  30: "🏆 Month Master",
  60: "👑 60-Day Champion",
};

export function StreaksClient() {
  const [activities, setActivities] = useState<DailyActivity[]>([]);
  const [target, setTarget] = useState<DailyTarget>({ type: "questions", value: 10 });
  const [targetInput, setTargetInput] = useState("10");
  const [targetType, setTargetType] = useState<"questions" | "minutes">("questions");
  const [targetError, setTargetError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const log = readStore<DailyActivity[]>(KEYS.HABIT_LOG, []);
    const t = readStore<DailyTarget>(KEYS.DAILY_TARGET, { type: "questions", value: 10 });
    setActivities(log);
    setTarget(t);
    setTargetInput(String(t.value));
    setTargetType(t.type);
  }, []);

  const streak = computeStreak(activities);
  const calendar = computeHabitCalendar(activities, 30);
  const milestones = computeMilestoneBadges(streak);
  const reEngagement = checkReEngagement(activities);
  const today = todayStr();
  const todayActivity = activities.find((a) => a.date === today);

  function saveTarget() {
    const val = parseInt(targetInput, 10);
    const newTarget: DailyTarget = { type: targetType, value: val };
    const err = validateTarget(newTarget);
    if (err) { setTargetError(err); return; }
    setTargetError(null);
    setSaving(true);
    writeStore(KEYS.DAILY_TARGET, newTarget);
    setTarget(newTarget);
    setTimeout(() => setSaving(false), 800);
  }

  const dayColor = (status: "filled" | "partial" | "empty") => {
    if (status === "filled") return "bg-emerald-500";
    if (status === "partial") return "bg-amber-400";
    return "bg-zinc-200 dark:bg-zinc-700";
  };

  return (
    <div className="space-y-6">
      {/* Re-engagement prompt */}
      {reEngagement && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-950/30">
          <span className="text-2xl">😴</span>
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-200">You haven&apos;t studied in {reEngagement} days</p>
            <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">Here&apos;s a quick 10-minute session to get back on track.</p>
            <Link href="/mock-tests" className="mt-3 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-400">
              🧪 Quick mock test
            </Link>
          </div>
        </div>
      )}

      {/* Streak hero */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="text-center">
            <div className="text-6xl font-black text-zinc-900 dark:text-zinc-50">{streak}</div>
            <div className="mt-1 text-sm font-medium text-zinc-500">day streak 🔥</div>
          </div>
          <div className="flex-1">
            {/* Milestone badges */}
            <div className="flex flex-wrap gap-2">
              {MILESTONE_DAYS.map((m) => (
                <div key={m} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${milestones.includes(m) ? "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-300" : "border-zinc-200 bg-zinc-50 text-zinc-400 dark:border-zinc-700 dark:bg-zinc-800"}`}>
                  {milestones.includes(m) ? MILESTONE_LABELS[m] : `${m} days`}
                </div>
              ))}
            </div>
            {/* Today's progress */}
            {todayActivity && (
              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                <span className="text-zinc-600 dark:text-zinc-400">Today: <strong className="text-zinc-900 dark:text-zinc-50">{todayActivity.questionsAnswered} questions</strong></span>
                <span className="text-zinc-600 dark:text-zinc-400"><strong className="text-zinc-900 dark:text-zinc-50">{todayActivity.minutesStudied}m</strong> studied</span>
                {todayActivity.targetMet && <span className="font-semibold text-emerald-600 dark:text-emerald-400">✅ Target met!</span>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 30-day calendar */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
        <h2 className="mb-4 font-semibold text-zinc-900 dark:text-zinc-50">30-day habit calendar</h2>
        <div className="grid grid-cols-10 gap-1.5 sm:grid-cols-15">
          {calendar.map(({ date, status }) => (
            <div
              key={date}
              title={date}
              className={`aspect-square rounded-md ${dayColor(status)}`}
            />
          ))}
        </div>
        <div className="mt-3 flex gap-4 text-xs text-zinc-500">
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-emerald-500" /> Target met</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-amber-400" /> Partial</span>
          <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-zinc-200 dark:bg-zinc-700" /> No activity</span>
        </div>
      </div>

      {/* Daily target config */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Daily target</h2>
        <p className="mt-1 text-sm text-zinc-500">Set a daily goal to maintain your streak.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <div className="flex gap-1 rounded-xl border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-700 dark:bg-zinc-800">
            {(["questions", "minutes"] as const).map((t) => (
              <button key={t} type="button" onClick={() => setTargetType(t)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${targetType === t ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50" : "text-zinc-500"}`}>
                {t === "questions" ? "Questions" : "Minutes"}
              </button>
            ))}
          </div>
          <input
            type="number"
            className="w-24 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
            value={targetInput}
            onChange={(e) => setTargetInput(e.target.value)}
            min={targetType === "questions" ? 5 : 10}
            max={targetType === "questions" ? 200 : 480}
          />
          <button type="button" onClick={saveTarget}
            className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-amber-500 dark:text-zinc-900">
            {saving ? "Saved ✓" : "Save target"}
          </button>
        </div>
        {targetError && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{targetError}</p>}
        <p className="mt-2 text-xs text-zinc-400">
          Current: {target.value} {target.type} per day
          {targetType === "questions" ? " (5–200)" : " (10–480 minutes)"}
        </p>
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-3">
        <Link href="/mock-tests" className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-amber-500 dark:text-zinc-900">
          🧪 Take a mock
        </Link>
        <Link href="/focus" className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          ⏱️ Focus mode
        </Link>
        <Link href="/revision" className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
          🔁 Revision queue
        </Link>
      </div>
    </div>
  );
}

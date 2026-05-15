"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { KEYS, readStore, writeStore } from "@/lib/datastore";
import { mergeActivity, todayStr } from "@/lib/streak";
import type { DailyActivity, DailyTarget } from "@/lib/streak";

type Phase = "work" | "break" | "idle";

const WORK_MINUTES = 25;
const BREAK_MINUTES = 5;

export function FocusClient() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [secondsLeft, setSecondsLeft] = useState(WORK_MINUTES * 60);
  const [sessionMinutes, setSessionMinutes] = useState(0);
  const [pomodorosCompleted, setPomodorosCompleted] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number | null>(null);

  function clearTimer() {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }

  function startWork() {
    setPhase("work");
    setSecondsLeft(WORK_MINUTES * 60);
    startTimeRef.current = Date.now();
    clearTimer();
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearTimer();
          setPomodorosCompleted((p) => p + 1);
          setSessionMinutes((m) => m + WORK_MINUTES);
          setPhase("break");
          setSecondsLeft(BREAK_MINUTES * 60);
          // Auto-start break timer
          intervalRef.current = setInterval(() => {
            setSecondsLeft((bs) => {
              if (bs <= 1) { clearTimer(); setPhase("idle"); return 0; }
              return bs - 1;
            });
          }, 1000);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  function exitFocus() {
    clearTimer();
    const elapsed = startTimeRef.current ? Math.round((Date.now() - startTimeRef.current) / 60000) : 0;
    const totalMinutes = sessionMinutes + elapsed;
    if (totalMinutes > 0) {
      const log = readStore<DailyActivity[]>(KEYS.HABIT_LOG, []);
      const target = readStore<DailyTarget>(KEYS.DAILY_TARGET, { type: "minutes", value: 30 });
      const updated = mergeActivity(log, { date: todayStr(), questionsAnswered: 0, minutesStudied: totalMinutes }, target);
      writeStore(KEYS.HABIT_LOG, updated);
    }
    setPhase("idle");
    setSecondsLeft(WORK_MINUTES * 60);
    setSessionMinutes(0);
    startTimeRef.current = null;
  }

  useEffect(() => () => clearTimer(), []);

  const mins = Math.floor(secondsLeft / 60).toString().padStart(2, "0");
  const secs = (secondsLeft % 60).toString().padStart(2, "0");
  const progress = phase === "work"
    ? ((WORK_MINUTES * 60 - secondsLeft) / (WORK_MINUTES * 60)) * 100
    : phase === "break"
      ? ((BREAK_MINUTES * 60 - secondsLeft) / (BREAK_MINUTES * 60)) * 100
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950 text-white">
      {/* Exit */}
      <Link
        href="/"
        onClick={exitFocus}
        className="absolute right-6 top-6 rounded-xl border border-zinc-700 px-4 py-2 text-sm text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
      >
        ✕ Exit Focus
      </Link>

      {/* Pomodoro count */}
      <div className="mb-8 flex gap-2">
        {Array.from({ length: Math.max(4, pomodorosCompleted + 1) }).map((_, i) => (
          <div key={i} className={`h-3 w-3 rounded-full ${i < pomodorosCompleted ? "bg-amber-500" : "bg-zinc-700"}`} />
        ))}
      </div>

      {/* Phase label */}
      <p className="mb-4 text-sm font-semibold uppercase tracking-widest text-zinc-400">
        {phase === "work" ? "Focus Session" : phase === "break" ? "Break Time" : "Ready to Focus"}
      </p>

      {/* Timer circle */}
      <div className="relative flex h-64 w-64 items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="45" fill="none" stroke="#27272a" strokeWidth="6" />
          <circle
            cx="50" cy="50" r="45" fill="none"
            stroke={phase === "break" ? "#10b981" : "#f59e0b"}
            strokeWidth="6"
            strokeDasharray={`${2 * Math.PI * 45}`}
            strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
            strokeLinecap="round"
            className="transition-all duration-1000"
          />
        </svg>
        <div className="text-center">
          <div className="text-6xl font-bold tabular-nums">{mins}:{secs}</div>
          <div className="mt-1 text-sm text-zinc-400">
            {phase === "work" ? "minutes remaining" : phase === "break" ? "break" : ""}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-10 flex gap-4">
        {phase === "idle" ? (
          <button
            type="button"
            onClick={startWork}
            className="rounded-2xl bg-amber-500 px-8 py-4 text-lg font-bold text-zinc-900 hover:bg-amber-400"
          >
            Start Focus
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={exitFocus}
              className="rounded-2xl border border-zinc-700 px-6 py-3 text-sm font-medium text-zinc-300 hover:border-zinc-500"
            >
              End Session
            </button>
            {phase === "break" && (
              <button
                type="button"
                onClick={startWork}
                className="rounded-2xl bg-amber-500 px-6 py-3 text-sm font-bold text-zinc-900 hover:bg-amber-400"
              >
                Skip Break →
              </button>
            )}
          </>
        )}
      </div>

      {/* Stats */}
      {(sessionMinutes > 0 || pomodorosCompleted > 0) && (
        <div className="mt-8 flex gap-8 text-center text-sm text-zinc-400">
          <div><div className="text-2xl font-bold text-white">{pomodorosCompleted}</div><div>Pomodoros</div></div>
          <div><div className="text-2xl font-bold text-white">{sessionMinutes}m</div><div>Focused</div></div>
        </div>
      )}

      <p className="absolute bottom-6 text-xs text-zinc-600">
        Session time is saved to your habit log automatically
      </p>
    </div>
  );
}

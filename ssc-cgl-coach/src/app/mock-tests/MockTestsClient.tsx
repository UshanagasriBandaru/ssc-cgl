"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { slugifyTopic } from "@/lib/slug";
import { SSC_CGL_TOPICS } from "@/lib/ssc-topics";
import { KEYS, readStore, writeStore, adjustDifficulty, getDifficulty, getLanguagePref } from "@/lib/datastore";
import { newCard, applyRating } from "@/lib/sm2";
import { computeWeakTopics, computePerformanceScore, type MockSession } from "@/lib/performance";
import { mergeActivity, todayStr } from "@/lib/streak";
import type { SM2Card } from "@/lib/sm2";
import type { MistakeRecord } from "@/lib/performance";
import type { DailyActivity, DailyTarget } from "@/lib/streak";

type Mcq = { question: string; options: string[]; answerIndex: number; explanation: string; difficulty: string };
type ErrorAnalysis = { primaryCategory: string; explanation: string; remediationActions: string[]; analyzedAt: string };

const difficultyColor: Record<string, string> = {
  easy: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  hard: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

export function MockTestsClient() {
  const searchParams = useSearchParams();
  const topics = useMemo(() => SSC_CGL_TOPICS, []);

  const [source, setSource] = useState<"syllabus" | "custom" | "adaptive">("adaptive");
  const [slug, setSlug] = useState(topics[0]?.slug ?? "percentage");
  const [customTopic, setCustomTopic] = useState("");
  const [count, setCount] = useState(10);

  useEffect(() => {
    queueMicrotask(() => {
      const q = searchParams.get("q")?.trim();
      if (q) { setSource("custom"); setCustomTopic(q); }
    });
  }, [searchParams]);

  const syllabusName = topics.find((t) => t.slug === slug)?.name ?? slug;
  const [busy, setBusy] = useState(false);
  const [questions, setQuestions] = useState<Mcq[]>([]);
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(0);
  const [finished, setFinished] = useState(false);
  const [errorAnalysis, setErrorAnalysis] = useState<ErrorAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [incorrectLog, setIncorrectLog] = useState<Array<{ question: string; correctAnswer: string; userAnswer: string; topicSlug: string }>>([]);
  const questionStartRef = useRef<number>(Date.now());
  const sessionStartRef = useRef<number>(Date.now());
  const [questionTimes, setQuestionTimes] = useState<number[]>([]);

  const q = questions[idx];

  function resolveTopic(): { topicName: string; topicSlug: string } {
    const qp = searchParams.get("q")?.trim() ?? "";
    const sp = searchParams.get("slug")?.trim() ?? "";
    if (source === "syllabus") return { topicName: syllabusName, topicSlug: slug };
    if (source === "adaptive") return { topicName: "", topicSlug: "" };
    const topicName = customTopic.trim() || qp;
    return { topicName, topicSlug: sp || slugifyTopic(topicName || "topic") };
  }

  function getWeakTopicNames(): string[] {
    const mistakes = readStore<MistakeRecord[]>(KEYS.MISTAKES, []);
    const sessions = readStore<MockSession[]>(KEYS.MOCK_SESSIONS, []);
    const perfs = SSC_CGL_TOPICS.map((t) => computePerformanceScore(mistakes, sessions, t.slug));
    const weak = computeWeakTopics(perfs).slice(0, 3);
    return weak.map((p) => SSC_CGL_TOPICS.find((t) => t.slug === p.topicSlug)?.name ?? p.topicSlug);
  }

  async function generate() {
    const { topicName, topicSlug } = resolveTopic();
    if (source !== "adaptive" && !topicName.trim()) {
      setError("Enter a topic name or choose from the syllabus list.");
      return;
    }

    const difficulty = getDifficulty();
    const weakTopics = source === "adaptive" ? getWeakTopicNames() : [];
    const lang = getLanguagePref();

    setBusy(true); setError(null); setQuestions([]); setIdx(0); setPicked(null);
    setScore(0); setAnswered(0); setFinished(false); setErrorAnalysis(null);
    setIncorrectLog([]); setQuestionTimes([]);
    sessionStartRef.current = Date.now();

    try {
      const res = await fetch("/api/mock/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicSlug: topicSlug || (weakTopics[0] ? slugifyTopic(weakTopics[0]) : "percentage"),
          topicName: topicName || (weakTopics.length > 0 ? weakTopics.join(", ") : "mixed SSC CGL topics"),
          count,
          difficulty,
          weakTopics,
          lang,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(typeof data.error === "string" ? data.error : "Generate failed"); return; }
      setQuestions((data as { questions?: Mcq[] }).questions ?? []);
      questionStartRef.current = Date.now();
    } catch { setError("Network error"); }
    finally { setBusy(false); }
  }

  function choose(optionIdx: number) {
    if (!q || picked !== null) return;
    const elapsed = Math.round((Date.now() - questionStartRef.current) / 1000);
    setQuestionTimes((t) => [...t, elapsed]);
    setPicked(optionIdx);
    setAnswered((a) => a + 1);
    if (optionIdx === q.answerIndex) {
      setScore((s) => s + 1);
    } else {
      const { topicSlug } = resolveTopic();
      const ts = topicSlug || slugifyTopic(q.question.slice(0, 30));
      setIncorrectLog((log) => [...log, {
        question: q.question,
        correctAnswer: q.options[q.answerIndex],
        userAnswer: q.options[optionIdx],
        topicSlug: ts,
      }]);
    }
  }

  async function finishMock() {
    const durationSeconds = Math.round((Date.now() - sessionStartRef.current) / 1000);
    const { topicSlug } = resolveTopic();
    const ts = topicSlug || "mixed";

    // Persist mock session
    const session: MockSession = {
      id: crypto.randomUUID(),
      date: todayStr(),
      topicSlugs: [ts],
      score,
      totalQuestions: questions.length,
      accuracyByTopic: { [ts]: score / questions.length },
      durationSeconds,
      difficultyDistribution: getDifficulty(),
    };
    const sessions = readStore<MockSession[]>(KEYS.MOCK_SESSIONS, []);
    writeStore(KEYS.MOCK_SESSIONS, [...sessions, session]);

    // Adjust difficulty
    adjustDifficulty(score, questions.length);

    // Log incorrect answers + create SM-2 cards
    const existingMistakes = readStore<Array<{ id: string; topic_slug: string; question: string; correct_answer?: string; user_answer?: string; explanation?: string; next_review_at?: string; created_at?: string }>>(KEYS.MISTAKES, []);
    const sm2State = readStore<Record<string, SM2Card>>(KEYS.SM2_STATE, {});
    const newMistakes = incorrectLog.map((m) => ({
      id: crypto.randomUUID(),
      topic_slug: m.topicSlug,
      question: m.question,
      correct_answer: m.correctAnswer,
      user_answer: m.userAnswer,
      explanation: questions.find((q) => q.question === m.question)?.explanation ?? null,
      next_review_at: new Date(Date.now() + 864e5).toISOString().slice(0, 10),
      created_at: new Date().toISOString(),
    }));
    writeStore(KEYS.MISTAKES, [...existingMistakes, ...newMistakes]);

    const newSm2 = { ...sm2State };
    for (const m of newMistakes) { newSm2[m.id] = newCard(m.id); }
    writeStore(KEYS.SM2_STATE, newSm2);

    // Update habit log
    const habitLog = readStore<DailyActivity[]>(KEYS.HABIT_LOG, []);
    const target = readStore<DailyTarget>(KEYS.DAILY_TARGET, { type: "questions", value: 10 });
    const updated = mergeActivity(habitLog, { date: todayStr(), questionsAnswered: questions.length, minutesStudied: Math.round(durationSeconds / 60) }, target);
    writeStore(KEYS.HABIT_LOG, updated);

    // Update leaderboard score (fire-and-forget, only if Supabase configured)
    if (score > 0 && Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL)) {
      fetch("/api/leaderboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optIn: true, displayName: "Student", increment: score }),
      }).catch(() => {});
    }

    setFinished(true);

    // Trigger AI error analysis if ≥ 3 incorrect
    if (incorrectLog.length >= 3) {
      setAnalysisLoading(true);
      try {
        const res = await fetch("/api/mock/analyse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ incorrectQuestions: incorrectLog, lang: getLanguagePref() }),
        });
        const data = await res.json();
        if (res.ok) setErrorAnalysis(data as ErrorAnalysis);
        else setAnalysisError(typeof data.error === "string" ? data.error : "Analysis failed");
      } catch { setAnalysisError("Network error during analysis"); }
      finally { setAnalysisLoading(false); }
    }
  }

  function next() {
    if (idx >= questions.length - 1) { void finishMock(); }
    else { setPicked(null); setIdx((i) => i + 1); questionStartRef.current = Date.now(); }
  }

  function restart() {
    setQuestions([]); setIdx(0); setPicked(null); setScore(0); setAnswered(0);
    setFinished(false); setErrorAnalysis(null); setAnalysisError(null); setIncorrectLog([]);
  }

  const qp = searchParams.get("q")?.trim() ?? "";
  const customBlocked = source === "custom" && !customTopic.trim() && !qp;
  const progress = questions.length > 0 ? ((idx + (picked !== null ? 1 : 0)) / questions.length) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Config */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Configure mock test</h2>
        <p className="mt-1 text-sm text-zinc-500">Wrong answers auto-log to your mistake notebook and SM-2 revision queue.</p>

        {/* Source toggle */}
        <div className="mt-4 flex gap-1 rounded-xl border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-900">
          {([
            { id: "adaptive", label: "🎯 Adaptive (weak topics)" },
            { id: "syllabus", label: "📚 Syllabus" },
            { id: "custom", label: "✏️ Any topic" },
          ] as const).map((s) => (
            <button key={s.id} type="button" onClick={() => setSource(s.id)}
              className={`flex-1 rounded-lg px-2 py-2 text-xs font-semibold transition sm:text-sm ${source === s.id ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50" : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"}`}>
              {s.label}
            </button>
          ))}
        </div>

        {source === "adaptive" && (
          <div className="mt-3 rounded-xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-blue-300">
            🎯 Questions will focus on your weakest topics and adjust difficulty based on your performance.
          </div>
        )}
        {source === "syllabus" && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Select topic</label>
            <select className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              value={slug} onChange={(e) => setSlug(e.target.value)}>
              {topics.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}
            </select>
          </div>
        )}
        {source === "custom" && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Topic name</label>
            <input className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              value={customTopic} onChange={(e) => setCustomTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void generate()}
              placeholder="e.g. Compound interest, Ancient History…" />
          </div>
        )}

        {/* Question count */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Questions</label>
          <div className="mt-1.5 flex gap-2">
            {[10, 25, 50].map((n) => (
              <button key={n} type="button" onClick={() => setCount(n)}
                className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${count === n ? "border-zinc-900 bg-zinc-900 text-white dark:border-amber-500 dark:bg-amber-500 dark:text-zinc-900" : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400"}`}>
                {n}
              </button>
            ))}
          </div>
        </div>

        <button type="button" disabled={busy || customBlocked} onClick={() => void generate()}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white disabled:opacity-60 hover:bg-zinc-800 dark:bg-amber-500 dark:text-zinc-900 dark:hover:bg-amber-400">
          {busy ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white dark:border-zinc-900/40 dark:border-t-zinc-900" />Generating {count} questions…</> : `🧪 Generate ${count} MCQs`}
        </button>
        {error && <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"><span>⚠️</span>{error}</div>}
      </div>

      {/* Results */}
      {finished && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
          <div className="text-center">
            <div className="text-5xl">{score / questions.length >= 0.8 ? "🏆" : score / questions.length >= 0.6 ? "👍" : score / questions.length >= 0.4 ? "📈" : "💪"}</div>
            <h2 className="mt-3 text-2xl font-bold text-zinc-900 dark:text-zinc-50">{score} / {questions.length}</h2>
            <p className="mt-1 text-zinc-500">{score / questions.length >= 0.8 ? "Excellent!" : score / questions.length >= 0.6 ? "Good effort — review the wrong ones." : "Keep practising — check your mistake notebook."}</p>
            {questionTimes.length > 0 && (
              <p className="mt-2 text-sm text-zinc-400">Avg time per question: {Math.round(questionTimes.reduce((a, b) => a + b, 0) / questionTimes.length)}s</p>
            )}
          </div>

          {/* AI Error Analysis */}
          {incorrectLog.length >= 3 && (
            <div className="mt-5">
              {analysisLoading ? (
                <div className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />Analysing your mistakes with AI…
                </div>
              ) : errorAnalysis ? (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-400">AI Error Analysis</p>
                  <p className="mt-1 font-semibold text-blue-900 dark:text-blue-200">Primary issue: {errorAnalysis.primaryCategory}</p>
                  <p className="mt-1 text-sm text-blue-800 dark:text-blue-300">{errorAnalysis.explanation}</p>
                  <ul className="mt-2 space-y-1">
                    {errorAnalysis.remediationActions.map((a, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-blue-800 dark:text-blue-300">
                        <span className="font-bold">{i + 1}.</span>{a}
                      </li>
                    ))}
                  </ul>
                  {errorAnalysis.primaryCategory === "time pressure" && (
                    <Link href="/focus" className="mt-3 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500">
                      ⏱️ Try Focus Mode
                    </Link>
                  )}
                </div>
              ) : analysisError ? (
                <div className="flex items-center justify-between rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800">
                  <span className="text-sm text-zinc-500">AI analysis unavailable</span>
                  <button type="button" onClick={() => { setAnalysisError(null); void finishMock(); }}
                    className="text-xs text-blue-600 underline dark:text-blue-400">Retry</button>
                </div>
              ) : null}
            </div>
          )}

          <div className="mt-5 flex justify-center gap-3">
            <button type="button" onClick={restart}
              className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-amber-500 dark:text-zinc-900">
              New test
            </button>
            <Link href="/mistakes" className="rounded-xl border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300">
              Review mistakes
            </Link>
          </div>
        </div>
      )}

      {/* Question card */}
      {q && !finished && (
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
          <div className="h-1.5 w-full overflow-hidden rounded-t-2xl bg-zinc-100 dark:bg-zinc-800">
            <div className="h-full bg-amber-500 transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
          <div className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-zinc-500">Q{idx + 1}/{questions.length}</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${difficultyColor[q.difficulty] ?? difficultyColor.medium}`}>{q.difficulty}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-emerald-600 dark:text-emerald-400">✓ {score}</span>
                <span className="text-red-500 dark:text-red-400">✗ {answered - score}</span>
              </div>
            </div>
            <p className="mt-4 text-base font-semibold leading-relaxed text-zinc-900 dark:text-zinc-50">{q.question}</p>
            <div className="mt-5 grid gap-2.5">
              {q.options.map((op, i) => {
                const isCorrect = i === q.answerIndex;
                const isWrong = picked !== null && picked === i && !isCorrect;
                const showCorrect = picked !== null && isCorrect;
                return (
                  <button key={i} type="button" disabled={picked !== null} onClick={() => choose(i)}
                    className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${showCorrect ? "border-emerald-400 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/40" : isWrong ? "border-red-400 bg-red-50 dark:border-red-600 dark:bg-red-950/30" : picked !== null ? "border-zinc-200 bg-zinc-50 opacity-60 dark:border-zinc-700 dark:bg-zinc-900" : "border-zinc-200 bg-white hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-500"}`}>
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${showCorrect ? "bg-emerald-500 text-white" : isWrong ? "bg-red-500 text-white" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"}`}>
                      {showCorrect ? "✓" : isWrong ? "✗" : String.fromCharCode(65 + i)}
                    </span>
                    <span className={`leading-relaxed ${showCorrect ? "font-semibold text-emerald-900 dark:text-emerald-100" : isWrong ? "text-red-800 dark:text-red-200" : "text-zinc-800 dark:text-zinc-200"}`}>{op}</span>
                  </button>
                );
              })}
            </div>
            {picked !== null && (
              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-400">Explanation</p>
                <p className="mt-1 text-sm leading-relaxed text-blue-900 dark:text-blue-200">{q.explanation}</p>
              </div>
            )}
            {picked !== null && (
              <button type="button" onClick={next}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-amber-500 dark:text-zinc-900 dark:hover:bg-amber-400">
                {idx >= questions.length - 1 ? "See results →" : "Next question →"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

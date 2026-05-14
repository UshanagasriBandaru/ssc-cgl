"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { slugifyTopic } from "@/lib/slug";
import { SSC_CGL_TOPICS } from "@/lib/ssc-topics";

type Mcq = {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
  difficulty: string;
};

const difficultyColor: Record<string, string> = {
  easy: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  medium: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
  hard: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
};

export function MockTestsClient() {
  const searchParams = useSearchParams();
  const topics = useMemo(() => SSC_CGL_TOPICS, []);

  const [source, setSource] = useState<"syllabus" | "custom">("syllabus");
  const [slug, setSlug] = useState(topics[0]?.slug ?? "percentage");
  const [customTopic, setCustomTopic] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      const q = searchParams.get("q")?.trim();
      if (q) {
        setSource("custom");
        setCustomTopic(q);
      }
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

  const q = questions[idx];

  function resolveTopic() {
    const qp = searchParams.get("q")?.trim() ?? "";
    const sp = searchParams.get("slug")?.trim() ?? "";
    if (source === "syllabus") {
      return { topicName: syllabusName, topicSlug: slug };
    }
    const topicName = customTopic.trim() || qp;
    const topicSlug = sp || slugifyTopic(topicName || "topic");
    return { topicName, topicSlug };
  }

  async function generate() {
    const { topicName, topicSlug } = resolveTopic();
    if (!topicName.trim()) {
      setError("Enter a topic name or choose from the syllabus list.");
      return;
    }

    setBusy(true);
    setError(null);
    setQuestions([]);
    setIdx(0);
    setPicked(null);
    setScore(0);
    setAnswered(0);
    setFinished(false);
    try {
      const res = await fetch("/api/mock/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicSlug, topicName, count: 10 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Generate failed");
        return;
      }
      setQuestions((data as { questions?: Mcq[] }).questions ?? []);
    } catch {
      setError("Network error");
    } finally {
      setBusy(false);
    }
  }

  async function logMistake(mcq: Mcq, choice: number) {
    const { topicSlug } = resolveTopic();
    await fetch("/api/mistakes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic_slug: topicSlug,
        question: mcq.question,
        correct_answer: mcq.options[mcq.answerIndex],
        user_answer: mcq.options[choice],
        explanation: mcq.explanation,
      }),
    }).catch(() => {});
  }

  function choose(optionIdx: number) {
    if (!q || picked !== null) return;
    setPicked(optionIdx);
    setAnswered((a) => a + 1);
    if (optionIdx === q.answerIndex) {
      setScore((s) => s + 1);
    } else {
      void logMistake(q, optionIdx);
    }
  }

  function next() {
    if (idx >= questions.length - 1) {
      setFinished(true);
    } else {
      setPicked(null);
      setIdx((i) => i + 1);
    }
  }

  function restart() {
    setQuestions([]);
    setIdx(0);
    setPicked(null);
    setScore(0);
    setAnswered(0);
    setFinished(false);
  }

  const qp = searchParams.get("q")?.trim() ?? "";
  const customBlocked = source === "custom" && !customTopic.trim() && !qp;
  const progress = questions.length > 0 ? ((idx + (picked !== null ? 1 : 0)) / questions.length) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Config card */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Configure mock test</h2>
        <p className="mt-1 text-sm text-zinc-500">
          10 SSC CGL-style MCQs with difficulty tags and instant explanations. Wrong answers are auto-logged to your mistake notebook.
        </p>

        {/* Source toggle */}
        <div className="mt-4 flex gap-1 rounded-xl border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-900">
          {(["syllabus", "custom"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSource(s)}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${
                source === s
                  ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                  : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
              }`}
            >
              {s === "syllabus" ? "📚 Syllabus list" : "✏️ Any topic"}
            </button>
          ))}
        </div>

        {source === "syllabus" ? (
          <div className="mt-4">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Select topic
            </label>
            <select
              className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            >
              {topics.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="mt-4">
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Topic name
            </label>
            <input
              className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void generate()}
              placeholder="e.g. Compound interest, Ancient History, Para jumbles…"
            />
          </div>
        )}

        <button
          type="button"
          disabled={busy || customBlocked}
          onClick={() => void generate()}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-60 dark:bg-amber-500 dark:text-zinc-900 dark:hover:bg-amber-400"
        >
          {busy ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white dark:border-zinc-900/40 dark:border-t-zinc-900" />
              Generating 10 questions…
            </>
          ) : (
            "🧪 Generate AI mock (10 MCQs)"
          )}
        </button>

        {error ? (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            <span>⚠️</span> {error}
          </div>
        ) : null}
      </div>

      {/* Results summary (finished) */}
      {finished && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
          <div className="text-center">
            <div className="text-5xl">
              {score >= 8 ? "🏆" : score >= 6 ? "👍" : score >= 4 ? "📈" : "💪"}
            </div>
            <h2 className="mt-3 text-2xl font-bold text-zinc-900 dark:text-zinc-50">
              {score} / {questions.length}
            </h2>
            <p className="mt-1 text-zinc-500">
              {score >= 8 ? "Excellent! Keep it up." : score >= 6 ? "Good effort — review the wrong ones." : "Keep practising — check your mistake notebook."}
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <button
                type="button"
                onClick={restart}
                className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-amber-500 dark:text-zinc-900"
              >
                New test
              </button>
              <a
                href="/mistakes"
                className="rounded-xl border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
              >
                Review mistakes
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Question card */}
      {q && !finished ? (
        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
          {/* Progress bar */}
          <div className="h-1.5 w-full overflow-hidden rounded-t-2xl bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-full bg-amber-500 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="p-6">
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-zinc-500">
                  Q{idx + 1} / {questions.length}
                </span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${difficultyColor[q.difficulty] ?? difficultyColor.medium}`}>
                  {q.difficulty}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="text-emerald-600 dark:text-emerald-400">✓ {score}</span>
                <span className="text-red-500 dark:text-red-400">✗ {answered - score}</span>
              </div>
            </div>

            {/* Question */}
            <p className="mt-4 text-base font-semibold leading-relaxed text-zinc-900 dark:text-zinc-50">
              {q.question}
            </p>

            {/* Options */}
            <div className="mt-5 grid gap-2.5">
              {q.options.map((op, i) => {
                const isCorrect = i === q.answerIndex;
                const isWrong = picked !== null && picked === i && !isCorrect;
                const showCorrect = picked !== null && isCorrect;

                return (
                  <button
                    key={i}
                    type="button"
                    disabled={picked !== null}
                    onClick={() => choose(i)}
                    className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${
                      showCorrect
                        ? "border-emerald-400 bg-emerald-50 dark:border-emerald-600 dark:bg-emerald-950/40"
                        : isWrong
                          ? "border-red-400 bg-red-50 dark:border-red-600 dark:bg-red-950/30"
                          : picked !== null
                            ? "border-zinc-200 bg-zinc-50 opacity-60 dark:border-zinc-700 dark:bg-zinc-900"
                            : "border-zinc-200 bg-white hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-500"
                    }`}
                  >
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      showCorrect
                        ? "bg-emerald-500 text-white"
                        : isWrong
                          ? "bg-red-500 text-white"
                          : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                    }`}>
                      {showCorrect ? "✓" : isWrong ? "✗" : String.fromCharCode(65 + i)}
                    </span>
                    <span className={`leading-relaxed ${
                      showCorrect ? "font-semibold text-emerald-900 dark:text-emerald-100" :
                      isWrong ? "text-red-800 dark:text-red-200" :
                      "text-zinc-800 dark:text-zinc-200"
                    }`}>
                      {op}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Explanation */}
            {picked !== null ? (
              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
                <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-400">Explanation</p>
                <p className="mt-1 text-sm leading-relaxed text-blue-900 dark:text-blue-200">{q.explanation}</p>
              </div>
            ) : null}

            {/* Next button */}
            {picked !== null ? (
              <button
                type="button"
                onClick={next}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-amber-500 dark:text-zinc-900 dark:hover:bg-amber-400"
              >
                {idx >= questions.length - 1 ? "See results →" : "Next question →"}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

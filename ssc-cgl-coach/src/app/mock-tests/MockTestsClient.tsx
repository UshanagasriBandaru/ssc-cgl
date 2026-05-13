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
    try {
      const res = await fetch("/api/mock/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicSlug,
          topicName,
          count: 10,
        }),
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
    if (optionIdx !== q.answerIndex) void logMistake(q, optionIdx);
  }

  function next() {
    setPicked(null);
    setIdx((i) => Math.min(questions.length - 1, i + 1));
  }

  const qp = searchParams.get("q")?.trim() ?? "";
  const customBlocked = source === "custom" && !customTopic.trim() && !qp;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Pick a syllabus topic or type <strong className="font-medium">any</strong> topic name
          (Quant, Reasoning, English, GK). Generation uses your{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-900">GROQ_API_KEY</code> /{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-900">OPENAI_API_KEY</code>. Saving
          mistakes to the cloud still needs Supabase + sign-in.
        </p>

        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <button
            type="button"
            onClick={() => setSource("syllabus")}
            className={`rounded-full px-3 py-1 ${
              source === "syllabus"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "border border-zinc-300 dark:border-zinc-700"
            }`}
          >
            Syllabus list
          </button>
          <button
            type="button"
            onClick={() => setSource("custom")}
            className={`rounded-full px-3 py-1 ${
              source === "custom"
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "border border-zinc-300 dark:border-zinc-700"
            }`}
          >
            Any topic (type name)
          </button>
        </div>

        {source === "syllabus" ? (
          <label className="mt-4 block text-sm font-medium text-zinc-900 dark:text-zinc-50">
            Topic
            <select
              className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            >
              {topics.map((t) => (
                <option key={t.slug} value={t.slug}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <label className="mt-4 block text-sm font-medium text-zinc-900 dark:text-zinc-50">
            Topic name
            <input
              className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              placeholder="e.g. Compound interest, Reading comprehension, Ancient History…"
            />
          </label>
        )}

        <button
          type="button"
          disabled={busy || customBlocked}
          onClick={() => void generate()}
          className="mt-4 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {busy ? "Generating…" : "Generate AI mock (10 MCQs)"}
        </button>
        <p className="mt-2 text-xs text-zinc-500">
          Tip: open{" "}
          <a className="underline" href="/study">
            Any topic study
          </a>{" "}
          first for notes, then use &quot;Mock test&quot; from there — or paste any topic here.
        </p>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </div>

      {q ? (
        <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              Question {idx + 1}/{questions.length} · {q.difficulty}
            </span>
            <button
              type="button"
              disabled={idx >= questions.length - 1}
              onClick={() => next()}
              className="rounded-md border border-zinc-300 px-3 py-1 text-xs disabled:opacity-40 dark:border-zinc-700"
            >
              Next
            </button>
          </div>
          <p className="mt-3 text-base font-medium text-zinc-900 dark:text-zinc-50">{q.question}</p>
          <div className="mt-4 grid gap-2">
            {q.options.map((op, i) => {
              const wrongPick = picked !== null && picked !== q.answerIndex && picked === i;
              const correctReveal = picked !== null && q.answerIndex === i;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={picked !== null}
                  onClick={() => choose(i)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                    correctReveal
                      ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/40"
                      : wrongPick
                        ? "border-red-400 bg-red-50 dark:bg-red-950/30"
                        : "border-zinc-200 hover:border-zinc-400 dark:border-zinc-800"
                  }`}
                >
                  <span className="font-medium">{String.fromCharCode(65 + i)}.</span> {op}
                </button>
              );
            })}
          </div>
          {picked !== null ? (
            <p className="mt-4 text-sm text-zinc-700 dark:text-zinc-300">{q.explanation}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

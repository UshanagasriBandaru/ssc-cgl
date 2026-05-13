"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { slugifyTopic } from "@/lib/slug";

type Pack = {
  topicName: string;
  importantNotes: string;
  formulas: string;
  shortcuts: string[];
};

export function StudyTopicClient() {
  const searchParams = useSearchParams();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pack, setPack] = useState<Pack | null>(null);

  useEffect(() => {
    queueMicrotask(() => {
      const q = searchParams.get("q");
      if (q) setInput(q);
    });
  }, [searchParams]);

  async function generate() {
    const name = input.trim();
    if (!name) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/topic/study-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicName: name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(typeof data.error === "string" ? data.error : "Failed");
        setPack(null);
        return;
      }
      setPack({
        topicName: (data as Pack).topicName ?? name,
        importantNotes: (data as Pack).importantNotes,
        formulas: (data as Pack).formulas,
        shortcuts: Array.isArray((data as Pack).shortcuts)
          ? (data as Pack).shortcuts!
          : [],
      });
    } catch {
      setErr("Network error");
      setPack(null);
    } finally {
      setBusy(false);
    }
  }

  const topicLabel = (pack?.topicName ?? input).trim() || "topic";
  const slug = slugifyTopic(topicLabel);
  const mockHref = `/mock-tests?q=${encodeURIComponent(topicLabel)}&slug=${encodeURIComponent(slug)}`;

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
        <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-50">
          Type any SSC topic
        </label>
        <input
          className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. Percentage, Time & Work, Cloze test, Indian Polity…"
        />
        <button
          type="button"
          disabled={busy || !input.trim()}
          onClick={() => void generate()}
          className="mt-3 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {busy ? "Generating…" : "Get notes & formulas"}
        </button>
        {err ? <p className="mt-3 text-sm text-red-600">{err}</p> : null}
      </section>

      {pack ? (
        <>
          <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">{pack.topicName}</h2>
              <Link
                href={mockHref}
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
              >
                Take mock test on this topic
              </Link>
            </div>
            <div>
              <h3 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Important notes</h3>
              <div className="mt-2 whitespace-pre-wrap rounded-lg bg-zinc-50 p-4 text-sm text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                {pack.importantNotes}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Important formulas</h3>
              <div className="mt-2 whitespace-pre-wrap rounded-lg bg-zinc-50 p-4 text-sm text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
                {pack.formulas}
              </div>
            </div>
            {pack.shortcuts.length ? (
              <div>
                <h3 className="text-sm font-medium text-zinc-800 dark:text-zinc-200">Shortcuts</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-zinc-700 dark:text-zinc-300">
                  {pack.shortcuts.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        </>
      ) : null}
    </div>
  );
}

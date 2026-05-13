"use client";

import Link from "next/link";
import { useState } from "react";

type Pack = {
  topicName: string;
  importantNotes: string;
  formulas: string;
  shortcuts: string[];
};

export function TopicStudyPack(props: {
  /** Display name for this topic (e.g. Percentage). */
  topicDisplayName: string;
  /** Stable key for mistakes/mocks (slug). */
  topicSlug: string;
}) {
  const { topicDisplayName, topicSlug } = props;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pack, setPack] = useState<Pack | null>(null);

  async function generate() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/topic/study-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicName: topicDisplayName }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(typeof data.error === "string" ? data.error : "Failed");
        setPack(null);
        return;
      }
      setPack({
        topicName: (data as Pack).topicName ?? topicDisplayName,
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

  const mockHref = `/mock-tests?q=${encodeURIComponent(topicDisplayName)}&slug=${encodeURIComponent(topicSlug)}`;

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
            Important notes & formulas
          </h3>
          <p className="mt-1 text-xs text-zinc-500">
            AI-generated for SSC CGL style prep. Needs{" "}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-900">GROQ_API_KEY</code> or{" "}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-900">OPENAI_API_KEY</code>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void generate()}
            className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {busy ? "Generating…" : "Generate for this topic"}
          </button>
          <Link
            href={mockHref}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-xs font-medium dark:border-zinc-700"
          >
            Mock test →
          </Link>
        </div>
      </div>

      {err ? <p className="text-sm text-red-600 dark:text-red-400">{err}</p> : null}

      {pack ? (
        <div className="space-y-4 text-sm">
          <section>
            <h4 className="font-medium text-zinc-900 dark:text-zinc-50">{pack.topicName}</h4>
            <div className="mt-2 whitespace-pre-wrap rounded-lg bg-zinc-50 p-3 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
              {pack.importantNotes}
            </div>
          </section>
          <section>
            <h4 className="font-medium text-zinc-900 dark:text-zinc-50">Formulas</h4>
            <div className="mt-2 whitespace-pre-wrap rounded-lg bg-zinc-50 p-3 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200">
              {pack.formulas}
            </div>
          </section>
          {pack.shortcuts.length ? (
            <section>
              <h4 className="font-medium text-zinc-900 dark:text-zinc-50">Shortcuts / PYQ patterns</h4>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-zinc-700 dark:text-zinc-300">
                {pack.shortcuts.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-zinc-500">
          Click generate to get condensed notes and a formula sheet. Then jump to timed MCQs from the
          mock page.
        </p>
      )}
    </div>
  );
}

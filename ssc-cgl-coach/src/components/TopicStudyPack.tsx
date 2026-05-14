"use client";

import Link from "next/link";
import { useState } from "react";
import { markdownToHtml } from "@/lib/markdown";

type Pack = {
  topicName: string;
  importantNotes: string;
  formulas: string;
  shortcuts: string[];
};

export function TopicStudyPack(props: {
  topicDisplayName: string;
  topicSlug: string;
}) {
  const { topicDisplayName, topicSlug } = props;
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pack, setPack] = useState<Pack | null>(null);
  const [tab, setTab] = useState<"notes" | "formulas" | "shortcuts">("notes");

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
        shortcuts: Array.isArray((data as Pack).shortcuts) ? (data as Pack).shortcuts : [],
      });
      setTab("notes");
    } catch {
      setErr("Network error");
      setPack(null);
    } finally {
      setBusy(false);
    }
  }

  const mockHref = `/mock-tests?q=${encodeURIComponent(topicDisplayName)}&slug=${encodeURIComponent(topicSlug)}`;

  return (
    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
            Notes & Formulas
          </h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            AI-generated SSC CGL revision material. Needs{" "}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">GEMINI_API_KEY</code>,{" "}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">GROQ_API_KEY</code>, or{" "}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">OPENAI_API_KEY</code>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void generate()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-zinc-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-60 dark:bg-amber-500 dark:text-zinc-900"
          >
            {busy ? (
              <><span className="h-3 w-3 animate-spin rounded-full border border-white/40 border-t-white dark:border-zinc-900/40 dark:border-t-zinc-900" /> Generating…</>
            ) : "✨ Generate notes"}
          </button>
          <Link
            href={mockHref}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
          >
            🧪 Mock test →
          </Link>
        </div>
      </div>

      {err ? (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <span>⚠️</span> {err}
        </div>
      ) : null}

      {pack ? (
        <div className="space-y-3">
          {/* Tab bar */}
          <div className="flex gap-1 rounded-xl border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-900">
            {([
              { id: "notes", label: "📋 Notes" },
              { id: "formulas", label: "🔢 Formulas" },
              { id: "shortcuts", label: `⚡ Shortcuts (${pack.shortcuts.length})` },
            ] as const).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition ${
                  tab === t.id
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                    : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "notes" && (
            <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-900/40">
              <div className="prose-study" dangerouslySetInnerHTML={{ __html: markdownToHtml(pack.importantNotes) }} />
            </div>
          )}
          {tab === "formulas" && (
            <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-900/40">
              <div className="prose-study" dangerouslySetInnerHTML={{ __html: markdownToHtml(pack.formulas) }} />
            </div>
          )}
          {tab === "shortcuts" && (
            <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-900/40">
              {pack.shortcuts.length ? (
                <ul className="space-y-2">
                  {pack.shortcuts.map((s, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                        {i + 1}
                      </span>
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">{s}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-zinc-500">No shortcuts for this topic.</p>
              )}
            </div>
          )}
        </div>
      ) : !busy ? (
        <p className="text-xs text-zinc-500">
          Click &quot;Generate notes&quot; to get condensed revision material and a formula sheet.
        </p>
      ) : null}
    </div>
  );
}

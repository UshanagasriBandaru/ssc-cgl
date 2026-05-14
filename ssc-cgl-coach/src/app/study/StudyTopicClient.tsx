"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { slugifyTopic } from "@/lib/slug";
import { markdownToHtml } from "@/lib/markdown";

type Pack = {
  topicName: string;
  importantNotes: string;
  formulas: string;
  shortcuts: string[];
};

const QUICK_TOPICS = [
  "Percentage", "Ratio & Proportion", "Profit & Loss", "Time & Work",
  "Speed, Time & Distance", "Algebra", "Trigonometry", "Indian Polity",
  "Reading Comprehension", "Cloze Test", "Current Affairs", "Seating Arrangement",
];

export function StudyTopicClient() {
  const searchParams = useSearchParams();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pack, setPack] = useState<Pack | null>(null);
  const [activeTab, setActiveTab] = useState<"notes" | "formulas" | "shortcuts">("notes");

  useEffect(() => {
    queueMicrotask(() => {
      const q = searchParams.get("q");
      if (q) {
        setInput(q);
        // Auto-generate if query param present
        void generateFor(q);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generateFor(name: string) {
    if (!name.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/topic/study-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicName: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(typeof data.error === "string" ? data.error : "Generation failed");
        if (data.hint) setErr((prev) => `${prev ?? ""} — ${data.hint}`);
        setPack(null);
        return;
      }
      setPack({
        topicName: (data as Pack).topicName ?? name,
        importantNotes: (data as Pack).importantNotes,
        formulas: (data as Pack).formulas,
        shortcuts: Array.isArray((data as Pack).shortcuts) ? (data as Pack).shortcuts : [],
      });
      setActiveTab("notes");
    } catch {
      setErr("Network error — check your connection.");
      setPack(null);
    } finally {
      setBusy(false);
    }
  }

  async function generate() {
    await generateFor(input);
  }

  const topicLabel = (pack?.topicName ?? input).trim() || "topic";
  const slug = slugifyTopic(topicLabel);
  const mockHref = `/mock-tests?q=${encodeURIComponent(topicLabel)}&slug=${encodeURIComponent(slug)}`;

  return (
    <div className="space-y-6">
      {/* Input card */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
        <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Enter any SSC CGL topic
        </label>
        <div className="mt-2 flex gap-2">
          <input
            className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm text-zinc-900 placeholder-zinc-400 shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50 dark:placeholder-zinc-600 dark:focus:ring-zinc-800"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void generate()}
            placeholder="e.g. Percentage, Time & Work, Indian Polity, Cloze Test…"
          />
          <button
            type="button"
            disabled={busy || !input.trim()}
            onClick={() => void generate()}
            className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 disabled:opacity-50 dark:bg-amber-500 dark:text-zinc-900 dark:hover:bg-amber-400"
          >
            {busy ? (
              <>
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white dark:border-zinc-900/40 dark:border-t-zinc-900" />
                Generating…
              </>
            ) : (
              "Get notes →"
            )}
          </button>
        </div>

        {/* Quick topic chips */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {QUICK_TOPICS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { setInput(t); void generateFor(t); }}
              className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs text-zinc-600 hover:border-zinc-400 hover:bg-white hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              {t}
            </button>
          ))}
        </div>

        {err ? (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            <span className="mt-0.5 shrink-0">⚠️</span>
            <span>{err}</span>
          </div>
        ) : null}
      </div>

      {/* Results */}
      {pack ? (
        <div className="space-y-4">
          {/* Topic header */}
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
            <div>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{pack.topicName}</h2>
              <p className="mt-0.5 text-sm text-zinc-500">AI-generated SSC CGL revision material</p>
            </div>
            <Link
              href={mockHref}
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 dark:bg-amber-500 dark:text-zinc-900 dark:hover:bg-amber-400"
            >
              🧪 Take mock test
            </Link>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 rounded-xl border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-900">
            {([
              { id: "notes", label: "📋 Notes", count: null },
              { id: "formulas", label: "🔢 Formulas", count: null },
              { id: "shortcuts", label: "⚡ Shortcuts", count: pack.shortcuts.length },
            ] as const).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  activeTab === tab.id
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                    : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                {tab.label}
                {tab.count !== null && tab.count > 0 && (
                  <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-xs font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === "notes" && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
              <div
                className="prose-study"
                dangerouslySetInnerHTML={{ __html: markdownToHtml(pack.importantNotes) }}
              />
            </div>
          )}

          {activeTab === "formulas" && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
              <div
                className="prose-study"
                dangerouslySetInnerHTML={{ __html: markdownToHtml(pack.formulas) }}
              />
            </div>
          )}

          {activeTab === "shortcuts" && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
              {pack.shortcuts.length ? (
                <ul className="space-y-3">
                  {pack.shortcuts.map((s, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                        {i + 1}
                      </span>
                      <span className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{s}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-zinc-500">No shortcuts returned for this topic.</p>
              )}
            </div>
          )}

          {/* CTA footer */}
          <div className="flex flex-wrap gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
            <Link
              href={mockHref}
              className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-amber-500 dark:text-zinc-900 dark:hover:bg-amber-400"
            >
              🧪 Mock test on {pack.topicName}
            </Link>
            <Link
              href="/mistakes"
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
            >
              📝 Log a mistake
            </Link>
            <button
              type="button"
              onClick={() => { setPack(null); setInput(""); }}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
            >
              🔄 New topic
            </button>
          </div>
        </div>
      ) : !busy ? (
        <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50/50 p-10 text-center dark:border-zinc-700 dark:bg-zinc-900/20">
          <div className="text-4xl">📚</div>
          <p className="mt-3 font-medium text-zinc-700 dark:text-zinc-300">Pick a topic above to get started</p>
          <p className="mt-1 text-sm text-zinc-500">Notes, formulas, and shortcuts will appear here</p>
        </div>
      ) : null}
    </div>
  );
}

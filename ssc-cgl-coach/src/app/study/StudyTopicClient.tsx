"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { slugifyTopic } from "@/lib/slug";
import { markdownToHtml } from "@/lib/markdown";

// ── Types ─────────────────────────────────────────────────────────────────────
type Pack = { topicName: string; importantNotes: string; formulas: string; shortcuts: string[] };
type SavedPack = Pack & { savedAt: string };
type AnalysisResult = {
  title: string;
  keyPoints: string[];
  formulas: string[];
  sscRelevance: string;
  shortcuts: string[];
  potentialQuestions: string[];
};

// ── localStorage helpers ──────────────────────────────────────────────────────
const LS_PACKS_KEY = "ssc-coach-study-packs-v1";

function loadSavedPacks(): SavedPack[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(LS_PACKS_KEY) ?? "[]") as SavedPack[]; }
  catch { return []; }
}
function persistPack(pack: Pack): SavedPack[] {
  const rest = loadSavedPacks().filter((p) => p.topicName.toLowerCase() !== pack.topicName.toLowerCase());
  const next: SavedPack[] = [{ ...pack, savedAt: new Date().toISOString() }, ...rest].slice(0, 20);
  localStorage.setItem(LS_PACKS_KEY, JSON.stringify(next));
  return next;
}
function removeSavedPack(topicName: string): SavedPack[] {
  const next = loadSavedPacks().filter((p) => p.topicName !== topicName);
  localStorage.setItem(LS_PACKS_KEY, JSON.stringify(next));
  return next;
}

// ── Constants ─────────────────────────────────────────────────────────────────
const QUICK_TOPICS = [
  "Percentage","Ratio & Proportion","Profit & Loss","Time & Work",
  "Speed, Time & Distance","Algebra","Trigonometry","Indian Polity",
  "Reading Comprehension","Cloze Test","Current Affairs","Seating Arrangement",
];

type MainTab = "generate" | "source" | "saved";
type PackTab = "notes" | "formulas" | "shortcuts";

// ── Component ─────────────────────────────────────────────────────────────────
export function StudyTopicClient() {
  const searchParams = useSearchParams();

  // main tabs
  const [mainTab, setMainTab] = useState<MainTab>("generate");

  // generate tab
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [pack, setPack] = useState<Pack | null>(null);
  const [packTab, setPackTab] = useState<PackTab>("notes");
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // source tab
  const [sourceText, setSourceText] = useState("");
  const [sourceHint, setSourceHint] = useState("");
  const [sourceBusy, setSourceBusy] = useState(false);
  const [sourceErr, setSourceErr] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analysisTab, setAnalysisTab] = useState<"points" | "formulas" | "shortcuts" | "questions">("points");

  // saved tab
  const [savedPacks, setSavedPacks] = useState<SavedPack[]>([]);
  const [viewingPack, setViewingPack] = useState<SavedPack | null>(null);

  useEffect(() => {
    setSavedPacks(loadSavedPacks());
    queueMicrotask(() => {
      const q = searchParams.get("q");
      if (q) { setInput(q); void generateFor(q); }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Generate notes ──────────────────────────────────────────────────────────
  async function generateFor(name: string) {
    if (!name.trim()) return;
    setBusy(true); setErr(null); setSaveMsg(null);
    try {
      const res = await fetch("/api/topic/study-pack", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicName: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr((typeof data.error === "string" ? data.error : "Generation failed") + (data.hint ? ` — ${data.hint}` : ""));
        setPack(null); return;
      }
      const p: Pack = {
        topicName: (data as Pack).topicName ?? name,
        importantNotes: (data as Pack).importantNotes,
        formulas: (data as Pack).formulas,
        shortcuts: Array.isArray((data as Pack).shortcuts) ? (data as Pack).shortcuts : [],
      };
      setPack(p); setPackTab("notes");
    } catch { setErr("Network error — check your connection."); setPack(null); }
    finally { setBusy(false); }
  }

  function handleSavePack() {
    if (!pack) return;
    const next = persistPack(pack);
    setSavedPacks(next);
    setSaveMsg("✅ Saved to browser storage!");
    setTimeout(() => setSaveMsg(null), 3000);
  }

  // ── Analyse source ──────────────────────────────────────────────────────────
  async function analyseSource() {
    if (!sourceText.trim()) return;
    setSourceBusy(true); setSourceErr(null); setAnalysis(null);
    try {
      const res = await fetch("/api/topic/analyse-source", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceText: sourceText.trim(), topicHint: sourceHint.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSourceErr((typeof data.error === "string" ? data.error : "Analysis failed") + (data.hint ? ` — ${data.hint}` : ""));
        return;
      }
      setAnalysis(data as AnalysisResult);
      setAnalysisTab("points");
    } catch { setSourceErr("Network error."); }
    finally { setSourceBusy(false); }
  }

  const topicLabel = (pack?.topicName ?? input).trim() || "topic";
  const slug = slugifyTopic(topicLabel);
  const mockHref = `/mock-tests?q=${encodeURIComponent(topicLabel)}&slug=${encodeURIComponent(slug)}`;

  return (
    <div className="space-y-5">
      {/* Main tab bar */}
      <div className="flex gap-1 rounded-2xl border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-900">
        {([
          { id: "generate", label: "🎯 Generate notes" },
          { id: "source",   label: "📄 Analyse source" },
          { id: "saved",    label: `💾 Saved (${savedPacks.length})` },
        ] as const).map((t) => (
          <button key={t.id} type="button" onClick={() => setMainTab(t.id)}
            className={`flex flex-1 items-center justify-center rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
              mainTab === t.id
                ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── GENERATE TAB ── */}
      {mainTab === "generate" && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
            <label className="block text-sm font-semibold text-zinc-900 dark:text-zinc-50">Enter any SSC CGL topic</label>
            <div className="mt-2 flex gap-2">
              <input
                className="flex-1 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm placeholder-zinc-400 shadow-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void generateFor(input)}
                placeholder="e.g. Percentage, Time & Work, Indian Polity, Cloze Test…"
              />
              <button type="button" disabled={busy || !input.trim()} onClick={() => void generateFor(input)}
                className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:bg-zinc-800 dark:bg-amber-500 dark:text-zinc-900 dark:hover:bg-amber-400">
                {busy ? <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />Generating…</> : "Get notes →"}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {QUICK_TOPICS.map((t) => (
                <button key={t} type="button" onClick={() => { setInput(t); void generateFor(t); }}
                  className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs text-zinc-600 hover:border-zinc-400 hover:bg-white hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-100">
                  {t}
                </button>
              ))}
            </div>
            {err && (
              <div className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                <span>⚠️</span><span>{err}</span>
              </div>
            )}
          </div>

          {pack ? (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
                <div>
                  <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-50">{pack.topicName}</h2>
                  <p className="mt-0.5 text-sm text-zinc-500">AI-generated SSC CGL revision material</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={handleSavePack}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                    💾 Save
                  </button>
                  <Link href={mockHref}
                    className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-amber-500 dark:text-zinc-900 dark:hover:bg-amber-400">
                    🧪 Mock test
                  </Link>
                </div>
              </div>
              {saveMsg && <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{saveMsg}</p>}

              {/* Pack tabs */}
              <div className="flex gap-1 rounded-xl border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-900">
                {([
                  { id: "notes", label: "📋 Notes" },
                  { id: "formulas", label: "🔢 Formulas" },
                  { id: "shortcuts", label: `⚡ Shortcuts (${pack.shortcuts.length})` },
                ] as const).map((t) => (
                  <button key={t.id} type="button" onClick={() => setPackTab(t.id)}
                    className={`flex flex-1 items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition ${
                      packTab === t.id ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50" : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>

              {packTab === "notes" && (
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
                  <div className="prose-study" dangerouslySetInnerHTML={{ __html: markdownToHtml(pack.importantNotes) }} />
                </div>
              )}
              {packTab === "formulas" && (
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
                  <div className="prose-study" dangerouslySetInnerHTML={{ __html: markdownToHtml(pack.formulas) }} />
                </div>
              )}
              {packTab === "shortcuts" && (
                <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
                  {pack.shortcuts.length ? (
                    <ul className="space-y-3">
                      {pack.shortcuts.map((s, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">{i + 1}</span>
                          <span className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{s}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-sm text-zinc-500">No shortcuts for this topic.</p>}
                </div>
              )}

              {/* Footer */}
              <div className="flex flex-wrap gap-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                <Link href={mockHref} className="inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-amber-500 dark:text-zinc-900">
                  🧪 Mock test on {pack.topicName}
                </Link>
                <button type="button" onClick={() => setMainTab("source")}
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
                  📄 Analyse a source
                </button>
                <button type="button" onClick={() => { setPack(null); setInput(""); }}
                  className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
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
      )}

      {/* ── SOURCE ANALYSIS TAB ── */}
      {mainTab === "source" && (
        <div className="space-y-5">
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">📄 Analyse any source material</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Paste text from any book, article, PDF, or notes. AI extracts key points, formulas, shortcuts, and likely SSC MCQ questions from it.
            </p>

            <div className="mt-4 space-y-3">
              <label className="block text-sm">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">Topic hint (optional)</span>
                <input
                  className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                  value={sourceHint} onChange={(e) => setSourceHint(e.target.value)}
                  placeholder="e.g. Indian Polity, Percentage, Ancient History…"
                />
              </label>

              <label className="block text-sm">
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  Source text
                  <span className="ml-2 font-normal text-zinc-400">({sourceText.length} / 15,000 chars)</span>
                </span>
                <textarea
                  className="mt-1.5 min-h-[200px] w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
                  value={sourceText} onChange={(e) => setSourceText(e.target.value)}
                  placeholder="Paste any text here — Lucent excerpt, NCERT paragraph, newspaper article, your own notes, PYQ solution…"
                />
              </label>

              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={sourceBusy || sourceText.trim().length < 30} onClick={() => void analyseSource()}
                  className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 hover:bg-zinc-800 dark:bg-amber-500 dark:text-zinc-900 dark:hover:bg-amber-400">
                  {sourceBusy ? <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white dark:border-zinc-900/40 dark:border-t-zinc-900" />Analysing…</> : "🔍 Extract key points"}
                </button>
                {sourceText && (
                  <button type="button" onClick={() => { setSourceText(""); setAnalysis(null); setSourceErr(null); }}
                    className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400">
                    Clear
                  </button>
                )}
              </div>

              {sourceErr && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                  <span>⚠️</span><span>{sourceErr}</span>
                </div>
              )}
            </div>
          </div>

          {analysis && (
            <div className="space-y-4">
              {/* Analysis header */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-bold text-emerald-900 dark:text-emerald-100">{analysis.title}</h3>
                    <p className="mt-1 text-sm text-emerald-700 dark:text-emerald-300">{analysis.sscRelevance}</p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                    {analysis.keyPoints.length} key points
                  </span>
                </div>
              </div>

              {/* Analysis tabs */}
              <div className="flex gap-1 rounded-xl border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-900">
                {([
                  { id: "points",    label: `⭐ Key Points (${analysis.keyPoints.length})` },
                  { id: "formulas",  label: `🔢 Formulas (${analysis.formulas.length})` },
                  { id: "shortcuts", label: `⚡ Shortcuts (${analysis.shortcuts.length})` },
                  { id: "questions", label: `❓ MCQ Stems (${analysis.potentialQuestions.length})` },
                ] as const).map((t) => (
                  <button key={t.id} type="button" onClick={() => setAnalysisTab(t.id)}
                    className={`flex flex-1 items-center justify-center rounded-lg px-2 py-2 text-xs font-semibold transition sm:text-sm ${
                      analysisTab === t.id ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50" : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"
                    }`}>
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
                {analysisTab === "points" && (
                  <ul className="space-y-3">
                    {analysis.keyPoints.map((p, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">{i + 1}</span>
                        <span className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{p}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {analysisTab === "formulas" && (
                  analysis.formulas.length ? (
                    <ul className="space-y-3">
                      {analysis.formulas.map((f, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">{i + 1}</span>
                          <code className="text-sm text-zinc-800 dark:text-zinc-200">{f}</code>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-sm text-zinc-500">No formulas found in this source.</p>
                )}
                {analysisTab === "shortcuts" && (
                  analysis.shortcuts.length ? (
                    <ul className="space-y-3">
                      {analysis.shortcuts.map((s, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">{i + 1}</span>
                          <span className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">{s}</span>
                        </li>
                      ))}
                    </ul>
                  ) : <p className="text-sm text-zinc-500">No shortcuts derivable from this source.</p>
                )}
                {analysisTab === "questions" && (
                  <div className="space-y-3">
                    <p className="text-xs text-zinc-500">Likely MCQ question stems based on this content — use these to test yourself.</p>
                    <ol className="space-y-2">
                      {analysis.potentialQuestions.map((q, i) => (
                        <li key={i} className="flex items-start gap-3 rounded-lg border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-xs font-bold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">{i + 1}</span>
                          <span className="text-sm text-zinc-800 dark:text-zinc-200">{q}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

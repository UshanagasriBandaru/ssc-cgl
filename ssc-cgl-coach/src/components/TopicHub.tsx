"use client";

import { useCallback, useEffect, useState } from "react";
import { TopicStudyPack } from "@/components/TopicStudyPack";
import { markdownToHtml } from "@/lib/markdown";

type NoteRow = {
  id: string;
  topic_slug: string;
  title: string | null;
  body: string;
  source_url: string | null;
  created_at: string;
};

type YoutubeArtifacts = {
  shortNotes: string;
  importantPoints: string[];
  formulaSheet: string;
  flashcards: { front: string; back: string }[];
  quiz: {
    question: string;
    options: string[];
    answerIndex: number;
    explanation: string;
  }[];
};

const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

const TABS = [
  { id: "youtube", label: "YouTube → AI", icon: "▶️" },
  { id: "upload",  label: "Upload / Paste", icon: "📄" },
  { id: "chat",    label: "Notebook Chat",  icon: "💬" },
  { id: "notes",   label: "Notes Vault",    icon: "🗂️" },
] as const;

type TabId = typeof TABS[number]["id"];

export function TopicHub(props: { slug: string; name: string }) {
  const { slug, name } = props;

  const [tab, setTab] = useState<TabId>("youtube");

  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [saveYoutubeNote, setSaveYoutubeNote] = useState(true);
  const [ytBusy, setYtBusy] = useState(false);
  const [ytErr, setYtErr] = useState<string | null>(null);
  const [artifacts, setArtifacts] = useState<YoutubeArtifacts | null>(null);

  const [pasteTitle, setPasteTitle] = useState("Pasted notes");
  const [pasteBody, setPasteBody] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pasteBusy, setPasteBusy] = useState(false);
  const [pasteMsg, setPasteMsg] = useState<string | null>(null);

  const [chatQ, setChatQ] = useState("");
  const [chatOut, setChatOut] = useState<string | null>(null);
  const [chatBusy, setChatBusy] = useState(false);

  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [noteBody, setNoteBody] = useState("");
  const [noteTitle, setNoteTitle] = useState("My note");
  const [noteSaving, setNoteSaving] = useState(false);

  const refreshNotes = useCallback(async () => {
    if (!supabaseConfigured) return;
    const res = await fetch(`/api/notes?topic_slug=${encodeURIComponent(slug)}`);
    if (!res.ok) return;
    const data = (await res.json()) as { notes?: NoteRow[] };
    setNotes(data.notes ?? []);
  }, [slug]);

  useEffect(() => {
    queueMicrotask(() => { void refreshNotes(); });
  }, [refreshNotes]);

  async function runYoutube() {
    setYtBusy(true);
    setYtErr(null);
    setArtifacts(null);
    try {
      const res = await fetch("/api/youtube/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: youtubeUrl, topicSlug: slug, topicName: name, saveNote: saveYoutubeNote }),
      });
      const data = await res.json();
      if (!res.ok) { setYtErr(typeof data.error === "string" ? data.error : "Failed"); return; }
      setArtifacts(data.artifacts as YoutubeArtifacts);
      await refreshNotes();
    } catch { setYtErr("Network error"); }
    finally { setYtBusy(false); }
  }

  async function ingestPaste() {
    setPasteBusy(true);
    setPasteMsg(null);
    try {
      const res = await fetch("/api/ingest/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicSlug: slug, title: pasteTitle, text: pasteBody }),
      });
      const data = await res.json();
      if (!res.ok) { setPasteMsg(typeof data.error === "string" ? data.error : "Paste ingest failed"); return; }
      setPasteBody("");
      setPasteMsg(`✅ Indexed ${data.chunks ?? 0} chunks for Notebook chat.`);
    } finally { setPasteBusy(false); }
  }

  async function ingestPdf(file: File | null) {
    if (!file) return;
    setPdfBusy(true);
    setPasteMsg(null);
    try {
      const fd = new FormData();
      fd.set("file", file); fd.set("topicSlug", slug); fd.set("filename", file.name);
      const res = await fetch("/api/ingest/pdf", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) { setPasteMsg(typeof data.error === "string" ? data.error : "PDF ingest failed"); return; }
      setPasteMsg(`✅ Indexed ${data.chunks ?? 0} chunks from ${file.name}.`);
    } finally { setPdfBusy(false); }
  }

  async function runChat() {
    setChatBusy(true);
    setChatOut(null);
    try {
      const res = await fetch("/api/chat/rag", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topicSlug: slug, question: chatQ }),
      });
      const data = await res.json();
      setChatOut(typeof data.answer === "string" ? data.answer : JSON.stringify(data));
    } catch { setChatOut("Network error"); }
    finally { setChatBusy(false); }
  }

  async function saveManualNote() {
    setNoteSaving(true);
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topicSlug: slug, title: noteTitle, body: noteBody }),
    });
    const data = await res.json();
    setNoteSaving(false);
    if (!res.ok) { alert(typeof data.error === "string" ? data.error : "Save failed"); return; }
    setNoteBody("");
    await refreshNotes();
  }

  function speakSummary(text: string) {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const u = new SpeechSynthesisUtterance(text.slice(0, 9000));
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  }

  return (
    <div className="space-y-5">
      {/* Always-visible study pack */}
      <TopicStudyPack topicDisplayName={name} topicSlug={slug} />

      {/* Supabase gate */}
      {!supabaseConfigured ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-900/60 dark:bg-amber-950/30">
          <div className="flex items-start gap-3">
            <span className="text-2xl">🔒</span>
            <div>
              <p className="font-semibold text-amber-900 dark:text-amber-200">Cloud features locked</p>
              <p className="mt-1 text-sm text-amber-800 dark:text-amber-300">
                Add{" "}
                <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
                and{" "}
                <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
                to unlock YouTube → AI notes, PDF/paste upload, Notebook chat, and cloud notes vault.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Tab bar */}
          <div className="flex gap-1 rounded-2xl border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-900">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-semibold transition sm:text-sm ${
                  tab === t.id
                    ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                    : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
                }`}
              >
                <span className="hidden sm:inline">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          {/* YouTube tab */}
          {tab === "youtube" && (
            <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
              <div>
                <label className="block text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                  YouTube URL
                </label>
                <input
                  className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>
              <label className="flex cursor-pointer items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={saveYoutubeNote}
                  onChange={(e) => setSaveYoutubeNote(e.target.checked)}
                  className="h-4 w-4 rounded"
                />
                <span className="text-zinc-700 dark:text-zinc-300">Save condensed notes to vault automatically</span>
              </label>
              <button
                type="button"
                disabled={ytBusy || !youtubeUrl.trim()}
                onClick={() => void runYoutube()}
                className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 dark:bg-amber-500 dark:text-zinc-900"
              >
                {ytBusy ? (
                  <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white dark:border-zinc-900/40 dark:border-t-zinc-900" /> Processing…</>
                ) : "▶️ Fetch transcript + generate"}
              </button>
              {ytErr && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                  <span>⚠️</span> {ytErr}
                </div>
              )}

              {artifacts && (
                <div className="space-y-5 border-t border-zinc-100 pt-4 dark:border-zinc-800">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                    onClick={() => speakSummary(`${artifacts.shortNotes}\n${artifacts.importantPoints.join(". ")}`)}
                  >
                    🔊 Listen (browser TTS)
                  </button>

                  {[
                    { title: "📋 Short notes", content: <div className="prose-study" dangerouslySetInnerHTML={{ __html: markdownToHtml(artifacts.shortNotes) }} /> },
                    { title: "⭐ Important points", content: (
                      <ul className="space-y-1.5">
                        {artifacts.importantPoints.map((p, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                            <span className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                            {p}
                          </li>
                        ))}
                      </ul>
                    )},
                    { title: "🔢 Formula sheet", content: <div className="prose-study" dangerouslySetInnerHTML={{ __html: markdownToHtml(artifacts.formulaSheet) }} /> },
                  ].map((s) => (
                    <section key={s.title}>
                      <h3 className="mb-2 font-semibold text-zinc-900 dark:text-zinc-50">{s.title}</h3>
                      <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-900/40">{s.content}</div>
                    </section>
                  ))}

                  <section>
                    <h3 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-50">🃏 Flashcards</h3>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {artifacts.flashcards.map((f, i) => (
                        <div key={i} className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-700 dark:bg-zinc-900/40">
                          <p className="text-xs font-semibold text-zinc-500">Q</p>
                          <p className="mt-0.5 text-sm font-medium text-zinc-900 dark:text-zinc-50">{f.front}</p>
                          <p className="mt-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">A</p>
                          <p className="mt-0.5 text-sm text-zinc-700 dark:text-zinc-300">{f.back}</p>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h3 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-50">🧪 Quick quiz</h3>
                    <ol className="space-y-4">
                      {artifacts.quiz.map((q, idx) => (
                        <li key={idx} className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
                          <p className="font-medium text-zinc-900 dark:text-zinc-50">{idx + 1}. {q.question}</p>
                          <ul className="mt-2 space-y-1">
                            {q.options.map((op, j) => (
                              <li key={j} className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm ${
                                j === q.answerIndex
                                  ? "bg-emerald-50 font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                                  : "text-zinc-600 dark:text-zinc-400"
                              }`}>
                                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                                  j === q.answerIndex ? "bg-emerald-500 text-white" : "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400"
                                }`}>
                                  {String.fromCharCode(65 + j)}
                                </span>
                                {op}
                              </li>
                            ))}
                          </ul>
                          <p className="mt-2 text-xs text-zinc-500">{q.explanation}</p>
                        </li>
                      ))}
                    </ol>
                  </section>
                </div>
              )}
            </div>
          )}

          {/* Upload tab */}
          {tab === "upload" && (
            <div className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
              {/* PDF */}
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">📄 PDF upload</h3>
                <p className="mt-0.5 text-xs text-zinc-500">
                  Server extracts text (scanned PDFs won&apos;t work). Small files only on free hosts.
                </p>
                <label className={`mt-3 flex cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed p-4 transition ${pdfBusy ? "opacity-60" : "border-zinc-300 hover:border-zinc-400 dark:border-zinc-700"}`}>
                  <span className="text-2xl">📁</span>
                  <div>
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      {pdfBusy ? "Uploading…" : "Click to choose PDF"}
                    </p>
                    <p className="text-xs text-zinc-400">PDF files only</p>
                  </div>
                  <input
                    type="file"
                    accept="application/pdf"
                    className="sr-only"
                    onChange={(e) => void ingestPdf(e.target.files?.[0] ?? null)}
                    disabled={pdfBusy}
                  />
                </label>
              </div>

              <div className="border-t border-zinc-100 dark:border-zinc-800" />

              {/* Paste */}
              <div>
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">📋 Paste transcript / notes</h3>
                <input
                  className="mt-3 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
                  value={pasteTitle}
                  onChange={(e) => setPasteTitle(e.target.value)}
                  placeholder="Title for this content"
                />
                <textarea
                  className="mt-2 min-h-[140px] w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
                  value={pasteBody}
                  onChange={(e) => setPasteBody(e.target.value)}
                  placeholder="Paste PYQ solutions, Lucent excerpts, rough notes…"
                />
                <button
                  type="button"
                  disabled={pasteBusy || !pasteBody.trim()}
                  onClick={() => void ingestPaste()}
                  className="mt-2 inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 dark:bg-amber-500 dark:text-zinc-900"
                >
                  {pasteBusy ? (
                    <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white dark:border-zinc-900/40 dark:border-t-zinc-900" /> Indexing…</>
                  ) : "Index for Notebook chat"}
                </button>
              </div>

              {pasteMsg && (
                <div className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
                  pasteMsg.startsWith("✅")
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                }`}>
                  {pasteMsg}
                </div>
              )}
            </div>
          )}

          {/* Chat tab */}
          {tab === "chat" && (
            <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
              <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/30">
                <span>ℹ️</span>
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  Answers are grounded only on PDFs/text you indexed for <strong>{name}</strong> on this account. Upload content first from the Upload tab.
                </p>
              </div>
              <textarea
                className="min-h-[100px] w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
                value={chatQ}
                onChange={(e) => setChatQ(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && e.ctrlKey) void runChat(); }}
                placeholder={`Ask: "Summarise the traps in ${name}" · Ctrl+Enter to send`}
              />
              <button
                type="button"
                disabled={chatBusy || !chatQ.trim()}
                onClick={() => void runChat()}
                className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 dark:bg-amber-500 dark:text-zinc-900"
              >
                {chatBusy ? (
                  <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white dark:border-zinc-900/40 dark:border-t-zinc-900" /> Thinking…</>
                ) : "💬 Ask"}
              </button>
              {chatOut && (
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-900/40">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">Answer</p>
                  <article className="prose-study whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">
                    {chatOut}
                  </article>
                </div>
              )}
            </div>
          )}

          {/* Notes tab */}
          {tab === "notes" && (
            <div className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
              <div className="space-y-3">
                <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">Add note</h3>
                <input
                  className="w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="Note title"
                />
                <textarea
                  className="min-h-[100px] w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950"
                  value={noteBody}
                  onChange={(e) => setNoteBody(e.target.value)}
                  placeholder="Your notes, formulas, mnemonics…"
                />
                <button
                  type="button"
                  disabled={noteSaving || !noteBody.trim()}
                  onClick={() => void saveManualNote()}
                  className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-60 dark:bg-amber-500 dark:text-zinc-900"
                >
                  {noteSaving ? "Saving…" : "💾 Save note"}
                </button>
              </div>

              {notes.length > 0 && (
                <div className="border-t border-zinc-100 pt-4 dark:border-zinc-800">
                  <h3 className="mb-3 font-semibold text-zinc-900 dark:text-zinc-50">Saved notes ({notes.length})</h3>
                  <ul className="space-y-3">
                    {notes.map((n) => (
                      <li key={n.id} className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-zinc-900 dark:text-zinc-50">{n.title ?? "Untitled"}</p>
                          <span className="shrink-0 text-xs text-zinc-400">
                            {new Date(n.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                          {n.body.slice(0, 800)}{n.body.length > 800 ? "…" : ""}
                        </p>
                        {n.source_url && (
                          <a className="mt-2 inline-block text-xs text-blue-600 underline dark:text-blue-400" href={n.source_url} target="_blank" rel="noopener noreferrer">
                            Source ↗
                          </a>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

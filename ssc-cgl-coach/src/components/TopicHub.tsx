"use client";

import { useCallback, useEffect, useState } from "react";
import { TopicStudyPack } from "@/components/TopicStudyPack";

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

export function TopicHub(props: { slug: string; name: string }) {
  const { slug, name } = props;

  const [tab, setTab] = useState<
    "youtube" | "upload" | "chat" | "notes"
  >("youtube");

  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [saveYoutubeNote, setSaveYoutubeNote] = useState(true);
  const [ytBusy, setYtBusy] = useState(false);
  const [ytErr, setYtErr] = useState<string | null>(null);
  const [artifacts, setArtifacts] = useState<YoutubeArtifacts | null>(null);

  const [pasteTitle, setPasteTitle] = useState("Pasted notes");
  const [pasteBody, setPasteBody] = useState("");
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pasteBusy, setPasteBusy] = useState(false);

  const [chatQ, setChatQ] = useState("");
  const [chatOut, setChatOut] = useState<string | null>(null);
  const [chatBusy, setChatBusy] = useState(false);

  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [noteBody, setNoteBody] = useState("");
  const [noteTitle, setNoteTitle] = useState("My note");

  const refreshNotes = useCallback(async () => {
    if (!supabaseConfigured) return;
    const res = await fetch(`/api/notes?topic_slug=${encodeURIComponent(slug)}`);
    if (!res.ok) return;
    const data = (await res.json()) as { notes?: NoteRow[] };
    setNotes(data.notes ?? []);
  }, [slug]);

  useEffect(() => {
    queueMicrotask(() => {
      void refreshNotes();
    });
  }, [refreshNotes]);

  async function runYoutube() {
    setYtBusy(true);
    setYtErr(null);
    setArtifacts(null);
    try {
      const res = await fetch("/api/youtube/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: youtubeUrl,
          topicSlug: slug,
          topicName: name,
          saveNote: saveYoutubeNote,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setYtErr(typeof data.error === "string" ? data.error : "Failed");
        return;
      }
      setArtifacts(data.artifacts as YoutubeArtifacts);
      await refreshNotes();
    } catch {
      setYtErr("Network error");
    } finally {
      setYtBusy(false);
    }
  }

  async function ingestPaste() {
    setPasteBusy(true);
    try {
      const res = await fetch("/api/ingest/text", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topicSlug: slug,
          title: pasteTitle,
          text: pasteBody,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(typeof data.error === "string" ? data.error : "Paste ingest failed");
        return;
      }
      setPasteBody("");
      alert(`Indexed ${data.chunks ?? 0} chunks for RAG.`);
    } finally {
      setPasteBusy(false);
    }
  }

  async function ingestPdf(file: File | null) {
    if (!file) return;
    setPdfBusy(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("topicSlug", slug);
      fd.set("filename", file.name);
      const res = await fetch("/api/ingest/pdf", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        alert(typeof data.error === "string" ? data.error : "PDF ingest failed");
        return;
      }
      alert(`Indexed ${data.chunks ?? 0} chunks.`);
    } finally {
      setPdfBusy(false);
    }
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
    } catch {
      setChatOut("Network error");
    } finally {
      setChatBusy(false);
    }
  }

  async function saveManualNote() {
    const res = await fetch("/api/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topicSlug: slug,
        title: noteTitle,
        body: noteBody,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      alert(typeof data.error === "string" ? data.error : "Save failed");
      return;
    }
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
    <div className="space-y-4">
      <TopicStudyPack topicDisplayName={name} topicSlug={slug} />

      {!supabaseConfigured ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
          Configure{" "}
          <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
          and{" "}
          <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
          plus run <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">supabase/schema.sql</code>{" "}
          to unlock YouTube → notes, uploads, RAG chat, and cloud notes vault.
        </div>
      ) : null}

      {!supabaseConfigured ? null : (
        <>
      <div className="flex flex-wrap gap-2 text-sm">
        {(
          [
            ["youtube", "YouTube → AI"],
            ["upload", "Upload / paste"],
            ["chat", "Notebook chat"],
            ["notes", "Notes vault"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-full px-3 py-1 ${
              tab === id
                ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                : "border border-zinc-300 dark:border-zinc-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "youtube" ? (
        <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <label className="block text-sm">
            <span className="font-medium text-zinc-800 dark:text-zinc-200">YouTube URL</span>
            <input
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
            />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={saveYoutubeNote}
              onChange={(e) => setSaveYoutubeNote(e.target.checked)}
            />
            Save condensed notes to vault automatically
          </label>
          <button
            type="button"
            disabled={ytBusy}
            onClick={() => void runYoutube()}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {ytBusy ? "Working…" : "Fetch transcript + generate"}
          </button>
          {ytErr ? <p className="text-sm text-red-600">{ytErr}</p> : null}
          {artifacts ? (
            <div className="space-y-4 pt-2 text-sm">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded-lg border border-zinc-300 px-3 py-1 text-xs dark:border-zinc-700"
                  onClick={() =>
                    speakSummary(
                      `${artifacts.shortNotes}\n${artifacts.importantPoints.join(". ")}`,
                    )
                  }
                >
                  Listen (free browser TTS)
                </button>
              </div>
              <section>
                <h3 className="font-medium text-zinc-900 dark:text-zinc-50">Short notes</h3>
                <p className="mt-1 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
                  {artifacts.shortNotes}
                </p>
              </section>
              <section>
                <h3 className="font-medium text-zinc-900 dark:text-zinc-50">Important points</h3>
                <ul className="mt-1 list-disc pl-5">
                  {artifacts.importantPoints.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </section>
              <section>
                <h3 className="font-medium text-zinc-900 dark:text-zinc-50">Formula sheet</h3>
                <p className="mt-1 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
                  {artifacts.formulaSheet}
                </p>
              </section>
              <section>
                <h3 className="font-medium text-zinc-900 dark:text-zinc-50">Flashcards</h3>
                <ul className="mt-1 space-y-2">
                  {artifacts.flashcards.map((f, i) => (
                    <li key={i} className="rounded-lg bg-zinc-50 p-2 dark:bg-zinc-900">
                      <div className="font-medium">Q: {f.front}</div>
                      <div className="text-zinc-600 dark:text-zinc-400">A: {f.back}</div>
                    </li>
                  ))}
                </ul>
              </section>
              <section>
                <h3 className="font-medium text-zinc-900 dark:text-zinc-50">Quiz</h3>
                <ol className="mt-2 list-decimal space-y-3 pl-5">
                  {artifacts.quiz.map((q, idx) => (
                    <li key={idx}>
                      <p>{q.question}</p>
                      <ul className="mt-1 list-none space-y-1">
                        {q.options.map((op, j) => (
                          <li key={j}>
                            {j === q.answerIndex ? (
                              <strong>
                                {String.fromCharCode(65 + j)}. {op}
                              </strong>
                            ) : (
                              <span className="text-zinc-600 dark:text-zinc-400">
                                {String.fromCharCode(65 + j)}. {op}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                      <p className="mt-1 text-xs text-zinc-500">{q.explanation}</p>
                    </li>
                  ))}
                </ol>
              </section>
            </div>
          ) : null}
        </div>
      ) : null}

      {tab === "upload" ? (
        <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div>
            <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">PDF upload</h3>
            <p className="text-xs text-zinc-500">
              Server extracts text (scanned PDFs won&apos;t work well). Small files only on free
              hosts.
            </p>
            <input
              type="file"
              accept="application/pdf"
              className="mt-2 block text-sm"
              onChange={(e) => void ingestPdf(e.target.files?.[0] ?? null)}
              disabled={pdfBusy}
            />
          </div>
          <div>
            <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Paste transcript / notes</h3>
            <input
              className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              value={pasteTitle}
              onChange={(e) => setPasteTitle(e.target.value)}
              placeholder="Title"
            />
            <textarea
              className="mt-2 min-h-[140px] w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              value={pasteBody}
              onChange={(e) => setPasteBody(e.target.value)}
              placeholder="Paste PYQ solution, Lucent excerpt, your rough notes…"
            />
            <button
              type="button"
              disabled={pasteBusy}
              onClick={() => void ingestPaste()}
              className="mt-2 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
            >
              {pasteBusy ? "Indexing…" : "Index for Notebook chat"}
            </button>
          </div>
        </div>
      ) : null}

      {tab === "chat" ? (
        <div className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <p className="text-xs text-zinc-500">
            Answers only from PDFs/text you indexed for this topic on this device/account.
          </p>
          <textarea
            className="min-h-[90px] w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            value={chatQ}
            onChange={(e) => setChatQ(e.target.value)}
            placeholder={`Ask: “Summarize traps in ${name}”`}
          />
          <button
            type="button"
            disabled={chatBusy}
            onClick={() => void runChat()}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {chatBusy ? "Thinking…" : "Ask"}
          </button>
          {chatOut ? (
            <article className="whitespace-pre-wrap text-sm text-zinc-800 dark:text-zinc-200">
              {chatOut}
            </article>
          ) : null}
        </div>
      ) : null}

      {tab === "notes" ? (
        <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Add note</h3>
            <input
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
            />
            <textarea
              className="min-h-[100px] w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
            />
            <button
              type="button"
              onClick={() => void saveManualNote()}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            >
              Save note
            </button>
          </div>
          <div>
            <h3 className="text-sm font-medium text-zinc-900 dark:text-zinc-50">Saved</h3>
            <ul className="mt-2 space-y-3">
              {notes.map((n) => (
                <li key={n.id} className="rounded-lg border border-zinc-100 p-3 dark:border-zinc-800">
                  <div className="text-xs text-zinc-500">{new Date(n.created_at).toLocaleString()}</div>
                  <div className="font-medium">{n.title ?? "Untitled"}</div>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-700 dark:text-zinc-300">
                    {n.body.slice(0, 800)}
                    {n.body.length > 800 ? "…" : ""}
                  </p>
                  {n.source_url ? (
                    <a className="text-xs text-sky-700 underline" href={n.source_url}>
                      Source
                    </a>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
        </>
      )}
    </div>
  );
}

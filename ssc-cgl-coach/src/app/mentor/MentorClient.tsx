"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { KEYS, readStore, writeStore, getLanguagePref, setLanguagePref, type LanguagePref } from "@/lib/datastore";
import { computeStreak } from "@/lib/streak";
import { parseTopicLinks } from "@/lib/bilingual";
import type { ChatMessage } from "@/lib/ai";
import type { MockSession } from "@/lib/performance";
import type { DailyActivity } from "@/lib/streak";

type Message = { role: "user" | "assistant"; content: string };

const SHORTCUTS = [
  { label: "📅 What should I study today?", prompt: "What should I study today based on my performance?" },
  { label: "🎯 Predict my SSC CGL score", prompt: "Predict my SSC CGL score based on my current performance data." },
  { label: "📋 Generate today's study session", prompt: "Generate a structured study session for today with time blocks." },
  { label: "⏱️ Can I complete in 60 days?", prompt: "Can I complete the SSC CGL syllabus in 60 days? Give me a realistic assessment." },
  { label: "🔥 What are my weakest topics?", prompt: "What are my weakest topics and what should I do about them?" },
];

function renderContent(text: string) {
  const parts = parseTopicLinks(text);
  return parts.map((part, i) =>
    part.type === "link" ? (
      <Link key={i} href={`/topics/${part.slug}`} className="font-semibold text-amber-600 underline dark:text-amber-400">
        {part.content}
      </Link>
    ) : (
      <span key={i}>{part.content}</span>
    ),
  );
}

export function MentorClient() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lang, setLang] = useState<LanguagePref>("english");
  const [canSpeak, setCanSpeak] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLang(getLanguagePref());
    setCanSpeak(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleLangChange(newLang: LanguagePref) {
    setLang(newLang);
    setLanguagePref(newLang);
  }

  function speak(text: string) {
    if (!canSpeak) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.slice(0, 5000));
    if (lang === "telugu-english") {
      const voices = window.speechSynthesis.getVoices();
      const teluguVoice = voices.find((v) => v.lang.startsWith("te"));
      if (teluguVoice) u.voice = teluguVoice;
    }
    window.speechSynthesis.speak(u);
  }

  async function send(messageText?: string) {
    const text = (messageText ?? input).trim();
    if (!text || busy) return;
    setInput("");
    setError(null);

    const userMsg: Message = { role: "user", content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setBusy(true);

    // Build context from localStorage
    const sessions = readStore<MockSession[]>(KEYS.MOCK_SESSIONS, []);
    const habitLog = readStore<DailyActivity[]>(KEYS.HABIT_LOG, []);
    const streak = computeStreak(habitLog);
    const recentScores = sessions.slice(-10).map((s) => s.score);
    const examDate = readStore<string | null>("ssc-coach-v2-exam-date", null);

    // Convert to ChatMessage format for history
    const history: ChatMessage[] = newMessages.slice(-20).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const res = await fetch("/api/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          history: history.slice(0, -1), // exclude the current message (sent separately)
          lang,
          performances: [],
          streak,
          examDate,
          recentScores,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Mentor unavailable");
        setMessages(newMessages); // keep user message
        return;
      }
      const reply = typeof data.reply === "string" ? data.reply : "Sorry, I couldn't generate a response.";
      setMessages([...newMessages, { role: "assistant", content: reply }]);
    } catch {
      setError("Network error — check your connection.");
      setMessages(newMessages);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Language:</span>
          <div className="flex gap-1 rounded-lg border border-zinc-200 bg-zinc-100 p-0.5 dark:border-zinc-700 dark:bg-zinc-800">
            {(["english", "telugu-english"] as LanguagePref[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => handleLangChange(l)}
                className={`rounded-md px-3 py-1 text-xs font-semibold transition ${lang === l ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50" : "text-zinc-500 hover:text-zinc-700 dark:text-zinc-400"}`}
              >
                {l === "english" ? "🇬🇧 English" : "🇮🇳 Telugu+English"}
              </button>
            ))}
          </div>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => setMessages([])}
            className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
          >
            Clear chat
          </button>
        )}
      </div>

      {/* Shortcuts */}
      {messages.length === 0 && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
          <p className="mb-3 text-sm font-semibold text-zinc-700 dark:text-zinc-300">Quick questions:</p>
          <div className="flex flex-wrap gap-2">
            {SHORTCUTS.map((s) => (
              <button
                key={s.prompt}
                type="button"
                onClick={() => void send(s.prompt)}
                className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 hover:border-zinc-400 hover:bg-white dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700"
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Chat messages */}
      {messages.length > 0 && (
        <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm ${m.role === "user" ? "bg-zinc-900 text-white dark:bg-amber-500 dark:text-zinc-900" : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"}`}>
                {m.role === "user" ? "U" : "🤖"}
              </div>
              <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${m.role === "user" ? "bg-zinc-900 text-white dark:bg-amber-500 dark:text-zinc-900" : "bg-zinc-50 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200"}`}>
                <p className="whitespace-pre-wrap">{renderContent(m.content)}</p>
                {m.role === "assistant" && canSpeak && (
                  <button
                    type="button"
                    onClick={() => speak(m.content)}
                    className="mt-2 text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                  >
                    🔊 Listen
                  </button>
                )}
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-sm text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">🤖</div>
              <div className="flex items-center gap-1.5 rounded-2xl bg-zinc-50 px-4 py-3 dark:bg-zinc-800">
                <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:0ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:150ms]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-zinc-400 [animation-delay:300ms]" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
          <span>⚠️</span> {error}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <textarea
          className="flex-1 resize-none rounded-2xl border border-zinc-300 bg-white px-4 py-3 text-sm shadow-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
          placeholder={lang === "telugu-english" ? "మీ doubt అడగండి… (Shift+Enter for new line)" : "Ask your mentor… (Shift+Enter for new line)"}
          disabled={busy}
        />
        <button
          type="button"
          disabled={busy || !input.trim()}
          onClick={() => void send()}
          className="self-end rounded-2xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50 hover:bg-zinc-800 dark:bg-amber-500 dark:text-zinc-900 dark:hover:bg-amber-400"
        >
          {busy ? "…" : "Send"}
        </button>
      </div>
      <p className="text-center text-xs text-zinc-400">Powered by {lang === "telugu-english" ? "Telugu+English AI" : "AI"} · Conversation history: last 10 exchanges</p>
    </div>
  );
}

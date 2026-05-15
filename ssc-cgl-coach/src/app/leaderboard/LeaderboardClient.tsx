"use client";

import { useEffect, useState } from "react";
import { KEYS, readStore, writeStore } from "@/lib/datastore";

type Entry = { rank: number; displayName: string; correctAnswers30d: number; isMe: boolean };
type CacheData = { entries: Entry[]; myRank: number | null; fetchedAt: number };

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function LeaderboardClient() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [optedIn, setOptedIn] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function fetchLeaderboard(force = false) {
    const cached = readStore<CacheData | null>(KEYS.LEADERBOARD_CACHE, null);
    if (!force && cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
      setEntries(cached.entries);
      setMyRank(cached.myRank);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/leaderboard");
      const data = await res.json();
      if (res.ok) {
        setEntries(data.entries ?? []);
        setMyRank(data.myRank ?? null);
        writeStore(KEYS.LEADERBOARD_CACHE, { entries: data.entries, myRank: data.myRank, fetchedAt: Date.now() });
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }

  useEffect(() => { void fetchLeaderboard(); }, []);

  async function handleOptIn() {
    if (!displayName.trim()) { setMsg("Enter a display name first."); return; }
    setSaving(true);
    setMsg(null);
    const res = await fetch("/api/leaderboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optIn: true, displayName: displayName.trim() }),
    });
    setSaving(false);
    if (res.ok) {
      setOptedIn(true);
      setMsg("✅ You're on the leaderboard!");
      void fetchLeaderboard(true);
    } else {
      const d = await res.json();
      setMsg(typeof d.error === "string" ? d.error : "Failed to opt in");
    }
  }

  async function handleOptOut() {
    setSaving(true);
    const res = await fetch("/api/leaderboard", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optIn: false }),
    });
    setSaving(false);
    if (res.ok) {
      setOptedIn(false);
      setMsg("Removed from leaderboard.");
      void fetchLeaderboard(true);
    }
  }

  const rankEmoji = (rank: number) => rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;

  return (
    <div className="space-y-5">
      {/* Opt-in card */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
        <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Join the leaderboard</h2>
        <p className="mt-1 text-sm text-zinc-500">Only your display name and correct answer count are shared. No personal data.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <input
            className="flex-1 rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-50"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your display name (max 30 chars)"
            maxLength={30}
          />
          <button type="button" disabled={saving} onClick={() => void handleOptIn()}
            className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-amber-500 dark:text-zinc-900">
            {saving ? "Saving…" : "Join"}
          </button>
          {optedIn && (
            <button type="button" disabled={saving} onClick={() => void handleOptOut()}
              className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400">
              Leave
            </button>
          )}
        </div>
        {msg && <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{msg}</p>}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4 dark:border-zinc-800">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Top 50 — last 30 days</h2>
          <button type="button" onClick={() => void fetchLeaderboard(true)}
            className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200">
            Refresh
          </button>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-zinc-500">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" /> Loading…
            </div>
          ) : entries.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">No entries yet. Be the first to join!</p>
          ) : (
            <ul className="space-y-2">
              {entries.map((e) => (
                <li key={e.rank} className={`flex items-center justify-between rounded-xl px-4 py-3 ${e.isMe ? "border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30" : "bg-zinc-50 dark:bg-zinc-800/40"}`}>
                  <div className="flex items-center gap-3">
                    <span className="w-8 text-center font-bold text-zinc-700 dark:text-zinc-300">{rankEmoji(e.rank)}</span>
                    <span className={`font-medium ${e.isMe ? "text-amber-900 dark:text-amber-200" : "text-zinc-800 dark:text-zinc-200"}`}>
                      {e.displayName} {e.isMe && <span className="text-xs text-amber-600 dark:text-amber-400">(you)</span>}
                    </span>
                  </div>
                  <span className="font-mono font-bold text-zinc-700 dark:text-zinc-300">{e.correctAnswers30d}</span>
                </li>
              ))}
              {myRank && !entries.find((e) => e.isMe) && (
                <li className="flex items-center justify-between rounded-xl border border-dashed border-zinc-300 px-4 py-3 dark:border-zinc-700">
                  <div className="flex items-center gap-3">
                    <span className="w-8 text-center font-bold text-zinc-500">#{myRank}</span>
                    <span className="text-sm text-zinc-500">You (outside top 50)</span>
                  </div>
                </li>
              )}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

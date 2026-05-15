"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthControls } from "@/components/AuthControls";
import { useEffect, useState } from "react";
import { KEYS, readStore, getLanguagePref, setLanguagePref, type LanguagePref } from "@/lib/datastore";
import { computeStreak } from "@/lib/streak";
import type { DailyActivity } from "@/lib/streak";

const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

const links = [
  { href: "/dashboard",    label: "Dashboard",  icon: "🏠" },
  { href: "/topics",       label: "Topics",     icon: "📚" },
  { href: "/study",        label: "Study",      icon: "🎯" },
  { href: "/planner",      label: "Planner",    icon: "📅" },
  { href: "/mock-tests",   label: "Mocks",      icon: "🧪" },
  { href: "/mentor",       label: "Mentor",     icon: "🤖" },
  { href: "/mistakes",     label: "Mistakes",   icon: "📝" },
  { href: "/revision",     label: "Revision",   icon: "🔁" },
  { href: "/analytics",    label: "Analytics",  icon: "📊" },
  { href: "/streaks",      label: "Streaks",    icon: "🔥" },
  { href: "/focus",        label: "Focus",      icon: "⏱️" },
];

export function SiteNav() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [streak, setStreak] = useState(0);
  const [lang, setLang] = useState<LanguagePref>("english");

  useEffect(() => {
    const log = readStore<DailyActivity[]>(KEYS.HABIT_LOG, []);
    setStreak(computeStreak(log));
    setLang(getLanguagePref());
  }, []);

  function toggleLang() {
    const next: LanguagePref = lang === "english" ? "telugu-english" : "english";
    setLang(next);
    setLanguagePref(next);
  }

  // Hide nav on focus page
  if (pathname === "/focus") return null;

  const allLinks = supabaseConfigured
    ? [...links, { href: "/leaderboard", label: "Leaderboard", icon: "🏆" }]
    : links;

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white/90 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/90">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500 text-sm font-black text-white shadow-sm">S</span>
          <span className="hidden sm:inline">SSC CGL Coach</span>
          <span className="sm:hidden">SSC Coach</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-0.5 text-sm xl:flex">
          {allLinks.map((l) => {
            const active = pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href));
            return (
              <Link key={l.href} href={l.href}
                className={`rounded-lg px-2.5 py-1.5 font-medium transition ${active ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50" : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"}`}>
                {l.label}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Streak badge */}
          {streak > 0 && (
            <Link href="/streaks" className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              🔥 {streak}
            </Link>
          )}
          {/* Language toggle */}
          <button type="button" onClick={toggleLang}
            className="hidden rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 sm:block"
            title={lang === "english" ? "Switch to Telugu+English" : "Switch to English"}>
            {lang === "english" ? "🇬🇧" : "🇮🇳"}
          </button>
          <AuthControls />
          {/* Mobile menu button */}
          <button type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-900 xl:hidden"
            onClick={() => setMobileOpen((v) => !v)} aria-label="Toggle menu">
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && (
        <div className="border-t border-zinc-200 bg-white px-4 pb-4 dark:border-zinc-800 dark:bg-zinc-950 xl:hidden">
          <nav className="mt-3 grid grid-cols-3 gap-1">
            {allLinks.map((l) => {
              const active = pathname === l.href || (l.href !== "/" && pathname.startsWith(l.href));
              return (
                <Link key={l.href} href={l.href} onClick={() => setMobileOpen(false)}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${active ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50" : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-400 dark:hover:bg-zinc-900"}`}>
                  <span>{l.icon}</span>{l.label}
                </Link>
              );
            })}
          </nav>
          <div className="mt-3 flex items-center gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
            <button type="button" onClick={toggleLang}
              className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
              {lang === "english" ? "🇬🇧 English" : "🇮🇳 Telugu+English"}
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

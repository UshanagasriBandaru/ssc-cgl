import Link from "next/link";
import { Suspense } from "react";
import { LeaderboardClient } from "./LeaderboardClient";

const supabaseConfigured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

export default function LeaderboardPage() {
  if (!supabaseConfigured) {
    return (
      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">← Home</Link>
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
          <div className="text-4xl">🔒</div>
          <h2 className="mt-3 font-semibold text-zinc-900 dark:text-zinc-50">Leaderboard requires Supabase</h2>
          <p className="mt-2 text-sm text-zinc-500">Add <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">NEXT_PUBLIC_SUPABASE_URL</code> and <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> to enable the leaderboard.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10">
      <div>
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">← Home</Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Leaderboard</h1>
        <p className="mt-2 max-w-2xl text-zinc-500 dark:text-zinc-400">
          Top students by correct answers in the last 30 days. Opt-in to compete — only your display name and score are shared.
        </p>
      </div>
      <Suspense fallback={<div className="flex items-center gap-2 text-sm text-zinc-500"><span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />Loading…</div>}>
        <LeaderboardClient />
      </Suspense>
    </main>
  );
}

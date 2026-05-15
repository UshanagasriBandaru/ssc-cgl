import Link from "next/link";
import { Suspense } from "react";
import { StreaksClient } from "./StreaksClient";

export default function StreaksPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10">
      <div>
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">← Home</Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Streaks & Habits</h1>
        <p className="mt-2 max-w-2xl text-zinc-500 dark:text-zinc-400">
          Track your daily study consistency, set targets, and build a preparation habit that sticks.
        </p>
      </div>
      <Suspense fallback={<div className="flex items-center gap-2 text-sm text-zinc-500"><span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />Loading…</div>}>
        <StreaksClient />
      </Suspense>
    </main>
  );
}

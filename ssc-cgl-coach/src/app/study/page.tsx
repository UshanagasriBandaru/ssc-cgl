import Link from "next/link";
import { Suspense } from "react";
import { StudyTopicClient } from "./StudyTopicClient";

export default function StudyPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10">
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          ← Home
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Study any topic
        </h1>
        <p className="mt-2 max-w-2xl text-base text-zinc-600 dark:text-zinc-400">
          Type any SSC CGL topic — get dense revision notes, a formula sheet, and shortcuts.
          Then jump straight to a 10-question AI mock test.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {["Percentage", "Time & Work", "Indian Polity", "Cloze Test", "Trigonometry"].map((t) => (
            <Link
              key={t}
              href={`/study?q=${encodeURIComponent(t)}`}
              className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs font-medium text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
            >
              {t}
            </Link>
          ))}
        </div>
      </div>
      <Suspense fallback={
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-300 border-t-zinc-600" />
          Loading…
        </div>
      }>
        <StudyTopicClient />
      </Suspense>
    </main>
  );
}

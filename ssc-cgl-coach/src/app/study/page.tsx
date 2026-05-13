import Link from "next/link";
import { Suspense } from "react";
import { StudyTopicClient } from "./StudyTopicClient";

export default function StudyPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10">
      <div>
        <Link href="/topics" className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
          ← Topics
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Any topic — notes & formulas</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Enter any SSC-relevant topic name. The app returns important revision notes and a formula
          sheet, then you can open a topic-wise mock test. Works as soon as{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-900">GROQ_API_KEY</code> or{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-900">OPENAI_API_KEY</code> is set in{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-900">.env.local</code>.
        </p>
      </div>
      <Suspense
        fallback={<p className="text-sm text-zinc-500">Loading…</p>}
      >
        <StudyTopicClient />
      </Suspense>
    </main>
  );
}

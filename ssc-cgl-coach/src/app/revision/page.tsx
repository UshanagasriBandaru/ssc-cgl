import Link from "next/link";
import { RevisionClient } from "./RevisionClient";

export default function RevisionPage() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-4 py-10">
      <div>
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
          ← Home
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Smart Revision
        </h1>
        <p className="mt-2 max-w-2xl text-zinc-500 dark:text-zinc-400">
          Cards from your mistake notebook that are due for review today. Reveal the answer, then snooze to reschedule.
        </p>
      </div>
      <RevisionClient />
    </main>
  );
}

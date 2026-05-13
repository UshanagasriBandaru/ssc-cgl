import { RevisionClient } from "./RevisionClient";

export default function RevisionPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Smart revision</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Surfaces mistake notebook cards whose review date is due — bridge until full spaced repetition +
          analytics land.
        </p>
      </div>
      <RevisionClient />
    </main>
  );
}

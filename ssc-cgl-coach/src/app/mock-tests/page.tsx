import { Suspense } from "react";
import { MockTestsClient } from "./MockTestsClient";

export default function MockTestsPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">AI mock tests</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Syllabus topics or <strong className="font-medium text-zinc-800 dark:text-zinc-200">any</strong>{" "}
          topic you type. Mistake notebook sync needs Supabase + sign-in.
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
        <MockTestsClient />
      </Suspense>
    </main>
  );
}

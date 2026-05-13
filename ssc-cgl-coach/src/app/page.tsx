import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-4 py-12">
      <section className="space-y-4">
        <p className="text-sm font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400">
          Phase 1 MVP
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-4xl">
          AI personal coach for SSC CGL
        </h1>
        <p className="max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          Start with a syllabus dashboard, topic hubs, and an{" "}
          <strong className="font-medium text-zinc-800 dark:text-zinc-200">
            adaptive time-based planner
          </strong>{" "}
          that respects PYQ weightage and optional survival mode for short horizons.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/study"
            className="rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            Any topic — notes & mocks
          </Link>
          <Link
            href="/planner"
            className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
          >
            Adaptive planner
          </Link>
          <Link
            href="/topics"
            className="rounded-lg border border-zinc-300 px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-100 dark:hover:bg-zinc-900"
          >
            Browse topics
          </Link>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-zinc-50/80 p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
        <h2 className="font-medium text-zinc-900 dark:text-zinc-50">When can you use it?</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
          <li>
            <strong className="font-medium text-zinc-800 dark:text-zinc-200">Right away:</strong> run{" "}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-900">npm run dev</code>, add{" "}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-900">GROQ_API_KEY</code> or{" "}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-900">OPENAI_API_KEY</code> in{" "}
            <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-900">.env.local</code> — then open{" "}
            <Link href="/study" className="underline">
              Any topic
            </Link>{" "}
            for notes + formulas + mocks (no Supabase required).
          </li>
          <li>
            <strong className="font-medium text-zinc-800 dark:text-zinc-200">Cloud sync:</strong> add
            Supabase keys + run <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-900">schema.sql</code>,{" "}
            then sign in for vault, mistakes, and uploads.
          </li>
        </ul>
      </section>

      <section className="grid gap-6 rounded-xl border border-zinc-200 bg-zinc-50/80 p-6 dark:border-zinc-800 dark:bg-zinc-900/40 sm:grid-cols-3">
        <div>
          <h2 className="font-medium text-zinc-900 dark:text-zinc-50">Any topic</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Type a topic name → important notes, formulas, shortcuts, then topic-wise AI mocks.
          </p>
        </div>
        <div>
          <h2 className="font-medium text-zinc-900 dark:text-zinc-50">Planner</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            Adaptive schedules work without AI keys using built-in mock plans; keys make them richer.
          </p>
        </div>
        <div>
          <h2 className="font-medium text-zinc-900 dark:text-zinc-50">Notebook</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
            YouTube → AI summaries and PDF paste need Supabase for saving + RAG chat.
          </p>
        </div>
      </section>
    </main>
  );
}

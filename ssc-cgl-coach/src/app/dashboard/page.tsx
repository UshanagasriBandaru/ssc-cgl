import Link from "next/link";
import {
  SSC_CGL_TOPICS,
  SUBJECT_LABELS,
  type SubjectId,
} from "@/lib/ssc-topics";

function countBySubject(subject: SubjectId) {
  return SSC_CGL_TOPICS.filter((t) => t.subject === subject).length;
}

export default function DashboardPage() {
  const subjects: SubjectId[] = ["quant", "reasoning", "english", "gk"];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Study dashboard
        </h1>
        <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">
          High-level map of Tier-I subjects. Topic cards link to per-topic hubs (videos, notes,
          PYQs, quizzes come in later phases).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {subjects.map((id) => (
          <Link
            key={id}
            href={`/topics?subject=${id}`}
            className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600"
          >
            <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
              {SUBJECT_LABELS[id]}
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              {countBySubject(id)} seeded topics · Open filtered list
            </p>
          </Link>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link
          href="/mock-tests"
          className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm shadow-sm hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600"
        >
          <span className="font-medium text-zinc-900 dark:text-zinc-50">AI mocks</span>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">Generate MCQs per topic.</p>
        </Link>
        <Link
          href="/mistakes"
          className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm shadow-sm hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600"
        >
          <span className="font-medium text-zinc-900 dark:text-zinc-50">Mistake notebook</span>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">Tag traps + AI explain.</p>
        </Link>
        <Link
          href="/revision"
          className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm shadow-sm hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600"
        >
          <span className="font-medium text-zinc-900 dark:text-zinc-50">Revision queue</span>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">Cards due today.</p>
        </Link>
        <Link
          href="/login"
          className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm shadow-sm hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600"
        >
          <span className="font-medium text-zinc-900 dark:text-zinc-50">Supabase login</span>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400">
            Needed for cloud vault + RAG.
          </p>
        </Link>
      </div>
    </main>
  );
}

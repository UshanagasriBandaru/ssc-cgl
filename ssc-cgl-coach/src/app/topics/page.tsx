import Link from "next/link";
import {
  SSC_CGL_TOPICS,
  SUBJECT_LABELS,
  type SubjectId,
} from "@/lib/ssc-topics";

type Props = { searchParams?: Promise<{ subject?: string }> };

const weightageConfig: Record<string, { label: string; color: string }> = {
  highest: { label: "Highest PYQ", color: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300" },
  high:    { label: "High PYQ",    color: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300" },
  medium:  { label: "Medium PYQ",  color: "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300" },
  low:     { label: "Low PYQ",     color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
};

const subjectIcons: Record<SubjectId, string> = {
  quant: "📐", reasoning: "🧩", english: "📖", gk: "🌍",
};

export default async function TopicsPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const filter = sp.subject as SubjectId | undefined;
  const list =
    filter && SUBJECT_LABELS[filter]
      ? SSC_CGL_TOPICS.filter((t) => t.subject === filter)
      : SSC_CGL_TOPICS;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-10">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
            ← Home
          </Link>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Topic Hub
          </h1>
          <p className="mt-2 max-w-2xl text-zinc-500 dark:text-zinc-400">
            {list.length} topic{list.length !== 1 ? "s" : ""} · Click any to get notes, formulas, and a mock test.
          </p>
        </div>
        <Link
          href="/study"
          className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-amber-500 dark:text-zinc-900 dark:hover:bg-amber-400"
        >
          🎯 Study any topic
        </Link>
      </div>

      {/* Subject filter */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/topics"
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            !filter
              ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
              : "border border-zinc-300 text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-100"
          }`}
        >
          All ({SSC_CGL_TOPICS.length})
        </Link>
        {(Object.keys(SUBJECT_LABELS) as SubjectId[]).map((id) => {
          const count = SSC_CGL_TOPICS.filter((t) => t.subject === id).length;
          return (
            <Link
              key={id}
              href={`/topics?subject=${id}`}
              className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition ${
                filter === id
                  ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                  : "border border-zinc-300 text-zinc-600 hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-100"
              }`}
            >
              {subjectIcons[id]} {SUBJECT_LABELS[id]} ({count})
            </Link>
          );
        })}
      </div>

      {/* Topic grid */}
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((t) => {
          const wc = weightageConfig[t.weightage] ?? weightageConfig.medium;
          return (
            <li key={t.slug}>
              <Link
                href={`/topics/${t.slug}`}
                className="group flex flex-col rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xl">{subjectIcons[t.subject]}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${wc.color}`}>
                    {wc.label}
                  </span>
                </div>
                <span className="mt-3 font-semibold text-zinc-900 dark:text-zinc-50">{t.name}</span>
                <span className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  {SUBJECT_LABELS[t.subject]}
                </span>
                {t.pyqNote ? (
                  <p className="mt-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">{t.pyqNote}</p>
                ) : null}
                <span className="mt-3 text-xs font-semibold text-zinc-400 group-hover:text-zinc-700 dark:group-hover:text-zinc-200">
                  Notes + mock →
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

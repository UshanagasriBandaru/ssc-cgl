import Link from "next/link";
import {
  SSC_CGL_TOPICS,
  SUBJECT_LABELS,
  type SubjectId,
} from "@/lib/ssc-topics";

type Props = { searchParams?: Promise<{ subject?: string }> };

function badge(w: string) {
  const colors: Record<string, string> = {
    highest:
      "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-100",
    high: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100",
    medium:
      "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-100",
    low: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
  };
  return colors[w] ?? colors.medium;
}

export default async function TopicsPage({ searchParams }: Props) {
  const sp = (await searchParams) ?? {};
  const filter = sp.subject as SubjectId | undefined;
  const list =
    filter && SUBJECT_LABELS[filter]
      ? SSC_CGL_TOPICS.filter((t) => t.subject === filter)
      : SSC_CGL_TOPICS;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
            Topic hub
          </h1>
          <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">
            Each topic will host videos, notes, PYQs, and AI chat grounded on your uploads (
            <Link href="/planner" className="underline decoration-zinc-400 underline-offset-2">
              planner
            </Link>{" "}
            lives separately).
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link
            href="/topics"
            className={`rounded-full px-3 py-1 ${!filter ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "border border-zinc-300 dark:border-zinc-700"}`}
          >
            All
          </Link>
          {(Object.keys(SUBJECT_LABELS) as SubjectId[]).map((id) => (
            <Link
              key={id}
              href={`/topics?subject=${id}`}
              className={`rounded-full px-3 py-1 ${filter === id ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "border border-zinc-300 dark:border-zinc-700"}`}
            >
              {SUBJECT_LABELS[id]}
            </Link>
          ))}
        </div>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {list.map((t) => (
          <li key={t.slug}>
            <Link
              href={`/topics/${t.slug}`}
              className="flex flex-col rounded-xl border border-zinc-200 bg-white p-4 hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-600"
            >
              <span className="font-medium text-zinc-900 dark:text-zinc-50">{t.name}</span>
              <span className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                {SUBJECT_LABELS[t.subject]}
              </span>
              <div className="mt-3 flex flex-wrap gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${badge(t.weightage)}`}
                >
                  {t.weightage} PYQ weight
                </span>
                {t.pyqNote ? (
                  <span className="text-xs text-zinc-500 dark:text-zinc-400">{t.pyqNote}</span>
                ) : null}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { TopicHub } from "@/components/TopicHub";
import { SSC_CGL_TOPICS, SUBJECT_LABELS, topicBySlug } from "@/lib/ssc-topics";

type Props = { params: Promise<{ slug: string }> };

const weightageConfig: Record<string, { label: string; color: string }> = {
  highest: { label: "Highest PYQ weight", color: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300" },
  high:    { label: "High PYQ weight",    color: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300" },
  medium:  { label: "Medium PYQ weight",  color: "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300" },
  low:     { label: "Low PYQ weight",     color: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
};

const subjectIcons: Record<string, string> = {
  quant: "📐", reasoning: "🧩", english: "📖", gk: "🌍",
};

export function generateStaticParams() {
  return SSC_CGL_TOPICS.map((t) => ({ slug: t.slug }));
}

export default async function TopicDetailPage({ params }: Props) {
  const { slug } = await params;
  const topic = topicBySlug(slug);
  if (!topic) notFound();

  const wc = weightageConfig[topic.weightage] ?? weightageConfig.medium;
  const mockHref = `/mock-tests?q=${encodeURIComponent(topic.name)}&slug=${encodeURIComponent(topic.slug)}`;
  const studyHref = `/study?q=${encodeURIComponent(topic.name)}`;

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-zinc-500">
        <Link href="/topics" className="hover:text-zinc-800 dark:hover:text-zinc-200">Topics</Link>
        <span>›</span>
        <span className="text-zinc-700 dark:text-zinc-300">{topic.name}</span>
      </div>

      {/* Topic header */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-3xl">{subjectIcons[topic.subject]}</span>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                {topic.name}
              </h1>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="text-sm text-zinc-500">{SUBJECT_LABELS[topic.subject]}</span>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${wc.color}`}>
                {wc.label}
              </span>
            </div>
            {topic.pyqNote ? (
              <p className="mt-2 max-w-xl text-sm text-zinc-600 dark:text-zinc-400">
                💡 {topic.pyqNote}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={studyHref}
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 dark:bg-amber-500 dark:text-zinc-900 dark:hover:bg-amber-400"
            >
              📋 Get notes
            </Link>
            <Link
              href={mockHref}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
            >
              🧪 Mock test
            </Link>
          </div>
        </div>
      </div>

      {/* Topic workspace */}
      <TopicHub slug={topic.slug} name={topic.name} />

      {/* Related */}
      <div className="rounded-xl border border-dashed border-zinc-300 p-5 dark:border-zinc-700">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Want notes for a sub-topic or related concept? Try{" "}
          <Link href="/study" className="font-semibold text-zinc-800 underline dark:text-zinc-200">
            Study any topic
          </Link>{" "}
          and type your phrase — you get notes, formulas, and mocks for anything.
        </p>
      </div>
    </main>
  );
}

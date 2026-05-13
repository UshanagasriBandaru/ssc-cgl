import Link from "next/link";
import { notFound } from "next/navigation";
import { TopicHub } from "@/components/TopicHub";
import { SSC_CGL_TOPICS, SUBJECT_LABELS, topicBySlug } from "@/lib/ssc-topics";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return SSC_CGL_TOPICS.map((t) => ({ slug: t.slug }));
}

export default async function TopicDetailPage({ params }: Props) {
  const { slug } = await params;
  const topic = topicBySlug(slug);
  if (!topic) notFound();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-10">
      <div className="space-y-2">
        <Link
          href="/topics"
          className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
        >
          ← All topics
        </Link>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">{topic.name}</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {SUBJECT_LABELS[topic.subject]} · PYQ weight:{" "}
          <span className="font-medium text-zinc-800 dark:text-zinc-200">{topic.weightage}</span>
        </p>
        {topic.pyqNote ? (
          <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">{topic.pyqNote}</p>
        ) : null}
      </div>

      <section className="rounded-xl border border-zinc-200 bg-zinc-50/50 p-5 dark:border-zinc-800 dark:bg-zinc-900/30">
        <h2 className="font-medium text-zinc-900 dark:text-zinc-50">Topic workspace</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          YouTube summarizer, PDF/paste ingest for Notebook-style chat, and your vault — sign in
          after configuring Supabase.
        </p>
        <div className="mt-4">
          <TopicHub slug={topic.slug} name={topic.name} />
        </div>
      </section>

      <section className="rounded-xl border border-dashed border-zinc-300 p-5 dark:border-zinc-700">
        <h2 className="font-medium text-zinc-900 dark:text-zinc-50">Related</h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Want a different wording for the same idea? Try{" "}
          <Link href="/study" className="font-medium text-zinc-800 underline dark:text-zinc-200">
            Any topic
          </Link>{" "}
          and type your phrase — you still get notes, formulas, and mocks.
        </p>
      </section>
    </main>
  );
}

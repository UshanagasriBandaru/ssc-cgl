import Link from "next/link";
import { SSC_CGL_TOPICS, SUBJECT_LABELS, type SubjectId } from "@/lib/ssc-topics";

const subjectColors: Record<SubjectId, { bg: string; border: string; icon: string; dot: string }> = {
  quant:     { bg: "bg-blue-50 dark:bg-blue-950/30",     border: "border-blue-200 dark:border-blue-800",     icon: "📐", dot: "bg-blue-500" },
  reasoning: { bg: "bg-violet-50 dark:bg-violet-950/30", border: "border-violet-200 dark:border-violet-800", icon: "🧩", dot: "bg-violet-500" },
  english:   { bg: "bg-emerald-50 dark:bg-emerald-950/30", border: "border-emerald-200 dark:border-emerald-800", icon: "📖", dot: "bg-emerald-500" },
  gk:        { bg: "bg-amber-50 dark:bg-amber-950/30",   border: "border-amber-200 dark:border-amber-800",   icon: "🌍", dot: "bg-amber-500" },
};

function countBySubject(subject: SubjectId) {
  return SSC_CGL_TOPICS.filter((t) => t.subject === subject).length;
}

const features = [
  {
    icon: "🎯",
    title: "Any Topic — Notes & Mocks",
    desc: "Type any SSC topic → get dense revision notes, formula sheet, shortcuts, then jump to AI-generated MCQs.",
    href: "/study",
    cta: "Open study tool",
    color: "from-blue-500 to-indigo-600",
  },
  {
    icon: "📅",
    title: "Adaptive Planner",
    desc: "Set your horizon (15d–6mo), hours/day, and subject levels. Get a PYQ-weighted week-by-week roadmap.",
    href: "/planner",
    cta: "Build my plan",
    color: "from-violet-500 to-purple-600",
  },
  {
    icon: "📝",
    title: "Mistake Notebook",
    desc: "Log wrong answers from mocks. AI explains the trap. Spaced-repetition snooze keeps revision on track.",
    href: "/mistakes",
    cta: "Open notebook",
    color: "from-rose-500 to-pink-600",
  },
  {
    icon: "🔁",
    title: "Revision Queue",
    desc: "Cards due today surface automatically from your mistake log. Review, snooze, and clear the backlog.",
    href: "/revision",
    cta: "Review today",
    color: "from-amber-500 to-orange-600",
  },
  {
    icon: "📊",
    title: "Analytics",
    desc: "Weak-topic heatmap from mistake counts. See where you drop marks most and focus your next session.",
    href: "/analytics",
    cta: "See analytics",
    color: "from-emerald-500 to-teal-600",
  },
  {
    icon: "🧪",
    title: "AI Mock Tests",
    desc: "10 SSC-style MCQs per topic, with difficulty tags and instant explanations. Wrong answers auto-logged.",
    href: "/mock-tests",
    cta: "Take a mock",
    color: "from-cyan-500 to-sky-600",
  },
];

export default function Home() {
  const subjects: SubjectId[] = ["quant", "reasoning", "english", "gk"];

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-12 px-4 py-12">

      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-8 dark:border-amber-900/50 dark:from-amber-950/30 dark:via-zinc-950 dark:to-orange-950/20">
        <div className="absolute right-0 top-0 h-64 w-64 translate-x-16 -translate-y-16 rounded-full bg-amber-100/60 blur-3xl dark:bg-amber-900/20" />
        <div className="relative">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-800 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            SSC CGL Tier-I Prep
          </div>
          <h1 className="mt-4 text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-5xl">
            Your AI coach for{" "}
            <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent dark:from-amber-400 dark:to-orange-400">
              SSC CGL
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
            Topic-wise notes, formula sheets, adaptive study plans, AI mock tests, and a mistake
            notebook — all in one place. Works instantly with just a free{" "}
            <strong className="font-semibold text-zinc-800 dark:text-zinc-200">Gemini API key</strong>.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/study"
              className="inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-zinc-800 dark:bg-amber-500 dark:text-zinc-900 dark:hover:bg-amber-400"
            >
              🎯 Study any topic
            </Link>
            <Link
              href="/planner"
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              📅 Build study plan
            </Link>
            <Link
              href="/topics"
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-300 bg-white px-5 py-3 text-sm font-semibold text-zinc-800 shadow-sm hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
            >
              📚 Browse syllabus
            </Link>
          </div>
        </div>
      </section>

      {/* Quick setup banner */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="flex flex-wrap items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-green-100 text-xl dark:bg-green-900/40">
            ⚡
          </div>
          <div className="flex-1">
            <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">Ready in 60 seconds</h2>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              Add{" "}
              <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-mono dark:bg-zinc-800">GEMINI_API_KEY</code>
              {" "}(free at{" "}
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline dark:text-blue-400">
                aistudio.google.com
              </a>
              ) to{" "}
              <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-mono dark:bg-zinc-800">.env.local</code>
              {" "}— or use{" "}
              <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-mono dark:bg-zinc-800">GROQ_API_KEY</code>
              {" "}/{" "}
              <code className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs font-mono dark:bg-zinc-800">OPENAI_API_KEY</code>
              . Notes, formulas, and mocks work immediately. Cloud sync (mistakes, plans, uploads) needs optional Supabase keys.
            </p>
          </div>
        </div>
      </section>

      {/* Feature grid */}
      <section>
        <h2 className="mb-5 text-xl font-bold text-zinc-900 dark:text-zinc-50">Everything you need</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Link
              key={f.href}
              href={f.href}
              className="group flex flex-col rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/60 dark:hover:border-zinc-700"
            >
              <div className={`inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${f.color} text-xl text-white shadow-sm`}>
                {f.icon}
              </div>
              <h3 className="mt-3 font-semibold text-zinc-900 dark:text-zinc-50">{f.title}</h3>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{f.desc}</p>
              <span className="mt-4 text-xs font-semibold text-zinc-500 group-hover:text-zinc-800 dark:group-hover:text-zinc-200">
                {f.cta} →
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Subject overview */}
      <section>
        <h2 className="mb-5 text-xl font-bold text-zinc-900 dark:text-zinc-50">Syllabus at a glance</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {subjects.map((id) => {
            const c = subjectColors[id];
            const count = countBySubject(id);
            return (
              <Link
                key={id}
                href={`/topics?subject=${id}`}
                className={`flex flex-col rounded-xl border p-4 transition hover:-translate-y-0.5 hover:shadow-md ${c.bg} ${c.border}`}
              >
                <span className="text-2xl">{c.icon}</span>
                <span className="mt-2 font-semibold text-zinc-900 dark:text-zinc-50">{SUBJECT_LABELS[id]}</span>
                <span className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{count} topics</span>
                <div className="mt-3 flex flex-wrap gap-1">
                  {SSC_CGL_TOPICS.filter((t) => t.subject === id).slice(0, 3).map((t) => (
                    <span key={t.slug} className="rounded-full bg-white/70 px-2 py-0.5 text-xs text-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-300">
                      {t.name}
                    </span>
                  ))}
                  {count > 3 && (
                    <span className="rounded-full bg-white/70 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-900/50">
                      +{count - 3} more
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900/60">
        <h2 className="font-bold text-zinc-900 dark:text-zinc-50">Recommended flow</h2>
        <ol className="mt-4 space-y-3">
          {[
            { step: "1", text: "Pick a topic from the syllabus or type any topic name on the Study page." },
            { step: "2", text: "Read the AI-generated notes and formula sheet (dense, SSC-style)." },
            { step: "3", text: "Take the 10-question AI mock test. Wrong answers auto-log to your notebook." },
            { step: "4", text: "Check the Revision queue daily — review due cards before new topics." },
            { step: "5", text: "Use the Planner to get a week-by-week roadmap based on your horizon and weak subjects." },
          ].map((item) => (
            <li key={item.step} className="flex items-start gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                {item.step}
              </span>
              <span className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">{item.text}</span>
            </li>
          ))}
        </ol>
      </section>

    </main>
  );
}

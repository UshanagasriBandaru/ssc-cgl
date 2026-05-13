import { PlannerClient } from "./PlannerClient";

export default function PlannerPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          Adaptive preparation planner
        </h1>
        <p className="mt-2 max-w-3xl text-zinc-600 dark:text-zinc-400">
          Core engine: weightage-ranked topics + your weak areas + optional survival mode. POST{" "}
          <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">/api/plan</code> powers this
          UI.
        </p>
      </div>
      <PlannerClient />
    </main>
  );
}

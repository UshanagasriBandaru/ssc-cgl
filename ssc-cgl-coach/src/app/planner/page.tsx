import Link from "next/link";
import { PlannerClient } from "./PlannerClient";

export default function PlannerPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10">
      <div>
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
          ← Home
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Adaptive Study Planner
        </h1>
        <p className="mt-2 max-w-2xl text-zinc-500 dark:text-zinc-400">
          Set your exam horizon, daily hours, and subject levels. Get a PYQ-weighted week-by-week roadmap.
          Works without AI keys using a built-in mock plan — add a key for richer tailoring.
        </p>
      </div>
      <PlannerClient />
    </main>
  );
}

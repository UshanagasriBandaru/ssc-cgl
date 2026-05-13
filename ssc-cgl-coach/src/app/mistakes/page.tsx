import { MistakesClient } from "./MistakesClient";

export default function MistakesPage() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Mistake notebook</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Every wrong answer becomes a tagged revision card. Cloud sync requires Supabase + magic-link
          login; otherwise entries stay in this browser only.
        </p>
      </div>
      <MistakesClient />
    </main>
  );
}

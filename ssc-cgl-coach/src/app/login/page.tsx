"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function LoginForm({ supabase }: { supabase: SupabaseClient }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setStatus(null);
    const origin = window.location.origin;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${origin}/auth/callback?next=/dashboard` },
    });
    setBusy(false);
    if (error) setStatus({ type: "error", msg: error.message });
    else setStatus({ type: "success", msg: "✅ Check your inbox — magic link sent!" });
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-16">
      <Link href="/" className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
        ← Home
      </Link>

      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500 text-2xl font-black text-white shadow-sm">
            S
          </div>
          <h1 className="mt-4 text-2xl font-bold text-zinc-900 dark:text-zinc-50">Sign in</h1>
          <p className="mt-1.5 text-sm text-zinc-500">
            Passwordless magic link via Supabase Auth
          </p>
        </div>

        <form onSubmit={(e) => void sendLink(e)} className="space-y-4">
          <label className="block text-sm">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">Email address</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm shadow-sm focus:border-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:ring-zinc-800"
              placeholder="you@example.com"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-amber-500 dark:text-zinc-900 dark:hover:bg-amber-400"
          >
            {busy ? (
              <><span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white dark:border-zinc-900/40 dark:border-t-zinc-900" /> Sending…</>
            ) : "✉️ Send magic link"}
          </button>
        </form>

        {status && (
          <div className={`mt-4 flex items-start gap-2 rounded-xl border p-3 text-sm ${
            status.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
          }`}>
            {status.msg}
          </div>
        )}

        <p className="mt-5 text-center text-xs text-zinc-400">
          Cloud sync needs Supabase configured. Without it, notes and mistakes are saved locally in your browser.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
        <p className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">Setup required in Supabase dashboard:</p>
        <ul className="mt-2 space-y-1 text-xs text-zinc-500">
          <li>• Enable Email provider under Authentication → Providers</li>
          <li>• Add <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-800">{typeof window !== "undefined" ? window.location.origin : "http://localhost:4000"}/auth/callback</code> to Redirect URLs</li>
        </ul>
      </div>
    </main>
  );
}

export default function LoginPage() {
  const supabase = useMemo(() => createClient(), []);

  if (!supabase) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-16">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
          ← Home
        </Link>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900 dark:bg-amber-950/30">
          <div className="text-2xl">⚠️</div>
          <h2 className="mt-2 font-semibold text-amber-900 dark:text-amber-200">Supabase not configured</h2>
          <p className="mt-2 text-sm text-amber-800 dark:text-amber-300">
            Add{" "}
            <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
            and{" "}
            <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>{" "}
            to <code className="rounded bg-amber-100 px-1 dark:bg-amber-900">.env.local</code> to enable sign-in.
          </p>
          <p className="mt-3 text-sm text-amber-700 dark:text-amber-400">
            The app works without sign-in — mistakes and notes are saved locally in your browser.
          </p>
          <Link
            href="/"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white dark:bg-amber-500 dark:text-zinc-900"
          >
            ← Back to home
          </Link>
        </div>
      </main>
    );
  }

  return <LoginForm supabase={supabase} />;
}

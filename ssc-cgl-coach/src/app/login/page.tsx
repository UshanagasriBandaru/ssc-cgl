"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function LoginForm({ supabase }: { supabase: SupabaseClient }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<string | null>(null);
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
    if (error) setStatus(error.message);
    else setStatus("Check your inbox for the magic link.");
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-6 px-4 py-16">
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
        ← Home
      </Link>
      <div>
        <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50">Sign in</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Passwordless email link via Supabase Auth (enable email provider + redirect URLs in the
          Supabase dashboard).
        </p>
      </div>
      <form onSubmit={(e) => void sendLink(e)} className="space-y-3">
        <label className="block text-sm">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-lg bg-zinc-900 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {busy ? "Sending…" : "Email magic link"}
        </button>
      </form>
      {status ? <p className="text-sm text-zinc-700 dark:text-zinc-300">{status}</p> : null}
    </main>
  );
}

export default function LoginPage() {
  const supabase = useMemo(() => createClient(), []);

  if (!supabase) {
    return (
      <main className="mx-auto max-w-md px-4 py-16">
        <p className="text-sm text-zinc-600">
          Supabase env vars missing. Add{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-900">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
          and{" "}
          <code className="rounded bg-zinc-100 px-1 dark:bg-zinc-900">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>.
        </p>
      </main>
    );
  }

  return <LoginForm supabase={supabase} />;
}

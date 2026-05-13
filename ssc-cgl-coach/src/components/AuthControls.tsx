"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

function AuthControlsInner({ supabase }: { supabase: SupabaseClient }) {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      setEmail(data.session?.user.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setEmail(session?.user.email ?? null);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  async function signOut() {
    await supabase.auth.signOut();
  }

  if (!email) {
    return (
      <Link
        href="/login"
        className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="hidden max-w-[140px] truncate text-xs text-zinc-500 sm:inline">{email}</span>
      <button
        type="button"
        onClick={() => void signOut()}
        className="rounded-md border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700"
      >
        Sign out
      </button>
    </div>
  );
}

export function AuthControls() {
  const supabase = useMemo(() => createClient(), []);

  if (!supabase) {
    return (
      <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
        DB off
      </span>
    );
  }

  return <AuthControlsInner supabase={supabase} />;
}

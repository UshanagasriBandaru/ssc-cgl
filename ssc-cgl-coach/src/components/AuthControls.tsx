// Auth is optional — this component renders nothing when Supabase is not configured.
// When Supabase IS configured, it shows the signed-in email + sign out button.
"use client";

import type { SupabaseClient } from "@supabase/supabase-js";
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

  if (!email) return null;

  return (
    <div className="flex items-center gap-2">
      <span className="hidden max-w-[140px] truncate text-xs text-zinc-500 sm:inline">{email}</span>
      <button
        type="button"
        onClick={() => void supabase.auth.signOut()}
        className="rounded-md border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700"
      >
        Sign out
      </button>
    </div>
  );
}

export function AuthControls() {
  const supabase = useMemo(() => createClient(), []);
  // If Supabase not configured, render nothing — no "DB off" badge, no sign-in button
  if (!supabase) return null;
  return <AuthControlsInner supabase={supabase} />;
}

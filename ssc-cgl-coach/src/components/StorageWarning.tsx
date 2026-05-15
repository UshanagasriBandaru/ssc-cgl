"use client";

import { useEffect, useState } from "react";
import { StorageQuotaError } from "@/lib/datastore";

/**
 * Global storage quota warning banner.
 * Listens for StorageQuotaError events dispatched by datastore writes.
 */
export function StorageWarning() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Monkey-patch writeStore to dispatch a custom event on quota error
    const handler = (e: Event) => {
      if (e instanceof CustomEvent && e.type === "storage-quota-exceeded") {
        setShow(true);
      }
    };
    window.addEventListener("storage-quota-exceeded", handler);

    // Also migrate v1 study packs to v2 key on first load
    try {
      const v1 = localStorage.getItem("ssc-coach-study-packs-v1");
      const v2 = localStorage.getItem("ssc-coach-v2-study-packs");
      if (v1 && !v2) {
        localStorage.setItem("ssc-coach-v2-study-packs", v1);
      }
    } catch { /* ignore */ }

    return () => window.removeEventListener("storage-quota-exceeded", handler);
  }, []);

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-lg dark:border-amber-700 dark:bg-amber-950/80 sm:left-auto sm:right-4 sm:max-w-sm">
      <span className="text-xl">⚠️</span>
      <div className="flex-1">
        <p className="font-semibold text-amber-900 dark:text-amber-200">Storage almost full</p>
        <p className="mt-0.5 text-sm text-amber-800 dark:text-amber-300">
          Browser storage is nearly full. Your current session data is saved in memory. Clear old data or sign in to Supabase for cloud sync.
        </p>
      </div>
      <button
        type="button"
        onClick={() => setShow(false)}
        className="shrink-0 text-amber-600 hover:text-amber-800 dark:text-amber-400"
      >
        ✕
      </button>
    </div>
  );
}

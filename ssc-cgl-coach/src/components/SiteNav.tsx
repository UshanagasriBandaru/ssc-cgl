import Link from "next/link";
import { AuthControls } from "@/components/AuthControls";

const links = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/topics", label: "Topics" },
  { href: "/study", label: "Any topic" },
  { href: "/planner", label: "Planner" },
  { href: "/mock-tests", label: "Mocks" },
  { href: "/mistakes", label: "Mistakes" },
  { href: "/revision", label: "Revision" },
  { href: "/analytics", label: "Analytics" },
];

export function SiteNav() {
  return (
    <header className="border-b border-zinc-200 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          SSC CGL Coach
        </Link>
        <nav className="flex flex-wrap items-center gap-1 text-sm">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-1.5 text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-900 dark:hover:text-zinc-50"
            >
              {l.label}
            </Link>
          ))}
          <AuthControls />
        </nav>
      </div>
    </header>
  );
}

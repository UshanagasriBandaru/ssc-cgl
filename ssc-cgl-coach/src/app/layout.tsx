import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteNav } from "@/components/SiteNav";
import Link from "next/link";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SSC CGL Coach — AI prep planner",
  description:
    "SSC CGL prep: topic-wise notes, formula sheets, AI mock tests, adaptive planner, and mistake notebook. Works with Gemini, Groq, or OpenAI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <SiteNav />
        <div className="flex flex-1 flex-col">{children}</div>
        <footer className="mt-auto border-t border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-xs text-zinc-500">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-amber-500 text-xs font-black text-white">S</span>
              <span className="font-medium text-zinc-700 dark:text-zinc-300">SSC CGL Coach</span>
              <span>· AI-powered exam prep</span>
            </div>
            <nav className="flex flex-wrap gap-4">
              {[
                { href: "/study",      label: "Study" },
                { href: "/mock-tests", label: "Mocks" },
                { href: "/planner",    label: "Planner" },
                { href: "/mistakes",   label: "Mistakes" },
                { href: "/revision",   label: "Revision" },
                { href: "/analytics",  label: "Analytics" },
              ].map((l) => (
                <Link key={l.href} href={l.href} className="hover:text-zinc-800 dark:hover:text-zinc-200">
                  {l.label}
                </Link>
              ))}
            </nav>
            <p className="text-zinc-400">Works with Gemini · Groq · OpenAI</p>
          </div>
        </footer>
      </body>
    </html>
  );
}

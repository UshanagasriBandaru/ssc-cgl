export function extractYoutubeId(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (/^[\w-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.replace("/", "").slice(0, 11);
      return id.length === 11 ? id : null;
    }
    if (host.includes("youtube.com")) {
      const v = u.searchParams.get("v");
      if (v && v.length === 11) return v;
      const m = u.pathname.match(/\/shorts\/([\w-]{11})/);
      if (m) return m[1];
      const e = u.pathname.match(/\/embed\/([\w-]{11})/);
      if (e) return e[1];
    }
  } catch {
    return null;
  }
  return null;
}

/** Rough chunking for RAG — splits on blank lines then merges up to maxLen. */
export function chunkText(raw: string, maxLen = 1200): string[] {
  const normalized = raw.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const paragraphs = normalized.split(/\n\s*\n+/);
  const chunks: string[] = [];
  let buf = "";

  const flush = () => {
    const t = buf.trim();
    if (t) chunks.push(t);
    buf = "";
  };

  for (const p of paragraphs) {
    const piece = p.trim();
    if (!piece) continue;
    if (buf.length + piece.length + 2 <= maxLen) {
      buf = buf ? `${buf}\n\n${piece}` : piece;
    } else {
      flush();
      if (piece.length <= maxLen) buf = piece;
      else {
        for (let i = 0; i < piece.length; i += maxLen) {
          chunks.push(piece.slice(i, i + maxLen));
        }
      }
    }
  }
  flush();
  return chunks;
}

export function keywordOverlapScore(chunk: string, query: string): number {
  const q = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);
  if (!q.length) return 0;
  const hay = chunk.toLowerCase();
  return q.reduce((acc, w) => acc + (hay.includes(w) ? 1 : 0), 0);
}

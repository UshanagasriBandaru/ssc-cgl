/**
 * Minimal Markdown → HTML converter for study pack content.
 * Handles: ## headings, **bold**, bullet lists, numbered lists, inline code.
 * No external deps needed.
 */
export function markdownToHtml(md: string): string {
  if (!md) return "";

  const lines = md.split("\n");
  const out: string[] = [];
  let inUl = false;
  let inOl = false;

  function closeList() {
    if (inUl) { out.push("</ul>"); inUl = false; }
    if (inOl) { out.push("</ol>"); inOl = false; }
  }

  function inlineFormat(text: string): string {
    return text
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/`([^`]+)`/g, "<code>$1</code>");
  }

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line.startsWith("### ")) {
      closeList();
      out.push(`<h3>${inlineFormat(line.slice(4))}</h3>`);
    } else if (line.startsWith("## ")) {
      closeList();
      out.push(`<h2>${inlineFormat(line.slice(3))}</h2>`);
    } else if (line.startsWith("# ")) {
      closeList();
      out.push(`<h2>${inlineFormat(line.slice(2))}</h2>`);
    } else if (/^[-*] /.test(line)) {
      if (inOl) { out.push("</ol>"); inOl = false; }
      if (!inUl) { out.push("<ul>"); inUl = true; }
      out.push(`<li>${inlineFormat(line.slice(2))}</li>`);
    } else if (/^\d+\. /.test(line)) {
      if (inUl) { out.push("</ul>"); inUl = false; }
      if (!inOl) { out.push("<ol>"); inOl = true; }
      out.push(`<li>${inlineFormat(line.replace(/^\d+\. /, ""))}</li>`);
    } else if (line.trim() === "") {
      closeList();
      out.push("");
    } else {
      closeList();
      out.push(`<p>${inlineFormat(line)}</p>`);
    }
  }

  closeList();
  return out.join("\n");
}

/** URL-safe slug for topic keys (mistakes, mocks). */
export function slugifyTopic(input: string): string {
  const s = input
    .trim()
    .toLowerCase()
    .replace(/'/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "topic";
}

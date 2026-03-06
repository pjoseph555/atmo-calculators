/** Generate a URL-safe id slug from a calculator name. */
export function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

/** Generate a unique id by appending a short random suffix. */
export function uniqueSlug(name: string): string {
  const base = toSlug(name) || "calculator";
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base}-${suffix}`;
}

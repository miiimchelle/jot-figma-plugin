// Figma may load the UI in quirks mode, where class selectors are case-insensitive.
// Returns class names that clash once lower-cased (e.g. ".jo" and ".Jo").
export function caseCollisions(css) {
  const seen = new Map();
  for (const [, name] of css.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) {
    const key = name.toLowerCase();
    const names = seen.get(key) ?? new Set();
    names.add(name);
    seen.set(key, names);
  }
  return [...seen.values()].filter((names) => names.size > 1).map((names) => [...names]);
}

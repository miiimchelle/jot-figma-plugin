export const ENTRY_TYPES = ["decision", "assumption", "tradeoff", "feedback", "debt"] as const;

export type EntryType = (typeof ENTRY_TYPES)[number];

export function isEntryType(value: unknown): value is EntryType {
  return typeof value === "string" && (ENTRY_TYPES as readonly string[]).includes(value);
}

/** Tag is optional: "" / undefined means no tag. */
export function parseTag(value: unknown): EntryType | undefined | null {
  if (value === undefined || value === "") return undefined;
  return isEntryType(value) ? value : null;
}

export type AuthorDisplay = {
  avatar: boolean;
  name: boolean;
  timestamp: boolean;
};

export const DEFAULT_AUTHOR_DISPLAY: AuthorDisplay = { avatar: true, name: true, timestamp: true };

export function parseAuthorDisplay(value: unknown): AuthorDisplay {
  const v = (value ?? {}) as Partial<Record<keyof AuthorDisplay, unknown>>;
  return {
    avatar: typeof v.avatar === "boolean" ? v.avatar : DEFAULT_AUTHOR_DISPLAY.avatar,
    name: typeof v.name === "boolean" ? v.name : DEFAULT_AUTHOR_DISPLAY.name,
    timestamp: typeof v.timestamp === "boolean" ? v.timestamp : DEFAULT_AUTHOR_DISPLAY.timestamp,
  };
}

export type Author = {
  name?: string;
  photoUrl?: string;
};

export type JournalEntry = {
  id: string;
  createdAt: string;
  updatedAt?: string;
  type?: EntryType;
  heading?: string;
  note: string;
  display?: AuthorDisplay;
  author?: Author;
  /** Canvas node for a sticky entry. */
  stickyNodeId?: string;

  nodeId?: string;
  nodeName?: string;
  nodeUrl?: string;

  pageId?: string;
  pageName?: string;
};

export const STORAGE_KEY = "jot.journal.v1";
export const FILE_KEY_STORAGE = "jot.filekey.v1";
export const PREFS_STORAGE = "jot.prefs.v1";

export function nodeIdToUrlFormat(nodeId: string): string {
  return nodeId.replace(/:/g, "-");
}

export function buildNodeUrl(fileKey: string | undefined, nodeId?: string): string | undefined {
  if (!fileKey || !nodeId) return undefined;
  const nodeIdForUrl = nodeIdToUrlFormat(nodeId);
  return `https://www.figma.com/design/${fileKey}/?node-id=${encodeURIComponent(nodeIdForUrl)}`;
}

export function parseJournal(raw: string): JournalEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as JournalEntry[]) : [];
  } catch {
    return [];
  }
}

export function toMarkdown(entries: JournalEntry[], fileKey?: string): string {
  const lines: string[] = [];
  lines.push(`# Jot — design decision journal`);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(``);

  for (const e of entries) {
    const created = new Date(e.createdAt).toLocaleString();
    const edited = e.updatedAt
      ? ` (edited ${new Date(e.updatedAt).toLocaleString()})`
      : ``;

    lines.push(`## ${e.type ?? "note"} — ${created}${edited}`);
    if (e.heading) lines.push(`**${e.heading}**`, ``);

    const url = e.nodeUrl ?? buildNodeUrl(fileKey, e.nodeId);

    if (e.nodeName && url) {
      lines.push(`Linked layer/frame: [${e.nodeName}](${url})`);
      lines.push(``);
    } else if (e.nodeName) {
      lines.push(`Linked layer/frame: ${e.nodeName}`);
      lines.push(``);
    }

    lines.push(e.note);
    lines.push(``);
  }

  return lines.join("\n");
}

export function extractFileKey(input: string): string | null {
  const trimmed = input.trim();
  const match = trimmed.match(/figma\.com\/(?:design|file)\/([A-Za-z0-9]+)/);
  if (match) return match[1];
  if (/^[A-Za-z0-9]{10,}$/.test(trimmed)) return trimmed;
  return null;
}

export function filterEntries(entries: JournalEntry[], filterType: string): JournalEntry[] {
  return entries.filter(
    (e) => filterType === "all" || (filterType === "none" ? !e.type : e.type === filterType)
  );
}

export function cleanHeading(raw: unknown): string | undefined {
  const trimmed = String(raw ?? "").trim();
  return trimmed || undefined;
}

export function cleanNote(raw: unknown): string | null {
  const trimmed = String(raw ?? "").trim();
  return trimmed || null;
}

export function generateEntryId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// ---------------------------------------------------------------------------
// Sticky layout (pure, no Figma API)
// ---------------------------------------------------------------------------

export const STICKY_GAP = 24;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "29 September 2025". Manual, so it does not depend on Intl in the plugin sandbox. */
export function formatStickyDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function initials(name?: string): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join("");
}

export const TAG_LABELS: Record<EntryType, string> = {
  decision: "Decision",
  assumption: "Assumption",
  tradeoff: "Trade-off",
  feedback: "Feedback",
  debt: "Design debt",
};

/** Hex colours for a sticky. Tagged stickies reuse the plugin's pill colours. */
export type StickyPalette = { body: string; footer: string; ink: string; border: string };

export const UNTAGGED_PALETTE: StickyPalette = {
  body: "#FDF1C9",
  footer: "#FEFAEB",
  ink: "#4A2511",
  border: "#4A2511",
};

export const TAG_PALETTES: Record<EntryType, StickyPalette> = {
  decision: { body: "#DBEAFE", footer: "#EFF6FF", ink: "#1D4ED8", border: "#93C5FD" },
  assumption: { body: "#FEF3C7", footer: "#FFFBEB", ink: "#B45309", border: "#FCD34D" },
  tradeoff: { body: "#EDE9FE", footer: "#F5F3FF", ink: "#5B21B6", border: "#C4B5FD" },
  feedback: { body: "#D1FAE5", footer: "#ECFDF5", ink: "#047857", border: "#6EE7B7" },
  debt: { body: "#FEE2E2", footer: "#FEF2F2", ink: "#B91C1C", border: "#FCA5A5" },
};

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const n = parseInt(hex.replace("#", ""), 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

export type StickyContent = {
  tag?: EntryType;
  /** Pill text, e.g. "Trade-off". Absent when untagged. */
  pill?: string;
  palette: StickyPalette;
  heading?: string;
  note: string;
  footer: { avatar: boolean; name?: string; date?: string } | null;
};

export function stickyContent(entry: JournalEntry): StickyContent {
  const display = parseAuthorDisplay(entry.display);
  const name = display.name ? entry.author?.name : undefined;
  const date = display.timestamp ? formatStickyDate(entry.createdAt) || undefined : undefined;
  const footer = display.avatar || name || date ? { avatar: display.avatar, name, date } : null;
  const tag = isEntryType(entry.type) ? entry.type : undefined;
  return {
    tag,
    pill: tag && TAG_LABELS[tag],
    palette: tag ? TAG_PALETTES[tag] : UNTAGGED_PALETTE,
    heading: entry.heading,
    note: entry.note,
    footer,
  };
}

export type Box = { x: number; y: number; width: number; height: number };

/** Right of the linked layer, top-aligned. */
export function stickyPosition(target: Box): { x: number; y: number } {
  return { x: target.x + target.width + STICKY_GAP, y: target.y };
}

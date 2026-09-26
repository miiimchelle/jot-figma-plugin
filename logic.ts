export const ENTRY_TYPES = ["decision", "assumption", "tradeoff", "feedback", "debt"] as const;

export type EntryType = (typeof ENTRY_TYPES)[number];

export function isEntryType(value: unknown): value is EntryType {
  return typeof value === "string" && (ENTRY_TYPES as readonly string[]).includes(value);
}

export const ENTRY_KINDS = ["sticky", "annotation"] as const;

export type EntryKind = (typeof ENTRY_KINDS)[number];

export function isEntryKind(value: unknown): value is EntryKind {
  return typeof value === "string" && (ENTRY_KINDS as readonly string[]).includes(value);
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

export type JournalEntry = {
  id: string;
  createdAt: string;
  updatedAt?: string;
  kind: EntryKind;
  type?: EntryType;
  heading?: string;
  note: string;
  display?: AuthorDisplay;

  nodeId?: string;
  nodeName?: string;
  nodeUrl?: string;

  pageId?: string;
  pageName?: string;
};

export const STORAGE_KEY = "jot.journal.v1";
export const FILE_KEY_STORAGE = "jot.filekey.v1";

export function nodeIdToUrlFormat(nodeId: string): string {
  return nodeId.replace(/:/g, "-");
}

export function buildNodeUrl(fileKey: string | undefined, nodeId?: string): string | undefined {
  if (!fileKey || !nodeId) return undefined;
  const nodeIdForUrl = nodeIdToUrlFormat(nodeId);
  return `https://www.figma.com/design/${fileKey}/?node-id=${encodeURIComponent(nodeIdForUrl)}`;
}

/** Entries saved before kinds existed become stickies. */
export function migrateEntry(entry: JournalEntry): JournalEntry {
  return isEntryKind(entry.kind) ? entry : { ...entry, kind: "sticky" };
}

export function parseJournal(raw: string): JournalEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as JournalEntry[]).map(migrateEntry) : [];
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

    lines.push(`## ${e.type ?? e.kind} — ${created}${edited}`);
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

export function filterEntries(
  entries: JournalEntry[],
  filterType: string,
  filterKind = "all"
): JournalEntry[] {
  return entries.filter(
    (e) =>
      (filterType === "all" || e.type === filterType) &&
      (filterKind === "all" || e.kind === filterKind)
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

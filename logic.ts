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
/** Vertical gap between stickies linked to the same layer. */
export const STICKY_STACK_GAP = 16;

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

/** Y positions for stickies stacked top to bottom from `top`, 16px apart. */
export function stackYs(top: number, heights: number[]): number[] {
  const ys: number[] = [];
  let y = top;
  for (const h of heights) {
    ys.push(y);
    y += h + STICKY_STACK_GAP;
  }
  return ys;
}

// ---------------------------------------------------------------------------
// Note formatting. Notes are Markdown from the editor: **bold**, *italic*,
// [links](https://…), "- " and "1. " lists (nested by indentation).
// ---------------------------------------------------------------------------

export type NoteSpan = { text: string; bold?: boolean; italic?: boolean; href?: string };
export type NoteBlock = { kind: "paragraph" | "bullet" | "ordered"; depth: number; spans: NoteSpan[] };

const SAFE_HREF = /^(https?:|mailto:)/i;

function sameStyle(a: NoteSpan, b: NoteSpan) {
  return !!a.bold === !!b.bold && !!a.italic === !!b.italic && a.href === b.href;
}

function pushSpan(spans: NoteSpan[], span: NoteSpan) {
  if (!span.text) return;
  const prev = spans[spans.length - 1];
  if (prev && sameStyle(prev, span)) prev.text += span.text;
  else spans.push(span);
}

/** Inline Markdown to styled spans. Unclosed markers stay as literal text. */
export function parseInline(src: string, style: Omit<NoteSpan, "text"> = {}): NoteSpan[] {
  const spans: NoteSpan[] = [];
  let text = "";
  const flush = () => {
    pushSpan(spans, { ...style, text });
    text = "";
  };
  const nest = (inner: string, extra: Omit<NoteSpan, "text">) => {
    flush();
    for (const s of parseInline(inner, { ...style, ...extra })) pushSpan(spans, s);
  };

  let i = 0;
  while (i < src.length) {
    const c = src[i];
    if (c === "\\" && i + 1 < src.length) {
      text += src[i + 1];
      i += 2;
      continue;
    }
    if (c === "[") {
      const close = src.indexOf("](", i);
      const end = close === -1 ? -1 : src.indexOf(")", close + 2);
      if (end !== -1) {
        const href = src.slice(close + 2, end).trim();
        nest(src.slice(i + 1, close), SAFE_HREF.test(href) ? { href } : {});
        i = end + 1;
        continue;
      }
    }
    if ((c === "*" || c === "_") && src[i + 1] === c && src[i + 2] === c) {
      const end = src.indexOf(c + c + c, i + 3);
      if (end > i + 3) {
        nest(src.slice(i + 3, end), { bold: true, italic: true });
        i = end + 3;
        continue;
      }
    }
    if ((c === "*" || c === "_") && src[i + 1] === c) {
      const end = src.indexOf(c + c, i + 2);
      if (end > i + 2) {
        nest(src.slice(i + 2, end), { bold: true });
        i = end + 2;
        continue;
      }
    }
    if (c === "*" || c === "_") {
      let end = i + 1;
      // Closing single marker that isn't half of a double marker.
      while ((end = src.indexOf(c, end)) !== -1 && src[end + 1] === c) end += 2;
      if (end > i + 1) {
        nest(src.slice(i + 1, end), { italic: true });
        i = end + 1;
        continue;
      }
    }
    text += c;
    i++;
  }
  flush();
  return spans;
}

const LIST_ITEM = /^(\s*)([-*+]|\d+[.)])\s+(.*)$/;

/** Markdown note to blocks. Plain-text notes come back as paragraphs. */
export function parseNote(md: string): NoteBlock[] {
  const blocks: NoteBlock[] = [];
  const indents: number[] = [];
  let para: string[] = [];
  const endPara = () => {
    if (para.length) blocks.push({ kind: "paragraph", depth: 0, spans: parseInline(para.join("\n")) });
    para = [];
  };

  for (const raw of md.replace(/\r\n?/g, "\n").split("\n")) {
    // Hard line breaks: trailing "  " or "\".
    const line = raw.replace(/( {2,}|\\)$/, "");
    const item = line.match(LIST_ITEM);
    if (item) {
      endPara();
      const indent = item[1].length;
      while (indents.length && indent < indents[indents.length - 1]) indents.pop();
      if (!indents.length || indent > indents[indents.length - 1]) indents.push(indent);
      blocks.push({
        kind: /\d/.test(item[2]) ? "ordered" : "bullet",
        depth: indents.length - 1,
        spans: parseInline(item[3]),
      });
    } else if (!line.trim()) {
      endPara();
      indents.length = 0;
    } else {
      para.push(line.trim());
    }
  }
  endPara();
  return blocks;
}

/** Numbers for ordered items, restarting per list and nesting level. */
export function listNumbers(blocks: NoteBlock[]): number[] {
  const counters: number[] = [];
  return blocks.map((b, i) => {
    const prev = blocks[i - 1];
    if (b.kind === "paragraph") {
      counters.length = 0;
      return 0;
    }
    counters.length = b.depth + 1;
    const continues = prev && prev.kind !== "paragraph" && (prev.depth > b.depth || (prev.depth === b.depth && prev.kind === b.kind));
    counters[b.depth] = continues ? (counters[b.depth] ?? 0) + 1 : 1;
    return b.kind === "ordered" ? counters[b.depth] : 0;
  });
}

export type NoteRange = { start: number; end: number };
export type FlatNote = {
  text: string;
  /** Styled inline runs (bold, italic, link). */
  runs: Array<NoteRange & Omit<NoteSpan, "text">>;
  /** One per block: list type and nesting for the Figma paragraph. */
  lines: Array<NoteRange & Pick<NoteBlock, "kind" | "depth">>;
};

/**
 * Note Markdown as plain text plus ranges, for a Figma text layer. Blocks become
 * paragraphs ("\n"); line breaks inside a block become U+2028 so they stay one paragraph.
 */
export function flattenNote(md: string): FlatNote {
  const flat: FlatNote = { text: "", runs: [], lines: [] };
  parseNote(md).forEach((block, i) => {
    if (i) flat.text += "\n";
    const lineStart = flat.text.length;
    for (const { text, ...style } of block.spans) {
      const start = flat.text.length;
      flat.text += text.replace(/\n/g, " ");
      if (style.bold || style.italic || style.href) flat.runs.push({ start, end: flat.text.length, ...style });
    }
    flat.lines.push({ start: lineStart, end: flat.text.length, kind: block.kind, depth: block.depth });
  });
  return flat;
}

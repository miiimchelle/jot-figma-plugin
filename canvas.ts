import {
  JournalEntry,
  stickyContent,
  stickyPosition,
  initials,
  Box,
  StickyPalette,
  hexToRgb,
} from "./logic";

// ---------------------------------------------------------------------------
// Sticky note rendering (Figma API). Layout decisions live in logic.ts.
// ---------------------------------------------------------------------------

export const STICKY_ENTRY_KEY = "jot.entryId";

const WIDTH = 300;
const PAD = 20;

const solid = (hex: string): SolidPaint => ({ type: "SOLID", color: hexToRgb(hex) });

const FONT_FAMILY = "Roboto Mono";
const FALLBACK_FAMILY = "Inter";

async function loadFonts(): Promise<string> {
  try {
    await Promise.all([
      figma.loadFontAsync({ family: FONT_FAMILY, style: "Regular" }),
      figma.loadFontAsync({ family: FONT_FAMILY, style: "Bold" }),
    ]);
    return FONT_FAMILY;
  } catch {
    await Promise.all([
      figma.loadFontAsync({ family: FALLBACK_FAMILY, style: "Regular" }),
      figma.loadFontAsync({ family: FALLBACK_FAMILY, style: "Bold" }),
    ]);
    return FALLBACK_FAMILY;
  }
}

function autoFrame(name: string, direction: "VERTICAL" | "HORIZONTAL"): FrameNode {
  const f = figma.createFrame();
  f.name = name;
  f.layoutMode = direction;
  f.primaryAxisSizingMode = "AUTO";
  f.counterAxisSizingMode = "AUTO";
  f.fills = [];
  return f;
}

function text(family: string, bold: boolean, size: number, chars: string, ink: string): TextNode {
  const t = figma.createText();
  t.fontName = { family, style: bold ? "Bold" : "Regular" };
  t.fontSize = size;
  t.lineHeight = { value: 150, unit: "PERCENT" };
  t.fills = [solid(ink)];
  t.characters = chars;
  return t;
}

/** Text that wraps inside an auto-layout parent. Call after appendChild. */
function fillWidth(node: TextNode) {
  node.layoutSizingHorizontal = "FILL";
  node.textAutoResize = "HEIGHT";
}

async function avatarNode(
  author: JournalEntry["author"],
  family: string,
  p: StickyPalette
): Promise<SceneNode> {
  const size = 32;
  if (author?.photoUrl) {
    try {
      const image = await figma.createImageAsync(author.photoUrl);
      const e = figma.createEllipse();
      e.name = "Avatar";
      e.resize(size, size);
      e.fills = [{ type: "IMAGE", imageHash: image.hash, scaleMode: "FILL" }];
      return e;
    } catch (e) {
      console.warn("Jot: avatar failed to load, using initials", e);
    }
  }
  const circle = autoFrame("Avatar", "HORIZONTAL");
  circle.primaryAxisSizingMode = "FIXED";
  circle.counterAxisSizingMode = "FIXED";
  circle.resize(size, size);
  circle.cornerRadius = size / 2;
  circle.primaryAxisAlignItems = "CENTER";
  circle.counterAxisAlignItems = "CENTER";
  circle.fills = [solid(p.body)];
  circle.strokes = [solid(p.ink)];
  circle.strokeWeight = 1;
  circle.appendChild(text(family, true, 13, initials(author?.name), p.ink));
  return circle;
}

function pillNode(family: string, label: string, p: StickyPalette): FrameNode {
  const pill = autoFrame("Tag", "HORIZONTAL");
  pill.paddingTop = pill.paddingBottom = 2;
  pill.paddingLeft = pill.paddingRight = 8;
  pill.cornerRadius = 999;
  pill.fills = [solid("#FFFFFF")];
  pill.strokes = [solid(p.border)];
  pill.strokeWeight = 1;
  pill.appendChild(text(family, true, 12, label, p.ink));
  return pill;
}

export async function buildSticky(entry: JournalEntry): Promise<FrameNode> {
  const family = await loadFonts();
  const c = stickyContent(entry);
  const p = c.palette;

  const root = autoFrame(entry.heading ? `Jot: ${entry.heading}` : "Jot sticky", "VERTICAL");
  root.primaryAxisSizingMode = "AUTO";
  root.counterAxisSizingMode = "FIXED";
  root.resize(WIDTH, root.height);
  root.cornerRadius = 12;
  root.clipsContent = true;
  root.fills = [solid(p.body)];
  root.strokes = [solid(p.border)];
  root.strokeWeight = 1;
  root.effects = [
    {
      type: "DROP_SHADOW",
      color: { r: 0, g: 0, b: 0, a: 0.12 },
      offset: { x: 0, y: 2 },
      radius: 6,
      spread: 0,
      visible: true,
      blendMode: "NORMAL",
    },
  ];
  root.setPluginData(STICKY_ENTRY_KEY, entry.id);

  // Body: pill, heading, note
  const body = autoFrame("Body", "HORIZONTAL");
  body.itemSpacing = 12;
  body.paddingTop = body.paddingBottom = PAD;
  body.paddingLeft = body.paddingRight = PAD;
  root.appendChild(body);
  body.layoutSizingHorizontal = "FILL";

  const column = autoFrame("Content", "VERTICAL");
  column.itemSpacing = 12;
  body.appendChild(column);
  column.layoutSizingHorizontal = "FILL";

  if (c.pill) column.appendChild(pillNode(family, c.pill, p));
  if (c.heading) {
    const h = text(family, true, 16, c.heading, p.ink);
    column.appendChild(h);
    fillWidth(h);
  }
  const n = text(family, false, 14, c.note, p.ink);
  column.appendChild(n);
  fillWidth(n);

  // Footer: avatar + (name, date)
  if (c.footer) {
    const footer = autoFrame("Footer", "HORIZONTAL");
    footer.itemSpacing = 12;
    footer.counterAxisAlignItems = "CENTER";
    footer.paddingTop = footer.paddingBottom = 12;
    footer.paddingLeft = footer.paddingRight = PAD;
    footer.fills = [solid(p.footer)];
    footer.strokes = [solid(p.border)];
    footer.strokeTopWeight = 1;
    footer.strokeBottomWeight = footer.strokeLeftWeight = footer.strokeRightWeight = 0;
    root.appendChild(footer);
    footer.layoutSizingHorizontal = "FILL";

    if (c.footer.avatar) footer.appendChild(await avatarNode(entry.author, family, p));

    if (c.footer.name || c.footer.date) {
      const meta = autoFrame("Author", "VERTICAL");
      if (c.footer.name) meta.appendChild(text(family, true, 14, c.footer.name, p.ink));
      if (c.footer.date) meta.appendChild(text(family, false, 13, c.footer.date, p.ink));
      footer.appendChild(meta);
    }
  }

  return root;
}

function boxOf(node: SceneNode): Box {
  const b = node.absoluteBoundingBox;
  return b ?? { x: node.x, y: node.y, width: node.width, height: node.height };
}

function pageOf(node: BaseNode): PageNode | null {
  let current: BaseNode | null = node;
  while (current && current.type !== "PAGE") current = current.parent;
  return current as PageNode | null;
}

async function liveNode(id?: string): Promise<SceneNode | null> {
  if (!id) return null;
  const node = await figma.getNodeByIdAsync(id);
  if (!node || node.removed || node.type === "PAGE" || node.type === "DOCUMENT") return null;
  return node as SceneNode;
}

export async function removeSticky(entry: JournalEntry): Promise<void> {
  const node = await liveNode(entry.stickyNodeId);
  if (node) node.remove();
}

/**
 * Create or rebuild the sticky for an entry. Returns the sticky id, or undefined
 * when the entry has no linked layer (existing sticky removed).
 */
export async function syncSticky(entry: JournalEntry): Promise<string | undefined> {
  const existing = await liveNode(entry.stickyNodeId);
  const target = await liveNode(entry.nodeId);

  if (!target) {
    if (existing) existing.remove();
    return undefined;
  }

  const sticky = await buildSticky(entry);

  if (existing) {
    // Keep wherever the user moved it.
    const parent = existing.parent ?? pageOf(target);
    const index = parent && "children" in parent ? parent.children.indexOf(existing) : -1;
    sticky.x = existing.x;
    sticky.y = existing.y;
    if (parent && "insertChild" in parent) {
      parent.insertChild(index >= 0 ? index : parent.children.length, sticky);
    }
    existing.remove();
  } else {
    const page = pageOf(target);
    if (page) page.appendChild(sticky);
    const pos = stickyPosition(boxOf(target));
    sticky.x = pos.x;
    sticky.y = pos.y;
  }

  return sticky.id;
}

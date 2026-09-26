import {
  JournalEntry,
  STORAGE_KEY,
  FILE_KEY_STORAGE,
  parseJournal,
  buildNodeUrl,
  toMarkdown,
  cleanNote,
  generateEntryId,
  parseTag,
  cleanHeading,
  parseAuthorDisplay,
  PREFS_STORAGE,
  Author,
} from "./logic";
import { syncSticky, removeSticky, STICKY_ENTRY_KEY } from "./canvas";

figma.notify("Jot v2.1.0 ready");

const post = (msg: object) => figma.ui.postMessage(msg);
const err = (message: string) => post({ type: "ERROR", message });

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

function getJournal(): JournalEntry[] {
  return parseJournal(figma.root.getPluginData(STORAGE_KEY));
}

function setJournal(entries: JournalEntry[]) {
  figma.root.setPluginData(STORAGE_KEY, JSON.stringify(entries));
}

function fileKey(): string | undefined {
  return figma.root.getPluginData(FILE_KEY_STORAGE) || undefined;
}

function sendFileKey() {
  post({ type: "FILE_KEY", fileKey: fileKey() || "" });
}

function sendJournal(entries: JournalEntry[]) {
  post({ type: "JOURNAL", entries });
}

// ---------------------------------------------------------------------------
// Figma-specific helpers
// ---------------------------------------------------------------------------

function selectionContext() {
  const node = figma.currentPage.selection[0];
  const nodeId = node?.id;
  return {
    nodeId,
    nodeName: node?.name,
    nodeUrl: buildNodeUrl(fileKey(), nodeId),
    pageId: figma.currentPage.id,
    pageName: figma.currentPage.name,
  };
}

function currentAuthor(): Author | undefined {
  try {
    const user = figma.currentUser;
    if (!user) return undefined;
    return { name: user.name, photoUrl: user.photoUrl ?? undefined };
  } catch {
    return undefined;
  }
}

function patchEntry(id: string, patch: Partial<JournalEntry>) {
  const entries = getJournal();
  const idx = entries.findIndex((e) => e.id === id);
  if (idx === -1) return;
  entries[idx] = { ...entries[idx], ...patch };
  setJournal(entries);
  sendJournal(entries);
}

// Journal is saved first; canvas failures never lose the entry.
async function syncCanvas(entry: JournalEntry) {
  // Dev Mode is read-only for layers.
  if (figma.editorType === "dev") return;
  try {
    const stickyNodeId = await syncSticky(entry);
    if (stickyNodeId !== entry.stickyNodeId) patchEntry(entry.id, { stickyNodeId });
  } catch (e) {
    console.error("Jot: sticky sync failed", e);
    err("Saved, but the sticky note could not be drawn.");
  }
}

function getPageForNode(node: BaseNode): PageNode | null {
  let current: BaseNode | null = node;
  while (current && current.type !== "PAGE") current = current.parent;
  return current as PageNode | null;
}

function isSceneNode(node: BaseNode): node is SceneNode {
  return (node as any).x !== undefined;
}

// ---------------------------------------------------------------------------
// Message handlers
// ---------------------------------------------------------------------------

function handleGetJournal() {
  sendJournal(getJournal());
}

function handleGetFileKey() {
  sendFileKey();
}

function handleSetFileKey(msg: { fileKey: string }) {
  figma.root.setPluginData(FILE_KEY_STORAGE, msg.fileKey);
  figma.notify("File key saved");
  post({ type: "FILE_KEY", fileKey: msg.fileKey });
}

// Author display toggles are a per-user preference, not per-file.
async function handleGetPrefs() {
  const stored = await figma.clientStorage.getAsync(PREFS_STORAGE);
  post({ type: "PREFS", display: parseAuthorDisplay(stored?.display) });
}

async function handleSetPrefs(msg: { display: unknown }) {
  await figma.clientStorage.setAsync(PREFS_STORAGE, { display: parseAuthorDisplay(msg.display) });
}

type EntryInput = {
  entryType?: unknown;
  heading?: unknown;
  note: unknown;
  display?: unknown;
};

function parseEntryInput(msg: EntryInput) {
  const note = cleanNote(msg.note);
  if (!note) { err("Write a note first."); return null; }
  const type = parseTag(msg.entryType);
  if (type === null) { err("Unknown entry type."); return null; }
  return {
    type,
    heading: cleanHeading(msg.heading),
    note,
    display: parseAuthorDisplay(msg.display),
  };
}

async function handleAddEntry(msg: EntryInput) {
  const input = parseEntryInput(msg);
  if (!input) return;

  const entry: JournalEntry = {
    id: generateEntryId(),
    createdAt: new Date().toISOString(),
    ...input,
    author: currentAuthor(),
    ...selectionContext(),
  };

  const next = [entry, ...getJournal()];
  setJournal(next);
  sendJournal(next);
  figma.notify("Saved to Jot");
  await syncCanvas(entry);
}

async function handleUpdateEntry(msg: EntryInput & { id: string }) {
  const input = parseEntryInput(msg);
  if (!input) return;

  const entries = getJournal();
  const idx = entries.findIndex((e) => e.id === msg.id);
  if (idx === -1) { err("Entry not found."); return; }

  entries[idx] = {
    ...entries[idx],
    ...input,
    updatedAt: new Date().toISOString(),
  };

  setJournal(entries);
  sendJournal(entries);
  figma.notify("Updated entry");
  await syncCanvas(entries[idx]);
}

// Link (or relink) an entry to the current selection and redraw its sticky there.
async function handleLinkEntry(msg: { id: string }) {
  const node = figma.currentPage.selection[0];
  if (!node) { err("Select a layer or frame first."); return; }
  if (node.getPluginData(STICKY_ENTRY_KEY)) { err("Select a layer or frame, not a Jot sticky."); return; }

  const entries = getJournal();
  const idx = entries.findIndex((e) => e.id === msg.id);
  if (idx === -1) { err("Entry not found."); return; }

  // Drop the old sticky so the new one is placed next to the new layer.
  try {
    await removeSticky(entries[idx]);
  } catch (e) {
    console.error("Jot: sticky removal failed", e);
  }

  entries[idx] = {
    ...entries[idx],
    ...selectionContext(),
    stickyNodeId: undefined,
    updatedAt: new Date().toISOString(),
  };

  setJournal(entries);
  sendJournal(entries);
  figma.notify(`Linked to ${node.name}`);
  await syncCanvas(entries[idx]);
}

// Keep the note, drop its link and sticky.
async function handleUnlinkEntry(msg: { id: string }) {
  const entries = getJournal();
  const idx = entries.findIndex((e) => e.id === msg.id);
  if (idx === -1) { err("Entry not found."); return; }

  try {
    await removeSticky(entries[idx]);
  } catch (e) {
    console.error("Jot: sticky removal failed", e);
  }

  const { nodeId: _n, nodeName: _nn, nodeUrl: _u, pageId: _p, pageName: _pn, stickyNodeId: _s, ...rest } = entries[idx];
  entries[idx] = { ...rest, updatedAt: new Date().toISOString() };

  setJournal(entries);
  sendJournal(entries);
  figma.notify("Unlinked");
}

async function handleDeleteEntry(msg: { id: string }) {
  const entries = getJournal();
  const entry = entries.find((e) => e.id === msg.id);
  const next = entries.filter((e) => e.id !== msg.id);
  setJournal(next);
  sendJournal(next);
  figma.notify("Deleted entry");
  if (entry) {
    try {
      await removeSticky(entry);
    } catch (e) {
      console.error("Jot: sticky removal failed", e);
    }
  }
}

// documentAccess: "dynamic-page" requires the async node/page APIs.
async function handleGoToEntry(msg: { id?: string; nodeId?: string }) {
  // Jump to the sticky on canvas, falling back to the linked layer.
  const entry = msg.id ? getJournal().find((e) => e.id === msg.id) : undefined;
  const stickyId = entry?.stickyNodeId;
  const sticky = stickyId ? await figma.getNodeByIdAsync(stickyId) : null;
  const targetId = sticky && !sticky.removed ? stickyId : (entry?.nodeId ?? msg.nodeId);
  if (!targetId) return;

  const node = await figma.getNodeByIdAsync(targetId);
  if (!node || node.removed) {
    err("Linked layer/frame no longer exists.");
    return;
  }

  const page = getPageForNode(node);
  if (page && page !== figma.currentPage) await figma.setCurrentPageAsync(page);

  if (isSceneNode(node)) {
    figma.currentPage.selection = [node];
    figma.viewport.scrollAndZoomIntoView([node]);
  }
}

// Links in notes; plugin UIs can't navigate themselves.
function handleOpenUrl(msg: { url: unknown }) {
  if (typeof msg.url === "string" && /^(https?:|mailto:)/i.test(msg.url)) figma.openExternal(msg.url);
}

function handleExportMd() {
  post({ type: "EXPORT_MD_RESULT", markdown: toMarkdown(getJournal(), fileKey()) });
}

// ---------------------------------------------------------------------------
// Message router
// ---------------------------------------------------------------------------

const handlers: Record<string, (msg: any) => void | Promise<void>> = {
  GET_JOURNAL: handleGetJournal,
  GET_FILE_KEY: handleGetFileKey,
  SET_FILE_KEY: handleSetFileKey,
  GET_PREFS: handleGetPrefs,
  SET_PREFS: handleSetPrefs,
  ADD_ENTRY: handleAddEntry,
  UPDATE_ENTRY: handleUpdateEntry,
  DELETE_ENTRY: handleDeleteEntry,
  LINK_ENTRY: handleLinkEntry,
  UNLINK_ENTRY: handleUnlinkEntry,
  GO_TO_ENTRY: handleGoToEntry,
  EXPORT_MD: handleExportMd,
  OPEN_URL: handleOpenUrl,
};

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

// Fixed size: the UI fills this window and scrolls inside it.
figma.showUI(__html__, { width: 360, height: 720, themeColors: true });
sendFileKey();

figma.ui.onmessage = async (msg) => {
  const handler = handlers[msg.type];
  if (!handler) return;
  try {
    await handler(msg);
  } catch (_e) {
    err("Something went wrong. Try again.");
  }
};

import { describe, it, expect, beforeEach, vi } from "vitest";
import { STORAGE_KEY, FILE_KEY_STORAGE } from "../logic";
import { createCanvasMock } from "./canvasMock";

// ---------------------------------------------------------------------------
// Figma API Mock
// ---------------------------------------------------------------------------
function createFigmaMock() {
  const pluginData: Record<string, string> = {};
  const clientData: Record<string, unknown> = {};
  const postMessage = vi.fn();
  const notify = vi.fn();
  const resize = vi.fn();

  const mockNode = {
    id: "10:20",
    name: "Test Frame",
    type: "FRAME",
    x: 0,
    removed: false,
    parent: { type: "PAGE", id: "page-1", name: "Page 1" } as any,
  };

  const canvas = createCanvasMock();
  const mockPage = Object.assign(canvas.page, { selection: [mockNode] as any[] });
  mockNode.parent = mockPage;

  const figma = {
    root: {
      getPluginData: vi.fn((key: string) => pluginData[key] || ""),
      setPluginData: vi.fn((key: string, val: string) => {
        pluginData[key] = val;
      }),
    },
    currentPage: mockPage as any,
    ui: {
      postMessage,
      resize,
      onmessage: null as ((msg: any) => void) | null,
    },
    notify,
    showUI: vi.fn(),
    clientStorage: {
      getAsync: vi.fn(async (key: string) => clientData[key]),
      setAsync: vi.fn(async (key: string, val: unknown) => {
        clientData[key] = val;
      }),
    },
    ...canvas.api,
    editorType: "figma",
    currentUser: { name: "Michelle Luo", photoUrl: "https://s3-alpha.figma.com/me.png" },
    getNodeByIdAsync: vi.fn(async (id: string) => {
      if (id === mockNode.id) return mockNode;
      return canvas.nodes.get(id) ?? null;
    }),
    setCurrentPageAsync: vi.fn(async (page: any) => {
      figma.currentPage = page;
    }),
    viewport: {
      scrollAndZoomIntoView: vi.fn(),
    },
  };

  return { figma, pluginData, postMessage, notify, resize, mockNode, mockPage, canvas };
}

// ---------------------------------------------------------------------------
// Helper to load the plugin module with mocked figma global
// ---------------------------------------------------------------------------
async function loadPlugin() {
  const mock = createFigmaMock();

  (globalThis as any).figma = mock.figma;
  (globalThis as any).__html__ = "<html></html>";

  vi.resetModules();
  await import("../code");

  const handler = mock.figma.ui.onmessage;
  if (!handler) throw new Error("onmessage handler not set");

  return { ...mock, handler };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("Plugin message handling", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete (globalThis as any).figma;
    delete (globalThis as any).__html__;
  });

  describe("GET_JOURNAL", () => {
    it("returns empty array when no entries exist", async () => {
      const { handler, postMessage } = await loadPlugin();
      postMessage.mockClear();

      handler({ type: "GET_JOURNAL" });

      expect(postMessage).toHaveBeenCalledWith({
        type: "JOURNAL",
        entries: [],
      });
    });

    it("returns stored entries", async () => {
      const { handler, postMessage, figma } = await loadPlugin();
      const entries = [
        { id: "1", createdAt: "2025-01-01", type: "decision", note: "Test" },
      ];
      (figma.root.getPluginData as ReturnType<typeof vi.fn>).mockImplementation(
        (key: string) => key === STORAGE_KEY ? JSON.stringify(entries) : ""
      );
      postMessage.mockClear();

      handler({ type: "GET_JOURNAL" });

      expect(postMessage).toHaveBeenCalledWith({
        type: "JOURNAL",
        entries: [{ ...entries[0], kind: "sticky" }],
      });
    });
  });

  describe("File key management", () => {
    it("stores and retrieves file key", async () => {
      const { handler, postMessage, notify, pluginData } = await loadPlugin();
      postMessage.mockClear();

      handler({ type: "SET_FILE_KEY", fileKey: "ABC123" });

      expect(pluginData[FILE_KEY_STORAGE]).toBe("ABC123");
      expect(notify).toHaveBeenCalledWith("File key saved");
      expect(postMessage).toHaveBeenCalledWith({
        type: "FILE_KEY",
        fileKey: "ABC123",
      });
    });

    it("returns empty file key when none set", async () => {
      const { handler, postMessage } = await loadPlugin();
      postMessage.mockClear();

      handler({ type: "GET_FILE_KEY" });

      expect(postMessage).toHaveBeenCalledWith({
        type: "FILE_KEY",
        fileKey: "",
      });
    });
  });

  describe("ADD_ENTRY", () => {
    it("adds an entry with selection context", async () => {
      const { handler, postMessage, notify } = await loadPlugin();
      postMessage.mockClear();

      handler({ type: "ADD_ENTRY", entryType: "decision", note: "We chose X" });

      expect(notify).toHaveBeenCalledWith("Saved to Jot");
      const call = postMessage.mock.calls.find(
        (c: any[]) => c[0].type === "JOURNAL"
      );
      expect(call).toBeDefined();
      const entries = call![0].entries;
      expect(entries).toHaveLength(1);
      expect(entries[0].type).toBe("decision");
      expect(entries[0].note).toBe("We chose X");
      expect(entries[0].nodeId).toBe("10:20");
      expect(entries[0].nodeName).toBe("Test Frame");
      expect(entries[0].pageName).toBe("Page 1");
    });

    it("rejects empty note", async () => {
      const { handler, postMessage } = await loadPlugin();
      postMessage.mockClear();

      handler({ type: "ADD_ENTRY", entryType: "decision", note: "   " });

      expect(postMessage).toHaveBeenCalledWith({
        type: "ERROR",
        message: "Write a note first.",
      });
    });

    it("rejects unknown entry type", async () => {
      const { handler, postMessage, figma } = await loadPlugin();
      postMessage.mockClear();

      handler({ type: "ADD_ENTRY", entryType: "<b>x</b>", note: "Note" });

      expect(postMessage).toHaveBeenCalledWith({ type: "ERROR", message: "Unknown entry type." });
      expect(figma.root.setPluginData).not.toHaveBeenCalled();
    });

    it("trims whitespace from note", async () => {
      const { handler, postMessage } = await loadPlugin();
      postMessage.mockClear();

      handler({ type: "ADD_ENTRY", entryType: "assumption", note: "  trimmed  " });

      const call = postMessage.mock.calls.find(
        (c: any[]) => c[0].type === "JOURNAL"
      );
      expect(call![0].entries[0].note).toBe("trimmed");
    });

    it("prepends new entry to existing ones", async () => {
      const { handler, postMessage, figma } = await loadPlugin();
      const existing = [
        { id: "old", createdAt: "2025-01-01", type: "decision", note: "Old" },
      ];
      (figma.root.getPluginData as ReturnType<typeof vi.fn>).mockImplementation(
        (key: string) => key === STORAGE_KEY ? JSON.stringify(existing) : ""
      );
      postMessage.mockClear();

      handler({ type: "ADD_ENTRY", entryType: "debt", note: "New entry" });

      const call = postMessage.mock.calls.find(
        (c: any[]) => c[0].type === "JOURNAL"
      );
      const entries = call![0].entries;
      expect(entries).toHaveLength(2);
      expect(entries[0].note).toBe("New entry");
      expect(entries[1].note).toBe("Old");
    });
  });

  describe("ADD_ENTRY kinds", () => {
    const lastEntries = (postMessage: any) =>
      postMessage.mock.calls.find((c: any[]) => c[0].type === "JOURNAL")![0].entries;

    it("defaults to sticky with no tag", async () => {
      const { handler, postMessage } = await loadPlugin();
      handler({ type: "ADD_ENTRY", entryType: "", note: "N" });
      const [e] = lastEntries(postMessage);
      expect(e.kind).toBe("sticky");
      expect(e.type).toBeUndefined();
    });

    it("stores annotation kind, heading and display", async () => {
      const { handler, postMessage } = await loadPlugin();
      handler({
        type: "ADD_ENTRY",
        kind: "annotation",
        heading: " Colour ",
        note: "N",
        display: { avatar: false, name: true, timestamp: false },
      });
      const [e] = lastEntries(postMessage);
      expect(e).toMatchObject({
        kind: "annotation",
        heading: "Colour",
        display: { avatar: false, name: true, timestamp: false },
      });
    });

    it("rejects unknown kind", async () => {
      const { handler, postMessage } = await loadPlugin();
      handler({ type: "ADD_ENTRY", kind: "bogus", note: "N" });
      expect(postMessage).toHaveBeenCalledWith({ type: "ERROR", message: "Unknown entry kind." });
    });
  });

  describe("UPDATE_ENTRY kind", () => {
    it("keeps existing kind when none is sent", async () => {
      const { handler, postMessage, figma } = await loadPlugin();
      const entries = [{ id: "e1", createdAt: "2025-01-01", kind: "annotation", note: "N" }];
      (figma.root.getPluginData as ReturnType<typeof vi.fn>).mockImplementation(
        (key: string) => key === STORAGE_KEY ? JSON.stringify(entries) : ""
      );
      postMessage.mockClear();
      handler({ type: "UPDATE_ENTRY", id: "e1", entryType: "debt", note: "M" });
      const e = postMessage.mock.calls.find((c: any[]) => c[0].type === "JOURNAL")![0].entries[0];
      expect(e.kind).toBe("annotation");
    });
  });

  describe("Prefs", () => {
    it("returns default display when nothing is stored", async () => {
      const { handler, postMessage } = await loadPlugin();
      postMessage.mockClear();
      await handler({ type: "GET_PREFS" });
      expect(postMessage).toHaveBeenCalledWith({
        type: "PREFS",
        display: { avatar: true, name: true, timestamp: true },
      });
    });

    it("round-trips SET_PREFS", async () => {
      const { handler, postMessage } = await loadPlugin();
      await handler({ type: "SET_PREFS", display: { avatar: false, name: true, timestamp: false } });
      postMessage.mockClear();
      await handler({ type: "GET_PREFS" });
      expect(postMessage).toHaveBeenCalledWith({
        type: "PREFS",
        display: { avatar: false, name: true, timestamp: false },
      });
    });
  });

  describe("Sticky canvas sync", () => {
    const lastJournal = (postMessage: any) =>
      postMessage.mock.calls.filter((c: any[]) => c[0].type === "JOURNAL").pop()![0].entries;

    it("ADD_ENTRY stores author and the new sticky id", async () => {
      const { handler, postMessage, canvas } = await loadPlugin();
      await handler({ type: "ADD_ENTRY", note: "N" });
      const [e] = lastJournal(postMessage);
      expect(e.author).toEqual({ name: "Michelle Luo", photoUrl: "https://s3-alpha.figma.com/me.png" });
      expect(canvas.nodes.get(e.stickyNodeId)?.parent).toBe(canvas.page);
    });

    it("annotations get no sticky, and changing kind removes it", async () => {
      const { handler, postMessage, canvas } = await loadPlugin();
      await handler({ type: "ADD_ENTRY", kind: "annotation", note: "N" });
      expect(lastJournal(postMessage)[0].stickyNodeId).toBeUndefined();

      await handler({ type: "ADD_ENTRY", note: "S" });
      const sticky = lastJournal(postMessage)[0];
      await handler({ type: "CHANGE_KIND", id: sticky.id, kind: "annotation" });
      expect(canvas.nodes.has(sticky.stickyNodeId)).toBe(false);
      expect(lastJournal(postMessage)[0].stickyNodeId).toBeUndefined();
    });

    it("DELETE_ENTRY removes the sticky", async () => {
      const { handler, postMessage, canvas } = await loadPlugin();
      await handler({ type: "ADD_ENTRY", note: "N" });
      const [e] = lastJournal(postMessage);
      await handler({ type: "DELETE_ENTRY", id: e.id });
      expect(canvas.nodes.has(e.stickyNodeId)).toBe(false);
    });

    it("skips canvas in Dev Mode but still saves", async () => {
      const { handler, postMessage, figma } = await loadPlugin();
      (figma as any).editorType = "dev";
      await handler({ type: "ADD_ENTRY", note: "N" });
      expect(lastJournal(postMessage)[0].stickyNodeId).toBeUndefined();
      expect(figma.createFrame).not.toHaveBeenCalled();
    });

    it("reports a drawing failure without losing the entry", async () => {
      const { handler, postMessage, figma } = await loadPlugin();
      figma.createFrame.mockImplementation(() => { throw new Error("boom"); });
      vi.spyOn(console, "error").mockImplementation(() => {});
      await handler({ type: "ADD_ENTRY", note: "N" });
      expect(lastJournal(postMessage)).toHaveLength(1);
      expect(postMessage).toHaveBeenCalledWith({
        type: "ERROR",
        message: "Saved, but the sticky note could not be drawn.",
      });
    });

    it("GO_TO_ENTRY selects the sticky for sticky entries", async () => {
      const { handler, postMessage, figma, canvas } = await loadPlugin();
      await handler({ type: "ADD_ENTRY", note: "N" });
      const [e] = lastJournal(postMessage);
      await handler({ type: "GO_TO_ENTRY", id: e.id, nodeId: e.nodeId });
      expect(figma.currentPage.selection).toEqual([canvas.nodes.get(e.stickyNodeId)]);
    });
  });

  describe("CHANGE_KIND", () => {
    it("switches kind and keeps createdAt", async () => {
      const { handler, postMessage, notify, figma } = await loadPlugin();
      const entries = [{ id: "e1", createdAt: "2025-01-01", kind: "sticky", note: "N" }];
      (figma.root.getPluginData as ReturnType<typeof vi.fn>).mockImplementation(
        (key: string) => key === STORAGE_KEY ? JSON.stringify(entries) : ""
      );
      postMessage.mockClear();

      handler({ type: "CHANGE_KIND", id: "e1", kind: "annotation" });

      expect(notify).toHaveBeenCalledWith("Changed to annotation");
      const e = postMessage.mock.calls.find((c: any[]) => c[0].type === "JOURNAL")![0].entries[0];
      expect(e).toMatchObject({ kind: "annotation", createdAt: "2025-01-01" });
      expect(e.updatedAt).toBeDefined();
    });

    it("errors on unknown id", async () => {
      const { handler, postMessage } = await loadPlugin();
      handler({ type: "CHANGE_KIND", id: "nope", kind: "sticky" });
      expect(postMessage).toHaveBeenCalledWith({ type: "ERROR", message: "Entry not found." });
    });
  });

  describe("UPDATE_ENTRY", () => {
    it("updates an existing entry", async () => {
      const { handler, postMessage, notify, figma } = await loadPlugin();
      const entries = [
        { id: "e1", createdAt: "2025-01-01", type: "decision", note: "Original" },
      ];
      (figma.root.getPluginData as ReturnType<typeof vi.fn>).mockImplementation(
        (key: string) => key === STORAGE_KEY ? JSON.stringify(entries) : ""
      );
      postMessage.mockClear();

      handler({ type: "UPDATE_ENTRY", id: "e1", entryType: "tradeoff", note: "Updated" });

      expect(notify).toHaveBeenCalledWith("Updated entry");
      const call = postMessage.mock.calls.find(
        (c: any[]) => c[0].type === "JOURNAL"
      );
      const updated = call![0].entries[0];
      expect(updated.type).toBe("tradeoff");
      expect(updated.note).toBe("Updated");
      expect(updated.updatedAt).toBeDefined();
    });

    it("rejects empty note on update", async () => {
      const { handler, postMessage } = await loadPlugin();
      postMessage.mockClear();

      handler({ type: "UPDATE_ENTRY", id: "e1", entryType: "decision", note: "" });

      expect(postMessage).toHaveBeenCalledWith({
        type: "ERROR",
        message: "Write a note first.",
      });
    });

    it("rejects unknown entry type", async () => {
      const { handler, postMessage } = await loadPlugin();
      postMessage.mockClear();

      handler({ type: "UPDATE_ENTRY", id: "e1", entryType: "bogus", note: "x" });

      expect(postMessage).toHaveBeenCalledWith({ type: "ERROR", message: "Unknown entry type." });
    });

    it("returns error for non-existent entry", async () => {
      const { handler, postMessage, figma } = await loadPlugin();
      (figma.root.getPluginData as ReturnType<typeof vi.fn>).mockImplementation(
        () => "[]"
      );
      postMessage.mockClear();

      handler({ type: "UPDATE_ENTRY", id: "missing", entryType: "decision", note: "x" });

      expect(postMessage).toHaveBeenCalledWith({
        type: "ERROR",
        message: "Entry not found.",
      });
    });
  });

  describe("DELETE_ENTRY", () => {
    it("removes the entry by id", async () => {
      const { handler, postMessage, notify, figma } = await loadPlugin();
      (figma.root.getPluginData as ReturnType<typeof vi.fn>).mockImplementation(
        (key: string) => key === STORAGE_KEY ? JSON.stringify([
          { id: "e1", createdAt: "2025-01-01", type: "decision", note: "Keep" },
          { id: "e2", createdAt: "2025-01-02", type: "debt", note: "Delete me" },
        ]) : ""
      );
      postMessage.mockClear();

      handler({ type: "DELETE_ENTRY", id: "e2" });

      expect(notify).toHaveBeenCalledWith("Deleted entry");
      const call = postMessage.mock.calls.find(
        (c: any[]) => c[0].type === "JOURNAL"
      );
      const entries = call![0].entries;
      expect(entries).toHaveLength(1);
      expect(entries[0].id).toBe("e1");
    });
  });

  describe("RESIZE", () => {
    it("calls figma.ui.resize with dimensions", async () => {
      const { handler, resize } = await loadPlugin();

      handler({ type: "RESIZE", width: 400, height: 600 });

      expect(resize).toHaveBeenCalledWith(400, 600);
    });
  });

  describe("GO_TO_ENTRY", () => {
    it("selects and scrolls to the node", async () => {
      const { handler, figma, mockNode } = await loadPlugin();

      await handler({ type: "GO_TO_ENTRY", nodeId: "10:20" });

      expect(figma.getNodeByIdAsync).toHaveBeenCalledWith("10:20");
      expect(figma.setCurrentPageAsync).not.toHaveBeenCalled();
      expect(figma.viewport.scrollAndZoomIntoView).toHaveBeenCalledWith([mockNode]);
    });

    it("switches page when the node is on another page", async () => {
      const { handler, figma, mockNode } = await loadPlugin();
      const otherPage = { type: "PAGE", id: "page-2", name: "Page 2", selection: [] };
      mockNode.parent = otherPage;

      await handler({ type: "GO_TO_ENTRY", nodeId: "10:20" });

      expect(figma.setCurrentPageAsync).toHaveBeenCalledWith(otherPage);
      expect(otherPage.selection).toEqual([mockNode]);
    });

    it("shows error for non-existent node", async () => {
      const { handler, postMessage } = await loadPlugin();
      postMessage.mockClear();

      await handler({ type: "GO_TO_ENTRY", nodeId: "99:99" });

      expect(postMessage).toHaveBeenCalledWith({
        type: "ERROR",
        message: "Linked layer/frame no longer exists.",
      });
    });

    it("does nothing when nodeId is missing", async () => {
      const { handler, figma } = await loadPlugin();
      (figma.getNodeByIdAsync as ReturnType<typeof vi.fn>).mockClear();

      await handler({ type: "GO_TO_ENTRY" });

      expect(figma.getNodeByIdAsync).not.toHaveBeenCalled();
    });
  });

  describe("EXPORT_MD", () => {
    it("returns markdown export", async () => {
      const { handler, postMessage, figma } = await loadPlugin();
      (figma.root.getPluginData as ReturnType<typeof vi.fn>).mockImplementation(
        (key: string) => key === STORAGE_KEY ? JSON.stringify([
          { id: "1", createdAt: "2025-06-15T10:00:00.000Z", type: "decision", note: "Test export" },
        ]) : ""
      );
      postMessage.mockClear();

      handler({ type: "EXPORT_MD" });

      const call = postMessage.mock.calls.find(
        (c: any[]) => c[0].type === "EXPORT_MD_RESULT"
      );
      expect(call).toBeDefined();
      expect(call![0].markdown).toContain("Jot");
      expect(call![0].markdown).toContain("Test export");
    });
  });

  describe("Plugin initialization", () => {
    it("calls showUI on load", async () => {
      const { figma } = await loadPlugin();
      expect(figma.showUI).toHaveBeenCalledWith("<html></html>", {
        width: 360,
        height: 520,
        themeColors: true,
      });
    });

    it("sends FILE_KEY on load", async () => {
      const { postMessage } = await loadPlugin();
      expect(postMessage).toHaveBeenCalledWith({
        type: "FILE_KEY",
        fileKey: "",
      });
    });

    it("notifies on load", async () => {
      const { notify } = await loadPlugin();
      expect(notify).toHaveBeenCalledWith("Jot v2.0.1 ready");
    });
  });
});

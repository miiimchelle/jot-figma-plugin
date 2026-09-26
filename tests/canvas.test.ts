import { describe, it, expect, beforeEach, vi } from "vitest";
import { createCanvasMock } from "./canvasMock";
import { syncSticky, removeSticky, syncAnnotation, removeAnnotation, STICKY_ENTRY_KEY } from "../canvas";
import { JournalEntry } from "../logic";

let mock: ReturnType<typeof createCanvasMock>;

const entry = (over: Partial<JournalEntry> = {}): JournalEntry => ({
  id: "e1",
  createdAt: "2025-09-29T10:00:00Z",
  kind: "sticky",
  heading: "Colour and typography",
  note: "Merge collections.",
  nodeId: "10:20",
  author: { name: "Luis", photoUrl: "https://s3-alpha.figma.com/p.png" },
  ...over,
});

beforeEach(() => {
  mock = createCanvasMock();
  (globalThis as any).figma = mock.api;
});

describe("syncSticky", () => {
  it("creates a sticky right of the layer with heading, note, name and date", async () => {
    const id = await syncSticky(entry());
    const sticky = mock.nodes.get(id!)!;
    expect(sticky.parent).toBe(mock.page);
    expect({ x: sticky.x, y: sticky.y, width: sticky.width }).toEqual({ x: 324, y: 50, width: 300 });
    expect(sticky.getPluginData(STICKY_ENTRY_KEY)).toBe("e1");
    expect(mock.texts(sticky)).toEqual(["Colour and typography", "Merge collections.", "Luis", "29 September 2025"]);
    expect(mock.api.createImageAsync).toHaveBeenCalledWith("https://s3-alpha.figma.com/p.png");
  });

  it("omits heading and footer when empty or toggled off", async () => {
    const id = await syncSticky(
      entry({ heading: undefined, display: { avatar: false, name: false, timestamp: false } })
    );
    const sticky = mock.nodes.get(id!)!;
    expect(mock.texts(sticky)).toEqual(["Merge collections."]);
    expect(sticky.children.map((c) => c.name)).toEqual(["Body"]);
  });

  it("falls back to initials when the avatar fails to load", async () => {
    mock.api.createImageAsync.mockRejectedValueOnce(new Error("blocked"));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const id = await syncSticky(entry({ display: { avatar: true, name: false, timestamp: false } }));
    expect(mock.texts(mock.nodes.get(id!)!)).toContain("L");
  });

  it("rebuilds in place, keeping a moved position", async () => {
    const first = mock.nodes.get((await syncSticky(entry()))!)!;
    first.x = 999;
    const id = await syncSticky(entry({ stickyNodeId: first.id, note: "Edited" }));
    expect(first.removed).toBe(true);
    const next = mock.nodes.get(id!)!;
    expect(next.x).toBe(999);
    expect(mock.texts(next)).toContain("Edited");
  });

  it("removes the sticky for annotations and unlinked entries", async () => {
    const sticky = mock.nodes.get((await syncSticky(entry()))!)!;
    expect(await syncSticky(entry({ kind: "annotation", stickyNodeId: sticky.id }))).toBeUndefined();
    expect(sticky.removed).toBe(true);
    expect(await syncSticky(entry({ nodeId: undefined }))).toBeUndefined();
  });
});

describe("removeSticky", () => {
  it("removes the sticky and ignores missing ones", async () => {
    const sticky = mock.nodes.get((await syncSticky(entry()))!)!;
    await removeSticky(entry({ stickyNodeId: sticky.id }));
    expect(sticky.removed).toBe(true);
    await expect(removeSticky(entry({ stickyNodeId: "gone" }))).resolves.toBeUndefined();
  });
});

describe("syncAnnotation", () => {
  const ann = (over: Partial<JournalEntry> = {}) =>
    entry({ kind: "annotation", type: "tradeoff", heading: undefined, display: { avatar: false, name: false, timestamp: false }, ...over });

  it("adds an annotation next to the user's own ones", async () => {
    mock.target.annotations = [{ label: "Theirs" }];
    expect(await syncAnnotation(ann())).toBe("Trade-off: Merge collections.");
    expect(mock.target.annotations).toEqual([{ label: "Theirs" }, { label: "Trade-off: Merge collections." }]);
  });

  it("updates its own annotation in place, keeping the category", async () => {
    mock.target.annotations = [{ label: "Trade-off: Merge collections.", categoryId: "c1" }, { label: "Theirs" }];
    const text = await syncAnnotation(ann({ note: "Edited", annotationText: "Trade-off: Merge collections." }));
    expect(mock.target.annotations).toEqual([{ label: text, categoryId: "c1" }, { label: "Theirs" }]);
  });

  it("removes its annotation when changed to sticky or deleted, leaving others", async () => {
    mock.target.annotations = [{ label: "Theirs" }, { label: "Mine" }];
    expect(await syncAnnotation(ann({ kind: "sticky", annotationText: "Mine" }))).toBeUndefined();
    expect(mock.target.annotations).toEqual([{ label: "Theirs" }]);
    mock.target.annotations = [{ label: "Mine" }];
    await removeAnnotation(ann({ annotationText: "Mine" }));
    expect(mock.target.annotations).toEqual([]);
  });

  it("skips unlinked entries and rejects layers without annotations", async () => {
    expect(await syncAnnotation(ann({ nodeId: undefined }))).toBeUndefined();
    delete mock.target.annotations;
    await expect(syncAnnotation(ann())).rejects.toThrow("cannot hold annotations");
  });
});

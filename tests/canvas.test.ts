import { describe, it, expect, beforeEach, vi } from "vitest";
import { createCanvasMock } from "./canvasMock";
import { syncSticky, removeSticky, STICKY_ENTRY_KEY } from "../canvas";
import { JournalEntry } from "../logic";

let mock: ReturnType<typeof createCanvasMock>;

const entry = (over: Partial<JournalEntry> = {}): JournalEntry => ({
  id: "e1",
  createdAt: "2025-09-29T10:00:00Z",
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

  it("removes the sticky when the entry has no linked layer", async () => {
    const sticky = mock.nodes.get((await syncSticky(entry()))!)!;
    expect(await syncSticky(entry({ nodeId: undefined, stickyNodeId: sticky.id }))).toBeUndefined();
    expect(sticky.removed).toBe(true);
  });
});

describe("sticky colours and pill", () => {
  const fill = (n: any) => n.fills[0].color;

  it("uses the tag colour and adds a pill above the heading", async () => {
    const sticky = mock.nodes.get((await syncSticky(entry({ type: "tradeoff" })))!)!;
    expect(fill(sticky)).toEqual({ r: 0xed / 255, g: 0xe9 / 255, b: 0xfe / 255 });
    expect(mock.texts(sticky).slice(0, 2)).toEqual(["Trade-off", "Colour and typography"]);
  });

  it("keeps yellow and no pill when untagged", async () => {
    const sticky = mock.nodes.get((await syncSticky(entry()))!)!;
    expect(fill(sticky)).toEqual({ r: 0xfd / 255, g: 0xf1 / 255, b: 0xc9 / 255 });
    expect(mock.texts(sticky)[0]).toBe("Colour and typography");
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

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

  it("shows the pill label in all caps", async () => {
    const sticky = mock.nodes.get((await syncSticky(entry({ type: "tradeoff" })))!)!;
    const pillText = sticky.children[0].children[0].children[0].children[0];
    expect(pillText).toMatchObject({ characters: "Trade-off", textCase: "UPPER" });
  });

  it("has no icon", async () => {
    await syncSticky(entry({ type: "tradeoff" }));
    expect(mock.api.createNodeFromSvg).not.toHaveBeenCalled();
  });

  it("uses neutral grey and no pill when untagged", async () => {
    const sticky = mock.nodes.get((await syncSticky(entry()))!)!;
    expect(fill(sticky)).toEqual({ r: 0xf4 / 255, g: 0xf4 / 255, b: 0xf5 / 255 });
    expect(mock.texts(sticky)[0]).toBe("Colour and typography");
  });
});

describe("note formatting on the sticky", () => {
  const noteNode = (sticky: any): any => {
    const find = (n: any): any => (n.type === "TEXT" && n.characters.startsWith("We") ? n : n.children.map(find).find(Boolean));
    return find(sticky);
  };

  it("renders bold, italic, links and lists as Figma text ranges", async () => {
    const md = "We chose **X** over *Y*, see [docs](https://x.io)\n\n- one\n  - two\n\n1. first";
    const sticky = mock.nodes.get((await syncSticky(entry({ heading: undefined, note: md })))!)!;
    const t = noteNode(sticky);
    expect(t.characters).toBe("We chose X over Y, see docs\none\ntwo\nfirst");
    expect(t.ranges).toEqual([
      ["font", 9, 10, { family: "Roboto Mono", style: "Bold" }],
      ["font", 16, 17, { family: "Roboto Mono", style: "Italic" }],
      ["link", 23, 27, { type: "URL", value: "https://x.io" }],
      ["decoration", 23, 27, "UNDERLINE"],
      ["list", 28, 31, { type: "UNORDERED" }],
      ["list", 32, 35, { type: "UNORDERED" }],
      ["indent", 32, 35, 1],
      ["list", 36, 41, { type: "ORDERED" }],
    ]);
  });

  it("falls back to upright when the italic font is missing", async () => {
    mock.api.loadFontAsync.mockImplementation(async (f: any) => {
      if (f.style.includes("Italic")) throw new Error("missing");
    });
    const t = noteNode(mock.nodes.get((await syncSticky(entry({ heading: undefined, note: "We *so*" })))!)!);
    expect(t.ranges).toEqual([["font", 3, 5, { family: "Roboto Mono", style: "Regular" }]]);
  });
});

describe("stacking stickies on one layer", () => {
  const add = async (id: string) => mock.nodes.get((await syncSticky(entry({ id })))!)!;

  it("stacks new stickies below each other, 16px apart", async () => {
    const [a, b, c] = [await add("e1"), await add("e2"), await add("e3")];
    expect([a, b, c].map((s) => ({ x: s.x, y: s.y }))).toEqual([
      { x: 324, y: 50 },
      { x: 324, y: 166 },
      { x: 324, y: 282 },
    ]);
  });

  it("closes the gap when a sticky is removed", async () => {
    const [a, b, c] = [await add("e1"), await add("e2"), await add("e3")];
    await removeSticky(entry({ id: "e2", stickyNodeId: b.id }));
    expect([a.y, c.y]).toEqual([50, 166]);
  });

  it("leaves a sticky the user moved out of the column alone", async () => {
    const a = await add("e1");
    a.x = 900;
    a.y = 700;
    const b = await add("e2");
    expect({ x: b.x, y: b.y }).toEqual({ x: 324, y: 50 });
    expect({ x: a.x, y: a.y }).toEqual({ x: 900, y: 700 });
  });

  it("pushes lower stickies down when one gets taller", async () => {
    const [a, b] = [await add("e1"), await add("e2")];
    a.height = 300;
    await removeSticky(entry({ id: "none", stickyNodeId: (await add("e3")).id }));
    expect(b.y).toBe(366);
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

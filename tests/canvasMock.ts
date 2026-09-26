import { vi } from "vitest";

// Minimal scene graph for canvas tests: nodes, children, plugin data.
export type MockNode = Record<string, any> & {
  id: string;
  type: string;
  children: MockNode[];
  parent: MockNode | null;
  removed: boolean;
};

export function createCanvasMock() {
  const nodes = new Map<string, MockNode>();
  let nextId = 100;

  function node(type: string, props: Record<string, any> = {}): MockNode {
    const data: Record<string, string> = {};
    const n: MockNode = {
      id: props.id ?? `${nextId++}:1`,
      type,
      name: "",
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      children: [],
      parent: null,
      removed: false,
      characters: "",
      ...props,
      appendChild(child: MockNode) {
        n.insertChild(n.children.length, child);
      },
      insertChild(index: number, child: MockNode) {
        if (child.parent) child.parent.children = child.parent.children.filter((c) => c !== child);
        n.children.splice(index, 0, child);
        child.parent = n;
      },
      remove() {
        n.removed = true;
        if (n.parent) n.parent.children = n.parent.children.filter((c) => c !== n);
        nodes.delete(n.id);
      },
      resize(w: number, h: number) {
        n.width = w;
        n.height = h;
      },
      setPluginData(k: string, v: string) {
        data[k] = v;
      },
      getPluginData(k: string) {
        return data[k] ?? "";
      },
    };
    nodes.set(n.id, n);
    return n;
  }

  const page = node("PAGE", { id: "page-1", name: "Page 1" });
  const target = node("FRAME", {
    id: "10:20",
    name: "Test Frame",
    absoluteBoundingBox: { x: 100, y: 50, width: 200, height: 80 },
    annotations: [],
  });
  page.appendChild(target);

  const api = {
    createFrame: vi.fn(() => node("FRAME")),
    createText: vi.fn(() => node("TEXT")),
    createEllipse: vi.fn(() => node("ELLIPSE")),
    createNodeFromSvg: vi.fn(() => node("FRAME")),
    loadFontAsync: vi.fn(async () => {}),
    createImageAsync: vi.fn(async () => ({ hash: "img-hash" })),
    getNodeByIdAsync: vi.fn(async (id: string) => nodes.get(id) ?? null),
  };

  const texts = (root: MockNode): string[] =>
    root.type === "TEXT" ? [root.characters] : root.children.flatMap(texts);

  return { api, nodes, page, target, node, texts };
}

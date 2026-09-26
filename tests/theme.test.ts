import { afterEach, describe, expect, it, vi } from "vitest";
import { syncTheme } from "../ui/theme";

const html = document.documentElement.classList;
const body = document.body.classList;
const tick = () => new Promise((r) => setTimeout(r));

let stop: () => void = () => {};

afterEach(() => {
  stop();
  html.remove("figma-light", "figma-dark");
  body.remove("figma-light", "figma-dark");
  vi.unstubAllGlobals();
});

const osDark = (matches: boolean) =>
  vi.stubGlobal("matchMedia", () => ({ matches, addEventListener: vi.fn(), removeEventListener: vi.fn() }));

describe("syncTheme", () => {
  it("falls back to the OS theme outside Figma", () => {
    osDark(true);
    stop = syncTheme();
    expect(body.contains("figma-dark")).toBe(true);
  });

  it("uses Figma's theme and adds no fallback", () => {
    html.add("figma-dark");
    stop = syncTheme();
    expect(body.contains("figma-light") || body.contains("figma-dark")).toBe(false);
  });

  it("drops the fallback when Figma sets its theme after start-up", async () => {
    osDark(false);
    stop = syncTheme();
    expect(body.contains("figma-light")).toBe(true);
    html.add("figma-dark");
    await tick();
    expect(body.contains("figma-light")).toBe(false);
  });
});

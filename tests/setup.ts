import { cleanup } from "@testing-library/preact";
import { afterEach, vi } from "vitest";

// jsdom lacks these; the library's Dropdown and Textbox call them.
Element.prototype.scrollIntoView = vi.fn();
// ProseMirror (Note editor) measures selections.
const rect = () => ({ x: 0, y: 0, top: 0, left: 0, right: 0, bottom: 0, width: 0, height: 0, toJSON: () => ({}) });
Range.prototype.getBoundingClientRect = rect as never;
Range.prototype.getClientRects = (() => []) as never;
document.elementFromPoint = () => null;
document.execCommand = vi.fn(() => true);

afterEach(() => cleanup());

import { cleanup } from "@testing-library/preact";
import { afterEach, vi } from "vitest";

// jsdom lacks these; the library's Dropdown and Textbox call them.
Element.prototype.scrollIntoView = vi.fn();
document.execCommand = vi.fn(() => true);

afterEach(() => cleanup());

import { act, fireEvent, render, screen, within } from "@testing-library/preact";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Editor } from "@tiptap/core";
import { App } from "../ui/App";

type Msg = { type: string; [key: string]: unknown };
let sent: Msg[];

beforeEach(() => {
  sent = [];
  // In jsdom window.parent === window, so this also stops the UI hearing its own messages.
  vi.spyOn(window.parent, "postMessage").mockImplementation(
    (data: unknown) => void sent.push((data as { pluginMessage: Msg }).pluginMessage)
  );
});

const receive = (msg: object) =>
  act(() => void window.dispatchEvent(new MessageEvent("message", { data: { pluginMessage: msg } })));

const last = (type: string) => sent.filter((m) => m.type === type).pop();

/** Tabs and dropdown options are radio inputs; tab values are "Write", "Entries", "Settings". */
const pick = (value: string) => fireEvent.click(document.querySelector(`input[type=radio][value="${value}"]`)!);

const type = (id: string, value: string) => fireEvent.input(document.getElementById(id)!, { target: { value } });

/** The Note field is a Tiptap editor; Tiptap exposes it on its DOM node. */
const noteEditor = () => (document.getElementById("note") as unknown as { editor: Editor }).editor;
const setNote = (md: string) => act(() => void noteEditor().commands.setContent(md, { contentType: "markdown" }));
const noteMarkdown = () => noteEditor().getMarkdown().trim();

const click = (text: string) => fireEvent.click(screen.getByText(text, { selector: "button, button *" }));

const ENTRIES = [
  { id: "a", createdAt: "2025-01-01T00:00:00Z", type: "tradeoff", heading: "Colour", note: "<b>Merge</b>", pageName: "P", nodeName: "Hero", nodeId: "1:2" },
  { id: "b", createdAt: "2025-01-02T00:00:00Z", type: "debt", note: "Hex values", updatedAt: "2025-01-03T00:00:00Z" },
  { id: "c", createdAt: "2025-01-03T00:00:00Z", note: "Untagged" },
];

function openEntries(entries: object[] = ENTRIES) {
  pick("Entries");
  receive({ type: "JOURNAL", entries });
}

describe("start-up", () => {
  it("requests journal, file key and prefs, and never resizes the window", () => {
    render(<App />);
    expect(sent.map((m) => m.type)).toEqual(["GET_JOURNAL", "GET_FILE_KEY", "GET_PREFS"]);
    expect(screen.queryByLabelText("Drag to resize")).toBeNull();
  });

  it("opens Settings on first launch without a file key, only once", () => {
    render(<App />);
    receive({ type: "FILE_KEY", fileKey: "" });
    expect(document.getElementById("fileUrlInput")).not.toBeNull();
    pick("Write");
    receive({ type: "FILE_KEY", fileKey: "" });
    expect(document.getElementById("note")).not.toBeNull();
  });
});

describe("Write", () => {
  beforeEach(() => void render(<App />));

  it("saves with default tag, empty heading and all author toggles on", () => {
    setNote("We chose X");
    click("Save entry");
    expect(last("ADD_ENTRY")).toEqual({
      type: "ADD_ENTRY",
      entryType: "decision",
      heading: "",
      note: "We chose X",
      display: { avatar: true, name: true, timestamp: true },
    });
  });

  it("sends the picked tag, 'No tag' as empty, and the heading", () => {
    pick("tradeoff");
    type("heading", "Colour");
    click("Save entry");
    expect(last("ADD_ENTRY")).toMatchObject({ entryType: "tradeoff", heading: "Colour" });
    pick("none");
    click("Save entry");
    expect(last("ADD_ENTRY")?.entryType).toBe("");
  });

  it("remembers toggles via SET_PREFS and applies PREFS", () => {
    fireEvent.click(screen.getByLabelText("Avatar"));
    expect(last("SET_PREFS")).toEqual({ type: "SET_PREFS", display: { avatar: false, name: true, timestamp: true } });
    receive({ type: "PREFS", display: { avatar: true, name: false, timestamp: false } });
    expect((screen.getByLabelText("Name") as HTMLInputElement).checked).toBe(false);
  });

  it("clears the form when the journal comes back after saving", () => {
    setNote("Draft");
    receive({ type: "JOURNAL", entries: [] });
    expect(noteMarkdown()).toBe("");
  });

  it("shows plugin errors and clears them on save", () => {
    receive({ type: "ERROR", message: "Write a note first." });
    expect(screen.getByRole("alert").textContent).toContain("Write a note first.");
    click("Save entry");
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

describe("Note editor", () => {
  beforeEach(() => void render(<App />));

  const tool = (label: string) => {
    const button = screen.getByLabelText(label);
    fireEvent.mouseDown(button);
    fireEvent.click(button);
  };

  it("wraps checkbox text so it can be aligned with the box", () => {
    expect([...document.querySelectorAll(".checkbox-label")].map((l) => l.textContent)).toEqual(["Avatar", "Name", "Timestamp"]);
  });

  it("pins Save to the bottom, below the editor", () => {
    expect(document.querySelector(".write-footer")?.textContent).toBe("Save entry");
  });

  it("saves formatting from the toolbar as Markdown", () => {
    setNote("Ship it");
    act(() => void noteEditor().commands.selectAll());
    tool("Bold");
    act(() => void noteEditor().commands.selectAll());
    tool("Bullet list");
    expect(screen.getByLabelText("Bold").getAttribute("aria-pressed")).toBe("true");
    click("Save entry");
    expect(last("ADD_ENTRY")?.note).toBe("- **Ship it**");
  });

  it("adds a link to the selected text", () => {
    setNote("Spec");
    act(() => void noteEditor().commands.selectAll());
    tool("Link");
    type("noteLinkUrl", "https://x.io");
    click("Apply");
    expect(noteMarkdown()).toBe("[Spec](https://x.io)");
  });

  it("loads a formatted note in edit mode", () => {
    pick("Entries");
    receive({ type: "JOURNAL", entries: [{ id: "a", createdAt: "2025-01-01T00:00:00Z", note: "*Why*\n\n1. one" }] });
    click("Edit");
    expect(noteMarkdown()).toBe("*Why*\n\n1. one");
  });
});

describe("Edit mode", () => {
  beforeEach(() => {
    render(<App />);
    openEntries([{ ...ENTRIES[0], display: { avatar: false, name: true, timestamp: true } }]);
    click("Edit");
  });

  it("fills the form and sends UPDATE_ENTRY", () => {
    expect((document.getElementById("heading") as HTMLInputElement).value).toBe("Colour");
    expect((screen.getByLabelText("Avatar") as HTMLInputElement).checked).toBe(false);
    click("Update entry");
    expect(last("UPDATE_ENTRY")).toMatchObject({ id: "a", entryType: "tradeoff", note: "<b>Merge</b>" });
  });

  it("does not remember toggles while editing, and Cancel edit resets", () => {
    fireEvent.click(screen.getByLabelText("Name"));
    expect(last("SET_PREFS")).toBeUndefined();
    click("Cancel edit");
    expect(screen.getByText("Save entry")).toBeTruthy();
    expect(noteMarkdown()).toBe("");
    expect(last("GET_PREFS")).toBeDefined();
  });
});

describe("Entries", () => {
  beforeEach(() => void render(<App />));

  it("requests the journal when opened", () => {
    pick("Entries");
    expect(last("GET_JOURNAL")).toBeDefined();
  });

  it("renders rows with readable pills, heading, edited flag, link and text-only notes", () => {
    openEntries();
    const rows = document.querySelectorAll(".entry");
    expect(rows).toHaveLength(3);
    expect(rows[0].querySelector(".pill")?.textContent).toBe("Trade-off");
    expect(rows[0].querySelector(".entry-heading")?.textContent).toBe("Colour");
    expect(rows[0].querySelector(".entry-note")?.textContent).toBe("<b>Merge</b>");
    expect(rows[0].querySelector("b")).toBeNull();
    expect(rows[0].textContent).toContain("Linked to: P → Hero");
    expect(rows[1].textContent).toContain("(edited)");
    expect(rows[1].textContent).toContain("Linked to: (not linked)");
    expect(rows[2].querySelector(".pill")).toBeNull();
    expect(screen.getByText("3 entries")).toBeTruthy();
  });

  it("renders note formatting and opens links through the plugin", () => {
    openEntries([{ ...ENTRIES[0], note: "**Bold** [spec](https://x.io)\n\n- one\n\n1. first" }]);
    const note = document.querySelector(".entry-note")!;
    expect(note.querySelector("strong")?.textContent).toBe("Bold");
    expect([...note.querySelectorAll(".note-marker")].map((m) => m.textContent)).toEqual(["•", "1."]);
    fireEvent.click(note.querySelector("a")!);
    expect(last("OPEN_URL")).toEqual({ type: "OPEN_URL", url: "https://x.io" });
    expect(last("GO_TO_ENTRY")).toBeUndefined();
  });

  it("shows empty states", () => {
    openEntries([]);
    expect(screen.getByText("No entries yet")).toBeTruthy();
    openEntries([ENTRIES[2]]);
    pick("debt");
    expect(screen.getByText("No entries match this filter.")).toBeTruthy();
  });

  it("filters by tag and by 'No tag' with a count", () => {
    openEntries();
    pick("debt");
    expect(document.querySelectorAll(".entry")).toHaveLength(1);
    expect(screen.getByText("1 of 3 entries")).toBeTruthy();
    pick("none");
    expect(document.querySelector(".entry-note")?.textContent).toBe("Untagged");
  });

  it("jumps to linked layers on click or Enter, not for unlinked rows", () => {
    openEntries();
    const rows = document.querySelectorAll(".entry");
    fireEvent.click(rows[0]);
    fireEvent.keyDown(rows[0], { key: "Enter" });
    fireEvent.click(rows[1]);
    expect(sent.filter((m) => m.type === "GO_TO_ENTRY")).toEqual([
      { type: "GO_TO_ENTRY", id: "a", nodeId: "1:2" },
      { type: "GO_TO_ENTRY", id: "a", nodeId: "1:2" },
    ]);
  });

  it("shows link buttons by link state without triggering the row jump", () => {
    openEntries();
    const labels = (i: number) =>
      [...document.querySelectorAll(".entry")[i].querySelectorAll("button")].map((b) => b.textContent);
    expect(labels(0)).toEqual(["Edit", "Change link", "Unlink", "Delete"]);
    expect(labels(1)).toEqual(["Edit", "Link to selection", "Delete"]);
    click("Change link");
    click("Unlink");
    fireEvent.click(within(document.querySelectorAll<HTMLElement>(".entry")[1]).getByText("Link to selection"));
    expect(sent.filter((m) => /LINK|GO_TO/.test(m.type))).toEqual([
      { type: "LINK_ENTRY", id: "a" },
      { type: "UNLINK_ENTRY", id: "a" },
      { type: "LINK_ENTRY", id: "b" },
    ]);
  });

  it("deletes only after confirming", () => {
    openEntries([ENTRIES[1]]);
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    click("Delete");
    expect(last("DELETE_ENTRY")).toBeUndefined();
    click("Delete");
    expect(last("DELETE_ENTRY")).toEqual({ type: "DELETE_ENTRY", id: "b" });
    confirm.mockRestore();
  });

  it("exports Markdown and copies it", () => {
    openEntries();
    expect(document.querySelector(".toolbar")?.textContent).toContain("Export markdown");
    click("Export markdown");
    expect(last("EXPORT_MD")).toBeDefined();
    receive({ type: "EXPORT_MD_RESULT", markdown: "# Jot" });
    expect((document.getElementById("md") as HTMLTextAreaElement).value).toBe("# Jot");
    click("Copy to clipboard");
    expect(document.execCommand).toHaveBeenCalledWith("copy");
    expect(screen.getByText("Copied!")).toBeTruthy();
  });
});

describe("Settings", () => {
  beforeEach(() => {
    render(<App />);
    pick("Settings");
  });

  it("rejects text without a file key", () => {
    type("fileUrlInput", "hello");
    click("Save");
    expect(screen.getByRole("alert").textContent).toContain("Could not find a file key");
    expect(last("SET_FILE_KEY")).toBeUndefined();
  });

  it("saves the key from a Figma URL and shows it", () => {
    type("fileUrlInput", "https://www.figma.com/design/ABC123def456/Jot");
    click("Save");
    expect(last("SET_FILE_KEY")).toEqual({ type: "SET_FILE_KEY", fileKey: "ABC123def456" });
    receive({ type: "FILE_KEY", fileKey: "ABC123def456" });
    expect(screen.getByText("File key saved: ABC123def456")).toBeTruthy();
  });
});

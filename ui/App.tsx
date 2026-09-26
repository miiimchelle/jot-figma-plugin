import { Banner, IconWarning16, Tabs } from "@create-figma-plugin/ui";
import { useEffect, useRef, useState } from "preact/hooks";
import { AuthorDisplay, DEFAULT_AUTHOR_DISPLAY, JournalEntry, extractFileKey } from "../logic";
import { InMessage, send } from "./bridge";
import { EntriesPanel } from "./EntriesPanel";
import { SettingsPanel } from "./SettingsPanel";
import { Form, NO_TAG, WritePanel } from "./WritePanel";

// Tab values double as their labels in the Tabs component.
export const TAB = { write: "Write", entries: "Entries", settings: "Settings" } as const;
type Tab = (typeof TAB)[keyof typeof TAB];

const EMPTY_FORM: Form = { tag: "decision", heading: "", note: "" };

export function App() {
  const [tab, setTab] = useState<Tab>(TAB.write);
  const [error, setError] = useState("");
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  // Bumped whenever the form is replaced rather than typed into, so the Note editor reloads.
  const [formKey, setFormKey] = useState(0);
  const [display, setDisplay] = useState<AuthorDisplay>(DEFAULT_AUTHOR_DISPLAY);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [markdown, setMarkdown] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [fileUrl, setFileUrl] = useState("");
  const [savedKey, setSavedKey] = useState("");
  const fileKeySeen = useRef(false);

  function changeTab(next: Tab) {
    setTab(next);
    if (next === TAB.entries) {
      setMarkdown(null);
      send({ type: "GET_JOURNAL" });
    }
    if (next === TAB.settings) send({ type: "GET_FILE_KEY" });
  }

  function exitEditMode() {
    setEditingId(null);
    setForm((f) => ({ ...f, heading: "", note: "" }));
    setFormKey((k) => k + 1);
  }

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const msg = event.data?.pluginMessage as InMessage | undefined;
      if (!msg) return;
      switch (msg.type) {
        case "ERROR":
          setError(msg.message);
          break;
        case "FILE_KEY": {
          const key = msg.fileKey || "";
          setFileUrl(key);
          setSavedKey(key);
          // First launch without a file key: open Settings.
          if (!key && !fileKeySeen.current) changeTab(TAB.settings);
          fileKeySeen.current = true;
          break;
        }
        case "JOURNAL":
          exitEditMode();
          setMarkdown(null);
          setEntries(msg.entries || []);
          break;
        case "EXPORT_MD_RESULT":
          setMarkdown(msg.markdown);
          break;
        case "PREFS":
          setDisplay(msg.display);
          break;
      }
    }
    window.addEventListener("message", onMessage);
    send({ type: "GET_JOURNAL" });
    send({ type: "GET_FILE_KEY" });
    send({ type: "GET_PREFS" });
    return () => window.removeEventListener("message", onMessage);
  }, []);

  function save() {
    setError("");
    const payload = {
      entryType: form.tag === NO_TAG ? "" : form.tag,
      heading: form.heading,
      note: form.note,
      display,
    };
    send(editingId ? { type: "UPDATE_ENTRY", id: editingId, ...payload } : { type: "ADD_ENTRY", ...payload });
  }

  function cancelEdit() {
    exitEditMode();
    setError("");
    send({ type: "GET_PREFS" });
  }

  function changeDisplay(next: AuthorDisplay) {
    setDisplay(next);
    // Toggles while editing apply to that entry only, not the remembered default.
    if (!editingId) send({ type: "SET_PREFS", display: next });
  }

  function edit(e: JournalEntry) {
    setError("");
    setEditingId(e.id);
    setForm({ tag: e.type || NO_TAG, heading: e.heading || "", note: e.note });
    setFormKey((k) => k + 1);
    if (e.display) setDisplay(e.display);
    setTab(TAB.write);
    setTimeout(() => (document.getElementById("note") as HTMLElement | null)?.focus());
  }

  function saveFileKey() {
    const key = extractFileKey(fileUrl);
    if (!key) {
      setError("Could not find a file key. Paste the full Figma URL from your browser.");
      return;
    }
    setError("");
    send({ type: "SET_FILE_KEY", fileKey: key });
  }

  function copyMarkdown() {
    const md = document.getElementById("md") as HTMLTextAreaElement | null;
    md?.select();
    document.execCommand("copy");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const panels = {
    [TAB.write]: (
      <WritePanel
        form={form}
        formKey={formKey}
        onFormChange={setForm}
        display={display}
        onDisplayChange={changeDisplay}
        editing={editingId !== null}
        onSave={save}
        onCancel={cancelEdit}
      />
    ),
    [TAB.entries]: (
      <EntriesPanel
        entries={entries}
        filter={filter}
        onFilterChange={setFilter}
        markdown={markdown}
        copied={copied}
        onExport={() => {
          setError("");
          send({ type: "EXPORT_MD" });
        }}
        onCopy={copyMarkdown}
        onGoTo={(e) => send({ type: "GO_TO_ENTRY", id: e.id, nodeId: e.nodeId! })}
        onOpenLink={(url) => send({ type: "OPEN_URL", url })}
        onEdit={edit}
        onLink={(e) => {
          setError("");
          send({ type: "LINK_ENTRY", id: e.id });
        }}
        onUnlink={(e) => {
          setError("");
          send({ type: "UNLINK_ENTRY", id: e.id });
        }}
        onDelete={(e) => {
          setError("");
          if (confirm("Delete this entry?")) send({ type: "DELETE_ENTRY", id: e.id });
        }}
      />
    ),
    [TAB.settings]: (
      <SettingsPanel fileUrl={fileUrl} onFileUrlChange={setFileUrl} savedKey={savedKey} onSave={saveFileKey} />
    ),
  };

  return (
    <div class="app">
      <Tabs
        options={Object.values(TAB).map((value) => ({ value, children: null }))}
        value={tab}
        onValueChange={(value) => changeTab(value as Tab)}
      />
      {error && (
        <div class="error" role="alert">
          <Banner icon={<IconWarning16 />} variant="warning">
            {error}
          </Banner>
        </div>
      )}
      {panels[tab]}
    </div>
  );
}

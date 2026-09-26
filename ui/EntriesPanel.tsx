import { Button, Dropdown, TextboxMultiline } from "@create-figma-plugin/ui";
import { ENTRY_TYPES, TAG_LABELS, JournalEntry, filterEntries, isEntryType } from "../logic";

const FILTER_OPTIONS = [
  { value: "all", text: "All tags" },
  "-" as const,
  ...ENTRY_TYPES.map((t) => ({ value: t, text: TAG_LABELS[t] })),
  { value: "none", text: "No tag" },
];

// TextboxMultiline's props type omits readOnly, but it passes it through to the <textarea>.
const READ_ONLY = { readOnly: true } as object;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export type EntryActions = {
  onGoTo: (e: JournalEntry) => void;
  onEdit: (e: JournalEntry) => void;
  onLink: (e: JournalEntry) => void;
  onUnlink: (e: JournalEntry) => void;
  onDelete: (e: JournalEntry) => void;
};

type Props = EntryActions & {
  entries: JournalEntry[];
  filter: string;
  onFilterChange: (filter: string) => void;
  markdown: string | null;
  copied: boolean;
  onExport: () => void;
  onCopy: () => void;
};

export function EntriesPanel(props: Props) {
  const { entries, filter, onFilterChange, markdown, copied, onExport, onCopy } = props;
  const filtered = filterEntries(entries, filter);
  const count =
    filter === "all" ? plural(entries.length, "entry", "entries") : `${filtered.length} of ${plural(entries.length, "entry", "entries")}`;

  return (
    <div class="panel">
      <div class="toolbar">
        <div class="toolbar-filter">
          <Dropdown options={FILTER_OPTIONS} value={filter} onValueChange={onFilterChange} />
        </div>
        {entries.length > 0 && <div class="entry-count">{count}</div>}
      </div>

      <div class="entry-list">
        {!entries.length ? (
          <div class="empty-state">
            <div class="empty-state-title">No entries yet</div>
            <div>
              Select a frame or layer in Figma, go to <strong>Write</strong>, and capture your first decision.
            </div>
          </div>
        ) : !filtered.length ? (
          <div class="empty-state">No entries match this filter.</div>
        ) : (
          filtered.map((e) => <EntryRow key={e.id} entry={e} {...props} />)
        )}
      </div>

      <div class="footer">
        <div class="footer-buttons">
          <Button secondary fullWidth onClick={onExport}>
            Export Markdown
          </Button>
          {markdown !== null && (
            <Button secondary fullWidth onClick={onCopy}>
              {copied ? "Copied!" : "Copy to clipboard"}
            </Button>
          )}
        </div>
        {markdown !== null && (
          <TextboxMultiline id="md" rows={6} value={markdown} aria-label="Markdown export" {...READ_ONLY} />
        )}
      </div>
    </div>
  );
}

function EntryRow({ entry: e, onGoTo, onEdit, onLink, onUnlink, onDelete }: EntryActions & { entry: JournalEntry }) {
  const tag = isEntryType(e.type) ? e.type : undefined;
  const linked = e.pageName && e.nodeName ? `${e.pageName} → ${e.nodeName}` : e.pageName || "(not linked)";
  const goTo = e.nodeId ? () => onGoTo(e) : undefined;

  return (
    <div
      class={"entry" + (goTo ? " clickable" : "")}
      role={goTo ? "button" : undefined}
      tabIndex={goTo ? 0 : undefined}
      onClick={goTo}
      onKeyDown={(ev) => {
        if (goTo && ev.target === ev.currentTarget && (ev.key === "Enter" || ev.key === " ")) {
          ev.preventDefault();
          goTo();
        }
      }}
    >
      <div class="entry-meta">
        {tag && <span class={`pill pill--${tag}`}>{TAG_LABELS[tag]}</span>}
        <span>
          {new Date(e.createdAt).toLocaleString()}
          {e.updatedAt ? " (edited)" : ""}
        </span>
      </div>
      {e.heading && <div class="entry-heading">{e.heading}</div>}
      <div class="entry-note">{e.note}</div>
      <div class="entry-linked">Linked to: {linked}</div>
      {/* Buttons must not trigger the row's jump-to-layer click. */}
      <div class="entry-actions" onClick={(ev) => ev.stopPropagation()} onKeyDown={(ev) => ev.stopPropagation()}>
        <Button secondary onClick={() => onEdit(e)}>
          Edit
        </Button>
        <Button
          secondary
          title={
            e.nodeId
              ? "Move this note to the layer or frame selected in Figma"
              : "Link this note to the layer or frame selected in Figma"
          }
          onClick={() => onLink(e)}
        >
          {e.nodeId ? "Change link" : "Link to selection"}
        </Button>
        {e.nodeId && (
          <Button secondary title="Remove the link and its sticky. The note stays in Jot." onClick={() => onUnlink(e)}>
            Unlink
          </Button>
        )}
        <Button secondary danger onClick={() => onDelete(e)}>
          Delete
        </Button>
      </div>
    </div>
  );
}

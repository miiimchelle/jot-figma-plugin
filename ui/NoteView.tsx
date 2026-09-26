import { NoteSpan, listNumbers, parseNote } from "../logic";

function Span({ span, onOpenLink }: { span: NoteSpan; onOpenLink: (url: string) => void }) {
  let node = <>{span.text}</>;
  if (span.italic) node = <em>{node}</em>;
  if (span.bold) node = <strong>{node}</strong>;
  if (span.href) {
    const href = span.href;
    node = (
      <a
        href={href}
        title={href}
        onClick={(e) => {
          // Plugin UIs can't navigate; the plugin opens the link.
          e.preventDefault();
          e.stopPropagation();
          onOpenLink(href);
        }}
      >
        {node}
      </a>
    );
  }
  return node;
}

/** Read-only note: the same Markdown subset the editor writes, rendered as text (no HTML injection). */
export function NoteView({ note, onOpenLink }: { note: string; onOpenLink: (url: string) => void }) {
  const blocks = parseNote(note);
  const numbers = listNumbers(blocks);
  return (
    <div class="entry-note">
      {blocks.map((b, i) => (
        <div
          key={i}
          class={b.kind === "paragraph" ? "note-p" : "note-li"}
          style={b.kind === "paragraph" ? undefined : { paddingLeft: `${16 + b.depth * 16}px` }}
        >
          {b.kind !== "paragraph" && <span class="note-marker">{b.kind === "bullet" ? "•" : `${numbers[i]}.`}</span>}
          {b.spans.map((s, j) => (
            <Span key={j} span={s} onOpenLink={onOpenLink} />
          ))}
        </div>
      ))}
    </div>
  );
}

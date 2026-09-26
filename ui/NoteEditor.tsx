import { Button, IconBold24, IconItalic24, IconLink24, Textbox } from "@create-figma-plugin/ui";
import { Editor } from "@tiptap/core";
import { Markdown } from "@tiptap/markdown";
import StarterKit from "@tiptap/starter-kit";
import type { ComponentChildren } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

/** Only what Jot renders on stickies and in exports: bold, italic, lists, links. */
export const noteExtensions = () => [
  StarterKit.configure({
    heading: false,
    blockquote: false,
    code: false,
    codeBlock: false,
    horizontalRule: false,
    strike: false,
    underline: false,
    link: { openOnClick: false, autolink: true, protocols: ["mailto"] },
  }),
  Markdown,
];

const BulletListIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="7" cy="8" r="1" fill="currentColor" />
    <circle cx="7" cy="12" r="1" fill="currentColor" />
    <circle cx="7" cy="16" r="1" fill="currentColor" />
    <path d="M10 8h8M10 12h8M10 16h8" stroke="currentColor" />
  </svg>
);

const NumberedListIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M6 6.5h1v3M6 9.5h2M6 13h1.8l-1.8 2.5h2M10 8h8M10 12h8M10 16h8" stroke="currentColor" />
  </svg>
);

function ToolButton(props: { label: string; active: boolean; onClick: () => void; children: ComponentChildren }) {
  return (
    <button
      type="button"
      class={"note-tool" + (props.active ? " is-active" : "")}
      aria-label={props.label}
      aria-pressed={props.active}
      title={props.label}
      // Keep the editor's selection when clicking the toolbar.
      onMouseDown={(e) => e.preventDefault()}
      onClick={props.onClick}
    >
      {props.children}
    </button>
  );
}

type Props = {
  /** Markdown. Read on mount and whenever `contentKey` changes; typing flows out via onChange. */
  value: string;
  /** Bump to load `value` into the editor. */
  contentKey: number;
  onChange: (markdown: string) => void;
  placeholder?: string;
  /** Test hook. */
  onReady?: (editor: Editor) => void;
};

export function NoteEditor({ value, contentKey, onChange, placeholder, onReady }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [, rerender] = useState(0);
  const [linkUrl, setLinkUrl] = useState<string | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const ed = new Editor({
      element: host.current!,
      extensions: noteExtensions(),
      content: value,
      contentType: "markdown",
      editorProps: { attributes: { id: "note", "aria-label": "Note", "aria-multiline": "true" } },
      onUpdate: ({ editor }) => onChangeRef.current(editor.isEmpty ? "" : editor.getMarkdown().trim()),
      // Toolbar active states follow the selection.
      onTransaction: () => rerender((n) => n + 1),
    });
    setEditor(ed);
    onReady?.(ed);
    return () => ed.destroy();
  }, []);

  // Replace the content only when the parent says so (edit mode, reset after save). Syncing on
  // every `value` change would clobber keystrokes: renders can lag a key or two behind typing.
  useEffect(() => {
    if (editor && contentKey > 0) editor.commands.setContent(value, { contentType: "markdown", emitUpdate: false });
  }, [contentKey, editor]);

  const chain = () => editor!.chain().focus();
  const is = (name: string) => !!editor?.isActive(name);

  function applyLink() {
    const href = (linkUrl ?? "").trim();
    if (!href) chain().extendMarkRange("link").unsetLink().run();
    else if (editor!.state.selection.empty && !is("link")) {
      chain().insertContent({ type: "text", text: href, marks: [{ type: "link", attrs: { href } }] }).run();
    } else chain().extendMarkRange("link").setLink({ href }).run();
    setLinkUrl(null);
  }

  return (
    <div class="note-editor">
      <div class="note-toolbar" role="toolbar" aria-label="Formatting">
        <ToolButton label="Bold" active={is("bold")} onClick={() => chain().toggleBold().run()}>
          <IconBold24 />
        </ToolButton>
        <ToolButton label="Italic" active={is("italic")} onClick={() => chain().toggleItalic().run()}>
          <IconItalic24 />
        </ToolButton>
        <ToolButton label="Bullet list" active={is("bulletList")} onClick={() => chain().toggleBulletList().run()}>
          <BulletListIcon />
        </ToolButton>
        <ToolButton label="Numbered list" active={is("orderedList")} onClick={() => chain().toggleOrderedList().run()}>
          <NumberedListIcon />
        </ToolButton>
        <ToolButton
          label="Link"
          active={is("link") || linkUrl !== null}
          onClick={() => setLinkUrl(linkUrl === null ? (editor?.getAttributes("link").href ?? "") : null)}
        >
          <IconLink24 />
        </ToolButton>
      </div>

      {linkUrl !== null && (
        <div class="note-link-row">
          <div class="note-link-input">
            <Textbox
              id="noteLinkUrl"
              placeholder="https://…"
              value={linkUrl}
              onValueInput={setLinkUrl}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyLink();
                if (e.key === "Escape") setLinkUrl(null);
              }}
            />
          </div>
          <Button secondary onClick={applyLink}>
            {linkUrl.trim() ? "Apply" : "Remove"}
          </Button>
        </div>
      )}

      <div class="note-body" data-placeholder={placeholder} data-empty={!value || undefined} ref={host} />
    </div>
  );
}

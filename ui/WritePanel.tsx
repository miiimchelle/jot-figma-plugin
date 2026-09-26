import { Button, Checkbox, Dropdown, Textbox } from "@create-figma-plugin/ui";
import { ENTRY_TYPES, TAG_LABELS, AuthorDisplay } from "../logic";
import { Field } from "./Field";
import { NoteEditor } from "./NoteEditor";

/** "none" stands in for "no tag" because the dropdown needs a non-empty value. */
export const NO_TAG = "none";

const TAG_OPTIONS = [
  ...ENTRY_TYPES.map((t) => ({ value: t, text: TAG_LABELS[t] })),
  "-" as const,
  { value: NO_TAG, text: "No tag" },
];

const DISPLAY_LABELS: Record<keyof AuthorDisplay, string> = {
  avatar: "Avatar",
  name: "Name",
  timestamp: "Timestamp",
};

export type Form = { tag: string; heading: string; note: string };

type Props = {
  form: Form;
  /** Bumped when the form is replaced from outside (edit, cancel, reset). */
  formKey: number;
  onFormChange: (form: Form) => void;
  display: AuthorDisplay;
  onDisplayChange: (display: AuthorDisplay) => void;
  editing: boolean;
  onSave: () => void;
  onCancel: () => void;
};

export function WritePanel({ form, formKey, onFormChange, display, onDisplayChange, editing, onSave, onCancel }: Props) {
  return (
    <div class="panel write-panel">
      <div class="write-body">
        <Field label="Tag" hint="What kind of thinking are you capturing?">
          <Dropdown options={TAG_OPTIONS} value={form.tag} onValueChange={(tag) => onFormChange({ ...form, tag })} />
        </Field>

        <Field label="Heading (optional)">
          <Textbox
            id="heading"
            placeholder="e.g. Colour and typography"
            value={form.heading}
            onValueInput={(heading) => onFormChange({ ...form, heading })}
          />
        </Field>

        {/* Grows to fill the space above the pinned Save button. */}
        <div class="field field-grow">
          <div class="field-label">Note</div>
          <div class="field-hint">Capture the why, trade-offs, or context behind this.</div>
          <NoteEditor
            value={form.note}
            contentKey={formKey}
            onChange={(note) => onFormChange({ ...form, note })}
            placeholder="e.g. We chose X over Y because…"
          />
        </div>

        <Field label="Show on sticky">
          <div class="toggle-row">
            {(Object.keys(DISPLAY_LABELS) as Array<keyof AuthorDisplay>).map((key) => (
              <Checkbox
                key={key}
                value={display[key]}
                onValueChange={(checked) => onDisplayChange({ ...display, [key]: checked })}
              >
                <span class="checkbox-label">{DISPLAY_LABELS[key]}</span>
              </Checkbox>
            ))}
          </div>
        </Field>
      </div>

      <div class="write-footer">
        {editing && (
          <Button fullWidth secondary onClick={onCancel}>
            Cancel edit
          </Button>
        )}
        <Button fullWidth onClick={onSave}>
          {editing ? "Update entry" : "Save entry"}
        </Button>
      </div>
    </div>
  );
}

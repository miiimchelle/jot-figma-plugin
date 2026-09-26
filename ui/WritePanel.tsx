import { Button, Checkbox, Container, Dropdown, Textbox, TextboxMultiline } from "@create-figma-plugin/ui";
import { ENTRY_TYPES, TAG_LABELS, AuthorDisplay } from "../logic";
import { Field } from "./Field";

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
  onFormChange: (form: Form) => void;
  display: AuthorDisplay;
  onDisplayChange: (display: AuthorDisplay) => void;
  editing: boolean;
  onSave: () => void;
  onCancel: () => void;
};

export function WritePanel({ form, onFormChange, display, onDisplayChange, editing, onSave, onCancel }: Props) {
  return (
    <div class="panel">
      <Container space="medium">
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

        <Field label="Note" hint="Capture the why, trade-offs, or context behind this.">
          <TextboxMultiline
            id="note"
            rows={5}
            placeholder="e.g. We chose X over Y because…"
            value={form.note}
            onValueInput={(note) => onFormChange({ ...form, note })}
          />
        </Field>

        <Field label="Show on sticky">
          <div class="toggle-row">
            {(Object.keys(DISPLAY_LABELS) as Array<keyof AuthorDisplay>).map((key) => (
              <Checkbox
                key={key}
                value={display[key]}
                onValueChange={(checked) => onDisplayChange({ ...display, [key]: checked })}
              >
                {DISPLAY_LABELS[key]}
              </Checkbox>
            ))}
          </div>
        </Field>

        <div class="button-stack">
          <Button fullWidth onClick={onSave}>
            {editing ? "Update entry" : "Save entry"}
          </Button>
          {editing && (
            <Button fullWidth secondary onClick={onCancel}>
              Cancel edit
            </Button>
          )}
        </div>
      </Container>
    </div>
  );
}

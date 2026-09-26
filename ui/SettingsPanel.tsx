import { Button, Container, Textbox } from "@create-figma-plugin/ui";
import { Field } from "./Field";

type Props = {
  fileUrl: string;
  onFileUrlChange: (value: string) => void;
  savedKey: string;
  onSave: () => void;
};

export function SettingsPanel({ fileUrl, onFileUrlChange, savedKey, onSave }: Props) {
  return (
    <div class="panel">
      <Container space="medium">
        <Field
          label="File link (for Markdown export)"
          hint="Paste this file's Figma URL so exported entries include clickable links to layers."
        >
          <Textbox
            id="fileUrlInput"
            placeholder="https://www.figma.com/design/ABC123/…"
            value={fileUrl}
            onValueInput={onFileUrlChange}
          />
        </Field>
        <div class="button-stack">
          <Button fullWidth onClick={onSave}>
            Save
          </Button>
        </div>
        {savedKey && <div class="setup-status">File key saved: {savedKey}</div>}
        <div class="field-hint">Stored per file. You only need to set it once.</div>
      </Container>
    </div>
  );
}

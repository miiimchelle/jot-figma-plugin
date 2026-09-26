import type { ComponentChildren } from "preact";

/** Figma-style form row: small secondary label, optional hint, then the control. */
export function Field({ label, hint, children }: { label: string; hint?: string; children: ComponentChildren }) {
  return (
    <div class="field">
      <div class="field-label">{label}</div>
      {hint && <div class="field-hint">{hint}</div>}
      {children}
    </div>
  );
}

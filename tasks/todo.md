# Sticky + Annotation kinds

Inspired by DSGN Notes. Jot entries get a **kind**: Sticky (WIP, crits) or Annotation (handover).

## Spec

### Kinds

| | Sticky | Annotation |
|---|---|---|
| Purpose | WIP, decisions made in crits | Handover |
| Canvas | Sticky note frame next to the linked layer | Native Figma annotation on the linked layer (Dev Mode) |
| Tag | Optional: decision, assumption, trade-off, feedback, design debt | Same |
| Switch | "Change to annotation": sticky removed, annotation added | "Change to sticky": annotation removed, sticky added |

- Save, edit and delete in Jot update the canvas immediately (no push step).
- Existing entries migrate to `kind: "sticky"` and keep their type as the tag.
- Entry history (created/updated) is kept when the kind changes.

### Add entry tab

- Kind selector (Sticky / Annotation) above the tag dropdown.
- Label "Decision note" becomes "Note".

### View entries tab

- Filters: kind dropdown (All kinds / Stickies / Annotations) next to the tag dropdown.
- Count split by kind.
- Card: kind badge. Actions: Sticky = Edit, Change to annotation, Delete. Annotation = Edit, Change to sticky, Delete.
- Clicking a Sticky card selects the sticky on canvas. Clicking an Annotation card selects the layer.
- Markdown export: "Annotations (handover)" section first, then "Stickies (WIP)".

## Plan

- [ ] 1. Native Figma look: switch UI to Figma theme tokens (light/dark)
- [ ] 2. Data model: `kind` field + migration in `logic.ts`, tests
- [ ] 3. Add entry tab: kind selector, "Note" label
- [ ] 4. View entries tab: kind filter, count, badge, Change to buttons, tests
- [ ] 5. Canvas sync: sticky note frames (create/update/delete)
- [ ] 6. Canvas sync: native annotations (create/update/delete)
- [ ] 7. Export: grouped by kind, tests
- [ ] 8. `npm run build`, `npm test`, changelog

## Open questions

- Sticky placement: right of the linked layer, 24px gap? Unlinked entries: no sticky?
- Annotation label format: tag + note (e.g. "Trade-off: …")?

## Review

—

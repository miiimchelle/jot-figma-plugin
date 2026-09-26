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

### Sticky visual (1x)

- 300px wide, auto height, 12px radius, 1px border, soft drop shadow.
- Font: Roboto Mono. Heading Bold 16, body Regular 14, name Bold 14, date Regular 13.
- Body: bg `#FDF1C9`, tag icon, heading, note indented under heading.
- Footer: bg `#FEFAEB`, top divider, 32px round avatar, name, date ("29 September 2025").
- Text, icon, border: `#4A2511`.
- Icon per tag (icons TBD, pencil as placeholder).
- Heading empty: heading row hidden. All footer toggles off: footer hidden.

### Author options (Sticky and Annotation)

- Heading: optional text field.
- Toggles: avatar, name, timestamp. Last choice remembered (clientStorage).
- Avatar: `figma.currentUser.photoUrl` via `figma.createImageAsync`.
  - Manifest: `permissions: ["currentuser"]`, allow Figma's avatar image domain only (verify exact domain).
  - README: update "No network requests" wording.
- Annotations: heading + author line included in annotation text (no avatar).

### Add entry tab

- Kind selector (Sticky / Annotation) above the tag dropdown.
- Heading field, then note. Label "Decision note" becomes "Note".
- Avatar / name / timestamp toggles below the note.

### View entries tab

- Filters: kind dropdown (All kinds / Stickies / Annotations) next to the tag dropdown.
- Count split by kind.
- Card: kind badge. Actions: Sticky = Edit, Change to annotation, Delete. Annotation = Edit, Change to sticky, Delete.
- Clicking a Sticky card selects the sticky on canvas (after step 5; until then, the layer). Clicking an Annotation card selects the layer.
- Markdown export: "Annotations (handover)" section first, then "Stickies (WIP)".

## Plan

- [x] 1. Native Figma look: switch UI to Figma theme tokens (light/dark)
- [x] 2. Data model: `kind` field + migration in `logic.ts`, tests
- [x] 3. Add entry tab: kind selector, heading, "Note" label, author toggles (remembered)
- [x] 4. View entries tab: kind filter, count, badge, Change to buttons, tests
- [ ] 5. Canvas sync: sticky note frames (create/update/delete), author options, avatar
- [ ] 6. Canvas sync: native annotations (create/update/delete)
- [ ] 7. Export: grouped by kind, tests
- [ ] 8. `npm run build`, `npm test`, changelog

## Decided

- Sticky placement: 24px right of the linked layer. Unlinked entries: no sticky.
- Annotation text: tag + note (e.g. "Trade-off: …").

## Review

—

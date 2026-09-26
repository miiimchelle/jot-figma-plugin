# Sticky + Annotation kinds

> **Annotation kind removed for now (2026-09-26).** Every entry is a sticky. The spec below is kept for when it comes back. Old entries saved with `kind` keep the field in storage; the plugin ignores it.

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
- Body: tag pill (tagged only), heading, note. No icon.
- Footer: bg `#FEFAEB`, top divider, 32px round avatar, name, date ("29 September 2025").
- Colours per tag reuse the plugin pill colours (`TAG_PALETTES` in `logic.ts`): body = pill bg, footer = lighter tint, text = pill text colour, border = pill border. Untagged: body `#FDF1C9`, footer `#FEFAEB`, text/border `#4A2511`.
- Heading empty: heading row hidden. All footer toggles off: footer hidden.

### Author options (Sticky and Annotation)

- Heading: optional text field.
- Toggles: avatar, name, timestamp. Last choice remembered (clientStorage).
- Avatar: `figma.currentUser.photoUrl` via `figma.createImageAsync`.
  - Manifest: `permissions: ["currentuser"]`, allow `https://*.figma.com` only. Verify the real photo domain in Figma; initials fallback covers a mismatch.
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
- [x] 5. Canvas sync: sticky note frames (create/update/delete), author options, avatar
- [ ] 6. Canvas sync: native annotations (create/update/delete). Built, then removed with the Annotation kind
- [ ] 7. Export: grouped by kind, tests
- [ ] 8. `npm run build`, `npm test`, changelog

## Decided

- Sticky placement: 24px right of the linked layer. Unlinked entries: no sticky.
- Annotation text: tag + note (e.g. "Trade-off: …").

## Review

—

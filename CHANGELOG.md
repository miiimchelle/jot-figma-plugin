# Changelog
All notable changes to **Jot** (formerly Baseline) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]
### Added
- —

### Changed
- —

### Fixed
- —

---

## [v2.1.0] - 2026-09-26
### Added
- Sticky notes on canvas: every linked entry gets one, 24px right of its layer, rebuilt on edit (keeping a moved position) and removed on delete
- Colour coding by tag on stickies (Decision blue, Assumption amber, Trade-off purple, Feedback green, Design debt red) with an all-caps tag pill above the heading. Untagged stickies are neutral grey
- Several notes on one layer stack in a column beside it, 16px apart, and re-stack on add, edit, link, unlink and delete. Stickies moved out of the column are left alone
- Rich text notes: bold, italic, bullet and numbered lists, and links from a toolbar (Tiptap). Stored as Markdown, so older plain notes and the Markdown export keep working. Formatting shows on Entries rows and on stickies (Figma font styles, native lists, hyperlinks)
- Optional heading, and author options for stickies (avatar, name, timestamp) remembered per user. Avatar falls back to initials
- Tags are optional ("No tag"), with a "No tag" filter
- Entries: "Link to selection" for unlinked notes; "Change link" (moves the note and its sticky to the selected layer) and "Unlink" (removes the link and sticky, keeps the note) for linked ones
- Links in notes open in the browser via the plugin (http, https and mailto only)

### Changed
- Plugin UI rebuilt with Figma-native components (`@create-figma-plugin/ui`, Preact): tabs (Write, Entries, Settings), dropdowns, text fields, checkboxes, buttons, flat entry rows and a warning banner for errors. Follows Figma's light and dark theme
- Settings moved from the gear button to a Settings tab; the entry count moved from the tab label into the Entries panel
- Fixed 360 × 720 window: auto-resize and the drag handle are gone. On Entries the filter row with "Export markdown" stays put and only the list scrolls
- Write tab: the Note editor fills the window and Save (with Cancel edit) is pinned to the bottom
- Pills show readable labels ("Trade-off", "Design debt"); "Entry type" is now "Tag" and "Decision note" is now "Note"
- Manifest: `currentuser` permission, network access limited to `*.figma.com` (avatar only), UI loads from `dist/ui.html`
- UI source lives in `ui/` and builds to `dist/ui.html`; UI tests are component tests (`@testing-library/preact`)

### Removed
- Annotation entry kind (built, then removed before release). Entries saved with a `kind` field still load as normal notes

---

## [v2.0.1] - 2026-09-26
### Fixed
- Jump to linked layer failed with `documentAccess: dynamic-page`; now uses `getNodeByIdAsync` and `setCurrentPageAsync`
- Notes and layer names are escaped before rendering, so HTML in a note can no longer run in the plugin UI
- Unknown entry types are rejected
- Plugin window now shrinks to fit content, until you drag the resize handle

### Changed
- Removed stray files (`.DS_Store`, `test-results/`, `pippin-code.js`)

---

## [v2.0.0] - 2026-02-24
### Added
- Renamed plugin from Baseline to **Jot**
- **Setup tab**: paste your Figma file URL once per file to enable deep links in Markdown export (replaces private API dependency)
- **Filter by entry type** on the View entries tab
- **Entry count** shown on the View tab and tab button
- **Copy to clipboard** button for Markdown export
- **Improved empty state** with onboarding guidance when no entries exist
- Settings button in the plugin header
- Dev Mode support (`dev` editor type)
- Playwright e2e tests

### Changed
- Removed `enablePrivatePluginApi` — plugin is now compatible with Figma Community publishing
- Storage keys updated to `jot.journal.v1` and `jot.filekey.v1`
- Visual polish across the UI (styles and buttons)
- Manifest: Figma Community plugin ID, no network access, `dynamic-page` document access

### Fixed
- `manifest.json` import bug

---

## [v1.0.1] - 2025-12-16
### Added
- Two-tab layout: **Write entry** and **View entries**
- Shadcn-style tabs UI treatment
- Click an entry to jump to its linked layer/frame
- Edit and delete entries from the entries list

### Changed
- Improved View entries layout so the list doesn't appear visually cut off (better resizing/scroll behavior)
- Markdown export formatting improvements (more structured output)

### Fixed
- —

---

## [v1.0.0] - 2025-12-15
### Added
- Baseline journal entries with entry types (decision, assumption, tradeoff, feedback, debt)
- Save entries linked to current selection (page + node)
- Export journal as Markdown

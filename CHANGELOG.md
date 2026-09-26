# Changelog
All notable changes to **Jot** (formerly Baseline) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]
### Added
- Untagged stickies use neutral grey instead of yellow
- Rich text notes: bold, italic, bullet and numbered lists, and links, from a toolbar in the Note editor (Tiptap). Notes are stored as Markdown, so older plain notes and the Markdown export keep working
- Formatting shows on Entries rows and on canvas stickies (Figma bold/italic styles, native lists, hyperlinks). Links in Entries open via the plugin

### Changed
- Plugin UI rebuilt with Figma-native components (`@create-figma-plugin/ui`, Preact): Figma tabs (Write, Entries, Settings), dropdowns, text fields, checkboxes and buttons, flat entry rows with dividers, warning banner for errors. Follows Figma light and dark themes
- Fixed 360 × 720 window: auto-resize and the drag handle are gone. On Entries the filter row (with "Export markdown") stays put and only the list scrolls
- Write tab: the Note editor fills the window and Save (with Cancel edit) is pinned to the bottom
- Settings moved from the gear button to a Settings tab; the entry count moved from the tab label into the Entries panel
- UI source now lives in `ui/` and builds to `dist/ui.html`; UI tests are component tests (`@testing-library/preact`)

### Fixed
- —

---

## [v2.1.0] - 2026-09-26
### Added
- Optional heading and author display options (avatar, name, timestamp) per entry
- Tags are now optional ("No tag" option)
- Add entry: heading field, avatar/name/timestamp toggles remembered per user
- View entries: "No tag" filter, heading shown on cards
- Colour coding by tag on canvas stickies (Decision blue, Assumption amber, Trade-off purple, Feedback green, Design debt red), with an all-caps tag pill above the heading. Untagged stays yellow. No icon
- View entries: unlinked notes get "Link to selection"; linked notes get "Change link" (moves the note and its sticky to the selected layer) and "Unlink" (removes the link and sticky, keeps the note)
- Several notes on one layer: their stickies stack in a column to the right of the layer, 16px apart, re-stacked on add, edit, link, unlink and delete. Stickies moved out of the column are left alone
- Pills show readable labels ("Trade-off", "Design debt")
- Sticky notes on canvas: every entry with a linked layer gets one, drawn 24px right of the layer, rebuilt on edit (keeping a moved position), removed on delete. Avatar falls back to initials

### Changed
- Manifest: `currentuser` permission, network access limited to `*.figma.com` (avatar only)
- UI follows Figma's light and dark theme (`themeColors`), Inter font
- Add entry: "Entry type" renamed to "Tag", "Decision note" renamed to "Note"

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

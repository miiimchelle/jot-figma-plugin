# Changelog
All notable changes to **Jot** (formerly Baseline) will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project follows [Semantic Versioning](https://semver.org/).

## [Unreleased]
### Added
- Entry kinds: Sticky and Annotation (existing entries migrate to Sticky)
- Optional heading and author display options (avatar, name, timestamp) per entry
- `CHANGE_KIND` message to switch an entry between Sticky and Annotation
- Tags are now optional ("No tag" option)
- Add entry: Sticky/Annotation switch, heading field, avatar/name/timestamp toggles remembered per user
- View entries: kind filter, "No tag" filter, count split by kind, kind badge, heading, Change to annotation/sticky buttons
- Sticky notes on canvas: drawn 24px right of the linked layer, rebuilt on edit (keeping a moved position), removed on delete or change to annotation. Avatar falls back to initials

### Changed
- Manifest: `currentuser` permission, network access limited to `*.figma.com` (avatar only)
- UI follows Figma's light and dark theme (`themeColors`), Inter font
- Add entry: "Entry type" renamed to "Tag", "Decision note" renamed to "Note"

### Fixed
- —

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

# Jot

**Jot** is a lightweight design decision journal for Figma.

It helps designers capture the *why* behind decisions, while context is still fresh.

> Align on why, not just what.

---

## How it works

1. Select a layer or frame in Figma
2. On the **Write** tab, pick a tag (decision, assumption, trade-off, feedback, design debt, or no tag)
3. Add an optional heading and write the note: why you did it, what you traded off
4. Save

Jot draws the note as a **sticky** next to the layer, colour coded by tag (untagged stickies are grey). Several notes on one layer stack in a column beside it.

### Notes

- Format notes with **bold**, *italic*, bullet and numbered lists, and links. Formatting shows in Jot and on the sticky
- Choose what the sticky shows about you: avatar, name, and timestamp. Jot remembers your choice

### Entries

- Click an entry to jump to its sticky or layer
- **Edit**, **Delete**, and **Change link** to move a note to the selected layer, or **Unlink** to remove its link and sticky but keep the note. Unlinked notes get **Link to selection**
- Filter by tag
- **Export markdown** to share notes outside Figma

Jot follows Figma's light and dark theme.

---

## Setup

### Development

```
npm install
npm run build
```

Or rebuild on every change:

```
npm run watch
```

Then load the plugin in Figma via **Plugins > Development > Import plugin from manifest**.

`npm run build` writes `dist/code.js` (plugin, from `code.ts`) and `dist/ui.html` (UI, from `ui/`). The UI is Preact with [`@create-figma-plugin/ui`](https://yuanqing.github.io/create-figma-plugin/ui/) components, so it follows Figma's own look in light and dark mode.

### File linking (optional)

On the **Settings** tab, paste your Figma file URL to enable clickable deep links in Markdown exports. It's stored per file, so you only do it once.

### Tests

```
npm test            # unit and component tests
npm run build       # e2e tests load the built UI
npm run test:e2e    # Playwright e2e tests
```

---

## What Jot is not

- A task tracker
- A design spec
- A comments replacement

Jot won't manage your process. It just remembers what happened.

---

## Security & privacy

- All entries are stored using Figma's plugin data API, so they live inside the Figma file
- No data is sent to external services. Links in notes only open when you click them
- The only network request loads your Figma profile photo (from `*.figma.com`) for the sticky note avatar. Turn off **Avatar** to skip it
- Jot reads your Figma name and photo (`currentuser` permission) to sign sticky notes

Anyone with edit access to the file can view, edit, or delete entries. Treat Jot as a working design journal, not an audit log.

---

## Author

Built by Michelle, a product designer who got tired of design decisions being quietly rewritten.

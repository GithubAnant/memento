# Memento

A fast, local-first editor for the markdown files in your workspace — Obsidian-like, but tailored for a git repo it syncs, pushes, and pulls like a code editor.

![Memento](./assets/screenshot.png)

## Why I made this

I gave my [Poke](https://poke.com) memory write access so it could finally save things somewhere that lasts.

The obvious first option is Poke's own built-in memory. But anyone who's used it knows it kind of sucks — it forgets things, constantly. And I have a few recipes installed that prompt me about my week: the hardships, the challenges, the small wins. All of that was going nowhere.

So I pointed Poke at a private GitHub repo and gave it full access. Now it has a place to write. It can save a memory, come back later, append to it, edit it. It's just markdown on disk, so anything — Poke, Claude Code, a script, me — can read and write it directly.

The point isn't really the tooling. It's that in a few years, if I'm still around, it'll be kind of wonderful to read back through all of it.

Memento is the editor for that repo. It's an Obsidian-style markdown app, except the workspace _is_ a git repo: it clones, auto-fetches as the agent writes remotely, and pushes my occasional edits back — the same sync gestures you'd expect from a code editor, made quiet enough to live in. The agent is the primary writer; I mostly read, and sometimes edit.

See [`SPECs/github-sync-spec.md`](./SPECs/github-sync-spec.md) for how the sync layer works.

## What it does

- Opens a workspace folder of markdown files, kept on disk as plain text.
- Clones a GitHub repo as that workspace, auto-fetches remote changes, and pushes local edits from a subtle status-bar sync control.
- A Source Control view lists working-tree changes, shows per-file diffs, and renders a commit-activity heatmap from local git history.
- Renders extended markdown — tables, Mermaid diagrams — respects workspace `.gitignore` rules, supports multiple windows, and ships with a signed macOS release flow.

## Repository

- `apps/desktop/` — Tauri desktop app.
- `apps/desktop/src/` — React frontend.
- `apps/desktop/src-tauri/src/` — Rust commands, workspace state, watcher, updater, and CLI integration.
- `docs/` — project and agent workflow docs.
- `SPECs/` — feature specs and design notes.

## Development

This repo uses Vite+ through the `vp` CLI. Use `vp` instead of calling the package manager or Vite tooling directly.

```bash
vp install
vp dev
```

## Validation

```bash
vp check
vp test
```

Rust validation runs from the Tauri crate:

```bash
cd apps/desktop/src-tauri
cargo test
cargo clippy
cargo fmt --check
```

## Releases

macOS releases are cut locally with `scripts/distribute.sh`. See `docs/releasing.md` for the signed, notarized release workflow and updater publishing details.

## Credits

Memento is a fork of [**writer-computer**](https://github.com/joelbqz/writer-computer) by [Joel](https://github.com/joelbqz) — the local-first markdown editor that made all of this possible. The GitHub-sync memory layer is built on top of his work. Huge thanks to him for the foundation.

Built with Tauri v2, React, Zustand, CodeMirror, and Rust.

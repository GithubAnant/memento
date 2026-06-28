# Tasks

## In Progress

-

## Up Next

- [ ] GitHub sync Phase 2: real pull/merge + conflict editor. Add a 3-way merge
      path (`do_pull`) that preserves uncommitted edits and auto-merges when
      clean; on a true same-line conflict, write conflict markers and surface an
      in-app resolution editor (VSCode-style accept current/incoming/both),
      replacing the divergence banner's push-or-discard dead-end. Reverses the
      "no 3-way merge" non-goal in [`SPECs/github-sync-spec.md`](SPECs/github-sync-spec.md).

## Backlog

-

## Done

See `CHANGELOG.md` and `git log` for shipped work. Notable items:

- [x] GitHub sync: PAT auth (Keychain), clone to `~/Desktop/Memento/<repo>/`, auto-fetch/fast-forward, push, divergence banner ([`SPECs/github-sync-spec.md`](SPECs/github-sync-spec.md))
- [x] GitHub sync: fetch on app open + workspace switch (no 67s stale window); ahead/behind commit counts surfaced as VSCode-style ↓N / ↓N ↑N on the sync button
- [x] Source Control tab: per-file change list + CodeMirror merge diff + per-file discard + commit/push, Changes/History toggle, top-right sync button
- [x] Stats tab: commit-activity heatmap + headline counts from local git history
- [x] File/View/GitHub/Go native menus; `mainBinaryName` so the Dock reads "Memento"

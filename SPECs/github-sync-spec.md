# GitHub Sync (Auth + Clone + Pull/Push)

## Problem

Memento is a local-only markdown editor: it opens a workspace folder on disk
and has no network, auth, or git layer. The intended use is as an editor UI
over a **memory layer** stored in a **private GitHub repo** — the memory the
Poke AI agent reads and writes. Today that repo can only be viewed on
github.com or cloned by hand. There is no way to authenticate to a private
repo, no way to keep the local copy fresh as the agent writes to it remotely,
and no way to push the user's occasional edits back.

## Goal

Turn Memento into a local editor over a GitHub-backed memory repo, where:

- The repo is cloned to a fixed, visible local path
  (`~/Desktop/Memento/<repo-name>/`) and opened as the workspace.
- The local clone is **plain markdown on disk** so any agent (Poke, Claude
  Code, scripts) can read it directly without git or a token. A pointer file
  records the active path for programmatic discovery.
- **Auto-fetch** keeps the local copy fresh as the agent writes remotely
  (interval + window focus + manual "fetch now"). Fetch fast-forwards.
- A **subtle status-bar sync control** shows sync state and pushes the user's
  local edits on click (commit all dirty files + push; fetch-then-retry if the
  remote moved).
- Auth is **GitHub OAuth device flow**; the token is stored in the OS keychain.
- Git transport is **embedded `git2` (libgit2)** — no shelling out to system
  `git`, no "is git installed" dependency, self-contained in the `.app`.

### Use model (drives the design)

- **Single logical author.** The user and the Poke bot both act as the user's
  GitHub account. There is effectively one author.
- **Agent is the primary writer; the user mostly reads + occasionally edits.**
  Conflicts are rare. Fetch is expected to fast-forward; push is expected to
  succeed or need one fetch-retry.
- Therefore: **no merge UI.** The only divergence path that needs handling is
  "local can't fast-forward" → stop and surface an explicit choice, never
  silently clobber an unpushed edit.

## Design

### Auth (`commands/github_auth.rs`)

- GitHub **OAuth device flow**: `POST /login/device/code` → show user code +
  verification URL (open in browser) → poll `POST /login/oauth/access_token`
  until authorized. Scope: `repo` (private repo read/write).
- Requires a registered GitHub OAuth app **client id** (public, compiled in;
  device flow has no client secret).
- Token stored in **OS keychain** via the `keyring` crate (service
  `com.memento.github`, account `oauth-token`). Never written to the settings
  store or any plaintext file. Read on demand (`crate::github`) — there is no
  in-memory cache, so the keychain is the single source of truth for
  signed-in state.
- IPC: `github_begin_device_auth() -> { user_code, verification_uri, ... }`,
  `github_poll_device_auth() -> { status }` (writes token to keychain on
  success), `github_signed_in() -> bool`, `github_sign_out()` (deletes token).
- An HTTP client is needed for the device-flow endpoints (`reqwest`, or
  `ureq` for a lighter sync client). Git transport itself uses `git2`, not
  HTTP.

### Repo selection + clone (`commands/github_sync.rs`)

- After auth: `github_list_repos()` lists the account's repos (GitHub REST
  `GET /user/repos`, private included) so the user can pick the memory repo;
  a manual `owner/name` entry is also accepted.
- `github_clone_repo(full_name)`:
  - Clones via `git2` to `~/Desktop/Memento/<repo-name>/` using the keychain
    token as the credential (`RemoteCallbacks::credentials` →
    `Cred::userpass_plaintext(token, "")`).
  - Writes the pointer file `~/.memento/state.json`:
    `{ "memoryPath": "<abs clone path>", "repo": "<owner/name>" }`.
  - Opens the clone as the workspace (existing restore/open path).
- No separate sync config is persisted: the active memory repo is simply
  whichever workspace is open, and the `~/.memento/state.json` pointer records
  the path for external agents. The OAuth token (keychain) is the only stored
  secret. Sync state is derived live from `git2` on the open workspace, so
  there is nothing to keep coherent across a settings file.

### Fetch (auto + manual)

- `github_fetch()`:
  - `git2` fetch from `origin`, then attempt **fast-forward** of the checked-
    out branch to the upstream.
  - If fast-forward succeeds: working tree files are updated → the existing
    file watcher fires `fs:file-changed` → UI refreshes (free live update).
  - If the branch **cannot fast-forward** (local diverged — user has unpushed
    edits that touch the same history): do **not** reset. Return a
    `diverged` status; the frontend shows a banner ("Local changes diverged
    from remote — push or discard") and offers push / discard-local actions.
    Fail explicitly, never auto-clobber.
- Triggers (frontend): interval timer (~67s, off the round minute so installs
  don't poll in lockstep), window focus, and tab visibility. All call the same
  `github_fetch`; the sync store's `phase` guard coalesces overlapping
  triggers.
- **No watcher coupling (decided during impl):** git's working-tree writes
  during fetch are intentionally _not_ suppressed. Push is a manual button
  (never auto-fired) so pulled writes can't start a push loop; the dirty count
  comes from `git status` (tree vs HEAD), not watcher events, so fetched files
  never inflate it; and we _want_ a fetched change to fire `fs:file-changed`
  so the open editor reloads fresh remote content. A fast-forward only runs
  when the tree is clean (see Fetch above), so there is no in-progress edit to
  lose. This is simpler and more robust than bracketing the checkout in the
  self-write guard.

### Push (status-bar sync control)

- `github_push()`:
  - Stage all changes (`index.add_all`), commit with an auto message
    (`memento: sync <n> file(s) <iso-timestamp>`; timestamp passed in from the
    frontend since the backend clock helper is fine here — or `chrono`), push
    to `origin`.
  - One commit per push-press, bundling all dirty files (not per-file).
  - If push is **rejected** (remote moved since last fetch): run
    `github_fetch` first; if it fast-forwards, retry push once. If fetch
    reports `diverged` (same file touched both sides), stop and surface the
    divergence banner — do not force-push.
- The sync control lives in the **status bar / bottom corner**. It is both
  indicator and button:
  - `synced` (✓), `dirty` (↑N — N files to push, click to push),
    `fetching`/`pushing` (spinner), `diverged` (! — opens the banner),
    `offline`/`error` (subtle warning).
  - Dirty count derives from `git2` status (working tree vs HEAD).

### Frontend

- `stores/sync-store.ts` — Zustand slice holding sync state (`signedIn`,
  `isRepo`, `phase`, `branch`, `dirtyCount`, `diverged`, `error`); a
  module-level `useWorkspaceStore` subscription re-seeds it on workspace
  change.
- `hooks/use-sync-triggers.ts` — owns the interval + focus + visibility
  listeners (side effects in one place per the guidelines).
- `components/github/` — `connect-store` + `connect-dialog` (onboarding state
  machine), `sync-control` (status-bar indicator/button), `divergence-banner`.
- IPC wrappers live in `lib/tauri.ts` alongside the rest.
- Onboarding flow (first run, no memory configured):
  1. Prompt "Connect GitHub" → device flow (show code, open browser).
  2. List private repos → user selects the memory repo.
  3. Clone to `~/Desktop/Memento/<repo>/` → write pointer file → open as
     workspace.
  4. Thereafter: auto-open that workspace, auto-fetch running, sync control
     live.

## Known behavior / non-goals

- **No 3-way merge, no conflict-marker editing.** The only divergence handling
  is the explicit push-or-discard banner. This matches the single-author,
  agent-primary-writer model; revisit only if the user starts editing heavily
  in parallel with the agent.
- **Discard-local** (from the divergence banner) hard-resets the working tree
  to the remote and is the one destructive action — it is always explicit and
  confirmed, never automatic.
- Token has `repo` scope (full private repo access). A future fine-grained /
  per-repo scoping pass is out of scope for v1.
- Multi-repo / multiple memory vaults is out of scope for v1 (one active
  memory repo at a time); the pointer file is shaped to allow a list later.
- New crate dependencies: `git2`, `keyring`, and an HTTP client
  (`reqwest`/`ureq`). `git2` pulls a C dependency (libgit2) that must be
  vendored/linked in the notarized macOS build.

import { create } from "zustand";
import * as tauri from "@/lib/tauri";
import { useWorkspaceStore } from "@/stores/workspace-store";

/// GitHub sync state for the active workspace.
///
/// The active workspace root doubles as the git repo path — sync operations
/// target whatever folder is open. A workspace that isn't a git repo (or a
/// signed-out user) leaves `isRepo`/`signedIn` false and the status-bar
/// control hides itself. The OAuth token lives only in the keychain (Rust
/// side); this store never holds it.

/// `idle` = no operation in flight. `diverged` is sticky until the user
/// resolves it (push succeeds or they discard), so it's tracked separately
/// from the transient operation phase.
type Phase = "idle" | "fetching" | "pushing";

interface SyncState {
  signedIn: boolean;
  /** Whether the active workspace is a git repo we can sync. */
  isRepo: boolean;
  phase: Phase;
  branch: string;
  dirtyCount: number;
  /** Local diverged from remote and can't fast-forward; surfaces the banner. */
  diverged: boolean;
  /** Last operation error (network/git), shown subtly; cleared on success. */
  error: string | null;

  refreshSignedIn: () => Promise<void>;
  /** Re-read repo status (branch + dirty count) for the current workspace.
   *  Marks `isRepo=false` if the workspace isn't a git repo. */
  refreshStatus: () => Promise<void>;
  /** Fetch + fast-forward. Auto-fetch and the manual "fetch now" both call
   *  this; concurrent calls are coalesced via the `phase` guard. */
  fetch: () => Promise<void>;
  /** Commit all dirty files + push. */
  push: () => Promise<void>;
  /** Discard local changes (hard reset to remote). Destructive — callers
   *  confirm first. */
  discardLocal: () => Promise<void>;
}

function workspaceRoot(): string | null {
  return useWorkspaceStore.getState().root;
}

export const useSyncStore = create<SyncState>((set, get) => ({
  signedIn: false,
  isRepo: false,
  phase: "idle",
  branch: "",
  dirtyCount: 0,
  diverged: false,
  error: null,

  refreshSignedIn: async () => {
    try {
      set({ signedIn: await tauri.githubSignedIn() });
    } catch {
      set({ signedIn: false });
    }
  },

  refreshStatus: async () => {
    const root = workspaceRoot();
    if (!root) {
      set({ isRepo: false });
      return;
    }
    try {
      const status = await tauri.githubSyncStatus(root);
      set({
        isRepo: true,
        branch: status.branch,
        dirtyCount: status.dirty_count,
      });
    } catch {
      // Not a git repo (Repository::open failed) — hide the control.
      set({ isRepo: false });
    }
  },

  fetch: async () => {
    const root = workspaceRoot();
    if (!root || get().phase !== "idle") return;
    set({ phase: "fetching", error: null });
    try {
      const result = await tauri.githubFetch(root);
      set({ diverged: result.diverged });
      await get().refreshStatus();
    } catch (e) {
      set({ error: String(e) });
    } finally {
      set({ phase: "idle" });
    }
  },

  push: async () => {
    const root = workspaceRoot();
    if (!root || get().phase !== "idle") return;
    set({ phase: "pushing", error: null });
    try {
      const count = get().dirtyCount;
      const message = `memento: sync ${count} file${count === 1 ? "" : "s"}`;
      const status = await tauri.githubPush(root, message);
      set({
        branch: status.branch,
        dirtyCount: status.dirty_count,
        diverged: false,
      });
    } catch (e) {
      // The backend signals an unresolvable non-fast-forward as a "diverged"
      // error string; treat that as the banner trigger, anything else as a
      // plain error.
      if (String(e).includes("diverged")) {
        set({ diverged: true });
      } else {
        set({ error: String(e) });
      }
    } finally {
      set({ phase: "idle" });
    }
  },

  discardLocal: async () => {
    const root = workspaceRoot();
    if (!root || get().phase !== "idle") return;
    set({ phase: "fetching", error: null });
    try {
      await tauri.githubDiscardLocal(root);
      set({ diverged: false });
      await get().refreshStatus();
    } catch (e) {
      set({ error: String(e) });
    } finally {
      set({ phase: "idle" });
    }
  },
}));

// Re-evaluate sync state whenever the active workspace changes (open, switch,
// or close). A fresh repo needs its signed-in + status snapshot before the
// status-bar control can render meaningfully.
let lastRoot = useWorkspaceStore.getState().root;
useWorkspaceStore.subscribe((state) => {
  if (state.root === lastRoot) return;
  lastRoot = state.root;
  void useSyncStore.getState().refreshSignedIn();
  void useSyncStore.getState().refreshStatus();
});

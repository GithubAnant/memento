import { create } from "zustand";
import * as tauri from "@/lib/tauri";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useSyncStore } from "@/stores/sync-store";

/// Drives the "Connect GitHub" onboarding flow as a small state machine:
///
///   closed → token (paste PAT) → validating → repos (pick vault) → cloning → done
///
/// Auth is a Personal Access Token: the user pastes it, the backend validates
/// it against the GitHub API and stores it in the keychain, then we list repos
/// so they can pick their memory vault. An already-signed-in user skips
/// straight to repo selection.

type Step = "closed" | "token" | "validating" | "repos" | "cloning" | "error";

interface ConnectState {
  step: Step;
  repos: tauri.RepoInfo[];
  error: string | null;

  /** Entry point: open the dialog. If already signed in, skip to repo
   *  selection; otherwise prompt for a token. */
  open: () => Promise<void>;
  close: () => void;
  /** Validate + store the pasted PAT, then advance to repo selection. */
  submitToken: (token: string) => Promise<void>;
  /** Clone the chosen repo, then open it as the workspace. */
  selectRepo: (fullName: string) => Promise<void>;
}

export const useConnectStore = create<ConnectState>((set) => ({
  step: "closed",
  repos: [],
  error: null,

  open: async () => {
    set({ step: "token", repos: [], error: null });
    try {
      if (await tauri.githubSignedIn()) {
        await loadRepos(set);
      }
    } catch (e) {
      set({ step: "error", error: String(e) });
    }
  },

  close: () => {
    set({ step: "closed", repos: [], error: null });
  },

  submitToken: async (token: string) => {
    if (!token.trim()) return;
    set({ step: "validating", error: null });
    try {
      await tauri.githubSaveToken(token);
      await useSyncStore.getState().refreshSignedIn();
      await loadRepos(set);
    } catch (e) {
      set({ step: "error", error: String(e) });
    }
  },

  selectRepo: async (fullName: string) => {
    set({ step: "cloning", error: null });
    try {
      const { path } = await tauri.githubCloneRepo(fullName);
      // Open the freshly cloned repo as the workspace, then seed sync state.
      await useWorkspaceStore.getState().openWorkspace(path);
      await useSyncStore.getState().refreshSignedIn();
      await useSyncStore.getState().refreshStatus();
      set({ step: "closed", repos: [] });
    } catch (e) {
      set({ step: "error", error: String(e) });
    }
  },
}));

type SetFn = (
  partial: Partial<ConnectState> | ((s: ConnectState) => Partial<ConnectState>),
) => void;

async function loadRepos(set: SetFn) {
  const repos = await tauri.githubListRepos();
  set({ step: "repos", repos });
}

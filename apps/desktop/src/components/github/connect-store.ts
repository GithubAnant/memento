import { create } from "zustand";
import { openUrl } from "@tauri-apps/plugin-opener";
import * as tauri from "@/lib/tauri";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useSyncStore } from "@/stores/sync-store";

/// Drives the "Connect GitHub" onboarding flow as a small state machine:
///
///   closed → device (show code, poll) → repos (pick vault) → cloning → done
///
/// Each step owns its async lifecycle. Polling is a self-rescheduling loop
/// keyed off `pollToken`: closing the dialog bumps the token so any in-flight
/// poll loop exits instead of resurrecting a dismissed flow.

type Step = "closed" | "device" | "repos" | "cloning" | "error";

interface ConnectState {
  step: Step;
  device: tauri.DeviceAuth | null;
  repos: tauri.RepoInfo[];
  error: string | null;
  /** Bumped on close to cancel an in-flight poll loop. */
  pollToken: number;

  /** Entry point: open the dialog and start the device flow. If the user is
   *  already signed in, skip straight to repo selection. */
  open: () => Promise<void>;
  close: () => void;
  /** Clone the chosen repo, then open it as the workspace. */
  selectRepo: (fullName: string) => Promise<void>;
}

export const useConnectStore = create<ConnectState>((set, get) => ({
  step: "closed",
  device: null,
  repos: [],
  error: null,
  pollToken: 0,

  open: async () => {
    set({ step: "device", device: null, repos: [], error: null });
    try {
      if (await tauri.githubSignedIn()) {
        await loadRepos(set);
        return;
      }
      const device = await tauri.githubBeginDeviceAuth();
      set({ device });
      void openUrl(device.verification_uri);
      void pollLoop(get, set, device);
    } catch (e) {
      set({ step: "error", error: String(e) });
    }
  },

  close: () => {
    // Invalidate any running poll loop, then reset.
    set((s) => ({
      step: "closed",
      device: null,
      repos: [],
      error: null,
      pollToken: s.pollToken + 1,
    }));
  },

  selectRepo: async (fullName: string) => {
    set({ step: "cloning", error: null });
    try {
      const { path } = await tauri.githubCloneRepo(fullName);
      // Open the freshly cloned repo as the workspace, then seed sync state.
      await useWorkspaceStore.getState().openWorkspace(path);
      await useSyncStore.getState().refreshSignedIn();
      await useSyncStore.getState().refreshStatus();
      set({ step: "closed", device: null, repos: [] });
    } catch (e) {
      set({ step: "error", error: String(e) });
    }
  },
}));

type SetFn = (
  partial: Partial<ConnectState> | ((s: ConnectState) => Partial<ConnectState>),
) => void;
type GetFn = () => ConnectState;

async function loadRepos(set: SetFn) {
  const repos = await tauri.githubListRepos();
  set({ step: "repos", repos });
}

/// Poll the access-token endpoint at the cadence GitHub dictates, until the
/// flow is authorized, fails, or the dialog is closed (pollToken changes).
async function pollLoop(get: GetFn, set: SetFn, device: tauri.DeviceAuth) {
  const myToken = get().pollToken;
  let interval = device.interval;

  while (get().pollToken === myToken && get().step === "device") {
    await delay(interval * 1000);
    if (get().pollToken !== myToken) return; // dialog closed mid-wait

    try {
      const result = await tauri.githubPollDeviceAuth(device.device_code);
      if (result.status === "authorized") {
        await useSyncStore.getState().refreshSignedIn();
        await loadRepos(set);
        return;
      }
      if (result.status === "failed") {
        set({ step: "error", error: result.message });
        return;
      }
      // pending — GitHub may have asked us to slow down; honor the interval.
      interval = result.interval;
    } catch (e) {
      set({ step: "error", error: String(e) });
      return;
    }
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

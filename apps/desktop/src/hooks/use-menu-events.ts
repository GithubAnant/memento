import { useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import {
  createScmTab,
  createSettingsTab,
  createStatsTab,
  useEditorStore,
} from "@/stores/editor-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { useUIStore } from "@/stores/ui-store";
import { useSyncStore } from "@/stores/sync-store";
import { toggleSidebar } from "@/hooks/use-sidebar";
import { getWorkspaceChromeMode } from "@/lib/compact-mode";
import { scheduleSave } from "@/lib/save";
import * as tauri from "@/lib/tauri";

// Native menu items that drive in-app navigation emit a Tauri event from the
// Rust menu handler. Add the (event-name → handler) pair here to subscribe;
// the hook below registers each entry once for the window's lifetime.
//
// Handlers must read store state at call time (`useStore.getState()`) rather
// than closing over hook callbacks, so the listener registration can stay
// stable across renders.
export const MENU_EVENT_HANDLERS: Record<string, () => void> = {
  "menu:open-preferences": openPreferences,
  "menu:new-file": newFile,
  "menu:open-file": openFile,
  "menu:open-folder": openFolder,
  "menu:save": saveActiveFile,
  "menu:reveal": revealActiveFile,
  "menu:toggle-sidebar": () => toggleSidebar(),
  "menu:command-palette": commandPalette,
  "menu:open-stats": openStats,
  "menu:github-push": () => void useSyncStore.getState().push(),
  "menu:github-fetch": () => void useSyncStore.getState().fetch(),
  "menu:github-changes": openChanges,
  "menu:github-signout": githubSignOut,
  "menu:go-back": () => void useEditorStore.getState().navigateBack(),
  "menu:go-forward": () => void useEditorStore.getState().navigateForward(),
  "menu:go-to-file": goToFile,
  "menu:switch-workspace": openFolder,
};

// Tab-opening and palette actions are meaningless in the standalone
// compact-file chrome (no workspace, no tab strip), so they bail there —
// mirroring the existing `openPreferences` guard.
function isCompactFile(): boolean {
  const { root, chromeMode } = useWorkspaceStore.getState();
  return getWorkspaceChromeMode(root, chromeMode) === "compact-file";
}

function openPreferences() {
  if (isCompactFile()) return;
  useEditorStore
    .getState()
    .openOrFocus((tab) => tab.location.kind === "settings", createSettingsTab);
}

function openStats() {
  if (isCompactFile()) return;
  useEditorStore.getState().openOrFocus((tab) => tab.location.kind === "stats", createStatsTab);
}

function openChanges() {
  if (isCompactFile()) return;
  useEditorStore.getState().openOrFocus((tab) => tab.location.kind === "scm", createScmTab);
}

function commandPalette() {
  if (isCompactFile()) return;
  useUIStore.getState().openCommandPalette("search");
}

function goToFile() {
  if (isCompactFile()) return;
  if (useWorkspaceStore.getState().root) useUIStore.getState().openCommandPalette("search");
}

function newFile() {
  if (isCompactFile()) return;
  if (useWorkspaceStore.getState().root) useUIStore.getState().openCommandPalette("create-file");
}

function openFile() {
  if (isCompactFile()) return;
  if (useWorkspaceStore.getState().root) useUIStore.getState().openCommandPalette("search");
}

function openFolder() {
  void (async () => {
    const picked = await tauri.pickWorkspace();
    if (picked) await useWorkspaceStore.getState().openWorkspace(picked);
  })();
}

function saveActiveFile() {
  const path = useEditorStore.getState().activeFilePath;
  if (path) scheduleSave(path);
}

function revealActiveFile() {
  const path = useEditorStore.getState().activeFilePath;
  if (!path) return;
  void tauri.revealInFileManager(path).catch((error: unknown) => {
    console.error(`Failed to reveal: ${error instanceof Error ? error.message : String(error)}`);
  });
}

function githubSignOut() {
  void useSyncStore.getState().signOut();
}

export function useMenuEvents() {
  useEffect(() => {
    const unlistens = Object.entries(MENU_EVENT_HANDLERS).map(([event, handler]) =>
      listen(event, handler),
    );
    return () => {
      for (const p of unlistens) {
        // Swallow unlisten errors: under StrictMode the effect mounts/unmounts
        // in quick succession, so a listen() promise can resolve after Tauri
        // has already torn the listener down, making the unlisten throw on a
        // missing entry. A failed teardown here is harmless and must not
        // surface as an unhandled rejection.
        void p.then((fn) => fn()).catch(() => {});
      }
    };
  }, []);
}

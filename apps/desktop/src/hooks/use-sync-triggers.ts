import { useEffect } from "react";
import { useSyncStore, watchWorkspaceForSync } from "@/stores/sync-store";

/// Auto-fetch cadence for the active workspace: a periodic interval plus
/// window focus / tab visibility. All three funnel into `sync.fetch()`, whose
/// `phase` guard coalesces overlapping triggers, so a focus event landing
/// mid-interval-fetch is a no-op rather than a double fetch.
///
/// Cadence is intentionally off the round minute (67s) so many installs don't
/// hit the GitHub API in lockstep. Fetch only does work when the workspace is
/// a signed-in git repo; otherwise the backend call fails fast and the store
/// marks `isRepo=false`, so an idle non-repo window costs one cheap probe per
/// interval.
const FETCH_INTERVAL_MS = 67_000;

export function useSyncTriggers() {
  // Track the active workspace and snapshot sync state on mount. Wired here
  // (not as a sync-store module-load side effect) to avoid the workspace-store
  // import-cycle TDZ that otherwise blocks the React mount.
  useEffect(() => {
    // Seed signed-in + repo status, then fetch immediately. Without this the
    // first fetch waits a full FETCH_INTERVAL_MS (or a focus event that never
    // fires on the initial open), so a reopened app trusts its stale local
    // HEAD — letting a push clobber commits the agent made remotely while the
    // app was closed. refreshStatus must resolve first so the isRepo guard in
    // fetch's trigger is meaningful.
    void useSyncStore.getState().refreshSignedIn();
    void useSyncStore
      .getState()
      .refreshStatus()
      .then(() => {
        const { signedIn, isRepo } = useSyncStore.getState();
        if (signedIn && isRepo) void useSyncStore.getState().fetch();
      });
    return watchWorkspaceForSync();
  }, []);

  useEffect(() => {
    const fetchNow = () => {
      const { signedIn, isRepo } = useSyncStore.getState();
      if (signedIn && isRepo) {
        void useSyncStore.getState().fetch();
      }
    };

    const interval = window.setInterval(fetchNow, FETCH_INTERVAL_MS);
    const onFocus = () => fetchNow();
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchNow();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
}

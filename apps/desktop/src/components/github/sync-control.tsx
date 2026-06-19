import { useSyncStore } from "@/stores/sync-store";

/// Subtle status-bar sync control: indicator + push button in one.
///
/// Hidden unless the active workspace is a signed-in git repo. Reflects the
/// current sync phase and dirty count; clicking pushes when there are local
/// changes. Divergence is shown as a non-clickable warning here — the banner
/// (rendered separately) owns the push-or-discard resolution.

export function SyncControl() {
  const signedIn = useSyncStore((s) => s.signedIn);
  const isRepo = useSyncStore((s) => s.isRepo);
  const phase = useSyncStore((s) => s.phase);
  const dirtyCount = useSyncStore((s) => s.dirtyCount);
  const diverged = useSyncStore((s) => s.diverged);
  const error = useSyncStore((s) => s.error);
  const push = useSyncStore((s) => s.push);

  if (!signedIn || !isRepo) return null;

  const { label, title, clickable } = describe({ phase, dirtyCount, diverged, error });

  return (
    <button
      type="button"
      disabled={!clickable}
      onClick={clickable ? () => void push() : undefined}
      title={title}
      className="flex items-center gap-1.5 transition-colors enabled:hover:text-[var(--text-primary)] disabled:cursor-default"
      style={{ color: diverged || error ? "var(--text-secondary)" : undefined }}
    >
      <span aria-hidden="true">{label}</span>
    </button>
  );
}

function describe({
  phase,
  dirtyCount,
  diverged,
  error,
}: {
  phase: "idle" | "fetching" | "pushing";
  dirtyCount: number;
  diverged: boolean;
  error: string | null;
}): { label: string; title: string; clickable: boolean } {
  if (phase === "fetching")
    return { label: "↓ syncing", title: "Fetching from GitHub…", clickable: false };
  if (phase === "pushing")
    return { label: "↑ pushing", title: "Pushing to GitHub…", clickable: false };
  if (diverged)
    return { label: "! diverged", title: "Local changes diverged from remote", clickable: false };
  if (error) return { label: "⚠ sync error", title: error, clickable: false };
  if (dirtyCount > 0)
    return {
      label: `↑ ${dirtyCount}`,
      title: `Push ${dirtyCount} change${dirtyCount === 1 ? "" : "s"} to GitHub`,
      clickable: true,
    };
  return { label: "✓ synced", title: "Up to date with GitHub", clickable: false };
}

import { useRef } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon } from "@hugeicons/core-free-icons";
import { useSyncStore } from "@/stores/sync-store";
import { useOpenScmTab } from "@/hooks/use-tabs";
import { GithubIcon } from "@/components/icons/github-icon";
import {
  showNativeContextMenu,
  type MenuItemSpec,
} from "@/components/editor-area/editor-context-menu";

/// Prominent top-right GitHub sync pill. Hidden unless the active workspace is
/// a signed-in git repo. Primary click opens the Source Control tab; the caret
/// (or right-click) opens a native menu for push / fetch / view / sign out.

export function SyncButton() {
  const signedIn = useSyncStore((s) => s.signedIn);
  const isRepo = useSyncStore((s) => s.isRepo);
  const phase = useSyncStore((s) => s.phase);
  const dirtyCount = useSyncStore((s) => s.dirtyCount);
  const behind = useSyncStore((s) => s.behind);
  const diverged = useSyncStore((s) => s.diverged);
  const error = useSyncStore((s) => s.error);
  const openScm = useOpenScmTab();
  const buttonRef = useRef<HTMLButtonElement>(null);

  if (!signedIn || !isRepo) return null;

  const { label, title } = describe({ phase, dirtyCount, behind, diverged, error });

  async function showMenu() {
    const items: MenuItemSpec[] = [];
    if (dirtyCount > 0) {
      items.push({
        kind: "item",
        id: "push",
        text: "Push now",
        action: () => void useSyncStore.getState().push(),
      });
    }
    items.push({
      kind: "item",
      id: "fetch",
      text: "Fetch now",
      action: () => void useSyncStore.getState().fetch(),
    });
    items.push({ kind: "item", id: "view", text: "View changes", action: () => openScm() });
    items.push({ kind: "separator" });
    items.push({
      kind: "item",
      id: "signout",
      text: "Sign out of GitHub",
      action: () => void useSyncStore.getState().signOut(),
    });

    const rect = buttonRef.current?.getBoundingClientRect();
    const position = rect ? { x: Math.round(rect.left), y: Math.round(rect.bottom) } : undefined;
    await showNativeContextMenu(items, position);
  }

  const isWarning = diverged || !!error;

  return (
    <div
      className="flex items-center rounded-full text-[13px] font-medium leading-none transition-colors"
      style={{
        background: "var(--surface-subtle)",
        color: isWarning ? "var(--text-secondary)" : "var(--text-primary)",
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label={title}
        title={title}
        onClick={() => openScm()}
        onContextMenu={(e) => {
          e.preventDefault();
          void showMenu();
        }}
        className="flex items-center gap-2 rounded-l-full py-2 pl-3.5 pr-2.5 transition-colors hover:bg-[var(--surface-subtle-strong)]"
      >
        <GithubIcon size={15} />
        <span aria-hidden="true">{label}</span>
      </button>
      <span aria-hidden="true" className="my-1.5 w-px self-stretch bg-[var(--line-subtle)]" />
      <button
        type="button"
        aria-label="GitHub sync options"
        title="GitHub sync options"
        onClick={() => void showMenu()}
        className="flex items-center rounded-r-full py-2 pl-1.5 pr-2.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-subtle-strong)] hover:text-[var(--text-primary)]"
      >
        <HugeiconsIcon icon={ArrowDown01Icon} size={15} />
      </button>
    </div>
  );
}

function describe({
  phase,
  dirtyCount,
  behind,
  diverged,
  error,
}: {
  phase: "idle" | "fetching" | "pushing";
  dirtyCount: number;
  behind: number;
  diverged: boolean;
  error: string | null;
}): { label: string; title: string } {
  if (phase === "fetching") return { label: "↓ Syncing…", title: "Fetching from GitHub…" };
  if (phase === "pushing") return { label: "↑ Pushing…", title: "Pushing to GitHub…" };
  if (diverged) {
    // Diverged means there are both incoming commits and local changes that
    // can't fast-forward — show both sides like VSCode's ↓N ↑N.
    const counts = behind > 0 ? `↓${behind} ↑${dirtyCount} ` : "";
    return { label: `⚠ ${counts}Diverged`.trim(), title: "Local changes diverged from remote" };
  }
  if (error) return { label: "⚠ Sync error", title: error };
  if (behind > 0)
    return {
      label: `↓ ${behind} incoming`,
      title: `${behind} commit${behind === 1 ? "" : "s"} to pull from GitHub`,
    };
  if (dirtyCount > 0)
    return {
      label: `↑ ${dirtyCount} change${dirtyCount === 1 ? "" : "s"}`,
      title: `Push ${dirtyCount} change${dirtyCount === 1 ? "" : "s"} to GitHub`,
    };
  return { label: "✓ Synced", title: "Up to date with GitHub" };
}

import { useEffect, useMemo, useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { Undo02Icon } from "@hugeicons/core-free-icons";
import { useSyncStore } from "@/stores/sync-store";
import { useWorkspaceStore } from "@/stores/workspace-store";
import { githubCommitHistory, type ChangedFile, type CommitMeta } from "@/lib/tauri";
import { GithubIcon } from "@/components/icons/github-icon";
import { DiffView } from "./diff-view";
import { CommitHistory } from "./commit-history";

/** Status letter + color for a changed file. */
const STATUS_META: Record<ChangedFile["status"], { letter: string; color: string }> = {
  modified: { letter: "M", color: "#d29922" },
  added: { letter: "A", color: "#3fb950" },
  deleted: { letter: "D", color: "#f85149" },
  untracked: { letter: "U", color: "#58a6ff" },
  renamed: { letter: "R", color: "#bc8cff" },
};

function splitPath(path: string): { dir: string; base: string } {
  const idx = path.lastIndexOf("/");
  if (idx === -1) return { dir: "", base: path };
  return { dir: path.slice(0, idx + 1), base: path.slice(idx + 1) };
}

function FileRow({
  file,
  selected,
  onSelect,
  onDiscard,
}: {
  file: ChangedFile;
  selected: boolean;
  onSelect: () => void;
  onDiscard: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const meta = STATUS_META[file.status];
  const { dir, base } = splitPath(file.path);

  // Reset the two-click confirm if the row loses selection focus context.
  useEffect(() => {
    if (!selected) setConfirming(false);
  }, [selected]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`group flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-[13px] ${
        selected ? "bg-[var(--item-active-bg)]" : "hover:bg-[var(--item-hover-bg)]"
      }`}
    >
      <span
        className="w-3 shrink-0 text-center font-mono text-[12px] font-semibold"
        style={{ color: meta.color }}
        title={file.status}
      >
        {meta.letter}
      </span>
      <span className="min-w-0 flex-1 truncate">
        <span className="font-semibold text-[var(--text-primary)]">{base}</span>
        {dir ? <span className="ml-1.5 text-[var(--text-muted)]">{dir}</span> : null}
      </span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (confirming) {
            onDiscard();
            setConfirming(false);
          } else {
            setConfirming(true);
          }
        }}
        className={`flex shrink-0 items-center justify-center rounded p-1 transition-opacity ${
          confirming
            ? "bg-[#f85149] text-white opacity-100"
            : "text-[var(--text-muted)] opacity-0 hover:bg-[var(--item-hover-bg)] hover:text-[var(--text-primary)] group-hover:opacity-100"
        }`}
        title={
          confirming ? "Click again to confirm — discard changes to this file" : "Discard changes"
        }
        aria-label={confirming ? "Confirm discard changes" : "Discard changes"}
      >
        <HugeiconsIcon icon={Undo02Icon} size={15} />
      </button>
    </div>
  );
}

export function ScmPanel({ isActive }: { isActive: boolean }) {
  const changedFiles = useSyncStore((s) => s.changedFiles);
  const branch = useSyncStore((s) => s.branch);
  const phase = useSyncStore((s) => s.phase);
  const root = useWorkspaceStore((s) => s.root);

  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  // Tracks whether the user has typed their own commit message; until then the
  // default message tracks the dirty-file count.
  const [messageDirty, setMessageDirty] = useState(false);
  // Which body to show: working-tree changes (default) or commit history.
  const [view, setView] = useState<"changes" | "history">("changes");
  const [commits, setCommits] = useState<CommitMeta[] | null>(null);
  const [historyError, setHistoryError] = useState<string | null>(null);

  // Refresh the working-tree changes on mount and whenever the tab is
  // (re-)activated, since keepAlive keeps this mounted across tab switches.
  useEffect(() => {
    if (isActive) void useSyncStore.getState().refreshChangedFiles();
  }, [isActive]);

  // Load commit history lazily the first time History is opened (and refresh on
  // each activation while in history view so a fresh push shows up).
  useEffect(() => {
    if (!isActive || view !== "history" || !root) return;
    let cancelled = false;
    setHistoryError(null);
    githubCommitHistory(root, 1000)
      .then((c) => {
        if (!cancelled) setCommits(c);
      })
      .catch((e) => {
        if (!cancelled) setHistoryError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, [isActive, view, root]);

  const defaultMessage = useMemo(() => {
    const n = changedFiles.length;
    return `memento: sync ${n} file${n === 1 ? "" : "s"}`;
  }, [changedFiles.length]);
  const effectiveMessage = messageDirty ? message : defaultMessage;

  // Drop the selection if the selected file is no longer changed.
  useEffect(() => {
    if (selectedPath && !changedFiles.some((f) => f.path === selectedPath)) {
      setSelectedPath(null);
    }
  }, [changedFiles, selectedPath]);

  const busy = phase !== "idle";

  async function handlePush() {
    await useSyncStore.getState().push();
    await useSyncStore.getState().refreshChangedFiles();
  }

  return (
    <div
      data-scm-panel
      className={
        isActive ? "relative z-10 h-full" : "absolute inset-0 invisible pointer-events-none h-full"
      }
      aria-hidden={!isActive}
    >
      <div className="flex h-full flex-col">
        {/* Top padding clears the floating window chrome (tab strip + the
            top-right sync button), which overlays the top ~48px of every
            full-page view. */}
        <header className="flex flex-col gap-3 border-b border-[var(--line-subtler)] px-6 pb-4 pt-14">
          <div className="flex min-w-0 items-center gap-2">
            <h1 className="text-[17px] font-semibold text-[var(--text-primary)]">Source Control</h1>
            {branch ? (
              <span className="truncate rounded-full bg-[var(--surface-subtle)] px-2 py-0.5 text-[11px] text-[var(--text-muted)]">
                {branch}
              </span>
            ) : null}
            <div className="ml-auto flex items-center gap-3">
              <div className="flex items-center gap-0.5 rounded-lg bg-[var(--surface-subtle)] p-0.5">
                <SegBtn active={view === "changes"} onClick={() => setView("changes")}>
                  Changes
                </SegBtn>
                <SegBtn active={view === "history"} onClick={() => setView("history")}>
                  History
                </SegBtn>
              </div>
              <span className="text-[12px] text-[var(--text-muted)]">
                {view === "history"
                  ? commits
                    ? `${commits.length} commit${commits.length === 1 ? "" : "s"}`
                    : ""
                  : changedFiles.length === 0
                    ? "No changes"
                    : `${changedFiles.length} changed file${changedFiles.length === 1 ? "" : "s"}`}
              </span>
            </div>
          </div>
          <div className={`flex items-center gap-2 ${view === "history" ? "hidden" : ""}`}>
            <input
              type="text"
              value={effectiveMessage}
              onChange={(e) => {
                setMessageDirty(true);
                setMessage(e.target.value);
              }}
              placeholder="Commit message"
              disabled={busy}
              className="min-w-0 flex-1 rounded-lg border border-[var(--line-subtler)] bg-transparent px-3 py-2 text-[13px] text-[var(--text-primary)] outline-none transition-colors placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => void handlePush()}
              disabled={busy || changedFiles.length === 0}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white transition-opacity disabled:opacity-50"
            >
              <GithubIcon size={15} />
              {phase === "pushing" ? "Pushing…" : "Push"}
            </button>
          </div>
        </header>

        {view === "history" ? (
          <CommitHistory commits={commits} error={historyError} />
        ) : changedFiles.length === 0 ? (
          <div className="flex flex-1 items-center justify-center text-[13px] text-[var(--text-muted)]">
            No changes — you're all caught up.
          </div>
        ) : (
          <div className="flex min-h-0 flex-1">
            <div className="w-72 shrink-0 overflow-auto border-r border-[var(--line-subtler)] p-2">
              {changedFiles.map((file) => (
                <FileRow
                  key={file.path}
                  file={file}
                  selected={selectedPath === file.path}
                  onSelect={() => setSelectedPath(file.path)}
                  onDiscard={() => void useSyncStore.getState().discardFile(file.path)}
                />
              ))}
            </div>
            <div className="min-w-0 flex-1">
              <DiffView workspaceRoot={root} filePath={selectedPath} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** One segment of the Changes/History toggle. */
function SegBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md px-2.5 py-1 text-[12px] font-medium transition-colors ${
        active
          ? "bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-sm"
          : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      }`}
    >
      {children}
    </button>
  );
}

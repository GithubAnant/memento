import { useEffect, useRef, useState } from "react";
import { MergeView } from "@codemirror/merge";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { githubFileDiff } from "@/lib/tauri";

/** Read-only, side-by-side diff for a single changed file. Fetches the
 *  original/modified blobs over IPC and hands them to a CodeMirror
 *  `MergeView`. The view is recreated whenever the target file changes and
 *  torn down on unmount. */
export function DiffView({
  workspaceRoot,
  filePath,
}: {
  workspaceRoot: string | null;
  filePath: string | null;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!workspaceRoot || !filePath) return;

    let view: MergeView | null = null;
    let cancelled = false;
    setError(null);
    setLoading(true);

    githubFileDiff(workspaceRoot, filePath)
      .then((diff) => {
        if (cancelled || !hostRef.current) return;
        const readOnly = [EditorView.editable.of(false), EditorState.readOnly.of(true)];
        view = new MergeView({
          parent: hostRef.current,
          a: { doc: diff.original, extensions: readOnly },
          b: { doc: diff.modified, extensions: readOnly },
          gutter: true,
          highlightChanges: true,
        });
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      view?.destroy();
      view = null;
    };
  }, [workspaceRoot, filePath]);

  if (!filePath) {
    return (
      <div className="flex h-full items-center justify-center text-[13px] text-[var(--text-muted)]">
        Select a file to view changes
      </div>
    );
  }

  return (
    <div className="relative h-full overflow-auto bg-[var(--bg)]">
      {error ? (
        <div className="flex h-full items-center justify-center px-6 text-center text-[13px] text-[var(--text-muted)]">
          {error}
        </div>
      ) : null}
      {loading && !error ? (
        <div className="absolute right-3 top-2 text-[11px] text-[var(--text-muted)]">Loading…</div>
      ) : null}
      <div
        ref={hostRef}
        data-scm-diff
        className="min-h-full font-mono text-[12px] text-[var(--text-primary)]"
        style={{ display: error ? "none" : undefined }}
      />
    </div>
  );
}

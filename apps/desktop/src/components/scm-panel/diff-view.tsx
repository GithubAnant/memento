import { useEffect, useRef, useState } from "react";
import { MergeView } from "@codemirror/merge";
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { githubFileDiff } from "@/lib/tauri";

/// Punch up the merge view's change colors. `@codemirror/merge`'s defaults are
/// very muted; writers want clearly red deletions and green insertions. The
/// left editor (`a`, the original) shows removals in red; the right editor
/// (`b`, the working tree) shows additions in green. We tint the changed-line
/// background, the inline changed-token spans, and the change gutter.
const RED_LINE = "rgba(248, 81, 73, 0.16)";
const RED_TOKEN = "rgba(248, 81, 73, 0.42)";
const GREEN_LINE = "rgba(63, 185, 80, 0.18)";
const GREEN_TOKEN = "rgba(63, 185, 80, 0.42)";

const originalColorTheme = EditorView.theme({
  "& .cm-changedLine": { backgroundColor: RED_LINE },
  "& .cm-changedText, & .cm-deletedText": { backgroundColor: RED_TOKEN },
  "& .cm-changedLineGutter": { backgroundColor: RED_TOKEN },
});

const modifiedColorTheme = EditorView.theme({
  "& .cm-changedLine": { backgroundColor: GREEN_LINE },
  "& .cm-changedText": { backgroundColor: GREEN_TOKEN },
  "& .cm-changedLineGutter": { backgroundColor: GREEN_TOKEN },
});

/// Deleted-chunk blocks (lines present only on the original side, rendered
/// inline within the right editor) get a red wash too.
const deletedChunkTheme = EditorView.theme({
  "& .cm-deletedChunk": { backgroundColor: RED_LINE },
  "& .cm-deletedChunk .cm-deletedText": { backgroundColor: RED_TOKEN },
});

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
          a: { doc: diff.original, extensions: [...readOnly, originalColorTheme] },
          b: {
            doc: diff.modified,
            extensions: [...readOnly, modifiedColorTheme, deletedChunkTheme],
          },
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

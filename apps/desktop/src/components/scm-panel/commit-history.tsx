import { useMemo } from "react";
import type { CommitMeta } from "@/lib/tauri";

/** Scrollable, timeline-style list of recent commits for the History view.
 *  Commits group under sticky day headers (Today / Yesterday / date); each row
 *  is a node on a vertical rail with summary, author, time, and a hash pill.
 *  Pure presentational — data is fetched by the parent panel. */
export function CommitHistory({
  commits,
  error,
}: {
  commits: CommitMeta[] | null;
  error: string | null;
}) {
  const groups = useMemo(() => groupByDay(commits ?? []), [commits]);

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 text-center text-[13px] text-[var(--text-muted)]">
        {error}
      </div>
    );
  }
  if (commits === null) {
    return (
      <div className="flex flex-1 items-center justify-center text-[13px] text-[var(--text-muted)]">
        Loading history…
      </div>
    );
  }
  if (commits.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-[13px] text-[var(--text-muted)]">
        No commits yet.
      </div>
    );
  }

  return (
    <div className="min-h-0 flex-1 overflow-auto px-6 pb-6">
      {groups.map((group) => (
        <section key={group.label}>
          <div className="sticky top-0 z-10 -mx-6 mb-1 bg-[var(--bg)] px-6 py-2.5">
            <h2 className="flex items-baseline gap-2 text-[12px] font-semibold text-[var(--text-primary)]">
              {group.label}
              <span className="text-[11px] font-normal text-[var(--text-muted)]">
                {group.commits.length} commit{group.commits.length === 1 ? "" : "s"}
              </span>
            </h2>
          </div>
          <div className="flex flex-col">
            {group.commits.map((c, i) => (
              <CommitRow key={c.id} commit={c} last={i === group.commits.length - 1} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function CommitRow({ commit, last }: { commit: CommitMeta; last: boolean }) {
  const time = new Date(commit.timestamp_secs * 1000).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  return (
    <div className="group relative flex gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-[var(--item-hover-bg)]">
      {/* Rail: dot + connecting line down to the next row. */}
      <div className="relative flex w-3 shrink-0 justify-center">
        {!last ? (
          <span className="absolute top-3 bottom-[-8px] w-px bg-[var(--line-subtler)]" />
        ) : null}
        <span className="relative z-10 mt-1.5 h-2 w-2 rounded-full bg-[var(--accent)] ring-2 ring-[var(--bg)]" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-[var(--text-primary)]">
            {commit.summary}
          </span>
          <span className="shrink-0 rounded-md bg-[var(--surface-subtle)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-muted)]">
            {commit.id.slice(0, 7)}
          </span>
        </div>
        <div className="mt-0.5 text-[11px] text-[var(--text-muted)]">
          {commit.author} · {time}
        </div>
      </div>
    </div>
  );
}

interface DayGroup {
  label: string;
  commits: CommitMeta[];
}

/// Bucket commits (already newest-first from the backend revwalk) into day
/// groups, labelling the first two days relative to today.
function groupByDay(commits: CommitMeta[]): DayGroup[] {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = startOfDay(new Date());
  const dayMs = 86_400_000;

  const groups: DayGroup[] = [];
  let current: DayGroup | null = null;
  let currentKey = NaN;

  for (const c of commits) {
    const d = new Date(c.timestamp_secs * 1000);
    const key = startOfDay(d);
    if (key !== currentKey) {
      const daysAgo = Math.round((today - key) / dayMs);
      const label =
        daysAgo === 0
          ? "Today"
          : daysAgo === 1
            ? "Yesterday"
            : d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
      current = { label, commits: [] };
      groups.push(current);
      currentKey = key;
    }
    current?.commits.push(c);
  }
  return groups;
}

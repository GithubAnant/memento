import { useEffect, useMemo, useState } from "react";
import { githubCommitHistory, type CommitMeta } from "@/lib/tauri";
import { useWorkspaceStore } from "@/stores/workspace-store";

const WEEKS = 53;
const DAY_MS = 24 * 60 * 60 * 1000;

// Heatmap shades from "no commits" to "most". Tuned to read well on the dark bg.
const HEAT_SHADES = ["var(--surface-card)", "#0e4429", "#006d32", "#26a641", "#39d353"] as const;
const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const WEEKDAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];

/** Local midnight for a Date, as epoch ms — the canonical day bucket key. */
function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function bucketForCount(count: number): number {
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  return 4;
}

interface ComputedStats {
  total: number;
  thisWeek: number;
  streak: number;
  lastCommit: Date | null;
  /** commit count keyed by local-midnight epoch ms */
  countByDay: Map<number, number>;
}

function computeStats(commits: CommitMeta[]): ComputedStats {
  const countByDay = new Map<number, number>();
  let lastCommit: Date | null = null;

  for (const commit of commits) {
    const date = new Date(commit.timestamp_secs * 1000);
    const key = startOfDay(date);
    countByDay.set(key, (countByDay.get(key) ?? 0) + 1);
    if (!lastCommit || date > lastCommit) lastCommit = date;
  }

  const today = startOfDay(new Date());
  const weekAgo = today - 6 * DAY_MS;
  let thisWeek = 0;
  for (const [day, count] of countByDay) {
    if (day >= weekAgo && day <= today) thisWeek += count;
  }

  // Daily streak: consecutive days with >=1 commit ending today (or, if no
  // commit today yet, ending yesterday so a one-day gap at "now" is forgiven).
  let streak = 0;
  let cursor = today;
  if (!countByDay.has(today) && countByDay.has(today - DAY_MS)) {
    cursor = today - DAY_MS;
  }
  while ((countByDay.get(cursor) ?? 0) > 0) {
    streak += 1;
    cursor -= DAY_MS;
  }

  return { total: commits.length, thisWeek, streak, lastCommit, countByDay };
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-[var(--line-subtler)] bg-[var(--surface-card)] px-4 py-3">
      <span className="text-2xl font-semibold text-[var(--text-primary)]">{value}</span>
      <span className="text-[12px] text-[var(--text-muted)]">{label}</span>
    </div>
  );
}

/** Build the heatmap grid: WEEKS columns x 7 rows ending on the current week.
 *  Each column is a week (Sun..Sat); the last column contains today. */
function buildHeatmapColumns(countByDay: Map<number, number>) {
  const today = new Date();
  const todayStart = startOfDay(today);
  // End of grid is the Saturday of the current week.
  const lastColEnd = todayStart + (6 - today.getDay()) * DAY_MS;
  const gridStart = lastColEnd - (WEEKS * 7 - 1) * DAY_MS;

  const columns: { day: number; count: number; bucket: number }[][] = [];
  for (let w = 0; w < WEEKS; w++) {
    const col: { day: number; count: number; bucket: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const day = gridStart + (w * 7 + d) * DAY_MS;
      const count = countByDay.get(day) ?? 0;
      col.push({ day, count, bucket: bucketForCount(count) });
    }
    columns.push(col);
  }
  return columns;
}

function Heatmap({ countByDay }: { countByDay: Map<number, number> }) {
  const columns = useMemo(() => buildHeatmapColumns(countByDay), [countByDay]);

  // Month labels: render a label above the first column whose top cell starts a
  // new month (relative to the previous column).
  const monthLabels = useMemo(() => {
    const labels: (string | null)[] = [];
    let prevMonth = -1;
    for (const col of columns) {
      const month = new Date(col[0]!.day).getMonth();
      if (month !== prevMonth) {
        labels.push(MONTH_LABELS[month]!);
        prevMonth = month;
      } else {
        labels.push(null);
      }
    }
    return labels;
  }, [columns]);

  const cell = "h-[11px] w-[11px] rounded-[2px]";

  return (
    <div className="inline-flex gap-2">
      {/* weekday hints */}
      <div className="flex flex-col gap-[3px] pt-[18px]">
        {WEEKDAY_LABELS.map((label, i) => (
          <span
            key={i}
            className="h-[11px] text-[9px] leading-[11px] text-[var(--text-muted)]"
            style={{ width: 22 }}
          >
            {label}
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex gap-[3px]">
          {monthLabels.map((label, i) => (
            <span
              key={i}
              className="text-[9px] text-[var(--text-muted)]"
              style={{ width: 11, marginRight: 3 }}
            >
              {label}
            </span>
          ))}
        </div>
        <div className="flex gap-[3px]">
          {columns.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-[3px]">
              {col.map((c) => (
                <div
                  key={c.day}
                  className={cell}
                  style={{ backgroundColor: HEAT_SHADES[c.bucket] }}
                  title={`${c.count} commit${c.count === 1 ? "" : "s"} on ${new Date(
                    c.day,
                  ).toLocaleDateString()}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function StatsPanel({ isActive }: { isActive: boolean }) {
  const root = useWorkspaceStore((s) => s.root);
  const [commits, setCommits] = useState<CommitMeta[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isActive || !root) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    githubCommitHistory(root, 1000)
      .then((history) => {
        if (!cancelled) setCommits(history);
      })
      .catch((e) => {
        if (!cancelled) {
          setError(String(e));
          setCommits([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isActive, root]);

  const stats = useMemo(() => computeStats(commits), [commits]);

  return (
    <div
      data-stats-panel
      className={
        isActive ? "relative z-10 h-full" : "absolute inset-0 invisible pointer-events-none h-full"
      }
      aria-hidden={!isActive}
    >
      <div className="h-full overflow-auto">
        <div className="mx-auto max-w-3xl px-8 pt-16 pb-24">
          <h1 className="mb-8 text-2xl font-semibold text-[var(--text-primary)]">Stats</h1>

          {error ? (
            <p className="text-[13px] text-[var(--text-muted)]">{error}</p>
          ) : loading && commits.length === 0 ? (
            <p className="text-[13px] text-[var(--text-muted)]">Loading…</p>
          ) : commits.length === 0 ? (
            <p className="text-[13px] text-[var(--text-muted)]">No commits yet</p>
          ) : (
            <>
              <div className="mb-10 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label="Total commits" value={String(stats.total)} />
                <StatCard label="This week" value={String(stats.thisWeek)} />
                <StatCard
                  label="Day streak"
                  value={`${stats.streak} day${stats.streak === 1 ? "" : "s"}`}
                />
                <StatCard
                  label="Last commit"
                  value={stats.lastCommit ? stats.lastCommit.toLocaleDateString() : "—"}
                />
              </div>

              <section>
                <h2 className="mb-3 text-[13px] font-medium text-[var(--text-muted)]">
                  Commit activity
                </h2>
                <div className="-mx-4 overflow-x-auto rounded-2xl border border-[var(--line-subtler)] bg-[var(--surface-card)] px-4 py-4">
                  <Heatmap countByDay={stats.countByDay} />
                </div>
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

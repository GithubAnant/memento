import { useState } from "react";
import { useSyncStore } from "@/stores/sync-store";

/// Shown when a fetch or push finds the local working tree diverged from the
/// remote (can't fast-forward). Offers the only two safe resolutions:
///
///   - Push: commit local changes and push (fetch-then-retry on the backend).
///   - Discard: hard-reset to the remote, dropping local changes. Destructive,
///     so it requires a second confirming click.
///
/// We never auto-resolve — silently clobbering an unpushed edit would violate
/// "fail explicitly".

export function DivergenceBanner() {
  const diverged = useSyncStore((s) => s.diverged);
  const phase = useSyncStore((s) => s.phase);
  const push = useSyncStore((s) => s.push);
  const discardLocal = useSyncStore((s) => s.discardLocal);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  if (!diverged) return null;
  const busy = phase !== "idle";

  return (
    <div
      className="pointer-events-auto absolute left-1/2 top-6 z-30 flex max-w-[90%] -translate-x-1/2 flex-col gap-2 rounded-lg px-4 py-3 text-[13px]"
      style={{
        background: "var(--surface-card)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid var(--line-subtler)",
        boxShadow: "0 8px 24px rgba(0, 0, 0, 0.18)",
        color: "var(--text-secondary)",
      }}
    >
      <span>
        Your local changes diverged from GitHub. Push them, or discard to match the remote.
      </span>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void push()}
          className="rounded-md bg-[var(--text-primary)] px-3 py-1.5 font-medium text-[var(--surface-primary)] transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          Push
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            if (confirmDiscard) {
              void discardLocal();
              setConfirmDiscard(false);
            } else {
              setConfirmDiscard(true);
            }
          }}
          className="rounded-md border border-[var(--line-subtle)] px-3 py-1.5 transition-colors hover:bg-[var(--surface-subtle)] disabled:opacity-50"
          style={confirmDiscard ? { color: "var(--danger, #e5484d)" } : undefined}
        >
          {confirmDiscard ? "Click to confirm discard" : "Discard local"}
        </button>
      </div>
    </div>
  );
}

import { openUrl } from "@tauri-apps/plugin-opener";
import { useConnectStore } from "./connect-store";

/// Modal for the "Connect GitHub" onboarding flow. Renders nothing when the
/// flow is closed; otherwise an overlay whose body is driven by the step in
/// `useConnectStore` (device code → repo picker → cloning → error).

export function ConnectDialog() {
  const step = useConnectStore((s) => s.step);
  if (step === "closed") return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)" }}
    >
      <div
        className="w-full max-w-[380px] rounded-xl p-6"
        style={{
          background: "var(--surface-card)",
          border: "1px solid var(--line-subtler)",
          boxShadow: "0 16px 48px rgba(0,0,0,0.28)",
          color: "var(--text-primary)",
        }}
      >
        <DialogBody />
      </div>
    </div>
  );
}

function DialogBody() {
  const { step, device, repos, error, close, selectRepo } = useConnectStore();

  if (step === "device") {
    return (
      <div className="flex flex-col gap-4">
        <Header title="Connect GitHub" onClose={close} />
        {device ? (
          <>
            <p className="text-[13px] text-[var(--text-secondary)]">
              Enter this code on GitHub to connect your memory repo. A browser window should have
              opened.
            </p>
            <button
              type="button"
              onClick={() => void openUrl(device.verification_uri)}
              className="self-center rounded-lg px-4 py-3 font-mono text-[22px] tracking-[0.3em]"
              style={{
                background: "var(--surface-subtle)",
                border: "1px solid var(--line-subtle)",
              }}
            >
              {device.user_code}
            </button>
            <p className="text-center text-[12px] text-[var(--text-muted)]">
              Waiting for authorization…
            </p>
          </>
        ) : (
          <p className="text-[13px] text-[var(--text-muted)]">Starting…</p>
        )}
      </div>
    );
  }

  if (step === "repos") {
    return (
      <div className="flex flex-col gap-4">
        <Header title="Choose your memory repo" onClose={close} />
        <div className="flex max-h-[320px] flex-col gap-1 overflow-y-auto">
          {repos.length === 0 ? (
            <p className="text-[13px] text-[var(--text-muted)]">No repositories found.</p>
          ) : (
            repos.map((repo) => (
              <button
                key={repo.full_name}
                type="button"
                onClick={() => void selectRepo(repo.full_name)}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] transition-colors hover:bg-[var(--surface-subtle)]"
              >
                <span className="truncate">{repo.full_name}</span>
                {repo.private ? (
                  <span className="ml-2 shrink-0 text-[11px] text-[var(--text-muted)]">
                    private
                  </span>
                ) : null}
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  if (step === "cloning") {
    return (
      <div className="flex flex-col gap-4">
        <Header title="Cloning…" onClose={close} />
        <p className="text-[13px] text-[var(--text-secondary)]">
          Cloning your repo to <span className="font-mono">~/Desktop/Memento/</span>. This may take
          a moment.
        </p>
      </div>
    );
  }

  // error
  return (
    <div className="flex flex-col gap-4">
      <Header title="Something went wrong" onClose={close} />
      <p className="text-[13px] text-[var(--text-secondary)]">{error}</p>
      <button
        type="button"
        onClick={close}
        className="self-end rounded-lg bg-[var(--text-primary)] px-4 py-2 text-[13px] font-medium text-[var(--surface-primary)]"
      >
        Close
      </button>
    </div>
  );
}

function Header({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-[15px] font-medium">{title}</h2>
      <button
        type="button"
        onClick={onClose}
        className="text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
        aria-label="Close"
      >
        ✕
      </button>
    </div>
  );
}

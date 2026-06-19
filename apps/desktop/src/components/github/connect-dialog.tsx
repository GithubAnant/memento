import { useState } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { HugeiconsIcon } from "@hugeicons/react";
import { LockIcon } from "@hugeicons/core-free-icons";
import { GithubIcon } from "@/components/icons/github-icon";
import type { RepoInfo } from "@/lib/tauri";
import { useConnectStore } from "./connect-store";

/// Modal for the "Connect GitHub" onboarding flow. Renders nothing when the
/// flow is closed; otherwise an overlay whose body is driven by the step in
/// `useConnectStore` (paste token → validating → repo picker → cloning → error).

/// GitHub's "new token" page, pre-filled with the `repo` scope Memento needs.
const NEW_TOKEN_URL = "https://github.com/settings/tokens/new?scopes=repo&description=Memento";

export function ConnectDialog() {
  const step = useConnectStore((s) => s.step);
  if (step === "closed") return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)" }}
    >
      <div
        className="relative w-full max-w-[460px] rounded-2xl p-6"
        style={{
          background: "var(--surface-primary)",
          border: "1px solid var(--line-subtler)",
          boxShadow: "0 16px 48px rgba(0,0,0,0.4)",
          color: "var(--text-primary)",
        }}
      >
        <DialogBody />
      </div>
    </div>
  );
}

function DialogBody() {
  const { step, repos, error, close, submitToken, selectRepo } = useConnectStore();

  if (step === "token" || step === "validating") {
    return <TokenStep validating={step === "validating"} onSubmit={submitToken} onClose={close} />;
  }

  if (step === "repos") {
    return (
      <div className="flex flex-col gap-4">
        <Header title="Choose your memory repo" onClose={close} />
        {repos.length === 0 ? (
          <p className="py-2 text-[13px] text-[var(--text-muted)]">No repositories found.</p>
        ) : (
          <div
            className="-mx-2 max-h-[380px] overflow-y-auto rounded-xl"
            style={{ border: "1px solid var(--line-subtler)" }}
          >
            {repos.map((repo, i) => (
              <RepoRow
                key={repo.full_name}
                repo={repo}
                first={i === 0}
                onUse={() => void selectRepo(repo.full_name)}
              />
            ))}
          </div>
        )}
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

/// One repo in the picker: GitHub mark, `owner/name` (owner muted), a lock
/// glyph for private repos, and a "Use" button that appears on hover/focus.
/// The whole row is clickable; the button is the explicit affordance.
function RepoRow({ repo, first, onUse }: { repo: RepoInfo; first: boolean; onUse: () => void }) {
  const [owner, name] = splitFullName(repo.full_name);
  return (
    <button
      type="button"
      onClick={onUse}
      className="group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--surface-subtle)]"
      style={first ? undefined : { borderTop: "1px solid var(--line-subtler)" }}
    >
      <GithubIcon size={18} />
      <span className="min-w-0 flex-1 truncate text-[13px]">
        <span className="text-[var(--text-muted)]">{owner}/</span>
        <span className="font-medium text-[var(--text-primary)]">{name}</span>
      </span>
      {repo.private ? (
        <HugeiconsIcon
          icon={LockIcon}
          size={14}
          className="shrink-0 text-[var(--text-muted)]"
          aria-label="private"
        />
      ) : null}
      <span
        className="shrink-0 rounded-md px-3 py-1 text-[12px] font-medium opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
        style={{ background: "var(--text-primary)", color: "var(--surface-primary)" }}
      >
        Use
      </span>
    </button>
  );
}

/// Split `owner/name` for two-tone rendering; falls back to the whole string
/// as the name if there's no slash.
function splitFullName(fullName: string): [string, string] {
  const slash = fullName.indexOf("/");
  if (slash === -1) return ["", fullName];
  return [fullName.slice(0, slash), fullName.slice(slash + 1)];
}

function TokenStep({
  validating,
  onSubmit,
  onClose,
}: {
  validating: boolean;
  onSubmit: (token: string) => Promise<void>;
  onClose: () => void;
}) {
  const [token, setToken] = useState("");
  const canSubmit = token.trim().length > 0 && !validating;

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) void onSubmit(token);
      }}
    >
      <Header title="Connect GitHub" onClose={onClose} />
      <p className="text-[13px] text-[var(--text-secondary)]">
        Paste a GitHub Personal Access Token to connect your memory repo.{" "}
        <button
          type="button"
          onClick={() => void openUrl(NEW_TOKEN_URL)}
          className="underline underline-offset-2 hover:text-[var(--text-primary)]"
        >
          Create one
        </button>{" "}
        with the <span className="font-mono">repo</span> scope.
      </p>
      <input
        type="password"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        disabled={validating}
        autoFocus
        placeholder="ghp_…"
        spellCheck={false}
        autoComplete="off"
        className="w-full rounded-lg px-3 py-2 font-mono text-[13px] outline-none"
        style={{
          background: "var(--surface-subtle)",
          border: "1px solid var(--line-subtle)",
        }}
      />
      <button
        type="submit"
        disabled={!canSubmit}
        className="self-end rounded-lg bg-[var(--text-primary)] px-4 py-2 text-[13px] font-medium text-[var(--surface-primary)] transition-opacity disabled:opacity-50"
      >
        {validating ? "Checking…" : "Connect"}
      </button>
    </form>
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

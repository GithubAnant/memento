import { useWorkspace } from "@/hooks/use-workspace";
import * as tauri from "@/lib/tauri";
import { getParentDir } from "@/lib/paths";
import { useConnectStore } from "@/components/github/connect-store";
import { GithubIcon } from "@/components/icons/github-icon";

export function WelcomeScreen() {
  const { openWorkspace } = useWorkspace();
  const connectGitHub = useConnectStore((s) => s.open);

  async function handleAddLocation() {
    const picked = await tauri.pickWorkspace();
    if (picked) {
      await openWorkspace(picked);
    }
  }

  async function handleOpenFile() {
    const picked = await tauri.pickFile();
    if (!picked) return;
    const dir = getParentDir(picked);
    await openWorkspace(dir);
    await import("@/stores/editor-store").then((m) => m.useEditorStore.getState().openFile(picked));
  }

  return (
    <div className="flex h-screen items-center justify-center bg-bg text-text-primary">
      <div className="w-full max-w-[320px] px-6">
        <p className="mb-6 text-center text-[13px] leading-relaxed text-text-muted">
          Connect your GitHub memory repo, or open local markdown files.
        </p>

        <div className="flex flex-col items-center gap-3">
          <button
            onClick={() => void connectGitHub()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--text-primary)] px-4 py-2 text-[13px] font-medium text-[var(--surface-primary)] transition-opacity hover:opacity-90"
          >
            <GithubIcon size={16} />
            Connect GitHub
          </button>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => void handleAddLocation()}
              className="flex items-center gap-2 rounded-lg border border-[var(--line-subtle)] px-4 py-2 text-[13px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-subtle)]"
            >
              Add Folder
            </button>
            <button
              onClick={() => void handleOpenFile()}
              className="flex items-center gap-2 rounded-lg border border-[var(--line-subtle)] px-4 py-2 text-[13px] font-medium text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-subtle)]"
            >
              Open File
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

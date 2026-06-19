import { useActiveTab, useActiveTabId, useOpenTabs } from "@/hooks/use-tabs";
import { ErrorBoundary } from "@/components/error-boundary";
import { pageKind } from "./page-kinds";
import { EditorSearchOverlay } from "./editor-search-overlay";
import { AnchorWarningBanner } from "./anchor-warning-banner";
import { DivergenceBanner } from "@/components/github/divergence-banner";

interface EditorAreaProps {
  showFooter?: boolean;
}

function EditorArea({ showFooter = true }: EditorAreaProps) {
  const activeTab = useActiveTab();
  const activeTabId = useActiveTabId();
  const tabs = useOpenTabs();

  return (
    <div className="relative h-full overflow-hidden">
      <div className="relative h-full min-h-0 overflow-hidden">
        {tabs.map((tab) => {
          const k = pageKind(tab.location);
          const isActive = tab.id === activeTabId;
          if (!k.keepAlive && !isActive) return null;
          const Component = k.Component as React.ComponentType<{
            location: typeof tab.location;
            isActive: boolean;
          }>;
          // Per-tab boundary: a crash in one page (especially a keepAlive one
          // like Source Control / Stats that stays mounted while another tab is
          // active) must not blank the whole editor area. Without this, the
          // single app-level boundary would take down every tab at once.
          return (
            <ErrorBoundary key={tab.id}>
              <Component location={tab.location} isActive={isActive} />
            </ErrorBoundary>
          );
        })}
      </div>
      {showFooter && activeTab
        ? pageKind(activeTab.location).renderFooter?.(activeTab.location)
        : null}
      <EditorSearchOverlay />
      <AnchorWarningBanner />
      <DivergenceBanner />
    </div>
  );
}

export { EditorArea };

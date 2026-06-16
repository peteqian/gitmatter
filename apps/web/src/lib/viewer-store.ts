import { Store } from "@tanstack/react-store";
import { type DocTab } from "../routes/_auth/matters/-components/DocViewerTabs";

// The matter workspace's open document tabs live here, not in component state.
// Sending the first message remounts the workspace (the route changes
// /assistant → /assistant/$chatId, keyed by chat), which would otherwise reset
// the viewer and unselect the open document. Keying by matter keeps each
// matter's tabs while it survives that remount.
export type MatterViewer = { tabs: DocTab[]; activeTabId: string | null };
export type ViewerState = Record<string, MatterViewer>;

const EMPTY: MatterViewer = { tabs: [], activeTabId: null };

export const viewerStore = new Store<ViewerState>({});

export function matterViewer(matterId: string): MatterViewer {
  return viewerStore.state[matterId] ?? EMPTY;
}

function setMatterViewer(matterId: string, next: MatterViewer) {
  viewerStore.setState((s) => ({ ...s, [matterId]: next }));
}

export function openDocTab(matterId: string, docId: string, title: string) {
  const { tabs } = matterViewer(matterId);
  const nextTabs = tabs.some((t) => t.docId === docId) ? tabs : [...tabs, { docId, title }];
  setMatterViewer(matterId, { tabs: nextTabs, activeTabId: docId });
}

export function setActiveDocTab(matterId: string, docId: string | null) {
  setMatterViewer(matterId, { ...matterViewer(matterId), activeTabId: docId });
}

export function closeDocTab(matterId: string, docId: string) {
  const { tabs, activeTabId } = matterViewer(matterId);
  const nextTabs = tabs.filter((t) => t.docId !== docId);
  const nextActive =
    activeTabId === docId ? (nextTabs[nextTabs.length - 1]?.docId ?? null) : activeTabId;
  setMatterViewer(matterId, { tabs: nextTabs, activeTabId: nextActive });
}

/**
 * 浏览器差异只能写在这里。
 * Chrome: sidePanel；Firefox: sidebar_action（WXT 自动生成）；Safari: 以后改用弹窗/新标签页。
 */
type Platform = { setupEntry: () => void };

const chromePlatform: Platform = {
  setupEntry() {
    const sidePanel = (globalThis as any).chrome?.sidePanel;
    sidePanel?.setPanelBehavior?.({ openPanelOnActionClick: true }).catch(() => {});
  },
};

const firefoxPlatform: Platform = {
  setupEntry() {
    browser.action?.onClicked.addListener(() => {
      (browser as any).sidebarAction?.open?.();
    });
  },
};

export const platform: Platform = import.meta.env.FIREFOX ? firefoxPlatform : chromePlatform;

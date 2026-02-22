chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "mathml-to-latex",
    title: "Copy as LaTeX",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "mathml-to-latex") {
    chrome.tabs.sendMessage(tab.id, { action: "convertSelection" });
  }
});

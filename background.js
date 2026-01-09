// Sự kiện khi click vào Icon Extension
chrome.action.onClicked.addListener(() => {
  // Mở file dashboard.html trong một tab mới
  chrome.tabs.create({ url: "dashboard.html" });
});
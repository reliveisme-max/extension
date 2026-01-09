// ============================================================
// BACKGROUND.JS - SỰ KIỆN NỀN
// ============================================================

// Sự kiện khi click vào Icon Extension trên thanh công cụ
chrome.action.onClicked.addListener(() => {
  // Mở file dashboard.html trong một tab mới
  chrome.tabs.create({ url: "dashboard.html" });
});
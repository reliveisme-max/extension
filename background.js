// ============================================================
// BACKGROUND.JS - SỰ KIỆN NỀN
// ============================================================

// Sự kiện khi click vào Icon Extension trên thanh công cụ
chrome.action.onClicked.addListener(() => {
  // Mở file dashboard.html trong một tab mới
  chrome.tabs.create({ url: "dashboard.html" });
});
// ============================================================
// BACKGROUND.JS - SỰ KIỆN NỀN & API PROXY (FIX CORS)
// ============================================================

// 1. Sự kiện click Icon
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({ url: "dashboard.html" });
});

// 2. Lắng nghe yêu cầu từ Dashboard (Proxy API Mail.cx)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    
    // A. Xử lý tạo Mail
    if (request.action === "MAILCX_REGISTER") {
        (async () => {
            try {
                const res = await fetch("https://api.mail.cx/api/v1/auth/register", {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({ slug: request.slug })
                });
                const data = await res.json();
                
                // Lấy User Info để lấy email full
                const token = typeof data === 'string' ? data : (data.token || data.bearer_token);
                const userRes = await fetch("https://api.mail.cx/api/v1/users/me", {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const userData = await userRes.json();

                sendResponse({ success: true, email: userData.email, token: token, id: userData.id });
            } catch (error) {
                sendResponse({ success: false, error: error.message });
            }
        })();
        return true; // Giữ kết nối async
    }

    // B. Xử lý Check Inbox
    if (request.action === "MAILCX_CHECK") {
        (async () => {
            try {
                // 1. Lấy list tin nhắn
                const res = await fetch("https://api.mail.cx/api/v1/messages?limit=20", {
                    headers: { 'Authorization': `Bearer ${request.token}` }
                });
                const data = await res.json();
                const messages = Array.isArray(data) ? data : (data.data || []);
                
                // 2. Tìm thư FB
                const fbMail = messages.find(m => 
                    (m.from && (m.from.address.includes('facebook') || m.from.name.includes('Facebook'))) ||
                    (m.subject && m.subject.toLowerCase().includes('facebook'))
                );

                if (fbMail) {
                    // 3. Đọc chi tiết
                    const detailRes = await fetch(`https://api.mail.cx/api/v1/messages/${fbMail.id}`, {
                        headers: { 'Authorization': `Bearer ${request.token}` }
                    });
                    const detail = await detailRes.json();
                    const html = detail.body ? detail.body.html : "";
                    
                    // 4. Lấy Link
                    const linkMatch = html.match(/https:\/\/(business\.facebook\.com|www\.facebook\.com)\/confirmemail\.php[^"'\s<]+/);
                    
                    if (linkMatch) {
                        sendResponse({ success: true, found: true, link: linkMatch[0].replace(/&amp;/g, '&') });
                    } else {
                        sendResponse({ success: true, found: false });
                    }
                } else {
                    sendResponse({ success: true, found: false });
                }
            } catch (error) {
                sendResponse({ success: false, error: error.message });
            }
        })();
        return true;
    }
});
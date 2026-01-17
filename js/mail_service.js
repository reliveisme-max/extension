// ============================================================
// MAIL_SERVICE.JS - CLIENT (GỌI QUA BACKGROUND)
// ============================================================

// 1. Tạo Mail (Gửi lệnh sang Background)
function createMailAccount(username) {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: "MAILCX_REGISTER", slug: username }, (response) => {
            if (chrome.runtime.lastError) return reject(chrome.runtime.lastError.message);
            
            if (response && response.success) {
                resolve({
                    email: response.email,
                    token: response.token,
                    id: response.id
                });
            } else {
                reject(response ? response.error : "Lỗi không xác định");
            }
        });
    });
}

// 2. Chờ thư FB (Gửi lệnh sang Background)
async function waitForFbEmail(token, timeoutSeconds = 90) {
    let elapsed = 0;
    
    while (elapsed < timeoutSeconds) {
        // Gọi Background check inbox
        const result = await new Promise((resolve) => {
            chrome.runtime.sendMessage({ action: "MAILCX_CHECK", token: token }, (res) => {
                resolve(res);
            });
        });

        if (result && result.success && result.found) {
            return result.link; // Tìm thấy link
        }

        // Đợi 3s
        await new Promise(r => setTimeout(r, 3000));
        elapsed += 3;
    }
    return null;
}
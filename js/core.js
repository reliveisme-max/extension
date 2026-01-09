// ============================================================
// CORE.JS - TRÁI TIM HỆ THỐNG
// Chứa: Biến toàn cục, Hàm lấy Token, Check Cookie, User Info
// ============================================================

// --- 1. BIẾN TOÀN CỤC (GLOBAL VARIABLES) ---
// Các file khác (tab_scan, tab_reg...) sẽ dùng chung các biến này
let accessToken = "";
let currentUserId = "";
let listBM = []; 

// --- 2. HÀM CẬP NHẬT TRẠNG THÁI HEADER ---
function updateStatus(text, type) {
    const el = document.getElementById('token-status');
    if(!el) return;

    let icon = "fa-circle-notch fa-spin";
    if (type === "success") icon = "fa-check-circle";
    if (type === "danger") icon = "fa-triangle-exclamation";
    if (type === "warning") icon = "fa-circle-exclamation";

    el.innerHTML = `<i class="fa-solid ${icon}"></i> ${text}`;
    el.className = `status-badge ${type}`;
}

// --- 3. CHECK COOKIE SỐNG HAY CHẾT ---
function checkCookieAlive() {
    return new Promise((resolve) => {
        if (chrome.cookies) {
            chrome.cookies.get({ url: "https://www.facebook.com", name: "c_user" }, function(cookie) {
                resolve(!!cookie);
            });
        } else {
            resolve(true); // Fallback cho môi trường dev local
        }
    });
}

// --- 4. LẤY TOKEN (BRUTE FORCE) ---
async function getTokenBruteForce() {
    const sources = [
        'https://www.facebook.com/adsmanager/manage/campaigns',
        'https://business.facebook.com/business_locations',
        'https://www.facebook.com/composer/ocelot/async_loader/?publisher=feed',
        'https://www.facebook.com/ads/manager/account_settings/account_billing/'
    ];

    for (const url of sources) {
        try {
            const token = await fetchAndFindToken(url);
            if (token) return token; // Tìm thấy là trả về ngay
        } catch (e) { }
    }
    return null;
}

// Hàm phụ trợ: Gọi URL và soi Regex tìm EAA...
async function fetchAndFindToken(url) {
    try {
        const response = await fetch(url, { method: 'GET', credentials: 'include' });
        const text = await response.text();
        const match = text.match(/(EAA[a-zA-Z0-9]{30,})/);
        return match ? match[1] : null;
    } catch (error) { return null; }
}

// --- 5. LẤY INFO USER HIỆN TẠI ---
async function getSelfInfo() {
    if (!accessToken) return;
    try {
        const res = await fetch(`https://graph.facebook.com/me?access_token=${accessToken}`);
        const data = await res.json();
        
        if(data.id) {
            currentUserId = data.id;
            const nameEl = document.getElementById('user-name');
            if(nameEl) nameEl.innerText = data.name;
        }
    } catch(e) { console.error("Lỗi lấy Info User"); }
}

// --- 6. KHỞI ĐỘNG HỆ THỐNG (GỌI TỪ MAIN.JS) ---
async function initCore() {
    updateStatus("Check Cookies...", "warning");
    
    const hasCookie = await checkCookieAlive();
    if (!hasCookie) {
        updateStatus("Mất Cookie", "danger");
        alert("Lỗi: Không tìm thấy Cookie FB! Vui lòng đăng nhập Facebook.");
        return false;
    }

    updateStatus("Lấy Token...", "warning");
    const token = await getTokenBruteForce();

    if (token) {
        accessToken = token;
        updateStatus("Token Live", "success");
        await getSelfInfo();
        return true; // Thành công
    } else {
        updateStatus("Lỗi Token", "danger");
        alert("Không lấy được Token. Hãy thử vào 'adsmanager.facebook.com' thủ công một lần.");
        return false; // Thất bại
    }
}
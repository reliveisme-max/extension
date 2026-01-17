// ============================================================
// CORE.JS - TRÁI TIM HỆ THỐNG (FONT AWESOME VERSION)
// Chứa: Biến toàn cục, Hàm lấy Token, Check Cookie, User Info
// ============================================================

// --- 1. BIẾN TOÀN CỤC (GLOBAL VARIABLES) ---
// Cập nhật Version API tại đây (Bạn có thể sửa thành v25.0, v26.0... tùy ý)
const FB_API_VERSION = "v24.0"; 
const GRAPH_API = `https://graph.facebook.com/${FB_API_VERSION}`;

let accessToken = "";
let currentUserId = "";
let listBM = []; 

// --- 2. HÀM CẬP NHẬT TRẠNG THÁI HEADER ---
function updateStatus(text, type) {
    const el = document.getElementById('token-status');
    if(!el) return;

    let icon = "fa-spinner fa-spin"; 
    if (type === "success") icon = "fa-circle-check";
    if (type === "danger") icon = "fa-triangle-exclamation";
    if (type === "warning") icon = "fa-circle-exclamation";

    el.innerHTML = `<i class="fa-solid ${icon}"></i> ${text}`;
    el.className = `status-badge ${type}`;
}

// --- 3. CHECK COOKIE ---
function checkCookieAlive() {
    return new Promise((resolve) => {
        if (chrome.cookies) {
            chrome.cookies.get({ url: "https://www.facebook.com", name: "c_user" }, function(cookie) {
                resolve(!!cookie);
            });
        } else {
            resolve(true); 
        }
    });
}

// --- 4. LẤY TOKEN ---
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
            if (token) return token; 
        } catch (e) { }
    }
    return null;
}

async function fetchAndFindToken(url) {
    try {
        const response = await fetch(url, { method: 'GET', credentials: 'include' });
        const text = await response.text();
        const match = text.match(/(EAA[a-zA-Z0-9]{30,})/);
        return match ? match[1] : null;
    } catch (error) { return null; }
}

// --- 5. LẤY INFO USER (Đã dùng biến GRAPH_API) ---
async function getSelfInfo() {
    if (!accessToken) return;
    try {
        // Thay link cứng bằng biến GRAPH_API
        const res = await fetch(`${GRAPH_API}/me?access_token=${accessToken}`);
        const data = await res.json();
        
        if(data.id) {
            currentUserId = data.id;
            const nameEl = document.getElementById('user-name');
            if(nameEl) nameEl.innerText = data.name;
        }
    } catch(e) { console.error("Lỗi lấy Info User"); }
}

// --- 6. KHỞI ĐỘNG HỆ THỐNG ---
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
        return true; 
    } else {
        updateStatus("Lỗi Token", "danger");
        alert("Không lấy được Token. Hãy thử vào 'adsmanager.facebook.com' thủ công một lần.");
        return false; 
    }
}
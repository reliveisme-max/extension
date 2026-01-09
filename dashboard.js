// --- BIẾN TOÀN CỤC ---
let accessToken = "";
let currentUserId = ""; // ID của Via đang cầm
let listBM = []; 

// ============================================================
// 1. HỆ THỐNG KHỞI TẠO (INIT SYSTEM)
// ============================================================

async function initSystem() {
    const statusEl = document.getElementById('token-status');
    
    // 1. Check Cookies
    statusEl.innerHTML = '<i class="fa-solid fa-cookie-bite"></i> Check Cookies...';
    const hasCookie = await checkCookieAlive();
    
    if (!hasCookie) {
        updateStatus("Chưa Login", "danger");
        alert("Lỗi: Không tìm thấy Cookie! Vui lòng F5 lại tab Facebook.");
        return;
    }

    // 2. Lấy Token (Thuật toán Vét Cạn)
    statusEl.innerHTML = '<i class="fa-solid fa-bolt"></i> Lấy Token...';
    
    const sources = [
        'https://www.facebook.com/adsmanager/manage/campaigns',
        'https://business.facebook.com/business_locations',
        'https://www.facebook.com/composer/ocelot/async_loader/?publisher=feed',
        'https://www.facebook.com/ads/manager/account_settings/account_billing/'
    ];

    let foundToken = null;
    for (const url of sources) {
        try {
            const token = await fetchAndFindToken(url);
            if (token) { foundToken = token; break; }
        } catch (e) { }
    }

    if (foundToken) {
        accessToken = foundToken;
        updateStatus("Token Live", "success");
        
        // Lấy thông tin User & Scan BM
        await getSelfInfo();
        scanBMs();
    } else {
        updateStatus("Lỗi Token", "danger");
        alert("Không thể lấy Token! Hãy thử vào 'adsmanager.facebook.com' một lần.");
    }
}

// Hàm cập nhật trạng thái trên Header
function updateStatus(text, type) {
    const el = document.getElementById('token-status');
    el.innerHTML = `<i class="fa-solid fa-circle"></i> ${text}`;
    el.className = `status-badge ${type}`;
}

// Regex tìm Token
async function fetchAndFindToken(url) {
    try {
        const response = await fetch(url, { method: 'GET', credentials: 'include' });
        const text = await response.text();
        const match = text.match(/(EAA[a-zA-Z0-9]{30,})/);
        return match ? match[1] : null;
    } catch (error) { return null; }
}

function checkCookieAlive() {
    return new Promise((resolve) => {
        chrome.cookies.get({ url: "https://www.facebook.com", name: "c_user" }, function(cookie) {
            resolve(!!cookie);
        });
    });
}

// Lấy thông tin Via hiện tại (Để phục vụ tính năng Kick/Leave)
async function getSelfInfo() {
    try {
        const res = await fetch(`https://graph.facebook.com/me?access_token=${accessToken}`);
        const data = await res.json();
        if(data.id) {
            currentUserId = data.id;
            document.getElementById('user-name').innerText = data.name;
        }
    } catch(e) {}
}

// ============================================================
// 2. CORE: SCAN & RENDER TABLE
// ============================================================

async function scanBMs() {
    const btn = document.getElementById('btn-scan');
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tải...';
    btn.disabled = true;

    // API lấy BM + User Info
    const fields = "id,name,creation_time,verification_status,is_business_ban,sharing_eligibility_status,owned_pages{id},client_pages{id},business_users{id,role,name,email}";
    const url = `https://graph.facebook.com/v17.0/me/businesses?access_token=${accessToken}&fields=${fields}&limit=500`;

    try {
        const res = await fetch(url);
        const json = await res.json();
        
        if (json.data) {
            listBM = json.data;
            renderTable(listBM);
        } else {
             if(json.error && json.error.code == 190) initSystem(); // Token die thì lấy lại
        }
    } catch (err) {
        console.error(err);
    } finally {
        btn.innerHTML = '<i class="fa-solid fa-rotate"></i> Quét lại';
        btn.disabled = false;
    }
}

function renderTable(data) {
    const tbody = document.querySelector("#bm-table tbody");
    tbody.innerHTML = ""; 

    let stats = { total: data.length, live: 0, die: 0, hidden: 0 };

    data.forEach((bm) => {
        // --- 1. XỬ LÝ SỐ LIỆU ---
        let isDie = bm.is_business_ban;
        if (isDie) stats.die++; else stats.live++;

        let statusBadge = isDie 
            ? `<span class="badge badge-die">DIE / RESTRICTED</span>` 
            : `<span class="badge badge-live">LIVE</span>`;
        
        let verifyIcon = bm.verification_status === "verified" 
            ? `<i class="fa-solid fa-circle-check" style="color:#10b981; margin-left:5px" title="Đã xác minh"></i>` : "";

        let year = bm.creation_time ? bm.creation_time.substring(0, 4) : "-";

        let pageCount = (bm.owned_pages?.data?.length || 0) + (bm.client_pages?.data?.length || 0);

        let users = bm.business_users?.data || [];
        let adminCount = users.filter(u => u.role === 'ADMIN').length;
        let ghostAdmin = users.filter(u => !u.name || u.name === "Facebook User").length;
        if(ghostAdmin > 0) stats.hidden += ghostAdmin;

        // --- 2. TẠO HTML DÒNG ---
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="center"><input type="checkbox" class="bm-checkbox" value="${bm.id}"></td>
            <td>
                <span class="bm-name" id="name-${bm.id}">${bm.name} ${verifyIcon}</span>
                <span class="bm-id" onclick="copyToClipboard('${bm.id}')">${bm.id}</span>
            </td>
            <td>
                ${statusBadge} <br>
                <span style="font-size:11px; color:#6b7280; margin-top:2px; display:block">Năm: ${year}</span>
            </td>
            <td>
                <i class="fa-regular fa-flag"></i> <b>${pageCount}</b> Page
            </td>
            <td>
                <i class="fa-solid fa-user-shield"></i> <b>${adminCount}</b> Adm
                ${ghostAdmin > 0 ? `<div style="color:#ef4444; font-size:11px">(${ghostAdmin} ẩn)</div>` : ''}
            </td>
            <td class="center">
                <div class="action-group">
                    <button class="icon-btn link" onclick="actionLink('${bm.id}')" title="Tạo Link Mời"><i class="fa-solid fa-link"></i></button>
                    <button class="icon-btn edit" onclick="openRenameModal('${bm.id}', '${bm.name}')" title="Đổi tên"><i class="fa-solid fa-pen"></i></button>
                    <button class="icon-btn clean" onclick="actionClean('${bm.id}')" title="Đá Admin ẩn"><i class="fa-solid fa-broom"></i></button>
                    <button class="icon-btn leave" onclick="actionLeave('${bm.id}')" title="Rời BM"><i class="fa-solid fa-right-from-bracket"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Cập nhật thống kê
    document.getElementById('stat-total').innerText = stats.total;
    document.getElementById('stat-live').innerText = stats.live;
    document.getElementById('stat-die').innerText = stats.die;
    document.getElementById('stat-hidden').innerText = stats.hidden;
}

// ============================================================
// 3. ACTIONS (HÀNH ĐỘNG THẦN THÁNH)
// ============================================================

// --- A. TẠO LINK MỜI (GET BACKUP LINK) ---
async function actionLink(bmId) {
    if(!confirm("Tạo link mời Admin cho BM này?")) return;

    try {
        // Mẹo: Mời email ảo để lấy link, FB sẽ trả về link join trong response
        const fakeEmail = `backup.${Date.now()}@gmail.com`;
        const url = `https://graph.facebook.com/v17.0/${bmId}/business_users?access_token=${accessToken}`;
        
        const res = await fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ email: fakeEmail, role: 'ADMIN' })
        });
        
        const json = await res.json();
        
        // Lấy link từ response (trường invite_link)
        // Lưu ý: Tùy version API, có thể cần gọi thêm 1 bước list pending invites. 
        // Nhưng thường response post sẽ trả về id, ta dùng id đó để get link.
        
        if (json.id) {
             // Gọi tiếp để lấy link chính xác
             const linkRes = await fetch(`https://graph.facebook.com/v17.0/${bmId}/pending_users?access_token=${accessToken}&fields=invite_link,email`);
             const linkJson = await linkRes.json();
             const invite = linkJson.data.find(i => i.email === fakeEmail);
             
             if(invite && invite.invite_link) {
                 copyToClipboard(invite.invite_link);
                 alert("Đã tạo & Copy link mời thành công! \n" + invite.invite_link);
             } else {
                 alert("Đã gửi lời mời nhưng chưa lấy được Link (Do FB lag). Hãy thử lại.");
             }
        } else {
            alert("Lỗi: " + (json.error ? json.error.message : "Không xác định"));
        }
    } catch(e) {
        console.error(e);
        alert("Lỗi kết nối khi tạo link.");
    }
}

// --- B. ĐỔI TÊN BM (RENAME) ---
let currentEditId = null;
function openRenameModal(id, currentName) {
    currentEditId = id;
    document.getElementById('modal-bm-id').innerText = `ID: ${id}`;
    document.getElementById('new-bm-name').value = currentName;
    document.getElementById('rename-modal').style.display = "block";
}

document.getElementById('btn-cancel-rename').onclick = () => {
    document.getElementById('rename-modal').style.display = "none";
};

document.getElementById('btn-confirm-rename').onclick = async () => {
    const newName = document.getElementById('new-bm-name').value;
    if(!newName) return;

    try {
        const url = `https://graph.facebook.com/v17.0/${currentEditId}?access_token=${accessToken}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ name: newName })
        });
        const json = await res.json();
        
        if(json.success) {
            // Cập nhật giao diện ngay lập tức
            document.getElementById(`name-${currentEditId}`).innerText = newName;
            document.getElementById('rename-modal').style.display = "none";
            // alert("Đổi tên thành công!"); // Bỏ alert cho sang
        } else {
            alert("Lỗi: " + json.error.message);
        }
    } catch(e) { alert("Lỗi mạng!"); }
};

// --- C. DỌN DẸP ADMIN (CLEAN) ---
async function actionClean(bmId) {
    if(!confirm("CẢNH BÁO: Bạn có chắc muốn đá tất cả Admin khác ra khỏi BM này không?")) return;
    
    // Tìm BM trong list để lấy danh sách user
    const targetBM = listBM.find(b => b.id == bmId);
    if(!targetBM) return;

    const users = targetBM.business_users.data;
    let kickCount = 0;

    for (const u of users) {
        // Không đá chính mình (currentUserId)
        if (u.id === currentUserId) continue;

        // Thực hiện đá
        try {
            await fetch(`https://graph.facebook.com/v17.0/${u.id}?access_token=${accessToken}`, { method: 'DELETE' });
            kickCount++;
        } catch(e) { console.log("Kick fail", u.name); }
    }

    alert(`Đã dọn dẹp xong! Đá thành công ${kickCount} admin lạ.`);
    scanBMs(); // Quét lại
}

// --- D. RỜI BM (LEAVE) ---
async function actionLeave(bmId) {
    if(!confirm("Bạn chắc chắn muốn RỜI khỏi BM này chứ?")) return;

    // Logic rời: Cần tìm ID của "Mình" trong BM đó (Business User ID khác với User ID cá nhân)
    // 1. Tìm Business User ID của mình trong BM đó
    const targetBM = listBM.find(b => b.id == bmId);
    const myBusUser = targetBM.business_users.data.find(u => u.user?.id === currentUserId || u.name === document.getElementById('user-name').innerText);
    
    // Nếu API trả về user.id thì ngon, nếu ko phải đoán qua tên (rủi ro). 
    // Tuy nhiên Graph API v17 thường trả về id trực tiếp của Business User.
    // Cách an toàn nhất: Call DELETE /me/businesses?business_id=... (Nhưng API này đã bị deprecate)
    // Cách hiện tại: DELETE /{bm_id}/business_users/{my_business_user_id}
    
    // Đơn giản hóa: Gọi API remove user với ID lấy được
    // Lưu ý: ID trong business_users.data chính là id cần xóa
    
    // Tìm ID của mình trong list users của BM
    // (Cần logic mapping chính xác hơn ở version sau, tạm thời lấy user trùng tên hoặc gọi API me/permissions)
    
    alert("Tính năng Rời BM đang được nâng cấp để đảm bảo an toàn (Tránh out nhầm). Hãy dùng chức năng Kick Admin trước!");
}


// ============================================================
// 4. TIỆN ÍCH (UTILS)
// ============================================================

function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    // Hiệu ứng visual nhỏ (optional)
}

document.getElementById('search-input').addEventListener('keyup', (e) => {
    const keyword = e.target.value.toLowerCase();
    const filtered = listBM.filter(bm => bm.name.toLowerCase().includes(keyword) || bm.id.includes(keyword));
    renderTable(filtered);
});

// Sự kiện
document.getElementById('btn-scan').addEventListener('click', scanBMs);

// START
initSystem();
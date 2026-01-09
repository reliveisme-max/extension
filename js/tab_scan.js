// ============================================================
// TAB_SCAN.JS - LOGIC QUÉT VÀ HIỂN THỊ (V6 FINAL)
// Chứa: Logic Check Xanh/Đỏ tuyệt đối
// ============================================================

// --- HÀM 1: QUÉT DATA TỪ FACEBOOK ---
async function scanBMs() {
    const btn = document.getElementById('btn-scan');
    
    // 1. Khóa nút
    if(btn) {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tải...';
        btn.disabled = true;
    }

    // 2. Check Token
    if (!accessToken) {
        // console.error("Chưa có Token.");
        if(btn) { btn.innerHTML = '<i class="fa-solid fa-rotate"></i> Quét lại'; btn.disabled = false; }
        return;
    }

    // 3. Gọi API Graph
    // Lấy thêm sharing_eligibility_status để bắt lỗi Hạn chế QC
    const fields = "id,name,creation_time,verification_status,is_business_ban,sharing_eligibility_status,owned_pages{id},client_pages{id},business_users{id,role,name,email}";
    const url = `https://graph.facebook.com/v17.0/me/businesses?access_token=${accessToken}&fields=${fields}&limit=500`;

    try {
        const res = await fetch(url);
        const json = await res.json();
        
        if (json.data) {
            listBM = json.data;
            renderTable(listBM);
        } else {
            if (json.error && json.error.code === 190) {
                // Token die -> Gọi Core lấy lại
                await initCore(); 
            }
        }
    } catch (err) {
        console.error("Lỗi mạng:", err);
    } finally {
        if(btn) {
            btn.innerHTML = '<i class="fa-solid fa-rotate"></i> Quét lại';
            btn.disabled = false;
        }
    }
}

// --- HÀM 2: VẼ BẢNG DỮ LIỆU (RENDER) ---
function renderTable(data) {
    const tbody = document.querySelector("#bm-table tbody");
    if(!tbody) return;
    tbody.innerHTML = ""; 

    let stats = { total: data.length, live: 0, die: 0, hidden: 0 };

    data.forEach((bm) => {
        // --- A. LOGIC CHECK TRẠNG THÁI (MỚI) ---
        // Logic: Chỉ cần dính 1 lỗi nhỏ -> ĐỎ LUÔN
        
        let isDie = false;
        let statusBadge = "";

        // Kiểm tra các điều kiện xấu
        if (
            bm.is_business_ban === true || // Bị vô hiệu hóa hẳn
            bm.sharing_eligibility_status === 'restricted' || // Hạn chế QC (Page đỏ)
            bm.sharing_eligibility_status === 'hub_restricted' || // Hạn chế Hub
            bm.sharing_eligibility_status === 'probation' // Đang thử thách
        ) {
            isDie = true;
        }

        if (isDie) {
            stats.die++;
            // Hiển thị ĐỎ
            statusBadge = `<span class="badge badge-die" style="background:rgba(239, 68, 68, 0.2); color:#ef4444; border:1px solid #ef4444;">RESTRICTED</span>`;
        } else {
            stats.live++;
            // Hiển thị XANH
            statusBadge = `<span class="badge badge-live">LIVE</span>`;
        }

        // --- B. CÁC THÔNG SỐ KHÁC ---
        
        // Tích xanh
        let verifyIcon = bm.verification_status === "verified" 
            ? `<i class="fa-solid fa-circle-check" style="color:#3b82f6; margin-left:5px" title="Verified BM"></i>` : "";

        // Năm tạo
        let year = bm.creation_time ? bm.creation_time.substring(0, 4) : "-";

        // Tài sản
        let pageCount = 0;
        if(bm.owned_pages?.data) pageCount += bm.owned_pages.data.length;
        if(bm.client_pages?.data) pageCount += bm.client_pages.data.length;

        // Admin & Ẩn
        let users = bm.business_users?.data || [];
        let adminCount = users.filter(u => u.role === 'ADMIN').length;
        let ghostAdmin = users.filter(u => !u.name || u.name === "Facebook User").length;
        if(ghostAdmin > 0) stats.hidden += ghostAdmin;

        // --- C. HTML ROW ---
        const tr = document.createElement("tr");
        
        tr.innerHTML = `
            <td class="center"><input type="checkbox" class="bm-checkbox" value="${bm.id}"></td>
            <td>
                <span class="bm-name" id="name-${bm.id}">${bm.name} ${verifyIcon}</span>
                <span class="bm-id" onclick="copyToClipboard('${bm.id}')">${bm.id}</span>
            </td>
            <td>
                ${statusBadge} <br>
                <span style="font-size:11px; color:#6b7280; margin-top:4px; display:block">Năm: ${year}</span>
            </td>
            <td>
                <i class="fa-regular fa-flag"></i> <b>${pageCount}</b> Page
            </td>
            <td>
                <i class="fa-solid fa-user-shield"></i> <b>${adminCount}</b> Adm
                ${ghostAdmin > 0 ? `<div style="color:#ef4444; font-size:10px; font-weight:bold">(${ghostAdmin} ẩn)</div>` : ''}
            </td>
            <td class="center">
                <div class="action-group">
                    <button class="icon-btn link" onclick="actionLink('${bm.id}')" title="Lấy Link Mời"><i class="fa-solid fa-link"></i></button>
                    <button class="icon-btn edit" onclick="openRenameModal('${bm.id}', '${bm.name}')" title="Đổi tên"><i class="fa-solid fa-pen"></i></button>
                    <button class="icon-btn clean" onclick="actionClean('${bm.id}')" title="Đá Admin ẩn"><i class="fa-solid fa-broom"></i></button>
                    <button class="icon-btn leave" onclick="actionLeave('${bm.id}')" title="Rời BM"><i class="fa-solid fa-right-from-bracket"></i></button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Update Stats UI
    updateStatsUI(stats);
}

// Update UI
function updateStatsUI(stats) {
    const sTotal = document.getElementById('stat-total');
    const sLive = document.getElementById('stat-live');
    const sDie = document.getElementById('stat-die');
    const sHidden = document.getElementById('stat-hidden');

    if(sTotal) sTotal.innerText = stats.total;
    if(sLive) sLive.innerText = stats.live;
    if(sDie) sDie.innerText = stats.die;
    if(sHidden) sHidden.innerText = stats.hidden;
}

// Utils
function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
}
// ============================================================
// TAB_SCAN.JS - LOGIC QUÉT VÀ HIỂN THỊ (UI PHOSPHOR MOI)
// ============================================================

// --- HÀM 1: QUÉT DATA TỪ FACEBOOK ---
async function scanBMs() {
    const btn = document.getElementById('btn-scan');
    
    // UI Loading
    if(btn) {
        const originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i> Đang tải...';
        btn.disabled = true;
    }

    if (!accessToken) {
        if(btn) { 
            btn.innerHTML = '<i class="ph-bold ph-arrows-clockwise"></i> Quét Dữ Liệu'; 
            btn.disabled = false; 
        }
        return;
    }

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
                await initCore(); 
            }
        }
    } catch (err) {
        console.error("Lỗi mạng:", err);
    } finally {
        if(btn) {
            btn.innerHTML = '<i class="ph-bold ph-arrows-clockwise"></i> Quét Dữ Liệu';
            btn.disabled = false;
        }
    }
}

// --- HÀM 2: VẼ BẢNG DỮ LIỆU (RENDER UI MỚI) ---
function renderTable(data) {
    const tbody = document.querySelector("#bm-table tbody");
    if(!tbody) return;
    tbody.innerHTML = ""; 

    let stats = { total: data.length, live: 0, die: 0, hidden: 0 };

    data.forEach((bm) => {
        // --- LOGIC CHECK TRẠNG THÁI ---
        let isDie = false;
        let statusBadge = "";

        if (
            bm.is_business_ban === true || 
            bm.sharing_eligibility_status === 'restricted' || 
            bm.sharing_eligibility_status === 'hub_restricted' || 
            bm.sharing_eligibility_status === 'probation'
        ) {
            isDie = true;
        }

        if (isDie) {
            stats.die++;
            // Badge đỏ đẹp
            statusBadge = `<span class="badge badge-die"><i class="ph-bold ph-warning-circle"></i> Restricted</span>`;
        } else {
            stats.live++;
            // Badge xanh đẹp
            statusBadge = `<span class="badge badge-live"><i class="ph-bold ph-check-circle"></i> Live</span>`;
        }

        // --- CÁC THÔNG SỐ KHÁC ---
        // Icon tích xanh (Phosphor Fill)
        let verifyIcon = bm.verification_status === "verified" 
            ? `<i class="ph-fill ph-seal-check" style="color:#38bdf8; margin-left:4px; vertical-align: middle;" title="Đã xác minh"></i>` : "";

        let year = bm.creation_time ? bm.creation_time.substring(0, 4) : "-";

        let pageCount = 0;
        if(bm.owned_pages?.data) pageCount += bm.owned_pages.data.length;
        if(bm.client_pages?.data) pageCount += bm.client_pages.data.length;

        let users = bm.business_users?.data || [];
        let adminCount = users.filter(u => u.role === 'ADMIN').length;
        let ghostAdmin = users.filter(u => !u.name || u.name === "Facebook User").length;
        if(ghostAdmin > 0) stats.hidden += ghostAdmin;

        // --- TẠO HTML ROW (DÙNG PHOSPHOR ICON TRONG BUTTON) ---
        const tr = document.createElement("tr");
        
        tr.innerHTML = `
            <td class="center"><input type="checkbox" class="bm-checkbox" value="${bm.id}"></td>
            <td>
                <span class="bm-name" id="name-${bm.id}">${bm.name} ${verifyIcon}</span>
                <span class="bm-id pointer-copy" data-id="${bm.id}" title="Click để copy ID">${bm.id}</span>
            </td>
            <td>
                ${statusBadge} <br>
                <span style="font-size:11px; color:#64748b; margin-top:4px; display:block">Năm tạo: ${year}</span>
            </td>
            <td>
                <div style="display:flex; align-items:center; gap:6px;">
                    <i class="ph-bold ph-flag" style="color:#94a3b8"></i> 
                    <b>${pageCount}</b> Page
                </div>
            </td>
            <td>
                <div style="display:flex; align-items:center; gap:6px;">
                    <i class="ph-bold ph-shield-check" style="color:#94a3b8"></i> 
                    <b>${adminCount}</b> Adm
                </div>
                ${ghostAdmin > 0 ? `<div style="color:#f87171; font-size:10px; font-weight:bold; margin-top:2px;">(${ghostAdmin} ẩn)</div>` : ''}
            </td>
            <td class="center">
                <div class="action-group">
                    <button class="icon-btn btn-action" data-action="link" data-id="${bm.id}" title="Lấy Link Mời">
                        <i class="ph-bold ph-link"></i>
                    </button>
                    <button class="icon-btn btn-action" data-action="edit" data-id="${bm.id}" data-name="${bm.name}" title="Đổi tên">
                        <i class="ph-bold ph-pencil-simple"></i>
                    </button>
                    <button class="icon-btn btn-action" data-action="clean" data-id="${bm.id}" title="Quét Admin Ẩn">
                        <i class="ph-bold ph-broom"></i>
                    </button>
                    <button class="icon-btn btn-action" data-action="leave" data-id="${bm.id}" title="Rời BM">
                        <i class="ph-bold ph-sign-out"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    updateStatsUI(stats);
}

// Cập nhật thống kê
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

// Tìm kiếm
const searchInput = document.getElementById('search-input');
if(searchInput) {
    searchInput.addEventListener('keyup', (e) => {
        const keyword = e.target.value.toLowerCase();
        const filtered = listBM.filter(bm => 
            (bm.name && bm.name.toLowerCase().includes(keyword)) || 
            (bm.id && bm.id.includes(keyword))
        );
        renderTable(filtered);
    });
}

// Nút Quét
const btnScan = document.getElementById('btn-scan');
if(btnScan) btnScan.addEventListener('click', scanBMs);
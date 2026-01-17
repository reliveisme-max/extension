// ============================================================
// TAB_SCAN.JS - LOGIC QUÉT VÀ HIỂN THỊ (FIX DATE V2)
// ============================================================

// --- HÀM 1: QUÉT DATA TỪ FACEBOOK ---
async function scanBMs() {
    const btn = document.getElementById('btn-scan');
    
    // UI Loading
    if(btn) {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tải...';
        btn.disabled = true;
    }

    if (!accessToken) {
        if(btn) { 
            btn.innerHTML = '<i class="fa-solid fa-rotate"></i> Quét Dữ Liệu'; 
            btn.disabled = false; 
        }
        return;
    }

    // [UPDATE] Thêm created_time đề phòng FB đổi tên
    const fields = "id,name,creation_time,created_time,verification_status,is_business_ban,sharing_eligibility_status,owned_pages{id},client_pages{id},business_users{id,role,name,email}";
    const url = `${GRAPH_API}/me/businesses?access_token=${accessToken}&fields=${fields}&limit=500`;

    try {
        const res = await fetch(url);
        const json = await res.json();
        
        if (json.data) {
            console.log("🔥 Dữ liệu BM Raw:", json.data); // [DEBUG] Check xem FB trả về gì
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
            btn.innerHTML = '<i class="fa-solid fa-rotate"></i> Quét Dữ Liệu';
            btn.disabled = false;
        }
    }
}

// --- HÀM 2: VẼ BẢNG DỮ LIỆU ---
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
            statusBadge = `<span class="badge badge-die"><i class="fa-solid fa-circle-exclamation"></i> Restricted</span>`;
        } else {
            stats.live++;
            statusBadge = `<span class="badge badge-live"><i class="fa-solid fa-circle-check"></i> Live</span>`;
        }

        // --- CÁC THÔNG SỐ KHÁC ---
        let verifyIcon = bm.verification_status === "verified" 
            ? `<i class="fa-solid fa-circle-check" style="color:#38bdf8; margin-left:4px; vertical-align: middle;" title="Đã xác minh"></i>` : "";

        // [FIXED V2] Kiểm tra kỹ cả 2 trường time
        let rawDate = bm.creation_time || bm.created_time;
        let displayDate = '<span style="color:#64748b; font-style:italic">N/A</span>';
        
        if (rawDate) {
            const d = new Date(rawDate);
            // Format: 29/05/2023
            const dateStr = d.toLocaleDateString('vi-VN'); 
            displayDate = `<b style="color:#e2e8f0">${dateStr}</b>`;
        }

        let pageCount = 0;
        if(bm.owned_pages?.data) pageCount += bm.owned_pages.data.length;
        if(bm.client_pages?.data) pageCount += bm.client_pages.data.length;

        let users = bm.business_users?.data || [];
        let adminCount = users.filter(u => u.role === 'ADMIN').length;
        let ghostAdmin = users.filter(u => !u.name || u.name === "Facebook User").length;
        if(ghostAdmin > 0) stats.hidden += ghostAdmin;

        // --- TẠO HTML ROW ---
        const tr = document.createElement("tr");
        
        tr.innerHTML = `
            <td class="center"><input type="checkbox" class="bm-checkbox" value="${bm.id}"></td>
            <td>
                <span class="bm-name" id="name-${bm.id}">${bm.name} ${verifyIcon}</span>
                <span class="bm-id pointer-copy" data-id="${bm.id}" title="Click để copy ID">${bm.id}</span>
            </td>
            <td>
                ${statusBadge} <br>
                <span style="font-size:11px; color:#64748b; margin-top:4px; display:block">
                    Ngày tạo: ${displayDate}
                </span>
            </td>
            <td>
                <div style="display:flex; align-items:center; gap:6px;">
                    <i class="fa-solid fa-flag" style="color:#94a3b8"></i> 
                    <b>${pageCount}</b> Page
                </div>
            </td>
            <td>
                <div style="display:flex; align-items:center; gap:6px;">
                    <i class="fa-solid fa-user-shield" style="color:#94a3b8"></i> 
                    <b>${adminCount}</b> Adm
                </div>
                ${ghostAdmin > 0 ? `<div style="color:#f87171; font-size:10px; font-weight:bold; margin-top:2px;">(${ghostAdmin} ẩn)</div>` : ''}
            </td>
            <td class="center">
                <div class="action-group">
                    <button class="icon-btn btn-action" data-action="link" data-id="${bm.id}" title="Lấy Link Mời">
                        <i class="fa-solid fa-link"></i>
                    </button>
                    <button class="icon-btn btn-action" data-action="edit" data-id="${bm.id}" data-name="${bm.name}" title="Đổi tên">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="icon-btn btn-action" data-action="clean" data-id="${bm.id}" title="Quét Admin Ẩn">
                        <i class="fa-solid fa-broom"></i>
                    </button>
                    <button class="icon-btn btn-action" data-action="leave" data-id="${bm.id}" title="Rời BM">
                        <i class="fa-solid fa-right-from-bracket"></i>
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
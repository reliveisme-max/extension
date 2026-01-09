// ============================================================
// MAIN.JS - ĐIỀU KHIỂN CHUNG (ĐÃ SỬA LỖI CLICK)
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Khởi chạy hệ thống (Lấy Token, User Info)
    const isReady = await initCore();
    
    if (isReady) {
        // Nếu OK thì quét BM (Tab quản lý) luôn
        if (typeof scanBMs === "function") {
            scanBMs();
        }
    }

    // --- 2. GÁN SỰ KIỆN CLICK CHO MENU (FIX LỖI) ---
    // Thay vì dùng onclick trong HTML, ta bắt sự kiện tại đây
    
    const navScan = document.getElementById('nav-scan');
    const navReg = document.getElementById('nav-reg');

    // Bắt sự kiện click Tab Quản Lý
    if (navScan) {
        navScan.addEventListener('click', () => {
            switchTab('tab-scan', navScan);
        });
    }

    // Bắt sự kiện click Tab Reg BM
    if (navReg) {
        navReg.addEventListener('click', () => {
            switchTab('tab-reg', navReg);
            
            // Gọi hàm check limit bên tab_reg.js ngay khi chuyển tab
            if (typeof checkViaLimit === 'function') {
                checkViaLimit();
            }
        });
    }
});

// --- HÀM CHUYỂN TAB (HELPER) ---
function switchTab(tabId, activeMenuEl) {
    // 1. Ẩn hết nội dung tab cũ
    document.querySelectorAll('.tab-panel').forEach(el => {
        el.classList.remove('active');
    });

    // 2. Bỏ active ở tất cả menu cũ
    document.querySelectorAll('.menu li').forEach(el => {
        el.classList.remove('active');
    });

    // 3. Hiện tab được chọn
    const targetPanel = document.getElementById(tabId);
    if (targetPanel) targetPanel.classList.add('active');

    // 4. Active menu được chọn
    if (activeMenuEl) activeMenuEl.classList.add('active');
}

// --- 3. CÁC XỬ LÝ CHECKBOX & BULK ACTIONS (GIỮ NGUYÊN) ---

const checkAllBox = document.getElementById('check-all');
if (checkAllBox) {
    checkAllBox.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        const allBoxes = document.querySelectorAll('.bm-checkbox');
        allBoxes.forEach(box => box.checked = isChecked);
        updateBulkActionUI();
    });
}

const bmTable = document.getElementById('bm-table');
if (bmTable) {
    bmTable.addEventListener('change', (e) => {
        if (e.target.classList.contains('bm-checkbox')) {
            updateBulkActionUI();
            if (!e.target.checked) document.getElementById('check-all').checked = false;
        }
    });
}

function updateBulkActionUI() {
    const selectedCount = document.querySelectorAll('.bm-checkbox:checked').length;
    const bulkBar = document.getElementById('bulk-actions');
    const countSpan = document.getElementById('selected-count');

    if (bulkBar && countSpan) {
        countSpan.innerText = selectedCount;
        if (selectedCount > 0) {
            bulkBar.style.opacity = "1";
            bulkBar.style.pointerEvents = "auto";
        } else {
            bulkBar.style.opacity = "0.5";
            bulkBar.style.pointerEvents = "none";
        }
    }
}

// Xử lý nút Rời hàng loạt
const btnBulkLeave = document.getElementById('btn-bulk-leave');
if (btnBulkLeave) {
    btnBulkLeave.addEventListener('click', async () => {
        const selectedIds = Array.from(document.querySelectorAll('.bm-checkbox:checked')).map(cb => cb.value);
        if (selectedIds.length === 0) return;

        if (!confirm(`⚠️ CẢNH BÁO: Rời ${selectedIds.length} BM cùng lúc?`)) return;

        btnBulkLeave.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> ...';
        btnBulkLeave.disabled = true;

        for (const bmId of selectedIds) {
            try {
                // Logic rời nhanh (copy logic)
                let myUserId = currentUserId; 
                const targetBM = listBM.find(b => b.id == bmId);
                if(targetBM && targetBM.business_users) {
                    const me = targetBM.business_users.data.find(u => u.id === currentUserId || u.user?.id === currentUserId);
                    if(me) myUserId = me.id;
                }
                await fetch(`https://graph.facebook.com/v17.0/${bmId}/business_users/${myUserId}?access_token=${accessToken}`, { method: 'DELETE' });
            } catch (e) {}
        }

        alert("Xong!");
        btnBulkLeave.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> Rời BM';
        btnBulkLeave.disabled = false;
        if(checkAllBox) checkAllBox.checked = false;
        if (typeof scanBMs === "function") scanBMs();
    });
}
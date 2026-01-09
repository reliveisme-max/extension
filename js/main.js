// ============================================================
// MAIN.JS - ĐIỀU KHIỂN CHUNG
// Chứa: Khởi chạy App, Chuyển Tab, Xử lý Checkbox hàng loạt
// ============================================================

// --- 1. KHỞI CHẠY ỨNG DỤNG KHI LOAD TRANG ---
document.addEventListener('DOMContentLoaded', async () => {
    // Gọi Core để lấy Token và User Info
    const isReady = await initCore();
    
    if (isReady) {
        // Nếu OK thì quét BM luôn
        scanBMs();
    }
});

// --- 2. CHUYỂN TAB (SWITCH TAB) ---
function switchTab(tabId, element) {
    // Ẩn tất cả nội dung tab
    document.querySelectorAll('.tab-panel').forEach(el => {
        el.classList.remove('active');
    });

    // Bỏ active ở tất cả menu
    document.querySelectorAll('.menu li').forEach(el => {
        el.classList.remove('active');
    });

    // Hiện tab được chọn
    document.getElementById(tabId).classList.add('active');
    element.classList.add('active');
}

// --- 3. XỬ LÝ CHECKBOX & BULK ACTIONS (CHỌN NHIỀU) ---

// Sự kiện: Bấm nút "Check All" ở đầu bảng
const checkAllBox = document.getElementById('check-all');
if (checkAllBox) {
    checkAllBox.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        const allBoxes = document.querySelectorAll('.bm-checkbox');
        
        allBoxes.forEach(box => {
            box.checked = isChecked;
        });
        
        updateBulkActionUI();
    });
}

// Sự kiện: Bấm vào từng checkbox nhỏ (Dùng Event Delegation)
document.getElementById('bm-table').addEventListener('change', (e) => {
    if (e.target.classList.contains('bm-checkbox')) {
        updateBulkActionUI();
        
        // Nếu bỏ 1 cái thì bỏ luôn Check All
        if (!e.target.checked) {
            document.getElementById('check-all').checked = false;
        }
    }
});

// Hàm cập nhật giao diện thanh Hành động hàng loạt
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

// --- 4. XỬ LÝ NÚT RỜI HÀNG LOẠT (BULK LEAVE) ---
const btnBulkLeave = document.getElementById('btn-bulk-leave');
if (btnBulkLeave) {
    btnBulkLeave.addEventListener('click', async () => {
        const selectedIds = Array.from(document.querySelectorAll('.bm-checkbox:checked')).map(cb => cb.value);
        
        if (selectedIds.length === 0) return;

        if (!confirm(`⚠️ CẢNH BÁO NGUY HIỂM\n\nBạn sắp RỜI khỏi ${selectedIds.length} BM cùng lúc.\nHành động này không thể hoàn tác!\n\nBạn có chắc chắn không?`)) return;

        // UI Feedback
        btnBulkLeave.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang chạy...';
        btnBulkLeave.disabled = true;

        let successCount = 0;

        // Chạy vòng lặp rời từng cái (gọi hàm actionLeave từ tab_action.js nhưng sửa lại chút để ko alert liên tục)
        // Ở đây ta viết logic rời nhanh
        for (const bmId of selectedIds) {
            try {
                // Logic rời (Copy từ Action Leave)
                const targetBM = listBM.find(b => b.id == bmId);
                let myUserId = currentUserId; 
                if(targetBM) {
                    const me = targetBM.business_users.data.find(u => u.id === currentUserId);
                    if(me) myUserId = me.id;
                }
                
                await fetch(`https://graph.facebook.com/v17.0/${bmId}/business_users/${myUserId}?access_token=${accessToken}`, { method: 'DELETE' });
                // Hoặc endpoint fallback
                // await fetch(`https://graph.facebook.com/v17.0/${myUserId}?access_token=${accessToken}`, { method: 'DELETE' });
                
                successCount++;
            } catch (e) { console.error(e); }
        }

        alert(`Đã thực hiện xong!\nThành công: ${successCount}/${selectedIds.length}`);
        
        // Reset UI
        btnBulkLeave.innerHTML = '<i class="fa-solid fa-right-from-bracket"></i> Rời BM';
        btnBulkLeave.disabled = false;
        document.getElementById('check-all').checked = false;
        
        // Quét lại
        scanBMs();
    });
}
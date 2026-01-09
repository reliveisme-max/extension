// ============================================================
// TAB_ACTION.JS - CÁC HÀNH ĐỘNG XỬ LÝ BM
// Chứa: actionLink, actionClean, actionLeave, Rename Logic
// ============================================================

// --- 1. TẠO LINK MỜI (GET BACKUP LINK) ---
async function actionLink(bmId) {
    if (!accessToken) return alert("Chưa có Token!");

    // Hỏi xác nhận cho chắc
    if (!confirm("Bạn muốn tạo Link mời Admin dự phòng cho BM này?")) return;

    try {
        // Bước 1: Mời 1 email ảo vào làm Admin
        // (FB sẽ sinh ra link mời cho email này)
        const fakeEmail = `backup.${Date.now()}@gmail.com`;
        const urlInvite = `https://graph.facebook.com/v17.0/${bmId}/business_users?access_token=${accessToken}`;
        
        const resInvite = await fetch(urlInvite, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ email: fakeEmail, role: 'ADMIN' })
        });
        
        const jsonInvite = await resInvite.json();

        // Bước 2: Lấy Link từ danh sách lời mời đang chờ (Pending)
        if (jsonInvite.id) {
            const urlGetLink = `https://graph.facebook.com/v17.0/${bmId}/pending_users?access_token=${accessToken}&fields=invite_link,email`;
            const resLink = await fetch(urlGetLink);
            const jsonLink = await resLink.json();
            
            // Tìm đúng cái email vừa mời
            const inviteData = jsonLink.data.find(i => i.email === fakeEmail);
            
            if (inviteData && inviteData.invite_link) {
                // Copy luôn vào clipboard
                navigator.clipboard.writeText(inviteData.invite_link);
                alert("✅ Đã lấy Link thành công & Copy vào bộ nhớ!\n\n" + inviteData.invite_link);
            } else {
                alert("⚠️ Đã gửi lời mời nhưng Facebook chưa trả về Link kịp. Hãy thử lại sau 10s.");
            }
        } else {
            alert("❌ Lỗi tạo lời mời: " + (jsonInvite.error ? jsonInvite.error.message : "Unknown error"));
        }
    } catch (e) {
        console.error(e);
        alert("Lỗi kết nối mạng.");
    }
}

// --- 2. ĐỔI TÊN BM (RENAME LOGIC) ---
let currentEditBmId = null; // Biến tạm lưu ID đang sửa

// Mở Modal
function openRenameModal(id, currentName) {
    currentEditBmId = id;
    const modal = document.getElementById('rename-modal');
    document.getElementById('modal-bm-id').innerText = `ID: ${id}`;
    document.getElementById('new-bm-name').value = currentName;
    modal.style.display = "block";
    document.getElementById('new-bm-name').focus();
}

// Đóng Modal
document.getElementById('btn-cancel-rename').addEventListener('click', () => {
    document.getElementById('rename-modal').style.display = "none";
});

// Lưu Tên Mới
document.getElementById('btn-confirm-rename').addEventListener('click', async () => {
    const newName = document.getElementById('new-bm-name').value.trim();
    if (!newName) return alert("Vui lòng nhập tên mới!");
    
    // UI Feedback
    const btn = document.getElementById('btn-confirm-rename');
    const originalText = btn.innerText;
    btn.innerText = "Đang lưu...";
    btn.disabled = true;

    try {
        const url = `https://graph.facebook.com/v17.0/${currentEditBmId}?access_token=${accessToken}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ name: newName })
        });
        const json = await res.json();

        if (json.success) {
            // Cập nhật giao diện ngay lập tức (không cần load lại trang)
            const nameEl = document.getElementById(`name-${currentEditBmId}`);
            if(nameEl) nameEl.innerText = newName;
            
            document.getElementById('rename-modal').style.display = "none";
            // alert("Đổi tên thành công!");
        } else {
            alert("Lỗi FB: " + json.error.message);
        }
    } catch (e) {
        alert("Lỗi kết nối.");
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
});

// --- 3. DỌN DẸP ADMIN ẨN (CLEAN / KICK) ---
async function actionClean(bmId) {
    if (!confirm("⚠️ CẢNH BÁO: Hành động này sẽ đá tất cả Admin khác ra khỏi BM, chỉ giữ lại bạn.\n\nBạn chắc chắn chứ?")) return;

    // Tìm thông tin BM trong listBM (biến toàn cục bên core.js)
    const targetBM = listBM.find(b => b.id == bmId);
    if (!targetBM) return alert("Không tìm thấy dữ liệu BM này.");

    const users = targetBM.business_users.data;
    let kickCount = 0;
    let failCount = 0;

    // Duyệt qua từng user để đá
    for (const u of users) {
        // Bỏ qua chính mình (currentUserId lấy từ core.js)
        // Nếu user.id (Global ID) trùng với currentUserId thì bỏ qua
        // Lưu ý: u.user.id mới là Global ID, còn u.id là Business User ID.
        // Tuy nhiên Graph API v17 list trả về object User.
        
        // Logic an toàn: Nếu tên user trùng tên mình thì cũng bỏ qua (phòng trường hợp ID so sánh lỗi)
        const myName = document.getElementById('user-name').innerText;
        if (u.id === currentUserId || u.name === myName) {
            continue; 
        }

        try {
            const url = `https://graph.facebook.com/v17.0/${u.id}?access_token=${accessToken}`;
            await fetch(url, { method: 'DELETE' });
            kickCount++;
        } catch (e) {
            failCount++;
        }
    }

    alert(`✅ Đã dọn dẹp xong!\n- Đã đá: ${kickCount} admin.\n- Lỗi: ${failCount} (Có thể là Via gốc hoặc System User).`);
    
    // Quét lại để cập nhật bảng
    scanBMs();
}

// --- 4. RỜI BM (LEAVE) ---
async function actionLeave(bmId) {
    if (!confirm("🚪 Bạn chắc chắn muốn tự RỜI khỏi BM này? (Không thể hoàn tác)")) return;

    const targetBM = listBM.find(b => b.id == bmId);
    if (!targetBM) return;

    // Tìm ID của chính mình trong BM đó để xóa
    // (Trong BM, mỗi user có 1 ID riêng gọi là Business User ID)
    let myBusinessUserId = null;
    const myName = document.getElementById('user-name').innerText;

    // Tìm theo ID (Chính xác nhất)
    const me = targetBM.business_users.data.find(u => u.id === currentUserId); // Trường hợp FB trả Global ID
    
    if (me) {
        myBusinessUserId = me.id;
    } else {
        // Fallback: Tìm theo Tên (Kém chính xác hơn nhưng cần thiết nếu FB ẩn ID)
        const meByName = targetBM.business_users.data.find(u => u.name === myName);
        if (meByName) myBusinessUserId = meByName.id;
    }

    if (!myBusinessUserId) {
        // Nếu vẫn không tìm thấy, thử xóa chính ID của Via (Đôi khi FB cho phép truyền Global ID)
        myBusinessUserId = currentUserId; 
    }

    try {
        const url = `https://graph.facebook.com/v17.0/${bmId}/business_users/${myBusinessUserId}?access_token=${accessToken}`;
        // Hoặc endpoint DELETE trực tiếp vào ID user (thường dùng hơn)
        const urlDirect = `https://graph.facebook.com/v17.0/${myBusinessUserId}?access_token=${accessToken}`;
        
        // Thử cách direct trước (thường hiệu quả với Business User ID)
        let res = await fetch(urlDirect, { method: 'DELETE' });
        let json = await res.json();

        if (json.success) {
            alert("Đã rời BM thành công!");
            // Xóa dòng đó khỏi bảng ngay lập tức
            scanBMs();
        } else {
            alert("Không thể rời BM. Lỗi: " + json.error.message);
        }
    } catch (e) {
        alert("Lỗi kết nối.");
    }
}
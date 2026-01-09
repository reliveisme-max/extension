// ============================================================
// TAB_ACTION.JS - XỬ LÝ HÀNH ĐỘNG (SWEETALERT 2 UI)
// ============================================================

// --- 1. EVENT DELEGATION (BẮT SỰ KIỆN TỪ BẢNG) ---
const table = document.getElementById('bm-table');

if (table) {
    table.addEventListener('click', (e) => {
        // A. Xử lý các nút hành động
        const btn = e.target.closest('.btn-action');
        if (btn) {
            const action = btn.dataset.action;
            const id = btn.dataset.id;
            
            if (action === 'link') actionInvite(id);
            if (action === 'edit') actionRename(id, btn.dataset.name);
            if (action === 'clean') actionManageUsers(id); // Đổi tên hàm cho đúng bản chất
            if (action === 'leave') actionLeave(id);
            return;
        }

        // B. Xử lý Copy ID
        const idSpan = e.target.closest('.pointer-copy');
        if (idSpan) {
            navigator.clipboard.writeText(idSpan.dataset.id);
            // Toast nhỏ góc trên
            const Toast = Swal.mixin({
                toast: true, position: 'top-end', showConfirmButton: false, 
                timer: 1500, timerProgressBar: true,
                background: '#1e293b', color: '#fff'
            });
            Toast.fire({ icon: 'success', title: 'Đã copy ID!' });
        }
    });
}

// ============================================================
// 2. TÍNH NĂNG: MỜI & LẤY LINK (INVITE)
// ============================================================
async function actionInvite(bmId) {
    if (!accessToken) return;

    // 1. Hiện Popup nhập mail
    const { value: email, isDismissed } = await Swal.fire({
        title: 'Mời Admin & Lấy Link',
        html: `
            <p style="color:#94a3b8; font-size:13px;">Nhập email khách hoặc để trống để dùng mail ảo.</p>
            <input id="swal-input-email" class="swal2-input" placeholder="ví dụ: client@gmail.com" style="background:#0f172a; color:#fff; border:1px solid #334155;">
        `,
        showCancelButton: true,
        confirmButtonText: '<i class="ph-bold ph-paper-plane-right"></i> Gửi & Lấy Link',
        cancelButtonText: 'Hủy',
        background: '#1e293b', color: '#fff',
        preConfirm: () => {
            return document.getElementById('swal-input-email').value;
        }
    });

    if (isDismissed) return;

    // 2. Xử lý logic
    Swal.fire({
        title: 'Đang xử lý...',
        html: 'Đang gửi lời mời và trích xuất Link...',
        didOpen: () => Swal.showLoading(),
        background: '#1e293b', color: '#fff', allowOutsideClick: false
    });

    try {
        const targetEmail = email ? email.trim() : `backup.${Date.now()}@hotmail.com`;
        
        // Gọi API Invite
        const urlInvite = `https://graph.facebook.com/v17.0/${bmId}/business_users?access_token=${accessToken}`;
        const resInvite = await fetch(urlInvite, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ email: targetEmail, role: 'ADMIN' })
        });
        const jsonInvite = await resInvite.json();

        if (jsonInvite.id) {
            // Gọi API lấy Link
            await new Promise(r => setTimeout(r, 1500)); // Đợi 1.5s cho FB đỡ lag
            const urlGetLink = `https://graph.facebook.com/v17.0/${bmId}/pending_users?access_token=${accessToken}&fields=invite_link,email`;
            const resLink = await fetch(urlGetLink);
            const jsonLink = await resLink.json();
            
            const inviteData = jsonLink.data.find(i => i.email === targetEmail);

            if (inviteData && inviteData.invite_link) {
                // Thành công -> Hiện Link
                Swal.fire({
                    icon: 'success',
                    title: 'Thành công!',
                    html: `
                        <div style="background:#0f172a; padding:10px; border-radius:8px; border:1px dashed #475569; word-break:break-all; color:#818cf8; font-family:monospace;">
                            ${inviteData.invite_link}
                        </div>
                    `,
                    confirmButtonText: 'Copy Link',
                    background: '#1e293b', color: '#fff'
                }).then(() => {
                    navigator.clipboard.writeText(inviteData.invite_link);
                    const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, background: '#1e293b', color: '#fff' });
                    Toast.fire({ icon: 'success', title: 'Đã copy vào bộ nhớ!' });
                });
            } else {
                Swal.fire({ icon: 'warning', title: 'Chưa thấy Link', text: 'Đã gửi lời mời nhưng FB chưa trả về Link kịp. Hãy thử lại.', background: '#1e293b', color: '#fff' });
            }
        } else {
            Swal.fire({ icon: 'error', title: 'Lỗi', text: jsonInvite.error?.message || 'Không thể mời.', background: '#1e293b', color: '#fff' });
        }
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Lỗi mạng', text: e.message, background: '#1e293b', color: '#fff' });
    }
}

// ============================================================
// 3. TÍNH NĂNG: QUẢN LÝ & ĐÁ MEMBER (CLEAN)
// ============================================================
async function actionManageUsers(bmId) {
    // Lấy data BM từ biến global
    const targetBM = listBM.find(b => b.id == bmId);
    if (!targetBM) return;

    const users = targetBM.business_users?.data || [];
    const myName = document.getElementById('user-name')?.innerText || "";

    // Tạo HTML bảng danh sách
    let tableRows = users.map(u => {
        // Check xem có phải mình không
        const isMe = (u.id === currentUserId) || (u.user?.id === currentUserId) || (u.name === myName);
        const roleBadge = u.role === 'ADMIN' 
            ? '<span style="color:#34d399; font-size:11px; font-weight:bold;">ADMIN</span>' 
            : '<span style="color:#94a3b8; font-size:11px;">NV</span>';
        
        // Nút xóa (Ẩn nếu là mình)
        const deleteBtn = isMe 
            ? `<button disabled style="opacity:0.3; background:none; border:none; color:#fff;"><i class="ph-bold ph-shield"></i></button>`
            : `<button onclick="deleteUser('${u.id}', '${bmId}', this)" style="background:rgba(248,113,113,0.2); border:none; color:#f87171; padding:5px 8px; border-radius:4px; cursor:pointer;"><i class="ph-bold ph-trash"></i></button>`;

        return `
            <tr style="border-bottom:1px solid #334155;">
                <td style="padding:10px; text-align:left;">
                    <div style="font-weight:600; font-size:13px;">${u.name || 'Facebook User'}</div>
                    <div style="font-size:11px; color:#64748b;">ID: ${u.id}</div>
                </td>
                <td style="padding:10px;">${roleBadge}</td>
                <td style="padding:10px;">${deleteBtn}</td>
            </tr>
        `;
    }).join('');

    if(users.length === 0) tableRows = '<tr><td colspan="3" style="padding:20px;">Không lấy được danh sách.</td></tr>';

    // Hiện Popup Table
    Swal.fire({
        title: 'Danh sách Thành viên',
        html: `
            <div style="max-height:300px; overflow-y:auto; margin-top:10px; border:1px solid #334155; border-radius:8px;">
                <table style="width:100%; border-collapse:collapse; color:#fff;">
                    <thead style="background:#0f172a; position:sticky; top:0;">
                        <tr>
                            <th style="padding:10px; text-align:left; font-size:11px; color:#94a3b8;">THÔNG TIN</th>
                            <th style="padding:10px; font-size:11px; color:#94a3b8;">VAI TRÒ</th>
                            <th style="padding:10px; font-size:11px; color:#94a3b8;">XÓA</th>
                        </tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </div>
        `,
        showConfirmButton: false,
        showCloseButton: true,
        width: 600,
        background: '#1e293b', color: '#fff'
    });
}

// Hàm con: Gọi API xóa user (Được gán vào nút HTML ở trên)
window.deleteUser = async (userId, bmId, btnElement) => {
    // Hiệu ứng Loading tại nút
    const originalContent = btnElement.innerHTML;
    btnElement.innerHTML = '<i class="ph-bold ph-spinner ph-spin"></i>';
    btnElement.disabled = true;

    try {
        const res = await fetch(`https://graph.facebook.com/v17.0/${userId}?access_token=${accessToken}`, { method: 'DELETE' });
        const json = await res.json();

        if (json.success) {
            // Xóa dòng tr khỏi bảng ngay lập tức
            btnElement.closest('tr').remove();
            
            // Cập nhật lại số liệu admin trong listBM (giả lập)
            const bm = listBM.find(b => b.id == bmId);
            if(bm && bm.business_users?.data) {
                bm.business_users.data = bm.business_users.data.filter(u => u.id !== userId);
                if(typeof scanBMs === "function") scanBMs(); // Refresh bảng chính
            }
            
            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500, background: '#1e293b', color: '#fff' });
            Toast.fire({ icon: 'success', title: 'Đã đá thành công!' });
        } else {
            Swal.fire({ icon: 'error', title: 'Lỗi', text: json.error?.message, background: '#1e293b', color: '#fff' });
            btnElement.innerHTML = originalContent;
            btnElement.disabled = false;
        }
    } catch (e) {
        btnElement.innerHTML = originalContent;
        btnElement.disabled = false;
    }
};

// ============================================================
// 4. TÍNH NĂNG: RỜI BM (LEAVE) - CHECK KỸ
// ============================================================
async function actionLeave(bmId) {
    const targetBM = listBM.find(b => b.id == bmId);
    if (!targetBM) return;

    // Đếm số lượng Admin
    const admins = targetBM.business_users?.data.filter(u => u.role === 'ADMIN') || [];
    const adminCount = admins.length;

    let confirmConfig = {
        title: 'Rời BM này?',
        text: "Bạn có chắc chắn muốn thoát quyền Admin?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Đồng ý thoát',
        confirmButtonColor: '#f87171',
        cancelButtonText: 'Hủy',
        background: '#1e293b', color: '#fff'
    };

    // Nếu chỉ còn 1 Admin -> Cảnh báo ĐỎ
    if (adminCount <= 1) {
        confirmConfig = {
            title: '⚠️ CẢNH BÁO NGUY HIỂM',
            html: `BM này chỉ còn <b>1 Admin duy nhất</b> (là bạn).<br>Nếu rời đi, BM sẽ bị <b>Vô hiệu hóa vĩnh viễn</b>!<br><br>Gõ chữ <b>CONFIRM</b> để xác nhận:`,
            input: 'text',
            inputValidator: (value) => {
                if (value !== 'CONFIRM') return 'Vui lòng gõ CONFIRM để xác nhận hành động nguy hiểm này.';
            },
            icon: 'error',
            showCancelButton: true,
            confirmButtonText: 'XÓA BỎ BM & RỜI',
            confirmButtonColor: '#d33',
            background: '#1e293b', color: '#fff'
        };
    }

    const result = await Swal.fire(confirmConfig);

    if (result.isConfirmed) {
        // Tìm ID của mình
        let myId = currentUserId;
        const me = targetBM.business_users?.data.find(u => u.id === currentUserId || u.user?.id === currentUserId);
        if (me) myId = me.id;

        Swal.fire({ title: 'Đang thoát...', didOpen: () => Swal.showLoading(), background: '#1e293b', color: '#fff', showConfirmButton: false });

        try {
            const res = await fetch(`https://graph.facebook.com/v17.0/${myId}?access_token=${accessToken}`, { method: 'DELETE' });
            const json = await res.json();

            if (json.success) {
                Swal.fire({ icon: 'success', title: 'Đã rời thành công!', background: '#1e293b', color: '#fff' });
                // Xóa khỏi bảng
                listBM = listBM.filter(b => b.id !== bmId);
                if(typeof scanBMs === "function") scanBMs();
            } else {
                Swal.fire({ icon: 'error', title: 'Không thể rời', text: json.error?.message, background: '#1e293b', color: '#fff' });
            }
        } catch (e) {
            Swal.fire({ icon: 'error', title: 'Lỗi mạng', background: '#1e293b', color: '#fff' });
        }
    }
}

// ============================================================
// 5. TÍNH NĂNG: ĐỔI TÊN (RENAME)
// ============================================================
async function actionRename(bmId, currentName) {
    const { value: newName } = await Swal.fire({
        title: 'Đổi tên BM',
        input: 'text',
        inputValue: currentName,
        showCancelButton: true,
        confirmButtonText: 'Lưu thay đổi',
        background: '#1e293b', color: '#fff',
        inputValidator: (value) => {
            if (!value) return 'Tên không được để trống!';
        }
    });

    if (newName && newName !== currentName) {
        Swal.fire({ title: 'Đang lưu...', didOpen: () => Swal.showLoading(), background: '#1e293b', color: '#fff', showConfirmButton: false });
        
        try {
            const res = await fetch(`https://graph.facebook.com/v17.0/${bmId}?access_token=${accessToken}`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ name: newName })
            });
            const json = await res.json();
            
            if(json.success) {
                Swal.fire({ icon: 'success', title: 'Đã đổi tên!', timer: 1500, showConfirmButton: false, background: '#1e293b', color: '#fff' });
                // Update UI Local
                const bm = listBM.find(b => b.id == bmId);
                if(bm) bm.name = newName;
                if(typeof scanBMs === "function") scanBMs();
            } else {
                Swal.fire({ icon: 'error', title: 'Lỗi', text: json.error?.message, background: '#1e293b', color: '#fff' });
            }
        } catch(e) {
            Swal.fire({ icon: 'error', title: 'Lỗi mạng', background: '#1e293b', color: '#fff' });
        }
    }
}
// ============================================================
// TAB_ACTION.JS - XỬ LÝ HÀNH ĐỘNG (FIX LỖI XÓA MEMBER)
// ============================================================

// --- 1. EVENT DELEGATION (XỬ LÝ CLICK TOÀN TRANG) ---
document.addEventListener('click', (e) => {
    // A. Xử lý các nút hành động trên Bảng chính
    const btnAction = e.target.closest('.btn-action');
    if (btnAction) {
        const action = btnAction.dataset.action;
        const id = btnAction.dataset.id;
        
        if (action === 'link') actionInvite(id);
        if (action === 'edit') actionRename(id, btnAction.dataset.name);
        if (action === 'clean') actionManageUsers(id); 
        if (action === 'leave') actionLeave(id);
        return;
    }

    // B. Xử lý Copy ID
    const idSpan = e.target.closest('.pointer-copy');
    if (idSpan) {
        navigator.clipboard.writeText(idSpan.dataset.id);
        const Toast = Swal.mixin({
            toast: true, position: 'top-end', showConfirmButton: false, timer: 1500
        });
        Toast.fire({ icon: 'success', title: 'Đã copy ID!' });
        return;
    }

    // C. [QUAN TRỌNG] Xử lý nút XÓA MEMBER trong Popup
    // (Thay thế cho onclick="deleteUser" bị lỗi)
    const btnDeleteUser = e.target.closest('.btn-delete-user');
    if (btnDeleteUser) {
        const userId = btnDeleteUser.dataset.userid;
        const bmId = btnDeleteUser.dataset.bmid;
        handleDeleteUser(userId, bmId, btnDeleteUser);
    }
});

// ============================================================
// 2. LOGIC XÓA USER (ĐÃ TÁCH RA HÀM RIÊNG)
// ============================================================
async function handleDeleteUser(userId, bmId, btnElement) {
    // 1. Xác nhận trước khi xóa (Tránh bấm nhầm)
    const confirmResult = await Swal.fire({
        title: 'Xóa thành viên?',
        text: "Hành động này không thể hoàn tác!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'Xóa ngay',
        cancelButtonText: 'Hủy'
    });

    if (!confirmResult.isConfirmed) return;

    // 2. Hiệu ứng Loading tại nút
    const originalContent = btnElement.innerHTML;
    btnElement.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    btnElement.disabled = true;

    try {
        // Gọi API Xóa
        const res = await fetch(`${GRAPH_API}/${userId}?access_token=${accessToken}`, { method: 'DELETE' });
        const json = await res.json();

        if (json.success) {
            // Xóa dòng tr khỏi bảng ngay lập tức
            btnElement.closest('tr').remove();
            
            // Cập nhật lại data global
            const bm = listBM.find(b => b.id == bmId);
            if(bm && bm.business_users?.data) {
                bm.business_users.data = bm.business_users.data.filter(u => u.id !== userId);
                // Refresh lại bảng chính bên ngoài nếu cần
                if(typeof scanBMs === "function") scanBMs(); 
            }
            
            const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 1500 });
            Toast.fire({ icon: 'success', title: 'Đã xóa thành công!' });
        } else {
            Swal.fire({ icon: 'error', title: 'Lỗi', text: json.error?.message });
            btnElement.innerHTML = originalContent;
            btnElement.disabled = false;
        }
    } catch (e) {
        btnElement.innerHTML = originalContent;
        btnElement.disabled = false;
        console.error(e);
    }
}

// ============================================================
// 3. TÍNH NĂNG: QUẢN LÝ MEMBER (POPUP)
// ============================================================
async function actionManageUsers(bmId) {
    const targetBM = listBM.find(b => b.id == bmId);
    if (!targetBM) return;

    const users = targetBM.business_users?.data || [];
    const myName = document.getElementById('user-name')?.innerText || "";

    // Tạo HTML bảng danh sách
    let tableRows = users.map(u => {
        const isMe = (u.id === currentUserId) || (u.user?.id === currentUserId) || (u.name === myName);
        const roleBadge = u.role === 'ADMIN' 
            ? '<span style="color:#10b981; font-size:11px; font-weight:bold;">ADMIN</span>' 
            : '<span style="color:#64748b; font-size:11px;">NV</span>';
        
        // [FIX] Thay onclick bằng class và data-attribute
        const deleteBtn = isMe 
            ? `<button disabled style="opacity:0.3; background:none; border:none; color:#94a3b8;" title="Là bạn"><i class="fa-solid fa-shield-halved"></i></button>`
            : `<button class="btn-delete-user" data-userid="${u.id}" data-bmid="${bmId}" style="background:#fee2e2; border:none; color:#ef4444; padding:5px 8px; border-radius:4px; cursor:pointer;" title="Đá người này"><i class="fa-solid fa-trash"></i></button>`;

        return `
            <tr style="border-bottom:1px solid #e2e8f0;">
                <td style="padding:10px; text-align:left;">
                    <div style="font-weight:600; font-size:13px; color:#1e293b;">${u.name || 'Facebook User'}</div>
                    <div style="font-size:11px; color:#64748b;">ID: ${u.id}</div>
                </td>
                <td style="padding:10px;">${roleBadge}</td>
                <td style="padding:10px;">${deleteBtn}</td>
            </tr>
        `;
    }).join('');

    if(users.length === 0) tableRows = '<tr><td colspan="3" style="padding:20px; color:#64748b;">Không lấy được danh sách.</td></tr>';

    Swal.fire({
        title: 'Danh sách Thành viên',
        html: `
            <div style="max-height:300px; overflow-y:auto; margin-top:10px; border:1px solid #e2e8f0; border-radius:8px;">
                <table style="width:100%; border-collapse:collapse;">
                    <thead style="background:#f8fafc; position:sticky; top:0;">
                        <tr>
                            <th style="padding:10px; text-align:left; font-size:11px; color:#64748b;">THÔNG TIN</th>
                            <th style="padding:10px; font-size:11px; color:#64748b;">VAI TRÒ</th>
                            <th style="padding:10px; font-size:11px; color:#64748b;">XÓA</th>
                        </tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </div>
        `,
        showConfirmButton: false,
        showCloseButton: true,
        width: 600
    });
}

// ============================================================
// 4. TÍNH NĂNG: MỜI & LẤY LINK (INVITE)
// ============================================================
async function actionInvite(bmId) {
    if (!accessToken) return;

    const { value: email, isDismissed } = await Swal.fire({
        title: 'Mời Admin & Lấy Link',
        html: `
            <p style="color:#64748b; font-size:13px;">Nhập email khách hoặc để trống để dùng mail ảo.</p>
            <input id="swal-input-email" class="swal2-input" placeholder="ví dụ: client@gmail.com">
        `,
        showCancelButton: true,
        confirmButtonText: '<i class="fa-solid fa-paper-plane"></i> Gửi & Lấy Link',
        cancelButtonText: 'Hủy',
        preConfirm: () => {
            return document.getElementById('swal-input-email').value;
        }
    });

    if (isDismissed) return;

    Swal.fire({
        title: 'Đang xử lý...',
        html: 'Đang gửi lời mời và trích xuất Link...',
        didOpen: () => Swal.showLoading(),
        allowOutsideClick: false
    });

    try {
        const targetEmail = email ? email.trim() : `backup.${Date.now()}@hotmail.com`;
        
        const urlInvite = `${GRAPH_API}/${bmId}/business_users?access_token=${accessToken}`;
        const resInvite = await fetch(urlInvite, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ email: targetEmail, role: 'ADMIN' })
        });
        const jsonInvite = await resInvite.json();

        if (jsonInvite.id) {
            await new Promise(r => setTimeout(r, 1500)); 
            
            const urlGetLink = `${GRAPH_API}/${bmId}/pending_users?access_token=${accessToken}&fields=invite_link,email`;
            const resLink = await fetch(urlGetLink);
            const jsonLink = await resLink.json();
            
            const inviteData = jsonLink.data.find(i => i.email === targetEmail);

            if (inviteData && inviteData.invite_link) {
                Swal.fire({
                    icon: 'success',
                    title: 'Thành công!',
                    html: `
                        <div style="background:#f1f5f9; padding:10px; border-radius:8px; border:1px dashed #cbd5e1; word-break:break-all; color:#4f46e5; font-family:monospace; font-weight:600;">
                            ${inviteData.invite_link}
                        </div>
                    `,
                    confirmButtonText: 'Copy Link'
                }).then(() => {
                    navigator.clipboard.writeText(inviteData.invite_link);
                    const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
                    Toast.fire({ icon: 'success', title: 'Đã copy vào bộ nhớ!' });
                });
            } else {
                Swal.fire({ icon: 'warning', title: 'Chưa thấy Link', text: 'Đã gửi lời mời nhưng FB chưa trả về Link kịp. Hãy thử lại.' });
            }
        } else {
            Swal.fire({ icon: 'error', title: 'Lỗi', text: jsonInvite.error?.message || 'Không thể mời.' });
        }
    } catch (e) {
        Swal.fire({ icon: 'error', title: 'Lỗi mạng', text: e.message });
    }
}

// ============================================================
// 5. TÍNH NĂNG: RỜI BM (LEAVE)
// ============================================================
async function actionLeave(bmId) {
    const targetBM = listBM.find(b => b.id == bmId);
    if (!targetBM) return;

    const admins = targetBM.business_users?.data.filter(u => u.role === 'ADMIN') || [];
    const adminCount = admins.length;

    let confirmConfig = {
        title: 'Rời BM này?',
        text: "Bạn có chắc chắn muốn thoát quyền Admin?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Đồng ý thoát',
        confirmButtonColor: '#f87171',
        cancelButtonText: 'Hủy'
    };

    if (adminCount <= 1) {
        confirmConfig = {
            title: '⚠️ CẢNH BÁO NGUY HIỂM',
            html: `BM này chỉ còn <b>1 Admin duy nhất</b> (là bạn).<br>Nếu rời đi, BM sẽ bị <b>Vô hiệu hóa vĩnh viễn</b>!<br><br>Gõ chữ <b>CONFIRM</b> để xác nhận:`,
            input: 'text',
            inputValidator: (value) => {
                if (value !== 'CONFIRM') return 'Vui lòng gõ CONFIRM để xác nhận.';
            },
            icon: 'error',
            showCancelButton: true,
            confirmButtonText: 'XÓA BỎ BM & RỜI',
            confirmButtonColor: '#d33'
        };
    }

    const result = await Swal.fire(confirmConfig);

    if (result.isConfirmed) {
        let myId = currentUserId;
        const me = targetBM.business_users?.data.find(u => u.id === currentUserId || u.user?.id === currentUserId);
        if (me) myId = me.id;

        Swal.fire({ title: 'Đang thoát...', didOpen: () => Swal.showLoading(), showConfirmButton: false });

        try {
            const res = await fetch(`${GRAPH_API}/${myId}?access_token=${accessToken}`, { method: 'DELETE' });
            const json = await res.json();

            if (json.success) {
                Swal.fire({ icon: 'success', title: 'Đã rời thành công!' });
                listBM = listBM.filter(b => b.id !== bmId);
                if(typeof scanBMs === "function") scanBMs();
            } else {
                Swal.fire({ icon: 'error', title: 'Không thể rời', text: json.error?.message });
            }
        } catch (e) {
            Swal.fire({ icon: 'error', title: 'Lỗi mạng' });
        }
    }
}

// ============================================================
// 6. TÍNH NĂNG: ĐỔI TÊN (RENAME)
// ============================================================
async function actionRename(bmId, currentName) {
    const { value: newName } = await Swal.fire({
        title: 'Đổi tên BM',
        input: 'text',
        inputValue: currentName,
        showCancelButton: true,
        confirmButtonText: 'Lưu thay đổi',
        inputValidator: (value) => {
            if (!value) return 'Tên không được để trống!';
        }
    });

    if (newName && newName !== currentName) {
        Swal.fire({ title: 'Đang lưu...', didOpen: () => Swal.showLoading(), showConfirmButton: false });
        
        try {
            const res = await fetch(`${GRAPH_API}/${bmId}?access_token=${accessToken}`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ name: newName })
            });
            const json = await res.json();
            
            if(json.success) {
                Swal.fire({ icon: 'success', title: 'Đã đổi tên!', timer: 1500, showConfirmButton: false });
                const bm = listBM.find(b => b.id == bmId);
                if(bm) bm.name = newName;
                if(typeof scanBMs === "function") scanBMs();
            } else {
                Swal.fire({ icon: 'error', title: 'Lỗi', text: json.error?.message });
            }
        } catch(e) {
            Swal.fire({ icon: 'error', title: 'Lỗi mạng' });
        }
    }
}
// ============================================================
// [FIX FINAL] MỜI HÀNG LOẠT (CƠ CHẾ RETRY 3 LẦN LẤY LINK)
// ============================================================

async function startBulkInvite(bmIds) {
    // 1. Popup Cấu hình (Giữ nguyên)
    const { value: formValues } = await Swal.fire({
        title: `Mời Admin vào ${bmIds.length} BM`,
        html: `
            <div style="text-align:left">
                <label style="font-size:12px; font-weight:bold; color:#64748b">Danh sách Email (Mỗi dòng 1 mail):</label>
                <textarea id="swal-emails" class="swal2-textarea" style="margin-top:5px; height:100px; font-size:13px;" placeholder="admin1@gmail.com\nadmin2@yahoo.com"></textarea>
                
                <label style="font-size:12px; font-weight:bold; color:#64748b; display:block; margin-top:10px">Delay chuyển BM (Giây):</label>
                <input id="swal-delay" type="number" class="swal2-input" value="5" min="2" style="margin-top:5px; height:35px;">
            </div>
        `,
        focusConfirm: false,
        showCancelButton: true,
        confirmButtonText: 'Bắt đầu mời',
        preConfirm: () => {
            return {
                emails: document.getElementById('swal-emails').value,
                delay: document.getElementById('swal-delay').value
            }
        }
    });

    if (!formValues || !formValues.emails) return;

    const emailList = formValues.emails.split('\n').map(e => e.trim()).filter(e => e);
    const delayTime = parseInt(formValues.delay) || 5;

    if (emailList.length === 0) return Swal.fire('Lỗi', 'Chưa nhập email nào!', 'error');

    Swal.fire({
        title: 'Đang thực hiện...',
        html: 'Tool đang chạy ngầm...<br>Vui lòng không tắt popup.',
        didOpen: () => Swal.showLoading(),
        allowOutsideClick: false,
        showConfirmButton: false
    });

    let reportData = []; 

    // --- VÒNG LẶP XỬ LÝ ---
    for (let i = 0; i < bmIds.length; i++) {
        const bmId = bmIds[i];
        const bmInfo = listBM.find(b => b.id == bmId);
        const bmName = bmInfo ? bmInfo.name : bmId;

        // A. Gửi lời mời
        for (const email of emailList) {
            Swal.getHtmlContainer().innerHTML = `<b>BM ${i + 1}/${bmIds.length}: ${bmName}</b><br>Đang mời: ${email}`;
            try {
                await fetch(`${GRAPH_API}/${bmId}/business_users?access_token=${accessToken}`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ email: email, role: 'ADMIN' })
                });
            } catch (e) {}
            await new Promise(r => setTimeout(r, 1000)); 
        }

        // B. [QUAN TRỌNG] Logic Retry lấy Link (Thử tối đa 3 lần)
        let foundLinks = {}; // Lưu link tìm được
        let retryCount = 0;
        const maxRetries = 3;

        while (retryCount < maxRetries) {
            retryCount++;
            Swal.getHtmlContainer().innerHTML = `<b>BM ${i + 1}/${bmIds.length}</b><br>Đang dò Link... (Lần ${retryCount}/${maxRetries})`;
            
            // Đợi 3s trước khi gọi API
            await new Promise(r => setTimeout(r, 3000));

            try {
                const res = await fetch(`${GRAPH_API}/${bmId}/pending_users?access_token=${accessToken}&fields=invite_link,email&limit=1000`);
                const json = await res.json();
                
                if (json.data) {
                    json.data.forEach(invite => {
                        // Nếu tìm thấy link của email trong danh sách cần tìm -> Lưu lại
                        if (emailList.includes(invite.email) && invite.invite_link) {
                            foundLinks[invite.email] = invite.invite_link;
                        }
                    });
                }
            } catch (e) {}

            // Nếu đã tìm đủ link cho tất cả email -> Thoát vòng lặp ngay
            const allFound = emailList.every(e => foundLinks[e]);
            if (allFound) break;
        }

        // C. Tổng hợp kết quả
        emailList.forEach(email => {
            reportData.push({
                bmId: bmId,
                bmName: bmName,
                email: email,
                link: foundLinks[email] || "FB chưa trả Link (Vào mail lấy)"
            });
        });

        // D. Delay chuyển BM
        if (i < bmIds.length - 1) {
            let wait = delayTime;
            while (wait > 0) {
                Swal.getHtmlContainer().innerHTML = `⏳ Nghỉ ${wait}s trước khi sang BM tiếp theo...`;
                await new Promise(r => setTimeout(r, 1000));
                wait--;
            }
        }
    }

    showBulkReport(reportData);
}
// ============================================================
// [NEW] AUTO BACKUP BM (MAIL.CX VERSION)
// ============================================================

async function startAutoBackup(bmIds) {
    const { isConfirmed } = await Swal.fire({
        title: `Backup ${bmIds.length} BM qua Mail.cx?`,
        html: `
            Tool sẽ tự động:<br>
            1. Tạo mail trên <b>Mail.cx</b><br>
            2. Mời vào BM & Lấy Link<br>
            <span style="color:#ef4444; font-size:12px">Lưu ý: Mail.cx không có Pass, chỉ dùng Token phiên.</span>
        `,
        icon: 'info',
        showCancelButton: true,
        confirmButtonText: 'Chạy ngay đi',
        cancelButtonText: 'Hủy'
    });

    if (!isConfirmed) return;

    Swal.fire({
        title: 'Đang khởi động...',
        html: 'Đang kết nối Mail.cx...',
        didOpen: () => Swal.showLoading(),
        allowOutsideClick: false,
        showConfirmButton: false
    });

    let reportData = [];

    // --- VÒNG LẶP ---
    for (let i = 0; i < bmIds.length; i++) {
        const bmId = bmIds[i];
        const bmInfo = listBM.find(b => b.id == bmId);
        const bmName = bmInfo ? bmInfo.name : bmId;
        
        // Random slug: bmbackup1234
        const mailUser = `bmbackup${Math.floor(Math.random() * 9000) + 1000}`;
        
        // Cập nhật UI
        Swal.getHtmlContainer().innerHTML = `
            <b style="color:#f59e0b">Đang xử lý BM ${i + 1}/${bmIds.length}</b><br>
            ${bmName}<br>
            <span style="font-size:12px; color:#64748b">Bước 1: Tạo Mail.cx...</span>
        `;

        try {
            // A. Tạo Mail
            const mailAccount = await createMailAccount(mailUser);
            
            // B. Mời Mail vào BM
            Swal.getHtmlContainer().innerHTML = `
                <b style="color:#f59e0b">BM ${i + 1}/${bmIds.length}: ${bmName}</b><br>
                <span style="font-size:12px; color:#64748b">Bước 2: Mời ${mailAccount.email}...</span>
            `;
            
            await fetch(`${GRAPH_API}/${bmId}/business_users?access_token=${accessToken}`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ email: mailAccount.email, role: 'ADMIN' })
            });

            // C. Đợi thư (Tăng lên 90s)
            Swal.getHtmlContainer().innerHTML = `
                <b style="color:#f59e0b">BM ${i + 1}/${bmIds.length}: ${bmName}</b><br>
                <span style="font-size:12px; color:#64748b">Bước 3: Đang đợi thư (Max 90s)...</span>
            `;

            const inviteLink = await waitForFbEmail(mailAccount.token, 90);

            // D. Lưu kết quả
            reportData.push({
                bmName: bmName,
                bmId: bmId,
                email: mailAccount.email,
                token: mailAccount.token.substring(0, 15) + "...", // Token dài quá cắt bớt hiển thị
                fullToken: mailAccount.token, // Lưu token full để dùng
                link: inviteLink || "Không thấy thư (Thử lại sau)"
            });

        } catch (e) {
            console.error(e);
            reportData.push({
                bmName: bmName,
                bmId: bmId,
                email: "Lỗi tạo mail",
                token: "-",
                link: "Error: " + e.message
            });
        }

        // Delay 3s
        await new Promise(r => setTimeout(r, 3000));
    }

    // 4. HIỆN BÁO CÁO (Sửa lại cột Pass thành Token)
    showBackupReport(reportData);
}

// Hàm hiển thị báo cáo Backup
function showBackupReport(data) {
    let excelString = "TÊN BM\tID BM\tEMAIL\tTOKEN MAIL\tLINK BACKUP\n";
    let htmlTable = "";

    data.forEach(row => {
        excelString += `${row.bmName}\t${row.bmId}\t${row.email}\t${row.fullToken || '-'}\t${row.link}\n`;
        
        let linkDisplay = row.link.startsWith("http") 
            ? `<a href="#" onclick="navigator.clipboard.writeText('${row.link}'); alert('Copied!'); return false;">Copy Link</a>` 
            : `<span style="color:red">${row.link}</span>`;

        htmlTable += `
            <tr>
                <td style="padding:8px; border-bottom:1px solid #eee; font-size:12px;">${row.bmName}</td>
                <td style="padding:8px; border-bottom:1px solid #eee; font-size:12px;">${row.email}</td>
                <td style="padding:8px; border-bottom:1px solid #eee; font-size:12px; color:#94a3b8; font-family:monospace;">${row.token}</td>
                <td style="padding:8px; border-bottom:1px solid #eee; font-size:12px;">${linkDisplay}</td>
            </tr>
        `;
    });

    Swal.fire({
        title: 'Backup Hoàn Tất!',
        width: 1000,
        html: `
            <div style="max-height:400px; overflow-y:auto; border:1px solid #e2e8f0;">
                <table style="width:100%; border-collapse:collapse; text-align:left;">
                    <thead style="background:#f8fafc; position:sticky; top:0;">
                        <tr>
                            <th style="padding:10px; font-size:11px; color:#64748b;">BM</th>
                            <th style="padding:10px; font-size:11px; color:#64748b;">EMAIL</th>
                            <th style="padding:10px; font-size:11px; color:#64748b;">TOKEN</th>
                            <th style="padding:10px; font-size:11px; color:#64748b;">LINK</th>
                        </tr>
                    </thead>
                    <tbody>${htmlTable}</tbody>
                </table>
            </div>
        `,
        confirmButtonText: '<i class="fa-solid fa-copy"></i> Copy Excel',
        showCancelButton: true,
        cancelButtonText: 'Đóng'
    }).then((result) => {
        if (result.isConfirmed) {
            navigator.clipboard.writeText(excelString);
            Swal.fire('Đã Copy!', 'Lưu ý: Mail.cx dùng Token thay cho Pass.', 'success');
        }
    });
}
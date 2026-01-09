// ============================================================
// TAB_REG.JS - TÍNH NĂNG TẠO BM (V6 FINAL - FIX LOG)
// Chứa: Logic Check Limit (Silent), Reg BM, Invite Email
// ============================================================

// --- SỰ KIỆN: CHECK LIMIT KHI CHUYỂN TAB ---
// Dùng Event Delegation để bắt sự kiện click vào menu Reg BM
document.addEventListener('click', function(e) {
    // Nếu click vào menu có chứa chữ 'tab-reg'
    const menuReg = e.target.closest('li[onclick*="tab-reg"]');
    if (menuReg) {
        checkViaLimit();
    }
});

// Sự kiện nút Bắt đầu
const btnStartReg = document.getElementById('btn-start-reg');
if(btnStartReg) {
    btnStartReg.addEventListener('click', startRegProcess);
}

// --- 1. CHECK LIMIT (CHẠY NGẦM - KHÔNG SPAM LOG) ---
async function checkViaLimit() {
    const infoBadge = document.getElementById('limit-info');
    if(!accessToken || !infoBadge) return;

    infoBadge.innerText = "Checking...";
    infoBadge.className = "badge badge-die"; 

    try {
        // Đếm số lượng BM hiện có
        const url = `https://graph.facebook.com/v17.0/me/businesses?access_token=${accessToken}&limit=500`;
        const res = await fetch(url);
        const json = await res.json();
        
        const count = json.data ? json.data.length : 0;
        
        // Cập nhật UI Badge (Không ghi vào Log nữa để tránh spam)
        infoBadge.innerText = `Đang cầm: ${count} BM`;
        infoBadge.className = "badge badge-live"; 
        infoBadge.style.background = "#374151";
        infoBadge.style.color = "#fff";
        
    } catch (e) {
        infoBadge.innerText = "Lỗi Check";
    }
}

// --- 2. LUỒNG REG CHÍNH (MAIN FLOW) ---
async function startRegProcess() {
    const btn = document.getElementById('btn-start-reg');
    
    // A. Lấy Input
    const baseName = document.getElementById('reg-name').value.trim() || "BM Agency";
    const qtyInput = document.getElementById('reg-qty');
    const qty = parseInt(qtyInput.value) || 1;
    
    const inviteEmail = document.getElementById('reg-email').value.trim(); 
    const useRandom = document.getElementById('reg-random-name').checked;
    const useDelay = document.getElementById('reg-delay').checked;
    
    if (!accessToken) return alert("Chưa có Token!");

    // B. Khóa giao diện & Reset Logs
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...';
    clearLogs(); // Xóa sạch log cũ
    addLog(`🚀 Bắt đầu tạo ${qty} BM...`, "info");
    if(inviteEmail) addLog(`📧 Chế độ: Mời trực tiếp vào mail "${inviteEmail}"`, "info");

    let successCount = 0;

    // C. Vòng lặp Tạo
    for (let i = 1; i <= qty; i++) {
        // 1. Random Tên
        let finalName = baseName;
        if (useRandom) {
            const randomSuffix = Math.floor(Math.random() * 899) + 100;
            const prefix = ["Store", "Media", "Digital", "Ads", "Global"][Math.floor(Math.random() * 5)];
            finalName = `${baseName} ${prefix} #${randomSuffix}`;
        }

        addLog(`[${i}/${qty}] Đang Reg: "${finalName}"...`, "info");

        // 2. Gọi API Tạo BM
        const result = await createBM(finalName);

        if (result.success) {
            successCount++;
            addLog(`✅ Tạo thành công! ID: ${result.id}`, "success");

            // 3. Xử lý Mời (Invite)
            if (inviteEmail) {
                addLog(`...Đang mời mail...`, "warning");
                const invited = await inviteUserToBM(result.id, inviteEmail);
                if(invited) addLog(`📩 Đã gửi lời mời OK!`, "success");
                else addLog(`⚠️ Lỗi mời (Có thể do FB lag hoặc mail sai)`, "danger");
            }

        } else {
            addLog(`❌ Thất bại: ${result.error}`, "danger");
            // Check lỗi Limit
            if (result.error.toLowerCase().includes("limit") || result.error.toLowerCase().includes("maximum")) {
                addLog("⛔ Đã đạt giới hạn tạo BM của Via này! Dừng lại.", "danger");
                break;
            }
        }

        // 4. Delay (Chống Spam)
        if (i < qty && useDelay) {
            const delayTime = Math.floor(Math.random() * 30) + 30; // 30s - 60s
            addLog(`⏳ Nghỉ ${delayTime}s chống checkpoint...`, "warning");
            await sleep(delayTime * 1000);
        }
    }

    // D. Kết thúc
    addLog(`🏁 Hoàn tất! Thành công: ${successCount}/${qty}`, "info");
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-play"></i> BẮT ĐẦU REG';
    
    // Refresh lại list BM (ngầm) để khi quay lại tab 1 thấy luôn
    scanBMs();
}

// --- HÀM API: TẠO BM ---
async function createBM(name) {
    try {
        const url = `https://graph.facebook.com/v17.0/me/businesses?access_token=${accessToken}`;
        const payload = { name: name, vertical: "OTHER" };

        const res = await fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(payload)
        });

        const json = await res.json();

        if (json.id) {
            return { success: true, id: json.id };
        } else {
            return { success: false, error: json.error ? json.error.message : "Lỗi không xác định" };
        }
    } catch (e) {
        return { success: false, error: "Lỗi mạng" };
    }
}

// --- HÀM API: MỜI MAIL ---
async function inviteUserToBM(bmId, email) {
    try {
        const url = `https://graph.facebook.com/v17.0/${bmId}/business_users?access_token=${accessToken}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ email: email, role: 'ADMIN' })
        });
        const json = await res.json();
        return !!json.id;
    } catch (e) { return false; }
}

// --- UTILS ---
function addLog(msg, type) {
    const logBox = document.getElementById('reg-logs');
    const div = document.createElement('div');
    
    let color = "#d1d5db";
    if (type === "success") color = "#10b981";
    if (type === "danger") color = "#ef4444";
    if (type === "warning") color = "#f59e0b";
    if (type === "info") color = "#60a5fa";

    div.style.color = color;
    div.style.marginBottom = "6px";
    div.style.borderBottom = "1px dashed rgba(255,255,255,0.05)";
    div.innerHTML = msg.startsWith(">") ? msg : `> ${msg}`;
    
    logBox.appendChild(div);
    logBox.scrollTop = logBox.scrollHeight;
}

function clearLogs() {
    document.getElementById('reg-logs').innerHTML = "<div>> Sẵn sàng...</div>";
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
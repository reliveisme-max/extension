// ============================================================
// TAB_REG.JS - TÍNH NĂNG TẠO BM (V6 FINAL - CLEAN)
// Chứa: Logic Check Limit (Silent), Reg BM, Invite Email
// ============================================================

// Sự kiện nút Bắt đầu (Giữ nguyên)
const btnStartReg = document.getElementById('btn-start-reg');
if(btnStartReg) {
    btnStartReg.addEventListener('click', startRegProcess);
}

// --- 1. CHECK LIMIT (CHẠY NGẦM) ---
// Hàm này sẽ được gọi từ Main.js khi bấm chuyển Tab
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
        
        // Cập nhật UI Badge
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
    
    // A. Lấy Input từ Form
    const baseName = document.getElementById('reg-name').value.trim() || "BM Agency";
    const qtyInput = document.getElementById('reg-qty');
    const qty = parseInt(qtyInput.value) || 1;
    
    const inviteEmail = document.getElementById('reg-email').value.trim(); 
    const useRandom = document.getElementById('reg-random-name').checked;
    const useDelay = document.getElementById('reg-delay').checked;
    
    if (!accessToken) return alert("Chưa có Token! Hãy F5 lại trang.");

    // B. Khóa giao diện & Reset Logs
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...';
    clearLogs(); 
    addLog(`🚀 Bắt đầu tạo ${qty} BM...`, "info");
    if(inviteEmail) addLog(`📧 Chế độ: Mời trực tiếp vào mail "${inviteEmail}"`, "info");

    let successCount = 0;

    // C. Vòng lặp Tạo
    for (let i = 1; i <= qty; i++) {
        // 1. Tạo tên
        let finalName = baseName;
        if (useRandom) {
            const randomSuffix = Math.floor(Math.random() * 899) + 100;
            const prefix = ["Store", "Media", "Digital", "Ads", "Global"][Math.floor(Math.random() * 5)];
            finalName = `${baseName} ${prefix} #${randomSuffix}`;
        }

        addLog(`[${i}/${qty}] Đang Reg: "${finalName}"...`, "info");

        // 2. Gọi API
        const result = await createBM(finalName);

        if (result.success) {
            successCount++;
            addLog(`✅ Tạo thành công! ID: ${result.id}`, "success");

            // 3. Invite
            if (inviteEmail) {
                addLog(`...Đang mời mail...`, "warning");
                const invited = await inviteUserToBM(result.id, inviteEmail);
                if(invited) addLog(`📩 Đã gửi lời mời OK!`, "success");
                else addLog(`⚠️ Lỗi mời (Có thể do FB lag hoặc mail sai)`, "danger");
            }

        } else {
            addLog(`❌ Thất bại: ${result.error}`, "danger");
            // Check lỗi Limit
            const errStr = result.error.toLowerCase();
            if (errStr.includes("limit") || errStr.includes("maximum")) {
                addLog("⛔ Đã đạt giới hạn tạo BM của Via này! Dừng lại.", "danger");
                break;
            }
        }

        // 4. Delay
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
    
    // Refresh lại list BM (ngầm)
    if(typeof scanBMs === "function") scanBMs();
}

// --- API & UTILS ---
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
        if (json.id) return { success: true, id: json.id };
        else return { success: false, error: json.error ? json.error.message : "Lỗi không xác định" };
    } catch (e) { return { success: false, error: "Lỗi mạng" }; }
}

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

function addLog(msg, type) {
    const logBox = document.getElementById('reg-logs');
    if(!logBox) return;
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
    const logBox = document.getElementById('reg-logs');
    if(logBox) logBox.innerHTML = "<div>> Sẵn sàng...</div>";
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
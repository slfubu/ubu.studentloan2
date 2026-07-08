function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

const userDataString = sessionStorage.getItem('ubu_user_data');
const userToken = sessionStorage.getItem('ubu_token');

let currentUser = null;
try {
    currentUser = JSON.parse(userDataString);
} catch(e) {}

if (!currentUser || !userToken || currentUser.role !== 'user') {
    sessionStorage.clear();
    const appLayout = document.getElementById('appLayout');
    if (appLayout) appLayout.style.display = 'none'; 
    
    Swal.fire({
        icon: 'error',
        title: 'ข้อความแจ้งเตือนจากระบบ',
        text: 'ระยะเวลาการเชื่อมต่อระบบของท่านสิ้นสุดลง หรือท่านไม่มีสิทธิ์ในการเข้าถึงข้อมูลส่วนนี้',
        confirmButtonText: 'กลับสู่หน้าเข้าสู่ระบบ',
        confirmButtonColor: '#1976D2',
        allowOutsideClick: false
    }).then(() => {
        window.top.location.href = "index.html";
    });
    throw new Error("Unauthorized access"); 
}

function createSecurePayload(dataObj = {}) {
    return {
        studentId: currentUser.studentId,
        token: userToken,
        ...dataObj
    };
}

window.Swal = Swal.mixin({
    confirmButtonText: 'ยืนยัน',
    cancelButtonText: 'ยกเลิก'
});

function showLoading(msg) {
    document.getElementById('loaderText').innerText = msg || 'ระบบกำลังประมวลผล กรุณารอสักครู่';
    document.getElementById('customLoader').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('customLoader').style.display = 'none';
}

function showAlert(msg, type = 'success') {
    const titleText = type === 'success' ? 'การดำเนินการเสร็จสมบูรณ์' : 'ข้อความแจ้งเตือนจากระบบ';
    Swal.fire({ icon: type, title: titleText, text: msg });
}

function formatDate(dateStr) {
    if(!dateStr) return '-';
    const d = new Date(dateStr);
    return isNaN(d) ? dateStr : d.toLocaleDateString('th-TH', {year:'numeric', month:'short', day:'numeric'});
}

const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');

function closeSidebarOnMobile() {
    if (window.innerWidth <= 900) {
        sidebar.classList.remove('active');
        if (sidebarOverlay) sidebarOverlay.classList.remove('active');
    }
}

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
    const target = document.getElementById(sectionId);
    if(target) target.classList.add('active');
    window.scrollTo(0, 0);
}

function setupNav(id, sectionId, callback) {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('click', (e) => {
            e.preventDefault();
            if (sectionId !== 'userDashboardSection') {
                if (!currentUser.profileImage || currentUser.profileImage === 'undefined' || currentUser.profileImage === "") {
                    Swal.fire({
                        icon: 'warning',
                        title: 'ข้อความแจ้งเตือน',
                        text: 'ระบบพบว่าบัญชีของท่านยังไม่ได้อัปโหลดรูปภาพประจำตัวนักศึกษา กรุณาบันทึกรูปภาพโปรไฟล์ให้เรียบร้อยก่อนทำรายการอื่น',
                        confirmButtonColor: '#1976D2'
                    }).then(() => {
                        showSection('userDashboardSection');
                        document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
                        const dashNav = document.getElementById('navUserDashboard');
                        if (dashNav) dashNav.classList.add('active');
                        closeSidebarOnMobile();
                    });
                    return; 
                }
            }

            showSection(sectionId);
            document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
            el.classList.add('active');
            closeSidebarOnMobile();
            if (callback) callback();
        });
    }
}

window.currentSystemSettings = {};

function renderStudentMenus(globalSettings, hasSpecialAccess) {
    const menus = [
    'menu_userProfile', 'menu_userActivity', 
    'menu_loan2569', 'menu_userResign', 'menu_userPetition', 
    'menu_userTrackPetition', 'menu_overLoan', 'menu_userTransfer' 
    ]; 
    menus.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            const isGlobalOpen = globalSettings[id] === 'true' || globalSettings[id] === undefined;
            const hasSpecial = (id === 'menu_userProfile' && hasSpecialAccess);
            el.style.setProperty('display', (isGlobalOpen || hasSpecial) ? 'block' : 'none', 'important');
        }
    });
}

try {
    const cachedMenuSettings = sessionStorage.getItem('ubu_cached_menu_settings');
    const cachedSpecialAccess = sessionStorage.getItem('ubu_cached_special_access') === 'true';
    if (cachedMenuSettings) {
        window.currentSystemSettings = JSON.parse(cachedMenuSettings);
        renderStudentMenus(window.currentSystemSettings, cachedSpecialAccess);
    }
} catch (e) { console.error("Cache read error:", e); }

async function applyStudentMenuSettings() {
    try {
        const permissions = await callApi('getStudentMenuPermissions', { 
            studentId: currentUser.studentId, 
            token: userToken 
        });
        window.currentSystemSettings = permissions.globalSettings; 
        renderStudentMenus(permissions.globalSettings, permissions.hasSpecialAccess);
        sessionStorage.setItem('ubu_cached_menu_settings', JSON.stringify(permissions.globalSettings));
        sessionStorage.setItem('ubu_cached_special_access', String(permissions.hasSpecialAccess));
    } catch (error) {
        console.error("Menu Settings Error:", error);
        Swal.fire({
            icon: 'warning',
            title: 'โหลดเมนูไม่สมบูรณ์',
            text: 'ขณะนี้มีผู้ใช้งานจำนวนมาก ทำให้ดึงสิทธิ์เมนูไม่สำเร็จ กรุณากดตกลงเพื่อโหลดข้อมูลอีกครั้ง',
            confirmButtonText: 'โหลดหน้าจอใหม่',
            allowOutsideClick: false
        }).then(() => {
            window.location.reload(); 
        });
    }
}

async function updateUserDashboard() {
    document.getElementById('cardFullName').textContent = `${currentUser.prefix || ''}${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim();
    document.getElementById('cardStudentId').textContent = currentUser.studentId || '-';
    document.getElementById('cardFaculty').textContent = currentUser.faculty || '-';
    document.getElementById('cardEmail').textContent = currentUser.gmail || '-';
    
    const imgEl = document.getElementById('cardProfileImg');
    if (currentUser.profileImage && currentUser.profileImage !== 'undefined' && currentUser.profileImage !== "") {
        let imageId = currentUser.profileImage;
        if (imageId.includes('id=')) imageId = imageId.split('id=')[1].split('&')[0];
        else if (imageId.includes('/d/')) imageId = imageId.split('/d/')[1].split('/')[0];
    
        imgEl.src = "https://drive.google.com/uc?export=view&id=" + imageId;
        imgEl.style.display = 'block';
        
        imgEl.onerror = function() {
            this.onerror = null; 
            this.src = "https://drive.google.com/thumbnail?id=" + imageId;
        };
    } else {
        imgEl.style.display = 'none'; 
    }


    // ส่วนดึงสถานะการยื่นกู้ปี 2569 มาแสดงผลบน Dashboard
    const loanStatusEl = document.getElementById('cardLoanStatus');
    if (loanStatusEl) {
        try {
            const res = await callApi('checkStudentEligibility2569', {
                studentId: currentUser.studentId,
                token: userToken
            });
            
            // กรณีที่ 1: ยื่นคำร้องเรียบร้อยแล้ว (res.status === 'submitted')
            if (res && res.status === 'submitted') {
                let submitDate = res.data.timestamp || res.data.date || '-';
                
                if (submitDate !== '-') {
                    const d = new Date(submitDate);
                    if (!isNaN(d)) {
                        submitDate = d.toLocaleDateString('th-TH', { 
                            year: 'numeric', month: 'short', day: 'numeric',
                            hour: '2-digit', minute: '2-digit' 
                        }) + ' น.';
                    }
                }

                loanStatusEl.innerHTML = `
                    <div style="display: inline-flex; flex-direction: column; gap: 2px;">
                        <span style="color: #2e7d32; font-weight: bold; display: inline-flex; align-items: center; gap: 4px;">
                            <i class="material-icons" style="font-size:16px;">check_circle</i> ยื่นคำร้องเรียบร้อยแล้ว
                        </span>
                        <span style="font-size: 13px; color: #555; font-weight: normal; margin-left: 20px;">
                            เวลาที่บันทึก: ${submitDate}
                        </span>
                    </div>
                `;
            } 

            else if (res && (res.status === 'eligible_check' || res.status === 'no_profile')) {
                loanStatusEl.innerHTML = `
                    <span style="color: #c62828; font-weight: bold; display: inline-flex; align-items: center; gap: 4px;">
                        <i class="material-icons" style="font-size:16px;">error_outline</i> ยังไม่ได้ยื่นคำร้อง
                    </span>
                `;
            } 
            // กรณีที่ 3: ไม่พบข้อมูลสิทธิ์ในระบบ (res.status === 'not_found')
            else if (res && res.status === 'not_found') {
                loanStatusEl.innerHTML = `
                    <span style="color: #777; display: inline-flex; align-items: center; gap: 4px;">
                        <i class="material-icons" style="font-size:16px;">remove_circle_outline</i> ไม่พบสิทธิ์รายชื่อเป็นผู้กู้ยืมในระบบ
                    </span>
                `;
            }

            else {
                loanStatusEl.innerHTML = `<span style="color: #777;">ไม่พบสิทธิ์รายชื่อเป็นผู้กู้ยืมในระบบ</span>`;
            }

        } catch (error) {
            console.error("Dashboard Loan Status Error:", error);
            loanStatusEl.innerHTML = `<span style="color: #d32f2f;">เกิดข้อผิดพลาดในการโหลดข้อมูล</span>`;
        }
    }
    }

async function loadUserProfile() {
    document.getElementById('epStudentId').value = currentUser.studentId;
    document.getElementById('epFullNameTH').value = `${currentUser.prefix || ''}${currentUser.firstName || ''} ${currentUser.lastName || ''}`;
    
    showLoading();
    try {
        const profile = await callApi('getProfile', { 
            studentId: currentUser.studentId, 
            token: userToken 
        });
        hideLoading();
        if (profile) {
            ['epIdCard','epNickname','epDob','epPhone','epGpa','epDisease','epFatherName','epFatherJob','epFatherPhone','epMotherName','epMotherJob','epMotherPhone','epParentsStatus','epFamilyMembers','epHouseholdIncome','epDebt','epAddrNo','epSubDistrict','epDistrict','epProvince','epZipcode','epMapLink'].forEach(key => {
                const el = document.getElementById(key);
                const pKey = key.replace('ep', '');
                const camelKey = pKey.charAt(0).toLowerCase() + pKey.slice(1);
                if(el) el.value = profile[camelKey] || '';
            });
        } else {
            document.getElementById('epPhone').value = currentUser.phone || ''; 
        }
    } catch (error) {
        hideLoading();
        console.error(error);
    }
}

let allActivitiesCache = [];
async function loadActivitiesForUser() {
    showLoading();
    try {
        const data = await callApi('getActivities', { 
            mode: 'user', 
            studentId: currentUser.studentId, 
            token: userToken 
        });
        hideLoading();
        allActivitiesCache = data;
        const container = document.getElementById('activityCardContainer');
        container.innerHTML = '';
        if (data.length === 0) {
            container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #777;">ยังไม่มีรายการกิจกรรมที่เปิดรับสมัครในขณะนี้</div>';
            return;
        }
        const grouped = {};
        data.forEach(act => {
            if (!grouped[act.date]) grouped[act.date] = { date: act.date, name: act.name, location: act.location, rounds: [] };
            grouped[act.date].rounds.push(act);
        });
        Object.values(grouped).forEach(g => {
            const avail = g.rounds.filter(r => r.current < r.quota && !r.isRegistered).length;
            let badge = g.rounds.some(r => r.isRegistered) ? '<span style="color:green;">ลงทะเบียนแล้ว</span>' : (avail === 0 ? '<span style="color:red;">จำนวนผู้สมัครเต็ม</span>' : '<span style="color:#1976D2;">เปิดรับลงทะเบียน</span>');
            container.innerHTML += `
                <div class="card" style="margin:0;">
                    <div style="font-weight:bold; color:#1976D2; margin-bottom:5px; display:flex; justify-content:space-between;">
                        ${escapeHTML(formatDate(g.date))} ${badge}
                    </div>
                    <div style="font-weight:bold; color:#333;">${escapeHTML(g.name)}</div>
                    <div style="font-size:14px; color:#666; margin-bottom:15px;"><i class="material-icons" style="font-size:14px;">place</i> ${escapeHTML(g.location)}</div>
                    <button class="btn btn-primary btn-open-round" data-date="${escapeHTML(g.date)}" style="width:100%;">ตรวจสอบรอบ / ลงทะเบียน</button>
                </div>`;
        });
    } catch (err) {
        hideLoading();
        console.error(err);
    }
}

function openRoundSelectionModal(dateKey) {
    const rounds = allActivitiesCache.filter(act => act.date === dateKey);
    if (rounds.length === 0) return;
    document.getElementById('roundModalTitle').innerHTML = `วันที่ ${escapeHTML(formatDate(dateKey))} <br><span style="font-size:14px; font-weight:normal;">${escapeHTML(rounds[0].name)} @ ${escapeHTML(rounds[0].location)}</span>`;
    const tbody = document.getElementById('roundListBody');
    tbody.innerHTML = '';
    rounds.sort((a,b) => a.period.localeCompare(b.period)).forEach(act => {
        const isFull = act.current >= act.quota;
        let actionBtn = act.isRegistered ? `<button class="btn btn-secondary disabled" disabled>ดำเนินการแล้ว</button>` : 
                        (isFull ? `<span style="color:red; font-weight:bold;">จำนวนผู้สมัครเต็ม</span>` : 
                        `<button class="btn btn-success btn-register-act" data-id="${escapeHTML(act.id)}">ลงทะเบียน</button>`);
        tbody.innerHTML += `<tr><td style="font-weight:bold;">${escapeHTML(act.period)}</td><td>${parseInt(act.quota) - parseInt(act.current)} / ${escapeHTML(act.quota)}</td><td>${actionBtn}</td></tr>`;
    });
    document.getElementById('roundSelectionModal').style.display = 'flex';
}

function registerActivity(actId, btn) {
    Swal.fire({ title: 'ยืนยันการทำรายการ', text: 'ท่านประสงค์ที่จะลงทะเบียนเข้าร่วมกิจกรรมในรอบเวลานี้ใช่หรือไม่', icon: 'question', showCancelButton: true }).then(async r => {
        if (r.isConfirmed) {
            btn.disabled = true; 
            showLoading();
            try {
                const res = await callApi('registerStudentActivity', {
                    studentId: currentUser.studentId,
                    activityId: actId,
                    token: userToken
                });
                hideLoading();
                if(res.success) { 
                    Swal.fire('การดำเนินการเสร็จสมบูรณ์','ระบบได้บันทึกข้อมูลการลงทะเบียนของท่านแล้ว','success'); 
                    document.getElementById('roundSelectionModal').style.display='none'; 
                    loadActivitiesForUser(); 
                } else { 
                    Swal.fire('ข้อความแจ้งเตือนจากระบบ', res.message, 'error'); 
                    btn.disabled=false; 
                }
            } catch (err) {
                hideLoading();
                btn.disabled=false; 
                showAlert(err.message, "error");
            }
        }
    });
}

async function loadMyActivityHistory() {
    showLoading();
    try {
        const history = await callApi('getStudentActivityHistory', { 
            studentId: currentUser.studentId, 
            token: userToken 
        });
        hideLoading();
        const c = document.getElementById('historyListContainer');
        c.innerHTML = (history && history.length === 0) || !history ? '<div style="text-align:center; padding:20px; color:#999;">ไม่พบประวัติการลงทะเบียนของท่าน</div>' : 
            history.map(h => `<div class="history-card" style="border:1px solid #ddd; padding:10px; margin-bottom:10px; border-radius:8px;"><b>${escapeHTML(formatDate(h.date))} (${escapeHTML(h.period)})</b><br>${escapeHTML(h.name)}</div>`).join('');
        document.getElementById('activityHistoryModal').style.display = 'flex';
    } catch (err) {
        hideLoading();
        showAlert("เกิดข้อผิดพลาดในการดึงข้อมูล หรือ " + err.message, "warning");
    }
}

window.allQueueSlotsCache = [];

async function loadUserQueueSlots() {
    showLoading(); 
    try {
        const slots = await callApi('getQueueSlots', {
            role: 'user',
            studentId: currentUser.studentId,
            token: userToken
        });
        hideLoading();
        
        const c = document.getElementById('bookingSlotsContainer'); 
        c.innerHTML = '';
        
        if (!slots || slots.length === 0) { 
            c.innerHTML = '<div style="text-align:center; padding:40px; color:#999;">ขณะนี้ไม่มีรอบคิวที่เปิดให้บริการ หากมีข้อผิดพลาดกรุณาติดต่อสถานศึกษา</div>'; 
            return; 
        }
        
        window.allQueueSlotsCache = slots;
        window.renderQueueDates(); 
        
    } catch (err) {
        hideLoading();
        console.error(err);
    }
}

let oldStyle = document.getElementById('queueDynamicStyles');
if (oldStyle) oldStyle.remove();

const style = document.createElement('style');
style.id = 'queueDynamicStyles';
style.innerHTML = `
    .date-slot-card { transition: all 0.2s; border: 1px solid #e0e0e0; background: #fff; border-radius: 12px; padding: 16px; display: flex; align-items: center; justify-content: space-between;}
    .date-slot-card:hover { border-color: #1976D2; box-shadow: 0 4px 12px rgba(25,118,210,0.1); transform: translateY(-2px); }
    .q-time-card { transition: all 0.2s; border: 1px solid #e0e0e0; background: #fff; border-radius: 12px; padding: 16px; }
    .q-time-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); transform: translateY(-2px); border-color: #bbdefb; }
`;
document.head.appendChild(style);

window.renderQueueDates = function() {
    const c = document.getElementById('bookingSlotsContainer');
    
    c.style.display = 'block';
    c.style.width = '100%';
    
    c.innerHTML = `
        <div id="queueDatesList" style="display: flex; flex-wrap: wrap; gap: 15px; margin-top: 15px; justify-content: flex-start; width: 100%;">
        </div>`;
    
    const groupedDates = {};
    window.allQueueSlotsCache.forEach(s => {
        if (!groupedDates[s.date]) groupedDates[s.date] = [];
        groupedDates[s.date].push(s);
    });

    const listContainer = document.getElementById('queueDatesList');

    let datesHtmlContent = ''; 
    Object.keys(groupedDates).forEach(dateStr => {
        const dateSlots = groupedDates[dateStr];
        const totalQuota = dateSlots.reduce((sum, slot) => sum + parseInt(slot.quota), 0);
        const totalBooked = dateSlots.reduce((sum, slot) => sum + parseInt(slot.current), 0);
        const isFull = totalQuota > 0 && totalBooked >= totalQuota;
        const displayDate = escapeHTML(formatDate(dateStr));
        
        datesHtmlContent += `
            <div style="width: 320px; flex-grow: 1; max-width: 350px; cursor:${isFull ? 'default' : 'pointer'}; background: ${isFull ? '#f9f9f9' : '#fff'}; border: 1px solid #ddd; border-radius: 8px; padding: 16px 20px; display: flex; align-items: center; justify-content: space-between; transition: 0.2s;" 
                 onclick="${isFull ? '' : `window.renderQueueTimes('${dateStr}')`}"
                 onmouseover="this.style.borderColor='#1976D2'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.1)';"
                 onmouseout="this.style.borderColor='#ddd'; this.style.boxShadow='none';">
                
                <div style="display:flex; align-items:center; gap:15px;">
                    <div style="color:${isFull ? '#999' : '#1976D2'};">
                        <i class="material-icons" style="font-size:32px;">event</i>
                    </div>
                    <div>
                        <div style="font-weight:bold; font-size:16px; color:#333;">${displayDate}</div>
                        <div style="font-size:13px; color:#666;">เปิดรับ ${dateSlots.length} รอบเวลา</div>
                    </div>
                </div>
                
                <div>
                    ${isFull 
                        ? `<span style="color:#d32f2f; font-weight:bold;">คิวเต็ม</span>` 
                        : `<span style="color:#1976D2; font-weight:bold;">เลือกคิวนี้</span> <i class="material-icons" style="vertical-align:middle;">chevron_right</i>`}
                </div>
            </div>
        `;
    });

    listContainer.innerHTML = datesHtmlContent;
};

window.renderQueueTimes = function(dateStr) {
    const c = document.getElementById('bookingSlotsContainer');
    const displayDate = escapeHTML(formatDate(dateStr));
    
    c.style.display = 'block';
    c.style.width = '100%';
    c.innerHTML = `
        <div style="margin-bottom: 25px; display: flex; align-items: center; gap: 15px; flex-wrap: wrap;">
            <button class="btn btn-secondary" onclick="window.renderQueueDates()" style="display: flex; align-items: center; gap: 5px; padding: 8px 15px; border-radius: 20px;">
                <i class="material-icons" style="font-size: 18px;">arrow_back</i> ย้อนกลับ
            </button>
            <h3 style="margin:0; color:#1976D2; font-size: 18px;">เลือกรอบเวลา (วันที่ ${displayDate})</h3>
        </div>
        <div id="queueCardsGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px; width: 100%;"></div>
    `;
    
    const gridContainer = document.getElementById('queueCardsGrid');
    const dateSlots = window.allQueueSlotsCache.filter(s => s.date === dateStr);
    
    dateSlots.forEach(s => {
        const booked = parseInt(s.current), quota = parseInt(s.quota), isFull = booked >= quota;
        
        gridContainer.innerHTML += `
            <div style="background: ${isFull ? '#f9f9f9' : '#fff'}; border: 1px solid ${isFull ? '#eee' : '#e0e0e0'}; border-radius: 16px; padding: 20px 15px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.04); transition: all 0.3s ease;"
                 onmouseover="if(!${isFull}){ this.style.transform='translateY(-4px)'; this.style.boxShadow='0 8px 20px rgba(25,118,210,0.15)'; this.style.borderColor='#1976D2'; }"
                 onmouseout="if(!${isFull}){ this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(0,0,0,0.04)'; this.style.borderColor='#e0e0e0'; }">
                
                <div style="display: inline-flex; align-items: center; justify-content: center; width: 45px; height: 45px; background: ${isFull ? '#f0f0f0' : '#e3f2fd'}; color: ${isFull ? '#999' : '#1976D2'}; border-radius: 50%; margin-bottom: 12px;">
                    <i class="material-icons" style="font-size: 24px;">schedule</i>
                </div>
                
                <div style="font-size: 18px; font-weight: 700; color: ${isFull ? '#999' : '#333'}; margin-bottom: 5px; letter-spacing: 0.5px;">
                    ${escapeHTML(s.time)}
                </div>
                
                <div style="font-size: 13px; color: ${isFull ? '#d32f2f' : '#2e7d32'}; font-weight: 600; margin-bottom: 15px;">
                    ${isFull ? 'คิวเต็มแล้ว' : `ว่าง: ${quota - booked} คิว`}
                </div>
                
                <button class="btn btn-book-queue" data-id="${escapeHTML(s.id)}" ${isFull ? 'disabled' : ''} style="width: 100%; border-radius: 20px; font-weight: 500; padding: 10px; background: ${isFull ? '#e0e0e0' : ''}; color: ${isFull ? '#888' : ''}; border: none;">
                    ${isFull ? 'เต็ม' : 'จองคิวนี้'}
                </button>
            </div>`;
    });
};


window.bookQ = function(id) {
    Swal.fire({ title: 'ยืนยันการจองคิว', text: 'ท่านต้องการจองคิวการรับบริการในรอบเวลานี้ใช่หรือไม่', icon: 'question', showCancelButton: true }).then(async r => {
        if(r.isConfirmed){
            showLoading('กำลังออกบัตรคิว อาจใช้เวลาสักครู่');
            try {
                const res = await callApi('bookQueue', {
                    studentId: currentUser.studentId,
                    slotId: id,
                    token: userToken
                });
                if(res.success){
                    await window.loadMyQueue(); 
                    hideLoading();
                    
                    Swal.fire({
                        title: 'การดำเนินการเสร็จสมบูรณ์',
                        html: 'ระบบได้ออกหมายเลขคิว: <b>' + res.queueNumber + '</b> ให้ท่านเรียบร้อยแล้ว<br><br><span style="color:#d32f2f; font-weight:bold;">กรุณาบันทึกภาพหน้าจอบัตรคิวนี้เพื่อนำแสดงต่อเจ้าหน้าที่ในวันรับบริการ</span>',
                        icon: 'success'
                    });
                    
                } else {
                    hideLoading();
                    Swal.fire('ข้อความแจ้งเตือนจากระบบ', res.message, 'error');
                }
            } catch (err) {
                hideLoading();
                showAlert(err.message, "error");
            }
        }
    });
};

window.loadMyQueue = async function() {
    try {
        const t = await callApi('getMyQueue', {
            studentId: currentUser.studentId,
            token: userToken
        });
        const ta = document.getElementById('myQueueTicketArea');
        const ba = document.getElementById('bookingSectionWrapper');
        
        if(t) {
            ta.style.display = 'block'; 
            ba.style.display = 'none';
            document.getElementById('ticketNumber').innerText = t.queueNumber || '-';
            document.getElementById('ticketDate').innerText = t.date || '-';
            document.getElementById('ticketTime').innerText = t.time || '-';
            document.getElementById('ticketName').innerText = t.name || '-';
            
            let dayOfWeek = new Date().getDay(); 
            if (t.date && typeof t.date === 'string') {
                if (t.date.includes('อาทิตย์')) dayOfWeek = 0;
                else if (t.date.includes('จันทร์')) dayOfWeek = 1;
                else if (t.date.includes('อังคาร')) dayOfWeek = 2;
                else if (t.date.includes('พุธ')) dayOfWeek = 3;
                else if (t.date.includes('พฤหัส')) dayOfWeek = 4;
                else if (t.date.includes('ศุกร์')) dayOfWeek = 5;
                else if (t.date.includes('เสาร์')) dayOfWeek = 6;
                else {
                    const parts = t.date.split('/');
                    if(parts.length === 3) {
                        let y = parseInt(parts[2]); 
                        if(y > 2500) y -= 543;
                        dayOfWeek = new Date(y, parseInt(parts[1])-1, parseInt(parts[0])).getDay();
                    } 

                    else if (t.date.includes('-')) {
                        const d = new Date(t.date);
                        if (!isNaN(d.getTime())) dayOfWeek = d.getDay();
                    }
                }
            }

            const themes = {
                0: { bg: 'linear-gradient(135deg, #d32f2f, #f44336)', text: '#ffffff', water: 'rgba(255,255,255,0.2)' }, 
                1: { bg: 'linear-gradient(135deg, #fbc02d, #fdd835)', text: '#212121', water: 'rgba(0,0,0,0.15)' },    
                2: { bg: 'linear-gradient(135deg, #c2185b, #e91e63)', text: '#ffffff', water: 'rgba(255,255,255,0.2)' }, 
                3: { bg: 'linear-gradient(135deg, #2e7d32, #4caf50)', text: '#ffffff', water: 'rgba(255,255,255,0.2)' }, 
                4: { bg: 'linear-gradient(135deg, #ef6c00, #ff9800)', text: '#ffffff', water: 'rgba(255,255,255,0.2)' }, 
                5: { bg: 'linear-gradient(135deg, #1565c0, #1e88e5)', text: '#ffffff', water: 'rgba(255,255,255,0.2)' }, 
                6: { bg: 'linear-gradient(135deg, #7b1fa2, #9c27b0)', text: '#ffffff', water: 'rgba(255,255,255,0.2)' }  
            };

            const theme = themes[dayOfWeek] || themes[5];
            const bg = document.getElementById('ticketCardBg');
            const txt = document.getElementById('ticketCardText');
            
            if (bg && txt) {
                bg.style.background = theme.bg; 
                bg.setAttribute('data-watermark', `UBU - ${currentUser.studentId} - Q${t.queueNumber}`);
                txt.style.color = theme.text;
                txt.style.textShadow = (theme.text === '#ffffff') ? '1px 1px 3px rgba(0,0,0,0.4)' : 'none';
                
                const subElements = txt.querySelectorAll('.info-label, .info-value, .scan-label');
                subElements.forEach(el => {
                    el.style.color = (theme.text === '#ffffff') ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.6)';
                });

                let styleEl = document.getElementById('dynamicTicketStyle');
                if(!styleEl) {
                    styleEl = document.createElement('style');
                    styleEl.id = 'dynamicTicketStyle';
                    document.head.appendChild(styleEl);
                }
                styleEl.innerHTML = `.modern-queue-ticket::after { color: ${theme.water} !important; }`;
            }

            const qrContainer = document.getElementById('qrCodeContainer');
            qrContainer.innerHTML = ''; 
            if(typeof QRCode !== 'undefined') {
                new QRCode(qrContainer, {
                    text: `Q-${t.queueNumber}-${currentUser.studentId}`,
                    width: 100, 
                    height: 100,
                    colorDark : "#000000", 
                    colorLight : "#ffffff"
                });
            }
            
            return true; 
        } else {
            ta.style.display = 'none'; 
            ba.style.display = 'block';
            return false; 
        }
    } catch (err) {
        console.error("Queue Error:", err);
        return false;
    }
};

window.cancelMyQueue = function() {
    Swal.fire({ title:'ยืนยันการยกเลิกคิวรับบริการ', text: 'ท่านประสงค์ที่จะยกเลิกคิวรับบริการของท่านใช่หรือไม่', icon:'warning', showCancelButton:true, confirmButtonColor:'#d33' }).then(async r => {
        if(r.isConfirmed){
            showLoading('กำลังยกเลิกคิว');
            try {
                const res = await callApi('cancelQueue', {
                    studentId: currentUser.studentId,
                    token: userToken
                });
                if(res.success){ 
                    await window.loadMyQueue(); 
                    await loadUserQueueSlots(); 
                    hideLoading();
                    Swal.fire('การดำเนินการเสร็จสมบูรณ์','ระบบได้ทำการยกเลิกคิวรับบริการของท่านแล้ว','success'); 
                }
                else {
                    hideLoading();
                    Swal.fire('ข้อความแจ้งเตือนจากระบบ', res.message, 'error');
                }
            } catch (err) {
                hideLoading();
                showAlert(err.message, 'error');
            }
        }
    });
};

async function initUserLoanPage() {
    document.getElementById('loanStep1').style.display = 'block';
    document.getElementById('loanStep2').style.display = 'none';
    document.getElementById('loanStep3').style.display = 'none';
    updateStepper(1, 'loan-step');
    
    showLoading(); 
    try {
        const res = await callApi('checkStudentEligibility2569', {
            studentId: currentUser.studentId,
            token: userToken
        });
        hideLoading();
        if (res.status === 'submitted') {
            updateStepper(3, 'loan-step');          
            showLoanSummary(res.data); 
        }
    } catch (err) {
        hideLoading();
        console.error(err);
    }
}

async function checkMyEligibility() {
    showLoading('ระบบกำลังดำเนินการตรวจสอบสิทธิ์การกู้ยืม');
    try {
        const res = await callApi('checkStudentEligibility2569', {
            studentId: currentUser.studentId,
            token: userToken
        });
        hideLoading();
        if (res.status === 'not_found') {
            Swal.fire('ไม่พบสิทธิ์การกู้ยืม', 'ท่านไม่อยู่ในกลุ่มผู้มีสิทธิ์ขอกู้ยืมเงินในระบบปกติ ปีการศึกษา 2569', 'error');
        } else if (res.status === 'submitted') {
            showLoanSummary(res.data); updateStepper(3, 'loan-step');
        } else if (res.status === 'no_profile') {
            const isProfileMenuOpen = (window.currentSystemSettings['menu_userProfile'] === 'true' || window.currentSystemSettings['menu_userProfile'] === undefined);
            if (isProfileMenuOpen) {
                Swal.fire({
                    icon: 'warning',
                    title: 'ยังไม่ได้บันทึกทะเบียนประวัติ',
                    text: 'ท่านยังไม่ได้บันทึกข้อมูลทะเบียนประวัติในระบบ กรุณาบันทึกข้อมูลให้เรียบร้อยก่อนดำเนินการยื่นคำร้องขอกู้ยืมเงิน',
                    showCancelButton: true,
                    confirmButtonColor: '#1976D2',
                    cancelButtonColor: '#6c757d',
                    confirmButtonText: 'ไปหน้าบันทึกประวัติ',
                    cancelButtonText: 'ปิดหน้าต่าง'
                }).then((result) => {
                    if (result.isConfirmed) {
                        showSection('userProfileSection'); 
                        document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
                        document.getElementById('navUserProfile').classList.add('active');
                    }
                });
           } else {
 
                const isPetitionClosed = (window.currentSystemSettings['pet_type1_open'] === 'false');
                
                if (isPetitionClosed) {
                    Swal.fire({
                        icon: 'error',
                        title: 'ไม่สามารถดำเนินการได้',
                        text: 'ท่านไม่มีข้อมูลทะเบียนประวัติในระบบ และขณะนี้ระบบยื่นคำร้องออนไลน์ได้ "ปิดรับการดำเนินการ" แล้ว',
                        footer: '<span style="color:#d32f2f; font-weight:bold;">* กรุณาติดต่อเจ้าหน้าที่ กยศ. เพื่อสอบถามข้อมูลเพิ่มเติม</span>',
                        confirmButtonColor: '#d32f2f',
                        confirmButtonText: 'ปิดหน้าต่าง'
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'ไม่สามารถดำเนินการได้',
                        text: 'เนื่องจากไม่อยู่ในระยะเวลาที่กำหนดให้บันทึกประวัติ',
                        footer: '<span style="color:#d32f2f; font-weight:bold;">* กรุณายื่นคำร้องขอปรับปรุงข้อมูลประวัตินอกรอบ</span>',
                        showCancelButton: true,
                        confirmButtonColor: '#ff9800',
                        cancelButtonColor: '#6c757d',
                        confirmButtonText: 'ไปหน้ายื่นคำร้องออนไลน์',
                        cancelButtonText: 'ปิดหน้าต่าง'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            goToPetitionFromFail('1'); 
                        }
                    });
                }
            }
        } else if (res.status === 'eligible_check') {
            document.getElementById('loanStep1').style.display = 'none';
            document.getElementById('loanStep2').style.display = 'block';
            updateStepper(2, 'loan-step');
            

            let sheetDate = res.studentInfo.updatedAt || res.studentInfo.timestamp;
            let updateDateStr = (res.gpaxUpdatedDate && res.gpaxUpdatedDate !== 'ไม่ระบุ') 
            ? formatDate(res.gpaxUpdatedDate) : (sheetDate ? formatDate(sheetDate) : 'ไม่ระบุ');
            
            
            document.getElementById('loanInfoCard').innerHTML = `
                <b>ข้อมูลผู้มีสิทธิ์:</b> ${escapeHTML(res.studentInfo.name || (currentUser.prefix + currentUser.firstName + ' ' + currentUser.lastName))}<br>
                <span style="font-size: 13px; color: #555;">รหัสประจำตัว: ${escapeHTML(res.studentInfo.studentId || currentUser.studentId)} | คณะ/สังกัด: ${escapeHTML(res.studentInfo.faculty || currentUser.faculty || '-')}</span><br>
                <div style="margin-top:5px; border-top:1px dashed #ccc; padding-top:5px; margin-bottom:5px;">ระดับคะแนนเฉลี่ยสะสม (GPAX): <b>${escapeHTML(res.studentInfo.gpa)}</b> | หน่วยกิตกิจกรรมจิตอาสา: <b>${escapeHTML(res.studentInfo.credits)}</b> หน่วยกิต</div>
                <div style="font-size: 13px; color: #1976D2;"><i class="material-icons" style="font-size: 14px; vertical-align: text-bottom;">info</i> รายงานจากฐานข้อมูล เมื่อ วันที่ ${updateDateStr}</div>
            `;
            if (res.passed) {
                document.getElementById('loanFailMessage').style.display = 'none';
                document.getElementById('loanFormArea').style.display = 'block';
            } else {
                document.getElementById('loanFailMessage').style.display = 'block';
                document.getElementById('loanFormArea').style.display = 'none';
            }
        }
    } catch (err) {
        hideLoading();
        showAlert(err.message, 'error');
    }
}

function goToPetitionFromFail(type) {
    const set = window.currentSystemSettings;
    
    if (set && set['pet_type' + type + '_open'] === 'false') {
        Swal.fire({
            icon: 'error',
            title: 'ระบบปิดรับคำร้อง',
            text: 'ขณะนี้ไม่อยู่ในช่วงระยะเวลาที่กำหนดให้ยื่นคำร้องประเภทนี้',
            confirmButtonColor: '#d32f2f',
            confirmButtonText: 'ตกลง'
        });
        return; 
    }

    showSection('userPetitionSection');
    initPetitionPage(type);
    document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
    document.getElementById('navUserPetition').classList.add('active');
}

function toggleLoanOption(type) {
    const cb = document.getElementById(type === 'living' ? 'checkLiving' : 'checkTuition');
    const card = document.getElementById(type === 'living' ? 'cardLiving' : 'cardTuition');
    cb.checked = !cb.checked;
    card.classList.toggle('selected', cb.checked);
    card.querySelector('.check-icon').textContent = cb.checked ? 'check_circle' : 'radio_button_unchecked';
    card.querySelector('.check-icon').style.color = cb.checked ? 'var(--secondary-color)' : '#ddd';
    
    if(type === 'tuition') {
        document.getElementById('tuitionInputArea').style.display = cb.checked ? 'block' : 'none';
        document.getElementById('inputTuition').disabled = !cb.checked;
        if(!cb.checked) document.getElementById('inputTuition').value = '';
    }
    calcLoanTotal();
}

function calcLoanTotal() {
    let total = 0;
    const chkLiving = document.getElementById('checkLiving');
    const chkTuition = document.getElementById('checkTuition');
    const inputTuition = document.getElementById('inputTuition');

    if(chkLiving && chkLiving.checked) total += 18000;
    if(chkTuition && chkTuition.checked && inputTuition) {
        total += parseFloat(inputTuition.value) || 0;
    }
    const showTotal = document.getElementById('showTotalLoan');
    if(showTotal) showTotal.textContent = total.toLocaleString();
}

function confirmSubmitLoan() {
    const isL = document.getElementById('checkLiving').checked;
    const isT = document.getElementById('checkTuition').checked;
    const tVal = document.getElementById('inputTuition').value;
    
    if (!isL && !isT) return Swal.fire('ข้อความแจ้งเตือน', 'กรุณาเลือกประเภทการขอกู้ยืมอย่างน้อย 1 รายการ', 'warning');
    if (isT && (!tVal || tVal <= 0)) return Swal.fire('ข้อความแจ้งเตือน', 'กรุณาระบุจำนวนเงินค่าเล่าเรียนให้ถูกต้องตามความเป็นจริง', 'warning');

    Swal.fire({ title:'ยืนยันการทำรายการ', text:'กรุณาตรวจสอบข้อมูลยอดเงินกู้ยืมให้ถูกต้องก่อนการยืนยัน หากส่งข้อมูลเข้าสู่ระบบแล้วจะไม่สามารถดำเนินการแก้ไขได้ ท่านยืนยันที่จะทำรายการต่อหรือไม่', icon:'warning', showCancelButton:true }).then(async r => {
        if(r.isConfirmed) {
            showLoading();
            const payload = createSecurePayload({ 
                name: `${currentUser.prefix || ''}${currentUser.firstName || ''} ${currentUser.lastName || ''}`,
                reqType: (isL && isT) ? 'Both' : (isL ? 'Living' : 'Tuition'),
                livingAmount: isL ? 18000 : 0,
                tuitionAmount: isT ? parseFloat(tVal) : 0,
                totalAmount: (isL ? 18000 : 0) + (isT ? parseFloat(tVal) : 0)
            });
            
            try {
                const res = await callApi('submitLoanRequest2569', payload);
                hideLoading();
                if(res.success) {
                    updateStepper(3, 'loan-step');
                    showLoanSummary(payload);
                    Swal.fire('การดำเนินการเสร็จสมบูรณ์', 'ระบบได้รับคำร้องขอกู้ยืมของท่านเรียบร้อยแล้ว', 'success');
                } else Swal.fire('ข้อความแจ้งเตือนจากระบบ', res.message, 'error');
            } catch (err) {
                hideLoading();
                showAlert(err.message, 'error');
            }
        }
    });
}

function showLoanSummary(data) {
    document.getElementById('loanStep1').style.display = 'none';
    document.getElementById('loanStep2').style.display = 'none';
    document.getElementById('loanStep3').style.display = 'block';
    document.getElementById('summaryStudentId').textContent = currentUser.studentId;
    if(document.getElementById('receiptName')) document.getElementById('receiptName').textContent = data.name || `${currentUser.prefix || ''}${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim();
    if(document.getElementById('summaryFaculty')) document.getElementById('summaryFaculty').textContent = data.faculty || currentUser.faculty || '-';
    
    let typeText = 'ไม่ได้ระบุ';
    if(data.reqType === 'Both') typeText = 'ขอกู้ยืมค่าครองชีพ และ ค่าเล่าเรียน';
    else if(data.reqType === 'Living') typeText = 'ขอกู้ยืมเฉพาะค่าครองชีพ';
    else if(data.reqType === 'Tuition') typeText = 'ขอกู้ยืมเฉพาะค่าเล่าเรียน';
    
    document.getElementById('summaryType').textContent = typeText;
    document.getElementById('summaryLiving').textContent = data.livingAmount > 0 ? parseFloat(data.livingAmount).toLocaleString() : '-';
    document.getElementById('summaryTuition').textContent = data.tuitionAmount > 0 ? parseFloat(data.tuitionAmount).toLocaleString() : '-';
    document.getElementById('summaryTotal').textContent = parseFloat(data.totalAmount).toLocaleString();
}

function updateStepper(step, cl) {
    document.querySelectorAll('.'+cl).forEach((el, i) => el.classList.toggle('active', i+1 <= step));
}

function initOverLoanPage() {
    document.getElementById('overStep1').style.display = 'block';
    document.getElementById('overStep2').style.display = 'none';
    document.getElementById('overStep3').style.display = 'none';
    updateStepper(1, 'over-step');
}

async function checkMyOverEligibility() {
    showLoading('ระบบกำลังดำเนินการตรวจสอบสิทธิ์');
    try {
        const res = await callApi('checkStudentOverEligibility', {
            studentId: currentUser.studentId,
            token: userToken
        });
        hideLoading();
        if(res.status === 'not_found') Swal.fire('ไม่พบสิทธิ์', res.message, 'error');
        else if(res.status === 'submitted') {
            showOverLoanSummary(res.data); updateStepper(3, 'over-step');
        } else if (res.status === 'no_profile') {
            const isProfileMenuOpen = (window.currentSystemSettings['menu_userProfile'] === 'true' || window.currentSystemSettings['menu_userProfile'] === undefined);
            if (isProfileMenuOpen) {
                Swal.fire({
                    icon: 'warning',
                    title: 'ยังไม่ได้บันทึกทะเบียนประวัติ',
                    text: 'ท่านยังไม่ได้ทำการบันทึกทะเบียนประวัติในระบบ กรุณาบันทึกข้อมูลให้เรียบร้อยก่อนยื่นคำร้องขอกู้ยืมเงิน',
                    showCancelButton: true,
                    confirmButtonColor: '#7b1fa2', 
                    cancelButtonColor: '#6c757d',
                    confirmButtonText: 'ไปหน้าบันทึกประวัติ',
                    cancelButtonText: 'ปิดหน้าต่าง'
                }).then((result) => {
                    if (result.isConfirmed) {
                        showSection('userProfileSection'); 
                        document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
                        document.getElementById('navUserProfile').classList.add('active');
                    }
                });
            } else {
                const isPetitionClosed = (window.currentSystemSettings['pet_type1_open'] === 'false');
                
                if (isPetitionClosed) {
                    Swal.fire({
                        icon: 'error',
                        title: 'ไม่สามารถดำเนินการได้',
                        text: 'ท่านไม่มีข้อมูลทะเบียนประวัติในระบบ และขณะนี้ระบบยื่นคำร้องออนไลน์ได้ "ปิดรับการดำเนินการ" แล้ว',
                        footer: '<span style="color:#d32f2f; font-weight:bold;">* กรุณาติดต่อเจ้าหน้าที่ กยศ. เพื่อสอบถามข้อมูลเพิ่มเติม</span>',
                        confirmButtonColor: '#d32f2f',
                        confirmButtonText: 'ปิดหน้าต่าง'
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'ไม่สามารถดำเนินการได้',
                        text: 'เนื่องจากไม่อยู่ในระยะเวลาที่กำหนดให้บันทึกประวัติ',
                        footer: '<span style="color:#d32f2f; font-weight:bold;">* กรุณายื่นคำร้องขอปรับปรุงข้อมูลประวัตินอกรอบ</span>',
                        showCancelButton: true,
                        confirmButtonColor: '#ff9800',
                        cancelButtonColor: '#6c757d',
                        confirmButtonText: 'ไปหน้ายื่นคำร้องออนไลน์',
                        cancelButtonText: 'ปิดหน้าต่าง'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            goToPetitionFromFail('1'); 
                        }
                    });
                }
            }
        } else if (res.status === 'eligible_check') {
            document.getElementById('overStep1').style.display = 'none';
            document.getElementById('overStep2').style.display = 'block';
            updateStepper(2, 'over-step');
            
            let updateDateStr = (res.gpaxUpdatedDate && res.gpaxUpdatedDate !== 'ไม่ระบุ') 
                ? formatDate(res.gpaxUpdatedDate) 
                : (res.studentInfo.updatedAt ? formatDate(res.studentInfo.updatedAt) : 'ไม่ระบุ');
            
            document.getElementById('overInfoBox').innerHTML = `
                <b>ข้อมูลผู้มีสิทธิ์ขอกู้:</b> ${escapeHTML(res.studentInfo.name)}<br>
                <span style="font-size: 13px; color: #555;">รหัสประจำตัว: ${escapeHTML(res.studentInfo.studentId)} | คณะ/สังกัด: ${escapeHTML(res.studentInfo.faculty)}</span><br>
                <div style="margin-top:5px; border-top:1px dashed #ce93d8; padding-top:5px; margin-bottom:5px;">ระดับคะแนนเฉลี่ยสะสม (GPAX): <b>${escapeHTML(res.studentInfo.gpa)}</b> | หน่วยกิตกิจกรรมจิตอาสา: <b>${escapeHTML(res.studentInfo.credits)}</b> หน่วยกิต</div>
                <div style="font-size: 13px; color: var(--over-primary, #7b1fa2);"><i class="material-icons" style="font-size: 14px; vertical-align: text-bottom;">info</i> รายงานจากฐานข้อมูล เมื่อ วันที่ ${updateDateStr}</div>
            `;
            if (res.passed) {
                document.getElementById('overLoanFailMessage').style.display = 'none';
                document.getElementById('overLoanFormArea').style.display = 'block';
            } else {
                document.getElementById('overLoanFailMessage').style.display = 'block';
                document.getElementById('overLoanFormArea').style.display = 'none';
            }
        }
    } catch (err) {
        hideLoading();
        showAlert(err.message, 'error');
    }
}

function toggleOverTuition() {
    const val = document.getElementById('overType').value;
    const wrapper = document.getElementById('overTuitionWrapper');
    const input = document.getElementById('overTuitionAmount');
    if (val === 'Both' || val === 'Tuition') { wrapper.style.display = 'block'; input.required = true; } 
    else { wrapper.style.display = 'none'; input.required = false; input.value = ''; }
}

function showOverLoanSummary(data) {
    document.getElementById('overStep1').style.display = 'none';
    document.getElementById('overStep2').style.display = 'none';
    document.getElementById('overStep3').style.display = 'block';
    document.getElementById('overSummaryStudentId').textContent = currentUser.studentId;
    if(document.getElementById('overReceiptName')) document.getElementById('overReceiptName').textContent = data.name || `${currentUser.prefix || ''}${currentUser.firstName || ''} ${currentUser.lastName || ''}`;
    
    let typeText = 'ไม่ได้ระบุ';
    if(data.reqType === 'Both') typeText = 'ขอกู้ยืมค่าครองชีพ และ ค่าเล่าเรียน';
    else if(data.reqType === 'Living') typeText = 'ขอกู้ยืมเฉพาะค่าครองชีพ';
    else if(data.reqType === 'Tuition') typeText = 'ขอกู้ยืมเฉพาะค่าเล่าเรียน';
    
    document.getElementById('overSummaryType').textContent = typeText;
    document.getElementById('overSummaryCredits').textContent = data.remCredits || '-';
    document.getElementById('overSummaryGrad').textContent = data.gradYear || '-';
}

function initResignPage() {
    document.getElementById('resignStep1').style.display = 'block';
    document.getElementById('resignStep2').style.display = 'none';
    document.getElementById('resignStep3').style.display = 'none';
}

async function checkMyResignStatus() {
    showLoading();
    try {
        const res = await callApi('checkStudentResignStatus', {
            studentId: currentUser.studentId,
            token: userToken
        });
        hideLoading();
        if(res.status === 'submitted') {
            document.getElementById('resignStep1').style.display = 'none';
            document.getElementById('resignStep2').style.display = 'none'; 
            document.getElementById('resignStep3').style.display = 'block'; 
        } else if(res.status === 'eligible') {
            document.getElementById('res_stdName').innerText = res.info.name;
            document.getElementById('res_stdId').innerText = res.info.studentId;
            document.getElementById('res_stdFaculty').innerText = res.info.faculty;
            document.getElementById('res_stdCurr').innerText = res.info.curriculum;
            document.getElementById('resignStep1').style.display = 'none';
            document.getElementById('resignStep2').style.display = 'block';
            document.getElementById('resignStep3').style.display = 'none';
        } else {
            Swal.fire('ข้อความแจ้งเตือนจากระบบ', res.message || 'ไม่พบข้อมูลที่ระบุ', 'error');
        }
    } catch (err) {
        hideLoading();
        showAlert(err.message, 'error');
    }
}

function selectResignType(type, cardEl) {
    document.querySelectorAll('#resignForm .loan-option-card').forEach(el => el.classList.remove('selected'));
    cardEl.classList.add('selected');
    cardEl.querySelector('input').checked = true;

    document.getElementById('resignDetailArea').style.display = 'block';
    document.getElementById('inputGroup_NewUni').style.display = type==='move_uni'?'block':'none';
    document.getElementById('inputGroup_NewFac').style.display = type==='change_fac'?'block':'none';
    document.getElementById('inputNewInstitution').required = type==='move_uni';
    document.getElementById('inputNewFaculty').required = type==='change_fac';
    document.getElementById('inputNewMajor').required = type==='change_fac';
}

function initPetitionPage(prefillType = "") {
    document.getElementById('petStudentId').value = currentUser.studentId;
    document.getElementById('petName').value = `${currentUser.prefix || ''}${currentUser.firstName || ''} ${currentUser.lastName || ''}`;
    document.getElementById('petReason').value = '';
    
    const dd = document.getElementById('petType');
    if (prefillType) dd.value = prefillType;
    else dd.value = "";
}

async function loadMyPetitions() {
    showLoading();
    try {
        const data = await callApi('getMyPetitions', {
            studentId: currentUser.studentId,
            token: userToken
        });
        hideLoading();
        const tb = document.querySelector('#petitionStatusTable tbody');
        tb.innerHTML = '';
        if(!data || data.length===0) { tb.innerHTML = '<tr><td colspan="5" style="text-align:center;">ไม่พบข้อมูลประวัติคำร้องในระบบ</td></tr>'; return; }
        data.forEach(i => {
            const tr = tb.insertRow();
            const d = new Date(i['วันที่ยื่นคำร้อง']);
            tr.insertCell().innerText = isNaN(d) ? '-' : d.toLocaleDateString('th-TH');
            tr.insertCell().innerText = isNaN(d) ? '-' : d.toLocaleTimeString('th-TH');
            tr.insertCell().innerText = i['ประเภทคำร้อง'] || '-';
            
            const st = i['สถานะ'] || 'รับคำร้องเข้าสู่ระบบ';
            let col = '#777', bg = '#f1f1f1';
            if(st==='รับคำร้องเข้าสู่ระบบ' || st==='รับคำร้อง'){ col='#0d47a1'; bg='#e3f2fd'; }
            else if(st.includes('ไม่สำเร็จ')||st==='ไม่อนุมัติ'){ col='#d32f2f'; bg='#ffebee'; }
            else if(st.includes('อนุมัติ') || st.includes('สำเร็จ')){ col='#2e7d32'; bg='#e8f5e9'; }
            
            tr.insertCell().innerHTML = `<span style="background:${bg}; color:${col}; padding:4px 10px; border-radius:20px; font-size:12px;">${escapeHTML(st)}</span>`;
            tr.insertCell().innerText = i['หมายเหตุเจ้าหน้าที่'] || '-';
        });
    } catch (err) {
        hideLoading();
        console.error(err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('topbarUserName').textContent = `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || 'ไม่พบรายชื่อในระบบ';
    applyStudentMenuSettings();
    showSection('userDashboardSection');
    updateUserDashboard();

    document.getElementById('sidebarToggle')?.addEventListener('click', () => {
        if (window.innerWidth <= 900) {
            sidebar.classList.toggle('active');
            if (sidebarOverlay) sidebarOverlay.classList.toggle('active');
        } else {
            sidebar.classList.toggle('collapsed');
        }
    });

    if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeSidebarOnMobile);

    setupNav('navUserDashboard', 'userDashboardSection', updateUserDashboard);
    setupNav('navUserProfile', 'userProfileSection', loadUserProfile);
    setupNav('navUserActivity', 'userActivitySection', loadActivitiesForUser);
    setupNav('navLoan2569', 'userLoan2569Section', initUserLoanPage);
    setupNav('navOverLoan', 'userOverLoanSection', initOverLoanPage);
    setupNav('navUserResign', 'userResignSection', initResignPage);
    setupNav('navUserPetition', 'userPetitionSection', () => { initPetitionPage(); });
    setupNav('navUserTrackPetition', 'userTrackPetitionSection', loadMyPetitions);
    setupNav('navUserTransfer', 'userTransferSection', initTransferPage);

    setupNav('navUserQueue', 'userQueue', async () => { 
        showLoading('กำลังโหลดข้อมูล');
        const hasTicket = await window.loadMyQueue(); 
        if(!hasTicket) {
            await loadUserQueueSlots();
        }
        hideLoading();
    });

    document.getElementById('navLogout').addEventListener('click', (e) => { 
        e.preventDefault(); 
        Swal.fire({
            title: 'ออกจากระบบ',
            text: "ท่านยืนยันความประสงค์ที่จะออกจากระบบใช่หรือไม่",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#dc3545',
            confirmButtonText: 'ยืนยันการออกจากระบบ'
        }).then((result) => {
            if (result.isConfirmed) {
                sessionStorage.clear();
                Swal.fire({
                    title: 'ออกจากระบบสำเร็จ',
                    text: 'ระบบกำลังพากลับไปยังหน้าเข้าสู่ระบบ',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false,
                    allowOutsideClick: false
                }).then(() => {
                    window.top.location.href = "index.html"; 
                });
            }
        });
    });

    document.getElementById('uploadProfileInput').addEventListener('change', function() {
        const file = this.files[0];
        if (!file) return;
        if (file.size > 5 * 1024 * 1024) return showAlert("ขนาดไฟล์เกินกว่าที่ระบบกำหนด (อนุญาตสูงสุด 5MB)", "error");

        const reader = new FileReader();
        reader.onload = async function(e) {
            const base64Content = e.target.result.split(',')[1];
            const mimeType = e.target.result.split(',')[0].match(/:(.*?);/)[1];
            
            showLoading('ระบบกำลังอัปโหลดข้อมูลรูปภาพ');
            try {
                const res = await callApi('uploadProfileImage', createSecurePayload({
                    base64: base64Content,
                    mimeType: mimeType,
                    fileName: file.name
                }));
                
                hideLoading();
                if (res.success) {
                    const imgEl = document.getElementById('cardProfileImg');
                    const safeImageId = res.imageUrl.replace(/[^a-zA-Z0-9_-]/g, "");
                    imgEl.src = "https://drive.google.com/uc?id=" + safeImageId;
                    imgEl.style.display = 'block';
                    currentUser.profileImage = safeImageId; 
                    sessionStorage.setItem('ubu_user_data', JSON.stringify(currentUser));
                    showAlert("ระบบได้ทำการอัปโหลดรูปภาพประจำตัวของท่านเสร็จสมบูรณ์แล้ว");
                } else {
                    showAlert(res.message, "error");
                }
            } catch (err) {
                hideLoading();
                showAlert(err.message, "error");
            }
        };
        reader.readAsDataURL(file);
    });

    document.getElementById('eProfileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        showLoading('ระบบกำลังบันทึกข้อมูลประวัติของท่าน');
        const pData = {
            idCard: document.getElementById('epIdCard').value,
            nickname: document.getElementById('epNickname').value,
            dob: document.getElementById('epDob').value,
            phone: document.getElementById('epPhone').value,
            gpa: document.getElementById('epGpa').value,
            disease: document.getElementById('epDisease').value,
            fatherName: document.getElementById('epFatherName').value,
            fatherJob: document.getElementById('epFatherJob').value,
            fatherPhone: document.getElementById('epFatherPhone').value,
            motherName: document.getElementById('epMotherName').value,
            motherJob: document.getElementById('epMotherJob').value,
            motherPhone: document.getElementById('epMotherPhone').value,
            parentsStatus: document.getElementById('epParentsStatus').value,
            familyMembers: document.getElementById('epFamilyMembers').value,
            householdIncome: document.getElementById('epHouseholdIncome').value,
            debt: document.getElementById('epDebt').value,
            addrNo: document.getElementById('epAddrNo').value,
            subDistrict: document.getElementById('epSubDistrict').value,
            district: document.getElementById('epDistrict').value,
            province: document.getElementById('epProvince').value,
            zipcode: document.getElementById('epZipcode').value,
            mapLink: document.getElementById('epMapLink').value
        };

        try {
            const res = await callApi('saveProfile', { 
                profileData: createSecurePayload(pData), 
                token: userToken 
            });
            hideLoading();
            if (res.success) showAlert('ระบบได้บันทึกข้อมูลประวัติของท่านเสร็จสมบูรณ์แล้ว'); 
            else showAlert(res.message, 'error');
        } catch (err) {
            hideLoading();
            showAlert(err.message, 'error');
        }
    });

    document.getElementById('overLoanForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const typeVal = document.getElementById('overType').value;
        const tVal = document.getElementById('overTuitionAmount').value;
        if ((typeVal === 'Both' || typeVal === 'Tuition') && (!tVal || tVal <= 0)) return Swal.fire('ข้อความแจ้งเตือน', 'กรุณาระบุจำนวนเงินค่าเล่าเรียน', 'warning');

        Swal.fire({ title:'ยืนยันการส่งคำร้อง', text:'กรุณาตรวจสอบความถูกต้องของข้อมูลทั้งหมดก่อนการยืนยัน', icon:'question', showCancelButton:true }).then(async r => {
            if(r.isConfirmed) {
                showLoading();
                const payload = createSecurePayload({ 
                    name: `${currentUser.prefix || ''}${currentUser.firstName || ''} ${currentUser.lastName || ''}`,
                    remCredits: document.getElementById('overRemCredits').value,
                    gradYear: document.getElementById('overGradYear').value,
                    reqType: typeVal,
                    tuitionAmount: tVal || 0,
                    livingAmount: (typeVal !== 'Tuition') ? 18000 : 0
                });
                
                try {
                    const res = await callApi('submitOverRequest', payload);
                    hideLoading();
                    if(res.success) { updateStepper(3, 'over-step'); showOverLoanSummary(payload); Swal.fire('การดำเนินการเสร็จสมบูรณ์', 'ระบบได้รับคำร้องของท่านแล้ว', 'success'); } 
                    else Swal.fire('ข้อความแจ้งเตือนจากระบบ', res.message, 'error');
                } catch (err) {
                    hideLoading();
                    showAlert(err.message, 'error');
                }
            }
        });
    });

    document.getElementById('resignForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const tEl = document.querySelector('input[name="resignType"]:checked');
        if(!tEl) return Swal.fire('ข้อความแจ้งเตือน', 'กรุณาเลือกรูปแบบการลาออกของท่าน', 'warning');
        
        Swal.fire({ title:'ยืนยันการทำรายการ', text:'เมื่อทำการส่งคำร้องเข้าสู่ระบบแล้ว ท่านจะไม่สามารถกลับมาแก้ไขข้อมูลได้อีก ท่านยืนยันที่จะดำเนินการต่อหรือไม่', icon:'warning', showCancelButton:true }).then(async r => {
            if(r.isConfirmed) {
                showLoading();
                const payload = createSecurePayload({ 
                    name: document.getElementById('res_stdName').innerText,
                    resignType: tEl.value,
                    resignDate: document.getElementById('inputResignDate').value,
                    newInstitution: document.getElementById('inputNewInstitution').value,
                    newFaculty: document.getElementById('inputNewFaculty').value,
                    newMajor: document.getElementById('inputNewMajor').value
                });
                
                try {
                    const res = await callApi('submitResignRequest', payload);
                    hideLoading();
                    if(res.success) { document.getElementById('resignStep2').style.display='none'; document.getElementById('resignStep3').style.display='block'; }
                    else Swal.fire('เกิดข้อผิดพลาดในการดำเนินการ', res.message, 'error');
                } catch (err) {
                    hideLoading();
                    showAlert(err.message, 'error');
                }
            }
        });
    });

    document.getElementById('petType').addEventListener('change', function() {
        const val = this.value;
        if(!val) return;
        const set = window.currentSystemSettings;
        if ((val==="1" && set['pet_type1_open']==='false') || 
            (val==="2" && set['pet_type2_open']==='false') || 
            (val==="3" && set['pet_type3_open']==='false') || 
            (val==="4" && set['pet_type4_open']==='false')) {
            Swal.fire({ icon:'error', title:'ไม่สามารถทำรายการได้', text:'ขณะนี้ไม่อยู่ในช่วงระยะเวลาที่สถานศึกษากำหนดให้ยื่นคำร้อง' });
            this.value = "";
        }
    });

    document.getElementById('petitionForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const petType = document.getElementById('petType').value;
        if(!petType) return Swal.fire('ข้อความแจ้งเตือน','กรุณาเลือกประเภทของคำร้อง','warning');
        
        const set = window.currentSystemSettings;
        if ((petType === "1" && set['pet_type1_open'] === 'false') || 
            (petType === "2" && set['pet_type2_open'] === 'false') || 
            (petType === "3" && set['pet_type3_open'] === 'false') || 
            (petType === "4" && set['pet_type4_open'] === 'false')) {
            return Swal.fire({ 
                icon: 'error', 
                title: 'ไม่สามารถทำรายการได้', 
                text: 'ขณะนี้ไม่อยู่ในช่วงระยะเวลาที่สถานศึกษากำหนดให้ยื่นคำร้อง',
                confirmButtonColor: '#d32f2f'
            });
        }
        
        if (petType === "4") {
            showLoading('กำลังตรวจสอบข้อมูลรายชื่อของท่านในระบบ');
            try {
                const checkRes = await callApi('checkStudentEligibility2569', {
                    studentId: currentUser.studentId,
                    token: userToken
                });
                hideLoading();
                
                if (checkRes.status === 'eligible_check' || checkRes.status === 'submitted') {
                    return Swal.fire({
                        icon: 'error',
                        title: 'ไม่สามารถยื่นคำร้องได้',
                        text: 'ระบบตรวจสอบพบว่า "ท่านมีรายชื่อผู้มีสิทธิ์ในระบบเรียบร้อยแล้ว" ไม่จำเป็นต้องยื่นคำร้องขอเพิ่มชื่ออีก',
                        confirmButtonColor: '#d32f2f'
                    });
                }
            } catch (err) {
                hideLoading();
                console.error(err);
                Swal.fire('ข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อฐานข้อมูลเพื่อตรวจสอบสิทธิ์ได้ กรุณาลองใหม่', 'error');
                return; 
            }
        }

        Swal.fire({ 
            title: 'ยืนยันการส่งคำร้องออนไลน์', 
            text: 'ท่านประสงค์ที่จะส่งคำร้องออนไลน์เข้าสู่ระบบใช่หรือไม่', 
            icon: 'question', 
            showCancelButton: true 
        }).then(async r => {
            if(r.isConfirmed) {
                showLoading();
                const payload = createSecurePayload({ 
                    name: document.getElementById('petName').value,
                    type: document.getElementById('petType').value,
                    reason: document.getElementById('petReason').value
                });
                
                try {
                    const res = await callApi('submitOnlinePetition', payload);
                    hideLoading();
                    if(res.success) { 
                        Swal.fire('การดำเนินการเสร็จสมบูรณ์','ระบบได้รับคำร้องออนไลน์ของท่านแล้ว','success').then(()=>{ 
                            showSection('userDashboardSection'); 
                        }); 
                    }
                    else Swal.fire('เกิดข้อผิดพลาด', res.message, 'error');
                } catch (err) {
                    hideLoading();
                    showAlert(err.message, 'error');
                }
            }
        });
    });

    document.getElementById('btnLoadActivityHistory')?.addEventListener('click', loadMyActivityHistory);
    document.getElementById('btnCancelQueue')?.addEventListener('click', cancelMyQueue);
    document.getElementById('btnCheckEligibility')?.addEventListener('click', checkMyEligibility);
    document.getElementById('btnCheckOverEligibility')?.addEventListener('click', checkMyOverEligibility);
    document.getElementById('btnCheckResignStatus')?.addEventListener('click', checkMyResignStatus);
    document.getElementById('btnGoToPetitionLoan')?.addEventListener('click', () => goToPetitionFromFail('2'));
    document.getElementById('btnGoToPetitionOverLoan')?.addEventListener('click', () => goToPetitionFromFail('2'));
    document.getElementById('btnBackToLoanStep1')?.addEventListener('click', initUserLoanPage);
    document.getElementById('btnBackToOverLoanStep1')?.addEventListener('click', initOverLoanPage);
    document.getElementById('btnConfirmSubmitLoan')?.addEventListener('click', confirmSubmitLoan);

    document.getElementById('btnBackToDashboard1')?.addEventListener('click', () => showSection('userDashboardSection'));
    document.getElementById('btnBackToDashboard2')?.addEventListener('click', () => showSection('userDashboardSection'));
    
    document.getElementById('btnCloseActivityModal')?.addEventListener('click', () => document.getElementById('activityHistoryModal').style.display='none');
    document.getElementById('btnCloseRoundModal')?.addEventListener('click', () => document.getElementById('roundSelectionModal').style.display='none');

    document.getElementById('cardLiving')?.addEventListener('click', () => toggleLoanOption('living'));
    document.getElementById('cardTuition')?.addEventListener('click', () => toggleLoanOption('tuition'));
    document.getElementById('inputTuition')?.addEventListener('input', calcLoanTotal);
    document.getElementById('overType')?.addEventListener('change', toggleOverTuition);

    document.getElementById('cardResignMove')?.addEventListener('click', function() { selectResignType('move_uni', this); });
    document.getElementById('cardResignChange')?.addEventListener('click', function() { selectResignType('change_fac', this); });
    document.getElementById('cardResignQuit')?.addEventListener('click', function() { selectResignType('quit', this); });
});

document.body.addEventListener('click', function(e) {
    const btnOpenRound = e.target.closest('.btn-open-round');
    const btnRegisterAct = e.target.closest('.btn-register-act');
    const btnBookQueue = e.target.closest('.btn-book-queue');

    if (btnOpenRound) {
        openRoundSelectionModal(btnOpenRound.getAttribute('data-date'));
    } else if (btnRegisterAct) {
        registerActivity(btnRegisterAct.getAttribute('data-id'), btnRegisterAct);
    } else if (btnBookQueue) {
        if(!btnBookQueue.disabled) bookQ(btnBookQueue.getAttribute('data-id'));
    }
});

const autoLogout = () => {
    let timer;
    const resetTimer = () => {
        clearTimeout(timer);
        timer = setTimeout(() => {
            sessionStorage.clear();
            Swal.fire({
                icon: 'warning',
                title: 'ระยะเวลาการเชื่อมต่อระบบสิ้นสุดลง',
                text: 'ระบบได้ทำการออกจากระบบโดยอัตโนมัติ เนื่องจากไม่มีการทำรายการใดๆ เกินระยะเวลาที่กำหนด (10 นาที)',
                confirmButtonText: 'กลับสู่หน้าเข้าสู่ระบบ',
                allowOutsideClick: false
            }).then(() => {
                window.top.location.href = "index.html";
            });
        }, 10 * 60 * 1000);
    };
    window.onload = resetTimer; 
    document.onmousemove = resetTimer; 
    document.onkeypress = resetTimer; 
    document.ontouchstart = resetTimer; 
    document.onclick = resetTimer; 
    document.onscroll = resetTimer;
};
autoLogout();

async function initTransferPage() {
    document.getElementById('transferStep1').style.display = 'none';
    document.getElementById('transferStep2').style.display = 'none';
    
    showLoading('กำลังตรวจสอบข้อมูลการทำรายการ');
    try {
        const checkRes = await callApi('checkTransferStatus', {
            action: 'checkTransferStatus',
            studentId: currentUser.studentId,
            token: userToken
        });

        hideLoading();

        if (checkRes && checkRes.status === 'submitted') {
            document.getElementById('transferStep2').style.display = 'block';
            
            document.getElementById('transferStep2').innerHTML = `
                <div style="width:80px; height:80px; background:#e8f5e9; color:#2e7d32; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:0 auto 20px auto;">
                    <i class="material-icons" style="font-size:40px;">check_circle</i>
                </div>
                <h3 style="color:#2e7d32;">ท่านได้แจ้งข้อมูลย้ายสถานศึกษาเรียบร้อยแล้ว</h3>
                <p style="color:#666;">ข้อมูลของท่านได้รับการบันทึกเข้าสู่ระบบเมื่อวันที่ <b>${checkRes.info.timestamp || '-'}</b><br>ระบบไม่อนุญาตให้ทำรายการซ้ำ หากต้องการแก้ไขข้อมูลโปรดติดต่อเจ้าหน้าที่</p>
            `;
            return; 
        }


        const confirmTerms = await Swal.fire({
            title: 'ข้อควรทราบก่อนดำเนินการ',
            html: `
                <div style="text-align: left; font-size: 14.5px; line-height: 1.6; background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #dee2e6;">
                    <div style="margin-bottom: 10px;">
                        <span style="color: #1976D2; font-weight: bold; font-size: 15px;">อนุญาตเฉพาะนักศึกษาที่เข้าเงื่อนไข ดังนี้</span><br>
                        ผู้ที่ <b>"เคยศึกษาในระดับอุดมศึกษาจากสถาบันอื่น"</b> แล้วลาออกมาเข้าศึกษาใหม่ที่มหาวิทยาลัยอุบลราชธานี <br><u>และ</u> มีความประสงค์จะ <b>"ขอกู้ยืมเงิน กยศ."</b> เท่านั้น นักศึกษาจะเป็นผู้กู้ยืมรายใหม่ที่มหาวิทยาลัยอุบลราชธานี
                    </div>
                    
                    <div style="background: #fff5f5; padding: 10px; border-radius: 6px; border-left: 4px solid #d32f2f;">
                        <span style="color: #d32f2f; font-weight: bold; font-size: 15px;">⚠️ คำเตือนสำหรับกลุ่มที่ไม่เข้าเงื่อนไข</span><br>
                        นักศึกษากลุ่มอื่นๆ ที่ไม่เข้าเงื่อนไขข้างต้น <b>"ห้ามดำเนินการแจ้งข้อมูลในเมนูนี้เด็ดขาด"</b> เนื่องจากข้อมูลจะถูกบันทึกและส่งผลกระทบต่อสิทธิ์การกู้ยืมเงินของท่านโดยตรง
                    </div>
                </div>
                <p style="color: #555; margin-top: 15px; font-size: 14px;">
                    หากมีข้อสงสัยหรือไม่แน่ใจ กรุณาสอบถามเจ้าหน้าที่ก่อนดำเนินการ<br>
                    <i class="material-icons" style="vertical-align: middle; font-size: 18px;">phone</i> โทร <b>045-353093</b> (ในวันและเวลาราชการ)
                </p>
            `,
            icon: 'info',
            width: 600,
            showCancelButton: true,
            confirmButtonColor: '#2e7d32', 
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'ข้าพเจ้าเข้าเงื่อนไข และยอมรับ',
            cancelButtonText: 'ยกเลิก / ไม่เข้าเงื่อนไข',
            allowOutsideClick: false, 
            allowEscapeKey: false
        });

        if (confirmTerms.isConfirmed) {
            document.getElementById('transferStep1').style.display = 'block';
            document.getElementById('tfName').value = `${currentUser.prefix || ''}${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim();
            document.getElementById('tfIdCard').value = ''; 
        } else {

            showSection('userDashboardSection');
            document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));
            const dashNav = document.getElementById('navUserDashboard');
            if (dashNav) dashNav.classList.add('active');
        }

    } catch (error) {
        hideLoading();
        Swal.fire('ข้อผิดพลาด', 'ไม่สามารถตรวจสอบข้อมูลได้: ' + error.message, 'error');
    }
}

document.getElementById('transferForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const idCard = document.getElementById('tfIdCard').value;
    if (idCard === 'ยังไม่พบข้อมูลในระบบ') {
        return Swal.fire('ไม่สามารถบันทึกได้', 'กรุณาบันทึกข้อมูลทะเบียนประวัติก่อน เพื่อให้ระบบสามารถดึงข้อมูลเลขประจำตัวประชาชนมาดำเนินการได้', 'error');
    }

    const name = document.getElementById('tfName').value;
    const level = document.getElementById('tfLevel').value;
    const year = document.getElementById('tfYear').value;
    const status = document.getElementById('tfStatus').value;
    const instCode = document.getElementById('tfInstCode').value;
    const instName = document.getElementById('tfInstName').value;

    const popupHtml = `
        <div style="text-align:left; font-size:14px; background:#f8f9fa; padding:15px; border-radius:8px; border:1px solid #ddd;">
            <b>เลขบัตร ปชช:</b> ${idCard}<br>
            <b>ชื่อ-สกุล:</b> ${name}<br>
            <b>ระดับการศึกษา:</b> ${level} (ชั้นปีที่ ${year})<br>
            <b>สถานะ:</b> ${status}<br>
            <b>รหัสสถานศึกษา:</b> ${instCode}<br>
            <b>ชื่อสถานศึกษา:</b> ${instName}
        </div>
        <p style="color:#d32f2f; margin-top:15px; font-size:13px; font-weight:bold;">กรุณาตรวจสอบความถูกต้อง หากกดยืนยันแล้วจะไม่สามารถกลับมาแก้ไขได้</p>
    `;

    Swal.fire({
        title: 'ตรวจสอบและยืนยันข้อมูล',
        html: popupHtml,
        icon: 'info',
        showCancelButton: true,
        confirmButtonColor: '#1976D2',
        confirmButtonText: 'ยืนยันการส่งข้อมูล',
        cancelButtonText: 'ยกเลิก'
    }).then(async (result) => {
        if (result.isConfirmed) {
            showLoading('กำลังบันทึกข้อมูลเข้าสู่ระบบ');
            
            try {
                const payload = createSecurePayload({
                    action: 'submitTransferRequest', 
                    idCard: idCard,
                    name: name,
                    level: level,
                    year: year,
                    status: status,
                    instCode: instCode,
                    instName: instName
                });

                const res = await callApi('submitTransferRequest', payload); 
                hideLoading();

                if (res && res.success) {
                    document.getElementById('transferStep1').style.display = 'none';
                    document.getElementById('transferStep2').style.display = 'block';
                } else {
                    Swal.fire('ข้อผิดพลาด', res.message || 'ไม่สามารถบันทึกได้', 'error');
                }
           } catch (err) {
                hideLoading();
                Swal.fire('ข้อผิดพลาด', err.message, 'error');
            }
        }
    });
});

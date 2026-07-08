window.Swal = Swal.mixin({
    confirmButtonText: 'ตกลง',
    cancelButtonText: 'ยกเลิก'
});

function escapeHTML(str) {
    if(typeof str !== 'string') return str;
    return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
    }[tag] || tag));
}

async function getClientIp() {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); 
    try {
        const response = await fetch('https://api.ipify.org?format=json', { signal: controller.signal });
        clearTimeout(timeoutId);
        const data = await response.json();
        return data.ip;
    } catch (e) {
        clearTimeout(timeoutId);
        return "Unknown IP (Blocked/Timeout)"; 
    }
}

function togglePasswordVisibility(inputId, iconElement) {
    const input = document.getElementById(inputId);
    if (!input) return;

    if (input.type === 'password') {
        input.type = 'text';
        iconElement.textContent = 'visibility';
        iconElement.style.color = 'var(--secondary-color)';
    } else {
        input.type = 'password';
        iconElement.textContent = 'visibility_off';
        iconElement.style.color = '#999';
    }
}

function validateThaiIdCard(id) {
    if (id.length !== 13 || !/^\d{13}$/.test(id)) return false;
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        sum += parseFloat(id.charAt(i)) * (13 - i);
    }
    const checkDigit = (11 - (sum % 11)) % 10;
    return checkDigit === parseFloat(id.charAt(12));
}

function showLoading(customMessage) { 
    const defaultMsg = 'ระบบกำลังประมวลผล กรุณารอสักครู่';
    document.getElementById('loaderText').textContent = customMessage || defaultMsg; 
    document.getElementById('customLoader').style.display = 'flex'; 
}

function hideLoading() { 
    document.getElementById('customLoader').style.display = 'none'; 
}

function showAlert(message, type = 'success') {
    Swal.fire({
        icon: type,
        title: type === 'success' ? 'สำเร็จ' : 'แจ้งเตือน',
        text: message,
        confirmButtonColor: 'var(--secondary-color)',
        confirmButtonText: 'ตกลง', 
        timer: type === 'success' ? 2000 : undefined
    });
}

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(el => {
        el.classList.remove('active');
        el.style.display = 'none';
    });
    const activeSection = document.getElementById(sectionId);
    activeSection.classList.add('active');
    activeSection.style.display = 'block';
    window.scrollTo(0, 0);
}

document.addEventListener("DOMContentLoaded", () => {

    document.getElementById('showSignup').addEventListener('click', (e) => { 
        e.preventDefault(); 
        document.getElementById('signupForm').reset();
        showSection('signupSection'); 
    });

    document.getElementById('showLogin').addEventListener('click', (e) => { 
        e.preventDefault(); 
        showSection('loginSection'); 
    });

    document.getElementById('showResetPassword').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('resetPasswordForm').reset();
        document.getElementById('resetStep2Area').style.display = 'none';
        document.getElementById('btnVerifyIdentity').style.display = 'block';
        document.getElementById('resetStudentId').readOnly = false;
        document.getElementById('resetPhone').readOnly = false;
        document.getElementById('resetIdCard').readOnly = false; 
        document.getElementById('resetStudentId').parentElement.style.opacity = '1';
        document.getElementById('resetPhone').parentElement.style.opacity = '1';
        document.getElementById('resetIdCard').parentElement.style.opacity = '1'; 
        showSection('resetPasswordSection');
    });

    document.getElementById('backToLoginFromReset').addEventListener('click', (e) => {
        e.preventDefault();
        showSection('loginSection');
    });

    document.getElementById('toggleSignupPassword').addEventListener('click', function () {
        const passwordInput = document.getElementById('signupPassword');
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        this.textContent = type === 'password' ? 'visibility_off' : 'visibility';
    });
    
    document.getElementById('toggleLoginPassBtn').addEventListener('click', function() {
        const loginPassInput = document.getElementById('loginPassword');
        const loginEyeIcon = document.getElementById('loginEyeIcon');
        if (loginPassInput.type === 'password') {
            loginPassInput.type = 'text'; 
            loginEyeIcon.textContent = 'visibility'; 
        } else {
            loginPassInput.type = 'password'; 
            loginEyeIcon.textContent = 'visibility_off'; 
        }
    });

    document.getElementById('btnToggleResetNew')?.addEventListener('click', function() {
        togglePasswordVisibility('resetNewPassword', this);
    });

    document.getElementById('btnToggleResetConfirm')?.addEventListener('click', function() {
        togglePasswordVisibility('resetConfirmPassword', this);
    });


    document.getElementById('btnVerifyIdentity').addEventListener('click', async () => {
        const studentId = document.getElementById('resetStudentId').value.trim();
        const phone = document.getElementById('resetPhone').value.trim();
        const idCard = document.getElementById('resetIdCard').value.trim();
        
        if (!studentId || !phone || !idCard) {
            showAlert('กรุณากรอกข้อมูลให้ครบถ้วน', 'warning'); return;
        }
        if (!validateThaiIdCard(idCard)) {
            showAlert('เลขประจำตัวประชาชนไม่ถูกต้องตามรูปแบบ', 'warning'); return;
        }
        if (!/^\d{10}$/.test(phone)) {
            showAlert('หมายเลขโทรศัพท์ต้องเป็นตัวเลข 10 หลัก', 'warning'); return;
        }
        
        const btnVerify = document.getElementById('btnVerifyIdentity');
        btnVerify.disabled = true;
        showLoading('ระบบกำลังตรวจสอบข้อมูลยืนยันตัวตน');
        
        try {
            const res = await callApi("verifyUserForReset", { studentId, phone, idCard });
            hideLoading();
            btnVerify.disabled = false;
            if (res.success) {
                showAlert('ข้อมูลถูกต้อง กรุณาตั้งรหัสผ่านใหม่', 'success');
                document.getElementById('resetStudentId').readOnly = true;
                document.getElementById('resetPhone').readOnly = true;
                document.getElementById('resetIdCard').readOnly = true;
                document.getElementById('resetStudentId').parentElement.style.opacity = '0.7';
                document.getElementById('resetPhone').parentElement.style.opacity = '0.7';
                document.getElementById('resetIdCard').parentElement.style.opacity = '0.7';
                document.getElementById('btnVerifyIdentity').style.display = 'none';
                document.getElementById('resetStep2Area').style.display = 'block';
                document.getElementById('resetNewPassword').required = true;
                document.getElementById('resetConfirmPassword').required = true;
            } else {
                showAlert(res.message, 'error');
            }
        } catch(err) {
            hideLoading(); btnVerify.disabled = false; showAlert(err.message, 'error');
        }
    });

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSubmit = document.getElementById('btnLoginSubmit');
        btnSubmit.disabled = true;
        showLoading('กำลังตรวจสอบข้อมูลการเข้าสู่ระบบ');
        
        const id = document.getElementById('loginStudentId').value.trim();
        const pass = document.getElementById('loginPassword').value;
        
        const clientIp = await getClientIp(); 
        const gpsLocation = await getClientLocation(); 
        
        if (!gpsLocation || gpsLocation.includes("Unknown") || gpsLocation.includes("Not Supported")) {
            hideLoading();
            btnSubmit.disabled = false;
            Swal.fire({
                icon: 'error',
                title: 'ปฏิเสธการเข้าถึง',
                html: 'ระบบไม่สามารถอนุญาตให้เข้าสู่ระบบได้ เนื่องจากไม่พบการอนุญาตให้เข้าถึงข้อมูลตำแหน่งที่ตั้ง (GPS) ของอุปกรณ์<br><br><span style="font-size: 14px; color: #d32f2f;">การตรวจสอบตำแหน่งที่ตั้งเป็นมาตรการด้านความมั่นคงปลอดภัยของระบบ เพื่อยืนยันสิทธิ์การเข้าใช้งาน กรุณาตรวจสอบและอนุญาตการเข้าถึงตำแหน่งที่ตั้งผ่านการตั้งค่าเบราว์เซอร์หรืออุปกรณ์ของท่าน แล้วดำเนินการเข้าสู่ระบบอีกครั้ง</span>',
                confirmButtonText: 'ตกลง',
                confirmButtonColor: '#d32f2f'
            });
            return; 
        }
        
        try {
            const res = await callApi("login", { 
                studentId: id, 
                password: pass, 
                ipAddress: clientIp,
                gpsLocation: gpsLocation 
            });
            
            hideLoading();
            btnSubmit.disabled = false;
            
            if (res.success) {
                sessionStorage.setItem('ubu_student_id', res.user.studentId);
                sessionStorage.setItem('ubu_token', res.user.token);
                sessionStorage.setItem('ubu_role', res.user.role);
                sessionStorage.setItem('ubu_user_data', JSON.stringify(res.user));
                
                Swal.fire({
                    icon: 'success',
                    title: 'เข้าสู่ระบบสำเร็จ',
                    text: 'คลิกปุ่มด้านล่างเพื่อเข้าสู่ระบบ',
                    showConfirmButton: true,
                    confirmButtonText: 'เข้าสู่หน้าหลัก <i class="material-icons" style="vertical-align: middle; font-size: 16px;">arrow_forward</i>',
                    confirmButtonColor: 'var(--secondary-color)',
                    allowOutsideClick: false
                }).then((result) => {
                    if (result.isConfirmed) {
                        window.location.href = res.user.role === 'admin' ? 'View_Admin.html' : 'View_User.html';
                    }
                });
            } else {
                if (res.isSuspended) {
                    let rawReason = res.message || 'บัญชีถูกระงับ';
                    let displayReason = rawReason.replace('[REQ_SURVEY]', '').trim();

                    Swal.fire({
                        icon: 'error',
                        title: 'บัญชีถูกระงับการใช้งานระบบชั่วคราว',
                        html: `
                            <div style="text-align: left; font-size: 15px; margin-top: 10px; background: #fff5f5; border: 1px solid #ffcdd2; padding: 15px; border-radius: 8px;">
                                <p style="margin: 0 0 10px 0; color: #333;">
                                    <b>คำชี้แจง:</b> <span style="color:#d32f2f;">${escapeHTML(displayReason)}</span>
                                </p>
                                <p style="margin: 0; color: #555; font-size: 14px; border-top: 1px dashed #ffcdd2; padding-top: 10px;">
                                    <b>คำแนะนำ:</b> กรุณานำบัตรประจำตัวประชาชนติดต่อสถานศึกษา มหาวิทยาลัยอุบลราชธานี เพื่อดำเนินการตรวจสอบสิทธิ์ต่อไป
                                </p>
                            </div>
                        `,
                        confirmButtonText: 'รับทราบ',
                        confirmButtonColor: '#dc3545'
                    });
                } else if (res.isUnauthorizedAdmin) {
                    Swal.fire({
                        icon: 'warning',
                        title: 'ปฏิเสธการเข้าถึง',
                        text: 'อีเมลของท่านไม่ได้รับอนุญาตให้ใช้สิทธิ์แอดมิน',
                        confirmButtonText: 'ปิดหน้าต่าง'
                    });
                } else if (res.isQueueFull) { 
                    let timerInterval;
                    Swal.fire({
                        icon: 'warning',
                        title: 'แจ้งเตือนสถานะการเข้าใช้งาน',
                        html: `
                            <div style="text-align: left; font-size: 15px; margin-top: 10px; background: #fff8e1; border: 1px solid #ffe0b2; padding: 15px; border-radius: 8px;">
                                <p style="margin: 0 0 10px 0; color: #d32f2f; font-weight: bold; font-size: 16px;">
                                    ขออภัยในความไม่สะดวก
                                </p>
                                <p style="margin: 0 0 10px 0; color: #333; line-height: 1.6;">
                                    เนื่องจากขณะนี้มีผู้เข้าใช้บริการเป็นจำนวนมาก กรุณารอเข้าใช้งานอีกครั้งในเวลาถัดไป
                                </p>
                                <p style="margin: 0 0 10px 0; color: #555; font-size: 14px; border-top: 1px dashed #ffe0b2; padding-top: 10px; line-height: 1.6;">
                                    <b>หมายเหตุ:</b> ระบบจะทำการประมวลผลข้อมูลในช่วงเวลา 00.00 - 01.00 น. โปรดหลีกเลี่ยงการใช้งานช่วงเวลาดังกล่าว
                                </p>
                                <div style="text-align: center; margin-top: 15px; font-size: 16px; font-weight: bold; color: #e65100;">
                                    <i class="material-icons" style="vertical-align: middle; font-size: 18px;">schedule</i>
                                    กรุณารอ <span id="countdown_timer" style="font-size: 20px;">20</span> วินาที
                                </div>
                            </div>
                        `,
                        confirmButtonText: 'กรุณารอ 20 วินาที',
                        confirmButtonColor: '#9e9e9e', 
                        allowOutsideClick: false, 
                        allowEscapeKey: false, 
                        didOpen: () => {
                            Swal.disableButtons(); 
                            let timeLeft = 20;
                            const timerDisplay = document.getElementById('countdown_timer');
                            
                            timerInterval = setInterval(() => {
                                timeLeft -= 1;
                                if (timerDisplay) timerDisplay.textContent = timeLeft;
                                Swal.getConfirmButton().textContent = `กรุณารอ ${timeLeft} วินาที`;
                                
                                if (timeLeft <= 0) {
                                    clearInterval(timerInterval);
                                    Swal.enableButtons(); // ปลดล็อกปุ่ม
                                    Swal.getConfirmButton().textContent = 'รับทราบ / ลองใหม่อีกครั้ง';
                                    Swal.getConfirmButton().style.backgroundColor = '#f57c00'; 
                                }
                            }, 1000);
                        },
                        willClose: () => {
                            clearInterval(timerInterval);
                        }
                    });
                } else {
                    showAlert(res.message, 'error');
                }
            }
        } catch(err) {
            hideLoading(); btnSubmit.disabled = false; showAlert(err.message, 'error');
        }
    });


    document.getElementById('signupForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSubmit = document.getElementById('btnSignupSubmit');
        btnSubmit.disabled = true;
        showLoading('กำลังบันทึกข้อมูลลงทะเบียน');
        const data = {
            studentId: document.getElementById('signupStudentId').value.trim(),
            password: document.getElementById('signupPassword').value,
            prefix: document.getElementById('signupPrefix').value,
            firstName: document.getElementById('signupFirstName').value.trim(),
            lastName: document.getElementById('signupLastName').value.trim(),
            gmail: document.getElementById('signupGmail').value.trim(),
            faculty: document.getElementById('signupFaculty').value,
            phone: document.getElementById('signupPhone').value.trim()
        };
        try {
            const res = await callApi("signUp", { userData: data });
            hideLoading();
            btnSubmit.disabled = false;
            if (res.success) {
                Swal.fire({
                    icon: 'success', title: 'ลงทะเบียนสำเร็จ',
                    text: 'กรุณาเข้าสู่ระบบด้วยรหัสนักศึกษาและรหัสผ่านที่คุณตั้งไว้',
                    confirmButtonColor: 'var(--secondary-color)'
                }).then(() => {
                    document.getElementById('signupForm').reset();
                    document.getElementById('loginStudentId').value = data.studentId;
                    showSection('loginSection');
                });
            } else {
                showAlert(res.message, 'error');
            }
        } catch(err) {
            hideLoading(); btnSubmit.disabled = false; showAlert(err.message, 'error'); 
        }
    });

    document.getElementById('resetPasswordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        if (document.getElementById('resetStep2Area').style.display === 'none') {
            document.getElementById('btnVerifyIdentity').click(); return;
        }
        const studentId = document.getElementById('resetStudentId').value;
        const phone = document.getElementById('resetPhone').value;
        const idCard = document.getElementById('resetIdCard').value; 
        const newPass = document.getElementById('resetNewPassword').value;
        const confirmPass = document.getElementById('resetConfirmPassword').value;
        if (newPass !== confirmPass) { showAlert('รหัสผ่านยืนยันไม่ตรงกัน', 'error'); return; }
        if (newPass.length < 6) { showAlert('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร', 'warning'); return; }
        
        const btnReset = document.getElementById('btnResetSubmit');
        btnReset.disabled = true;
        showLoading('กำลังเปลี่ยนรหัสผ่าน');
        try {
            const res = await callApi("resetPassword", { studentId, phone, idCard, newPassword: newPass });
            hideLoading();
            btnReset.disabled = false;
            if (res.success) {
                Swal.fire({ icon: 'success', title: 'เปลี่ยนรหัสผ่านสำเร็จ', confirmButtonColor: 'var(--secondary-color)' })
                .then(() => {
                    document.getElementById('resetPasswordForm').reset();
                    document.getElementById('loginStudentId').value = studentId;
                    showSection('loginSection');
                });
            } else {
                showAlert(res.message, 'error');
            }
        } catch(err) {
            hideLoading(); btnReset.disabled = false; showAlert(err.message, 'error');
        }
    });

});

document.addEventListener("DOMContentLoaded", async () => {
    sessionStorage.removeItem('ubu_student_id');
    sessionStorage.removeItem('ubu_token');
    sessionStorage.removeItem('ubu_role');
    sessionStorage.removeItem('ubu_user_data');

    try {
        const res = await callApi("getPublicAnnouncement", {});
        
        if(res && res.success && res.data && res.data.length > 0) {
            
            let combinedHtml = ''; 
            const accentColors = ['#2563eb', '#ea580c', '#16a34a', '#dc2626', '#7c3aed'];
            
            res.data.forEach((ann, index) => {
                const safeTitle = escapeHTML(ann.title);
                const safeContent = escapeHTML(ann.content);
                const formattedContent = safeContent.replace(/\n/g, '<br>');
                const themeColor = accentColors[index % accentColors.length];
                
                combinedHtml += `
                    <div style="background: #ffffff; border-radius: 16px; padding: 20px 24px; margin-bottom: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border-left: 6px solid ${themeColor}; text-align: left; position: relative; transition: transform 0.2s ease;">
                        
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; gap: 10px;">
                            <h4 style="margin: 0; color: #1e293b; font-size: 18px; font-weight: 600; line-height: 1.4;">
                                ${safeTitle}
                            </h4>
                            <span style="background: ${themeColor}15; color: ${themeColor}; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; white-space: nowrap; display: inline-flex; align-items: center; gap: 4px;">
                                <i class="material-icons" style="font-size: 14px;">fiber_new</i> ข่าวใหม่
                            </span>
                        </div>
                        
                        <div style="font-size: 15px; color: #475569; line-height: 1.6; padding-top: 12px; border-top: 1px dashed #e2e8f0;">
                            ${formattedContent}
                        </div>
                    </div>
                `;
            });
            
            const finalHtml = `
                <div style="background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%); padding: 20px 20px; text-align: center; position: relative; overflow: hidden;">
                    <div style="position: absolute; top: -50px; right: -50px; width: 150px; height: 150px; background: rgba(255,255,255,0.05); border-radius: 50%;"></div>
                    <div style="position: absolute; bottom: -30px; left: -30px; width: 100px; height: 100px; background: rgba(255,255,255,0.05); border-radius: 50%;"></div>
                    
                    <div style="position: relative; z-index: 1;">
                        <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 700; color: #ffffff;">ประกาศที่สำคัญจากระบบ</h2>
                        <div style="height: 1px; background: rgba(255,255,255,0.3); width: 85%; margin: 0 auto 8px auto;"></div>
                        <p style="margin: 0; font-size: 13px; color: #ffffff;">กองทุนเงินให้กู้ยืมเพื่อการศึกษา มหาวิทยาลัยอุบลราชธานี</p>
                    </div>
                </div>
                <div class="swal-custom-scroll" style="background: #f8fafc; padding: 24px; max-height: 55vh; overflow-y: auto;">
                    ${combinedHtml}
                </div>
            `;

            const style = document.createElement('style');
            style.innerHTML = `
                .swal-ann-popup { border-radius: 24px !important; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.3) !important; border: none !important; font-family: 'Sarabun', sans-serif !important;}
                .swal-ann-btn { font-family: 'Sarabun', sans-serif !important; font-size: 16px !important; padding: 12px 40px !important; border-radius: 50px !important; font-weight: 600 !important; background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%) !important; box-shadow: 0 4px 15px rgba(30, 60, 114, 0.3) !important; margin-bottom: 24px !important; transition: all 0.3s ease !important; border: none !important;}
                .swal-ann-btn:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(30, 60, 114, 0.45) !important; }
                .swal2-html-container { margin: 0 !important; overflow: hidden !important; padding: 0 !important; }
                .swal-custom-scroll::-webkit-scrollbar { width: 6px; }
                .swal-custom-scroll::-webkit-scrollbar-track { background: #f8fafc; }
                .swal-custom-scroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .swal-custom-scroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
            `;
            document.head.appendChild(style);

            Swal.fire({
                html: finalHtml,
                showConfirmButton: true,
                confirmButtonText: '<div style="display: flex; align-items: center; gap: 8px;"><i class="material-icons" style="font-size: 20px;"></i>ปิดประกาศนี้</div>',
                allowOutsideClick: false, 
                width: '800px', 
                padding: '0', 
                background: '#fff',
                customClass: {
                    popup: 'swal-ann-popup',
                    confirmButton: 'swal-ann-btn'
                }
            });
        }
    } catch(e) {
        console.error("ไม่สามารถดึงประกาศได้:", e);
    }
});

async function getClientLocation() {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve("Not Supported");
            return;
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve(`${position.coords.latitude},${position.coords.longitude}`);
            },
            (error) => {
                let errMsg = "Unknown Error";
                if (error.code === 1) errMsg = "Permission Denied";
                if (error.code === 2) errMsg = "Position Unavailable";
                if (error.code === 3) errMsg = "Timeout";
                resolve(`Unknown (${errMsg})`);
            },
            { timeout: 7000, maximumAge: 0 }
        );
    });
}

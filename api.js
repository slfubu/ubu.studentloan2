const API_URL = "https://script.google.com/a/macros/ubu.ac.th/s/AKfycbxe_0lkOk80Bp08ld3fEo_2jmywS-YFiSYNcpYjN6yZXZv75ogukq7emUrirRgQnjx7/exec";

async function callApi(action, payload) {
    const loader = document.getElementById('customLoader');
    if (loader) loader.style.display = 'flex';
    
    const requestData = { action: action, ...payload };
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            redirect: 'follow', 
            headers: {
                "Content-Type": "text/plain;charset=utf-8", 
            },
            body: JSON.stringify(requestData)
        });
        
        const result = await response.json();
        if (loader) loader.style.display = 'none';
        return result;
    } catch (error) {
        if (loader) loader.style.display = 'none';
        console.error("API Error:", error);
        Swal.fire({
            icon: 'error',
            title: 'ข้อผิดพลาดเครือข่าย',
            text: 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง'
        });
        throw error;
    }
}

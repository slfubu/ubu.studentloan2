const WEB_APP_URL = "https://script.google.com/a/macros/ubu.ac.th/s/AKfycbxe_0lkOk80Bp08ld3fEo_2jmywS-YFiSYNcpYjN6yZXZv75ogukq7emUrirRgQnjx7/exec";

async function callApi(actionName, payloadData = {}) {
    try {
        const response = await fetch(WEB_APP_URL, {
            method: 'POST',
            redirect: 'follow',
            headers: {
                "Content-Type": "text/plain;charset=utf-8"
            },
            body: JSON.stringify({ 
                action: actionName, 
                ...payloadData 
            })
        });

        if (!response.ok) {
            if (response.status === 401 || response.status === 403) {
                sessionStorage.clear();
                window.location.replace("index.html");
                return;
            }
            throw new Error(`HTTP Error: ${response.status}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error("API Error:", error);
        throw new Error("ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ ลองใหม่อีกครั้ง");
    }
}

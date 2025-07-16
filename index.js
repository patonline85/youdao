// index.js - Backend Server (với chức năng gỡ lỗi nâng cao)

// --- Import các thư viện cần thiết ---
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const crypto = require('crypto');
const path = require('path');

// --- CẤU HÌNH ---
const app = express();
const PORT = process.env.PORT || 3000;

const APP_KEY = process.env.YOUDAO_APP_KEY || 'YOUR_APP_KEY';
const APP_SECRET = process.env.YOUDAO_APP_SECRET || 'YOUR_APP_SECRET';

// --- Middleware ---
app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname)));
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- Hàm tiện ích của Youdao (ĐÃ CẬP NHẬT) ---
function truncate(q) {
    // Loại bỏ các ký tự xuống dòng có thể gây ra lỗi chữ ký
    const cleanQ = q.replace(/(\r\n|\n|\r)/gm, " ");
    const len = cleanQ.length;
    if (len <= 20) return cleanQ;
    return cleanQ.substring(0, 10) + len + cleanQ.substring(len - 10, len);
}

// --- API Endpoint cho việc dịch thuật ---
app.post('/api/translate', async (req, res) => {
    try {
        const { text: query } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'Vui lòng cung cấp văn bản cần dịch.' });
        }
        
        // --- BẮT ĐẦU GỠ LỖI ---
        console.log("\n--- Bắt đầu phiên gỡ lỗi dịch thuật ---");
        console.log(`Thời gian: ${new Date().toISOString()}`);
        
        const maskedAppKey = APP_KEY.substring(0, 4) + '...' + APP_KEY.slice(-4);
        const maskedAppSecret = APP_SECRET.substring(0, 4) + '...' + APP_SECRET.slice(-4);
        console.log(`APP_KEY đang dùng: ${maskedAppKey} (Độ dài: ${APP_KEY.length})`);
        console.log(`APP_SECRET đang dùng: ${maskedAppSecret} (Độ dài: ${APP_SECRET.length})`);

        if (APP_KEY === 'YOUR_APP_KEY' || APP_SECRET === 'YOUR_APP_SECRET') {
             return res.status(500).json({ error: 'Lỗi: APP_KEY và APP_SECRET chưa được cấu hình trên server.' });
        }

        const salt = crypto.randomUUID();
        const curtime = Math.round(new Date().getTime() / 1000);
        const from = 'zh-CHS';
        const to = 'vi';
        
        const truncatedQuery = truncate(query);
        const signStr = APP_KEY + truncatedQuery + salt + curtime + APP_SECRET;
        const sign = crypto.createHash('sha256').update(signStr).digest('hex');

        // --- GHI LOG CHI TIẾT HƠN ---
        console.log("--- Chi tiết tạo chữ ký ---");
        console.log(`Input (truncated): ${truncatedQuery}`);
        console.log(`Salt: ${salt}`);
        console.log(`Curtime: ${curtime}`);
        console.log(`Chuỗi để băm (signStr): ${signStr}`);
        console.log(`Chữ ký đã tạo (sign): ${sign}`);
        console.log("--------------------------");
        // --- KẾT THÚC GỠ LỖI ---

        const params = new URLSearchParams();
        params.append('q', query);
        params.append('from', from);
        params.append('to', to);
        params.append('appKey', APP_KEY);
        params.append('salt', salt);
        params.append('sign', sign);
        params.append('signType', 'v3');
        params.append('curtime', curtime);

        const youdaoResponse = await axios.post('https://openapi.youdao.com/api', params, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        res.json(youdaoResponse.data);

    } catch (error) {
        console.error('Error in /api/translate:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Đã có lỗi xảy ra phía máy chủ.' });
    }
});

// --- Khởi động máy chủ ---
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

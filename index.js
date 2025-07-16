// index.js - Backend Server (với chức năng gỡ lỗi)

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

// --- Hàm tiện ích của Youdao ---
function truncate(q) {
    const len = q.length;
    if (len <= 20) return q;
    return q.substring(0, 10) + len + q.substring(len - 10, len);
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
        console.log(`Đã nhận được văn bản: "${query}"`);

        // In ra các biến môi trường để kiểm tra (che một phần cho an toàn)
        const maskedAppKey = APP_KEY.substring(0, 4) + '...' + APP_KEY.slice(-4);
        const maskedAppSecret = APP_SECRET.substring(0, 4) + '...' + APP_SECRET.slice(-4);
        console.log(`APP_KEY đang dùng: ${maskedAppKey} (Độ dài: ${APP_KEY.length})`);
        console.log(`APP_SECRET đang dùng: ${maskedAppSecret} (Độ dài: ${APP_SECRET.length})`);
        // --- KẾT THÚC GỠ LỖI ---

        if (APP_KEY === 'YOUR_APP_KEY' || APP_SECRET === 'YOUR_APP_SECRET') {
             return res.status(500).json({ error: 'Lỗi: APP_KEY và APP_SECRET chưa được cấu hình trên server.' });
        }

        const salt = crypto.randomUUID();
        const curtime = Math.round(new Date().getTime() / 1000);
        const from = 'zh-CHS';
        const to = 'vi';
        
        const signStr = APP_KEY + truncate(query) + salt + curtime + APP_SECRET;
        const sign = crypto.createHash('sha256').update(signStr).digest('hex');

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

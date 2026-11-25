const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const app = express();

const PORT = process.env.PORT || 3000;

// Cấu hình CORS để Frontend ở domain khác có thể gọi API
app.use(cors({
    origin: '*' // Cho phép tất cả các domain gọi (bạn có thể giới hạn lại sau)
}));
app.use(express.json());

// ==========================================
// DATABASE GIẢ LẬP (Lưu trong bộ nhớ)
// Lưu ý: Khi Render khởi động lại, dữ liệu sẽ mất.
// Để lưu vĩnh viễn, cần thay bằng MongoDB/Redis.
// ==========================================
let keyDatabase = {}; 

function generateKey() {
    return 'BON-' + crypto.randomBytes(2).toString('hex').toUpperCase() + 
           '-' + crypto.randomBytes(2).toString('hex').toUpperCase() + 
           '-' + crypto.randomBytes(2).toString('hex').toUpperCase();
}

// ==========================================
// API DÀNH CHO FRONTEND (CHECK KEY)
// ==========================================
app.get('/check-key', (req, res) => {
    const { key, device_id, check_only } = req.query;

    if (!key) {
        return res.status(400).json({ status: false, message: 'Thiếu key!' });
    }

    const keyData = keyDatabase[key];

    if (!keyData) {
        return res.json({ status: false, message: 'Key không tồn tại!' });
    }

    if (Date.now() > keyData.expiry) {
        return res.json({ status: false, message: 'Key đã hết hạn!' });
    }

    // Logic khóa thiết bị
    if (!keyData.deviceId) {
        if (check_only) {
            return res.json({ status: true, message: 'Key hợp lệ (chưa gán thiết bị)' });
        }
        keyData.deviceId = device_id;
        return res.json({ status: true, message: 'Kích hoạt thành công!', expiry: keyData.expiry });
    }

    if (keyData.deviceId !== device_id) {
        return res.json({ status: false, message: 'Key này đã được sử dụng trên thiết bị khác!' });
    }

    return res.json({ status: true, message: 'Key hợp lệ', expiry: keyData.expiry });
});

// ==========================================
// API DÀNH CHO ADMIN
// ==========================================
app.post('/admin/create-key', (req, res) => {
    const { duration } = req.body;
    const newKey = generateKey();
    const expiry = Date.now() + (duration * 24 * 60 * 60 * 1000);
    
    keyDatabase[newKey] = {
        expiry: expiry,
        deviceId: null,
        durationText: duration + ' ngày'
    };

    res.json({ key: newKey, expiry: expiry });
});

app.get('/admin/keys', (req, res) => {
    res.json(keyDatabase);
});

app.delete('/admin/delete-key', (req, res) => {
    const { key } = req.query;
    if (keyDatabase[key]) {
        delete keyDatabase[key];
        res.json({ status: true, message: 'Đã xóa' });
    } else {
        res.json({ status: false, message: 'Không tìm thấy key' });
    }
});

// Route mặc định để kiểm tra server sống
app.get('/', (req, res) => {
    res.send('BON TOOL API SERVER IS RUNNING');
});

app.listen(PORT, () => {
    console.log(`Server đang chạy tại port ${PORT}`);
});

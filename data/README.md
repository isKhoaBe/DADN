```md
# FE-DADN-252

Dự án Smart Home Dashboard theo mô hình fullstack.

## Cấu trúc thư mục

```text
FE-DADN-252/
├─ frontend/
├─ backend/
├─ .gitignore
└─ README.md
```

## Công nghệ sử dụng

- Frontend: React, TypeScript, Vite
- Backend: Node.js, Express

## Những gì đã làm

### Frontend
- Giữ nguyên giao diện dashboard chính
- Kết nối frontend với backend qua API
- Hiển thị dữ liệu môi trường, logs, sensors và actuators
- Gửi lệnh điều khiển thiết bị từ giao diện

### Backend
- Tạo server Node.js + Express trong thư mục `backend/`
- Tổ chức code theo cấu trúc `config`, `controllers`, `routes`, `services`, `utils`, `data`
- Thêm mock mode để chạy không cần PostgreSQL
- Tạo mock data cho cảm biến, thiết bị, cảnh báo và lịch sử hoạt động
- Tạo các API chính cho dashboard, readings, devices, commands và alerts
- Chuẩn bị sẵn hướng tích hợp PostgreSQL và Adafruit về sau

## Cách chạy

### Chạy backend

```bash
cd backend
npm install
node src/server.js
```

Backend chạy tại:
- `http://localhost:4000`

### Chạy frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend chạy tại:
- `http://localhost:3000`

## Ghi chú

- Nhánh `main` ban đầu chỉ có frontend
- Nhánh này đã thêm `backend/`
- Backend hiện hỗ trợ mock data để demo khi chưa có PostgreSQL hoặc Adafruit
```

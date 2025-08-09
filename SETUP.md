# 🚀 Panduan Setup HidupKu Health Chatbot

## 📋 Prerequisites

Sebelum menjalankan aplikasi, pastikan Anda telah menginstall:

- **Node.js** (versi 16 atau lebih baru)
- **MySQL** (versi 8.0 atau lebih baru)
- **Git** (untuk clone repository)

## 🔧 Langkah Setup

### 1. Clone Repository
```bash
git clone <repository-url>
cd bismillah_gemastik
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Database

#### A. Pastikan MySQL Server Berjalan
- Windows: Start MySQL service dari Services
- macOS: `brew services start mysql`
- Linux: `sudo systemctl start mysql`

#### B. Jalankan Setup Database
```bash
node setup-database.js
```

Script ini akan:
- ✅ Membuat database `hidupku_db` jika belum ada
- ✅ Menjalankan schema database
- ✅ Menambahkan kategori obat default

### 4. Konfigurasi Environment

File `config.env` sudah dibuat dengan konfigurasi default. Jika perlu, sesuaikan:

```env
# Database Configuration
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=hidupku_db
MYSQL_PORT=3306

# JWT Configuration
JWT_SECRET=hidupku_jwt_secret_key_2024_development_only_change_in_production

# Gemini AI Configuration (Opsional)
GEMINI_API_KEY=your_gemini_api_key_here
```

### 5. Jalankan Aplikasi
```bash
node server.js
```

Aplikasi akan berjalan di: **http://localhost:3000**

## 🎯 Fitur yang Tersedia

### ✅ Sudah Berfungsi:
- ✅ Login & Register dengan JWT
- ✅ Chat interface (UI)
- ✅ Pencarian obat (dengan fallback)
- ✅ Pencarian fasilitas kesehatan
- ✅ Responsive design
- ✅ Error handling yang baik

### 🔄 Perlu Setup Tambahan:
- 🔄 Gemini AI API key (untuk chat AI)
- 🔄 Database obat (opsional, sudah ada fallback)

## 🐛 Troubleshooting

### Error: "JWT_SECRET must have a value"
- ✅ **Sudah diperbaiki** - File `config.env` sudah dibuat

### Error: "Database connection failed"
- Pastikan MySQL server berjalan
- Periksa konfigurasi di `config.env`
- Jalankan `node setup-database.js`

### Error: "404 Medicine categories"
- ✅ **Sudah diperbaiki** - Endpoint mengembalikan kategori default

### Error: "500 Login/Register"
- ✅ **Sudah diperbaiki** - JWT_SECRET sudah dikonfigurasi

## 📱 Cara Penggunaan

1. **Buka browser**: http://localhost:3000
2. **Register** akun baru atau **Login**
3. **Mulai konsultasi** di menu Chat
4. **Cari obat** di menu Medicine
5. **Cari fasilitas** di menu Facilities

## 🔒 Security Features

- ✅ JWT Authentication
- ✅ Password hashing dengan bcrypt
- ✅ Helmet security headers
- ✅ CORS protection
- ✅ Input validation
- ✅ SQL injection protection

## 📊 Database Schema

Aplikasi menggunakan tabel:
- `users` - Data pengguna
- `chat_sessions` - Sesi chat
- `chat_messages` - Pesan dalam chat
- `medicines` - Data obat
- `medicine_categories` - Kategori obat
- `health_facilities` - Fasilitas kesehatan

## 🚀 Deployment

Untuk deployment ke production:
1. Ganti `JWT_SECRET` dengan key yang aman
2. Setup database production
3. Konfigurasi environment variables
4. Setup reverse proxy (nginx)
5. Gunakan PM2 untuk process management

## 📞 Support

Jika mengalami masalah:
1. Periksa console browser (F12)
2. Periksa console server
3. Pastikan semua prerequisites terpenuhi
4. Jalankan `node setup-database.js` ulang

---

**🎉 Selamat! Aplikasi HidupKu siap digunakan!** 
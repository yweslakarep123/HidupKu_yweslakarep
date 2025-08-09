# HidupKu - Konsultan Kesehatan AI

Platform kesehatan digital revolusioner yang menghubungkan Anda dengan konsultan kesehatan otomatis 24/7. Dapatkan saran kesehatan personal, informasi obat, dan pencarian fasilitas kesehatan dalam satu aplikasi.

## 🚀 Fitur Utama

- **AI Konsultan Cerdas**: Konsultan kesehatan otomatis berbasis AI dengan analisis gejala dan diagnosis awal
- **Database Obat Terlengkap**: Informasi obat komprehensif dengan efek samping dan interaksi
- **Pencarian Fasilitas Kesehatan**: Direktori fasilitas kesehatan terdekat dengan informasi lengkap
- **Riwayat Konsultasi**: Sistem penyimpanan riwayat konsultasi untuk pelacakan kesehatan
- **Keamanan & Privasi**: Enkripsi data end-to-end dengan standar kesehatan

## 🛠️ Teknologi

- **Backend**: Node.js, Express.js
- **Database**: MySQL (Google Cloud SQL)
- **AI**: Google Gemini 2.5 Flash
- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Deployment**: Vercel
- **Maps API**: OpenStreetMap (Nominatim + Overpass API) - **GRATIS**

## 📋 Prerequisites

Sebelum deployment, pastikan Anda memiliki:

1. **Google Cloud Platform Account** dengan Cloud SQL
2. **Vercel Account** untuk deployment
3. **Google AI Studio** untuk Gemini API Key
4. **OpenStreetMap** - Tidak memerlukan API key (gratis)

## 🚀 Deployment Guide

### 1. Setup Google Cloud SQL

1. **Buat Instance MySQL di Google Cloud SQL**:
   ```bash
   # Buka Google Cloud Console
   # Buat instance MySQL dengan konfigurasi:
   # - Version: MySQL 8.0
   # - Machine Type: db-f1-micro (untuk testing)
   # - Storage: 10GB
   # - Network: Public IP (untuk akses dari Vercel)
   ```

2. **Buat Database**:
   ```sql
   CREATE DATABASE hidupku_db;
   ```

3. **Jalankan Schema**:
   ```bash
   # Upload dan jalankan file database-schema.sql di Google Cloud SQL
   ```

4. **Buat User Database**:
   ```sql
   CREATE USER 'hidupku_user'@'%' IDENTIFIED BY 'YOUR_STRONG_PASSWORD';
   GRANT ALL PRIVILEGES ON hidupku_db.* TO 'hidupku_user'@'%';
   FLUSH PRIVILEGES;
   ```

### 2. Setup API Keys

1. **Google AI Studio (Gemini API)**:
   - Kunjungi https://makersuite.google.com/app/apikey
   - Buat API Key baru
   - Salin API Key

2. **OpenStreetMap (Gratis - Tidak memerlukan API Key)**:
   - Menggunakan Nominatim untuk geocoding
   - Menggunakan Overpass API untuk pencarian fasilitas
   - Tidak ada batasan rate limit yang ketat
   - Data yang sangat lengkap dan akurat

### 3. Setup Environment Variables di Vercel

Setelah deploy ke Vercel, tambahkan environment variables berikut:

```bash
# Database Configuration
MYSQL_HOST=YOUR_GOOGLE_CLOUD_SQL_IP
MYSQL_USER=hidupku_user
MYSQL_PASSWORD=YOUR_DATABASE_PASSWORD
MYSQL_DATABASE=hidupku_db
MYSQL_PORT=3306

# AI Configuration
GEMINI_API_KEY=YOUR_GEMINI_API_KEY

# OpenStreetMap Configuration (Free)
OSM_USER_AGENT=HidupKu-HealthApp/1.0

# JWT Secret (Ganti dengan secret yang kuat)
JWT_SECRET=YOUR_STRONG_JWT_SECRET_KEY

# Server Configuration
NODE_ENV=production
```

### 4. Deploy ke Vercel

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login ke Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy**:
   ```bash
   vercel --prod
   ```

4. **Setup Environment Variables di Vercel Dashboard**:
   - Buka project di Vercel Dashboard
   - Masuk ke Settings > Environment Variables
   - Tambahkan semua environment variables yang diperlukan

### 5. Konfigurasi Network

1. **Allow Vercel IPs di Google Cloud SQL**:
   - Buka Google Cloud SQL Console
   - Masuk ke Networking
   - Tambahkan authorized networks:
     - `0.0.0.0/0` (untuk testing) atau
     - IP ranges Vercel (untuk production)

## 🔧 Local Development

1. **Clone Repository**:
   ```bash
   git clone <repository-url>
   cd bismillah_gemastik
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Setup Environment**:
   ```bash
   # Copy config.env.example ke config.env
   cp config.env.example config.env
   # Edit config.env dengan kredensial lokal
   ```

4. **Setup Database Lokal**:
   ```bash
   # Jalankan MySQL lokal
   # Import database-schema.sql
   ```

5. **Jalankan Aplikasi**:
   ```bash
   npm start
   ```

## 🌍 OpenStreetMap Integration

### Fitur yang Tersedia:
- **Geocoding**: Konversi alamat ke koordinat menggunakan Nominatim
- **Reverse Geocoding**: Konversi koordinat ke alamat
- **Pencarian Fasilitas**: Mencari rumah sakit, apotek, klinik menggunakan Overpass API
- **Navigasi**: Link ke Google Maps, OpenStreetMap, dan Waze

### Keunggulan OpenStreetMap:
- ✅ **Gratis** - Tidak ada biaya API
- ✅ **Data Lengkap** - Cakupan global yang sangat baik
- ✅ **Open Source** - Transparan dan dapat dipercaya
- ✅ **Rate Limit Longgar** - Tidak ada batasan ketat
- ✅ **Komunitas Aktif** - Data selalu diperbarui

### API Endpoints:
- `/api/facilities/search` - Google Places API (original)
- `/api/facilities/search-osm` - OpenStreetMap API (gratis)

## 🔒 Security Features

- **JWT Authentication** untuk keamanan user
- **Input Validation** untuk mencegah injection
- **Rate Limiting** untuk mencegah abuse
- **CORS Protection** untuk keamanan cross-origin
- **Environment Variables** untuk kredensial sensitif

## 📊 Performance

- **Response Time**: < 2 detik untuk pencarian fasilitas
- **Uptime**: 99.9% dengan Vercel
- **Database**: Optimized queries dengan indexing
- **Caching**: Implementasi caching untuk performa optimal

## 🤝 Contributing

1. Fork repository
2. Buat feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buat Pull Request

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

## 📞 Support

Jika Anda mengalami masalah atau memiliki pertanyaan:

1. **Buat Issue** di GitHub repository
2. **Email**: support@hidupku.com
3. **Telegram**: @hidupku_support

## 🎯 Roadmap

- [ ] Integrasi dengan BPJS API
- [ ] Fitur telemedicine
- [ ] Mobile app (React Native)
- [ ] AI diagnosis yang lebih akurat
- [ ] Integrasi dengan wearable devices

---

**HidupKu** - Kesehatan Digital untuk Semua 🇮🇩 
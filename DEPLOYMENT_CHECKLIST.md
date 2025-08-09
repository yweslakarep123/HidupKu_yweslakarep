# Deployment Checklist - HidupKu

## ✅ Pre-Deployment Checklist

### 1. File Cleanup
- [x] Hapus `public/script-clean.js` (tidak digunakan)
- [x] Hapus `start.bat` (tidak diperlukan untuk production)
- [x] Hapus `QUICK_START.md` (dokumentasi development)
- [x] Hapus `content-moderation-service.js` (tidak digunakan)

### 2. Security Updates
- [x] Update `config.env` dengan placeholder yang aman
- [x] Buat `config.env.example` untuk template
- [x] Update `.gitignore` untuk melindungi file sensitif
- [x] Update `database-schema.sql` untuk Google Cloud SQL

### 3. Configuration Files
- [x] Update `vercel.json` untuk deployment optimal
- [x] Update `README.md` dengan instruksi deployment lengkap
- [x] Update `package.json` (sudah sesuai)

## 🚀 Google Cloud SQL Setup

### 1. Create MySQL Instance
- [ ] Buka Google Cloud Console
- [ ] Buat instance MySQL 8.0
- [ ] Set machine type: db-f1-micro (testing) atau db-n1-standard-1 (production)
- [ ] Set storage: 10GB minimum
- [ ] Enable public IP
- [ ] Set authorized networks (0.0.0.0/0 untuk testing)

### 2. Database Setup
- [ ] Buat database `hidupku_db`
- [ ] Buat user `hidupku_user` dengan strong password
- [ ] Grant privileges ke database
- [ ] Import `database-schema.sql`

### 3. Network Configuration
- [ ] Allow Vercel IPs di authorized networks
- [ ] Test koneksi dari local machine

## 🔑 API Keys Setup

### 1. Google AI Studio (Gemini)
- [ ] Kunjungi https://makersuite.google.com/app/apikey
- [ ] Buat API Key baru
- [ ] Enable Gemini API
- [ ] Set restrictions (optional)

### 2. Google Places API
- [ ] Kunjungi Google Cloud Console
- [ ] Enable Places API
- [ ] Buat API Key
- [ ] Set restrictions untuk domain Vercel

## 📦 Vercel Deployment

### 1. Initial Setup
- [ ] Install Vercel CLI: `npm install -g vercel`
- [ ] Login ke Vercel: `vercel login`
- [ ] Deploy: `vercel --prod`

### 2. Environment Variables
- [ ] Set `MYSQL_HOST` (Google Cloud SQL IP)
- [ ] Set `MYSQL_USER` (hidupku_user)
- [ ] Set `MYSQL_PASSWORD` (strong password)
- [ ] Set `MYSQL_DATABASE` (hidupku_db)
- [ ] Set `MYSQL_PORT` (3306)
- [ ] Set `GEMINI_API_KEY` (dari Google AI Studio)
- [ ] Set `GOOGLE_PLACES_API_KEY` (dari Google Cloud Console)
- [ ] Set `JWT_SECRET` (strong secret key)
- [ ] Set `NODE_ENV` (production)

### 3. Domain Configuration
- [ ] Set custom domain (optional)
- [ ] Configure SSL (otomatis di Vercel)
- [ ] Test HTTPS access

## 🧪 Testing Checklist

### 1. Database Connection
- [ ] Test koneksi database dari Vercel
- [ ] Verifikasi tabel sudah terbuat
- [ ] Test CRUD operations

### 2. API Endpoints
- [ ] Test `/api/register` (user registration)
- [ ] Test `/api/login` (user login)
- [ ] Test `/api/chat` (AI chat)
- [ ] Test `/api/medicines/search` (medicine search)
- [ ] Test `/api/facilities/search` (facilities search)

### 3. Frontend Functionality
- [ ] Test user registration/login
- [ ] Test AI chat functionality
- [ ] Test medicine search
- [ ] Test facilities search
- [ ] Test chat history
- [ ] Test responsive design

### 4. Security Tests
- [ ] Test JWT authentication
- [ ] Test password encryption
- [ ] Test CORS configuration
- [ ] Test input validation

## 🔒 Security Verification

### 1. Environment Variables
- [ ] Pastikan `config.env` tidak ter-commit ke repository
- [ ] Verifikasi semua API keys aman
- [ ] Pastikan JWT secret kuat

### 2. Database Security
- [ ] User database memiliki minimal privileges
- [ ] Password database kuat
- [ ] Network access dibatasi

### 3. API Security
- [ ] API keys memiliki restrictions
- [ ] CORS dikonfigurasi dengan benar
- [ ] Rate limiting diterapkan (optional)

## 📊 Performance Optimization

### 1. Database
- [ ] Indexes sudah dibuat
- [ ] Query optimization
- [ ] Connection pooling

### 2. Frontend
- [ ] Minify CSS/JS (otomatis di Vercel)
- [ ] Optimize images
- [ ] Enable caching

### 3. Backend
- [ ] Error handling
- [ ] Logging
- [ ] Monitoring

## 🚨 Post-Deployment

### 1. Monitoring
- [ ] Setup error tracking
- [ ] Monitor database performance
- [ ] Monitor API usage

### 2. Backup
- [ ] Setup database backup
- [ ] Backup environment variables
- [ ] Document deployment process

### 3. Documentation
- [ ] Update README dengan URL production
- [ ] Document troubleshooting steps
- [ ] Create maintenance guide

## 📞 Support

Jika ada masalah selama deployment:
1. Periksa Vercel build logs
2. Periksa Google Cloud SQL logs
3. Test koneksi database
4. Verifikasi environment variables
5. Periksa API key restrictions

---

**Status**: ✅ Ready for Deployment
**Last Updated**: $(date)
**Deployment Target**: Vercel + Google Cloud SQL 
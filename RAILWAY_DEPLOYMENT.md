# 🚀 Railway Deployment Guide - HidupKu

## 📋 Prerequisites

- GitHub account
- Railway account (https://railway.app/)
- Google AI Studio account (untuk Gemini API)
- Google Cloud Console account (untuk Places API)

## 🔧 Setup Railway

### 1. Daftar Railway
1. Kunjungi https://railway.app/
2. Klik "Start for Free"
3. Login dengan GitHub

### 2. Install Railway CLI
```bash
npm install -g @railway/cli
railway login
```

## 🗄️ Setup Database MySQL

### 1. Buat Project Baru
1. Di Railway dashboard, klik "New Project"
2. Pilih "Deploy from GitHub repo"
3. Pilih repository Anda

### 2. Tambah Database MySQL
1. Di project, klik "New"
2. Pilih "Database" > "MySQL"
3. Tunggu database terbuat (2-3 menit)

### 3. Dapatkan Connection Info
1. Klik database yang dibuat
2. Klik tab "Connect"
3. Catat informasi berikut:
   ```
   Host: [RAILWAY_DB_HOST]
   Port: 3306
   Database: [RAILWAY_DB_NAME]
   Username: [RAILWAY_DB_USER]
   Password: [RAILWAY_DB_PASSWORD]
   ```

### 4. Import Database Schema
```bash
# Link ke project Railway
railway link

# Connect ke database
railway connect

# Di dalam MySQL, import schema
source database-schema.sql;
SHOW TABLES;
exit;
```

## 🌐 Deploy Website

### 1. Push ke GitHub
```bash
git add .
git commit -m "Ready for Railway deployment"
git push origin main
```

### 2. Deploy di Railway
1. Di Railway dashboard, klik "New"
2. Pilih "GitHub Repo"
3. Pilih repository Anda
4. Railway akan auto-deploy

### 3. Setup Environment Variables
1. Klik project website
2. Klik tab "Variables"
3. Tambahkan variables berikut:

```
MYSQL_HOST=[RAILWAY_DB_HOST]
MYSQL_USER=[RAILWAY_DB_USER]
MYSQL_PASSWORD=[RAILWAY_DB_PASSWORD]
MYSQL_DATABASE=[RAILWAY_DB_NAME]
MYSQL_PORT=3306
GEMINI_API_KEY=[YOUR_GEMINI_API_KEY]
GOOGLE_PLACES_API_KEY=[YOUR_PLACES_API_KEY]
JWT_SECRET=[YOUR_STRONG_JWT_SECRET]
NODE_ENV=production
```

## 🔑 Setup API Keys

### 1. Google AI Studio (Gemini)
1. Kunjungi https://makersuite.google.com/app/apikey
2. Buat API Key baru
3. Copy API Key

### 2. Google Places API
1. Buka Google Cloud Console
2. Enable Places API
3. Buat API Key
4. Copy API Key

## 🧪 Testing

### 1. Test Database Connection
```bash
# Connect ke database Railway
railway connect

# Test query
SELECT * FROM users LIMIT 1;
exit;
```

### 2. Test Website
1. Buka URL Railway yang diberikan
2. Test registration/login
3. Test AI chat
4. Test medicine search
5. Test facilities search

## 🔧 Troubleshooting

### Database Connection Error
```bash
# Cek environment variables
railway variables

# Test connection
railway connect
```

### Build Error
```bash
# Cek logs
railway logs

# Redeploy
railway up
```

### API Error
- Pastikan API keys sudah benar
- Pastikan API sudah di-enable
- Cek billing di Google Cloud

## 📊 Monitoring

### 1. Railway Dashboard
- Monitor resource usage
- Cek logs real-time
- Monitor database performance

### 2. Custom Domain (Optional)
1. Di Railway dashboard
2. Klik "Settings" > "Domains"
3. Tambahkan custom domain

## 💰 Pricing

Railway memberikan $5 credit gratis per bulan:
- Database MySQL: ~$1-2/bulan
- Web service: ~$1-2/bulan
- Total: ~$2-4/bulan (dalam free tier)

## 🚨 Important Notes

1. **Environment Variables**: Jangan commit file `config.env`
2. **Database Backup**: Railway otomatis backup database
3. **SSL**: Railway menyediakan SSL otomatis
4. **Scaling**: Railway auto-scales berdasarkan traffic

## 📞 Support

Jika ada masalah:
1. Cek Railway logs
2. Cek environment variables
3. Test database connection
4. Hubungi Railway support

---

**Status**: ✅ Ready for Railway Deployment
**Last Updated**: $(date)
**Deployment Target**: Railway (Website + MySQL Database) 
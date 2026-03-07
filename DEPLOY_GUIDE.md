# 🚀 DEPLOY RAPIDO

## 1. RENDER (Backend)
- Vai su dashboard.render.com
- New Web Service → Connect GitHub repo
- Branch: main
- Root Directory: backend
- Build Command: npm install && npx prisma generate && npm run build
- Start Command: npm start
- Environment: Copia da backend/.env

## 2. SUPABASE (Database) ✅ FATTO
- Progetto: https://sezvlnxoafyjxidlpwuy.supabase.co
- Password: fudpe6-jastuf-nupzeT

## 3. VERCEL (Frontend) ✅ GIA' DEPLOYATO
- URL: https://mechmind-os.vercel.app

## DATABASE URL (da mettere su Render):
```
postgresql://postgres:fudpe6-jastuf-nupzeT@db.sezvlnxoafyjxidlpwuy.supabase.co:5432/postgres?sslmode=require
```

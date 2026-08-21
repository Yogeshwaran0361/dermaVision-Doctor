# 🩺 DermaVision AI — Doctor Web Portal Dashboard (Production Deployment)

This is the official, production-ready Doctor Web Portal repository for **DermaVision AI**.

---

## 🚀 Quick Start (Local Setup)

### 1. Prerequisites
- **Node.js**: `v18.0.0` or higher (`v20.x` recommended)
- **NPM**: `v9.x` or higher

### 2. Installation
```bash
npm install --legacy-peer-deps
```

### 3. Environment Configuration
Copy `.env.example` to `.env` and fill in your production credentials:
```bash
cp .env.example .env
```

### 4. Local Development Server
```bash
npm run dev
```

### 5. Production Build
```bash
npm run build
```

---

## ☁️ Deployment Instructions for Vercel

1. **Push to GitHub**: Push this clean repository (`DermaVision_Doctor_Vercel`) to GitHub.
2. **Import to Vercel**: Connect your GitHub repository to Vercel.
3. **Build Settings**:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Node.js Version**: `20`
4. **Environment Variables**: Add all environment variables listed in `.env.example` under **Vercel Project Settings $\rightarrow$ Environment Variables**.
5. **Firebase Authorized Domains**: Add your Vercel deployment domain (e.g. `your-doctor-app.vercel.app`) in **Firebase Console $\rightarrow$ Authentication $\rightarrow$ Settings $\rightarrow$ Authorized Domains**.

---

## 🛠️ Features & Architecture
- **Real-Time Doctor Workspace**: Live patient appointment queues via Firebase Firestore `onSnapshot`.
- **Tele-Health & Google Meet Integration**: Direct video call link creation and patient signaling.
- **Prescription System**: Digital prescription notes & case file reviews.
- **Messaging Engine**: Direct doctor-patient tele-consultation chat thread.

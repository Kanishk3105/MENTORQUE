# 🚀 Mentorque

> AI-Powered Mentoring Call Scheduling Platform

![License](https://img.shields.io/badge/License-MIT-green)
![Node.js](https://img.shields.io/badge/Node.js-20.x-success)
![React](https://img.shields.io/badge/React-18-blue)
![Express](https://img.shields.io/badge/Express.js-black)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-blue)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED)
![Status](https://img.shields.io/badge/Status-Completed-success)

---

## 📖 Overview

Mentorque is a full-stack AI-powered mentoring platform that intelligently matches mentors and users based on:

- 🎯 Call Type
- 🧠 AI Recommendation Engine
- 🏷️ Skills & Tags
- 📅 Weekly Availability
- 🤝 Availability Overlap Detection

Administrators can manage mentors and users, generate AI recommendations, schedule meetings, and analyze platform activity through an interactive dashboard.

---

## ✨ Features

- 🔐 JWT Authentication
- 👥 Role Based Access (Admin / Mentor / User)
- 🤖 AI Mentor Recommendation Engine
- 📅 Smart Availability Matching
- 📊 Analytics Dashboard
- 📈 Booking Statistics
- 🏷️ Tag & Profile Management
- 📧 Meeting Scheduling
- 🌍 Timezone Support
- 🐳 Docker Support

---

# 🏗️ System Architecture

```text
                React + Vite
                     │
          REST API (JWT Auth)
                     │
              Express.js Server
                     │
                 Prisma ORM
                     │
          PostgreSQL (Neon Database)
                     │
        AI Recommendation Engine
```

---

# 🛠️ Tech Stack

| Frontend | Backend | Database | ORM | Authentication | AI | DevOps |
|-----------|----------|----------|-----|----------------|----|---------|
| React + Vite | Express.js | PostgreSQL (Neon) | Prisma | JWT | Gemini API | Docker |

---

# 📂 Project Structure

```text
MENTORQUE/
│
├── Mentorque/
│   ├── backend/
│   ├── frontend/
│   ├── docker-compose.yml
│   ├── README.md
│   └── SETUP.md
│
└── README.md
```

---

# ⚙️ Installation

Clone the repository

```bash
git clone https://github.com/Kanishk3105/MENTORQUE.git
cd MENTORQUE/Mentorque
```

Install Backend

```bash
cd backend
npm install
```

Install Frontend

```bash
cd ../frontend
npm install
```

---

# 🗄️ Configure Database

Create a `.env` file inside `backend`

```env
DATABASE_URL=your_neon_database_url

JWT_SECRET=your_secret

JWT_EXPIRES_IN=7d

ADMIN_EMAIL=admin@mentorque.dev

ADMIN_PASSWORD=admin1234
```

---

# 🚀 Run Project

Backend

```bash
cd backend
npm run dev
```

Frontend

```bash
cd frontend
npm run dev
```

---

# 🌱 Seed Database

```bash
cd backend

npm run db:generate

npm run db:push

npm run db:seed
```

---

# 📊 Dashboard

The Admin Dashboard provides:

- Mentor Recommendations
- Analytics
- Weekly Availability
- Booking Management
- User & Mentor Profiles
- Team Schedules

---

# 📸 Screenshots

> Add screenshots here

- Login Page
- Dashboard
- Analytics
- Recommendations
- Scheduling

---

# 📦 Deployment

Frontend

- Vercel

Backend

- Render / Railway

Database

- Neon PostgreSQL

---

# 👨‍💻 Author

**Kanishk Chhachra**

- GitHub: https://github.com/Kanishk3105
- LinkedIn: https://linkedin.com/in/kanishk-chhachra

---

# ⭐ Support

If you found this project useful,

⭐ Star the repository

🍴 Fork the repository

📢 Share it with others

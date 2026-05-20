# TaskFlow — Team Task Manager

A full-stack project management application with **role-based access control**, Kanban boards, and a real-time dashboard.

## 🚀 Live Demo
- **Frontend**: [https://your-vercel-url.vercel.app](https://your-vercel-url.vercel.app)
- **Backend API**: [https://your-railway-url.railway.app](https://your-railway-url.railway.app)

## ✨ Features

| Feature | Details |
|---|---|
| 🔐 Authentication | JWT-based signup/login with bcrypt password hashing |
| 👑 Role-Based Access | Admin / Member roles at both global and project level |
| 📁 Projects | Create, update, delete projects with color themes |
| 👥 Team Management | Add/remove members, search users by name/email |
| ✅ Tasks | Create, assign, prioritize, and track tasks |
| 📋 Kanban Board | Visual board with To Do / In Progress / Done columns |
| 📊 Dashboard | Stats cards, my tasks, overdue detection |
| 🔍 Filters | Filter tasks by status, priority, project, or overdue |

## 🛠 Tech Stack

**Frontend**: React + Vite, React Router, Axios, react-hot-toast  
**Backend**: Node.js + Express  
**Database**: PostgreSQL (Railway)  
**Auth**: JWT + bcryptjs  
**Deployment**: Railway (backend + DB) + Vercel (frontend)

## 📂 Project Structure
```
ethara/
├── backend/          # Express REST API
│   ├── src/
│   │   ├── config/   # DB connection
│   │   ├── controllers/
│   │   ├── middleware/  # auth, RBAC, error handler
│   │   ├── routes/
│   │   └── db/       # Schema SQL + migrations
│   └── package.json
└── frontend/         # React + Vite SPA
    ├── src/
    │   ├── api/      # Axios API calls
    │   ├── components/  # Sidebar, Modal, TaskCard
    │   ├── context/  # AuthContext
    │   └── pages/    # Dashboard, Projects, Tasks, Users
    └── package.json
```

## 🏃 Running Locally

### Prerequisites
- Node.js 18+
- PostgreSQL database

### Backend Setup
```bash
cd backend
npm install
cp .env.example .env
# Fill in DATABASE_URL, JWT_SECRET in .env
npm run dev
```

### Frontend Setup
```bash
cd frontend
npm install
# .env already has VITE_API_URL=http://localhost:5000/api
npm run dev
```

## 🌐 Deployment (Railway)

### Backend
1. Push code to GitHub
2. Create new Railway project → Deploy from GitHub
3. Add PostgreSQL service to Railway
4. Set environment variables:
   - `DATABASE_URL` (auto-set by Railway PostgreSQL)
   - `JWT_SECRET` (generate a strong secret)
   - `CORS_ORIGIN` (your Vercel frontend URL)
   - `NODE_ENV=production`

### Frontend (Vercel)
1. Import GitHub repo in Vercel
2. Set root directory to `frontend`
3. Set `VITE_API_URL` to your Railway backend URL + `/api`

## 🔒 Role-Based Access Control

| Action | Admin | Member |
|---|---|---|
| Create/delete project | ✅ | ❌ |
| Add/remove team members | ✅ | ❌ |
| Create/delete tasks | ✅ | ❌ |
| Update task status | ✅ | ✅ (own/member) |
| View dashboard | ✅ | ✅ |
| Manage user roles | ✅ | ❌ |

## 📡 API Endpoints

```
POST   /api/auth/signup         Register user
POST   /api/auth/login          Login
GET    /api/auth/me             Current user

GET    /api/projects            List my projects
POST   /api/projects            Create project (admin)
GET    /api/projects/:id        Project details + members
PUT    /api/projects/:id        Update project
DELETE /api/projects/:id        Delete project
POST   /api/projects/:id/members    Add member
DELETE /api/projects/:id/members/:userId  Remove member

GET    /api/tasks               All tasks (filterable)
GET    /api/tasks/dashboard     Dashboard stats
POST   /api/tasks               Create task (admin)
GET    /api/tasks/:id           Task detail
PUT    /api/tasks/:id           Update task
PATCH  /api/tasks/:id/status    Update status only
DELETE /api/tasks/:id           Delete task

GET    /api/users               List all users (admin)
GET    /api/users/search        Search users
PUT    /api/users/:id/role      Update role (admin)
```

## 🎬 Demo Credentials
- **Admin**: admin@taskflow.com / admin123
- **Member**: member@taskflow.com / member123

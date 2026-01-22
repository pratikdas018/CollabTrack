# 🚀 CollabTrack

**CollabTrack** is a real-time group project collaboration platform built for **CSE students** to manage tasks, track individual contributions, sync GitHub commits, and avoid last-minute project chaos.

It solves the most common group project problems:
> “Who did what?”  
> “Why didn’t you push code?”  
> “We’re running out of time!”

---

## ✨ Features

### 🔐 Authentication & Roles
- Secure JWT-based authentication
- Role-based access:
  - **Owner (Team Lead)**
  - **Member**
  - **Viewer (optional)**

---

### 📁 Project Management
- Create and manage multiple projects
- Invite team members
- Attach GitHub repository to a project
- Project-level deadlines

---

### ✅ Real-Time Task Board
- Kanban-style board:
  - **To Do**
  - **Doing**
  - **Done**
- Create tasks with deadlines
- Assign tasks to members
- Real-time task updates across all users

---

### 👤 Task Ownership & Accountability
- Clear task assignment
- Member-wise task tracking
- Task activity timeline:
  - Created
  - Assigned
  - Status changed
  - Completed

---

### 🔗 GitHub Commit Sync
- Sync commits from public GitHub repositories
- Track:
  - Commit count per member
  - Latest commits in real time
- Contribution chart auto-updates after sync
- Eliminates false contribution claims

---

### 📊 Contribution Analytics
- Visual contribution breakdown per member
- Commit-based contribution percentage
- Member activity overview

---

### ⚡ Real-Time Updates
- Live task creation and movement
- Instant activity logs
- Powered by **Socket.io**
- No page refresh required

---

### ⏰ Deadline Risk Alerts
- Detect tasks close to deadlines
- Highlight overdue tasks
- Project risk indication when deadlines approach

---

## 🧠 Why CollabTrack?
- Designed specifically for **college group projects**
- Prevents last-day panic
- Encourages fair contribution
- Mimics industry tools like Jira & GitHub Projects
- Resume and interview friendly

---

## 🛠 Tech Stack

### Frontend
- React (Vite)
- Tailwind CSS
- Socket.io Client
- Chart.js / Recharts

### Backend
- Node.js
- Express.js
- MongoDB + Mongoose
- Socket.io
- JWT Authentication
- GitHub REST API
- Node-cron

### Deployment
- Frontend: Vercel
- Backend: Render
- Database: MongoDB Atlas

---


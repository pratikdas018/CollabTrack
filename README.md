# 🚀 CollabTrack

> A modern project collaboration and task management platform built with React and Node.js

[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3+-38B2AC.svg)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage](#usage)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

CollabTrack is a comprehensive project management solution designed to streamline team collaboration, task tracking, and project monitoring. With real-time notifications, GitHub integration, and an intuitive task board interface, teams can stay organized and productive.

## ✨ Features

### Core Features
- 🔐 **Authentication & Authorization** - Secure user authentication with Passport.js
- 📊 **Project Management** - Create, manage, and track multiple projects
- ✅ **Task Board** - Kanban-style task management with drag-and-drop
- 👥 **Team Collaboration** - Member management and role assignment
- 🔔 **Real-time Notifications** - Stay updated with project activities
- 🌙 **Dark Mode** - Toggle between light and dark themes
- 📱 **Responsive Design** - Works seamlessly on all devices

### Advanced Features
- 🔗 **GitHub Integration** - Webhook support for commit tracking
- 📈 **Activity Tracking** - Monitor project progress and team activities
- 🎨 **Customizable UI** - Tailwind CSS for modern, customizable design
- ⚡ **Fast & Efficient** - Built with Vite for optimal performance
- 🛡️ **Error Handling** - Comprehensive error boundaries and validation

## 🛠️ Tech Stack

### Frontend
- **React 18+** - UI library
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **React Router** - Client-side routing
- **Context API** - State management

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Passport.js** - Authentication middleware
- **Mongoose** - ODM for MongoDB

### DevOps & Tools
- **Vercel** - Frontend deployment
- **ESLint** - Code linting
- **PostCSS** - CSS processing
- **Git** - Version control

## 📁 Project Structure

```
group-project/
├── client/                    # Frontend application
│   ├── public/               # Static assets
│   │   ├── logo.jpeg
│   │   └── vite.svg
│   ├── src/
│   │   ├── assets/          # Images and icons
│   │   ├── components/      # Reusable React components
│   │   │   ├── ErrorBoundary.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── MembersTab.jsx
│   │   │   ├── NotificationDropdown.jsx
│   │   │   ├── TaskBoard.jsx
│   │   │   ├── useDarkMode.jsx
│   │   │   └── useTheme.jsx
│   │   ├── context/         # React Context providers
│   │   │   └── AuthContext.jsx
│   │   ├── pages/           # Page components
│   │   │   ├── CreateProject.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── LandingPage.jsx
│   │   │   └── MyTasks.jsx
│   │   ├── services/        # API service layer
│   │   │   └── api.js
│   │   ├── App.jsx          # Main app component
│   │   ├── main.jsx         # Entry point
│   │   └── index.css        # Global styles
│   ├── package.json
│   └── vite.config.js
│
└── server/                   # Backend application
    ├── config/              # Configuration files
    │   ├── db.js           # Database configuration
    │   └── passport.js     # Passport authentication config
    ├── controllers/         # Route controllers
    │   ├── authMiddleware.js
    │   ├── notificationController.js
    │   ├── projectController.js
    │   └── webhookController.js
    ├── middleware/          # Custom middleware
    │   └── authMiddleware.js
    ├── models/              # Mongoose models
    │   ├── Commit.js
    │   ├── Notification.js
    │   ├── Project.js
    │   ├── Task.js
    │   └── User.js
    ├── routes/              # API routes
    │   ├── authRoutes.js
    │   ├── notificationRoutes.js
    │   ├── projectRoutes.js
    │   └── webhookRoutes.js
    ├── server.js            # Server entry point
    └── package.json
```

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **MongoDB** (local or Atlas)
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/collabtrack.git
   cd collabtrack
   ```

2. **Install server dependencies**
   ```bash
   cd server
   npm install
   ```

3. **Install client dependencies**
   ```bash
   cd ../client
   npm install
   ```

### Configuration

#### Server Configuration

Create a `.env` file in the `server` directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/collabtrack
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/collabtrack

# Authentication
SESSION_SECRET=your-secret-key-here
JWT_SECRET=your-jwt-secret-here

# GitHub OAuth (if using)
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-client-secret
GITHUB_CALLBACK_URL=http://localhost:5000/auth/github/callback

# CORS
CLIENT_URL=http://localhost:5173
```

#### Client Configuration

Create a `.env` file in the `client` directory:

```env
# API Configuration
VITE_API_URL=http://localhost:5000/api
VITE_SERVER_URL=http://localhost:5000
```

## 💻 Usage

### Development Mode

1. **Start the backend server**
   ```bash
   cd server
   npm run dev
   ```
   The server will run on `http://localhost:5000`

2. **Start the frontend development server**
   ```bash
   cd client
   npm run dev
   ```
   The client will run on `http://localhost:5173`

3. **Access the application**
   Open your browser and navigate to `http://localhost:5173`

### Production Build

1. **Build the client**
   ```bash
   cd client
   npm run build
   ```

2. **Start the production server**
   ```bash
   cd server
   npm start
   ```

## 📡 API Documentation

### Authentication Endpoints

```
POST   /api/auth/register     - Register new user
POST   /api/auth/login        - Login user
GET    /api/auth/logout       - Logout user
GET    /api/auth/user         - Get current user
```

### Project Endpoints

```
GET    /api/projects          - Get all projects
POST   /api/projects          - Create new project
GET    /api/projects/:id      - Get project by ID
PUT    /api/projects/:id      - Update project
DELETE /api/projects/:id      - Delete project
POST   /api/projects/:id/members - Add member to project
```

### Task Endpoints

```
GET    /api/tasks             - Get all tasks
POST   /api/tasks             - Create new task
PUT    /api/tasks/:id         - Update task
DELETE /api/tasks/:id         - Delete task
```

### Notification Endpoints

```
GET    /api/notifications     - Get user notifications
PUT    /api/notifications/:id/read - Mark notification as read
DELETE /api/notifications/:id - Delete notification
```

### Webhook Endpoints

```
POST   /api/webhooks/github   - GitHub webhook handler
```

## 🔧 Available Scripts

### Client Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run lint         # Run ESLint
```

### Server Scripts

```bash
npm start            # Start production server
npm run dev          # Start development server with nodemon
npm test             # Run tests
```

## 🎨 Features in Detail

### Task Board
- Drag-and-drop functionality for task management
- Status-based columns (To Do, In Progress, Done)
- Task assignment and priority levels
- Due date tracking

### Notifications
- Real-time updates on project activities
- Sound notifications (optional)
- Mark as read/unread functionality
- Notification history

### Dark Mode
- System preference detection
- Manual toggle
- Persistent theme selection
- Smooth transitions

### GitHub Integration
- Automatic commit tracking via webhooks
- Project activity timeline
- Developer contribution metrics

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Coding Standards

- Follow ESLint configuration
- Write meaningful commit messages
- Add comments for complex logic
- Update documentation as needed

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- Your Name - [GitHub Profile](https://github.com/pratikdas018)

## 🙏 Acknowledgments

- React team for the amazing library
- Tailwind CSS for the utility-first CSS framework
- MongoDB team for the excellent database
- All contributors who help improve this project

## 📞 Support

For support, email pratikdassonu@gmail.com or join our Slack channel.

## 🗺️ Roadmap

- [ ] Real-time collaboration features
- [ ] Calendar integration
- [ ] Advanced analytics dashboard
- [ ] Mobile application
- [ ] Slack/Discord integration
- [ ] Time tracking functionality
- [ ] File attachment support
- [ ] Advanced search and filters

---

Made with ❤️ by the CollabTrack Team

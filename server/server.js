const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const passport = require('passport');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const connectDB = require('./config/db');

// Load Config
dotenv.config();

// Passport Config
require('./config/passport');

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
app.set('CLIENT_URL', CLIENT_URL); // Make available to routes

// Middleware
app.use(cors({
  origin: CLIENT_URL,
  credentials: true
}));
app.use(express.json()); // Parse JSON bodies

// Session Middleware (Required for Passport)
app.use(session({
  secret: 'secret_key_change_this',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    mongoOptions: { family: 4 } // Force IPv4 to prevent SSL 80 errors
  })
}));

// Passport Middleware
app.use(passport.initialize());
app.use(passport.session());

// Socket.io Setup
const io = new Server(server, {
  cors: {
    origin: CLIENT_URL, // Your Vite Frontend URL
    methods: ["GET", "POST"]
  }
});

// Socket Logic
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Frontend joins a specific project room
  socket.on('join-project', (projectId) => {
    socket.join(projectId);
    console.log(`Socket ${socket.id} joined project ${projectId}`);
  });

  // Frontend joins their own user room for personal notifications
  socket.on('join-user', (userId) => {
    socket.join(userId);
  });

  socket.on('disconnect', () => console.log('Client disconnected'));
});

// Make io accessible in Controllers
app.set('io', io);

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/projects', require('./routes/projectRoutes'));
app.use('/api/webhooks', require('./routes/webhookRoutes'));

const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
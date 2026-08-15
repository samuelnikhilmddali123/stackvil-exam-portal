require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const swaggerUi = require('swagger-ui-express');

const connectDB = require('./config/db');
const swaggerSpecs = require('./config/swagger');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');
const { apiLimiter } = require('./middleware/rateLimiter');

// Import routes
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const examRoutes = require('./routes/examRoutes');
const candidateRoutes = require('./routes/candidateRoutes');
const proctorRoutes = require('./routes/proctorRoutes');
const reportRoutes = require('./routes/reportRoutes');

// Connect to Database
connectDB();

const app = express();

// Trust proxy headers for reverse proxies & Cloudflare tunnels
app.set('trust proxy', 1);

// Set explicit Permissions-Policy for camera, microphone, and display-capture
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=*, microphone=*, display-capture=*');
  next();
});


// Security Headers with updated Content Security Policy for Cloudflare Insights, Monaco Editor & WebRTC/Fonts
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "'unsafe-eval'",
          "blob:",
          "https://static.cloudflareinsights.com",
          "https://cdn.jsdelivr.net"
        ],
        scriptSrcElem: [
          "'self'",
          "'unsafe-inline'",
          "https://static.cloudflareinsights.com",
          "https://cdn.jsdelivr.net"
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
          "https://cdn.jsdelivr.net"
        ],
        styleSrcElem: [
          "'self'",
          "'unsafe-inline'",
          "https://fonts.googleapis.com",
          "https://cdn.jsdelivr.net"
        ],
        workerSrc: [
          "'self'",
          "blob:"
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "data:"
        ],
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https:"
        ],
        connectSrc: [
          "'self'",
          "https:",
          "wss:",
          "ws:"
        ],
        mediaSrc: [
          "'self'",
          "blob:",
          "data:"
        ]
      }
    }
  })
);

// Enable CORS
const allowedOrigins = [
  'https://entrance.stackvil.com',
  'http://entrance.stackvil.com',
  'https://stackvil-exam-portal.vercel.app',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin) return callback(null, true);
    
    const normalized = origin.trim().replace(/\/$/, '');
    const isLocalhost = normalized.includes('localhost') || normalized.includes('127.0.0.1');
    const isStackvilDomain = normalized.endsWith('stackvil.com') || normalized === 'https://stackvil.com';
    const isVercelDomain = normalized.endsWith('.vercel.app');
    const isCloudflareTunnel = normalized.endsWith('.trycloudflare.com');
    const isExplicitAllowed = allowedOrigins.some((o) => o.replace(/\/$/, '') === normalized);

    if (isExplicitAllowed || isLocalhost || isStackvilDomain || isVercelDomain || isCloudflareTunnel) {
      return callback(null, true);
    }
    
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['*'],
  optionsSuccessStatus: 200,
};

// Global CORS response header fallback middleware
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
  } else {
    res.header('Access-Control-Allow-Origin', '*');
  }
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin, Access-Control-Allow-Origin');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));


// Body Parsers
app.use(express.json({ limit: '15mb' })); // Support larger webcam frame payloads
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Apply general API request rate limiter
app.use('/api', apiLimiter);

// Expose uploaded directories statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve compiled frontend static bundle if available
const fs = require('fs');
const frontendDist = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
}

// Swagger Documentation Route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// Mount REST API routers
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/candidate', candidateRoutes);
app.use('/api/proctor', proctorRoutes);
app.use('/api/reports', reportRoutes);

app.get('/api/diag/sockets', (req, res) => {
  const io = req.app.get('io');
  if (!io) return res.json({ error: 'io not initialized' });
  const sockets = [];
  for (const [id, s] of io.sockets.sockets) {
    sockets.push({
      id: s.id,
      candidateId: s.candidateId,
      examId: s.examId,
      rooms: Array.from(s.rooms)
    });
  }
  res.json(sockets);
});

// Base route fallback for Single Page Application frontend routing
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads') || req.path.startsWith('/socket.io')) {
    return next();
  }
  if (fs.existsSync(path.join(frontendDist, 'index.html'))) {
    return res.sendFile(path.join(frontendDist, 'index.html'));
  }
  res.status(200).json({
    message: 'Welcome to Stackvil Online Examination Portal Backend API',
    docs: '/api-docs',
  });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const http = require('http');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      // Return requesting origin to ensure CORS Access-Control-Allow-Origin with credentials works across Cloudflare domains
      return callback(null, origin || '*');
    },
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

app.set('io', io);

const ProctorLog = require('./models/ProctorLog');

io.on('connection', (socket) => {
  // Candidate joins their exam proctor session room
  socket.on('join-exam-session', async ({ examId, candidateId, streamType = 'camera' }) => {
    socket.join(`exam-${examId}`);
    socket.candidateId = candidateId;
    socket.examId = examId;

    try {
      if (candidateId && examId) {
        let proctorLog = await ProctorLog.findOne({ candidate: candidateId, exam: examId });
        if (!proctorLog) {
          await ProctorLog.create({
            candidate: candidateId,
            exam: examId,
            logs: [{ type: 'Exam Active', timestamp: Date.now() }]
          });
        } else {
          proctorLog.updatedAt = new Date();
          await proctorLog.save();
        }
      }
    } catch (err) {
      console.error('Error auto-creating proctor log on socket join:', err.message);
    }

    // Notify admins that candidate is online for WebRTC stream
    io.to('admin-proctor-room').emit('candidate-online-webrtc', {
      socketId: socket.id,
      candidateId,
      examId,
      streamType
    });
  });

  // Admin joins live proctor listening room
  socket.on('join-admin-proctor', () => {
    socket.join('admin-proctor-room');
    // Ping all online candidates to initiate targeted peer connection offer
    io.emit('admin-online-ping', { adminSocketId: socket.id });
  });

  // Relay WebRTC signals between candidate and admin (with streamType)
  socket.on('send-webrtc-signal', ({ toSocketId, signalData, candidateId, examId, streamType = 'camera' }) => {
    io.to(toSocketId).emit('receive-webrtc-signal', {
      fromSocketId: socket.id,
      signalData,
      candidateId,
      examId,
      streamType
    });
  });

  // Targeted Admin-driven WebRTC handshake events
  socket.on('webrtc-offer', ({ targetSocketId, candidateId, offer, examId, streamType = 'camera' }) => {
    const targetRoom = targetSocketId || (candidateId ? `candidate-${candidateId}` : null);
    if (targetRoom) {
      io.to(targetRoom).emit('webrtc-offer', {
        senderSocketId: socket.id,
        offer,
        candidateId,
        examId,
        streamType
      });
    }
  });

  socket.on('webrtc-answer', ({ targetSocketId, candidateId, answer, examId, streamType = 'camera' }) => {
    if (targetSocketId) {
      io.to(targetSocketId).emit('webrtc-answer', {
        senderSocketId: socket.id,
        answer,
        candidateId,
        examId,
        streamType
      });
    }
  });

  socket.on('webrtc-ice-candidate', ({ targetSocketId, candidateId, candidate, streamType = 'camera' }) => {
    const target = targetSocketId || (candidateId ? `candidate-${candidateId}` : null);
    if (target) {
      io.to(target).emit('webrtc-ice-candidate', {
        senderSocketId: socket.id,
        candidate,
        candidateId,
        streamType
      });
    }
  });

  // Admin responds directly to a specific candidate
  socket.on('send-admin-ping-to-candidate', ({ toSocketId, streamType = 'camera' }) => {
    io.to(toSocketId).emit('admin-online-ping', { adminSocketId: socket.id, streamType });
  });

  // Candidate screenshare or webcam stream status notifications
  socket.on('candidate-screenshare-status', ({ examId, candidateId, status, isEntireScreen }) => {
    io.to('admin-proctor-room').emit('candidate-screenshare-alert', {
      candidateId,
      examId,
      status, // 'active' | 'stopped' | 'invalid_surface'
      isEntireScreen,
      timestamp: Date.now()
    });
  });

  socket.on('candidate-webcam-status', ({ examId, candidateId, status }) => {
    io.to('admin-proctor-room').emit('candidate-webcam-alert', {
      candidateId,
      examId,
      status, // 'active' | 'stopped'
      timestamp: Date.now()
    });
  });

  // Candidate streams real-time fallback image frame if needed
  socket.on('candidate-frame', ({ examId, candidateId, frameBuffer, imageData }) => {
    io.to('admin-proctor-room').emit('candidate-frame-update', {
      candidateId,
      examId,
      frameBuffer: frameBuffer || imageData,
    });
  });

  // Candidate streams real-time fallback screen frame if needed
  socket.on('candidate-screen-frame', ({ examId, candidateId, frameBuffer, imageData }) => {
    io.to('admin-proctor-room').emit('candidate-screen-frame-update', {
      candidateId,
      examId,
      frameBuffer: frameBuffer || imageData,
    });
  });

  socket.on('disconnect', () => {
    if (socket.candidateId && socket.examId) {
      // Check if there is another active socket connection for the same candidate taking the same exam
      let candidateStillConnected = false;
      for (const [id, s] of io.sockets.sockets) {
        if (s.id !== socket.id && s.candidateId === socket.candidateId && s.examId === socket.examId) {
          candidateStillConnected = true;
          break;
        }
      }
      if (!candidateStillConnected) {
        io.to('admin-proctor-room').emit('candidate-offline', {
          candidateId: socket.candidateId,
          examId: socket.examId,
          socketId: socket.id
        });
      }
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error(`Unhandled Rejection Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});

module.exports = app;

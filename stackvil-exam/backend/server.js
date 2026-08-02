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

// Security Headers
app.use(
  helmet({
    crossOriginResourcePolicy: false, // Allows loading images uploaded in dynamic requests
  })
);

// Enable CORS
const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      const isDevelopment = process.env.NODE_ENV !== 'production';
      const isLocalhost = origin.includes('localhost') || origin.includes('127.0.0.1');
      const isNgrok = origin.includes('ngrok-free.app') || origin.includes('ngrok.io');
      
      if (allowedOrigins.indexOf(origin) !== -1 || (isDevelopment && (isLocalhost || isNgrok))) {
        return callback(null, true);
      }
      
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);

// Body Parsers
app.use(express.json({ limit: '15mb' })); // Support larger webcam frame payloads
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Apply general API request rate limiter
app.use('/api', apiLimiter);

// Expose uploaded directories statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Swagger Documentation Route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// Mount REST API routers
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/candidate', candidateRoutes);
app.use('/api/proctor', proctorRoutes);
app.use('/api/reports', reportRoutes);

// Base route
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to Stackvil Online Examination Portal Backend API',
    docs: '/api-docs',
  });
});

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`Swagger docs available at http://localhost:${PORT}/api-docs`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.error(`Unhandled Rejection Error: ${err.message}`);
  // Close server & exit process
  server.close(() => process.exit(1));
});

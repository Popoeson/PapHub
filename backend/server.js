require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const { globalLimiter, loginLimiter } = require('./middleware/rateLimiter');

const authRoutes = require('./routes/auth');

const app = express();

// Connect to MongoDB
connectDB();

// Security headers
app.use(helmet());

// CORS — only allow configured frontend origin
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true, // required for cookies (refresh token)
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Request logging (dev only)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body parsers
app.use(express.json({ limit: '10kb' })); // Prevent large payload attacks
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// Global rate limiter
app.use(globalLimiter);

// Routes
app.use('/api/auth', loginLimiter, authRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', env: process.env.NODE_ENV });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error.',
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`PapHub server running on port ${PORT} [${process.env.NODE_ENV}]`);
});
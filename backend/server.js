require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');
const compression = require('compression');
const { globalLimiter, loginLimiter } = require('./middleware/rateLimiter');


const publicRoutes = require('./routes/public');
const authRoutes = require('./routes/auth');
const categoryRoutes = require('./routes/categories');
const productRoutes = require('./routes/products');
const checkoutRoutes = require('./routes/checkout');

const app = express();

// Trust the first proxy (required on Render, Railway, Heroku, etc.)
app.set('trust proxy', 1);
app.use(compression());

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
app.use('/api/admin/categories', categoryRoutes);
app.use('/api/admin/products', productRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/checkout', checkoutRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', env: process.env.NODE_ENV });
});


// TEMPORARY SEED ROUTE — DELETE AFTER USE
app.get('/api/seed-admin', async (req, res) => {
  const bcrypt = require('bcryptjs');
  const Admin = require('./models/Admin');

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    return res.status(400).json({ message: 'ADMIN_EMAIL and ADMIN_PASSWORD not set in env.' });
  }

  const existing = await Admin.findOne({ email });
  if (existing) {
    return res.status(400).json({ message: 'Admin already exists.' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await Admin.create({ email, passwordHash });

  return res.status(200).json({ message: `Admin created: ${email}` });
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
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { initDatabase } from './config/initDatabase.js';

import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import consumptionRoutes from './routes/consumptionRoutes.js';
import billRoutes from './routes/billRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';
import rateRoutes from './routes/rateRoutes.js';
import devRoutes from './routes/devRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

/* ======================================================
   CORS CONFIG (FIXED & SAFE)
====================================================== */
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://wattcount-frontend.vercel.app',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, origin); // 👈 IMPORTANT
      }

      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
/* ======================================================
   BODY PARSERS
====================================================== */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ======================================================
   DEBUG LOGGER (OPTIONAL)
====================================================== */
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

/* ======================================================
   ROUTES (NO /api PREFIX)
====================================================== */
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/consumption', consumptionRoutes);
app.use('/bills', billRoutes);
app.use('/payments', paymentRoutes);
app.use('/rates', rateRoutes);

/* Dev routes (local only) */
if (process.env.NODE_ENV !== 'production') {
  app.use('/dev', devRoutes);
  console.log('🔧 Dev routes enabled');
}

/* ======================================================
   HEALTH CHECK
====================================================== */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'WattCount API is running',
  });
});

/* ======================================================
   404 HANDLER
====================================================== */
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method,
  });
});

/* ======================================================
   ERROR HANDLER
====================================================== */
app.use((err, req, res, next) => {
  console.error('🔥 Server Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
  });
});

/* ======================================================
   DATABASE INIT
====================================================== */
initDatabase().catch((err) => {
  console.error('❌ Database init failed:', err);
});

/* ======================================================
   LOCAL SERVER ONLY
====================================================== */
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
}

/* ======================================================
   EXPORT FOR VERCEL
====================================================== */
export default app;

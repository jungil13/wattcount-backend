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

// Middleware
// CORS configuration - allow frontend domains
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, Postman, or same-origin requests)
    if (!origin) return callback(null, true);
    
    // List of allowed origins
    const allowedOrigins = [
      'http://localhost:5173', // Vite dev server
      'http://localhost:3000', // Local development
      'https://wattcount-frontend.vercel.app', // Production frontend
      /^https:\/\/.*\.vercel\.app$/, // Any Vercel preview deployment
    ];
    
    // Check if origin matches any allowed pattern
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return allowed === origin;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/consumption', consumptionRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/rates', rateRoutes);

// Development routes (only in development mode)
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/dev', devRoutes);
  console.log('🔧 Development routes enabled at /api/dev');
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'WattCount API is running' });
});

// Initialize database on startup (for environments that need it on startup, like local)
// For serverless deployments like Vercel, connections are often managed on demand.
initDatabase().catch((error) => {
  console.error('Failed to initialize database:', error);
  // In a serverless environment, this might just log an error rather than exiting the process
});


// Start the server only if not in a serverless environment (e.g., local development)
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL_ENV === 'development') {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

export default app;


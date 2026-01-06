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

// Handle OPTIONS requests explicitly (CORS preflight)
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.sendStatus(200);
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Debug middleware - log all requests
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} (original: ${req.originalUrl})`);
  next();
});

// Middleware to handle Vercel routing
// When Vercel routes /api/* to this function, the path includes /api
// We need to strip it so routes can match correctly
app.use((req, res, next) => {
  if (req.url.startsWith('/api/')) {
    const newUrl = req.url.replace(/^\/api/, '') || '/';
    console.log(`[Routing] Rewritten URL: ${req.url} -> ${newUrl}`);
    req.url = newUrl; // ✅ SAFE
  }
  next();
});


// Routes
// Mount routes to handle both /api/* (local) and /* (Vercel after path rewrite)
// This ensures compatibility in both environments
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/consumption', consumptionRoutes);
app.use('/api/bills', billRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/rates', rateRoutes);

// Also mount without /api prefix for Vercel (after middleware strips /api)
app.use('/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/consumption', consumptionRoutes);
app.use('/bills', billRoutes);
app.use('/payments', paymentRoutes);
app.use('/rates', rateRoutes);

// Development routes
if (process.env.NODE_ENV !== 'production') {
  app.use('/api/dev', devRoutes);
  app.use('/dev', devRoutes);
  console.log('🔧 Development routes enabled at /api/dev');
}

// Health check (mounted early for easy testing)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'WattCount API is running', path: req.path });
});
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'WattCount API is running', path: req.path });
});

// 404 handler for unmatched routes
app.use((req, res) => { 
  console.log(`[404] Method: ${req.method}, Path: ${req.path}, Original URL: ${req.originalUrl}`);
  res.status(404).json({ error: 'Route not found', path: req.path, method: req.method });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
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

// Export for Vercel serverless function
// Vercel can use Express apps directly as the default export
// The app will handle all requests routed to this function
export default app;

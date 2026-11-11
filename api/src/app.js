import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

import bedsRouter from './routes/beds.js';
import waitlistRouter from './routes/waitlist.js';
import housekeepingRouter from './routes/housekeeping.js';
import adminRouter from './routes/admin.js';

export const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.WEB_ORIGIN || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'hospital-management-core-api',
  });
});

// Person A routes
app.use('/beds', bedsRouter);
app.use('/waitlist', waitlistRouter);
app.use('/housekeeping', housekeepingRouter);
app.use('/admin', adminRouter);

// 404
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'Not_Found',
      message: `Cannot ${req.method} ${req.originalUrl}`,
    },
  });
});

// Global error handler
app.use((err, req, res, _next) => {
  const statusCode = err.status || err.statusCode || 500;
  res.status(statusCode).json({
    error: {
      code: err.code || (statusCode >= 500 ? 'Internal_Error' : 'Bad_Request'),
      message: err.message || 'Internal Server Error',
    },
  });
});

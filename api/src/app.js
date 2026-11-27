import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { queueRouter } from './routes/queue.routes.js'; // 1. Import your queue router

export const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.WEB_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: 'hospital-management-core-api',
  });
});

// 2. Mount your Day 2 Queue endpoints here:
app.use('/api/v1/queues', queueRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'Not_Found',
      message: `Cannot ${req.method} ${req.originalUrl}`,
    },
  });
});

// Centralized error handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const isServerError = statusCode >= 500;
  if (isServerError) {
    console.error(err);
  }
  res.status(statusCode).json({
    error: {
      code: isServerError ? 'Internal_Error' : (err.code || 'Bad_Request'),
      message: isServerError ? 'Internal Server Error' : (err.message || 'Internal Server Error'),
    },
  });
});

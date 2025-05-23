import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import config from './config/config.js';
import connectDB from './lib/connectiondb.js';
import studentRoutes from './routes/studentsRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import { errorResponse } from './utils/responseHandler.js';
import cloudinaryRoutes from './routes/Cloudnary.js'
import onlineCourseRoutes from './routes/OnlineCourse.js'
import studentVarification from './routes/StudentVarification.js';
import staffRoutes from "./routes/StaffRoutes.js"
import adminRoutes from './routes/Admin.js';
import certificateRoutes from './routes/certificateRoutes.js';

import feeRoutes from "./routes/feeRoutes.js"

const app = express();
// Security middleware
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Middleware to handle JSON parsing errors
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({ message: 'Invalid JSON format' });
  }
  next();
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// Add this before your routes
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/students', studentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/online-course', onlineCourseRoutes);
app.use('/api/students', studentVarification);
app.use('/api', cloudinaryRoutes);
app.use('/api/staff', staffRoutes)
app.use('/api/admin', adminRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/fees', feeRoutes);

// 404 handler
app.use((req, res) => {
  errorResponse(res, 'Route not found', 404);
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  errorResponse(
    res,
    err.message || 'Internal Server Error',
    err.status || 500,
    err
  );
});


const startServer = async () => {
  try {
    await connectDB();
    app.listen(config.port, () => {
      console.log(`🚀 Server running on port ${config.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

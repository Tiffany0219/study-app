import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDb } from './db.js';
import authRouter from './routes/auth.js';
import studyRouter from './routes/study.js';
import groupsRouter from './routes/groups.js';
import friendsRouter from './routes/friends.js';
import notificationsRouter from './routes/notifications.js';
import todosRouter from './routes/todos.js';
import checkinsRouter from './routes/checkins.js';
import timelineRouter from './routes/timeline.js';
import reviewsRouter from './routes/reviews.js';
import reportsRouter from './routes/reports.js';
import examsRouter from './routes/exams.js';
import chatRouter from './routes/chat.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middlewares & Security Headers (Helmet Lite)
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
  res.removeHeader('X-Powered-By');
  next();
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/study', studyRouter);
app.use('/api/groups', groupsRouter);
app.use('/api/friends', friendsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/todos', todosRouter);
app.use('/api/checkins', checkinsRouter);
app.use('/api/timeline', timelineRouter);
app.use('/api/reviews', reviewsRouter);
app.use('/api/reports', reportsRouter);
app.use('/api/exams', examsRouter);
app.use('/api/chat', chatRouter);

// Basic Health Check Route
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date() });
});

// Global Error Handler Middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Unhandled Error]:', err);
  res.status(500).json({
    message: '伺服器內部發生未知錯誤，我們正全力排查中。',
  });
});

// Start server after initializing database
async function startServer() {
  try {
    await initDb();
    app.listen(PORT, () => {
      console.log(`[Server] Express server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to initialize database or start server:', error);
    process.exit(1);
  }
}

startServer();

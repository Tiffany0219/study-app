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

// Middlewares
app.use(cors());
app.use(express.json());

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

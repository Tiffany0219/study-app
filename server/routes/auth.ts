import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db, getAutoStatusForUser } from '../db.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-study-app-1234';

// User Registration
router.post('/register', async (req, res) => {
  const { username, email, password, avatar } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: '請填寫所有必要欄位 (用戶名、Email、密碼)' });
  }

  try {
    // Check if user already exists
    const existingUser = await db.get('SELECT * FROM users WHERE email = ? OR username = ?', [email, username]);
    if (existingUser) {
      return res.status(400).json({ message: '此用戶名或 Email 已被註冊' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const userAvatar = avatar || 'avatar_1'; // Default avatar

    // Insert new user
    const result = await db.run(
      'INSERT INTO users (username, email, password, avatar) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, userAvatar]
    );

    const userId = result.lastID;

    // Generate token
    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });

    // Return token and user info (excluding password)
    return res.status(201).json({
      token,
      user: {
        userId,
        username,
        email,
        avatar: userAvatar,
        daily_goal: 60,
        level: 1,
        exp: 0,
      }
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({ message: '註冊時伺服器發生錯誤' });
  }
});

// User Login
router.post('/login', async (req, res) => {
  const { account, password } = req.body; // account can be username or email

  if (!account || !password) {
    return res.status(400).json({ message: '請輸入帳號與密碼' });
  }

  try {
    // Find user by username or email
    const user = await db.get('SELECT * FROM users WHERE email = ? OR username = ?', [account, account]);
    if (!user) {
      return res.status(400).json({ message: '帳號或密碼錯誤' });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: '帳號或密碼錯誤' });
    }

    // Generate token
    const token = jwt.sign({ userId: user.user_id }, JWT_SECRET, { expiresIn: '7d' });

    return res.json({
      token,
      user: {
        userId: user.user_id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        daily_goal: user.daily_goal,
        level: user.level,
        exp: user.exp,
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: '登入時伺服器發生錯誤' });
  }
});

// Get current user profile
router.get('/me', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const user = await db.get('SELECT user_id, username, email, avatar, daily_goal, level, exp, status, timeline_visibility, created_at FROM users WHERE user_id = ?', [req.userId]);
    if (!user) {
      return res.status(404).json({ message: '找不到使用者' });
    }

    const autoStatus = await getAutoStatusForUser(user.user_id, user.status || 'offline', user.daily_goal || 60);

    return res.json({
      userId: user.user_id,
      username: user.username,
      email: user.email,
      avatar: user.avatar,
      daily_goal: user.daily_goal,
      level: user.level,
      exp: user.exp,
      status: user.status,
      autoStatus,
      timeline_visibility: user.timeline_visibility || 'friends',
      createdAt: user.created_at
    });
  } catch (error) {
    console.error('Get profile error:', error);
    return res.status(500).json({ message: '獲取個人資料時伺服器發生錯誤' });
  }
});

// Update user profile
router.put('/profile', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const { username, avatar, daily_goal, timeline_visibility } = req.body;

  if (daily_goal !== undefined && (typeof daily_goal !== 'number' || daily_goal <= 0)) {
    return res.status(400).json({ message: '請設定有效的每日讀書目標時間（正整數）' });
  }

  if (timeline_visibility !== undefined && !['private', 'friends', 'groups', 'statistics_only'].includes(timeline_visibility)) {
    return res.status(400).json({ message: '無效的隱私狀態權限值' });
  }

  try {
    // If username is changing, ensure it is unique
    if (username) {
      const existingUser = await db.get('SELECT * FROM users WHERE username = ? AND user_id != ?', [username, req.userId]);
      if (existingUser) {
        return res.status(400).json({ message: '此用戶名已被其他人使用' });
      }
    }

    // Get current profile values
    const currentProfile = await db.get('SELECT username, avatar, daily_goal, timeline_visibility FROM users WHERE user_id = ?', [req.userId]);
    if (!currentProfile) {
      return res.status(404).json({ message: '找不到使用者' });
    }

    const newUsername = username || currentProfile.username;
    const newAvatar = avatar || currentProfile.avatar;
    const newDailyGoal = daily_goal !== undefined ? daily_goal : currentProfile.daily_goal;
    const newVisibility = timeline_visibility || currentProfile.timeline_visibility || 'friends';

    await db.run(
      'UPDATE users SET username = ?, avatar = ?, daily_goal = ?, timeline_visibility = ? WHERE user_id = ?',
      [newUsername, newAvatar, newDailyGoal, newVisibility, req.userId]
    );

    // Retrieve updated profile
    const updatedUser = await db.get('SELECT user_id, username, email, avatar, daily_goal, level, exp, status, timeline_visibility FROM users WHERE user_id = ?', [req.userId]);
    const autoStatus = await getAutoStatusForUser(updatedUser.user_id, updatedUser.status || 'offline', updatedUser.daily_goal || 60);

    return res.json({
      message: '個人資料更新成功',
      user: {
        userId: updatedUser.user_id,
        username: updatedUser.username,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
        daily_goal: updatedUser.daily_goal,
        level: updatedUser.level,
        exp: updatedUser.exp,
        status: updatedUser.status,
        autoStatus,
        timeline_visibility: updatedUser.timeline_visibility
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ message: '更新個人資料時伺服器發生錯誤' });
  }
});

// Update user live status (studying, resting, offline)
router.put('/status', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const { status } = req.body;

  if (!status || !['studying', 'resting', 'offline'].includes(status)) {
    return res.status(400).json({ message: '請指定正確的狀態類型 (studying, resting, offline)' });
  }

  try {
    await db.run('UPDATE users SET status = ? WHERE user_id = ?', [status, req.userId]);
    return res.json({ message: '狀態更新成功', status });
  } catch (error) {
    console.error('Update status error:', error);
    return res.status(500).json({ message: '更新狀態時伺服器發生錯誤' });
  }
});

export default router;

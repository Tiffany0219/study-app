import { Router, Response } from 'express';
import { db } from '../db.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// GET today's checkin status
router.get('/today', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const d = new Date();
  const todayStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;

  try {
    const checkin = await db.get(
      'SELECT checkin_id as checkinId, checkin_date as checkinDate, photo, note, created_at as createdAt FROM daily_checkins WHERE user_id = ? AND checkin_date = ?',
      [req.userId, todayStr]
    );
    return res.json({ checkedIn: !!checkin, checkin: checkin || null });
  } catch (error) {
    console.error('Get today checkin error:', error);
    return res.status(500).json({ message: '獲取打卡狀態時伺服器發生錯誤' });
  }
});

// POST to perform checkin (supports replace)
router.post('/', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const { photo, note } = req.body;

  if (!photo) {
    return res.status(400).json({ message: '請提供打卡照片' });
  }

  const d = new Date();
  const todayStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;

  try {
    // Insert or replace checkin
    await db.run(
      'INSERT OR REPLACE INTO daily_checkins (user_id, checkin_date, photo, note) VALUES (?, ?, ?, ?)',
      [req.userId, todayStr, photo, note || '']
    );

    // Fetch the inserted/updated checkin
    const checkin = await db.get(
      'SELECT checkin_id as checkinId, checkin_date as checkinDate, photo, note, created_at as createdAt FROM daily_checkins WHERE user_id = ? AND checkin_date = ?',
      [req.userId, todayStr]
    );

    return res.status(201).json({
      message: '今日打卡成功',
      checkin
    });
  } catch (error) {
    console.error('Post checkin error:', error);
    return res.status(500).json({ message: '打卡時伺服器發生錯誤' });
  }
});

export default router;

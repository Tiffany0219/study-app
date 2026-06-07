import { Router, Response } from 'express';
import { db } from '../db.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// 1. Get Timeline Activities for target date (defaults to today)
router.get('/', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const d = new Date();
  const todayStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  const targetDate = (req.query.date as string) || todayStr;

  try {
    const activities = await db.all(
      `SELECT activity_id as activityId, activity_name as activityName, category, 
              start_time as startTime, end_time as endTime, duration, note,
              is_timer_generated as isTimerGenerated, is_edited as isEdited 
       FROM timeline_activities 
       WHERE user_id = ? AND date(start_time, 'localtime') = date(?)
       ORDER BY start_time ASC`,
      [req.userId, targetDate]
    );
    return res.json(activities);
  } catch (error) {
    console.error('Get timeline error:', error);
    return res.status(500).json({ message: '獲取時間線時伺服器發生錯誤' });
  }
});

// 2. Add Timeline Activity
router.post('/', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const { activityName, category, startTime, endTime, note, isTimerGenerated } = req.body;

  if (!activityName || !category || !startTime || !endTime) {
    return res.status(400).json({ message: '請填寫所有必要欄位 (活動名稱、分類、開始時間、結束時間)' });
  }

  try {
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (end.getTime() <= start.getTime()) {
      return res.status(400).json({ message: '結束時間必須晚於開始時間！' });
    }

    // Overlap protection check
    const overlap = await db.get(`
      SELECT activity_id FROM timeline_activities
      WHERE user_id = ?
        AND (
          (start_time < ? AND end_time > ?) OR
          (start_time >= ? AND start_time < ?)
        )
      LIMIT 1
    `, [req.userId, endTime, startTime, startTime, endTime]);

    if (overlap) {
      return res.status(400).json({ message: '此時間段已安排其他活動，請重新選擇時間！' });
    }

    const duration = Math.max(0, Math.round((end.getTime() - start.getTime()) / 1000)); // duration in seconds
    const isTimer = isTimerGenerated ? 1 : 0;

    const result = await db.run(
      `INSERT INTO timeline_activities (user_id, activity_name, category, start_time, end_time, duration, note, is_timer_generated) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.userId, activityName.trim(), category, startTime, endTime, duration, note || '', isTimer]
    );

    return res.status(201).json({
      message: '時間線活動新增成功',
      activity: {
        activityId: result.lastID,
        activityName: activityName.trim(),
        category,
        startTime,
        endTime,
        duration,
        note: note || '',
        isTimerGenerated: isTimer,
        isEdited: 0
      }
    });
  } catch (error) {
    console.error('Add timeline activity error:', error);
    return res.status(500).json({ message: '新增時間線活動時伺服器發生錯誤' });
  }
});

// 3. Edit Timeline Activity
router.put('/:id', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const activityId = req.params.id;
  const { activityName, category, startTime, endTime, note } = req.body;

  if (!activityName || !category || !startTime || !endTime) {
    return res.status(400).json({ message: '請填寫所有必要欄位' });
  }

  try {
    // Check ownership
    const activity = await db.get('SELECT user_id FROM timeline_activities WHERE activity_id = ?', [activityId]);
    if (!activity) {
      return res.status(404).json({ message: '找不到此活動項目' });
    }

    if (activity.user_id !== req.userId) {
      return res.status(403).json({ message: '無權限修改他人活動項目' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (end.getTime() <= start.getTime()) {
      return res.status(400).json({ message: '結束時間必須晚於開始時間！' });
    }

    // Overlap protection check excluding current activity
    const overlap = await db.get(`
      SELECT activity_id FROM timeline_activities
      WHERE user_id = ? AND activity_id != ?
        AND (
          (start_time < ? AND end_time > ?) OR
          (start_time >= ? AND start_time < ?)
        )
      LIMIT 1
    `, [req.userId, activityId, endTime, startTime, startTime, endTime]);

    if (overlap) {
      return res.status(400).json({ message: '此時間段已安排其他活動，請重新選擇時間！' });
    }

    const duration = Math.max(0, Math.round((end.getTime() - start.getTime()) / 1000));

    await db.run(
      `UPDATE timeline_activities 
       SET activity_name = ?, category = ?, start_time = ?, end_time = ?, duration = ?, note = ?, is_edited = 1 
       WHERE activity_id = ?`,
      [activityName.trim(), category, startTime, endTime, duration, note || '', activityId]
    );

    return res.json({
      message: '時間線活動更新成功',
      activity: {
        activityId: Number(activityId),
        activityName: activityName.trim(),
        category,
        startTime,
        endTime,
        duration,
        note: note || '',
        isEdited: 1
      }
    });
  } catch (error) {
    console.error('Update timeline activity error:', error);
    return res.status(500).json({ message: '更新時間線活動時伺服器發生錯誤' });
  }
});

// 4. Delete Timeline Activity
router.delete('/:id', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const activityId = req.params.id;

  try {
    // Check ownership
    const activity = await db.get('SELECT user_id FROM timeline_activities WHERE activity_id = ?', [activityId]);
    if (!activity) {
      return res.status(404).json({ message: '找不到此活動項目' });
    }

    if (activity.user_id !== req.userId) {
      return res.status(403).json({ message: '無權限刪除他人活動項目' });
    }

    await db.run('DELETE FROM timeline_activities WHERE activity_id = ?', [activityId]);
    return res.json({ message: '時間線活動已刪除' });
  } catch (error) {
    console.error('Delete timeline activity error:', error);
    return res.status(500).json({ message: '刪除時間線活動時伺服器發生錯誤' });
  }
});

// 5. Get Friend's Timeline Activities for today
router.get('/friends/:friendId', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const friendUserId = req.params.friendId;
  const d = new Date();
  const todayStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;

  try {
    // Check if they are friends
    const friendship = await db.get(
      `SELECT * FROM friends 
       WHERE ((user_id = ? AND friend_user_id = ?) OR (user_id = ? AND friend_user_id = ?)) 
         AND status = 'accepted'`,
      [req.userId, friendUserId, friendUserId, req.userId]
    );

    if (!friendship) {
      return res.status(403).json({ message: '只有好友才可以查看時間線喔！' });
    }

    // Check friend's timeline visibility
    const friend = await db.get('SELECT timeline_visibility FROM users WHERE user_id = ?', [friendUserId]);
    const visibility = friend ? friend.timeline_visibility : 'friends';

    if (visibility === 'private') {
      return res.json([]);
    }

    const activities = await db.all(
      `SELECT activity_id as activityId, activity_name as activityName, category, 
              start_time as startTime, end_time as endTime, duration, note,
              is_timer_generated as isTimerGenerated, is_edited as isEdited 
       FROM timeline_activities 
       WHERE user_id = ? AND date(start_time, 'localtime') = date(?)
       ORDER BY start_time ASC`,
      [friendUserId, todayStr]
    );

    if (visibility === 'statistics_only') {
      const masked = activities.map(act => ({
        ...act,
        activityName: '已隱藏具體活動',
        note: '不公開細節'
      }));
      return res.json(masked);
    }

    return res.json(activities);
  } catch (error) {
    console.error('Get friend timeline error:', error);
    return res.status(500).json({ message: '獲取好友時間線時伺服器發生錯誤' });
  }
});

export default router;

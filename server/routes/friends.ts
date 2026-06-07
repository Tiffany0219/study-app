import { Router, Response } from 'express';
import { db, getAutoStatusForUser } from '../db.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// 1. Get Friend List with Status & Today's Study Minutes
router.get('/', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    // Query accepted friends
    const friends = await db.all(`
      SELECT DISTINCT 
        u.user_id as userId, 
        u.username, 
        u.avatar, 
        u.level, 
        u.status,
        u.daily_goal as dailyGoal,
        f.friend_id as friendId
      FROM friends f
      JOIN users u ON (f.user_id = u.user_id OR f.friend_user_id = u.user_id)
      WHERE (f.user_id = ? OR f.friend_user_id = ?) 
        AND f.status = 'accepted' 
        AND u.user_id != ?
    `, [req.userId, req.userId, req.userId]);

    // Retrieve today's study minutes for each friend
    const friendsWithProgress = await Promise.all(friends.map(async (friend) => {
      const todayRecord = await db.get(`
        SELECT SUM(duration) as total_duration
        FROM study_records
        WHERE user_id = ? AND status = 'completed' AND date(start_time, 'localtime') = date('now', 'localtime')
      `, [friend.userId]);

      const todayMinutes = todayRecord && todayRecord.total_duration 
        ? Math.round(todayRecord.total_duration / 60) 
        : 0;

      const autoStatus = await getAutoStatusForUser(friend.userId, friend.status || 'offline', friend.dailyGoal || 60);

      return {
        ...friend,
        todayMinutes,
        autoStatus
      };
    }));

    return res.json(friendsWithProgress);
  } catch (error) {
    console.error('Get friends error:', error);
    return res.status(500).json({ message: '獲取好友名單時伺服器發生錯誤' });
  }
});

// 2. Send Friend Request (by username)
router.post('/request', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ message: '請提供欲加為好友的用戶暱稱' });
  }

  try {
    // Find target user
    const targetUser = await db.get('SELECT user_id FROM users WHERE username = ?', [username.trim()]);
    if (!targetUser) {
      return res.status(404).json({ message: '找不到此用戶名稱' });
    }

    const targetUserId = targetUser.user_id;

    if (targetUserId === req.userId) {
      return res.status(400).json({ message: '您不能加自己為好友' });
    }

    // Check if relationship already exists
    const existing = await db.get(`
      SELECT * FROM friends 
      WHERE (user_id = ? AND friend_user_id = ?) OR (user_id = ? AND friend_user_id = ?)
    `, [req.userId, targetUserId, targetUserId, req.userId]);

    if (existing) {
      if (existing.status === 'accepted') {
        return res.status(400).json({ message: '你們已經是好友了' });
      } else {
        return res.status(400).json({ message: '好友邀請已發送或正待您確認中' });
      }
    }

    // Send request
    await db.run(
      'INSERT INTO friends (user_id, friend_user_id, status) VALUES (?, ?, ?)',
      [req.userId, targetUserId, 'pending']
    );

    // Send friend request notification
    await db.run(
      'INSERT INTO notifications (user_id, sender_id, type, title, content) VALUES (?, ?, ?, ?, ?)',
      [targetUserId, req.userId, 'friend_request', '收到好友邀請 👥', '有人向你發送了好友邀請，快點進查看吧！']
    );

    return res.status(201).json({ message: '好友申請發送成功' });
  } catch (error) {
    console.error('Send friend request error:', error);
    return res.status(500).json({ message: '送出好友申請時伺服器發生錯誤' });
  }
});

// 3. Get Pending Friend Requests
router.get('/requests/pending', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const requests = await db.all(`
      SELECT f.friend_id as friendId, f.created_at as createdAt, u.user_id as senderId, u.username, u.avatar, u.level
      FROM friends f
      JOIN users u ON f.user_id = u.user_id
      WHERE f.friend_user_id = ? AND f.status = 'pending'
      ORDER BY f.created_at DESC
    `, [req.userId]);

    return res.json(requests);
  } catch (error) {
    console.error('Get pending requests error:', error);
    return res.status(500).json({ message: '獲取好友邀請時伺服器發生錯誤' });
  }
});

// 4. Accept/Reject Friend Request
router.put('/requests/:id', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const friendId = req.params.id;
  const { action } = req.body; // 'accept' or 'reject'

  if (!action || (action !== 'accept' && action !== 'reject')) {
    return res.status(400).json({ message: '請指定正確的動作 (accept/reject)' });
  }

  try {
    // Verify request is indeed addressed to the logged-in user
    const request = await db.get('SELECT * FROM friends WHERE friend_id = ? AND friend_user_id = ?', [friendId, req.userId]);
    if (!request) {
      return res.status(404).json({ message: '找不到此好友邀請' });
    }

    if (action === 'accept') {
      await db.run('UPDATE friends SET status = \'accepted\' WHERE friend_id = ?', [friendId]);
      
      // Delete the corresponding friend_request notification
      await db.run(
        'DELETE FROM notifications WHERE user_id = ? AND sender_id = ? AND type = ?',
        [req.userId, request.user_id, 'friend_request']
      );

      return res.json({ message: '好友邀請已接受' });
    } else {
      await db.run('DELETE FROM friends WHERE friend_id = ?', [friendId]);

      // Delete notification
      await db.run(
        'DELETE FROM notifications WHERE user_id = ? AND sender_id = ? AND type = ?',
        [req.userId, request.user_id, 'friend_request']
      );

      return res.json({ message: '已拒絕好友邀請' });
    }
  } catch (error) {
    console.error('Handle friend request error:', error);
    return res.status(500).json({ message: '處理好友邀請時伺服器發生錯誤' });
  }
});

// 5. Delete Friend
router.delete('/:id', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const friendId = req.params.id;

  try {
    const result = await db.run(
      'DELETE FROM friends WHERE friend_id = ? AND (user_id = ? OR friend_user_id = ?)',
      [friendId, req.userId, req.userId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ message: '好友關係不存在或您無權刪除' });
    }

    return res.json({ message: '好友已刪除' });
  } catch (error) {
    console.error('Delete friend error:', error);
    return res.status(500).json({ message: '刪除好友時伺服器發生錯誤' });
  }
});

// 6. Encourage/Like Friend
router.post('/:id/encourage', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const friendUserId = req.params.id; // user_id of the friend

  try {
    // Verify they are accepted friends
    const friendship = await db.get(`
      SELECT * FROM friends 
      WHERE ((user_id = ? AND friend_user_id = ?) OR (user_id = ? AND friend_user_id = ?))
        AND status = 'accepted'
    `, [req.userId, friendUserId, friendUserId, req.userId]);

    if (!friendship) {
      return res.status(403).json({ message: '只有好友之間才能互相鼓勵喔' });
    }

    // Insert notification
    await db.run(
      'INSERT INTO notifications (user_id, sender_id, type, title, content) VALUES (?, ?, ?, ?, ?)',
      [friendUserId, req.userId, 'encourage', '好友送出鼓勵 🔥', '你的好友為你按讚鼓勵，繼續加油！']
    );

    return res.json({ message: '已成功送出鼓勵！🔥' });
  } catch (error) {
    console.error('Encourage friend error:', error);
    return res.status(500).json({ message: '送出鼓勵時伺服器發生錯誤' });
  }
});

// 7. Remind Friend to study
router.post('/:id/remind', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const friendUserId = req.params.id;

  try {
    // Verify they are accepted friends
    const friendship = await db.get(`
      SELECT * FROM friends 
      WHERE ((user_id = ? AND friend_user_id = ?) OR (user_id = ? AND friend_user_id = ?))
        AND status = 'accepted'
    `, [req.userId, friendUserId, friendUserId, req.userId]);

    if (!friendship) {
      return res.status(403).json({ message: '只有好友之間才能互相提醒喔' });
    }

    // Insert remind notification
    await db.run(
      'INSERT INTO notifications (user_id, sender_id, type, title, content) VALUES (?, ?, ?, ?, ?)',
      [friendUserId, req.userId, 'remind', '好友提醒你專注 ⏰', '你的好友叮嚀你該開始專注學習囉，動起來吧！']
    );

    return res.json({ message: '已成功送出提醒！⏰' });
  } catch (error) {
    console.error('Remind friend error:', error);
    return res.status(500).json({ message: '送出提醒時伺服器發生錯誤' });
  }
});

export default router;

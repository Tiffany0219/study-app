import { Router, Response } from 'express';
import { db } from '../db.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// 1. Get notifications for current user
router.get('/', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const notifications = await db.all(`
      SELECT n.notification_id as notificationId, n.user_id as userId, n.sender_id as senderId,
             n.group_id as groupId, n.type, n.title, n.content, n.status, n.created_at as createdAt,
             u.username as senderName, u.avatar as senderAvatar, g.group_name as groupName
      FROM notifications n
      LEFT JOIN users u ON n.sender_id = u.user_id
      LEFT JOIN study_groups g ON n.group_id = g.group_id
      WHERE n.user_id = ?
      ORDER BY n.created_at DESC
    `, [req.userId]);

    return res.json(notifications);
  } catch (error) {
    console.error('Get notifications error:', error);
    return res.status(500).json({ message: '獲取通知時伺服器發生錯誤' });
  }
});

// 2. Update status of a notification
router.put('/:id/status', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const { status } = req.body; // 'read', 'processed'

  if (!status || !['unread', 'read', 'processed'].includes(status)) {
    return res.status(400).json({ message: '無效的狀態值' });
  }

  try {
    const notif = await db.get('SELECT * FROM notifications WHERE notification_id = ? AND user_id = ?', [id, req.userId]);
    if (!notif) {
      return res.status(404).json({ message: '找不到此通知' });
    }

    await db.run('UPDATE notifications SET status = ? WHERE notification_id = ?', [status, id]);
    return res.json({ message: '通知狀態更新成功', status });
  } catch (error) {
    console.error('Update notification status error:', error);
    return res.status(500).json({ message: '更新通知狀態時伺服器發生錯誤' });
  }
});

// 3. Mark all as read
router.post('/clear', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    await db.run("UPDATE notifications SET status = 'read' WHERE user_id = ? AND status = 'unread'", [req.userId]);
    return res.json({ message: '已將所有未讀通知標記為已讀' });
  } catch (error) {
    console.error('Clear notifications error:', error);
    return res.status(500).json({ message: '標記已讀通知時伺服器發生錯誤' });
  }
});

export default router;

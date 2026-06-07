import { Router, Response } from 'express';
import { db } from '../db.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();
const MSG_LIMIT = 80; // max messages returned per request

// ─── GET messages ──────────────────────────────────────────────────────────────
// GET /api/chat/plaza               → global study plaza messages
// GET /api/chat/group/:groupId      → specific group chat
// Optional query: ?after=<messageId> for polling (only new messages)

router.get('/plaza', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const after = req.query.after ? Number(req.query.after) : 0;
  try {
    const rows = await db.all(`
      SELECT 
        m.message_id   AS messageId,
        m.content,
        m.created_at   AS createdAt,
        u.user_id      AS userId,
        u.username,
        u.avatar
      FROM chat_messages m
      JOIN users u ON u.user_id = m.user_id
      WHERE m.room_type = 'plaza'
        AND m.message_id > ?
      ORDER BY m.message_id ASC
      LIMIT ?
    `, [after, MSG_LIMIT]);
    return res.json(rows);
  } catch (err) {
    console.error('GET plaza chat error:', err);
    return res.status(500).json({ message: '伺服器錯誤' });
  }
});

router.get('/group/:groupId', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const groupId = Number(req.params.groupId);
  const after = req.query.after ? Number(req.query.after) : 0;

  // Verify user is a member of this group
  const member = await db.get(
    'SELECT member_id FROM group_members WHERE group_id = ? AND user_id = ?',
    [groupId, req.userId]
  );
  if (!member) {
    return res.status(403).json({ message: '你不是這個群組的成員' });
  }

  try {
    const rows = await db.all(`
      SELECT 
        m.message_id   AS messageId,
        m.content,
        m.created_at   AS createdAt,
        u.user_id      AS userId,
        u.username,
        u.avatar
      FROM chat_messages m
      JOIN users u ON u.user_id = m.user_id
      WHERE m.room_type = 'group'
        AND m.room_id = ?
        AND m.message_id > ?
      ORDER BY m.message_id ASC
      LIMIT ?
    `, [groupId, after, MSG_LIMIT]);
    return res.json(rows);
  } catch (err) {
    console.error('GET group chat error:', err);
    return res.status(500).json({ message: '伺服器錯誤' });
  }
});

// ─── POST message ──────────────────────────────────────────────────────────────

router.post('/plaza', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const { content } = req.body;
  if (!content || String(content).trim().length === 0) {
    return res.status(400).json({ message: '訊息不能為空' });
  }
  if (String(content).length > 300) {
    return res.status(400).json({ message: '訊息不能超過 300 字' });
  }

  try {
    const result = await db.run(
      "INSERT INTO chat_messages (room_type, room_id, user_id, content) VALUES ('plaza', NULL, ?, ?)",
      [req.userId, String(content).trim()]
    );
    const msg = await db.get(`
      SELECT 
        m.message_id AS messageId, m.content, m.created_at AS createdAt,
        u.user_id AS userId, u.username, u.avatar
      FROM chat_messages m JOIN users u ON u.user_id = m.user_id
      WHERE m.message_id = ?
    `, [result.lastID]);
    return res.status(201).json(msg);
  } catch (err) {
    console.error('POST plaza chat error:', err);
    return res.status(500).json({ message: '伺服器錯誤' });
  }
});

router.post('/group/:groupId', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const groupId = Number(req.params.groupId);
  const { content } = req.body;

  if (!content || String(content).trim().length === 0) {
    return res.status(400).json({ message: '訊息不能為空' });
  }
  if (String(content).length > 300) {
    return res.status(400).json({ message: '訊息不能超過 300 字' });
  }

  const member = await db.get(
    'SELECT member_id FROM group_members WHERE group_id = ? AND user_id = ?',
    [groupId, req.userId]
  );
  if (!member) {
    return res.status(403).json({ message: '你不是這個群組的成員' });
  }

  try {
    const result = await db.run(
      "INSERT INTO chat_messages (room_type, room_id, user_id, content) VALUES ('group', ?, ?, ?)",
      [groupId, req.userId, String(content).trim()]
    );
    const msg = await db.get(`
      SELECT 
        m.message_id AS messageId, m.content, m.created_at AS createdAt,
        u.user_id AS userId, u.username, u.avatar
      FROM chat_messages m JOIN users u ON u.user_id = m.user_id
      WHERE m.message_id = ?
    `, [result.lastID]);
    return res.status(201).json(msg);
  } catch (err) {
    console.error('POST group chat error:', err);
    return res.status(500).json({ message: '伺服器錯誤' });
  }
});

export default router;

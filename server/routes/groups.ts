import { Router, Response } from 'express';
import { db, getAutoStatusForUser } from '../db.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Helper to generate a unique 6-character invite code
function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 1. Create a Study Group
router.post('/', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const { name, description, dailyGoal } = req.body;

  if (!name) {
    return res.status(400).json({ message: '請提供群組名稱' });
  }

  const groupDailyGoal = dailyGoal !== undefined ? Number(dailyGoal) : 120; // default 120 minutes

  try {
    // Generate unique invite code
    let inviteCode = '';
    let isUnique = false;
    while (!isUnique) {
      inviteCode = generateInviteCode();
      const existing = await db.get('SELECT group_id FROM study_groups WHERE invite_code = ?', [inviteCode]);
      if (!existing) {
        isUnique = true;
      }
    }

    // Insert group
    const result = await db.run(
      'INSERT INTO study_groups (group_name, description, owner_id, invite_code, daily_group_goal) VALUES (?, ?, ?, ?, ?)',
      [name, description || '', req.userId, inviteCode, groupDailyGoal]
    );

    const groupId = result.lastID;

    // Add creator as owner in group_members
    await db.run(
      'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
      [groupId, req.userId, 'owner']
    );

    return res.status(201).json({
      message: '群組建立成功',
      group: {
        groupId,
        groupName: name,
        description,
        inviteCode,
        dailyGroupGoal: groupDailyGoal,
        role: 'owner'
      }
    });
  } catch (error) {
    console.error('Create group error:', error);
    return res.status(500).json({ message: '建立群組時伺服器發生錯誤' });
  }
});

// 2. Join a Study Group by Invite Code
router.post('/join', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const { inviteCode } = req.body;

  if (!inviteCode) {
    return res.status(400).json({ message: '請輸入邀請碼' });
  }

  const cleanCode = inviteCode.trim().toUpperCase();

  try {
    // Find group
    const group = await db.get('SELECT * FROM study_groups WHERE invite_code = ?', [cleanCode]);
    if (!group) {
      return res.status(404).json({ message: '找不到此邀請碼對應的群組，請確認邀請碼是否正確' });
    }

    // Add member
    try {
      await db.run(
        'INSERT INTO group_members (group_id, user_id, role) VALUES (?, ?, ?)',
        [group.group_id, req.userId, 'member']
      );
    } catch (dbErr: any) {
      if (dbErr.message && dbErr.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ message: '你已經是該群組的成員了' });
      }
      throw dbErr;
    }

    return res.status(200).json({
      message: '成功加入群組！',
      group: {
        groupId: group.group_id,
        groupName: group.group_name,
        description: group.description,
        dailyGroupGoal: group.daily_group_goal
      }
    });
  } catch (error) {
    console.error('Join group error:', error);
    return res.status(500).json({ message: '加入群組時伺服器發生錯誤' });
  }
});

// 3. Get User's Study Groups
router.get('/', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const groups = await db.all(`
      SELECT g.group_id as groupId, g.group_name as groupName, g.description, g.invite_code as inviteCode,
             g.daily_group_goal as dailyGroupGoal, m.role, m.joined_at as joinedAt,
             (SELECT COUNT(*) FROM group_members WHERE group_id = g.group_id) as memberCount
      FROM study_groups g
      JOIN group_members m ON g.group_id = m.group_id
      WHERE m.user_id = ?
      ORDER BY g.created_at DESC
    `, [req.userId]);

    return res.json(groups);
  } catch (error) {
    console.error('Get user groups error:', error);
    return res.status(500).json({ message: '獲取群組清單時伺服器發生錯誤' });
  }
});

// 4. Get Group Details & Member Progress Ranking
router.get('/:id', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const groupId = req.params.id;

  try {
    // Verify user is member of this group
    const membership = await db.get(
      'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, req.userId]
    );

    if (!membership) {
      return res.status(403).json({ message: '你不是該群組的成員，無權查看' });
    }

    // Get group metadata
    const group = await db.get('SELECT * FROM study_groups WHERE group_id = ?', [groupId]);
    if (!group) {
      return res.status(404).json({ message: '找不到此群組' });
    }

    // Get all group members, their status, level, avatar, and today's total study minutes
    const members = await db.all(`
      SELECT u.user_id as userId, u.username, u.avatar, u.level, u.status, u.daily_goal as dailyGoal, m.role, m.joined_at as joinedAt
      FROM users u
      JOIN group_members m ON u.user_id = m.user_id
      WHERE m.group_id = ?
    `, [groupId]);

    // Format today string YYYY-MM-DD
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;

    // For each member, calculate today's completed study duration (in minutes) and load today's todos
    const membersWithProgress = await Promise.all(members.map(async (member) => {
      const todayRecord = await db.get(`
        SELECT SUM(duration) as total_duration
        FROM study_records
        WHERE user_id = ? AND status = 'completed' AND date(start_time, 'localtime') = date('now', 'localtime')
      `, [member.userId]);

      const todayMinutes = todayRecord && todayRecord.total_duration 
        ? Math.round(todayRecord.total_duration / 60) 
        : 0;

      const todos = await db.all(`
        SELECT todo_id as todoId, todo_text as todoText, is_completed as isCompleted
        FROM group_todos
        WHERE group_id = ? AND user_id = ? AND target_date = ?
        ORDER BY created_at ASC
      `, [groupId, member.userId, todayStr]);

      const timeline = await db.all(`
        SELECT activity_id as activityId, activity_name as activityName, category, 
               start_time as startTime, end_time as endTime, duration, note 
        FROM timeline_activities 
        WHERE user_id = ? AND date(start_time, 'localtime') = date(?)
        ORDER BY start_time ASC
      `, [member.userId, todayStr]);

      // Check timeline visibility
      const memberUser = await db.get('SELECT timeline_visibility FROM users WHERE user_id = ?', [member.userId]);
      const visibility = memberUser ? memberUser.timeline_visibility : 'friends';

      let filteredTimeline = timeline;
      if (member.userId !== req.userId) {
        if (visibility === 'private') {
          filteredTimeline = [];
        } else if (visibility === 'friends') {
          // Check if they are friends
          const friendship = await db.get(
            `SELECT * FROM friends 
             WHERE ((user_id = ? AND friend_user_id = ?) OR (user_id = ? AND friend_user_id = ?)) 
               AND status = 'accepted'`,
            [req.userId, member.userId, member.userId, req.userId]
          );
          if (!friendship) {
            filteredTimeline = [];
          }
        } else if (visibility === 'statistics_only') {
          filteredTimeline = timeline.map(act => ({
            ...act,
            activityName: '已隱藏具體活動',
            note: '不公開細節'
          }));
        }
      }

      const autoStatus = await getAutoStatusForUser(member.userId, member.status || 'offline', member.dailyGoal || 60);

      return {
        ...member,
        todayMinutes,
        todos,
        timeline: filteredTimeline,
        autoStatus
      };
    }));

    // Sort by todayMinutes descending (leaderboard ranking)
    membersWithProgress.sort((a, b) => b.todayMinutes - a.todayMinutes);

    // Group cumulative today study minutes
    const groupTodayMinutes = membersWithProgress.reduce((sum, m) => sum + m.todayMinutes, 0);

    const deadlines = await db.all(`
      SELECT item_id as itemId, title, target_date as targetDate, type, user_id as userId
      FROM exams_deadlines
      WHERE group_id = ?
      ORDER BY target_date ASC
    `, [groupId]);

    // Get recent cheers (sent within last 15 seconds) in this group
    const recentCheers = await db.all(`
      SELECT n.notification_id as id, n.sender_id as senderId, n.user_id as targetUserId,
             n.type, n.title, n.content, n.created_at as createdAt, u.username as senderName
      FROM notifications n
      JOIN users u ON n.sender_id = u.user_id
      WHERE n.group_id = ? AND n.type = 'encourage'
        AND datetime(n.created_at, 'localtime') >= datetime('now', 'localtime', '-15 seconds')
      ORDER BY n.created_at DESC
    `, [groupId]);

    return res.json({
      groupId: group.group_id,
      groupName: group.group_name,
      description: group.description,
      inviteCode: group.invite_code,
      dailyGroupGoal: group.daily_group_goal,
      role: membership.role,
      groupTodayMinutes,
      members: membersWithProgress,
      deadlines,
      recentCheers
    });
  } catch (error) {
    console.error('Get group details error:', error);
    return res.status(500).json({ message: '獲取群組詳情時伺服器發生錯誤' });
  }
});

// 5. Leave Study Group
router.delete('/:id/leave', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const groupId = req.params.id;

  try {
    const membership = await db.get(
      'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, req.userId]
    );

    if (!membership) {
      return res.status(400).json({ message: '你本來就不是此群組的成員' });
    }

    if (membership.role === 'owner') {
      // Owner leaves: delete group entirely (cascades memberships) or block it
      // For simplicity in MVP/Phase 2, let's delete the group entirely
      await db.run('DELETE FROM study_groups WHERE group_id = ?', [groupId]);
      return res.json({ message: '由於您是群組建立者，您退出後該群組已被刪除' });
    } else {
      // Regular member leaves
      await db.run('DELETE FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, req.userId]);
      return res.json({ message: '成功退出群組' });
    }
  } catch (error) {
    console.error('Leave group error:', error);
    return res.status(500).json({ message: '退出群組時伺服器發生錯誤' });
  }
});

// 6. Add TODO item to group for current user
router.post('/:id/todos', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const groupId = req.params.id;
  const { todoText, targetDate } = req.body;

  if (!todoText || !todoText.trim()) {
    return res.status(400).json({ message: '請輸入待辦事項內容' });
  }

  try {
    // Verify membership
    const membership = await db.get(
      'SELECT role FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, req.userId]
    );
    if (!membership) {
      return res.status(403).json({ message: '您不是該群組的成員，無法新增待辦事項' });
    }

    // Formulate date string YYYY-MM-DD
    const d = new Date();
    const todayStr = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,'0')}-${d.getDate().toString().padStart(2,'0')}`;
    const cleanDate = targetDate || todayStr;

    const result = await db.run(
      'INSERT INTO group_todos (group_id, user_id, todo_text, target_date) VALUES (?, ?, ?, ?)',
      [groupId, req.userId, todoText.trim(), cleanDate]
    );

    return res.status(201).json({
      message: '待辦事項新增成功',
      todo: {
        todoId: result.lastID,
        todoText: todoText.trim(),
        isCompleted: 0,
        targetDate: cleanDate
      }
    });
  } catch (error) {
    console.error('Add group todo error:', error);
    return res.status(500).json({ message: '新增待辦事項時伺服器發生錯誤' });
  }
});

// 7. Toggle TODO item completion status
router.put('/:id/todos/:todoId', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const todoId = req.params.todoId;
  const { isCompleted } = req.body;

  if (isCompleted === undefined || (isCompleted !== 0 && isCompleted !== 1)) {
    return res.status(400).json({ message: '請指定正確的完成狀態 (0 或 1)' });
  }

  try {
    const result = await db.run(
      'UPDATE group_todos SET is_completed = ? WHERE todo_id = ? AND user_id = ?',
      [isCompleted, todoId, req.userId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ message: '找不到此待辦項目，或您無權修改此項目' });
    }

    return res.json({ message: '待辦項目狀態更新成功', todoId, isCompleted });
  } catch (error) {
    console.error('Update group todo error:', error);
    return res.status(500).json({ message: '更新待辦項目時伺服器發生錯誤' });
  }
});

// 8. Delete TODO item
router.delete('/:id/todos/:todoId', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const todoId = req.params.todoId;

  try {
    const result = await db.run(
      'DELETE FROM group_todos WHERE todo_id = ? AND user_id = ?',
      [todoId, req.userId]
    );

    if (result.changes === 0) {
      return res.status(404).json({ message: '找不到此待辦項目，或您無權刪除此項目' });
    }

    return res.json({ message: '待辦項目已刪除' });
  } catch (error) {
    console.error('Delete group todo error:', error);
    return res.status(500).json({ message: '刪除代辦項目時伺服器發生錯誤' });
  }
});

// 9. Send virtual item cheer to group member in live study room
router.post('/:groupId/members/:targetUserId/cheer', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const { groupId, targetUserId } = req.params;
  const { itemType } = req.body; // 'coffee' | 'cheese'

  try {
    // 1. Verify sender is a member of this group
    const isSenderMember = await db.get(
      'SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, req.userId]
    );
    if (!isSenderMember) {
      return res.status(403).json({ message: '您並非此群組的成員' });
    }

    // 2. Verify target is also a member of this group
    const isTargetMember = await db.get(
      'SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?',
      [groupId, targetUserId]
    );
    if (!isTargetMember) {
      return res.status(404).json({ message: '目標對象非此群組成員' });
    }

    // 3. Get sender username
    const sender = await db.get('SELECT username FROM users WHERE user_id = ?', [req.userId]);
    const senderName = sender ? sender.username : '有人';

    // 4. Send notification
    const title = itemType === 'coffee' ? '自習室送來熱咖啡 ☕' : '自習室送來幸運起司 🧀';
    const content = itemType === 'coffee' 
      ? `群組成員【${senderName}】在線上自習室送了你一杯香氣撲鼻的熱咖啡，為你的專注加油打氣！`
      : `群組成員【${senderName}】在線上自習室送了你一塊黃澄澄的幸運起司，祝你學習順利、效率加倍！`;

    await db.run(
      'INSERT INTO notifications (user_id, sender_id, group_id, type, title, content) VALUES (?, ?, ?, ?, ?, ?)',
      [targetUserId, req.userId, groupId, 'encourage', title, content]
    );

    return res.json({ message: '送出成功！🎉' });
  } catch (error) {
    console.error('Group member cheer error:', error);
    return res.status(500).json({ message: '送出加油打氣時伺服器發生錯誤' });
  }
});

export default router;

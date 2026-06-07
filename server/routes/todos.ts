import { Router, Response } from 'express';
import { db } from '../db.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// 1. Get Personal Daily Todos
router.get('/', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const d = new Date();
  const todayStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;

  try {
    const todos = await db.all(
      'SELECT todo_id as todoId, todo_text as todoText, is_completed as isCompleted, target_date as targetDate FROM personal_todos WHERE user_id = ? AND target_date = ? ORDER BY created_at ASC',
      [req.userId, todayStr]
    );
    return res.json(todos);
  } catch (error) {
    console.error('Get personal todos error:', error);
    return res.status(500).json({ message: '獲取個人待辦清單時伺服器發生錯誤' });
  }
});

// 2. Add Personal Todo Item
router.post('/', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const { todoText } = req.body;

  if (!todoText || !todoText.trim()) {
    return res.status(400).json({ message: '請提供待辦項目內容' });
  }

  const d = new Date();
  const todayStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;

  try {
    const result = await db.run(
      'INSERT INTO personal_todos (user_id, todo_text, target_date) VALUES (?, ?, ?)',
      [req.userId, todoText.trim(), todayStr]
    );

    return res.status(201).json({
      message: '個人待辦項目新增成功',
      todo: {
        todoId: result.lastID,
        todoText: todoText.trim(),
        isCompleted: 0,
        targetDate: todayStr
      }
    });
  } catch (error) {
    console.error('Add personal todo error:', error);
    return res.status(500).json({ message: '新增個人待辦時伺服器發生錯誤' });
  }
});

// 3. Toggle/Update Personal Todo
router.put('/:id', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const todoId = req.params.id;
  const { isCompleted } = req.body;

  if (isCompleted === undefined || (isCompleted !== 0 && isCompleted !== 1)) {
    return res.status(400).json({ message: '請指定正確的完成狀態 (0 或 1)' });
  }

  try {
    // Check ownership
    const todo = await db.get('SELECT user_id FROM personal_todos WHERE todo_id = ?', [todoId]);
    if (!todo) {
      return res.status(404).json({ message: '找不到此待辦項目' });
    }

    if (todo.user_id !== req.userId) {
      return res.status(403).json({ message: '您無權限修改他人待辦項目' });
    }

    await db.run(
      'UPDATE personal_todos SET is_completed = ? WHERE todo_id = ?',
      [isCompleted, todoId]
    );

    return res.json({ message: '待辦項目狀態更新成功', todoId, isCompleted });
  } catch (error) {
    console.error('Toggle personal todo error:', error);
    return res.status(500).json({ message: '更新待辦狀態時伺服器發生錯誤' });
  }
});

// 4. Delete Personal Todo
router.delete('/:id', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const todoId = req.params.id;

  try {
    // Check ownership
    const todo = await db.get('SELECT user_id FROM personal_todos WHERE todo_id = ?', [todoId]);
    if (!todo) {
      return res.status(404).json({ message: '找不到此待辦項目' });
    }

    if (todo.user_id !== req.userId) {
      return res.status(403).json({ message: '您無權限刪除他人待辦項目' });
    }

    await db.run('DELETE FROM personal_todos WHERE todo_id = ?', [todoId]);
    return res.json({ message: '待辦項目已刪除' });
  } catch (error) {
    console.error('Delete personal todo error:', error);
    return res.status(500).json({ message: '刪除待辦項目時伺服器發生錯誤' });
  }
});

export default router;

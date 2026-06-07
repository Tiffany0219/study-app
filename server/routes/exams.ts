import { Router, Response } from 'express';
import { db } from '../db.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// 1. Get all exams and deadlines for user (including generated plans)
router.get('/', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const exams = await db.all(`
      SELECT DISTINCT e.item_id as itemId, e.title, e.target_date as targetDate, e.type, e.group_id as groupId, e.created_at as createdAt,
             g.group_name as groupName
      FROM exams_deadlines e
      LEFT JOIN study_groups g ON e.group_id = g.group_id
      LEFT JOIN group_members m ON e.group_id = m.group_id
      WHERE e.user_id = ? OR (e.group_id IS NOT NULL AND m.user_id = ?)
      ORDER BY e.target_date ASC
    `, [req.userId, req.userId]);

    const examsWithPlans = await Promise.all(exams.map(async (exam) => {
      const plan = await db.get(`
        SELECT plan_id as planId, plan_text as planText
        FROM study_plans
        WHERE item_id = ? AND user_id = ?
      `, [exam.itemId, req.userId]);

      return {
        ...exam,
        plan: plan || null
      };
    }));

    return res.json(examsWithPlans);
  } catch (error) {
    console.error('Get exams error:', error);
    return res.status(500).json({ message: '獲取倒數項目時伺服器發生錯誤' });
  }
});

// 2. Create new exam/deadline
router.post('/', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const { title, targetDate, type, groupId } = req.body;

  if (!title || !targetDate) {
    return res.status(400).json({ message: '請提供項目名稱與截止日期' });
  }

  const itemType = type ? type.trim() : 'exam';

  try {
    if (groupId) {
      const isMember = await db.get('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?', [groupId, req.userId]);
      if (!isMember) {
        return res.status(403).json({ message: '您並非該群組成員，無法發布共享倒數' });
      }
    }

    const result = await db.run(`
      INSERT INTO exams_deadlines (user_id, group_id, title, target_date, type)
      VALUES (?, ?, ?, ?, ?)
    `, [req.userId, groupId || null, title.trim(), targetDate, itemType]);

    return res.status(201).json({
      message: '倒數項目新增成功',
      itemId: result.lastID
    });
  } catch (error) {
    console.error('Create exam error:', error);
    return res.status(500).json({ message: '新增倒數項目時伺服器發生錯誤' });
  }
});

// 3. Delete exam/deadline
router.delete('/:id', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const exam = await db.get('SELECT * FROM exams_deadlines WHERE item_id = ?', [id]);
    if (!exam) {
      return res.status(404).json({ message: '找不到此倒數項目' });
    }

    const isOwner = exam.group_id 
      ? await db.get('SELECT 1 FROM study_groups WHERE group_id = ? AND owner_id = ?', [exam.group_id, req.userId])
      : null;

    if (exam.user_id !== req.userId && !isOwner) {
      return res.status(403).json({ message: '您無權限刪除此倒數項目' });
    }

    await db.run('DELETE FROM exams_deadlines WHERE item_id = ?', [id]);
    return res.json({ message: '倒數項目刪除成功' });
  } catch (error) {
    console.error('Delete exam error:', error);
    return res.status(500).json({ message: '刪除倒數項目時伺服器發生錯誤' });
  }
});

// 4. Generate Study Plan via AI
router.post('/:id/plan', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;

  try {
    const exam = await db.get(`
      SELECT DISTINCT e.* FROM exams_deadlines e
      LEFT JOIN group_members m ON e.group_id = m.group_id
      WHERE e.item_id = ? AND (e.user_id = ? OR (e.group_id IS NOT NULL AND m.user_id = ?))
    `, [id, req.userId, req.userId]);
    if (!exam) {
      return res.status(404).json({ message: '找不到此項目，無法生成計畫' });
    }

    // Calculate days remaining
    const examDate = new Date(exam.target_date);
    const today = new Date();
    // Zero out hours for clean day difference
    examDate.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    const diffTime = examDate.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    let planText = '';
    const geminiKey = process.env.GEMINI_API_KEY;

    if (geminiKey) {
      try {
        const prompt = `您是一位充滿熱情、溫柔且專業的學習教練與導師。
學生正準備應對於 ${exam.target_date} 進行的【${exam.title}】（限於 ${exam.type === 'exam' ? '考試' : exam.type === 'homework' ? '作業期限' : exam.type === 'project' ? '專題發表' : '測驗'}）。
距離這一天還有 ${daysRemaining} 天。

請為他量身打造一個三階段讀書/衝刺計畫：
1. 第一階段：前期知識鞏固
2. 第二階段：中期模擬演練與核心補強
3. 第三階段：考前衝刺與心態調整

請條列出每階段的具體步驟。語氣親切，請使用中文，不要使用 Markdown 標題，請使用一般 Markdown 粗體和清單符號來呈現計畫內容，字數限制在 300 字以內。`;

        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }]
            })
          }
        );

        if (response.ok) {
          const apiData: any = await response.json();
          planText = apiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        } else {
          console.warn('[AI Plan] Gemini API returned error status:', response.status);
        }
      } catch (err) {
        console.error('[AI Plan] Gemini fetch failed:', err);
      }
    }

    // Fallback if Gemini failed or is not configured
    if (!planText.trim()) {
      if (daysRemaining <= 0) {
        planText = `**倒數已到期或就在今天！**\n\n*   **本日計畫**：沉著應戰！深呼吸，帶齊文具與准考證或檢查專題程式碼，相信自己先前的努力，以最平常的心情發揮實力。`;
      } else if (daysRemaining <= 3) {
        planText = `**距離期限僅剩 ${daysRemaining} 天！短期衝刺複習計畫：**\n\n*   **第一天（核心突破）**：專注複習最常錯的經典題型、核心公式與觀念，切忌開始閱讀全新的主題。\n*   **第二天（限時演練）**：挑選一份考古題或作業初版，限時進行一次模擬作答，檢查時間分配。\n*   **第三天（考前調整）**：輕度瀏覽大綱，確保 8 小時充足睡眠，調整好精神狀態。`;
      } else {
        const step1Days = Math.max(1, Math.round(daysRemaining * 0.4));
        const step2Days = Math.max(1, Math.round(daysRemaining * 0.4));
        const step3Days = Math.max(1, daysRemaining - step1Days - step2Days);

        planText = `**距離期限還有 ${daysRemaining} 天，推薦的三階段排程計畫：**\n\n*   **第一階段（知識儲備，約 ${step1Days} 天）**：每天分配專注時間，精讀課本與筆記的重點章節，重新釐清基本觀念，並建立知識骨架。\n*   **第二階段（實戰演練，約 ${step2Days} 天）**：以題目為導向，大量演練習題與歷屆試題。找出答錯的弱點區塊，做標記並及時補強。\n*   **第三階段（極限衝刺，約 ${step3Days} 天）**：模擬考試環境做全份模擬題。整理錯題集，考前一晚放鬆心情、充足睡眠，維持巔峰精神。`;
      }
    }

    planText = planText.trim();

    // Upsert study plan in DB
    const existingPlan = await db.get('SELECT plan_id FROM study_plans WHERE item_id = ? AND user_id = ?', [id, req.userId]);
    if (existingPlan) {
      await db.run('UPDATE study_plans SET plan_text = ? WHERE plan_id = ?', [planText, existingPlan.plan_id]);
    } else {
      await db.run('INSERT INTO study_plans (user_id, item_id, plan_text) VALUES (?, ?, ?)', [req.userId, id, planText]);
    }

    // Trigger user notification when AI advice completes
    await db.run(`
      INSERT INTO notifications (user_id, sender_id, type, title, content)
      VALUES (?, ?, ?, ?, ?)
    `, [req.userId, null, 'ai_advice', 'AI 衝刺計畫已生成 ✨', `已為你的倒數目標「${exam.title}」排定專屬衝刺讀書計畫，快來查看吧！`]);

    return res.json({
      message: '讀書計畫排定成功',
      planText
    });
  } catch (error) {
    console.error('Generate study plan error:', error);
    return res.status(500).json({ message: '生成讀書計畫時伺服器發生錯誤' });
  }
});

export default router;

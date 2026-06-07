import { Router, Response } from 'express';
import { db } from '../db.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// 1. Get list of generated reports
router.get('/list', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const reports = await db.all(`
      SELECT report_id as reportId, report_type as reportType, start_date as startDate,
             end_date as endDate, total_duration as totalDuration, favorite_subject as favoriteSubject,
             wasted_duration as wastedDuration, streak_days as streakDays, goal_met_rate as goalMetRate,
             ai_summary as aiSummary, created_at as createdAt
      FROM learning_reports
      WHERE user_id = ?
      ORDER BY end_date DESC, created_at DESC
    `, [req.userId]);

    return res.json(reports);
  } catch (error) {
    console.error('Get reports error:', error);
    return res.status(500).json({ message: '獲取報告列表時伺服器發生錯誤' });
  }
});

// 2. Generate a new report
router.post('/generate', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const { reportType } = req.body; // 'weekly', 'monthly'

  if (!reportType || !['weekly', 'monthly'].includes(reportType)) {
    return res.status(400).json({ message: '請指定有效的報告類型 (weekly, monthly)' });
  }

  try {
    // Check if user exists to get daily goal
    const user = await db.get('SELECT daily_goal FROM users WHERE user_id = ?', [req.userId]);
    const dailyGoal = user ? user.daily_goal : 60;

    // Calculate dates
    const endDate = new Date();
    const startDate = new Date();
    const daysCount = reportType === 'weekly' ? 7 : 30;
    
    startDate.setDate(endDate.getDate() - (daysCount - 1));

    const startStr = `${startDate.getFullYear()}-${(startDate.getMonth() + 1).toString().padStart(2, '0')}-${startDate.getDate().toString().padStart(2, '0')}`;
    const endStr = `${endDate.getFullYear()}-${(endDate.getMonth() + 1).toString().padStart(2, '0')}-${endDate.getDate().toString().padStart(2, '0')}`;

    // 1. Get total study duration from study_records (completed)
    const recordsSum = await db.get(`
      SELECT SUM(duration) as total_sec
      FROM study_records
      WHERE user_id = ? AND status = 'completed' 
        AND date(start_time, 'localtime') BETWEEN date(?) AND date(?)
    `, [req.userId, startStr, endStr]);
    const totalDurationSec = recordsSum && recordsSum.total_sec ? recordsSum.total_sec : 0;
    const totalDurationMins = Math.round(totalDurationSec / 60);

    // 2. Get favorite subject (completed study record subject with max duration)
    const favSubResult = await db.get(`
      SELECT subject, SUM(duration) as sub_sec
      FROM study_records
      WHERE user_id = ? AND status = 'completed'
        AND date(start_time, 'localtime') BETWEEN date(?) AND date(?)
      GROUP BY subject
      ORDER BY sub_sec DESC
      LIMIT 1
    `, [req.userId, startStr, endStr]);
    const favoriteSubject = favSubResult ? favSubResult.subject : '無記錄';

    // 3. Get total wasted duration from timeline activities
    const wastedSum = await db.get(`
      SELECT SUM(duration) as wasted_sec
      FROM timeline_activities
      WHERE user_id = ? AND category = 'wasted'
        AND date(start_time, 'localtime') BETWEEN date(?) AND date(?)
    `, [req.userId, startStr, endStr]);
    const wastedDurationMins = wastedSum && wastedSum.wasted_sec ? Math.round(wastedSum.wasted_sec / 60) : 0;

    // 4. Get active study days (streak days in the report range)
    const activeDaysResult = await db.get(`
      SELECT COUNT(DISTINCT date(start_time, 'localtime')) as active_days
      FROM study_records
      WHERE user_id = ? AND status = 'completed'
        AND date(start_time, 'localtime') BETWEEN date(?) AND date(?)
    `, [req.userId, startStr, endStr]);
    const streakDays = activeDaysResult ? activeDaysResult.active_days : 0;

    // 5. Calculate goal met rate
    const dailyDurations = await db.all(`
      SELECT date(start_time, 'localtime') as study_date, SUM(duration) as daily_sec
      FROM study_records
      WHERE user_id = ? AND status = 'completed'
        AND date(start_time, 'localtime') BETWEEN date(?) AND date(?)
      GROUP BY study_date
    `, [req.userId, startStr, endStr]);
    
    let metDays = 0;
    dailyDurations.forEach((d) => {
      const dailyMins = Math.round(d.daily_sec / 60);
      if (dailyMins >= dailyGoal) {
        metDays++;
      }
    });
    const goalMetRate = daysCount > 0 ? Math.round((metDays / daysCount) * 100) : 0;

    // 6. Generate AI Summary (Gemini or offline rules)
    let aiSummary = '';
    const geminiKey = process.env.GEMINI_API_KEY;
    const studyHours = (totalDurationMins / 60).toFixed(1);
    const wastedHours = (wastedDurationMins / 60).toFixed(1);

    if (geminiKey) {
      try {
        const prompt = `您是一位溫柔的學習分析專家與心理輔導導師。以下是學生近段時間的專注數據報告統計：
- 報告類型：${reportType === 'weekly' ? '週報' : '月報'}
- 分析區間：${startStr} 至 ${endStr} (${daysCount} 天)
- 累計專注時長：${studyHours} 小時 (${totalDurationMins} 分鐘)
- 最常讀的科目：${favoriteSubject}
- 累計分心浪費時間：${wastedHours} 小時 (${wastedDurationMins} 分鐘)
- 累積有進行專注的總天數：${streakDays} 天
- 每日讀書目標達成率 (目標 ${dailyGoal} 分鐘)：${goalMetRate}%

請為他寫一份精美、具啟發性且好執行的總結與改善建議。字數限制在 250 字內，語氣親切，請使用中文，不要使用 Markdown 標題，請分段寫出您的點評與針對下一階段的具體調整建議。`;

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
          aiSummary = apiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        } else {
          console.warn('[AI Report] Gemini API returned error status:', response.status);
        }
      } catch (err) {
        console.error('[AI Report] Gemini fetch failed:', err);
      }
    }

    if (!aiSummary.trim()) {
      // Local fallback rules
      if (totalDurationMins === 0) {
        aiSummary = `本報告分析期間（${startStr} 至 ${endStr}）尚未紀錄任何學習時數。萬事起頭難，建議下一週從每天專注 15 分鐘做起，給大腦一個無壓力的開始。加油，明天就啟動第一顆番茄鐘吧！`;
      } else if (goalMetRate < 30) {
        aiSummary = `你在這段期間共專注了 ${studyHours} 小時，最常專注的科目是「${favoriteSubject}」。不過目前每日目標達成率偏低（${goalMetRate}%），可能目標訂得稍微高了點。下一階段建議將每日目標微調為 30 分鐘，降低門檻以建立成就感，並注意減少累積了 ${wastedHours} 小時的分心干擾。`;
      } else if (wastedDurationMins > totalDurationMins * 0.5) {
        aiSummary = `這段時間你很努力，專注時長達 ${studyHours} 小時！然而，統計顯示分心浪費時間（${wastedHours} 小時）也偏多。建議下一階段實施「無手機讀書區」，把手機放到視線之外。你的學習熱情很棒，只要排除環境干擾，效率一定會再翻倍！`;
      } else {
        aiSummary = `做得太出色了！你在這段期間累積了 ${studyHours} 小時的優質專注，每日目標達成率達 ${goalMetRate}%，學習習慣非常穩定（共學習 ${streakDays} 天）。下一階段建議你可以開始將高難度的章節安排在專注力最集中的早晨時段，並維持目前的學習步調。繼續保持，你是最棒的！`;
      }
    }

    aiSummary = aiSummary.trim();

    // 7. Save report in SQLite
    const result = await db.run(`
      INSERT INTO learning_reports (user_id, report_type, start_date, end_date, total_duration, favorite_subject, wasted_duration, streak_days, goal_met_rate, ai_summary)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [req.userId, reportType, startStr, endStr, totalDurationMins, favoriteSubject, wastedDurationMins, streakDays, goalMetRate, aiSummary]);

    // 8. Generate notification
    const typeLabel = reportType === 'weekly' ? '週報' : '月報';
    await db.run(`
      INSERT INTO notifications (user_id, sender_id, type, title, content)
      VALUES (?, ?, ?, ?, ?)
    `, [req.userId, null, 'ai_advice', `你的學習${typeLabel}已出爐！ 📊`, `已成功統整你自 ${startStr} 起的學習表現並生成 AI 分析，快點進查看吧！`]);

    return res.status(201).json({
      message: '報告生成成功',
      reportId: result.lastID,
      report: {
        reportId: result.lastID,
        reportType,
        startDate: startStr,
        endDate: endStr,
        totalDuration: totalDurationMins,
        favoriteSubject,
        wastedDuration: wastedDurationMins,
        streakDays,
        goalMetRate,
        aiSummary
      }
    });
  } catch (error) {
    console.error('Generate report error:', error);
    return res.status(500).json({ message: '生成報告時伺服器發生錯誤' });
  }
});

// 3. Get single report details
router.get('/:id', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const report = await db.get(`
      SELECT report_id as reportId, report_type as reportType, start_date as startDate,
             end_date as endDate, total_duration as totalDuration, favorite_subject as favoriteSubject,
             wasted_duration as wastedDuration, streak_days as streakDays, goal_met_rate as goalMetRate,
             ai_summary as aiSummary, created_at as createdAt
      FROM learning_reports
      WHERE report_id = ? AND user_id = ?
    `, [id, req.userId]);

    if (!report) {
      return res.status(404).json({ message: '找不到此報告' });
    }

    return res.json(report);
  } catch (error) {
    console.error('Get report detail error:', error);
    return res.status(500).json({ message: '獲取報告詳情時伺服器發生錯誤' });
  }
});

export default router;

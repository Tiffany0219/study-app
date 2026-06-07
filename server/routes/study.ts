import { Router, Response } from 'express';
import { db } from '../db.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// Save Study Record (and reward user EXP)
router.post('/records', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const { subject, duration, startTime, endTime, status } = req.body;

  if (!subject || duration === undefined || !startTime || !endTime || !status) {
    return res.status(400).json({ message: '請填寫所有必要欄位 (科目、時長、開始時間、結束時間、狀態)' });
  }

  try {
    // 1. Insert record
    const result = await db.run(
      'INSERT INTO study_records (user_id, subject, duration, start_time, end_time, status) VALUES (?, ?, ?, ?, ?, ?)',
      [req.userId, subject, duration, startTime, endTime, status]
    );

    const recordId = result.lastID;

    // Double write to timeline_activities if completed
    if (status === 'completed') {
      try {
        await db.run(
          `INSERT INTO timeline_activities (user_id, activity_name, category, start_time, end_time, duration, note) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [req.userId, `專注讀書: ${subject}`, 'study', startTime, endTime, duration, '由專注計時器自動記錄']
        );
      } catch (timelineError) {
        console.error('Failed to double-write to timeline_activities:', timelineError);
        // Do not crash the study record request if timeline logging fails
      }
    }

    // 2. If completed, reward EXP
    let rewardExp = 0;
    let leveledUp = false;
    let oldLevel = 1;
    let newLevel = 1;
    let oldExp = 0;
    let newExp = 0;

    if (status === 'completed') {
      // 1 minute of study = 1 EXP (minimum 1 EXP if duration >= 30 seconds)
      rewardExp = Math.max(1, Math.floor(duration / 60));

      // Get user's current level & exp
      const user = await db.get('SELECT level, exp FROM users WHERE user_id = ?', [req.userId]);
      if (user) {
        oldLevel = user.level;
        oldExp = user.exp;
        newExp = oldExp + rewardExp;
        newLevel = oldLevel;

        // Level up logic: Level L needs L * 100 EXP to level up
        while (newExp >= newLevel * 100) {
          newExp -= newLevel * 100;
          newLevel += 1;
          leveledUp = true;
        }

        // Update user stats
        await db.run(
          'UPDATE users SET level = ?, exp = ? WHERE user_id = ?',
          [newLevel, newExp, req.userId]
        );
      }
    }

    return res.status(201).json({
      message: '讀書紀錄儲存成功',
      recordId,
      rewardExp,
      leveledUp,
      level: newLevel,
      exp: newExp,
    });
  } catch (error) {
    console.error('Save study record error:', error);
    return res.status(500).json({ message: '儲存讀書紀錄時伺服器發生錯誤' });
  }
});

// Get User's Study Records (raw history list)
router.get('/records', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const records = await db.all(
      'SELECT * FROM study_records WHERE user_id = ? ORDER BY created_at DESC',
      [req.userId]
    );
    return res.json(records);
  } catch (error) {
    console.error('Get study records error:', error);
    return res.status(500).json({ message: '獲取讀書紀錄時伺服器發生錯誤' });
  }
});

// Get Aggregated Stats
router.get('/stats', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    // 1. Get user info (for daily_goal)
    const user = await db.get('SELECT daily_goal FROM users WHERE user_id = ?', [req.userId]);
    const dailyGoalMinutes = user ? user.daily_goal : 60;

    // Helper functions for date calculations
    // SQLite uses UTC by default, but records are stored in YYYY-MM-DD HH:MM:SS format
    // For local time stats, we do matching based on strings or SQLite's date functions
    
    // Total Today (in minutes)
    const todayResult = await db.get(`
      SELECT SUM(duration) as total_duration 
      FROM study_records 
      WHERE user_id = ? AND status = 'completed' AND date(start_time, 'localtime') = date('now', 'localtime')
    `, [req.userId]);
    const todayMinutes = todayResult && todayResult.total_duration ? Math.round(todayResult.total_duration / 60) : 0;

    // Total This Week (in minutes) - starting Monday
    const weekResult = await db.get(`
      SELECT SUM(duration) as total_duration 
      FROM study_records 
      WHERE user_id = ? AND status = 'completed' AND date(start_time, 'localtime') >= date('now', 'localtime', '-6 days')
    `, [req.userId]);
    const weekMinutes = weekResult && weekResult.total_duration ? Math.round(weekResult.total_duration / 60) : 0;

    // Total This Month (in minutes)
    const monthResult = await db.get(`
      SELECT SUM(duration) as total_duration 
      FROM study_records 
      WHERE user_id = ? AND status = 'completed' AND strftime('%Y-%m', start_time, 'localtime') = strftime('%Y-%m', 'now', 'localtime')
    `, [req.userId]);
    const monthMinutes = monthResult && monthResult.total_duration ? Math.round(monthResult.total_duration / 60) : 0;

    // Total Cumulative (all time, in minutes)
    const allTimeResult = await db.get(`
      SELECT SUM(duration) as total_duration 
      FROM study_records 
      WHERE user_id = ? AND status = 'completed'
    `, [req.userId]);
    const allTimeMinutes = allTimeResult && allTimeResult.total_duration ? Math.round(allTimeResult.total_duration / 60) : 0;

    // Daily Study breakdown for the past 7 days
    const dailyBreakdown = [];
    for (let i = 6; i >= 0; i--) {
      const dayResult = await db.get(`
        SELECT SUM(duration) as total_duration 
        FROM study_records 
        WHERE user_id = ? AND status = 'completed' AND date(start_time, 'localtime') = date('now', 'localtime', ?)
      `, [req.userId, `-${i} days`]);
      
      const dayNameResult = await db.get(`SELECT date('now', 'localtime', ?) as date_str`, [`-${i} days`]);
      const dateStr = dayNameResult ? dayNameResult.date_str : '';
      
      // Get Day of Week
      const dayOfWeekMap = ['日', '一', '二', '三', '四', '五', '六'];
      const jsDate = new Date();
      jsDate.setDate(jsDate.getDate() - i);
      const dayName = dayOfWeekMap[jsDate.getDay()];

      dailyBreakdown.push({
        date: dateStr,
        dayName: `週${dayName}`,
        minutes: dayResult && dayResult.total_duration ? Math.round(dayResult.total_duration / 60) : 0
      });
    }

    // Subject breakdown
    const subjectResult = await db.all(`
      SELECT subject, SUM(duration) as total_duration 
      FROM study_records 
      WHERE user_id = ? AND status = 'completed'
      GROUP BY subject
      ORDER BY total_duration DESC
    `, [req.userId]);
    const subjectBreakdown = subjectResult.map(r => ({
      subject: r.subject,
      minutes: Math.round(r.total_duration / 60)
    }));

    // Streak calculation
    const allCompletedDates = await db.all(`
      SELECT DISTINCT date(start_time, 'localtime') as study_date 
      FROM study_records 
      WHERE user_id = ? AND status = 'completed' AND duration >= 60
      ORDER BY study_date DESC
    `, [req.userId]);

    let streak = 0;
    if (allCompletedDates.length > 0) {
      // Get today and yesterday date strings in YYYY-MM-DD
      const datesList = allCompletedDates.map(r => r.study_date);
      
      const todayStrResult = await db.get(`SELECT date('now', 'localtime') as d`);
      const yesterdayStrResult = await db.get(`SELECT date('now', 'localtime', '-1 day') as d`);
      const todayStr = todayStrResult?.d;
      const yesterdayStr = yesterdayStrResult?.d;

      // Streak is active if user studied today or yesterday
      if (datesList.includes(todayStr) || datesList.includes(yesterdayStr)) {
        streak = 1;
        // Start counting back
        let currentRef = datesList.includes(todayStr) ? new Date(todayStr) : new Date(yesterdayStr);
        
        while (true) {
          // Subtract 1 day
          currentRef.setDate(currentRef.getDate() - 1);
          const refStr = currentRef.toISOString().split('T')[0];
          
          if (datesList.includes(refStr)) {
            streak++;
          } else {
            break;
          }
        }
      }
    }

    return res.json({
      dailyGoalMinutes,
      todayMinutes,
      weekMinutes,
      monthMinutes,
      allTimeMinutes,
      streak,
      dailyBreakdown,
      subjectBreakdown
    });
  } catch (error) {
    console.error('Get study stats error:', error);
    return res.status(500).json({ message: '獲取讀書統計時伺服器發生錯誤' });
  }
});

export default router;

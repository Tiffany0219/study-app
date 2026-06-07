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

// Get Heatmap Data (completed focus sessions in past 365 days)
router.get('/heatmap', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    const records = await db.all(`
      SELECT date(start_time, 'localtime') as dateStr, SUM(duration) as totalDuration
      FROM study_records
      WHERE user_id = ? AND status = 'completed' AND date(start_time, 'localtime') >= date('now', 'localtime', '-365 days')
      GROUP BY dateStr
    `, [req.userId]);

    const data: Record<string, number> = {};
    records.forEach(r => {
      data[r.dateStr] = Math.round(r.totalDuration / 60);
    });

    return res.json(data);
  } catch (error) {
    console.error('Get study heatmap error:', error);
    return res.status(500).json({ message: '獲取學習熱力圖數據時伺服器發生錯誤' });
  }
});

// Get User Achievements Status
router.get('/achievements', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  try {
    // 1. Get total study minutes
    const sumResult = await db.get(
      'SELECT SUM(duration) as totalDuration FROM study_records WHERE user_id = ? AND status = "completed"',
      [req.userId]
    );
    const totalMinutes = sumResult && sumResult.totalDuration ? Math.round(sumResult.totalDuration / 60) : 0;

    // 2. Get checkin count
    const checkinResult = await db.get(
      'SELECT COUNT(checkin_id) as checkinCount FROM daily_checkins WHERE user_id = ?',
      [req.userId]
    );
    const totalCheckins = checkinResult ? checkinResult.checkinCount : 0;

    // 3. Get cheers sent
    const cheersResult = await db.get(
      'SELECT COUNT(notification_id) as cheersCount FROM notifications WHERE sender_id = ? AND type = "encourage"',
      [req.userId]
    );
    const totalCheers = cheersResult ? cheersResult.cheersCount : 0;

    // 4. Calculate streak (same logic as stats)
    const allCompletedDates = await db.all(`
      SELECT DISTINCT date(start_time, 'localtime') as study_date 
      FROM study_records 
      WHERE user_id = ? AND status = 'completed' AND duration >= 60
      ORDER BY study_date DESC
    `, [req.userId]);

    let streak = 0;
    if (allCompletedDates.length > 0) {
      const datesList = allCompletedDates.map(r => r.study_date);
      const todayStrResult = await db.get(`SELECT date('now', 'localtime') as d`);
      const yesterdayStrResult = await db.get(`SELECT date('now', 'localtime', '-1 day') as d`);
      const todayStr = todayStrResult?.d;
      const yesterdayStr = yesterdayStrResult?.d;

      if (datesList.includes(todayStr) || datesList.includes(yesterdayStr)) {
        streak = 1;
        let currentRef = datesList.includes(todayStr) ? new Date(todayStr) : new Date(yesterdayStr);
        while (true) {
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

    // 5. Early bird check (start_time hour 05 to 08 local time)
    const earlyBirdResult = await db.get(`
      SELECT 1 FROM study_records 
      WHERE user_id = ? AND status = 'completed' 
        AND strftime('%H', start_time, 'localtime') >= '05' 
        AND strftime('%H', start_time, 'localtime') < '08' 
      LIMIT 1
    `, [req.userId]);
    const isEarlyBird = !!earlyBirdResult;

    // 6. Night owl check (start_time hour 22 to 02 local time)
    const nightOwlResult = await db.get(`
      SELECT 1 FROM study_records 
      WHERE user_id = ? AND status = 'completed' 
        AND (strftime('%H', start_time, 'localtime') >= '22' 
             OR strftime('%H', start_time, 'localtime') < '02') 
      LIMIT 1
    `, [req.userId]);
    const isNightOwl = !!nightOwlResult;

    // 7. Define Badges list
    const badges = [
      {
        id: 'beginner',
        name: '專注初學者 🌟',
        desc: '累計專注時間達到 60 分鐘',
        condition: '累計專注 >= 60 分鐘',
        unlocked: totalMinutes >= 60,
        currentProgress: totalMinutes,
        targetProgress: 60,
        icon: '⭐️'
      },
      {
        id: 'master',
        name: '專注大師 🏆',
        desc: '累計專注時間達到 600 分鐘',
        condition: '累計專注 >= 600 分鐘',
        unlocked: totalMinutes >= 600,
        currentProgress: totalMinutes,
        targetProgress: 600,
        icon: '👑'
      },
      {
        id: 'overlord',
        name: '專注帝王 👑',
        desc: '累計專注時間達到 3000 分鐘',
        condition: '累計專注 >= 3000 分鐘',
        unlocked: totalMinutes >= 3000,
        currentProgress: totalMinutes,
        targetProgress: 3000,
        icon: '⚡'
      },
      {
        id: 'persistence_3',
        name: '持之以恆 ⏳',
        desc: '連續學習天數達到 3 天',
        condition: '連續專注 >= 3 天',
        unlocked: streak >= 3,
        currentProgress: streak,
        targetProgress: 3,
        icon: '🔥'
      },
      {
        id: 'persistence_7',
        name: '深耕讀書王 🌳',
        desc: '連續學習天數達到 7 天',
        condition: '連續專注 >= 7 天',
        unlocked: streak >= 7,
        currentProgress: streak,
        targetProgress: 7,
        icon: '🌳'
      },
      {
        id: 'checkin_master',
        name: '打卡達人 📷',
        desc: '累計打卡上傳紀錄達到 5 次',
        condition: '累積打卡 >= 5 次',
        unlocked: totalCheckins >= 5,
        currentProgress: totalCheckins,
        targetProgress: 5,
        icon: '✨'
      },
      {
        id: 'social_core',
        name: '社交核心 🤝',
        desc: '在線上自習室對小隊成員送出加油打氣達到 10 次',
        condition: '自習室打氣 >= 10 次',
        unlocked: totalCheers >= 10,
        currentProgress: totalCheers,
        targetProgress: 10,
        icon: '☕'
      },
      {
        id: 'early_bird',
        name: '早起鳥兒 🌅',
        desc: '曾在早上 5:00 至 8:00 之間開始專注學習',
        condition: '清晨專注過 1 次',
        unlocked: isEarlyBird,
        currentProgress: isEarlyBird ? 1 : 0,
        targetProgress: 1,
        icon: '🌅'
      },
      {
        id: 'night_owl',
        name: '深夜貓頭鷹 🦉',
        desc: '曾在深夜 22:00 至凌晨 2:00 之間開始專注學習',
        condition: '深夜專注過 1 次',
        unlocked: isNightOwl,
        currentProgress: isNightOwl ? 1 : 0,
        targetProgress: 1,
        icon: '🦉'
      }
    ];

    return res.json({ badges, stats: { totalMinutes, totalCheckins, totalCheers, streak } });
  } catch (error) {
    console.error('Get user achievements error:', error);
    return res.status(500).json({ message: '獲取成就徽章時伺服器發生錯誤' });
  }
});

export default router;

import { Router, Response } from 'express';
import { db } from '../db.js';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';

const router = Router();

// 1. Get today's review status
router.get('/today', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const d = new Date();
  const todayStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;

  try {
    const review = await db.get(
      'SELECT review_id as reviewId, review_date as reviewDate, rating, reflection, ai_advice as aiAdvice FROM daily_reviews WHERE user_id = ? AND review_date = ?',
      [req.userId, todayStr]
    );
    return res.json({ reviewed: !!review, review: review || null });
  } catch (error) {
    console.error('Get today review error:', error);
    return res.status(500).json({ message: '獲取每日回顧狀態時伺服器發生錯誤' });
  }
});

// 2. Submit today's review (Upsert rating and reflection)
router.post('/', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const { rating, reflection } = req.body;

  if (rating === undefined || typeof rating !== 'number' || rating < 1 || rating > 5) {
    return res.status(400).json({ message: '請提供 1 至 5 星的評分' });
  }

  const d = new Date();
  const todayStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;

  try {
    const existing = await db.get(
      'SELECT review_id, ai_advice FROM daily_reviews WHERE user_id = ? AND review_date = ?',
      [req.userId, todayStr]
    );

    if (existing) {
      await db.run(
        'UPDATE daily_reviews SET rating = ?, reflection = ? WHERE review_id = ?',
        [rating, reflection || '', existing.review_id]
      );
    } else {
      await db.run(
        'INSERT INTO daily_reviews (user_id, review_date, rating, reflection, ai_advice) VALUES (?, ?, ?, ?, ?)',
        [req.userId, todayStr, rating, reflection || '', '']
      );
    }

    const review = await db.get(
      'SELECT review_id as reviewId, review_date as reviewDate, rating, reflection, ai_advice as aiAdvice FROM daily_reviews WHERE user_id = ? AND review_date = ?',
      [req.userId, todayStr]
    );

    return res.status(201).json({
      message: '今日回顧送出成功',
      review
    });
  } catch (error) {
    console.error('Post review error:', error);
    return res.status(500).json({ message: '提交每日回顧時伺服器發生錯誤' });
  }
});

// 3. Generate AI Advice based on timeline activities
router.post('/ai-advice', authenticateToken as any, async (req: AuthRequest, res: Response) => {
  const d = new Date();
  const todayStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;

  try {
    // 1. Fetch today's activities
    const activities = await db.all(
      `SELECT category, duration, activity_name as activityName 
       FROM timeline_activities 
       WHERE user_id = ? AND date(start_time, 'localtime') = date(?)`,
      [req.userId, todayStr]
    );

    // 2. Aggregate category durations (in minutes)
    let studyMins = 0;
    let restMins = 0;
    let playMins = 0;
    let wasteMins = 0;

    activities.forEach(act => {
      const mins = Math.round(act.duration / 60);
      if (['study', 'class', 'homework'].includes(act.category)) {
        studyMins += mins;
      } else if (act.category === 'rest') {
        restMins += mins;
      } else if (act.category === 'entertainment') {
        playMins += mins;
      } else if (act.category === 'wasted') {
        wasteMins += mins;
      }
    });

    const totalLogged = studyMins + restMins + playMins + wasteMins;

    // 3. Generate Advice (Gemini API or local rules engine fallback)
    let advice = '';
    const geminiKey = process.env.GEMINI_API_KEY;

    if (geminiKey) {
      console.log('[AI Review] Found Gemini API Key, generating recommendations...');
      try {
        const prompt = `您是一位溫柔的學習教練與時間管理大師。以下是學生今天的時間分配數據（單位：分鐘）：
- 學習與作業時長 (Study/Homework/Class)：${studyMins} 分鐘
- 休息時間 (Rest)：${restMins} 分鐘
- 娛樂休閒 (Entertainment)：${playMins} 分鐘
- 浪費或無效時間 (Wasted)：${wasteMins} 分鐘

今日詳細活動清單：
${activities.map(a => `- [${a.category}] ${a.activityName} (${Math.round(a.duration / 60)}分鐘)`).join('\n')}

請根據這份數據，提供簡短、具備鼓勵性且極具操作性的「明日時間管理改善建議」（限 150 字以內，語氣親切，請使用中文，不要使用 Markdown 標題，可以直接寫出建議）。`;

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
          advice = apiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
        } else {
          console.warn('[AI Review] Gemini API returned error status:', response.status);
        }
      } catch (geminiError) {
        console.error('[AI Review] Gemini fetch failed:', geminiError);
      }
    }

    // Fallback to local rule engine if Gemini is disabled or failed
    if (!advice.trim()) {
      console.log('[AI Review] Using offline Rule-Based Time Advisory engine...');
      if (totalLogged === 0) {
        advice = '今天還沒有在時間線記住任何活動喔。明天建議隨手記下您的作息，哪怕只是 10 分鐘的專注，也是邁向自律的第一步！讓我們一起加油！';
      } else if (studyMins < 60) {
        advice = `今天專注學習的時間偏短（共計 ${studyMins} 分鐘）。明天的關鍵是降低專注門檻！建議使用番茄工作法（讀書 25 分鐘、休息 5 分鐘），在上午先完成 1 個番茄鐘，慢慢累積專注力。`;
      } else if (wasteMins > 60 || wasteMins > studyMins) {
        advice = `今天無效或浪費的時間（共計 ${wasteMins} 分鐘）偏多喔。明天挑戰第一步：在學習前把手機關機並收進抽屜，使用靜音模式，建立一個零干擾的讀書儀式感。`;
      } else if (studyMins > 180 && restMins < 20) {
        advice = `今天專注時長相當長（共計 ${studyMins} 分鐘），非常充實！但休息時間偏少。為了避免大腦疲勞，明天請強制在每 50 分鐘學習後起身走動或喝水 10 分鐘，拉長你的自律續航力。`;
      } else if (studyMins >= 120 && wasteMins <= 30 && restMins >= 30) {
        advice = `今天做得太棒了！專注時長達 ${studyMins} 分鐘，且休息適度、干擾極低。明天請維持目前的良好節奏，建議在精神最好的早晨時段優先處理最難的任務。`;
      } else {
        advice = `今天完成了 ${studyMins} 分鐘的學習與專注，並且維持了適度的放鬆。明天建議固定在相似的時段開始專注，將自律轉化為不費力的大腦習慣！`;
      }
    }

    advice = advice.trim();

    // 4. Save/Update advice inside SQLite database
    const existing = await db.get(
      'SELECT review_id FROM daily_reviews WHERE user_id = ? AND review_date = ?',
      [req.userId, todayStr]
    );

    if (existing) {
      await db.run(
        'UPDATE daily_reviews SET ai_advice = ? WHERE review_id = ?',
        [advice, existing.review_id]
      );
    } else {
      await db.run(
        'INSERT INTO daily_reviews (user_id, review_date, rating, reflection, ai_advice) VALUES (?, ?, ?, ?, ?)',
        [req.userId, todayStr, 0, '', advice]
      );
    }

    return res.json({
      message: 'AI 建議生成成功',
      aiAdvice: advice
    });
  } catch (error) {
    console.error('AI Advice generator error:', error);
    return res.status(500).json({ message: '生成時間管理建議時伺服器發生錯誤' });
  }
});

export default router;

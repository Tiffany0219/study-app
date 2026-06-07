import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserStatusCard } from '../components/UserStatusCard';
import { StudyProgressCard } from '../components/StudyProgressCard';
import { Play, Sparkles, CheckSquare, Target, Trash2, Plus, Camera, X, Image, Star, BookOpen, Brain, Clock } from 'lucide-react';

interface PersonalTodo {
  todoId: number;
  todoText: string;
  isCompleted: number;
  targetDate: string;
}

export const HomePage: React.FC = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState({
    todayMinutes: 0,
    dailyGoalMinutes: 60,
    streak: 0,
  });
  const [personalTodos, setPersonalTodos] = useState<PersonalTodo[]>([]);
  const [newTodoInput, setNewTodoInput] = useState('');
  const [loading, setLoading] = useState(true);

  // Timeline and Review States
  const [timelineActivities, setTimelineActivities] = useState<any[]>([]);
  const [todayReview, setTodayReview] = useState<{
    reviewed: boolean;
    review: { rating: number; reflection: string; aiAdvice: string } | null;
  }>({ reviewed: false, review: null });
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewReflection, setReviewReflection] = useState('');
  const [generatingAdvice, setGeneratingAdvice] = useState(false);

  // Daily Checkin States
  const [checkinData, setCheckinData] = useState<{
    checkedIn: boolean;
    photo: string;
    note: string;
    createdAt?: string;
  }>({ checkedIn: false, photo: '', note: '' });
  const [selectedPhoto, setSelectedPhoto] = useState<string>('');
  const [checkinNoteInput, setCheckinNoteInput] = useState('');
  const [checkinLoading, setCheckinLoading] = useState(false);
  const checkinFileInputRef = useRef<HTMLInputElement>(null);

  const fetchCheckinToday = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/checkins/today', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.checkedIn) {
          setCheckinData({
            checkedIn: true,
            photo: data.checkin.photo,
            note: data.checkin.note,
            createdAt: data.checkin.createdAt
          });
        } else {
          setCheckinData({ checkedIn: false, photo: '', note: '' });
        }
      }
    } catch (error) {
      console.error('Failed to load checkin data:', error);
    }
  };

  const handleCheckinFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('請選擇圖片檔案');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 500;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setSelectedPhoto(dataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleCheckinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPhoto || !token) return;

    setCheckinLoading(true);
    try {
      const res = await fetch('/api/checkins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          photo: selectedPhoto,
          note: checkinNoteInput.trim()
        })
      });

      if (res.ok) {
        await fetchCheckinToday();
        setSelectedPhoto('');
        setCheckinNoteInput('');
      } else {
        const data = await res.json();
        alert(data.message || '打卡失敗');
      }
    } catch (err) {
      console.error(err);
      alert('打卡連線異常');
    } finally {
      setCheckinLoading(false);
    }
  };

  const formatCheckinTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      const hours = d.getHours().toString().padStart(2, '0');
      const minutes = d.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    } catch {
      return '';
    }
  };

  const fetchStats = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/study/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setStats({
          todayMinutes: data.todayMinutes,
          dailyGoalMinutes: data.dailyGoalMinutes,
          streak: data.streak,
        });
      }
    } catch (error) {
      console.error('Failed to load home page stats:', error);
    }
  };

  const fetchPersonalTodos = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/todos', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPersonalTodos(data);
      }
    } catch (error) {
      console.error('Failed to load personal todos:', error);
    }
  };

  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  };

  const fetchTimeline = async () => {
    if (!token) return;
    try {
      const res = await fetch(`/api/timeline?date=${getTodayStr()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTimelineActivities(data);
      }
    } catch (error) {
      console.error('Failed to load today timeline:', error);
    }
  };

  const fetchTodayReview = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/reviews/today', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTodayReview(data);
        if (data.reviewed && data.review) {
          setReviewRating(data.review.rating);
          setReviewReflection(data.review.reflection || '');
        }
      }
    } catch (error) {
      console.error('Failed to load review status:', error);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          rating: reviewRating,
          reflection: reviewReflection.trim()
        })
      });

      if (res.ok) {
        setShowReviewModal(false);
        setGeneratingAdvice(true);
        try {
          const adviceRes = await fetch('/api/reviews/ai-advice', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          if (!adviceRes.ok) {
            console.warn('AI advice creation failed during auto generation');
          }
        } catch (err) {
          console.error('AI advice error during auto generation:', err);
        } finally {
          setGeneratingAdvice(false);
        }
        await loadData();
      } else {
        const data = await res.json();
        alert(data.message || '提交回顧失敗');
      }
    } catch (err) {
      console.error(err);
      alert('回顧連線異常');
    }
  };

  const handleRequestAiAdviceOnly = async () => {
    if (!token || generatingAdvice) return;
    setGeneratingAdvice(true);
    try {
      const res = await fetch('/api/reviews/ai-advice', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        await fetchTodayReview();
      } else {
        const data = await res.json();
        alert(data.message || '生成建議失敗');
      }
    } catch (err) {
      console.error(err);
      alert('生成建議連線異常');
    } finally {
      setGeneratingAdvice(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    await Promise.all([
      fetchStats(),
      fetchPersonalTodos(),
      fetchCheckinToday(),
      fetchTimeline(),
      fetchTodayReview()
    ]);
    setLoading(false);
  };

  useEffect(() => {
    if (token) {
      loadData();
    }
  }, [token]);

  const handleAddPersonalTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTodoInput.trim() || !token) return;

    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ todoText: newTodoInput.trim() })
      });

      if (res.ok) {
        setNewTodoInput('');
        fetchPersonalTodos();
      } else {
        const data = await res.json();
        alert(data.message || '新增待辦項目失敗');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTogglePersonalTodo = async (todoId: number, currentStatus: number) => {
    if (!token) return;
    const nextStatus = currentStatus === 1 ? 0 : 1;

    try {
      const res = await fetch(`/api/todos/${todoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isCompleted: nextStatus })
      });

      if (res.ok) {
        fetchPersonalTodos();
      } else {
        const data = await res.json();
        alert(data.message || '更新狀態失敗');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePersonalTodo = async (todoId: number) => {
    if (!token) return;
    const proceed = window.confirm('確定要刪除此待辦項目嗎？');
    if (!proceed) return;

    try {
      const res = await fetch(`/api/todos/${todoId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        fetchPersonalTodos();
      } else {
        const data = await res.json();
        alert(data.message || '刪除項目失敗');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Focus Achievements Quests list
  const achievementsList = [
    { id: 1, name: '完成 25 分鐘讀書', reward: '25 EXP', progress: `${Math.min(stats.todayMinutes, 25)} / 25`, done: stats.todayMinutes >= 25 },
    { id: 2, name: '完成 1 次專注計時', reward: '10 EXP', progress: stats.todayMinutes > 0 ? '1 / 1' : '0 / 1', done: stats.todayMinutes > 0 },
    { id: 3, name: '今日讀書達成目標', reward: '50 EXP', progress: `${stats.todayMinutes} / ${stats.dailyGoalMinutes}`, done: stats.todayMinutes >= stats.dailyGoalMinutes && stats.dailyGoalMinutes > 0 },
  ];

  // 1. Calculate timeline statistics
  let studyMins = 0;
  let restMins = 0;
  let playMins = 0;
  let wasteMins = 0;

  timelineActivities.forEach(act => {
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

  const totalMins = studyMins + restMins + playMins + wasteMins;

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <span>載入專注狀態中...</span>
      </div>
    );
  }

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* 1. Profile Status Header */}
      <UserStatusCard />

      <div className="responsive-layout-grid-left-main" style={{ marginTop: '18px' }}>
        {/* 主要內容欄 (Left Column) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 2. Today's focus completion progress circle & statistics grid */}
          <StudyProgressCard 
            todayMinutes={stats.todayMinutes}
            dailyGoalMinutes={stats.dailyGoalMinutes}
            streak={stats.streak}
          />

          {/* 2.1 Today's Timeline category ratios */}
          <div className="glass-card" style={{ ...styles.tasksCard, marginBottom: 0 }}>
            <div style={styles.tasksHeader}>
              <div style={styles.tasksTitleBlock}>
                <BookOpen size={18} color="#f97316" />
                <h3 style={styles.tasksTitle}>今日時間分配佔比</h3>
              </div>
              <span style={styles.taskBadge}>作息手帳</span>
            </div>
            
            {totalMins > 0 ? (
              <div>
                <div style={styles.ratioBarContainer}>
                  {studyMins > 0 && <div style={{ ...styles.ratioSegment, background: '#fcd34d', width: `${(studyMins / totalMins) * 100}%` }} title={`學習: ${studyMins}分鐘`} />}
                  {restMins > 0 && <div style={{ ...styles.ratioSegment, background: '#fdba74', width: `${(restMins / totalMins) * 100}%` }} title={`休息: ${restMins}分鐘`} />}
                  {playMins > 0 && <div style={{ ...styles.ratioSegment, background: '#fecaca', width: `${(playMins / totalMins) * 100}%` }} title={`娛樂: ${playMins}分鐘`} />}
                  {wasteMins > 0 && <div style={{ ...styles.ratioSegment, background: '#ecdcb9', width: `${(wasteMins / totalMins) * 100}%` }} title={`浪費: ${wasteMins}分鐘`} />}
                </div>
                
                <div style={styles.ratioLegendGrid}>
                  <div style={styles.legendItem}>
                    <span style={{ ...styles.legendDot, background: '#fcd34d' }} />
                    <span style={styles.legendLabel}>學習/上課/作業: {studyMins} 分鐘 ({Math.round((studyMins / totalMins) * 100)}%)</span>
                  </div>
                  <div style={styles.legendItem}>
                    <span style={{ ...styles.legendDot, background: '#fdba74' }} />
                    <span style={styles.legendLabel}>放空休息: {restMins} 分鐘 ({Math.round((restMins / totalMins) * 100)}%)</span>
                  </div>
                  <div style={styles.legendItem}>
                    <span style={{ ...styles.legendDot, background: '#fecaca' }} />
                    <span style={styles.legendLabel}>休閒娛樂: {playMins} 分鐘 ({Math.round((playMins / totalMins) * 100)}%)</span>
                  </div>
                  <div style={styles.legendItem}>
                    <span style={{ ...styles.legendDot, background: '#ecdcb9' }} />
                    <span style={styles.legendLabel}>浪費時間: {wasteMins} 分鐘 ({Math.round((wasteMins / totalMins) * 100)}%)</span>
                  </div>
                </div>
              </div>
            ) : (
              <div style={styles.ratioBarEmpty}>
                <span style={{ fontSize: '24px' }}>⏰</span>
                <p style={{ marginTop: '8px', fontWeight: 800 }}>今天還沒有任何時間線記錄喔！</p>
                <p style={{ fontSize: '11px', color: '#a89280', marginTop: '4px', lineHeight: 1.4 }}>
                  請前往「時間線」記錄日常活動，或是啟動專注計時器，系統將會自動為您畫出時間分配比例！
                </p>
              </div>
            )}
          </div>

          {/* 2.2 Today's Review & AI Tomorrow Management Advice */}
          <div className="glass-card" style={{ ...styles.tasksCard, marginBottom: 0 }}>
            <div style={styles.tasksHeader}>
              <div style={styles.tasksTitleBlock}>
                <Brain size={18} color="#ea580c" />
                <h3 style={styles.tasksTitle}>今日回顧與 AI 建議</h3>
              </div>
              <span style={styles.achievementBadge}>明日建議</span>
            </div>

            {!todayReview.reviewed ? (
              <div style={styles.reviewPromptContainer}>
                <p style={styles.reviewPromptText}>
                  📚 今天學習效率與生活作息滿意嗎？花 1 分鐘進行今日評分與反思心得，AI 將為您分析今日時間線，提供明日時間管理的精準優化建議！
                </p>
                <button 
                  onClick={() => {
                    setReviewRating(5);
                    setReviewReflection('');
                    setShowReviewModal(true);
                  }}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '10px', fontSize: '13px', borderRadius: '10px' }}
                >
                  ✍️ 填寫今日回顧
                </button>
              </div>
            ) : (
              <div style={styles.reviewActiveContainer}>
                <div style={styles.reviewUserCard}>
                  <div style={styles.reviewStarsRow}>
                    <span style={styles.reviewUserLabel}>今日自評：</span>
                    {Array.from({ length: 5 }).map((_, idx) => (
                      <Star 
                        key={idx}
                        size={16}
                        fill={idx < todayReview.review!.rating ? '#f59e0b' : 'none'}
                        color={idx < todayReview.review!.rating ? '#f59e0b' : '#ecdcb9'}
                      />
                    ))}
                  </div>
                  {todayReview.review!.reflection && (
                    <p style={styles.reviewReflectionText}>
                      <strong>我的反思心得：</strong>{todayReview.review!.reflection}
                    </p>
                  )}
                </div>

                {generatingAdvice ? (
                  <div style={styles.aiLoadingBlock}>
                    <div style={styles.spinner} />
                    <span>AI 正在分析時間線並生成明日管理建議...</span>
                  </div>
                ) : todayReview.review!.aiAdvice ? (
                  <div style={styles.aiAdviceBlock}>
                    <div style={styles.aiAdviceHeader}>
                      <Sparkles size={14} color="#ca8a04" />
                      <span>AI 明日時間管理建議：</span>
                    </div>
                    <p style={styles.aiAdviceText}>
                      {todayReview.review!.aiAdvice}
                    </p>
                  </div>
                ) : (
                  <div style={styles.reviewPromptContainer}>
                    <p style={{ ...styles.reviewPromptText, color: '#a89280', fontSize: '12px' }}>
                      目前尚未生成明日管理建議。
                    </p>
                    <button 
                      onClick={handleRequestAiAdviceOnly}
                      className="btn btn-outline"
                      style={{ width: '100%', padding: '8px', fontSize: '12px', borderRadius: '8px' }}
                    >
                      🔮 生成 AI 明日管理建議
                    </button>
                  </div>
                )}

                <button 
                  onClick={() => {
                    setReviewRating(todayReview.review!.rating);
                    setReviewReflection(todayReview.review!.reflection || '');
                    setShowReviewModal(true);
                  }}
                  style={styles.reviewEditLink}
                >
                  修改今日評分與回顧
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 側邊欄 (Right Column) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* 3. Quick Focus CTA Button */}
          <div style={{ ...styles.ctaCard, marginBottom: 0 }}>
            <div style={styles.ctaInfo}>
              <Sparkles size={18} color="#f97316" />
              <div style={styles.ctaTextCol}>
                <h4 style={styles.ctaTitle}>準備好專注了嗎？</h4>
                <p style={styles.ctaDesc}>選擇科目，啟動你的專注計時器。</p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/timer')} 
              style={styles.quickStartBtn}
              className="btn btn-primary"
            >
              <Play size={16} fill="#4a3728" />
              <span>開始讀書</span>
            </button>
          </div>

          {/* 3.5. Today's Daily Checkin Card */}
          <div className="glass-card" style={{ ...styles.tasksCard, marginBottom: 0 }}>
            <div style={styles.tasksHeader}>
              <div style={styles.tasksTitleBlock}>
                <Camera size={18} color="#f97316" />
                <h3 style={styles.tasksTitle}>今日讀書打卡</h3>
              </div>
              <span style={styles.taskBadge}>每日打卡</span>
            </div>

            {!checkinData.checkedIn && !selectedPhoto ? (
              <div 
                onClick={() => checkinFileInputRef.current?.click()}
                style={styles.checkinUploadPlaceholder}
              >
                <Camera size={28} color="#7c6350" />
                <span style={styles.checkinUploadText}>點選此處上傳今天的讀書照片</span>
                <span style={styles.checkinUploadSubtext}>上傳後可填寫今日心得打卡</span>
              </div>
            ) : !checkinData.checkedIn && selectedPhoto ? (
              <div>
                <div style={styles.checkinPreviewContainer}>
                  <img src={selectedPhoto} alt="Selected checkin" style={styles.checkinPreviewImage} />
                  <button 
                    type="button" 
                    onClick={() => setSelectedPhoto('')}
                    style={styles.checkinCancelPhotoBtn}
                  >
                    <X size={14} />
                  </button>
                </div>
                <form onSubmit={handleCheckinSubmit} style={styles.checkinForm}>
                  <input
                    type="text"
                    value={checkinNoteInput}
                    onChange={(e) => setCheckinNoteInput(e.target.value)}
                    placeholder="寫點今天的心得（例如：今日讀完微積分第3章！加強練習）..."
                    style={styles.checkinNoteInput}
                  />
                  <button 
                    type="submit" 
                    disabled={checkinLoading}
                    style={styles.checkinSubmitBtn}
                    className="btn btn-primary"
                  >
                    {checkinLoading ? '打卡中...' : '發送今日打卡'}
                  </button>
                </form>
              </div>
            ) : (
              <div style={styles.checkedInContainer}>
                <img src={checkinData.photo} alt="Today's checkin" style={styles.checkinPhoto} />
                <div style={styles.checkedInInfo}>
                  {checkinData.note && (
                    <p style={styles.checkinNote}>📝 {checkinData.note}</p>
                  )}
                  <div style={styles.checkinMetaRow}>
                    <span style={styles.checkinTime}>打卡時間：{formatCheckinTime(checkinData.createdAt)}</span>
                    <button 
                      type="button"
                      onClick={() => {
                        setSelectedPhoto(checkinData.photo);
                        setCheckinNoteInput(checkinData.note);
                        setCheckinData(prev => ({ ...prev, checkedIn: false }));
                      }}
                      style={styles.reCheckinBtn}
                    >
                      重新打卡
                    </button>
                  </div>
                </div>
              </div>
            )}

            <input
              type="file"
              ref={checkinFileInputRef}
              onChange={handleCheckinFileChange}
              accept="image/*"
              style={{ display: 'none' }}
            />
          </div>

          {/* 4. Personal Daily Todo Plan Card */}
          <div className="glass-card" style={{ ...styles.tasksCard, marginBottom: 0 }}>
            <div style={styles.tasksHeader}>
              <div style={styles.tasksTitleBlock}>
                <CheckSquare size={18} color="#fb923c" />
                <h3 style={styles.tasksTitle}>今日讀書計畫</h3>
              </div>
              <span style={styles.taskBadge}>個人計畫</span>
            </div>

            <div style={styles.tasksList}>
              {personalTodos.length === 0 ? (
                <span style={styles.todoEmptyText}>今日尚無安排個人讀書計畫</span>
              ) : (
                personalTodos.map(todo => (
                  <div key={todo.todoId} style={styles.taskItem}>
                    <div style={styles.taskLeft}>
                      <label style={styles.todoLabel}>
                        <input
                          type="checkbox"
                          checked={todo.isCompleted === 1}
                          onChange={() => handleTogglePersonalTodo(todo.todoId, todo.isCompleted)}
                          style={styles.todoCheckbox}
                        />
                        <span style={{
                          ...styles.taskName,
                          textDecoration: todo.isCompleted === 1 ? 'line-through' : 'none',
                          color: todo.isCompleted === 1 ? '#a89280' : '#4a3728'
                        }}>
                          {todo.todoText}
                        </span>
                      </label>
                    </div>
                    <button 
                      onClick={() => handleDeletePersonalTodo(todo.todoId)}
                      style={styles.todoDeleteBtn}
                      title="刪除待辦"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add Todo Input form */}
            <form onSubmit={handleAddPersonalTodo} style={styles.todoForm}>
              <input
                type="text"
                value={newTodoInput}
                onChange={(e) => setNewTodoInput(e.target.value)}
                placeholder="新增今日的學習項目（例如：背單字 20 個）"
                style={styles.todoFormInput}
              />
              <button type="submit" style={styles.todoFormSubmitBtn}>
                <Plus size={14} />
                <span>新增</span>
              </button>
            </form>
          </div>

          {/* 5. Focus Achievements Quests Card */}
          <div className="glass-card" style={{ ...styles.tasksCard, marginBottom: 0 }}>
            <div style={styles.tasksHeader}>
              <div style={styles.tasksTitleBlock}>
                <Target size={18} color="#fbbf24" />
                <h3 style={styles.tasksTitle}>今日專注成就</h3>
              </div>
              <span style={styles.achievementBadge}>成就系統</span>
            </div>
            
            <div style={styles.tasksList}>
              {achievementsList.map(task => (
                <div key={task.id} style={{
                  ...styles.taskItem,
                  opacity: task.done ? 0.75 : 1
                }}>
                  <div style={styles.taskLeft}>
                    <div style={{
                      ...styles.checkbox,
                      borderColor: task.done ? '#4ade80' : '#ecdcb9',
                      background: task.done ? '#4ade80' : 'transparent',
                    }}>
                      {task.done && <span style={styles.checkMark}>✓</span>}
                    </div>
                    <div style={styles.taskTextBlock}>
                      <span style={{
                        ...styles.taskName,
                        textDecoration: task.done ? 'line-through' : 'none',
                        color: task.done ? '#a89280' : '#4a3728'
                      }}>
                        {task.name}
                      </span>
                      <span style={styles.taskExp}>{task.reward}</span>
                    </div>
                  </div>

                  <div style={styles.taskRight}>
                    <span style={{
                      ...styles.taskProgress,
                      color: task.done ? '#22c55e' : '#7c6350'
                    }}>
                      {task.progress}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* DIALOG MODAL FOR DAILY REVIEW */}
      {showReviewModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent} className="glass-card animate-slide-up">
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>今日打分與回顧反思</h3>
              <button onClick={() => setShowReviewModal(false)} style={styles.closeBtn}>
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleReviewSubmit} style={styles.modalForm}>
              <div className="form-group">
                <label className="form-label" style={{ display: 'block', marginBottom: '8px', fontWeight: 800 }}>
                  為今天的時間管理及學習效率打分：
                </label>
                <div style={{ display: 'flex', gap: '8px', margin: '8px 0 16px 0', justifyContent: 'center' }}>
                  {Array.from({ length: 5 }).map((_, idx) => {
                    const val = idx + 1;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setReviewRating(val)}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}
                      >
                        <Star 
                          size={32}
                          fill={val <= reviewRating ? '#f59e0b' : 'none'}
                          color={val <= reviewRating ? '#f59e0b' : '#ecdcb9'}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="reflection-text" style={{ fontWeight: 800, marginBottom: '6px', display: 'block' }}>
                  寫下今天的學習回顧與心得 (選填)：
                </label>
                <textarea
                  id="reflection-text"
                  value={reviewReflection}
                  onChange={(e) => setReviewReflection(e.target.value)}
                  rows={4}
                  placeholder="今天過得如何？有按照計畫走嗎？大腦效率好嗎？寫下一些反思吧，這有助於加深自律行為模式！"
                  style={{
                    width: '100%',
                    background: '#ffffff',
                    border: '2px solid #ecdcb9',
                    borderRadius: '12px',
                    padding: '12px',
                    color: '#4a3728',
                    fontSize: '13px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    outline: 'none'
                  }}
                />
              </div>

              <div style={styles.modalActions}>
                <button 
                  type="button" 
                  onClick={() => setShowReviewModal(false)}
                  className="btn btn-outline"
                  style={styles.modalCancel}
                >
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  送出並分析
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: '16px',
    color: '#7c6350',
    fontSize: '14px',
    fontWeight: 700,
  },
  spinner: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: '3px solid rgba(74, 55, 40, 0.15)',
    borderTopColor: '#fbbf24',
    animation: 'spin-slow 1s linear infinite',
  },
  ctaCard: {
    background: '#fffbeb',
    border: '2px solid #ecdcb9',
    borderRadius: '20px',
    padding: '18px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    gap: '16px',
    flexWrap: 'wrap' as const,
    boxShadow: '0 4px 12px rgba(139, 92, 26, 0.04)',
  },
  ctaInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  ctaTextCol: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },
  ctaTitle: {
    fontSize: '15px',
    fontWeight: 800,
    color: '#4a3728',
  },
  ctaDesc: {
    fontSize: '12px',
    color: '#7c6350',
    fontWeight: 600,
  },
  quickStartBtn: {
    padding: '10px 20px',
    fontSize: '13px',
    borderRadius: '10px',
  },
  tasksCard: {
    padding: '20px',
    marginBottom: '20px',
  },
  tasksHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  tasksTitleBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  tasksTitle: {
    fontSize: '16px',
    fontWeight: 800,
    color: '#4a3728',
  },
  taskBadge: {
    fontSize: '10.5px',
    background: '#fff7ed',
    border: '1.5px solid #fdba74',
    color: '#f97316',
    padding: '2px 8px',
    borderRadius: '6px',
    fontWeight: 700,
  },
  achievementBadge: {
    fontSize: '10.5px',
    background: '#fef9c3',
    border: '1.5px solid #fcd34d',
    color: '#ca8a04',
    padding: '2px 8px',
    borderRadius: '6px',
    fontWeight: 700,
  },
  tasksList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  taskItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 14px',
    background: '#fffdfa',
    border: '1.5px solid #f3ebd8',
    borderRadius: '12px',
    transition: 'all 0.15s ease',
  },
  taskLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
  },
  checkbox: {
    width: '18px',
    height: '18px',
    borderRadius: '6px',
    border: '1.8px solid',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.15s ease',
  },
  checkMark: {
    color: '#ffffff',
    fontSize: '11px',
    fontWeight: 'bold',
  },
  taskTextBlock: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },
  taskName: {
    fontSize: '13px',
    fontWeight: 700,
  },
  taskExp: {
    fontSize: '10.5px',
    color: '#f97316',
    fontWeight: 700,
  },
  taskRight: {
    display: 'flex',
    alignItems: 'center',
  },
  taskProgress: {
    fontSize: '12px',
    fontWeight: 800,
    fontFamily: 'Fredoka, sans-serif',
  },
  todoLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    flex: 1,
  },
  todoCheckbox: {
    accentColor: '#fbbf24',
    cursor: 'pointer',
    width: '16px',
    height: '16px',
    border: '2px solid #ecdcb9',
  },
  todoDeleteBtn: {
    background: 'transparent',
    border: 'none',
    color: '#a89280',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.2s',
  },
  todoEmptyText: {
    fontSize: '13px',
    color: '#a89280',
    fontStyle: 'italic',
    textAlign: 'center' as const,
    padding: '12px 0',
  },
  todoForm: {
    display: 'flex',
    gap: '10px',
    marginTop: '16px',
  },
  todoFormInput: {
    flex: 1,
    background: '#ffffff',
    border: '2px solid #ecdcb9',
    borderRadius: '10px',
    padding: '10px 14px',
    color: '#4a3728',
    fontSize: '13px',
    outline: 'none',
    fontFamily: 'Fredoka, sans-serif',
  },
  todoFormSubmitBtn: {
    background: '#fffbeb',
    border: '2px solid #ecdcb9',
    color: '#7c6350',
    fontSize: '12px',
    fontWeight: 800,
    padding: '0 16px',
    borderRadius: '10px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.15s ease',
  },
  checkinUploadPlaceholder: {
    background: '#fffdfa',
    border: '2px dashed #ecdcb9',
    borderRadius: '16px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    gap: '8px',
    transition: 'all 0.15s ease',
  },
  checkinUploadText: {
    fontSize: '13.5px',
    fontWeight: 800,
    color: '#4a3728',
  },
  checkinUploadSubtext: {
    fontSize: '11px',
    color: '#a89280',
    fontWeight: 600,
  },
  checkinPreviewContainer: {
    position: 'relative' as const,
    width: '100%',
    height: '200px',
    borderRadius: '16px',
    overflow: 'hidden',
    border: '2px solid #ecdcb9',
    marginBottom: '12px',
  },
  checkinPreviewImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover' as const,
  },
  checkinCancelPhotoBtn: {
    position: 'absolute' as const,
    top: '10px',
    right: '10px',
    background: 'rgba(74, 55, 40, 0.8)',
    border: 'none',
    color: '#ffffff',
    borderRadius: '50%',
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
  },
  checkinForm: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  checkinNoteInput: {
    background: '#ffffff',
    border: '2px solid #ecdcb9',
    borderRadius: '10px',
    padding: '10px 14px',
    color: '#4a3728',
    fontSize: '13px',
    outline: 'none',
    fontFamily: 'Fredoka, sans-serif',
  },
  checkinSubmitBtn: {
    width: '100%',
  },
  checkedInContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  checkinPhoto: {
    width: '100%',
    height: '200px',
    borderRadius: '16px',
    objectFit: 'cover' as const,
    border: '2px solid #ecdcb9',
  },
  checkedInInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
    padding: '4px',
  },
  checkinNote: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#4a3728',
    lineHeight: 1.4,
  },
  checkinMetaRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '4px',
  },
  checkinTime: {
    fontSize: '11px',
    color: '#a89280',
    fontWeight: 700,
  },
  reCheckinBtn: {
    background: 'transparent',
    border: 'none',
    color: '#f97316',
    fontSize: '11px',
    fontWeight: 800,
    cursor: 'pointer',
    textDecoration: 'underline',
  },
  ratioBarContainer: {
    display: 'flex',
    height: '14px',
    borderRadius: '7px',
    overflow: 'hidden',
    border: '1.5px solid #ecdcb9',
    background: '#ffffff',
    marginBottom: '16px',
  },
  ratioSegment: {
    height: '100%',
    transition: 'width 0.3s ease',
  },
  ratioLegendGrid: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  legendDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    border: '1px solid #ecdcb9',
  },
  legendLabel: {
    fontSize: '11.5px',
    color: '#4a3728',
    fontWeight: 700,
  },
  ratioBarEmpty: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    background: '#fffdfa',
    border: '1.5px solid #f3ebd8',
    borderRadius: '12px',
    textAlign: 'center' as const,
    color: '#a89280',
    fontSize: '12.5px',
  },
  reviewPromptContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    padding: '14px',
    background: '#fffdfa',
    border: '1.5px solid #f3ebd8',
    borderRadius: '12px',
  },
  reviewPromptText: {
    fontSize: '12.5px',
    color: '#7c6350',
    lineHeight: 1.45,
    fontWeight: 600,
  },
  reviewActiveContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  reviewUserCard: {
    background: '#fffdfa',
    border: '1.5px solid #f3ebd8',
    borderRadius: '12px',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  reviewStarsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  reviewUserLabel: {
    fontSize: '12.5px',
    fontWeight: 800,
    color: '#4a3728',
  },
  reviewReflectionText: {
    fontSize: '12px',
    color: '#7c6350',
    lineHeight: 1.4,
    margin: 0,
    fontWeight: 600,
  },
  aiLoadingBlock: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '16px',
    background: '#fef9c3',
    border: '1.5px solid #fcd34d',
    borderRadius: '12px',
    gap: '8px',
    fontSize: '12px',
    color: '#ca8a04',
    fontWeight: 700,
  },
  aiAdviceBlock: {
    background: 'linear-gradient(135deg, #fefef9 0%, #fffbeb 100%)',
    border: '1.8px solid #fcd34d',
    borderRadius: '12px',
    padding: '14px',
    boxShadow: '0 2px 6px rgba(250, 204, 21, 0.05)',
  },
  aiAdviceHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12.5px',
    fontWeight: 800,
    color: '#b45309',
    marginBottom: '6px',
  },
  aiAdviceText: {
    fontSize: '12px',
    color: '#78350f',
    lineHeight: 1.5,
    margin: 0,
    fontWeight: 600,
  },
  reviewEditLink: {
    background: 'transparent',
    border: 'none',
    color: '#f97316',
    fontSize: '11px',
    fontWeight: 800,
    cursor: 'pointer',
    textDecoration: 'underline',
    alignSelf: 'flex-end',
  },
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(74, 55, 40, 0.4)',
    backdropFilter: 'blur(12px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    zIndex: 1000,
  },
  modalContent: {
    width: '100%',
    maxWidth: '440px',
    padding: '24px',
    background: '#ffffff',
    border: '2px solid #ecdcb9',
    borderRadius: '20px',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  modalTitle: {
    fontSize: '15px',
    fontWeight: 800,
    color: '#4a3728',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#a89280',
    cursor: 'pointer',
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '8px',
  },
  modalCancel: {
    border: '2px solid #ecdcb9',
    background: 'transparent',
    padding: '8px 16px',
    borderRadius: '10px',
    fontSize: '12.5px',
    fontWeight: 800,
    color: '#7c6350',
    cursor: 'pointer',
  }
};

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { avatarList, Avatar } from '../components/Avatar';
import { User, Settings, Check, AlertCircle, Calendar, Upload, Trash2, Loader2 } from 'lucide-react';

import { parseDatabaseDate } from '../utils/date';

export const ProfilePage: React.FC = () => {
  const { user, token, updateProfile } = useAuth();
  
  const [username, setUsername] = useState(user?.username || '');
  const isPreset = avatarList.some(a => a.id === (user?.avatar || ''));
  const [selectedAvatar, setSelectedAvatar] = useState(isPreset ? (user?.avatar || avatarList[0].id) : avatarList[0].id);
  const [customAvatar, setCustomAvatar] = useState(isPreset ? '' : (user?.avatar || ''));
  const [dailyGoal, setDailyGoal] = useState(user?.daily_goal || 60);
  const [timelineVisibility, setTimelineVisibility] = useState(user?.timeline_visibility || 'friends');
  const [badges, setBadges] = useState<any[]>([]);
  const [badgesLoading, setBadgesLoading] = useState(true);

  useEffect(() => {
    const fetchAchievements = async () => {
      if (!token) return;
      try {
        const res = await fetch('/api/study/achievements', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setBadges(data.badges || []);
        }
      } catch (err) {
        console.error('Failed to fetch achievements:', err);
      } finally {
        setBadgesLoading(false);
      }
    };
    fetchAchievements();
  }, [token]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        const MAX_SIZE = 160;
        let width = img.width;
        let height = img.height;

        const size = Math.min(width, height);
        canvas.width = MAX_SIZE;
        canvas.height = MAX_SIZE;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(
            img,
            (width - size) / 2,
            (height - size) / 2,
            size,
            size,
            0,
            0,
            MAX_SIZE,
            MAX_SIZE
          );
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setCustomAvatar(dataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '' as 'success' | 'error' | '', text: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setMessage({ type: 'error', text: '暱稱不能為空' });
      return;
    }

    if (dailyGoal <= 0) {
      setMessage({ type: 'error', text: '每日專注目標時間必須大於 0 分鐘' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    const finalAvatar = customAvatar.trim() || selectedAvatar;

    try {
      const res = await updateProfile({
        username: username.trim(),
        avatar: finalAvatar,
        daily_goal: Number(dailyGoal),
        timeline_visibility: timelineVisibility
      });

      if (res.success) {
        setMessage({ type: 'success', text: '個人設定更新成功！' });
      } else {
        setMessage({ type: 'error', text: res.message || '更新設定失敗，請重試' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: '網路連線異常，請稍後再試' });
    } finally {
      setLoading(false);
    }
  };

  const handleGoalPreset = (mins: number) => {
    setDailyGoal(mins);
  };

  // Format date
  const formatJoinedDate = (isoString?: string) => {
    if (!isoString) return '';
    const d = parseDatabaseDate(isoString);
    return `${d.getFullYear()} 年 ${d.getMonth() + 1} 月 ${d.getDate()} 日`;
  };

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.header}>
        <h1 style={styles.title}>個人設定</h1>
        <p style={styles.subtitle}>自訂您的暱稱、讀書頭像與每日專注目標。</p>
      </div>

      {message.text && (
        <div 
          style={{
            ...styles.alert,
            background: message.type === 'success' ? '#f0fdf4' : '#fef2f2',
            borderColor: message.type === 'success' ? '#bbf7d0' : '#fecaca',
            color: message.type === 'success' ? '#16a34a' : '#dc2626'
          }}
        >
          {message.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Account Metadata Card */}
        <div className="glass-card" style={styles.profileMetaCard}>
          <div style={styles.metaLeft}>
            <Avatar id={customAvatar.trim() || selectedAvatar} size={64} glow />
            <div style={styles.metaText}>
              <h3 style={styles.metaName}>{user?.username}</h3>
              <p style={styles.metaEmail}>{user?.email}</p>
            </div>
          </div>
          <div style={styles.metaRight}>
            <Calendar size={14} color="#64748b" />
            <span style={styles.joinedText}>加入時間：{formatJoinedDate(user?.createdAt)}</span>
          </div>
        </div>

        {/* Edit fields */}
        <div className="glass-card" style={styles.editSection}>
          <h3 style={styles.sectionTitle}>編輯基本資料</h3>
          
          <div className="form-group">
            <label className="form-label" htmlFor="profile-username">修改暱稱</label>
            <input
              id="profile-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="form-input"
              placeholder="請輸入您的暱稱"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">選擇讀書角色 (頭像)</label>
            <div style={styles.avatarGrid}>
              {avatarList.map((avatar) => {
                const isSelected = !customAvatar && selectedAvatar === avatar.id;
                return (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => {
                      setSelectedAvatar(avatar.id);
                      setCustomAvatar('');
                    }}
                    style={{
                      ...styles.avatarBtn,
                      borderColor: isSelected ? '#fdba74' : '#ecdcb9',
                      background: isSelected ? '#fff7ed' : '#ffffff',
                    }}
                    title={avatar.name}
                  >
                    <Avatar id={avatar.id} size={42} glow={isSelected} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Avatar Upload */}
          <div className="form-group">
            <label className="form-label">或上傳自訂個人照片</label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-outline"
                style={{ flex: 1, padding: '10px 16px', fontSize: '13px', display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center' }}
                disabled={loading}
              >
                <Upload size={14} />
                <span>選擇自訂照片</span>
              </button>
              
              {customAvatar && (
                <button
                  type="button"
                  onClick={() => setCustomAvatar('')}
                  className="btn btn-outline"
                  style={{ borderColor: '#fda4af', color: '#e11d48', padding: '10px 16px', fontSize: '13px', display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center' }}
                  disabled={loading}
                >
                  <Trash2 size={14} />
                  <span>移除照片</span>
                </button>
              )}

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                style={{ display: 'none' }}
              />

              {customAvatar && (
                <div style={{ border: '1.5px solid #fdba74', borderRadius: '12px', padding: '2px', background: '#fff7ed', display: 'flex' }}>
                  <Avatar id={customAvatar} size={42} glow />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Goal Setting Section */}
        <div className="glass-card" style={styles.editSection}>
          <h3 style={styles.sectionTitle}>每日專注目標</h3>
          
          <div className="form-group">
            <label className="form-label" htmlFor="profile-goal">每日讀書目標 (分鐘)</label>
            <input
              id="profile-goal"
              type="number"
              value={dailyGoal}
              onChange={(e) => setDailyGoal(Math.max(1, Number(e.target.value)))}
              className="form-input"
              placeholder="請輸入目標分鐘數"
              disabled={loading}
              min="1"
            />
          </div>

          <div style={styles.presetGoalGroup}>
            <span style={styles.presetLabel}>快速設定：</span>
            <div style={styles.presetGoalButtons}>
              {[30, 45, 60, 90, 120, 180].map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => handleGoalPreset(mins)}
                  style={{
                    ...styles.presetGoalBtn,
                    ...(dailyGoal === mins ? styles.presetGoalBtnActive : {})
                  }}
                >
                  {mins} 分
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Privacy Setting Section */}
        <div className="glass-card" style={styles.editSection}>
          <h3 style={styles.sectionTitle}>時間線公開範圍設定</h3>
          
          <div className="form-group">
            <label className="form-label" htmlFor="profile-privacy">誰可以看我的時間線？</label>
            <select
              id="profile-privacy"
              value={timelineVisibility}
              onChange={(e) => setTimelineVisibility(e.target.value)}
              className="form-input"
              disabled={loading}
              style={{ padding: '10px', height: '42px', borderRadius: '12px', border: '2px solid #ecdcb9', outline: 'none' }}
            >
              <option value="friends">僅限好友可見 👥</option>
              <option value="groups">僅限群組成員可見 🏫</option>
              <option value="statistics_only">僅限統計比例可見 (活動名稱不公開) 📊</option>
              <option value="private">私人 (僅自己可見) 🔒</option>
            </select>
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '6px', display: 'block', fontWeight: 500, lineHeight: 1.4 }}>
              {timelineVisibility === 'friends' && '💡 你的好友可以直接查看你今日詳細的讀書與休息時間線活動。'}
              {timelineVisibility === 'groups' && '💡 你所加入的群組內的其他成員可以查看你今日詳細的時間線活動。'}
              {timelineVisibility === 'statistics_only' && '💡 好友或群組成員只能看到你的分類時長佔比統計，但不會看到你安排的具體活動細節（如科目名稱、備註等）。'}
              {timelineVisibility === 'private' && '💡 所有人都無法查看你的時間線活動，只能看見你目前的簡要狀態（如「離線」或「讀書中」）。'}
            </span>
          </div>
        </div>

        <button 
          type="submit" 
          style={styles.saveBtn}
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? '儲存中...' : '儲存變更'}
        </button>
      </form>

      {/* Achievements Badge Gallery */}
      <div className="glass-card animate-fade-in" style={styles.achievementsCard}>
        <h3 style={styles.achievementsTitle}>🏆 我的成就勳章牆 (Badge Gallery)</h3>
        {badgesLoading ? (
          <div style={styles.badgesLoading}>
            <Loader2 className="animate-spin" size={20} color="#fbbf24" style={{ animation: 'spin-slow 1.2s linear infinite' }} />
            <span style={{ fontSize: '13px', color: '#7c6350', fontWeight: 600, marginLeft: '8px' }}>載入勳章牆中...</span>
          </div>
        ) : (
          <div style={styles.badgesGrid}>
            {badges.map((badge) => {
              const unlocked = badge.unlocked;
              const pct = Math.min(100, Math.round((badge.currentProgress / badge.targetProgress) * 100));
              return (
                <div 
                  key={badge.id} 
                  style={{
                    ...styles.badgeCard,
                    ...(unlocked ? styles.badgeUnlocked : styles.badgeLocked)
                  }}
                  className={unlocked ? "badge-hover-glow" : ""}
                >
                  <div style={styles.badgeIcon}>{badge.icon}</div>
                  <div style={styles.badgeName}>{badge.name}</div>
                  <div style={styles.badgeDesc}>{badge.desc}</div>
                  
                  {/* Progress bar for locked badge */}
                  {!unlocked && (
                    <div style={styles.badgeProgressCol}>
                      <div style={styles.badgeProgressBar}>
                        <div style={{ ...styles.badgeProgressFill, width: `${pct}%` }} />
                      </div>
                      <span style={styles.badgeProgressText}>
                        {badge.currentProgress}/{badge.targetProgress}
                      </span>
                    </div>
                  )}

                  {unlocked && (
                    <span style={styles.unlockedLabel}>已解鎖 ✅</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
  },
  header: {
    marginBottom: '4px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 800,
    color: 'var(--text-primary)',
    letterSpacing: '-0.5px',
    marginBottom: '4px',
  },
  subtitle: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  alert: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    borderRadius: '10px',
    border: '1px solid',
    fontSize: '13px',
    fontWeight: 500,
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  profileMetaCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '20px',
    gap: '16px',
    flexWrap: 'wrap' as const,
  },
  metaLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  metaText: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  metaName: {
    fontSize: '18px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  metaEmail: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
  },
  metaRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  joinedText: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontWeight: 500,
  },
  editSection: {
    padding: '20px',
  },
  sectionTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: '16px',
  },
  avatarGrid: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '8px',
    marginTop: '4px',
  },
  avatarBtn: {
    border: '2px solid transparent',
    borderRadius: '12px',
    padding: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  presetGoalGroup: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    marginTop: '10px',
  },
  presetLabel: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  presetGoalButtons: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '8px',
  },
  presetGoalBtn: {
    padding: '6px 12px',
    borderRadius: '8px',
    background: '#ffffff',
    border: '1.5px solid #ecdcb9',
    color: 'var(--text-secondary)',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  presetGoalBtnActive: {
    background: '#fff7ed',
    border: '1.5px solid #fdba74',
    color: '#f97316',
  },
  saveBtn: {
    width: '100%',
    marginTop: '8px',
  },
  achievementsCard: {
    width: '100%',
    padding: '24px 20px',
    marginTop: '12px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  achievementsTitle: {
    fontSize: '15px',
    fontWeight: 800,
    color: '#4a3728',
    letterSpacing: '-0.3px',
  },
  badgesLoading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '40px',
  },
  badgesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: '14px',
    width: '100%',
  },
  badgeCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '16px 12px',
    borderRadius: '16px',
    border: '2px solid',
    textAlign: 'center' as const,
    transition: 'all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
    position: 'relative' as const,
  },
  badgeLocked: {
    background: 'rgba(248, 241, 229, 0.4)',
    borderColor: '#e8dfcc',
    opacity: 0.65,
  },
  badgeUnlocked: {
    background: '#ffffff',
    borderColor: '#fcd34d',
    boxShadow: '0 4px 12px rgba(251, 191, 36, 0.08)',
  },
  badgeIcon: {
    fontSize: '32px',
    marginBottom: '8px',
    userSelect: 'none' as const,
  },
  badgeName: {
    fontSize: '13px',
    fontWeight: 800,
    color: '#4a3728',
    marginBottom: '4px',
  },
  badgeDesc: {
    fontSize: '10.5px',
    color: '#7c6350',
    lineHeight: 1.35,
    marginBottom: '10px',
    flex: 1,
  },
  badgeProgressCol: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    width: '100%',
    gap: '4px',
  },
  badgeProgressBar: {
    width: '100%',
    height: '4px',
    borderRadius: '2px',
    background: '#e8dfcc',
    overflow: 'hidden',
  },
  badgeProgressFill: {
    height: '100%',
    background: '#fde047',
  },
  badgeProgressText: {
    fontSize: '9px',
    color: '#a89280',
    fontWeight: 700,
    fontFamily: 'Fredoka, sans-serif',
  },
  unlockedLabel: {
    fontSize: '10px',
    fontWeight: 800,
    color: '#d97706',
    background: '#fef3c7',
    padding: '2px 8px',
    borderRadius: '8px',
    border: '1px solid #fcd34d',
  }
};

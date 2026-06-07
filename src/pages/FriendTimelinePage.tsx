import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Avatar } from '../components/Avatar';
import { ArrowLeft, Flame, Bell, Clock, AlignLeft, ShieldAlert } from 'lucide-react';

interface Activity {
  activityId: number;
  activityName: string;
  category: 'study' | 'class' | 'homework' | 'rest' | 'entertainment' | 'wasted';
  startTime: string;
  endTime: string;
  duration: number; // in seconds
  note: string;
}

interface FriendProfile {
  userId: number;
  username: string;
  avatar: string;
  level: number;
  status: 'studying' | 'resting' | 'offline';
}

const categoryConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  study: { label: '專注讀書 📚', color: '#ca8a04', bg: '#fef9c3', border: '#fcd34d' },
  class: { label: '學校上課 🏫', color: '#7c6350', bg: '#fcfaf5', border: '#ecdcb9' },
  homework: { label: '寫作業 ✏️', color: '#f97316', bg: '#fff7ed', border: '#fdba74' },
  rest: { label: '放空休息 ☕', color: '#ea580c', bg: '#fff7ed', border: '#ffedd5' },
  entertainment: { label: '休閒娛樂 🎮', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  wasted: { label: '浪費時間 📱', color: '#a89280', bg: '#fcfaf5', border: '#ecdcb9' }
};

export const FriendTimelinePage: React.FC = () => {
  const { friendId } = useParams<{ friendId: string }>();
  const { token } = useAuth();
  const navigate = useNavigate();

  const [friend, setFriend] = useState<FriendProfile | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Local interaction status
  const [encouraged, setEncouraged] = useState(false);
  const [reminded, setReminded] = useState(false);

  const fetchFriendData = async () => {
    if (!token || !friendId) return;
    setLoading(true);
    setErrorMsg('');
    try {
      // 1. Fetch friend's profile from list
      const friendsRes = await fetch('/api/friends', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (friendsRes.ok) {
        const friendsList = await friendsRes.json();
        const found = friendsList.find((f: any) => f.userId === Number(friendId));
        if (found) {
          setFriend({
            userId: found.userId,
            username: found.username,
            avatar: found.avatar,
            level: found.level,
            status: found.status
          });
        }
      }

      // 2. Fetch friend's timeline
      const timelineRes = await fetch(`/api/timeline/friends/${friendId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (timelineRes.ok) {
        const timelineData = await timelineRes.json();
        setActivities(timelineData);
      } else {
        const errData = await timelineRes.json();
        setErrorMsg(errData.message || '無法獲取好友時間線');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('連線異常，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFriendData();
  }, [token, friendId]);

  const handleEncourage = async () => {
    if (!token || !friendId || encouraged) return;
    try {
      const res = await fetch(`/api/friends/${friendId}/encourage`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setEncouraged(true);
        setTimeout(() => setEncouraged(false), 5000);
      } else {
        const data = await res.json();
        alert(data.message || '鼓勵發送失敗');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemind = async () => {
    if (!token || !friendId || reminded) return;
    try {
      const res = await fetch(`/api/friends/${friendId}/remind`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setReminded(true);
        setTimeout(() => setReminded(false), 5000);
      } else {
        const data = await res.json();
        alert(data.message || '提醒發送失敗');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatTimeStr = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    } catch {
      return isoString;
    }
  };

  const formatDurationStr = (seconds: number) => {
    const mins = Math.round(seconds / 60);
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return remainingMins > 0 ? `${hrs} 小時 ${remainingMins} 分` : `${hrs} 小時`;
    }
    return `${mins} 分鐘`;
  };

  if (loading) {
    return (
      <div style={styles.centerContainer}>
        <div style={styles.spinner} />
        <span>載入好友資料中...</span>
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div style={styles.centerContainer}>
        <ShieldAlert size={40} color="#e11d48" style={{ marginBottom: '12px' }} />
        <span style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>載入失敗</span>
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{errorMsg}</span>
        <button onClick={() => navigate(-1)} className="btn btn-outline" style={{ marginTop: '20px' }}>
          返回上頁
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Navigation Header */}
      <div style={styles.navHeader}>
        <button onClick={() => navigate(-1)} style={styles.backBtn}>
          <ArrowLeft size={18} />
          <span>好友監督列表</span>
        </button>
      </div>

      {/* Friend Banner profile card */}
      {friend && (
        <div className="glass-card" style={styles.friendCard}>
          <div style={styles.friendLeft}>
            <Avatar id={friend.avatar} size={56} glow={friend.status === 'studying'} />
            <div style={styles.friendInfo}>
              <div style={styles.friendTitleRow}>
                <span style={styles.friendName}>{friend.username}</span>
                <span style={styles.friendLevel}>Lv. {friend.level}</span>
              </div>
              <span style={{
                ...styles.statusText,
                color: friend.status === 'studying' ? '#ca8a04' : friend.status === 'resting' ? '#f97316' : 'var(--text-muted)'
              }}>
                {friend.status === 'studying' ? '✍️ 專注學習中' : friend.status === 'resting' ? '☕ 休息充電中' : '離線'}
              </span>
            </div>
          </div>

          <div style={styles.interactActions}>
            <button 
              onClick={handleEncourage}
              disabled={encouraged}
              style={{
                ...styles.interactBtn,
                ...(encouraged ? styles.interactBtnActive : styles.encourageStyle)
              }}
            >
              <Flame size={14} fill={encouraged ? '#16a34a' : 'none'} />
              <span>{encouraged ? '已送出鼓勵' : '送出鼓勵'}</span>
            </button>

            <button 
              onClick={handleRemind}
              disabled={reminded}
              style={{
                ...styles.interactBtn,
                ...(reminded ? styles.interactBtnActive : styles.remindStyle)
              }}
            >
              <Bell size={14} />
              <span>{reminded ? '已送出提醒' : '提醒專注'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Timeline view */}
      <div className="glass-card" style={styles.timelineCard}>
        <h3 style={styles.timelineTitle}>今日時間軌跡</h3>
        {activities.length === 0 ? (
          <div style={styles.emptyTimeline}>
            <span>🦥</span>
            <p style={{ marginTop: '8px' }}>好友今天還沒有記錄任何時間線活動喔！</p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>點選上方按鈕提醒他開始專注吧！</p>
          </div>
        ) : (
          <div style={styles.timelineList}>
            <div style={styles.timelineSpine} />

            {activities.map((act) => {
              const conf = categoryConfig[act.category] || categoryConfig.study;
              return (
                <div key={act.activityId} style={styles.timelineItem}>
                  <div style={styles.timelineMarkerBlock}>
                    <span style={styles.timeLabel}>{formatTimeStr(act.startTime)}</span>
                    <div style={{ ...styles.timelineDot, background: conf.color, borderColor: 'var(--bg-primary)' }} />
                  </div>

                  <div style={{ ...styles.activityCard, background: conf.bg, borderColor: conf.border }}>
                    <div style={styles.activityCardHeader}>
                      <span style={{ ...styles.activityTitle, color: 'var(--text-primary)' }}>
                        {act.activityName}
                      </span>
                      <span style={{ ...styles.categoryBadge, color: conf.color, borderColor: conf.border }}>
                        {conf.label}
                      </span>
                    </div>

                    <div style={styles.activityTimeRow}>
                      <Clock size={12} color="#7c6350" />
                      <span style={styles.activityDuration}>
                        {formatTimeStr(act.startTime)} - {formatTimeStr(act.endTime)} ({formatDurationStr(act.duration)})
                      </span>
                    </div>

                    {act.note && (
                      <div style={styles.activityNoteBlock}>
                        <AlignLeft size={11} color="#a89280" />
                        <span style={styles.activityNote}>{act.note}</span>
                      </div>
                    )}
                  </div>
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
    gap: '16px',
  },
  navHeader: {
    width: '100%',
  },
  backBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    fontWeight: 800,
    cursor: 'pointer',
  },
  friendCard: {
    padding: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#ffffff',
    gap: '16px',
    flexWrap: 'wrap' as const,
  },
  friendLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  friendInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  friendTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  friendName: {
    fontSize: '16px',
    fontWeight: 800,
    color: 'var(--text-primary)',
  },
  friendLevel: {
    fontSize: '10px',
    color: '#7c6350',
    background: '#fcfaf5',
    border: '1px solid #ecdcb9',
    padding: '1px 6px',
    borderRadius: '4px',
    fontWeight: 700,
  },
  statusText: {
    fontSize: '12px',
    fontWeight: 700,
  },
  interactActions: {
    display: 'flex',
    gap: '10px',
  },
  interactBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    borderRadius: '10px',
    border: '2px solid #ecdcb9',
    fontSize: '12px',
    fontWeight: 800,
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  encourageStyle: {
    background: 'linear-gradient(135deg, #fde047 0%, #fbbf24 100%)',
    color: 'var(--text-primary)',
  },
  remindStyle: {
    background: '#ffffff',
    color: 'var(--text-primary)',
  },
  interactBtnActive: {
    background: '#f0fdf4',
    border: '1.5px solid #bbf7d0',
    color: '#16a34a',
    cursor: 'not-allowed',
  },
  timelineCard: {
    padding: '24px 20px',
  },
  timelineTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: '18px',
  },
  emptyTimeline: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 0',
    color: 'var(--text-muted)',
    fontSize: '13px',
    textAlign: 'center' as const,
  },
  timelineList: {
    position: 'relative' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '20px',
    paddingLeft: '8px',
  },
  timelineSpine: {
    position: 'absolute' as const,
    top: '8px',
    bottom: '8px',
    left: '60px',
    width: '2px',
    background: '#ecdcb9',
    zIndex: 1,
  },
  timelineItem: {
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'flex-start',
    gap: '22px',
    zIndex: 2,
  },
  timelineMarkerBlock: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    width: '60px',
    position: 'relative' as const,
    height: '24px',
  },
  timeLabel: {
    fontSize: '12.5px',
    fontWeight: 800,
    color: 'var(--text-secondary)',
    marginRight: '14px',
    fontFamily: 'Fredoka, sans-serif',
  },
  timelineDot: {
    position: 'absolute' as const,
    right: '-7px',
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    border: '2px solid',
  },
  activityCard: {
    flex: 1,
    border: '1.5px solid',
    borderRadius: '16px',
    padding: '14px 16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  activityCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
  },
  activityTitle: {
    fontSize: '14px',
    fontWeight: 800,
    lineHeight: 1.3,
  },
  categoryBadge: {
    fontSize: '10px',
    fontWeight: 800,
    padding: '2px 8px',
    borderRadius: '6px',
    background: '#ffffff',
    border: '1px solid',
    whiteSpace: 'nowrap' as const,
  },
  activityTimeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  activityDuration: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    fontWeight: 600,
    fontFamily: 'Fredoka, sans-serif',
  },
  activityNoteBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(255,255,255,0.4)',
    padding: '6px 10px',
    borderRadius: '8px',
    marginTop: '2px',
  },
  activityNote: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  centerContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: '16px',
    color: 'var(--text-secondary)',
    fontSize: '14px',
  },
  spinner: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: '3px solid rgba(74, 55, 40, 0.15)',
    borderTopColor: '#fbbf24',
    animation: 'spin-slow 1s linear infinite',
  }
};

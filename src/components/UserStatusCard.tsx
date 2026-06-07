import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Avatar } from './Avatar';
import { Award } from 'lucide-react';

export const UserStatusCard: React.FC = () => {
  const { user } = useAuth();

  if (!user) return null;

  const expNeeded = user.level * 100;
  const progressPercent = Math.min(100, Math.max(0, (user.exp / expNeeded) * 100));

  return (
    <div className="glass-card" style={styles.card}>
      <div style={styles.topInfo}>
        <div style={styles.userSection}>
          <Avatar id={user.avatar} size={54} glow={user.status === 'studying'} />
          <div style={styles.nameBlock}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={styles.welcomeText}>歡迎回來 👋</span>
              {user.autoStatus && (
                <span style={{
                  fontSize: '11px',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  fontWeight: 700,
                  background: user.autoStatus.includes('讀書') || user.autoStatus.includes('學習') || user.autoStatus.includes('上課') || user.autoStatus.includes('作業')
                    ? '#fef9c3'
                    : user.autoStatus.includes('休息') || user.autoStatus.includes('娛樂')
                    ? '#fff7ed'
                    : user.autoStatus.includes('完成目標')
                    ? '#fef08a'
                    : user.autoStatus.includes('進度落後')
                    ? '#fee2e2'
                    : '#fcfaf5',
                  color: user.autoStatus.includes('讀書') || user.autoStatus.includes('學習') || user.autoStatus.includes('上課') || user.autoStatus.includes('作業')
                    ? '#ca8a04'
                    : user.autoStatus.includes('休息') || user.autoStatus.includes('娛樂')
                    ? '#f97316'
                    : user.autoStatus.includes('完成目標')
                    ? '#854d0e'
                    : user.autoStatus.includes('進度落後')
                    ? '#991b1b'
                    : '#7c6350',
                  border: user.autoStatus.includes('讀書') || user.autoStatus.includes('學習') || user.autoStatus.includes('上課') || user.autoStatus.includes('作業')
                    ? '1px solid #fcd34d'
                    : user.autoStatus.includes('休息') || user.autoStatus.includes('娛樂')
                    ? '1px solid #fdba74'
                    : user.autoStatus.includes('完成目標')
                    ? '1px solid #eab308'
                    : user.autoStatus.includes('進度落後')
                    ? '1px solid #fca5a5'
                    : '1px solid #ecdcb9',
                }}>
                  {user.autoStatus}
                </span>
              )}
            </div>
            <h2 style={styles.username}>{user.username}</h2>
          </div>
        </div>
        
        <div style={styles.levelBadge}>
          <Award size={16} color="#4a3728" />
          <span>Lv. {user.level}</span>
        </div>
      </div>

      <div style={styles.expSection}>
        <div style={styles.expLabels}>
          <span style={styles.expText}>等級進度</span>
          <span style={styles.expVal}>{user.exp} / {expNeeded} EXP</span>
        </div>
        <div className="progress-bar-container">
          <div 
            className="progress-bar-fill" 
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        {progressPercent >= 90 && (
          <span style={styles.levelAlert}>✨ 即將升級！再專注一下吧！</span>
        )}
      </div>
    </div>
  );
};

const styles = {
  card: {
    padding: '20px',
    marginBottom: '20px',
  },
  topInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  nameBlock: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },
  welcomeText: {
    fontSize: '12.5px',
    color: '#7c6350',
    fontWeight: 700,
  },
  username: {
    fontSize: '20px',
    fontWeight: 800,
    color: '#4a3728',
    letterSpacing: '-0.2px',
  },
  levelBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    borderRadius: '10px',
    background: '#fde047',
    border: '2px solid #ecdcb9',
    boxShadow: '0 2.5px 6px rgba(139, 92, 26, 0.08)',
    color: '#4a3728',
    fontSize: '13px',
    fontWeight: 800,
  },
  expSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  expLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    fontWeight: 700,
  },
  expText: {
    color: '#7c6350',
  },
  expVal: {
    color: '#f97316',
  },
  levelAlert: {
    fontSize: '11.5px',
    color: '#ef4444',
    marginTop: '4px',
    fontWeight: 800,
  }
};

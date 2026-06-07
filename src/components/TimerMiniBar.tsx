import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTimer } from '../context/TimerContext';
import { Play, Pause, Timer } from 'lucide-react';

export const TimerMiniBar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isTimerActive, isPaused, secondsRemaining, subject, pauseTimer, resumeTimer } = useTimer();

  // Only show on non-timer pages when timer is active
  if (!isTimerActive || location.pathname === '/timer') return null;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      style={styles.bar}
      className="animate-slide-up"
    >
      {/* Left: icon + subject + time */}
      <div
        style={styles.left}
        onClick={() => navigate('/timer')}
        role="button"
        title="點擊回到計時頁面"
      >
        <div style={styles.iconWrap}>
          <Timer size={14} color="#4a3728" />
        </div>
        <div style={styles.info}>
          <span style={styles.subjectText}>{subject || '讀書中'}</span>
          <span style={styles.timeText}>{formatTime(secondsRemaining)}</span>
        </div>
        {isPaused && <span style={styles.pausedPill}>暫停中</span>}
      </div>

      {/* Right: pause / resume button */}
      <button
        style={styles.ctrlBtn}
        onClick={(e) => {
          e.stopPropagation();
          isPaused ? resumeTimer() : pauseTimer();
        }}
        title={isPaused ? '繼續專注' : '暫停'}
      >
        {isPaused
          ? <Play size={15} fill="#4a3728" color="#4a3728" />
          : <Pause size={15} color="#4a3728" />}
      </button>
    </div>
  );
};

const styles = {
  bar: {
    position: 'fixed' as const,
    bottom: '80px',           // sits just above the bottom tab bar (76px + 4px gap)
    left: '50%',
    transform: 'translateX(-50%)',
    width: 'calc(100% - 32px)',
    maxWidth: '568px',
    height: '52px',
    background: 'linear-gradient(135deg, #fde047 0%, #fbbf24 100%)',
    border: '2px solid #f59e0b',
    borderRadius: '16px',
    boxShadow: '0 4px 16px rgba(251, 191, 36, 0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 14px 0 10px',
    zIndex: 98,
    cursor: 'default',
  },
  left: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
    cursor: 'pointer',
    minWidth: 0,
  },
  iconWrap: {
    width: '28px',
    height: '28px',
    background: 'rgba(255,255,255,0.55)',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  info: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1px',
    minWidth: 0,
  },
  subjectText: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#4a3728',
    opacity: 0.75,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  timeText: {
    fontSize: '18px',
    fontWeight: 800,
    color: '#4a3728',
    fontFamily: 'Fredoka, monospace',
    letterSpacing: '-0.5px',
    lineHeight: 1,
  },
  pausedPill: {
    background: 'rgba(255,255,255,0.6)',
    color: '#92400e',
    fontSize: '10px',
    fontWeight: 800,
    borderRadius: '8px',
    padding: '2px 7px',
    flexShrink: 0,
  },
  ctrlBtn: {
    background: 'rgba(255,255,255,0.55)',
    border: 'none',
    borderRadius: '10px',
    width: '36px',
    height: '36px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'background 0.15s',
  },
};

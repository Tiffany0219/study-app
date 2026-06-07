import React, { useEffect } from 'react';
import { Play, Pause, Square, AlertTriangle, CheckCircle, RotateCcw } from 'lucide-react';
import { useTimer, ambientTracks } from '../context/TimerContext';

interface StudyTimerProps {
  subject: string;
  onRecordSaved: (rewardExp: number, leveledUp: boolean, level: number, exp: number) => void;
}

const PRESET_MINUTES = [5, 15, 25, 45, 60, 90];

export const StudyTimer: React.FC<StudyTimerProps> = ({ subject, onRecordSaved }) => {
  const {
    targetMinutes,
    secondsRemaining,
    isTimerActive,
    isPaused,
    elapsedSeconds,
    activeTrack,
    volume,
    saveStatus,
    errorMessage,
    rewardDetails,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    setTargetMinutes,
    setActiveTrack,
    setVolume,
    saveSession,
    clearSaveStatus
  } = useTimer();

  // Keep compatibility with parent reload callback
  useEffect(() => {
    if (saveStatus === 'success' && rewardDetails) {
      onRecordSaved(rewardDetails.exp, rewardDetails.lvlUp, rewardDetails.lvl, 0);
    }
  }, [saveStatus, rewardDetails]);

  // Start Timer using subject from prop
  const handleStart = () => {
    if (!subject) {
      alert('請先選擇一個讀書科目！');
      return;
    }
    startTimer(subject);
  };

  const handlePause = () => {
    pauseTimer();
  };

  const handleResume = () => {
    resumeTimer();
  };

  const handleEndEarly = () => {
    if (elapsedSeconds < 10) {
      const abort = window.confirm('專注時間低於 10 秒將不予記錄。確定要直接取消嗎？');
      if (abort) {
        resetTimer();
      }
      return;
    }

    const confirmSave = window.confirm('確定要結束並結算目前的讀書時長嗎？');
    if (confirmSave) {
      saveSession('completed');
    }
  };

  const handleCancelSession = () => {
    const confirmCancel = window.confirm('確定要放棄本次專注嗎？這將不會保存任何紀錄。');
    if (confirmCancel) {
      resetTimer();
    }
  };

  const handlePresetSelect = (mins: number) => {
    if (isTimerActive) return;
    setTargetMinutes(mins);
  };

  // Progress Circle Calculation
  const totalSeconds = targetMinutes * 60;
  const progressPercent = isTimerActive 
    ? (secondsRemaining / totalSeconds) * 100 
    : 100;
  
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

  // Format Seconds to MM:SS
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={styles.container}>
      {/* Preset time picker */}
      {!isTimerActive && (
        <div style={styles.presets}>
          <span style={styles.presetLabel}>設定專注時長（分鐘）</span>
          <div style={styles.presetGrid}>
            {PRESET_MINUTES.map((mins) => (
              <button
                key={mins}
                onClick={() => handlePresetSelect(mins)}
                style={{
                  ...styles.presetBtn,
                  ...(targetMinutes === mins ? styles.presetBtnActive : {})
                }}
                type="button"
              >
                {mins}m
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Timer Display */}
      <div 
        style={styles.timerWrapper}
      >
        <svg width="220" height="220" viewBox="0 0 220 220">
          <circle
            cx="110"
            cy="110"
            r={radius}
            fill="transparent"
            stroke="#f1ede2"
            strokeWidth="8"
          />
          <circle
            cx="110"
            cy="110"
            r={radius}
            fill="transparent"
            stroke="url(#timerGradient)"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transform: 'rotate(-90deg)',
              transformOrigin: '110px 110px',
              transition: 'stroke-dashoffset 0.5s linear'
            }}
          />
          <defs>
            <linearGradient id="timerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="100%" stopColor="#fb923c" />
            </linearGradient>
          </defs>
        </svg>

        <div style={styles.timeCenter}>
          <span style={styles.subjectDisplay}>{subject || '請選擇科目'}</span>
          <span style={styles.timeString}>{formatTime(secondsRemaining)}</span>
          <span style={styles.statusLabel}>
            {!isTimerActive ? '準備就緒' : isPaused ? '暫停中' : '專注中...'}
          </span>
        </div>
      </div>

      {/* Cozy Lofi / White Noise Player Card */}
      <div className="glass-card animate-fade-in" style={styles.soundPlayerCard}>
        <div style={styles.soundPlayerHeader}>
          <span style={styles.soundPlayerTitle}>🎧 專注白噪音與環境音</span>
        </div>
        <div style={styles.soundPlayerControls}>
          <select
            value={activeTrack}
            onChange={(e) => setActiveTrack(e.target.value)}
            style={styles.soundSelect}
          >
            {ambientTracks.map((track) => (
              <option key={track.id} value={track.id}>
                {track.name}
              </option>
            ))}
          </select>
          {activeTrack !== 'none' && (
            <div style={styles.volumeWrapper}>
              <span style={styles.volumeLabel}>音量</span>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                style={styles.volumeSlider}
              />
              <span style={styles.volumePercent}>{Math.round(volume * 100)}%</span>
            </div>
          )}
        </div>
      </div>

      {/* Control Buttons */}
      <div style={styles.controls}>
        {!isTimerActive ? (
          <button onClick={handleStart} style={styles.startBtn} className="btn btn-primary">
            <Play size={20} fill="#4a3728" />
            <span>開始專注</span>
          </button>
        ) : (
          <div style={styles.activeButtonGroup}>
            {isPaused ? (
              <button onClick={handleResume} style={styles.controlBtn} className="btn btn-secondary">
                <Play size={18} fill="#fff" />
                <span>繼續</span>
              </button>
            ) : (
              <button onClick={handlePause} style={styles.controlBtn} className="btn btn-outline">
                <Pause size={18} />
                <span>暫停</span>
              </button>
            )}

            <button onClick={handleEndEarly} style={{ ...styles.controlBtn, ...styles.endBtn }} className="btn btn-primary">
              <Square size={16} fill="#4a3728" />
              <span>結算</span>
            </button>

            <button onClick={handleCancelSession} style={styles.cancelLink} type="button">
              放棄
            </button>
          </div>
        )}
      </div>

      {/* Success Reward Overlay Modal */}
      {saveStatus === 'success' && rewardDetails && (
        <div style={styles.modalOverlay} className="animate-fade-in">
          <div style={styles.modalContent} className="glass-card animate-slide-up">
            <div style={styles.successIcon}>
              <CheckCircle size={48} color="#4ade80" />
            </div>
            <h2 style={styles.modalTitle}>太棒了！專注完成 🎉</h2>
            <p style={styles.modalDesc}>
              你完成了對 <strong>{subject}</strong> 的專注學習。<br />
              實際專注時間：{Math.floor(elapsedSeconds / 60)} 分 {elapsedSeconds % 60} 秒。
            </p>
            
            <div style={styles.rewardCard}>
              <div style={styles.rewardItem}>
                <span style={styles.rewardVal}>+{rewardDetails.exp}</span>
                <span style={styles.rewardLabel}>經驗值 EXP</span>
              </div>
            </div>

            {rewardDetails.lvlUp && (
              <div style={styles.levelUpAlert}>
                🎊 恭喜升級！你已晉升至 <strong>Lv. {rewardDetails.lvl}</strong>！
              </div>
            )}

            <button onClick={resetTimer} style={styles.modalBtn} className="btn btn-primary">
              太棒了
            </button>
          </div>
        </div>
      )}

      {/* Saving Overlay */}
      {saveStatus === 'saving' && (
        <div style={styles.modalOverlay}>
          <div style={styles.savingCard}>
            <div style={styles.spinner} />
            <p>正在結算讀書紀錄...</p>
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
    alignItems: 'center',
    width: '100%',
  },
  presets: {
    width: '100%',
    marginBottom: '24px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '10px',
  },
  presetLabel: {
    fontSize: '13.5px',
    color: '#7c6350',
    fontWeight: 700,
  },
  presetGrid: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap' as const,
    justifyContent: 'center',
  },
  presetBtn: {
    padding: '8px 14px',
    borderRadius: '10px',
    background: '#ffffff',
    border: '2px solid #ecdcb9',
    color: '#7c6350',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s',
    boxShadow: '0 2px 4px rgba(139, 92, 26, 0.04)',
  },
  presetBtnActive: {
    background: '#fbbf24',
    borderColor: '#fbbf24',
    color: '#4a3728',
    transform: 'translateY(-1px)',
    boxShadow: '0 3px 8px rgba(251, 191, 36, 0.15)',
  },
  timerWrapper: {
    position: 'relative' as const,
    width: '220px',
    height: '220px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    background: '#ffffff',
    border: '2px solid #ecdcb9',
    marginBottom: '32px',
    boxShadow: '0 6px 18px rgba(139, 92, 26, 0.06)',
  },
  timeCenter: {
    position: 'absolute' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjectDisplay: {
    fontSize: '13.5px',
    fontWeight: 800,
    color: '#f97316',
    letterSpacing: '0.5px',
    marginBottom: '4px',
    maxWidth: '120px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  timeString: {
    fontSize: '48px',
    fontWeight: 800,
    fontFamily: 'Fredoka, monospace',
    color: '#4a3728',
    letterSpacing: '-1.5px',
    lineHeight: 1,
  },
  statusLabel: {
    fontSize: '11px',
    color: '#a89280',
    fontWeight: 700,
    letterSpacing: '1px',
    marginTop: '6px',
  },
  controls: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
  },
  startBtn: {
    width: '100%',
    maxWidth: '280px',
  },
  activeButtonGroup: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    width: '100%',
    maxWidth: '320px',
    position: 'relative' as const,
  },
  controlBtn: {
    flex: 1,
    padding: '12px 16px',
    fontSize: '14px',
  },
  endBtn: {
    background: '#fda4af',
    color: '#4a3728',
    borderColor: '#ecdcb9',
  },
  cancelLink: {
    position: 'absolute' as const,
    right: '-50px',
    background: 'transparent',
    border: 'none',
    color: '#a89280',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    padding: '6px',
  },
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(74, 55, 40, 0.2)',
    backdropFilter: 'blur(8px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    zIndex: 1000,
  },
  modalContent: {
    width: '100%',
    maxWidth: '400px',
    padding: '32px 24px',
    textAlign: 'center' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
  },
  successIcon: {
    marginBottom: '16px',
    display: 'flex',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: '22px',
    fontWeight: 800,
    marginBottom: '10px',
    color: '#4a3728',
  },
  modalDesc: {
    fontSize: '14px',
    color: '#7c6350',
    lineHeight: 1.5,
    marginBottom: '20px',
  },
  rewardCard: {
    background: '#fdfbf7',
    border: '2px solid #ecdcb9',
    boxShadow: '0 4px 12px rgba(139, 92, 26, 0.04)',
    borderRadius: '16px',
    padding: '16px 32px',
    marginBottom: '20px',
    width: '100%',
  },
  rewardItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
  },
  rewardVal: {
    fontSize: '32px',
    fontWeight: 800,
    color: '#4ade80',
  },
  rewardLabel: {
    fontSize: '11px',
    color: '#7c6350',
    fontWeight: 700,
    letterSpacing: '0.5px',
    marginTop: '4px',
  },
  levelUpAlert: {
    background: '#fff8f8',
    border: '2px solid #fda4af',
    boxShadow: '0 4px 10px rgba(225, 29, 72, 0.06)',
    borderRadius: '12px',
    padding: '10px 16px',
    color: '#e11d48',
    fontSize: '13.5px',
    fontWeight: 700,
    marginBottom: '20px',
    width: '100%',
  },
  modalBtn: {
    width: '100%',
  },
  savingCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '16px',
    color: '#4a3728',
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
  soundPlayerCard: {
    width: '100%',
    maxWidth: '280px',
    padding: '12px 16px',
    marginBottom: '24px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  soundPlayerHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundPlayerTitle: {
    fontSize: '12.5px',
    color: '#7c6350',
    fontWeight: 800,
  },
  soundPlayerControls: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  soundSelect: {
    padding: '8px 10px',
    borderRadius: '10px',
    border: '2px solid #ecdcb9',
    outline: 'none',
    fontSize: '12px',
    background: '#ffffff',
    color: '#4a3728',
    fontWeight: 700,
    cursor: 'pointer',
  },
  volumeWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  volumeLabel: {
    fontSize: '11px',
    color: '#7c6350',
    fontWeight: 700,
  },
  volumeSlider: {
    flex: 1,
    accentColor: '#fbbf24',
    cursor: 'pointer',
  },
  volumePercent: {
    fontSize: '10.5px',
    color: '#a89280',
    fontWeight: 700,
    fontFamily: 'Fredoka, sans-serif',
    minWidth: '28px',
    textAlign: 'right' as const,
  }
};

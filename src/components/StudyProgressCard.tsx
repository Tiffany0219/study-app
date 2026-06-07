import React from 'react';
import { Flame, Clock, Target } from 'lucide-react';

interface StudyProgressCardProps {
  todayMinutes: number;
  dailyGoalMinutes: number;
  streak: number;
}

export const StudyProgressCard: React.FC<StudyProgressCardProps> = ({
  todayMinutes,
  dailyGoalMinutes,
  streak
}) => {
  const completionRate = dailyGoalMinutes > 0 
    ? Math.round((todayMinutes / dailyGoalMinutes) * 100) 
    : 0;

  // Circular progress SVG calculations
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(100, completionRate) / 100) * circumference;

  return (
    <div className="glass-card" style={styles.card}>
      <div style={styles.content}>
        {/* Left Circular Progress */}
        <div style={styles.circleContainer}>
          <svg width="120" height="120" viewBox="0 0 120 120">
            {/* Background Circle */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="transparent"
              stroke="#f1ede2"
              strokeWidth="10"
            />
            {/* Foreground Circle */}
            <circle
              cx="60"
              cy="60"
              r={radius}
              fill="transparent"
              stroke="url(#progressGradient)"
              strokeWidth="10"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{
                transform: 'rotate(-90deg)',
                transformOrigin: '50% 50%',
                transition: 'stroke-dashoffset 0.8s ease'
              }}
            />
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fde047" />
                <stop offset="100%" stopColor="#fb923c" />
              </linearGradient>
            </defs>
          </svg>
          <div style={styles.centerText}>
            <span style={styles.percentage}>{completionRate}%</span>
            <span style={styles.subtext}>達成率</span>
          </div>
        </div>

        {/* Right Stats Grid */}
        <div style={styles.statsGrid}>
          <div style={styles.statItem}>
            <div style={{ ...styles.iconBox, background: '#fff7ed' }}>
              <Clock size={16} color="#ea580c" />
            </div>
            <div style={styles.statText}>
              <span style={styles.statLabel}>今日專注</span>
              <span style={styles.statVal}>{todayMinutes} <span style={styles.statUnit}>分鐘</span></span>
            </div>
          </div>

          <div style={styles.statItem}>
            <div style={{ ...styles.iconBox, background: '#fef9c3' }}>
              <Target size={16} color="#ca8a04" />
            </div>
            <div style={styles.statText}>
              <span style={styles.statLabel}>每日目標</span>
              <span style={styles.statVal}>{dailyGoalMinutes} <span style={styles.statUnit}>分鐘</span></span>
            </div>
          </div>

          <div style={styles.statItem}>
            <div style={{ ...styles.iconBox, background: '#fee2e2' }}>
              <Flame size={16} color="#ef4444" />
            </div>
            <div style={styles.statText}>
              <span style={styles.statLabel}>連續讀書</span>
              <span style={styles.statVal}>{streak} <span style={styles.statUnit}>天</span></span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles = {
  card: {
    padding: '24px',
    marginBottom: '20px',
  },
  content: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '20px',
  },
  circleContainer: {
    position: 'relative' as const,
    width: '120px',
    height: '120px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerText: {
    position: 'absolute' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
  },
  percentage: {
    fontSize: '24px',
    fontWeight: 800,
    color: '#4a3728',
    letterSpacing: '-0.5px',
  },
  subtext: {
    fontSize: '10.5px',
    color: '#7c6350',
    fontWeight: 700,
    letterSpacing: '0.5px',
  },
  statsGrid: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  iconBox: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    border: '2px solid #ecdcb9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 4px rgba(139, 92, 26, 0.04)',
  },
  statText: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  statLabel: {
    fontSize: '11px',
    color: '#7c6350',
    fontWeight: 700,
  },
  statVal: {
    fontSize: '16px',
    fontWeight: 800,
    color: '#4a3728',
  },
  statUnit: {
    fontSize: '11px',
    color: '#a89280',
    fontWeight: 700,
  }
};

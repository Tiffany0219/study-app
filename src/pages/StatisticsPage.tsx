import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { StudyChart } from '../components/StudyChart';
import { BarChart2, Calendar, Award, BookOpen, Clock } from 'lucide-react';

import { parseDatabaseDate } from '../utils/date';

interface RecordItem {
  record_id: number;
  subject: string;
  duration: number;
  start_time: string;
  end_time: string;
  status: string;
  created_at: string;
}

interface StatsData {
  dailyGoalMinutes: number;
  todayMinutes: number;
  weekMinutes: number;
  monthMinutes: number;
  allTimeMinutes: number;
  streak: number;
  dailyBreakdown: Array<{ date: string; dayName: string; minutes: number }>;
  subjectBreakdown: Array<{ subject: string; minutes: number }>;
}

export const StatisticsPage: React.FC = () => {
  const { token } = useAuth();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [timelineActivities, setTimelineActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!token) return;
    try {
      // 1. Fetch stats
      const statsRes = await fetch('/api/study/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const statsData = statsRes.ok ? await statsRes.json() : null;

      // 2. Fetch raw history records
      const recordsRes = await fetch('/api/study/records', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const recordsData = recordsRes.ok ? await recordsRes.json() : [];

      // 3. Fetch timeline activities
      const timelineRes = await fetch('/api/timeline', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const timelineData = timelineRes.ok ? await timelineRes.json() : [];

      if (statsData) setStats(statsData);
      setRecords(recordsData);
      setTimelineActivities(timelineData);
    } catch (error) {
      console.error('Failed to load statistics data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  // Format YYYY-MM-DD HH:MM:SS to YYYY/MM/DD HH:MM
  const formatDateTime = (isoString: string) => {
    try {
      const d = parseDatabaseDate(isoString);
      const year = d.getFullYear();
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const day = d.getDate().toString().padStart(2, '0');
      const hours = d.getHours().toString().padStart(2, '0');
      const minutes = d.getMinutes().toString().padStart(2, '0');
      return `${year}/${month}/${day} ${hours}:${minutes}`;
    } catch {
      return isoString;
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <span>載入數據統計中...</span>
      </div>
    );
  }

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.header}>
        <h1 style={styles.title}>數據統計</h1>
        <p style={styles.subtitle}>追蹤你的學習歷程，見證每分每秒的專注。</p>
      </div>

      {/* Aggregate Stats Cards Grid */}
      {stats && (
        <div style={styles.statsGrid}>
          <div className="glass-card" style={styles.statBox}>
            <span style={styles.statLabel}>本週專注</span>
            <span style={styles.statVal}>
              {stats.weekMinutes} <span style={styles.statUnit}>分鐘</span>
            </span>
          </div>

          <div className="glass-card" style={styles.statBox}>
            <span style={styles.statLabel}>本月專注</span>
            <span style={styles.statVal}>
              {stats.monthMinutes} <span style={styles.statUnit}>分鐘</span>
            </span>
          </div>

          <div className="glass-card" style={styles.statBox}>
            <span style={styles.statLabel}>連續專注</span>
            <span style={styles.statVal}>
              {stats.streak} <span style={styles.statUnit}>天</span>
            </span>
          </div>

          <div className="glass-card" style={styles.statBox}>
            <span style={styles.statLabel}>累積時長</span>
            <span style={styles.statVal}>
              {stats.allTimeMinutes} <span style={styles.statUnit}>分鐘</span>
            </span>
          </div>
        </div>
      )}

      {/* Visual Charts (Daily Bar & Subject breakdown & Timeline categories) */}
      {stats && (
        <StudyChart 
          dailyBreakdown={stats.dailyBreakdown}
          subjectBreakdown={stats.subjectBreakdown}
          timelineActivities={timelineActivities}
        />
      )}

      {/* Raw Study Session History Timeline */}
      <div className="glass-card" style={styles.historyCard}>
        <h3 style={styles.historyTitle}>專注歷史紀錄</h3>
        
        {records.length === 0 ? (
          <div style={styles.noHistory}>
            <Clock size={32} color="#64748b" style={{ marginBottom: '10px' }} />
            <span>目前尚無任何專注紀錄，快去開始專注吧！</span>
          </div>
        ) : (
          <div style={styles.historyList}>
            {records.map((rec) => {
              const durationMins = Math.round(rec.duration / 60);
              const isCompleted = rec.status === 'completed';
              return (
                <div key={rec.record_id} style={styles.historyItem}>
                  <div style={styles.historyLeft}>
                    <div style={{
                      ...styles.subjectIcon,
                      background: isCompleted ? '#f0fdf4' : '#fef2f2',
                      border: isCompleted ? '1px solid #bbf7d0' : '1px solid #fecaca'
                    }}>
                      <BookOpen size={14} color={isCompleted ? '#16a34a' : '#dc2626'} />
                    </div>
                    <div>
                      <div style={styles.historySubject}>{rec.subject}</div>
                      <div style={styles.historyTime}>{formatDateTime(rec.start_time)}</div>
                    </div>
                  </div>

                  <div style={styles.historyRight}>
                    <span style={{
                      ...styles.historyDuration,
                      color: 'var(--text-primary)'
                    }}>
                      {durationMins} 分鐘
                    </span>
                    <span style={{
                      ...styles.historyStatus,
                      background: isCompleted ? '#f0fdf4' : '#fef2f2',
                      border: isCompleted ? '1.5px solid #bbf7d0' : '1.5px solid #fecaca',
                      color: isCompleted ? '#16a34a' : '#dc2626'
                    }}>
                      {isCompleted ? '已完成' : '已取消'}
                    </span>
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
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
    width: '100%',
  },
  statBox: {
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  statLabel: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  statVal: {
    fontSize: '20px',
    fontWeight: 800,
    color: 'var(--text-primary)',
    fontFamily: 'Fredoka, sans-serif',
  },
  statUnit: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  historyCard: {
    padding: '20px',
  },
  historyTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: '16px',
  },
  noHistory: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 0',
    color: 'var(--text-muted)',
    fontSize: '13px',
    textAlign: 'center' as const,
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    maxHeight: '320px',
    overflowY: 'auto' as const,
    paddingRight: '6px',
  },
  historyItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 14px',
    background: '#fffdfa',
    border: '1.5px solid #f3ebd8',
    borderRadius: '12px',
  },
  historyLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  subjectIcon: {
    width: '28px',
    height: '28px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historySubject: {
    fontSize: '13px',
    fontWeight: 600,
    color: 'var(--text-primary)',
  },
  historyTime: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    marginTop: '2px',
  },
  historyRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  historyDuration: {
    fontSize: '13px',
    fontWeight: 700,
    fontFamily: 'Fredoka, sans-serif',
  },
  historyStatus: {
    fontSize: '10px',
    padding: '2px 8px',
    borderRadius: '6px',
    fontWeight: 600,
  },
  loadingContainer: {
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

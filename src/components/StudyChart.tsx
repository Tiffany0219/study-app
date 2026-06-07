import React from 'react';

interface DailyData {
  date: string;
  dayName: string;
  minutes: number;
}

interface SubjectData {
  subject: string;
  minutes: number;
}

interface TimelineActivityData {
  category: 'study' | 'class' | 'homework' | 'rest' | 'entertainment' | 'wasted';
  duration: number; // in seconds
}

interface StudyChartProps {
  dailyBreakdown: DailyData[];
  subjectBreakdown: SubjectData[];
  timelineActivities?: TimelineActivityData[];
}

export const StudyChart: React.FC<StudyChartProps> = ({
  dailyBreakdown,
  subjectBreakdown,
  timelineActivities
}) => {
  // Find max minutes to scale the bars
  const maxMinutes = Math.max(...dailyBreakdown.map(d => d.minutes), 10); // at least 10 for scaling

  // Calculate total subject minutes for percentage
  const totalSubjectMinutes = subjectBreakdown.reduce((sum, s) => sum + s.minutes, 0);

  // Curated cozy cream-cheese color list for subject badges
  const subjectColors = [
    '#ca8a04', // gold/amber
    '#f97316', // orange
    '#7c6350', // coffee
    '#ea580c', // dark orange
    '#dc2626', // rose red
    '#a89280', // muted sand
  ];

  // Aggregate timeline activities
  let studyMins = 0;
  let restMins = 0;
  let playMins = 0;
  let wasteMins = 0;

  if (timelineActivities) {
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
  }
  const totalTimelineMins = studyMins + restMins + playMins + wasteMins;

  return (
    <div style={styles.container}>
      {/* 1. Daily Study Bar Chart */}
      <div className="glass-card" style={styles.card}>
        <h3 style={styles.chartTitle}>過去 7 天專注趨勢</h3>
        <div style={styles.barChartContainer}>
          <div style={styles.chartArea}>
            {dailyBreakdown.map((day, idx) => {
              const heightPercent = (day.minutes / maxMinutes) * 100;
              const isToday = idx === dailyBreakdown.length - 1;
              return (
                <div key={day.date + idx} style={styles.barCol}>
                  <div style={styles.tooltip} className="bar-tooltip">{day.minutes} 分</div>
                  <div style={styles.barTrack}>
                    <div 
                      style={{
                        ...styles.barFill,
                        height: `${heightPercent}%`,
                        background: isToday 
                          ? 'linear-gradient(to top, #fbbf24, #f59e0b)' // Highlight today in warm gold
                          : 'linear-gradient(to top, #ecdcb9, #d8c7a2)' // Cozy sand color for other days
                      }} 
                    />
                  </div>
                  <span style={{
                    ...styles.dayLabel,
                    color: isToday ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: isToday ? 800 : 600
                  }}>{day.dayName}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 2. Today's Timeline Category breakdown */}
      {timelineActivities && (
        <div className="glass-card" style={styles.card}>
          <h3 style={styles.chartTitle}>今日時間分類統計</h3>
          {totalTimelineMins === 0 ? (
            <div style={styles.noData}>今天尚無任何時間線活動記錄</div>
          ) : (
            <div style={styles.subjectList}>
              {[
                { label: '學習與上課 📚 (讀書/學校/作業)', mins: studyMins, color: '#f59e0b' },
                { label: '放空休息 ☕', mins: restMins, color: '#f97316' },
                { label: '休閒娛樂 🎮', mins: playMins, color: '#e11d48' },
                { label: '浪費時間 📱', mins: wasteMins, color: '#7c6350' }
              ].map((item) => {
                const pct = totalTimelineMins > 0 ? Math.round((item.mins / totalTimelineMins) * 100) : 0;
                return (
                  <div key={item.label} style={styles.subjectItem}>
                    <div style={styles.subjectMeta}>
                      <div style={styles.subjectInfo}>
                        <span style={{ ...styles.colorDot, background: item.color }} />
                        <span style={styles.subjectName}>{item.label}</span>
                      </div>
                      <span style={styles.subjectVal}>
                        {item.mins} 分鐘 <span style={styles.subjectPct}>({pct}%)</span>
                      </span>
                    </div>
                    <div style={styles.subjectBarBg}>
                      <div 
                        style={{
                          ...styles.subjectBarFill,
                          width: `${pct}%`,
                          background: item.color
                        }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3. Subject Breakdown */}
      <div className="glass-card" style={styles.card}>
        <h3 style={styles.chartTitle}>各科目讀書比例</h3>
        {subjectBreakdown.length === 0 ? (
          <div style={styles.noData}>目前尚無完成的專注科目數據</div>
        ) : (
          <div style={styles.subjectList}>
            {subjectBreakdown.map((subj, idx) => {
              const color = subjectColors[idx % subjectColors.length];
              const pct = totalSubjectMinutes > 0 
                ? Math.round((subj.minutes / totalSubjectMinutes) * 100) 
                : 0;

              return (
                <div key={subj.subject} style={styles.subjectItem}>
                  <div style={styles.subjectMeta}>
                    <div style={styles.subjectInfo}>
                      <span 
                        style={{
                          ...styles.colorDot,
                          background: color
                        }} 
                      />
                      <span style={styles.subjectName}>{subj.subject}</span>
                    </div>
                    <span style={styles.subjectVal}>
                      {subj.minutes} 分 <span style={styles.subjectPct}>({pct}%)</span>
                    </span>
                  </div>
                  <div style={styles.subjectBarBg}>
                    <div 
                      style={{
                        ...styles.subjectBarFill,
                        width: `${pct}%`,
                        background: color
                      }} 
                    />
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
    width: '100%',
  },
  card: {
    padding: '20px',
    background: '#ffffff',
    border: '2px solid #ecdcb9',
  },
  chartTitle: {
    fontSize: '15px',
    fontWeight: 800,
    color: 'var(--text-primary)',
    marginBottom: '20px',
    letterSpacing: '0.2px',
  },
  barChartContainer: {
    paddingTop: '20px',
  },
  chartArea: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: '160px',
    paddingBottom: '24px',
    borderBottom: '2px solid #f3ebd8',
  },
  barCol: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    width: '12%',
    height: '100%',
    justifyContent: 'flex-end',
    position: 'relative' as const,
    cursor: 'pointer',
  },
  barTrack: {
    width: '10px',
    height: '100%',
    background: '#fcfaf5',
    border: '1.5px solid #ecdcb9',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    borderRadius: '10px',
    transition: 'height 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
  },
  dayLabel: {
    fontSize: '11px',
    marginTop: '10px',
  },
  tooltip: {
    position: 'absolute' as const,
    bottom: '100%',
    background: '#4a3728',
    border: '1.5px solid #ecdcb9',
    borderRadius: '6px',
    padding: '4px 8px',
    fontSize: '10px',
    color: '#faf6ed',
    fontWeight: 700,
    whiteSpace: 'nowrap' as const,
    opacity: 0,
    transform: 'translateY(5px)',
    transition: 'opacity 0.2s, transform 0.2s',
    pointerEvents: 'none' as const,
  },
  noData: {
    textAlign: 'center' as const,
    color: 'var(--text-muted)',
    fontSize: '13px',
    padding: '30px 0',
    fontWeight: 600,
  },
  subjectList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  subjectItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  subjectMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subjectInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  colorDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  subjectName: {
    fontSize: '13px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  subjectVal: {
    fontSize: '12px',
    fontWeight: 700,
    color: 'var(--text-secondary)',
  },
  subjectPct: {
    color: 'var(--text-muted)',
    fontWeight: 500,
  },
  subjectBarBg: {
    height: '8px',
    background: '#fcfaf5',
    border: '1.5px solid #ecdcb9',
    borderRadius: '10px',
    width: '100%',
    overflow: 'hidden',
  },
  subjectBarFill: {
    height: '100%',
    borderRadius: '10px',
    transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
  }
};

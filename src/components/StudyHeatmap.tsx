import React, { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface HeatmapProps {
  token: string;
}

export const StudyHeatmap: React.FC<HeatmapProps> = ({ token }) => {
  const [data, setData] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHeatmap = async () => {
      try {
        const res = await fetch('/api/study/heatmap', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error('Failed to fetch heatmap:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchHeatmap();
  }, [token]);

  if (loading) {
    return (
      <div style={styles.loading}>
        <Loader2 className="animate-spin" size={20} color="#fbbf24" />
        <span style={styles.loadingText}>載入熱力圖中...</span>
      </div>
    );
  }

  // Generate 53 weeks of dates (ending today)
  const today = new Date();
  const dateList: Date[] = [];
  
  // Find start date: 364 days ago
  const startDate = new Date();
  startDate.setDate(today.getDate() - 364);
  // Align to Sunday of that week
  const startDay = startDate.getDay();
  startDate.setDate(startDate.getDate() - startDay);

  // Generate date array
  let curr = new Date(startDate.getTime());
  // Generate exactly 53 weeks * 7 days
  const totalDays = 53 * 7;
  for (let i = 0; i < totalDays; i++) {
    dateList.push(new Date(curr.getTime()));
    curr.setDate(curr.getDate() + 1);
  }

  // Group into weeks (columns)
  const weeks: Date[][] = [];
  for (let i = 0; i < 53; i++) {
    weeks.push(dateList.slice(i * 7, (i + 1) * 7));
  }

  // Get color based on study minutes
  const getColor = (mins: number) => {
    if (!mins || mins === 0) return '#f8f1e5'; // neutral cream
    if (mins <= 30) return '#fef08a'; // light yellow
    if (mins <= 60) return '#fde047'; // medium yellow
    if (mins <= 120) return '#f59e0b'; // orange
    return '#d97706'; // dark gold
  };

  // Format date to YYYY-MM-DD
  const formatDateStr = (date: Date) => {
    const y = date.getFullYear();
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const d = date.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Format month labels
  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  
  // Find columns that start a new month
  const monthLabels: Array<{ text: string; colIndex: number }> = [];
  let lastMonth = -1;
  weeks.forEach((week, colIndex) => {
    const firstDay = week[0];
    const month = firstDay.getMonth();
    if (month !== lastMonth) {
      monthLabels.push({ text: monthNames[month], colIndex });
      lastMonth = month;
    }
  });

  return (
    <div className="glass-card animate-fade-in" style={styles.card}>
      <h3 style={styles.title}>📅 學習貢獻熱力圖 (年度專注統計)</h3>
      
      {/* Scrollable container for mobile */}
      <div style={styles.heatmapWrapper}>
        <div style={styles.gridContainer}>
          {/* Day of week labels */}
          <div style={styles.dayLabelsCol}>
            <span style={styles.dayLabel}>日</span>
            <span style={styles.dayLabel}>二</span>
            <span style={styles.dayLabel}>四</span>
            <span style={styles.dayLabel}>六</span>
          </div>

          <div style={styles.mainGridCol}>
            {/* Month labels row */}
            <div style={styles.monthRow}>
              {weeks.map((_, idx) => {
                const label = monthLabels.find(l => l.colIndex === idx);
                return (
                  <div key={idx} style={styles.monthLabelCell}>
                    {label ? <span style={styles.monthText}>{label.text}</span> : null}
                  </div>
                );
              })}
            </div>

            {/* Squares grid */}
            <div style={styles.weeksGrid}>
              {weeks.map((week, wIdx) => (
                <div key={wIdx} style={styles.weekColumn}>
                  {week.map((date) => {
                    const dateStr = formatDateStr(date);
                    const mins = data[dateStr] || 0;
                    const color = getColor(mins);
                    const isFuture = date > today;
                    return (
                      <div
                        key={dateStr}
                        style={{
                          ...styles.square,
                          background: isFuture ? '#f3ebd8' : color,
                          opacity: isFuture ? 0.3 : 1,
                          cursor: isFuture ? 'default' : 'pointer',
                        }}
                        title={
                          isFuture 
                            ? `${dateStr} (未來)` 
                            : `${dateStr} : ${mins > 0 ? `專注 ${mins} 分鐘` : '無專注數據'}`
                        }
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={styles.legendRow}>
        <span style={styles.legendText}>少</span>
        <div style={{ ...styles.legendSquare, background: '#f8f1e5' }} title="0 分鐘" />
        <div style={{ ...styles.legendSquare, background: '#fef08a' }} title="1 - 30 分鐘" />
        <div style={{ ...styles.legendSquare, background: '#fde047' }} title="31 - 60 分鐘" />
        <div style={{ ...styles.legendSquare, background: '#f59e0b' }} title="61 - 120 分鐘" />
        <div style={{ ...styles.legendSquare, background: '#d97706' }} title="> 120 分鐘" />
        <span style={styles.legendText}>多</span>
      </div>
    </div>
  );
};

const styles = {
  card: {
    width: '100%',
    padding: '24px 20px',
    marginBottom: '20px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  title: {
    fontSize: '15px',
    fontWeight: 800,
    color: '#4a3728',
    letterSpacing: '-0.3px',
  },
  heatmapWrapper: {
    width: '100%',
    overflowX: 'auto' as const,
    paddingBottom: '8px',
    WebkitOverflowScrolling: 'touch' as const,
  },
  gridContainer: {
    display: 'flex',
    gap: '8px',
    minWidth: '720px', // Ensure grid doesn't squeeze on small viewports
  },
  dayLabelsCol: {
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'space-between',
    paddingTop: '20px', // Align with squares row (below month text)
    paddingBottom: '4px',
    height: '110px',
  },
  dayLabel: {
    fontSize: '9px',
    color: '#a89280',
    fontWeight: 700,
    lineHeight: 1,
  },
  mainGridCol: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    flex: 1,
  },
  monthRow: {
    display: 'flex',
    height: '16px',
    width: '100%',
  },
  monthLabelCell: {
    width: '13px', // matches week column width + gap
    flexShrink: 0,
    position: 'relative' as const,
  },
  monthText: {
    position: 'absolute' as const,
    left: 0,
    top: 0,
    fontSize: '9.5px',
    color: '#7c6350',
    fontWeight: 700,
    whiteSpace: 'nowrap' as const,
  },
  weeksGrid: {
    display: 'flex',
    gap: '3px',
  },
  weekColumn: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '3px',
    width: '10px',
  },
  square: {
    width: '10px',
    height: '10px',
    borderRadius: '2.5px',
    transition: 'transform 0.1s ease',
  },
  legendRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: '4px',
    fontSize: '11px',
    color: '#a89280',
    fontWeight: 600,
  },
  legendText: {
    margin: '0 4px',
  },
  legendSquare: {
    width: '10px',
    height: '10px',
    borderRadius: '2.5px',
    border: '1px solid rgba(74, 55, 40, 0.05)',
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '40px',
    background: 'rgba(255, 255, 255, 0.4)',
    borderRadius: '16px',
    border: '2px solid #ecdcb9',
  },
  loadingText: {
    fontSize: '13px',
    color: '#7c6350',
    fontWeight: 600,
  }
};

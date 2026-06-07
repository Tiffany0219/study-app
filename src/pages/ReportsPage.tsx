import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Calendar, Clock, BookOpen, Flame, Award, Sparkles, Plus, AlertCircle, ChevronRight, BarChart2 } from 'lucide-react';

interface Report {
  reportId: number;
  reportType: 'weekly' | 'monthly';
  startDate: string;
  endDate: string;
  totalDuration: number; // minutes
  favoriteSubject: string;
  wastedDuration: number; // minutes
  streakDays: number;
  goalMetRate: number;
  aiSummary: string;
  createdAt: string;
}

export const ReportsPage: React.FC = () => {
  const { token } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'weekly' | 'monthly'>('weekly');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const fetchReports = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/reports/list', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReports(data);
        // Default select the latest report of current active tab if available
        const filtered = data.filter((r: Report) => r.reportType === activeTab);
        if (filtered.length > 0) {
          setSelectedReport(filtered[0]);
        } else {
          setSelectedReport(null);
        }
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [token]);

  // Update selected report when switching tab
  const handleTabChange = (tab: 'weekly' | 'monthly') => {
    setActiveTab(tab);
    const filtered = reports.filter(r => r.reportType === tab);
    if (filtered.length > 0) {
      setSelectedReport(filtered[0]);
    } else {
      setSelectedReport(null);
    }
  };

  const handleGenerateReport = async () => {
    if (!token || generating) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ reportType: activeTab })
      });

      if (res.ok) {
        const data = await res.json();
        setReports(prev => [data.report, ...prev]);
        setSelectedReport(data.report);
      } else {
        const data = await res.json();
        alert(data.message || '生成報告失敗');
      }
    } catch (err) {
      console.error(err);
      alert('連線異常，請稍後再試');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <span>載入學習週月報數據中...</span>
      </div>
    );
  }

  const filteredReports = reports.filter(r => r.reportType === activeTab);

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.header}>
        <h1 style={styles.title}>學習週報與月報</h1>
        <p style={styles.subtitle}>系統分析你近期的讀書數據，配合 AI 點評，幫助你長期改善學習習慣。</p>
      </div>

      {/* Tabs */}
      <div style={styles.tabsContainer}>
        <div style={styles.tabs}>
          <button 
            onClick={() => handleTabChange('weekly')}
            style={{
              ...styles.tabBtn,
              ...(activeTab === 'weekly' ? styles.tabBtnActive : {})
            }}
          >
            學習週報 📅
          </button>
          <button 
            onClick={() => handleTabChange('monthly')}
            style={{
              ...styles.tabBtn,
              ...(activeTab === 'monthly' ? styles.tabBtnActive : {})
            }}
          >
            學習月報 ⏳
          </button>
        </div>

        <button 
          onClick={handleGenerateReport}
          disabled={generating}
          style={styles.generateBtn}
          className="btn btn-primary"
        >
          <Plus size={16} />
          <span>{generating ? 'AI 正在分析統整中...' : `產生新${activeTab === 'weekly' ? '週' : '月'}報`}</span>
        </button>
      </div>

      <div className="responsive-layout-grid-right-main">
        {/* Left Side: Report history list */}
        <div style={styles.historyCol}>
          <h3 style={styles.sectionTitle}>報告歷史紀錄 ({filteredReports.length})</h3>
          {filteredReports.length === 0 ? (
            <div className="glass-card" style={styles.emptyHistory}>
              <BarChart2 size={32} color="#a89280" />
              <p style={{ marginTop: '8px', fontSize: '12px', fontWeight: 600 }}>目前尚未生成任何報告喔</p>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>點擊右上角按鈕即可快速產生！</p>
            </div>
          ) : (
            <div style={styles.historyList}>
              {filteredReports.map((report) => {
                const isSelected = selectedReport?.reportId === report.reportId;
                return (
                  <div 
                    key={report.reportId}
                    onClick={() => setSelectedReport(report)}
                    style={{
                      ...styles.historyItem,
                      ...(isSelected ? styles.historyItemActive : {})
                    }}
                  >
                    <div style={styles.itemHeader}>
                      <span style={{
                        ...styles.itemTypeTag,
                        background: report.reportType === 'weekly' ? '#fef9c3' : '#e0f2fe',
                        color: report.reportType === 'weekly' ? '#ca8a04' : '#0369a1',
                      }}>
                        {report.reportType === 'weekly' ? '週報' : '月報'}
                      </span>
                      <span style={styles.itemDate}>{report.startDate} 至 {report.endDate}</span>
                    </div>
                    <div style={styles.itemSummaryRow}>
                      <span>專注：{(report.totalDuration / 60).toFixed(1)} 小時</span>
                      <span>目標達成：{report.goalMetRate}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Report details display */}
        <div style={styles.detailCol}>
          {selectedReport ? (
            <div className="glass-card" style={styles.detailCard}>
              <div style={styles.detailHeader}>
                <h2 style={styles.detailTitle}>
                  {selectedReport.reportType === 'weekly' ? '學習週報' : '學習月報'}
                </h2>
                <span style={styles.detailSubtitle}>
                  區間：{selectedReport.startDate} ～ {selectedReport.endDate}
                </span>
              </div>

              {/* Grid of stats metrics */}
              <div style={styles.statsGrid}>
                {/* 1. Total Duration */}
                <div style={styles.statCard}>
                  <div style={{ ...styles.statIconCircle, background: '#fef9c3' }}>
                    <Clock size={18} color="#ca8a04" />
                  </div>
                  <div style={styles.statInfo}>
                    <span style={styles.statLabel}>累計專注時長</span>
                    <h3 style={styles.statValue}>
                      {(selectedReport.totalDuration / 60).toFixed(1)} <span style={styles.unit}>小時</span>
                    </h3>
                  </div>
                </div>

                {/* 2. Goal Met Rate */}
                <div style={styles.statCard}>
                  <div style={{ ...styles.statIconCircle, background: '#ecfdf5' }}>
                    <Award size={18} color="#059669" />
                  </div>
                  <div style={styles.statInfo}>
                    <span style={styles.statLabel}>每日目標達成率</span>
                    <h3 style={styles.statValue}>
                      {selectedReport.goalMetRate} <span style={styles.unit}>%</span>
                    </h3>
                  </div>
                </div>

                {/* 3. Favorite Subject */}
                <div style={styles.statCard}>
                  <div style={{ ...styles.statIconCircle, background: '#e0f2fe' }}>
                    <BookOpen size={18} color="#0284c7" />
                  </div>
                  <div style={styles.statInfo}>
                    <span style={styles.statLabel}>最常讀的科目</span>
                    <h3 style={{ ...styles.statValue, fontSize: '16px' }}>
                      {selectedReport.favoriteSubject}
                    </h3>
                  </div>
                </div>

                {/* 4. Wasted Hours */}
                <div style={styles.statCard}>
                  <div style={{ ...styles.statIconCircle, background: '#fcfaf5' }}>
                    <AlertCircle size={18} color="#7c6350" />
                  </div>
                  <div style={styles.statInfo}>
                    <span style={styles.statLabel}>累計分心時長</span>
                    <h3 style={styles.statValue}>
                      {(selectedReport.wastedDuration / 60).toFixed(1)} <span style={styles.unit}>小時</span>
                    </h3>
                  </div>
                </div>

                {/* 5. Streak Days */}
                <div style={styles.statCard}>
                  <div style={{ ...styles.statIconCircle, background: '#fff7ed' }}>
                    <Flame size={18} color="#ea580c" />
                  </div>
                  <div style={styles.statInfo}>
                    <span style={styles.statLabel}>專注學習天數</span>
                    <h3 style={styles.statValue}>
                      {selectedReport.streakDays} <span style={styles.unit}>天</span>
                    </h3>
                  </div>
                </div>
              </div>

              {/* AI Coaching summary section */}
              <div style={styles.aiSection}>
                <div style={styles.aiHeader}>
                  <Sparkles size={18} color="#7c3aed" fill="#7c3aed" />
                  <span style={styles.aiTitle}>AI 學習顧問長期點評</span>
                </div>
                <div style={styles.aiContentBox}>
                  <p style={styles.aiAdviceText}>{selectedReport.aiSummary}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card" style={styles.selectPrompt}>
              <span style={{ fontSize: '36px', marginBottom: '12px' }}>📊</span>
              <h3>請選擇一份報告查看</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>
                如果左側清單為空，請點選右上角按鈕產生新報告。
              </p>
            </div>
          )}
        </div>
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
  tabsContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap' as const,
  },
  tabs: {
    display: 'flex',
    background: '#fcfaf5',
    border: '2px solid #ecdcb9',
    borderRadius: '12px',
    padding: '4px',
    gap: '4px',
  },
  tabBtn: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    background: 'transparent',
    color: '#7c6350',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  tabBtnActive: {
    background: '#ffffff',
    boxShadow: '0 2.5px 6px rgba(139, 92, 26, 0.08)',
    color: '#ca8a04',
  },
  generateBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    borderRadius: '12px',
    padding: '0 20px',
    height: '42px',
  },
  contentLayout: {
    display: 'grid',
    gridTemplateColumns: '300px 1fr',
    gap: '20px',
    alignItems: 'start',
  },
  historyCol: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#4a3728',
    letterSpacing: '0.2px',
  },
  emptyHistory: {
    padding: '30px 20px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center' as const,
    color: 'var(--text-muted)',
  },
  historyList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    maxHeight: '520px',
    overflowY: 'auto' as const,
  },
  historyItem: {
    padding: '14px',
    background: '#ffffff',
    border: '1.5px solid #f3ebd8',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  historyItemActive: {
    background: '#fffdfa',
    borderColor: '#fdba74',
    boxShadow: '0 4px 10px rgba(249, 115, 22, 0.05)',
  },
  itemHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  itemTypeTag: {
    fontSize: '9.5px',
    padding: '1px 5px',
    borderRadius: '4px',
    fontWeight: 800,
  },
  itemDate: {
    fontSize: '11px',
    color: 'var(--text-primary)',
    fontWeight: 700,
  },
  itemSummaryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  detailCol: {
    flex: 1,
  },
  detailCard: {
    padding: '24px',
  },
  detailHeader: {
    borderBottom: '2px dashed #f3ebd8',
    paddingBottom: '16px',
    marginBottom: '20px',
  },
  detailTitle: {
    fontSize: '20px',
    fontWeight: 800,
    color: '#4a3728',
  },
  detailSubtitle: {
    fontSize: '12px',
    color: '#a89280',
    fontWeight: 700,
    marginTop: '4px',
    display: 'block',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    background: '#fffdfa',
    border: '1.5px solid #f3ebd8',
    borderRadius: '16px',
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  statIconCircle: {
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 5px rgba(139, 92, 26, 0.04)',
  },
  statInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },
  statLabel: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  statValue: {
    fontSize: '20px',
    fontWeight: 800,
    color: '#4a3728',
    letterSpacing: '-0.3px',
  },
  unit: {
    fontSize: '12px',
    color: '#7c6350',
    fontWeight: 700,
  },
  aiSection: {
    marginTop: '20px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  aiHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  aiTitle: {
    fontSize: '14px',
    fontWeight: 800,
    color: '#7c3aed',
  },
  aiContentBox: {
    background: 'linear-gradient(135deg, #f5f3ff 0%, #fffbeb 100%)',
    border: '1.5px solid #ddd6fe',
    borderRadius: '16px',
    padding: '16px 20px',
  },
  aiAdviceText: {
    fontSize: '13px',
    color: '#5b21b6',
    lineHeight: '1.6',
    margin: 0,
    fontWeight: 500,
  },
  selectPrompt: {
    height: '240px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--text-muted)',
    textAlign: 'center' as const,
    padding: '20px',
  },
  loadingContainer: {
    height: '240px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    color: 'var(--text-secondary)',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3.5px solid #f3ebd8',
    borderTopColor: '#ca8a04',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
};

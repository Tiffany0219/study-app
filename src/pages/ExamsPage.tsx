import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Calendar, Trash2, Plus, Sparkles, Clock, AlertTriangle, ChevronRight, BookOpen, Check } from 'lucide-react';

interface Exam {
  itemId: number;
  title: string;
  targetDate: string;
  type: string;
  createdAt: string;
  plan: { planId: number; planText: string } | null;
  groupId?: number | null;
  groupName?: string | null;
}

interface Group {
  groupId: number;
  groupName: string;
}

export const ExamsPage: React.FC = () => {
  const { token } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [titleInput, setTitleInput] = useState('');
  const [dateInput, setDateInput] = useState('');
  const [typeInput, setTypeInput] = useState<string>('exam');
  const [customTypeInput, setCustomTypeInput] = useState('');
  const [publishScope, setPublishScope] = useState<string>('personal');
  const [submitting, setSubmitting] = useState(false);

  // Plan Detail States
  const [activePlanExam, setActivePlanExam] = useState<Exam | null>(null);
  const [generatingPlan, setGeneratingPlan] = useState(false);

  const fetchExams = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/exams', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setExams(data);

        // Sync active plan detail modal if it's currently open
        if (activePlanExam) {
          const updated = data.find((e: Exam) => e.itemId === activePlanExam.itemId);
          if (updated) {
            setActivePlanExam(updated);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load exams:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/groups', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setGroups(data);
      }
    } catch (err) {
      console.error('Failed to load groups:', err);
    }
  };

  useEffect(() => {
    fetchExams();
    fetchGroups();
  }, [token]);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!titleInput.trim() || !dateInput || !token) return;

    const finalType = typeInput === 'custom' ? customTypeInput.trim() : typeInput;
    if (!finalType) {
      alert('請填寫或選擇倒數類型');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/exams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: titleInput.trim(),
          targetDate: dateInput,
          type: finalType,
          groupId: publishScope === 'personal' ? null : Number(publishScope)
        })
      });

      if (res.ok) {
        setTitleInput('');
        setDateInput('');
        setTypeInput('exam');
        setCustomTypeInput('');
        setPublishScope('personal');
        setShowAddModal(false);
        fetchExams();
      } else {
        const data = await res.json();
        alert(data.message || '新增失敗');
      }
    } catch (err) {
      console.error(err);
      alert('網路異常，請稍後再試');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExam = async (itemId: number) => {
    const confirmDelete = window.confirm('確定要刪除這個倒數項目嗎？');
    if (!confirmDelete || !token) return;

    try {
      const res = await fetch(`/api/exams/${itemId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        if (activePlanExam?.itemId === itemId) {
          setActivePlanExam(null);
        }
        fetchExams();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleGeneratePlan = async (exam: Exam) => {
    if (!token || generatingPlan) return;
    setGeneratingPlan(true);
    try {
      const res = await fetch(`/api/exams/${exam.itemId}/plan`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        await fetchExams();
      } else {
        const data = await res.json();
        alert(data.message || '計畫生成失敗');
      }
    } catch (err) {
      console.error(err);
      alert('連線異常');
    } finally {
      setGeneratingPlan(false);
    }
  };

  const calculateDaysRemaining = (targetDateStr: string) => {
    const target = new Date(targetDateStr);
    const today = new Date();
    target.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const typeConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
    exam: { label: '重要考試 📝', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
    homework: { label: '作業截止 ✏️', color: '#ea580c', bg: '#fff7ed', border: '#ffedd5' },
    project: { label: '專題發表 💻', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
    quiz: { label: '平時小考 📖', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  };

  const getBadgeConfig = (type: string) => {
    return typeConfig[type] || {
      label: type,
      color: '#b45309',
      bg: '#fef3c7',
      border: '#fde68a',
    };
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <span>載入考試與截止日倒數中...</span>
      </div>
    );
  }

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.header}>
        <h1 style={styles.title}>考試倒數與讀書排程</h1>
        <p style={styles.subtitle}>管理期末考、證照檢定與作業截止日，並由 AI 幫你排定黃金衝刺複習計畫。</p>
      </div>

      <div style={styles.actionRow}>
        <button 
          onClick={() => setShowAddModal(true)}
          style={styles.addBtn}
          className="btn btn-primary"
        >
          <Plus size={16} />
          <span>新增倒數項目</span>
        </button>
      </div>

      <div className="responsive-layout-grid-left-main">
        {/* Left list: Exams deadlines list */}
        <div style={styles.listCol}>
          {exams.length === 0 ? (
            <div className="glass-card" style={styles.emptyCard}>
              <Calendar size={48} color="#a89280" style={{ marginBottom: '12px' }} />
              <h3 style={{ fontSize: '15px', color: '#4a3728', fontWeight: 800 }}>目前沒有倒數項目</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                快在上方點選新增期末考或作業截止日期吧！
              </p>
            </div>
          ) : (
            <div style={styles.gridList}>
              {exams.map((exam) => {
                const daysLeft = calculateDaysRemaining(exam.targetDate);
                const conf = getBadgeConfig(exam.type);
                const isSelected = activePlanExam?.itemId === exam.itemId;

                return (
                  <div 
                    key={exam.itemId}
                    style={{
                      ...styles.examCard,
                      ...(isSelected ? styles.examCardSelected : {})
                    }}
                    onClick={() => setActivePlanExam(exam)}
                  >
                    <div style={styles.examCardHeader}>
                      <div style={styles.badgeContainer}>
                        <span style={{
                          ...styles.typeTag,
                          color: conf.color,
                          background: conf.bg,
                          border: `1.5px solid ${conf.border}`
                        }}>
                          {conf.label}
                        </span>
                        {exam.groupName && (
                          <span style={styles.groupBadge}>
                            👥 {exam.groupName}
                          </span>
                        )}
                      </div>
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteExam(exam.itemId);
                        }}
                        style={styles.deleteBtn}
                        title="刪除"
                      >
                        <Trash2 size={14} color="#7c6350" />
                      </button>
                    </div>

                    <h3 style={styles.examTitle}>{exam.title}</h3>
                    
                    <div style={styles.dateRow}>
                      <Clock size={12} color="#a89280" />
                      <span style={styles.dateText}>{exam.targetDate}</span>
                    </div>

                    <div style={styles.countdownRow}>
                      <span style={styles.countdownLabel}>剩餘時間</span>
                      <span style={{
                        ...styles.countdownValue,
                        color: daysLeft <= 3 ? '#ef4444' : daysLeft <= 7 ? '#f97316' : '#22c55e'
                      }}>
                        {daysLeft > 0 ? `${daysLeft} 天` : daysLeft === 0 ? '就在今天！' : '已到期'}
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActivePlanExam(exam);
                        if (!exam.plan) {
                          handleGeneratePlan(exam);
                        }
                      }}
                      style={{
                        ...styles.planTriggerBtn,
                        background: exam.plan ? '#f5f3ff' : '#ffffff',
                        borderColor: exam.plan ? '#ddd6fe' : '#ecdcb9',
                        color: exam.plan ? '#7c3aed' : '#7c6350',
                      }}
                    >
                      <Sparkles size={12} fill={exam.plan ? '#7c3aed' : 'none'} />
                      <span>{exam.plan ? '查看 AI 衝刺計畫' : 'AI 排定衝刺計畫'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right side: AI generated plan presentation */}
        <div style={styles.planCol}>
          {activePlanExam ? (
            <div className="glass-card" style={styles.planCard}>
              <div style={styles.planHeader}>
                <h3 style={styles.planExamTitle}>{activePlanExam.title} 🎯</h3>
                <span style={styles.planExamSub}>
                  倒數天數：
                  <strong style={{ color: '#ea580c' }}>
                    {calculateDaysRemaining(activePlanExam.targetDate)} 天
                  </strong>
                </span>
              </div>

              {activePlanExam.plan ? (
                <div style={styles.planContent}>
                  <div style={styles.aiTitleRow}>
                    <Sparkles size={16} color="#7c3aed" fill="#7c3aed" />
                    <span style={styles.aiTitleText}>AI 獨家複習計畫表</span>
                  </div>

                  <div style={styles.markdownBox}>
                    {activePlanExam.plan.planText.split('\n').map((line, idx) => {
                      // Simple markdown parser rendering
                      if (line.trim().startsWith('*') || line.trim().startsWith('-')) {
                        const content = line.replace(/^[\s*-]+/, '').trim();
                        // Parse bold text **foo** -> <strong>foo</strong>
                        const parts = content.split('**');
                        return (
                          <div key={idx} style={styles.planBullet}>
                            <div style={styles.bulletDot} />
                            <span style={styles.bulletText}>
                              {parts.map((p, i) => i % 2 === 1 ? <strong key={i} style={{ color: '#4a3728' }}>{p}</strong> : p)}
                            </span>
                          </div>
                        );
                      }
                      if (line.trim() === '') return <div key={idx} style={{ height: '8px' }} />;
                      const parts = line.split('**');
                      return (
                        <p key={idx} style={styles.planPara}>
                          {parts.map((p, i) => i % 2 === 1 ? <strong key={i} style={{ color: '#4a3728' }}>{p}</strong> : p)}
                        </p>
                      );
                    })}
                  </div>

                  <button 
                    onClick={() => handleGeneratePlan(activePlanExam)}
                    disabled={generatingPlan}
                    style={styles.regenerateBtn}
                    className="btn btn-outline"
                  >
                    <Sparkles size={14} />
                    <span>{generatingPlan ? '重新排定中...' : '重新生成讀書計畫'}</span>
                  </button>
                </div>
              ) : (
                <div style={styles.noPlanBox}>
                  <Sparkles size={32} color="#7c3aed" style={{ marginBottom: '12px' }} />
                  <h4>尚未產生複習計畫</h4>
                  <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px', textAlign: 'center' }}>
                    點選下方按鈕，AI 將根據倒數天數為您特別制定專屬的三階段黃金衝刺計畫。
                  </p>
                  <button 
                    onClick={() => handleGeneratePlan(activePlanExam)}
                    disabled={generatingPlan}
                    style={{ ...styles.generatePlanBtn, marginTop: '16px' }}
                    className="btn btn-primary"
                  >
                    {generatingPlan ? 'AI 計畫產生中...' : '一鍵生成 AI 計畫'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-card" style={styles.selectPrompt}>
              <Sparkles size={32} color="#7c3aed" style={{ marginBottom: '12px' }} />
              <h3>查看 AI 讀書排程</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '12px', marginTop: '4px' }}>
                點選左側卡片，即可載入對應項目的讀書進度與計畫內容。
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ADD EXAM MODAL DIALOG */}
      {showAddModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent} className="glass-card animate-slide-up">
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>新增倒數目標</h3>
              <button onClick={() => setShowAddModal(false)} style={styles.closeBtn}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} style={styles.form}>
              <div className="form-group">
                <label className="form-label" htmlFor="exam-title">目標名稱</label>
                <input
                  id="exam-title"
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  className="form-input"
                  placeholder="例如：資料庫期中考、Java作業截止"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="exam-date">截止 / 考試日期</label>
                <input
                  id="exam-date"
                  type="date"
                  value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="exam-type">類型分類</label>
                <select
                  id="exam-type"
                  value={typeInput}
                  onChange={(e) => setTypeInput(e.target.value)}
                  className="form-input"
                  style={{ height: '42px', borderRadius: '12px' }}
                >
                  <option value="exam">重要考試 📝</option>
                  <option value="homework">作業截止 ✏️</option>
                  <option value="project">專題發表 💻</option>
                  <option value="quiz">平時小考 📖</option>
                  <option value="custom">自訂類別...</option>
                </select>
              </div>

              {typeInput === 'custom' && (
                <div className="form-group animate-fade-in" style={{ marginTop: '-8px' }}>
                  <label className="form-label" htmlFor="custom-exam-type">自訂類別名稱</label>
                  <input
                    id="custom-exam-type"
                    type="text"
                    value={customTypeInput}
                    onChange={(e) => setCustomTypeInput(e.target.value)}
                    className="form-input"
                    placeholder="例如：多益檢定 🏆、程式實作 💻"
                    required
                  />
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="publish-scope">發布範圍</label>
                <select
                  id="publish-scope"
                  value={publishScope}
                  onChange={(e) => setPublishScope(e.target.value)}
                  className="form-input"
                  style={{ height: '42px', borderRadius: '12px' }}
                >
                  <option value="personal">僅個人 🔒</option>
                  {groups.map((group) => (
                    <option key={group.groupId} value={String(group.groupId)}>
                      分享至：{group.groupName} 👥
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.modalActions}>
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-outline"
                  style={{ flex: 1 }}
                >
                  取消
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  disabled={submitting}
                >
                  {submitting ? '新增中...' : '確認新增'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const X: React.FC<{ size: number }> = ({ size }) => {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
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
  actionRow: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  addBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    borderRadius: '12px',
    padding: '0 20px',
    height: '42px',
  },
  contentLayout: {
    display: 'grid',
    gridTemplateColumns: '1fr 340px',
    gap: '20px',
    alignItems: 'start',
  },
  listCol: {
    flex: 1,
  },
  emptyCard: {
    padding: '60px 20px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center' as const,
  },
  gridList: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: '16px',
  },
  examCard: {
    background: '#ffffff',
    border: '2px solid #ecdcb9',
    borderRadius: '16px',
    padding: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  examCardSelected: {
    borderColor: '#fdba74',
    boxShadow: '0 6px 16px rgba(249, 115, 22, 0.06)',
    background: '#fffdfa',
  },
  examCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  typeTag: {
    fontSize: '10px',
    padding: '2px 8px',
    borderRadius: '6px',
    fontWeight: 800,
  },
  badgeContainer: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '6px',
    alignItems: 'center',
  },
  groupBadge: {
    fontSize: '10px',
    padding: '2px 8px',
    borderRadius: '6px',
    fontWeight: 800,
    color: '#7c2d12',
    background: '#ffedd5',
    border: '1.5px solid #fed7aa',
  },
  deleteBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s',
  },
  examTitle: {
    fontSize: '15.5px',
    fontWeight: 800,
    color: '#4a3728',
    margin: 0,
    lineHeight: '1.3',
  },
  dateRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  dateText: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    fontWeight: 600,
  },
  countdownRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px dashed #f3ebd8',
    paddingTop: '10px',
  },
  countdownLabel: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  countdownValue: {
    fontSize: '14px',
    fontWeight: 800,
  },
  planTriggerBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    width: '100%',
    padding: '8px 0',
    borderRadius: '10px',
    border: '1.5px solid',
    fontSize: '11.5px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  planCol: {
    width: '340px',
  },
  planCard: {
    padding: '20px',
    minHeight: '240px',
  },
  planHeader: {
    borderBottom: '2.5px dashed #f3ebd8',
    paddingBottom: '14px',
    marginBottom: '16px',
  },
  planExamTitle: {
    fontSize: '16px',
    fontWeight: 800,
    color: '#4a3728',
  },
  planExamSub: {
    fontSize: '11.5px',
    color: 'var(--text-secondary)',
    fontWeight: 600,
    marginTop: '2px',
    display: 'block',
  },
  planContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '14px',
  },
  aiTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  aiTitleText: {
    fontSize: '12px',
    fontWeight: 800,
    color: '#7c3aed',
  },
  markdownBox: {
    background: 'linear-gradient(135deg, #f5f3ff 0%, #fffdfa 100%)',
    border: '1.5px solid #ddd6fe',
    borderRadius: '16px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    maxHeight: '360px',
    overflowY: 'auto' as const,
  },
  planBullet: {
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-start',
  },
  bulletDot: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: '#7c3aed',
    marginTop: '6px',
    flexShrink: 0,
  },
  bulletText: {
    fontSize: '12px',
    color: '#5b21b6',
    lineHeight: '1.5',
    fontWeight: 500,
  },
  planPara: {
    fontSize: '12px',
    color: '#5b21b6',
    lineHeight: '1.5',
    margin: 0,
    fontWeight: 500,
  },
  regenerateBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    fontSize: '12px',
    padding: '10px 0',
  },
  noPlanBox: {
    padding: '30px 10px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generatePlanBtn: {
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
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
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(74, 55, 40, 0.4)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modalContent: {
    width: '380px',
    padding: '24px',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  modalTitle: {
    fontSize: '17px',
    fontWeight: 800,
    color: '#4a3728',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: '#7c6350',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    marginTop: '8px',
  },
};

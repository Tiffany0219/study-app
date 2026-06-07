import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Plus, Trash2, Calendar, Clock, ChevronLeft, ChevronRight, X, Edit, AlignLeft } from 'lucide-react';

import { parseDatabaseDate } from '../utils/date';

interface Activity {
  activityId: number;
  activityName: string;
  category: 'study' | 'class' | 'homework' | 'rest' | 'entertainment' | 'wasted';
  startTime: string;
  endTime: string;
  duration: number; // in seconds
  note: string;
  isTimerGenerated?: number;
  isEdited?: number;
}

const categoryConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  study: { label: '專注讀書 📚', color: '#ca8a04', bg: '#fef9c3', border: '#fcd34d' },
  class: { label: '學校上課 🏫', color: '#7c6350', bg: '#fcfaf5', border: '#ecdcb9' },
  homework: { label: '寫作業 ✏️', color: '#f97316', bg: '#fff7ed', border: '#fdba74' },
  rest: { label: '放空休息 ☕', color: '#ea580c', bg: '#fff7ed', border: '#ffedd5' },
  entertainment: { label: '休閒娛樂 🎮', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  wasted: { label: '浪費時間 📱', color: '#a89280', bg: '#fcfaf5', border: '#ecdcb9' }
};

export const TimelinePage: React.FC = () => {
  const { token } = useAuth();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  // Date Navigation State
  const getTodayStr = () => {
    const d = new Date();
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
  };
  const [selectedDate, setSelectedDate] = useState(getTodayStr());

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<number | null>(null);

  // Form Inputs
  const [actName, setActName] = useState('');
  const [actCategory, setActCategory] = useState<'study' | 'class' | 'homework' | 'rest' | 'entertainment' | 'wasted'>('study');
  const [actStartTime, setActStartTime] = useState('');
  const [actEndTime, setActEndTime] = useState('');
  const [actNote, setActNote] = useState('');

  const fetchActivities = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/timeline?date=${selectedDate}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActivities(data);
      }
    } catch (err) {
      console.error('Failed to fetch timeline:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [token, selectedDate]);

  // Navigate Days
  const handlePrevDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() - 1);
    setSelectedDate(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`);
  };

  const handleNextDay = () => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + 1);
    setSelectedDate(`${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`);
  };

  // Open Add Modal
  const openAddModal = () => {
    const now = new Date();
    // format as YYYY-MM-DDTHH:MM local time
    const pad = (num: number) => num.toString().padStart(2, '0');
    const localNow = `${selectedDate}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
    
    // Default end time 30 mins later
    const end = new Date(now.getTime() + 30 * 60 * 1000);
    const localEnd = `${selectedDate}T${pad(end.getHours())}:${pad(end.getMinutes())}`;

    setActName('');
    setActCategory('study');
    setActStartTime(localNow);
    setActEndTime(localEnd);
    setActNote('');
    setShowAddModal(true);
  };

  // Submit Add
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actName.trim() || !actStartTime || !actEndTime || !token) return;

    if (new Date(actEndTime) <= new Date(actStartTime)) {
      alert('結束時間必須在開始時間之後！');
      return;
    }

    try {
      const res = await fetch('/api/timeline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          activityName: actName.trim(),
          category: actCategory,
          startTime: new Date(actStartTime).toISOString(),
          endTime: new Date(actEndTime).toISOString(),
          note: actNote.trim()
        })
      });

      if (res.ok) {
        setShowAddModal(false);
        fetchActivities();
      } else {
        const data = await res.json();
        alert(data.message || '新增活動失敗');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Open Edit Modal
  const openEditModal = (act: Activity) => {
    const formatLocal = (isoStr: string) => {
      const d = parseDatabaseDate(isoStr);
      const pad = (num: number) => num.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    setEditingActivityId(act.activityId);
    setActName(act.activityName);
    setActCategory(act.category);
    setActStartTime(formatLocal(act.startTime));
    setActEndTime(formatLocal(act.endTime));
    setActNote(act.note);
    setShowEditModal(true);
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingActivityId || !actName.trim() || !actStartTime || !actEndTime || !token) return;

    if (new Date(actEndTime) <= new Date(actStartTime)) {
      alert('結束時間必須在開始時間之後！');
      return;
    }

    try {
      const res = await fetch(`/api/timeline/${editingActivityId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          activityName: actName.trim(),
          category: actCategory,
          startTime: new Date(actStartTime).toISOString(),
          endTime: new Date(actEndTime).toISOString(),
          note: actNote.trim()
        })
      });

      if (res.ok) {
        setShowEditModal(false);
        fetchActivities();
      } else {
        const data = await res.json();
        alert(data.message || '更新活動失敗');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Delete
  const handleDelete = async (activityId: number) => {
    const confirmDelete = window.confirm('確定要刪除這筆活動記錄嗎？');
    if (!confirmDelete || !token) return;

    try {
      const res = await fetch(`/api/timeline/${activityId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setShowEditModal(false);
        fetchActivities();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Format datetime-local to HH:MM format
  const formatTimeStr = (isoString: string) => {
    try {
      const d = parseDatabaseDate(isoString);
      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
    } catch {
      return isoString;
    }
  };

  // Convert duration in seconds to X小時Y分 or X分鐘 format
  const formatDurationStr = (seconds: number) => {
    const mins = Math.round(seconds / 60);
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remainingMins = mins % 60;
      return remainingMins > 0 ? `${hrs} 小時 ${remainingMins} 分` : `${hrs} 小時`;
    }
    return `${mins} 分鐘`;
  };

  return (
    <div style={styles.container} className="animate-fade-in">
      {/* Header section */}
      <div style={styles.header}>
        <h1 style={styles.title}>活動時間線</h1>
        <p style={styles.subtitle}>記錄一整天的生活軌跡，幫助建立自律的時間管理習慣。</p>
      </div>

      {/* Date Selector Row */}
      <div className="glass-card" style={styles.dateSelectorCard}>
        <button onClick={handlePrevDay} style={styles.dateNavBtn}>
          <ChevronLeft size={18} />
        </button>
        <div style={styles.dateLabelBlock}>
          <Calendar size={16} color="#7c6350" />
          <span style={styles.dateLabel}>{selectedDate}</span>
        </div>
        <button onClick={handleNextDay} style={styles.dateNavBtn}>
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Floating Plus CTA Action Button */}
      <div style={styles.ctaContainer}>
        <button onClick={openAddModal} className="btn btn-primary" style={styles.floatingBtn}>
          <Plus size={16} />
          <span>手動紀錄活動</span>
        </button>
      </div>

      {/* Vertical Timeline Activity List */}
      <div className="glass-card" style={styles.timelineCard}>
        {loading ? (
          <div style={styles.loadingWrapper}>
            <div style={styles.spinner} />
            <span>載入時間線中...</span>
          </div>
        ) : activities.length === 0 ? (
          <div style={styles.emptyTimeline}>
            <span style={{ fontSize: '32px', marginBottom: '8px' }}>🦉</span>
            <p>今天還沒有任何活動記錄喔！</p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              點擊上方「手動紀錄活動」按鈕，或者啟動專注計時器自動記錄。
            </p>
          </div>
        ) : (
          <div style={styles.timelineList}>
            {/* The vertical timeline spine line */}
            <div style={styles.timelineSpine} />

            {activities.map((act) => {
              const conf = categoryConfig[act.category] || categoryConfig.study;
              return (
                <div key={act.activityId} style={styles.timelineItem}>
                  {/* Left Side: Time info & dot marker */}
                  <div style={styles.timelineMarkerBlock}>
                    <span style={styles.timeLabel}>{formatTimeStr(act.startTime)}</span>
                    <div style={{ ...styles.timelineDot, background: conf.color, borderColor: 'var(--bg-primary)' }} />
                  </div>

                  {/* Right Side: Card details */}
                  <div 
                    onClick={() => openEditModal(act)}
                    style={{
                      ...styles.activityCard,
                      background: conf.bg,
                      borderColor: conf.border
                    }}
                  >
                    <div style={styles.activityCardHeader}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                        <span style={{ ...styles.activityTitle, color: 'var(--text-primary)' }}>
                          {act.activityName}
                        </span>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          {act.isTimerGenerated === 1 && (
                            <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '4px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', fontWeight: 700 }}>
                              ⏱️ 計時器產生
                            </span>
                          )}
                          {act.isEdited === 1 && (
                            <span style={{ fontSize: '9px', padding: '1px 5px', borderRadius: '4px', background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', fontWeight: 700 }}>
                              ✏️ 已編輯
                            </span>
                          )}
                        </div>
                      </div>
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

      {/* ADD ACTIVITY DIALOG MODAL */}
      {showAddModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent} className="glass-card animate-slide-up">
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>記錄新活動</h3>
              <button onClick={() => setShowAddModal(false)} style={styles.closeBtn}>
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleAddSubmit} style={styles.modalForm}>
              <div className="form-group">
                <label className="form-label" htmlFor="act-name">活動內容 / 項目名稱</label>
                <input
                  id="act-name"
                  type="text"
                  value={actName}
                  onChange={(e) => setActName(e.target.value)}
                  className="form-input"
                  placeholder="例如：背英文單字、休息吃午餐、微積分小考..."
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">活動分類</label>
                <div style={styles.categoryGrid}>
                  {Object.keys(categoryConfig).map((catKey) => {
                    const conf = categoryConfig[catKey];
                    const isSelected = actCategory === catKey;
                    return (
                      <button
                        key={catKey}
                        type="button"
                        onClick={() => setActCategory(catKey as any)}
                        style={{
                          ...styles.categorySelectBtn,
                          background: isSelected ? conf.bg : '#ffffff',
                          borderColor: isSelected ? conf.color : '#ecdcb9',
                          color: isSelected ? conf.color : 'var(--text-secondary)'
                        }}
                      >
                        {conf.label.split(' ')[0]} {conf.label.split(' ')[1] || ''}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={styles.timeGroupRow}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" htmlFor="act-start">開始時間</label>
                  <input
                    id="act-start"
                    type="datetime-local"
                    value={actStartTime}
                    onChange={(e) => setActStartTime(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" htmlFor="act-end">結束時間</label>
                  <input
                    id="act-end"
                    type="datetime-local"
                    value={actEndTime}
                    onChange={(e) => setActEndTime(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="act-note">備註心得 (選填)</label>
                <input
                  id="act-note"
                  type="text"
                  value={actNote}
                  onChange={(e) => setActNote(e.target.value)}
                  className="form-input"
                  placeholder="補充說明..."
                />
              </div>

              <div style={styles.modalActions}>
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-outline"
                  style={styles.modalCancel}
                >
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  送出記錄
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT ACTIVITY DIALOG MODAL */}
      {showEditModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent} className="glass-card animate-slide-up">
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>編輯活動記錄</h3>
              <button onClick={() => setShowEditModal(false)} style={styles.closeBtn}>
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleEditSubmit} style={styles.modalForm}>
              <div className="form-group">
                <label className="form-label" htmlFor="edit-name">活動內容 / 項目名稱</label>
                <input
                  id="edit-name"
                  type="text"
                  value={actName}
                  onChange={(e) => setActName(e.target.value)}
                  className="form-input"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">活動分類</label>
                <div style={styles.categoryGrid}>
                  {Object.keys(categoryConfig).map((catKey) => {
                    const conf = categoryConfig[catKey];
                    const isSelected = actCategory === catKey;
                    return (
                      <button
                        key={catKey}
                        type="button"
                        onClick={() => setActCategory(catKey as any)}
                        style={{
                          ...styles.categorySelectBtn,
                          background: isSelected ? conf.bg : '#ffffff',
                          borderColor: isSelected ? conf.color : '#ecdcb9',
                          color: isSelected ? conf.color : 'var(--text-secondary)'
                        }}
                      >
                        {conf.label.split(' ')[0]} {conf.label.split(' ')[1] || ''}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={styles.timeGroupRow}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" htmlFor="edit-start">開始時間</label>
                  <input
                    id="edit-start"
                    type="datetime-local"
                    value={actStartTime}
                    onChange={(e) => setActStartTime(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label className="form-label" htmlFor="edit-end">結束時間</label>
                  <input
                    id="edit-end"
                    type="datetime-local"
                    value={actEndTime}
                    onChange={(e) => setActEndTime(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="edit-note">備註心得 (選填)</label>
                <input
                  id="edit-note"
                  type="text"
                  value={actNote}
                  onChange={(e) => setActNote(e.target.value)}
                  className="form-input"
                />
              </div>

              <div style={styles.editModalActions}>
                {editingActivityId && (
                  <button
                    type="button"
                    onClick={() => handleDelete(editingActivityId)}
                    style={styles.deleteBtn}
                  >
                    <Trash2 size={15} />
                    <span>刪除記錄</span>
                  </button>
                )}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    type="button" 
                    onClick={() => setShowEditModal(false)}
                    className="btn btn-outline"
                    style={styles.modalCancel}
                  >
                    取消
                  </button>
                  <button type="submit" className="btn btn-primary">
                    儲存變更
                  </button>
                </div>
              </div>
            </form>
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
    gap: '16px',
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
  dateSelectorCard: {
    padding: '12px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#ffffff',
  },
  dateNavBtn: {
    background: '#fffbeb',
    border: '2px solid #ecdcb9',
    borderRadius: '10px',
    width: '34px',
    height: '34px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'var(--text-primary)',
    transition: 'all 0.15s ease',
  },
  dateLabelBlock: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  dateLabel: {
    fontSize: '14px',
    fontWeight: 800,
    color: 'var(--text-primary)',
    fontFamily: 'Fredoka, sans-serif',
  },
  ctaContainer: {
    width: '100%',
    display: 'flex',
    justifyContent: 'center',
  },
  floatingBtn: {
    width: '100%',
    padding: '12px',
    borderRadius: '12px',
    fontSize: '13.5px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  timelineCard: {
    padding: '24px 20px',
    minHeight: '40vh',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  emptyTimeline: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    color: 'var(--text-muted)',
    fontSize: '13px',
    textAlign: 'center' as const,
    padding: '60px 0',
  },
  loadingWrapper: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: '12px',
    color: 'var(--text-secondary)',
    fontSize: '13px',
    padding: '60px 0',
  },
  spinner: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: '3px solid rgba(74, 55, 40, 0.15)',
    borderTopColor: '#fbbf24',
    animation: 'spin-slow 1s linear infinite',
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
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    transition: 'all 0.15s ease',
    boxShadow: '0 2px 6px rgba(139, 92, 26, 0.02)',
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
  // Modal layout
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(74, 55, 40, 0.4)',
    backdropFilter: 'blur(12px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    zIndex: 1000,
  },
  modalContent: {
    width: '100%',
    maxWidth: '440px',
    padding: '24px',
    background: '#ffffff',
    border: '2px solid #ecdcb9',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  modalTitle: {
    fontSize: '16.5px',
    fontWeight: 800,
    color: 'var(--text-primary)',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  categoryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '8px',
    marginTop: '4px',
  },
  categorySelectBtn: {
    padding: '8px 4px',
    fontSize: '11px',
    fontWeight: 800,
    borderRadius: '10px',
    border: '1.5px solid',
    cursor: 'pointer',
    textAlign: 'center' as const,
    transition: 'all 0.15s ease',
  },
  timeGroupRow: {
    display: 'flex',
    gap: '12px',
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '10px',
    marginTop: '20px',
  },
  editModalActions: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '20px',
  },
  modalCancel: {
    padding: '8px 16px',
    fontSize: '13px',
  },
  deleteBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: 'transparent',
    border: '1.5px solid #fecaca',
    color: '#dc2626',
    borderRadius: '10px',
    padding: '8px 14px',
    fontSize: '12.5px',
    fontWeight: 800,
    cursor: 'pointer',
    transition: 'all 0.2s',
  }
};

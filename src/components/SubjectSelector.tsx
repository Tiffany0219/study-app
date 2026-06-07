import React, { useState } from 'react';
import { Plus } from 'lucide-react';

interface SubjectSelectorProps {
  selectedSubject: string;
  onSelectSubject: (subject: string) => void;
}

const DEFAULT_SUBJECTS = ['國文', '英文', '數學', '歷史', '程式設計', '資料庫'];

export const SubjectSelector: React.FC<SubjectSelectorProps> = ({
  selectedSubject,
  onSelectSubject
}) => {
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [customSubject, setCustomSubject] = useState('');

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customSubject.trim()) {
      onSelectSubject(customSubject.trim());
      setCustomSubject('');
      setShowCustomInput(false);
    }
  };

  return (
    <div style={styles.container}>
      <span style={styles.label}>選擇讀書科目</span>
      <div style={styles.tagGrid}>
        {DEFAULT_SUBJECTS.map((subject) => {
          const isActive = selectedSubject === subject;
          return (
            <button
              key={subject}
              onClick={() => {
                onSelectSubject(subject);
                setShowCustomInput(false);
              }}
              className={`subject-tag ${isActive ? 'active' : ''}`}
              type="button"
            >
              {subject}
            </button>
          );
        })}

        {!showCustomInput ? (
          <button
            onClick={() => setShowCustomInput(true)}
            style={styles.addBtn}
            type="button"
          >
            <Plus size={14} />
            <span>自訂</span>
          </button>
        ) : (
          <form onSubmit={handleCustomSubmit} style={styles.customForm}>
            <input
              type="text"
              value={customSubject}
              onChange={(e) => setCustomSubject(e.target.value)}
              placeholder="輸入科目名稱..."
              style={styles.customInput}
              autoFocus
            />
            <button type="submit" style={styles.submitBtn}>確定</button>
            <button 
              type="button" 
              onClick={() => setShowCustomInput(false)}
              style={styles.cancelBtn}
            >
              取消
            </button>
          </form>
        )}
      </div>

      {selectedSubject && !DEFAULT_SUBJECTS.includes(selectedSubject) && (
        <div style={styles.activeCustom}>
          目前選擇：<span style={styles.customBadge}>{selectedSubject}</span>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    marginBottom: '24px',
    width: '100%',
  },
  label: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#94a3b8',
    letterSpacing: '0.5px',
  },
  tagGrid: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '10px',
    alignItems: 'center',
  },
  addBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 12px',
    borderRadius: '8px',
    background: 'rgba(255, 255, 255, 0.02)',
    border: '1px dashed rgba(255, 255, 255, 0.2)',
    color: '#94a3b8',
    fontSize: '13px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  customForm: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'rgba(10, 14, 26, 0.8)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    padding: '2px 4px',
  },
  customInput: {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: '#fff',
    fontSize: '13px',
    padding: '4px 6px',
    width: '120px',
  },
  submitBtn: {
    background: '#8b5cf6',
    border: 'none',
    color: '#fff',
    fontSize: '11px',
    fontWeight: 600,
    padding: '4px 8px',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  cancelBtn: {
    background: 'transparent',
    border: 'none',
    color: '#94a3b8',
    fontSize: '11px',
    padding: '4px 6px',
    cursor: 'pointer',
  },
  activeCustom: {
    fontSize: '13px',
    color: '#94a3b8',
    marginTop: '4px',
  },
  customBadge: {
    background: 'rgba(139, 92, 246, 0.15)',
    border: '1px solid #8b5cf6',
    color: '#a78bfa',
    padding: '2px 8px',
    borderRadius: '6px',
    fontWeight: 600,
  }
};

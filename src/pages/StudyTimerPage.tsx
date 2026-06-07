import React from 'react';
import { SubjectSelector } from '../components/SubjectSelector';
import { StudyTimer } from '../components/StudyTimer';
import { useAuth } from '../context/AuthContext';
import { useTimer } from '../context/TimerContext';
import { BookOpen } from 'lucide-react';

export const StudyTimerPage: React.FC = () => {
  const { reloadUserProfile } = useAuth();
  const { subject, setSubject } = useTimer();

  const handleRecordSaved = async (rewardExp: number, leveledUp: boolean, level: number, exp: number) => {
    // Reload profile information globally to update Level and EXP displays in context
    await reloadUserProfile();
  };

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.header}>
        <h1 style={styles.title}>開始專注</h1>
        <p style={styles.subtitle}>暫時放下手機，享受純粹的讀書時間。</p>
      </div>

      <div style={styles.mainCard} className="glass-card">
        {/* Subject Selector tag selector */}
        <SubjectSelector 
          selectedSubject={subject} 
          onSelectSubject={setSubject} 
        />

        <div style={styles.divider} />

        {/* Focus Timer Circle countdown controls */}
        <StudyTimer 
          subject={subject}
          onRecordSaved={handleRecordSaved}
        />
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },
  header: {
    marginBottom: '24px',
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
  mainCard: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    padding: '30px 24px',
  },
  divider: {
    width: '100%',
    height: '1px',
    background: '#ecdcb9',
    margin: '10px 0 24px 0',
  }
};

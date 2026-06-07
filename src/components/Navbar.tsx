import React from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, BookOpen } from 'lucide-react';
import { NotificationCenter } from './NotificationCenter';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <header style={styles.header}>
      <div style={styles.brand}>
        <div style={styles.logoCircle}>
          <BookOpen size={18} color="#4a3728" />
        </div>
        <span style={styles.title}>一起讀書監督</span>
      </div>
      {user && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <NotificationCenter />
          <button onClick={logout} style={styles.logoutBtn} title="登出">
            <LogOut size={18} />
            <span style={styles.logoutText}>登出</span>
          </button>
        </div>
      )}
    </header>
  );
};

const styles = {
  header: {
    height: '64px',
    padding: '0 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#ffffff',
    borderBottom: '2px solid #ecdcb9',
    position: 'sticky' as const,
    top: 0,
    zIndex: 100,
    width: '100%',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  logoCircle: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: '#fde047',
    border: '2px solid #ecdcb9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 6px rgba(139, 92, 26, 0.08)',
  },
  title: {
    fontSize: '18px',
    fontWeight: 800,
    letterSpacing: '-0.3px',
    color: '#4a3728',
    fontFamily: 'Fredoka, sans-serif',
  },
  logoutBtn: {
    background: 'transparent',
    border: 'none',
    color: '#7c6350',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '14px',
    fontWeight: 700,
    padding: '8px 12px',
    borderRadius: '8px',
    transition: 'all 0.2s',
  },
  logoutText: {
    display: 'inline',
  },
};

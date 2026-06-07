import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Timer, MessageCircle, Layers, Users, User } from 'lucide-react';
import { useTimer } from '../context/TimerContext';

export const BottomTabBar: React.FC = () => {
  const { isTimerActive } = useTimer();

  const tabs = [
    { to: '/', end: true,  Icon: Home,          label: '首頁' },
    { to: '/timer',        Icon: Timer,          label: '計時',  showPulse: isTimerActive },
    { to: '/chat',         Icon: MessageCircle,  label: '聊天' },
    { to: '/groups',       Icon: Layers,         label: '群組' },
    { to: '/friends',      Icon: Users,          label: '好友' },
    { to: '/profile',      Icon: User,           label: '我的' },
  ];

  return (
    <nav style={styles.nav}>
      {tabs.map(({ to, end, Icon, label, showPulse }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          style={({ isActive }) => ({
            ...styles.tab,
            color: isActive ? '#f97316' : '#a89280',
          })}
        >
          {({ isActive }) => (
            <>
              <div style={{ position: 'relative' as const, display: 'inline-flex' }}>
                <Icon size={19} style={isActive ? styles.activeIcon : {}} />
                {showPulse && !isActive && <span style={styles.timerActiveDot} />}
              </div>
              <span style={styles.label}>{label}</span>
              {isActive && <div style={styles.activeDot} />}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
};

const styles = {
  nav: {
    position: 'fixed' as const,
    bottom: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: '600px',
    height: '72px',
    background: '#ffffff',
    borderTop: '2px solid #ecdcb9',
    borderLeft: '2px solid #ecdcb9',
    borderRight: '2px solid #ecdcb9',
    borderRadius: '22px 22px 0 0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: '0 4px',
    zIndex: 99,
    boxShadow: '0 -4px 12px rgba(139, 92, 26, 0.04)',
  },
  tab: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: '3px',
    textDecoration: 'none',
    fontSize: '9px',
    fontWeight: 800,
    flex: 1,
    position: 'relative' as const,
    transition: 'color 0.15s ease',
    padding: '8px 0',
  },
  label: {
    letterSpacing: '0.2px',
  },
  activeIcon: {
    transform: 'scale(1.15)',
  },
  activeDot: {
    width: '4px',
    height: '4px',
    borderRadius: '50%',
    backgroundColor: '#fb923c',
    border: '1.5px solid #ecdcb9',
    position: 'absolute' as const,
    bottom: '-1px',
  },
  timerActiveDot: {
    position: 'absolute' as const,
    top: '-2px',
    right: '-3px',
    width: '7px',
    height: '7px',
    borderRadius: '50%',
    backgroundColor: '#22c55e',
    border: '1.5px solid #ffffff',
  },
};

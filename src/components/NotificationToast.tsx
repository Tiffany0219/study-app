import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Flame, UserPlus, Bell, X, Users, BookOpen, Sparkles } from 'lucide-react';
import { Avatar } from './Avatar';

interface AppNotification {
  notificationId: number;
  type: string;
  title: string;
  content: string;
  senderName: string;
  senderAvatar: string;
  status: string;
  createdAt: string;
}

const TOAST_DURATION = 5000; // ms before auto-dismiss

export const NotificationToast: React.FC = () => {
  const { token, isAuthenticated } = useAuth();
  const [toasts, setToasts] = useState<AppNotification[]>([]);
  // Track which notification IDs we've already shown as a toast this session
  const shownIdsRef = useRef<Set<number>>(new Set());

  const fetchNotifications = async () => {
    if (!token || !isAuthenticated) return;
    try {
      const res = await fetch('/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data: AppNotification[] = await res.json();

      // Only show truly UNREAD ones that we haven't shown in this session yet
      const fresh = data.filter(
        (n) => n.status === 'unread' && !shownIdsRef.current.has(n.notificationId)
      );

      if (fresh.length === 0) return;

      // Mark all as shown in this session
      fresh.forEach((n) => shownIdsRef.current.add(n.notificationId));

      setToasts((prev) => [...prev, ...fresh]);
    } catch (err) {
      console.error('Failed to poll notifications:', err);
    }
  };

  // Fetch once on login — no polling needed, NotificationCenter bell handles live updates
  useEffect(() => {
    if (!isAuthenticated) return;
    fetchNotifications();
  }, [token, isAuthenticated]);

  // Auto-dismiss toasts one by one
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, TOAST_DURATION);
    return () => clearTimeout(timer);
  }, [toasts]);

  const dismiss = (id: number) =>
    setToasts((prev) => prev.filter((t) => t.notificationId !== id));

  const renderIcon = (type: string) => {
    switch (type) {
      case 'encourage':   return <Flame size={14} color="#d97706" fill="#d97706" />;
      case 'remind':      return <Bell size={14} color="#dc2626" />;
      case 'friend_request': return <UserPlus size={14} color="#0284c7" />;
      case 'group_goal':
      case 'group_invite': return <BookOpen size={14} color="#059669" />;
      case 'ai_advice':  return <Sparkles size={14} color="#7c3aed" />;
      default:            return <Bell size={14} color="#7c6350" />;
    }
  };

  const iconBg: Record<string, string> = {
    encourage: '#fef3c7',
    remind: '#fee2e2',
    friend_request: '#e0f2fe',
    group_goal: '#ecfdf5',
    group_invite: '#ecfdf5',
    ai_advice: '#f5f3ff',
  };

  if (toasts.length === 0) return null;

  return (
    <div style={styles.container}>
      {toasts.map((toast) => (
        <div key={toast.notificationId} className="animate-slide-up" style={styles.toast}>
          {/* Icon badge */}
          <div style={{
            ...styles.iconCircle,
            background: iconBg[toast.type] || '#f3f4f6',
          }}>
            {toast.senderAvatar
              ? <Avatar id={toast.senderAvatar} size={28} />
              : renderIcon(toast.type)}
          </div>

          {/* Text */}
          <div style={styles.body}>
            <span style={styles.title}>
              {toast.title || toast.senderName || '新通知'}
            </span>
            <span style={styles.content}>{toast.content}</span>
          </div>

          {/* Dismiss */}
          <button onClick={() => dismiss(toast.notificationId)} style={styles.closeBtn}>
            <X size={13} />
          </button>

          {/* Progress bar showing time remaining */}
          <div style={styles.progressTrack}>
            <div
              style={{
                ...styles.progressBar,
                animation: `shrink-width ${TOAST_DURATION}ms linear forwards`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    // On mobile: center at top. On desktop: top-right corner
    top: '72px',    // below navbar
    left: '50%',
    transform: 'translateX(-50%)',
    width: 'calc(100% - 32px)',
    maxWidth: '380px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    zIndex: 9999,
    pointerEvents: 'none',
  },
  toast: {
    background: '#ffffff',
    border: '2px solid #ecdcb9',
    borderRadius: '16px',
    padding: '12px 14px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    boxShadow: '0 8px 24px rgba(139, 92, 26, 0.12)',
    position: 'relative',
    overflow: 'hidden',
    pointerEvents: 'auto',
  },
  iconCircle: {
    width: '36px',
    height: '36px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    border: '1.5px solid #ecdcb9',
  },
  body: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
    minWidth: 0,
  },
  title: {
    fontSize: '13px',
    fontWeight: 800,
    color: '#4a3728',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  content: {
    fontSize: '11.5px',
    color: '#7c6350',
    lineHeight: 1.4,
    overflow: 'hidden',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#a89280',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    borderRadius: '6px',
  },
  progressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '3px',
    background: '#f3ebd8',
  },
  progressBar: {
    height: '100%',
    width: '100%',
    background: 'linear-gradient(90deg, #fde047, #fbbf24)',
    transformOrigin: 'left',
  },
};

import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Flame, UserPlus, Bell, X } from 'lucide-react';
import { Avatar } from './Avatar';

interface AppNotification {
  notificationId: number;
  type: string;
  senderName: string;
  senderAvatar: string;
  createdAt: string;
}

export const NotificationToast: React.FC = () => {
  const { token, isAuthenticated } = useAuth();
  const [toasts, setToasts] = useState<AppNotification[]>([]);

  const fetchNotifications = async () => {
    if (!token || !isAuthenticated) return;
    try {
      const res = await fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          // Add new notifications to toasts state
          setToasts((prev) => {
            // Filter to only add ones we don't have yet
            const existingIds = prev.map(t => t.notificationId);
            const newToasts = data.filter((n: AppNotification) => !existingIds.includes(n.notificationId));
            return [...prev, ...newToasts];
          });

          // Mark all notifications as read immediately on backend
          await fetch('/api/notifications/read', {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
          });
        }
      }
    } catch (err) {
      console.error('Failed to poll notifications:', err);
    }
  };

  // Poll notifications every 4 seconds
  useEffect(() => {
    if (!isAuthenticated) return;
    
    // Initial fetch
    fetchNotifications();

    const interval = setInterval(fetchNotifications, 4000);
    return () => clearInterval(interval);
  }, [token, isAuthenticated]);

  // Handle toast removal
  const handleDismiss = (id: number) => {
    setToasts((prev) => prev.filter(t => t.notificationId !== id));
  };

  // Automatically dismiss toasts after 4 seconds
  useEffect(() => {
    if (toasts.length > 0) {
      const timer = setTimeout(() => {
        setToasts((prev) => prev.slice(1)); // remove oldest
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toasts]);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div 
          key={toast.notificationId} 
          className="toast-item animate-slide-in-right"
        >
          <div style={styles.avatarWrapper}>
            <Avatar id={toast.senderAvatar} size={36} />
            <div style={styles.badge}>
              {toast.type === 'encourage' ? (
                <Flame size={12} color="#fff" />
              ) : (
                <UserPlus size={12} color="#fff" />
              )}
            </div>
          </div>

          <div style={styles.messageContent}>
            <span style={styles.senderName}>{toast.senderName}</span>
            <span style={styles.text}>
              {toast.type === 'encourage' 
                ? '剛剛為您送來了讀書鼓勵！加油！🔥' 
                : '向您發送了好友邀請！🤝'}
            </span>
          </div>

          <button 
            onClick={() => handleDismiss(toast.notificationId)} 
            style={styles.closeBtn}
          >
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
};

const styles = {
  avatarWrapper: {
    position: 'relative' as const,
  },
  badge: {
    position: 'absolute' as const,
    bottom: '-4px',
    right: '-4px',
    width: '18px',
    height: '18px',
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #a855f7 0%, #f43f5e 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 5px rgba(0,0,0,0.3)',
  },
  messageContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },
  senderName: {
    fontSize: '13px',
    fontWeight: 700,
    color: '#fff',
  },
  text: {
    fontSize: '12px',
    color: '#cbd5e1',
    lineHeight: 1.4,
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#64748b',
    cursor: 'pointer',
    padding: '2px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.2s',
  }
};
// Hover styling for close button inside style object
// but standard React style works!

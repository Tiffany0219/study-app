import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Bell, Flame, UserPlus, Check, Sparkles, BookOpen, Clock, AlertTriangle, CheckCircle, Trash } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Avatar } from './Avatar';

export const NotificationCenter: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Poll notifications every 30 seconds for real-time feel
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [token]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => n.status === 'unread').length;

  const handleMarkAllRead = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications/clear', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchNotifications();
      }
    } catch (error) {
      console.error('Mark all read error:', error);
    }
  };

  const handleNotificationClick = async (notif: any) => {
    if (!token) return;
    
    // Mark as read if unread
    if (notif.status === 'unread') {
      try {
        await fetch(`/api/notifications/${notif.notificationId}/status`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status: 'read' })
        });
        fetchNotifications();
      } catch (error) {
        console.error('Error updating notification status:', error);
      }
    }

    // Action routing
    setIsOpen(false);
    if (notif.type === 'friend_request' || notif.type === 'encourage' || notif.type === 'remind') {
      navigate('/friends');
    } else if (notif.type === 'group_goal' || notif.type === 'group_invite') {
      navigate('/groups');
    } else if (notif.type === 'ai_advice' && notif.title.includes('計畫')) {
      navigate('/exams');
    } else {
      navigate('/');
    }
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case 'encourage':
        return <div style={{ ...styles.iconCircle, background: '#fef3c7' }}><Flame size={15} color="#d97706" fill="#d97706" /></div>;
      case 'remind':
        return <div style={{ ...styles.iconCircle, background: '#fee2e2' }}><Bell size={15} color="#dc2626" /></div>;
      case 'friend_request':
        return <div style={{ ...styles.iconCircle, background: '#e0f2fe' }}><UserPlus size={15} color="#0284c7" /></div>;
      case 'ai_advice':
        return <div style={{ ...styles.iconCircle, background: '#f5f3ff' }}><Sparkles size={15} color="#7c3aed" /></div>;
      case 'group_goal':
      case 'group_invite':
        return <div style={{ ...styles.iconCircle, background: '#ecfdf5' }}><BookOpen size={15} color="#059669" /></div>;
      default:
        return <div style={{ ...styles.iconCircle, background: '#f3f4f6' }}><Clock size={15} color="#4b5563" /></div>;
    }
  };

  return (
    <div ref={containerRef} style={styles.container}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        style={styles.bellButton}
        title="通知中心"
      >
        <Bell size={20} color="#7c6350" />
        {unreadCount > 0 && (
          <span style={styles.badge}>{unreadCount}</span>
        )}
      </button>

      {isOpen && (
        <div style={styles.dropdown} className="animate-fade-in">
          <div style={styles.header}>
            <span style={styles.headerTitle}>通知中心 🔔</span>
            {unreadCount > 0 && (
              <button onClick={handleMarkAllRead} style={styles.clearBtn}>
                標記全部已讀
              </button>
            )}
          </div>

          <div style={styles.list}>
            {notifications.length === 0 ? (
              <div style={styles.emptyState}>
                <span style={{ fontSize: '24px', marginBottom: '8px' }}>🍯</span>
                <span style={styles.emptyText}>目前沒有新通知喔</span>
              </div>
            ) : (
              notifications.map((notif) => (
                <div 
                  key={notif.notificationId}
                  onClick={() => handleNotificationClick(notif)}
                  style={{
                    ...styles.item,
                    background: notif.status === 'unread' ? '#fffbeb' : '#ffffff',
                    borderLeft: notif.status === 'unread' ? '4px solid #f59e0b' : '4px solid transparent'
                  }}
                >
                  <div style={styles.itemLeft}>
                    {notif.senderAvatar ? (
                      <Avatar id={notif.senderAvatar} size={36} />
                    ) : (
                      renderIcon(notif.type)
                    )}
                  </div>
                  <div style={styles.itemBody}>
                    <div style={styles.itemHeader}>
                      <span style={styles.itemTitle}>{notif.title || (notif.type === 'encourage' ? '好友鼓勵' : '通知')}</span>
                      <span style={styles.timeText}>{formatTime(notif.createdAt)}</span>
                    </div>
                    <p style={styles.itemContent}>{notif.content}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const formatTime = (isoString: string) => {
  try {
    const d = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return '剛剛';
    if (diffMins < 60) return `${diffMins} 分鐘前`;
    if (diffHours < 24) return `${diffHours} 小時前`;
    return `${d.getMonth() + 1}/${d.getDate()}`;
  } catch (e) {
    return '';
  }
};

const styles = {
  container: {
    position: 'relative' as const,
    display: 'inline-block',
  },
  bellButton: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    position: 'relative' as const,
    width: '40px',
    height: '40px',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.2s',
    outline: 'none',
  },
  badge: {
    position: 'absolute' as const,
    top: '4px',
    right: '4px',
    background: '#ef4444',
    color: '#ffffff',
    fontSize: '10px',
    fontWeight: 800,
    borderRadius: '10px',
    padding: '2px 5px',
    lineHeight: 1,
    border: '1.5px solid #ffffff',
  },
  dropdown: {
    position: 'absolute' as const,
    right: 0,
    top: '48px',
    width: '320px',
    maxHeight: '400px',
    background: '#ffffff',
    border: '2px solid #ecdcb9',
    borderRadius: '16px',
    boxShadow: '0 8px 24px rgba(139, 92, 26, 0.12)',
    zIndex: 200,
    display: 'flex',
    flexDirection: 'column' as const,
    overflow: 'hidden',
  },
  header: {
    padding: '12px 16px',
    borderBottom: '1.5px solid #f3ebd8',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#fffdfa',
  },
  headerTitle: {
    fontSize: '14px',
    fontWeight: 800,
    color: '#4a3728',
  },
  clearBtn: {
    background: 'transparent',
    border: 'none',
    color: '#ca8a04',
    fontSize: '11px',
    fontWeight: 700,
    cursor: 'pointer',
    padding: 0,
  },
  list: {
    overflowY: 'auto' as const,
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
  },
  emptyState: {
    padding: '40px 20px',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: '12px',
    color: '#7c6350',
    fontWeight: 600,
  },
  item: {
    padding: '12px 14px',
    borderBottom: '1px solid #f8f1e5',
    display: 'flex',
    gap: '10px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  itemLeft: {
    display: 'flex',
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBody: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },
  itemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTitle: {
    fontSize: '12px',
    fontWeight: 800,
    color: '#4a3728',
  },
  timeText: {
    fontSize: '9.5px',
    color: '#a89280',
    fontWeight: 500,
  },
  itemContent: {
    fontSize: '11.5px',
    color: '#7c6350',
    lineHeight: '1.4',
    margin: 0,
    fontWeight: 500,
  },
};

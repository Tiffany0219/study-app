import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Avatar } from '../components/Avatar';
import { Search, UserPlus, Flame, Check, X, Trash2, Users, AlertCircle, History, Bell } from 'lucide-react';

interface Friend {
  userId: number;
  username: string;
  avatar: string;
  level: number;
  status: 'studying' | 'resting' | 'offline';
  autoStatus?: string;
  friendId: number;
  todayMinutes: number;
}

interface PendingRequest {
  friendId: number;
  senderId: number;
  username: string;
  avatar: string;
  level: number;
  createdAt: string;
}

export const FriendsPage: React.FC = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [searchName, setSearchName] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchMessage, setSearchMessage] = useState({ type: '' as 'success' | 'error' | '', text: '' });
  
  // Track who was encouraged/reminded recently
  const [encouragedIds, setEncouragedIds] = useState<number[]>([]);
  const [remindedIds, setRemindedIds] = useState<number[]>([]);

  const fetchFriendsData = async () => {
    if (!token) return;
    try {
      // 1. Fetch friend list
      const friendsRes = await fetch('/api/friends', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const friendsData = friendsRes.ok ? await friendsRes.json() : [];

      // 2. Fetch pending requests
      const pendingRes = await fetch('/api/friends/requests/pending', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const pendingData = pendingRes.ok ? await pendingRes.json() : [];

      setFriends(friendsData);
      setPendingRequests(pendingData);
    } catch (err) {
      console.error('Failed to load friends page data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFriendsData();
  }, [token]);

  // Send friend request
  const handleSendRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchName.trim()) return;

    setSearchMessage({ type: '', text: '' });
    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ username: searchName.trim() })
      });

      const data = await res.json();
      if (res.ok) {
        setSearchMessage({ type: 'success', text: '好友邀請已送出！' });
        setSearchName('');
        fetchFriendsData();
      } else {
        setSearchMessage({ type: 'error', text: data.message || '邀請發送失敗' });
      }
    } catch (err) {
      setSearchMessage({ type: 'error', text: '網路異常，請稍後再試' });
    }
  };

  // Handle Request Accept/Reject
  const handleRequestAction = async (friendId: number, action: 'accept' | 'reject') => {
    try {
      const res = await fetch(`/api/friends/requests/${friendId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      });

      if (res.ok) {
        fetchFriendsData();
      } else {
        const data = await res.json();
        alert(data.message || '操作失敗');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Friend
  const handleDeleteFriend = async (friendId: number) => {
    const confirmDelete = window.confirm('確定要解除好友關係嗎？');
    if (!confirmDelete) return;

    try {
      const res = await fetch(`/api/friends/${friendId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        fetchFriendsData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Encourage Friend
  const handleEncourage = async (friendUserId: number) => {
    try {
      const res = await fetch(`/api/friends/${friendUserId}/encourage`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        setEncouragedIds((prev) => [...prev, friendUserId]);
        // Remove from encouragement active list after 5 seconds to reset cooldown
        setTimeout(() => {
          setEncouragedIds((prev) => prev.filter(id => id !== friendUserId));
        }, 5000);
      } else {
        const data = await res.json();
        alert(data.message || '送出鼓勵失敗');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Remind Friend
  const handleRemind = async (friendUserId: number) => {
    try {
      const res = await fetch(`/api/friends/${friendUserId}/remind`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        setRemindedIds((prev) => [...prev, friendUserId]);
        // Remove from remind active list after 5 seconds to reset cooldown
        setTimeout(() => {
          setRemindedIds((prev) => prev.filter(id => id !== friendUserId));
        }, 5000);
      } else {
        const data = await res.json();
        alert(data.message || '送出提醒失敗');
      }
    } catch (err) {
      console.error(err);
    }
  };
  // Render Status Badge
  const renderStatusBadge = (status: 'studying' | 'resting' | 'offline', autoStatus?: string) => {
    const displayStatus = autoStatus || (status === 'studying' ? '✍️ 讀書中' : status === 'resting' ? '☕ 休息中' : '離線');
    
    // Choose styles based on displayStatus content
    let customStyle = styles.badgeOffline;
    if (displayStatus.includes('讀書') || displayStatus.includes('學習') || displayStatus.includes('上課') || displayStatus.includes('作業')) {
      customStyle = styles.badgeStudying;
    } else if (displayStatus.includes('休息') || displayStatus.includes('娛樂')) {
      customStyle = styles.badgeResting;
    } else if (displayStatus.includes('完成目標')) {
      customStyle = {
        background: '#fef08a',
        color: '#854d0e',
        border: '1px solid #eab308',
      };
    } else if (displayStatus.includes('進度落後')) {
      customStyle = {
        background: '#fee2e2',
        color: '#991b1b',
        border: '1px solid #fca5a5',
      };
    } else if (displayStatus.includes('浪費時間')) {
      customStyle = {
        background: '#f3f4f6',
        color: '#4b5563',
        border: '1px solid #d1d5db',
      };
    }

    return (
      <span style={{ ...styles.statusBadge, ...customStyle }}>
        {displayStatus}
      </span>
    );
  };  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <span>載入社交數據中...</span>
      </div>
    );
  }

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.header}>
        <h1 style={styles.title}>好友監督</h1>
        <p style={styles.subtitle}>與好友互相激勵、關注彼此狀態，讓學習不孤單。</p>
      </div>

      {/* 1. Add Friend Form */}
      <div className="glass-card" style={styles.searchCard}>
        <h3 style={styles.sectionTitle}>新增好友</h3>
        <form onSubmit={handleSendRequest} style={styles.searchForm}>
          <div style={styles.inputWrapper}>
            <Search size={18} style={styles.searchIcon} />
            <input
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="輸入好友的用戶名 (暱稱)..."
              style={styles.searchInput}
            />
          </div>
          <button type="submit" style={styles.addBtn} className="btn btn-primary">
            <UserPlus size={16} />
            <span>送出邀請</span>
          </button>
        </form>

        {searchMessage.text && (
          <div 
            style={{
              ...styles.searchAlert,
              background: searchMessage.type === 'success' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              borderColor: searchMessage.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
              color: searchMessage.type === 'success' ? '#34d399' : '#f87171'
            }}
          >
            <AlertCircle size={14} />
            <span>{searchMessage.text}</span>
          </div>
        )}
      </div>

      {/* 2. Pending Invites */}
      {pendingRequests.length > 0 && (
        <div className="glass-card" style={styles.invitesCard}>
          <h3 style={styles.sectionTitle}>待處理的好友申請 ({pendingRequests.length})</h3>
          <div style={styles.invitesList}>
            {pendingRequests.map((req) => (
              <div key={req.friendId} style={styles.inviteItem}>
                <div style={styles.inviteUser}>
                  <Avatar id={req.avatar} size={38} />
                  <div>
                    <span style={styles.inviteName}>{req.username}</span>
                    <span style={styles.inviteLevel}>Lv. {req.level}</span>
                  </div>
                </div>
                <div style={styles.inviteActions}>
                  <button 
                    onClick={() => handleRequestAction(req.friendId, 'accept')}
                    style={styles.acceptBtn}
                    title="同意"
                  >
                    <Check size={16} />
                  </button>
                  <button 
                    onClick={() => handleRequestAction(req.friendId, 'reject')}
                    style={styles.rejectBtn}
                    title="拒絕"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Friends List & Status Wall */}
      <div className="glass-card" style={styles.friendsCard}>
        <h3 style={styles.sectionTitle}>好友列表 ({friends.length})</h3>
        
        {friends.length === 0 ? (
          <div style={styles.emptyFriends}>
            <Users size={36} color="#64748b" style={{ marginBottom: '12px' }} />
            <p>目前還沒有好友喔！快在上方搜尋名稱邀請朋友吧！</p>
          </div>
        ) : (
          <div style={styles.friendsList}>
            {friends.map((friend) => {
              const isEncouraged = encouragedIds.includes(friend.userId);
              return (
                <div key={friend.userId} style={styles.friendItem}>
                  <div style={styles.friendLeft}>
                    <Avatar id={friend.avatar} size={46} glow={friend.status === 'studying'} />
                    <div style={styles.friendInfo}>
                      <div style={styles.friendHeaderLine}>
                        <span style={styles.friendName}>{friend.username}</span>
                        <span style={styles.friendLevel}>Lv. {friend.level}</span>
                      </div>
                      <div style={styles.friendStatusLine}>
                        {renderStatusBadge(friend.status, friend.autoStatus)}
                        <span style={styles.todayFocus}>今日已讀：{friend.todayMinutes} 分鐘</span>
                      </div>
                    </div>
                  </div>

                  <div style={styles.friendRight}>
                    <button 
                      onClick={() => navigate(`/friends/${friend.userId}/timeline`)}
                      style={styles.timelineBtn}
                      title="查看今日時間線"
                    >
                      <History size={13} />
                      <span>時間線</span>
                    </button>

                    <button 
                      onClick={() => handleEncourage(friend.userId)}
                      disabled={isEncouraged || friend.status === 'offline'}
                      style={{
                        ...styles.encourageBtn,
                        ...(isEncouraged ? styles.encourageBtnActive : {}),
                        ...((friend.status === 'offline') ? styles.encourageBtnDisabled : {})
                      }}
                      title={friend.status === 'offline' ? '好友離線時無法鼓勵' : '為好友按讚鼓勵'}
                    >
                      <Flame size={14} fill={isEncouraged ? '#fff' : 'none'} />
                      <span>{isEncouraged ? '已送出' : '鼓勵'}</span>
                    </button>

                    <button 
                      onClick={() => handleRemind(friend.userId)}
                      disabled={remindedIds.includes(friend.userId)}
                      style={{
                        ...styles.remindBtn,
                        ...(remindedIds.includes(friend.userId) ? styles.remindBtnActive : {})
                      }}
                      title="提醒好友開始專注"
                    >
                      <Bell size={13} />
                      <span>{remindedIds.includes(friend.userId) ? '已提醒' : '提醒'}</span>
                    </button>

                    <button 
                      onClick={() => handleDeleteFriend(friend.friendId)}
                      style={styles.deleteBtn}
                      title="刪除好友"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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
  searchCard: {
    padding: '20px',
  },
  sectionTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: '16px',
    letterSpacing: '0.2px',
  },
  searchForm: {
    display: 'flex',
    gap: '12px',
    width: '100%',
  },
  inputWrapper: {
    position: 'relative' as const,
    flex: 1,
    display: 'flex',
    alignItems: 'center',
  },
  searchIcon: {
    position: 'absolute' as const,
    left: '14px',
    color: '#7c6350',
  },
  searchInput: {
    width: '100%',
    background: '#ffffff',
    border: '2px solid #ecdcb9',
    borderRadius: '12px',
    padding: '12px 14px 12px 42px',
    color: 'var(--text-primary)',
    outline: 'none',
    fontSize: '14px',
    transition: 'border-color 0.25s',
  },
  addBtn: {
    padding: '0 20px',
    borderRadius: '12px',
    fontSize: '13px',
  },
  searchAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid',
    fontSize: '12px',
    marginTop: '12px',
    fontWeight: 500,
  },
  invitesCard: {
    background: 'rgba(253, 186, 116, 0.05)',
    border: '2px solid #fdba74',
    padding: '18px 20px',
  },
  invitesList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
  },
  inviteItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 12px',
    background: '#fffdfa',
    border: '1.5px solid #f3ebd8',
    borderRadius: '12px',
  },
  inviteUser: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  inviteName: {
    fontSize: '13px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginRight: '6px',
  },
  inviteLevel: {
    fontSize: '10px',
    color: '#ca8a04',
    background: '#fef9c3',
    border: '1px solid #fcd34d',
    padding: '1px 6px',
    borderRadius: '4px',
    fontWeight: 700,
  },
  inviteActions: {
    display: 'flex',
    gap: '8px',
  },
  acceptBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: '#f0fdf4',
    border: '1.5px solid #bbf7d0',
    color: '#16a34a',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  rejectBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: '#fef2f2',
    border: '1.5px solid #fecaca',
    color: '#dc2626',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  friendsCard: {
    padding: '20px',
  },
  emptyFriends: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 0',
    color: 'var(--text-muted)',
    fontSize: '13px',
    textAlign: 'center' as const,
  },
  friendsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  friendItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    background: '#fffdfa',
    border: '1.5px solid #f3ebd8',
    borderRadius: '16px',
    transition: 'all 0.2s',
  },
  friendLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
  },
  friendInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  friendHeaderLine: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  friendName: {
    fontSize: '14px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  friendLevel: {
    fontSize: '10px',
    color: '#7c6350',
    background: '#fcfaf5',
    border: '1px solid #ecdcb9',
    padding: '1px 6px',
    borderRadius: '4px',
    fontWeight: 700,
  },
  friendStatusLine: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  statusBadge: {
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '6px',
    fontWeight: 700,
  },
  badgeStudying: {
    background: '#fef9c3',
    color: '#ca8a04',
    border: '1px solid #fcd34d',
  },
  badgeResting: {
    background: '#fff7ed',
    color: '#f97316',
    border: '1px solid #fdba74',
  },
  badgeOffline: {
    background: '#fcfaf5',
    color: 'var(--text-muted)',
    border: '1px solid #ecdcb9',
  },
  todayFocus: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  friendRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  encourageBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 10px',
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #fde047 0%, #fbbf24 100%)',
    border: '2px solid #ecdcb9',
    color: 'var(--text-primary)',
    fontSize: '11px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 4px 8px rgba(139, 92, 26, 0.04)',
  },
  encourageBtnActive: {
    background: '#f0fdf4',
    border: '1.5px solid #bbf7d0',
    color: '#16a34a',
    boxShadow: 'none',
  },
  encourageBtnDisabled: {
    background: '#fcfaf5',
    border: '1px solid #ecdcb9',
    color: 'var(--text-muted)',
    boxShadow: 'none',
    cursor: 'not-allowed',
  },
  timelineBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 10px',
    borderRadius: '10px',
    background: '#ffffff',
    border: '2px solid #ecdcb9',
    color: '#7c6350',
    fontSize: '11px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  remindBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 10px',
    borderRadius: '10px',
    background: '#fff7ed',
    border: '2px solid #fdba74',
    color: '#f97316',
    fontSize: '11px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  remindBtnActive: {
    background: '#f0fdf4',
    border: '1.5px solid #bbf7d0',
    color: '#16a34a',
    cursor: 'not-allowed',
  },
  deleteBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '8px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.2s',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: '16px',
    color: 'var(--text-secondary)',
    fontSize: '14px',
  },
  spinner: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    border: '3px solid rgba(74, 55, 40, 0.15)',
    borderTopColor: '#fbbf24',
    animation: 'spin-slow 1s linear infinite',
  }
};

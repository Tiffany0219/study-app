import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Avatar } from '../components/Avatar';
import { Send, Users, Globe, Loader2, BookOpen } from 'lucide-react';

import { parseDatabaseDate } from '../utils/date';

interface ChatMessage {
  messageId: number;
  content: string;
  createdAt: string;
  userId: number;
  username: string;
  avatar: string;
}

interface GroupInfo {
  groupId: number;
  groupName: string;
}

const POLL_MS = 3000; // poll every 3 seconds

// ──── helper ──────────────────────────────────────────────────────────────────
function formatTime(iso: string) {
  try {
    const d = parseDatabaseDate(iso);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  } catch { return ''; }
}

function formatDateSep(iso: string) {
  const d = parseDatabaseDate(iso);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

// ──── ChatRoom sub-component ──────────────────────────────────────────────────
interface ChatRoomProps {
  roomType: 'plaza' | 'group';
  roomId?: number;   // only for group
  currentUserId: number;
  token: string;
}

const ChatRoom: React.FC<ChatRoomProps> = ({ roomType, roomId, currentUserId, token }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const lastIdRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const apiBase = roomType === 'plaza' ? '/api/chat/plaza' : `/api/chat/group/${roomId}`;

  const fetchMessages = useCallback(async () => {
    try {
      const url = lastIdRef.current === 0
        ? apiBase
        : `${apiBase}?after=${lastIdRef.current}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data: ChatMessage[] = await res.json();
      if (data.length > 0) {
        setMessages(prev => {
          const merged = [...prev, ...data];
          lastIdRef.current = merged[merged.length - 1].messageId;
          return merged;
        });
      }
    } catch (err) {
      console.error('Chat fetch error:', err);
    } finally {
      setInitialLoaded(true);
    }
  }, [apiBase, token]);

  // Initial load + polling
  useEffect(() => {
    lastIdRef.current = 0;
    setMessages([]);
    setInitialLoaded(false);
    fetchMessages();
    const interval = setInterval(fetchMessages, POLL_MS);
    return () => clearInterval(interval);
  }, [fetchMessages]);

  // Auto scroll to bottom on new messages
  useEffect(() => {
    if (initialLoaded) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length, initialLoaded]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const res = await fetch(apiBase, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: trimmed }),
      });
      if (res.ok) {
        const msg: ChatMessage = await res.json();
        setMessages(prev => {
          lastIdRef.current = msg.messageId;
          return [...prev, msg];
        });
        setInput('');
        inputRef.current?.focus();
      }
    } catch (err) {
      console.error('Send error:', err);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Group messages by date for date separators
  const grouped: Array<ChatMessage | string> = [];
  let lastDate = '';
  messages.forEach(msg => {
    const d = parseDatabaseDate(msg.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (key !== lastDate) {
      grouped.push(formatDateSep(msg.createdAt));
      lastDate = key;
    }
    grouped.push(msg);
  });

  if (!initialLoaded) {
    return (
      <div style={styles.loadingCenter}>
        <Loader2 size={24} color="#fbbf24" style={{ animation: 'spin-slow 1s linear infinite' }} />
        <span style={{ fontSize: '13px', color: '#7c6350', fontWeight: 600 }}>載入聊天紀錄中...</span>
      </div>
    );
  }

  return (
    <div style={styles.roomWrap}>
      {/* Messages area */}
      <div style={styles.msgList}>
        {messages.length === 0 && (
          <div style={styles.emptyChat}>
            <span style={{ fontSize: '32px', marginBottom: '8px' }}>💬</span>
            <p style={{ fontSize: '13px', color: '#7c6350', fontWeight: 600, textAlign: 'center' }}>
              還沒有訊息喔！<br />成為第一個打招呼的人吧 👋
            </p>
          </div>
        )}
        {grouped.map((item, idx) => {
          if (typeof item === 'string') {
            return (
              <div key={`sep-${idx}`} style={styles.dateSep}>
                <span style={styles.dateSepText}>{item}</span>
              </div>
            );
          }
          const msg = item as ChatMessage;
          const isMe = msg.userId === currentUserId;
          return (
            <div key={msg.messageId} style={{ ...styles.msgRow, flexDirection: isMe ? 'row-reverse' : 'row' }}>
              {!isMe && (
                <div style={styles.avatarWrap}>
                  <Avatar id={msg.avatar} size={32} />
                </div>
              )}
              <div style={{ maxWidth: '72%' }}>
                {!isMe && (
                  <span style={styles.senderName}>{msg.username}</span>
                )}
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', flexDirection: isMe ? 'row-reverse' : 'row' }}>
                  <div style={{
                    ...styles.bubble,
                    background: isMe ? 'linear-gradient(135deg, #fde047, #fbbf24)' : '#ffffff',
                    border: isMe ? '2px solid #f59e0b' : '2px solid #ecdcb9',
                    borderRadius: isMe ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
                    color: isMe ? '#4a3728' : '#4a3728',
                    boxShadow: isMe
                      ? '0 2px 8px rgba(251, 191, 36, 0.25)'
                      : '0 2px 6px rgba(139, 92, 26, 0.06)',
                  }}>
                    {msg.content}
                  </div>
                  <span style={styles.timeStamp}>{formatTime(msg.createdAt)}</span>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div style={styles.inputBar}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="說點什麼吧... (Enter 送出)"
          maxLength={300}
          style={styles.input}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || sending}
          style={{
            ...styles.sendBtn,
            opacity: (!input.trim() || sending) ? 0.5 : 1,
          }}
        >
          {sending
            ? <Loader2 size={16} style={{ animation: 'spin-slow 1s linear infinite' }} />
            : <Send size={16} fill="#4a3728" />}
        </button>
      </div>
    </div>
  );
};

// ──── Main ChatPage ───────────────────────────────────────────────────────────
export const ChatPage: React.FC = () => {
  const { token, user } = useAuth();
  const [tab, setTab] = useState<'plaza' | 'group'>('plaza');
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupInfo | null>(null);
  const [groupsLoaded, setGroupsLoaded] = useState(false);

  // Fetch the user's groups for the group chat picker
  useEffect(() => {
    if (!token) return;
    fetch('/api/groups', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        const list: GroupInfo[] = (data || []).map((g: any) => ({
          groupId: g.groupId,
          groupName: g.groupName,
        }));
        setGroups(list);
        if (list.length > 0) setSelectedGroup(list[0]);
      })
      .catch(console.error)
      .finally(() => setGroupsLoaded(true));
  }, [token]);

  if (!user || !token) return null;

  return (
    <div style={styles.page} className="animate-fade-in">
      {/* Page header */}
      <div style={styles.header}>
        <h1 style={styles.title}>聊天室 💬</h1>
        <p style={styles.subtitle}>與好友互相打氣，一起讀書更有動力！</p>
      </div>

      {/* Tab switcher */}
      <div style={styles.tabRow}>
        <button
          style={{ ...styles.tabBtn, ...(tab === 'plaza' ? styles.tabBtnActive : {}) }}
          onClick={() => setTab('plaza')}
        >
          <Globe size={14} />
          學習廣場
        </button>
        <button
          style={{ ...styles.tabBtn, ...(tab === 'group' ? styles.tabBtnActive : {}) }}
          onClick={() => setTab('group')}
        >
          <Users size={14} />
          群組聊天
        </button>
      </div>

      <div style={styles.card} className="glass-card">
        {tab === 'plaza' && (
          <div style={styles.roomHeader}>
            <Globe size={16} color="#f97316" />
            <span style={styles.roomTitle}>🌍 學習廣場 — 所有人</span>
            <span style={styles.onlinePill}>公開頻道</span>
          </div>
        )}

        {tab === 'group' && (
          <div style={styles.roomHeader}>
            <BookOpen size={16} color="#f97316" />
            <span style={styles.roomTitle}>👥 群組聊天</span>
            {/* Group picker */}
            {groupsLoaded && groups.length > 0 && (
              <select
                value={selectedGroup?.groupId ?? ''}
                onChange={e => {
                  const g = groups.find(g => g.groupId === Number(e.target.value));
                  if (g) setSelectedGroup(g);
                }}
                style={styles.groupPicker}
              >
                {groups.map(g => (
                  <option key={g.groupId} value={g.groupId}>{g.groupName}</option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* Chat area */}
        {tab === 'plaza' && (
          <ChatRoom roomType="plaza" currentUserId={user.userId} token={token} />
        )}
        {tab === 'group' && !groupsLoaded && (
          <div style={styles.loadingCenter}>
            <Loader2 size={24} color="#fbbf24" style={{ animation: 'spin-slow 1s linear infinite' }} />
          </div>
        )}
        {tab === 'group' && groupsLoaded && groups.length === 0 && (
          <div style={styles.noGroupState}>
            <span style={{ fontSize: '32px' }}>🏠</span>
            <p style={{ fontSize: '14px', color: '#7c6350', fontWeight: 600, textAlign: 'center', marginTop: '8px' }}>
              你還沒有加入任何群組<br />
              <span style={{ fontSize: '12px', color: '#a89280', fontWeight: 500 }}>先去「群組」頁建立或加入一個吧！</span>
            </p>
          </div>
        )}
        {tab === 'group' && groupsLoaded && selectedGroup && (
          <ChatRoom
            key={selectedGroup.groupId}
            roomType="group"
            roomId={selectedGroup.groupId}
            currentUserId={user.userId}
            token={token}
          />
        )}
      </div>
    </div>
  );
};

// ──── Styles ──────────────────────────────────────────────────────────────────
const styles = {
  page: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
    height: 'calc(100vh - 140px)', // fill between navbar and tabbar
  },
  header: { marginBottom: '0px' },
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
  tabRow: {
    display: 'flex',
    gap: '8px',
  },
  tabBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '9px 18px',
    borderRadius: '12px',
    border: '2px solid #ecdcb9',
    background: '#ffffff',
    color: '#7c6350',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  tabBtnActive: {
    background: 'linear-gradient(135deg, #fde047, #fbbf24)',
    borderColor: '#f59e0b',
    color: '#4a3728',
    boxShadow: '0 3px 10px rgba(251, 191, 36, 0.3)',
  },
  card: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    padding: '0',
    overflow: 'hidden',
    minHeight: 0,
  },
  roomHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    borderBottom: '2px solid #f3ebd8',
    background: '#fffdfa',
    flexShrink: 0,
  },
  roomTitle: {
    fontSize: '14px',
    fontWeight: 800,
    color: '#4a3728',
    flex: 1,
  },
  onlinePill: {
    background: '#ecfdf5',
    color: '#059669',
    fontSize: '10px',
    fontWeight: 800,
    borderRadius: '8px',
    padding: '3px 8px',
    border: '1.5px solid #6ee7b7',
  },
  groupPicker: {
    padding: '4px 8px',
    borderRadius: '8px',
    border: '2px solid #ecdcb9',
    background: '#ffffff',
    color: '#4a3728',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    outline: 'none',
  },
  roomWrap: {
    display: 'flex',
    flexDirection: 'column' as const,
    flex: 1,
    minHeight: 0,
  },
  msgList: {
    flex: 1,
    overflowY: 'auto' as const,
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '6px',
  },
  emptyChat: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    padding: '40px 20px',
    margin: 'auto',
  },
  dateSep: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '8px 0',
  },
  dateSepText: {
    fontSize: '11px',
    color: '#a89280',
    fontWeight: 700,
    background: '#f8f1e5',
    borderRadius: '8px',
    padding: '2px 10px',
  },
  msgRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '6px',
  },
  avatarWrap: {
    flexShrink: 0,
    marginBottom: '2px',
  },
  senderName: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#a89280',
    marginBottom: '3px',
    display: 'block',
    paddingLeft: '2px',
  },
  bubble: {
    padding: '9px 13px',
    fontSize: '13.5px',
    fontWeight: 600,
    lineHeight: 1.45,
    wordBreak: 'break-word' as const,
    maxWidth: '100%',
  },
  timeStamp: {
    fontSize: '9.5px',
    color: '#c4a882',
    fontWeight: 500,
    flexShrink: 0,
    paddingBottom: '2px',
  },
  inputBar: {
    display: 'flex',
    gap: '8px',
    padding: '10px 12px',
    borderTop: '2px solid #f3ebd8',
    background: '#fffdfa',
    flexShrink: 0,
  },
  input: {
    flex: 1,
    padding: '10px 14px',
    borderRadius: '14px',
    border: '2px solid #ecdcb9',
    background: '#ffffff',
    color: '#4a3728',
    fontSize: '13.5px',
    fontWeight: 600,
    outline: 'none',
    fontFamily: 'Fredoka, sans-serif',
  },
  sendBtn: {
    width: '40px',
    height: '40px',
    background: 'linear-gradient(135deg, #fde047, #fbbf24)',
    border: '2px solid #f59e0b',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'all 0.15s',
    boxShadow: '0 2px 8px rgba(251, 191, 36, 0.3)',
  },
  loadingCenter: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '40px',
  },
  noGroupState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
  },
};

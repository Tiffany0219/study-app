import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Avatar } from '../components/Avatar';
import { Plus, Users, Compass, ChevronRight, Copy, Check, ArrowLeft, LogOut, Trash2, Award, History, ChevronDown, ChevronUp, Clock, AlignLeft, Calendar, Sparkles } from 'lucide-react';

import { parseDatabaseDate } from '../utils/date';

interface GroupSummary {
  groupId: number;
  groupName: string;
  description: string;
  inviteCode: string;
  dailyGroupGoal: number;
  role: 'owner' | 'member';
  memberCount: number;
}

interface GroupMember {
  userId: number;
  username: string;
  avatar: string;
  level: number;
  status: 'studying' | 'resting' | 'offline';
  autoStatus?: string;
  role: 'owner' | 'member';
  todayMinutes: number;
  todos?: Array<{ todoId: number; todoText: string; isCompleted: number }>;
  timeline?: Array<{
    activityId: number;
    activityName: string;
    category: 'study' | 'class' | 'homework' | 'rest' | 'entertainment' | 'wasted';
    startTime: string;
    endTime: string;
    duration: number;
    note: string;
  }>;
}

interface GroupDetail {
  groupId: number;
  groupName: string;
  description: string;
  inviteCode: string;
  dailyGroupGoal: number;
  role: 'owner' | 'member';
  groupTodayMinutes: number;
  members: GroupMember[];
  deadlines?: Array<{
    itemId: number;
    title: string;
    targetDate: string;
    type: string;
    userId: number;
  }>;
}

const categoryConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  study: { label: '專注讀書 📚', color: '#ca8a04', bg: '#fef9c3', border: '#fcd34d' },
  class: { label: '學校上課 🏫', color: '#7c6350', bg: '#fcfaf5', border: '#ecdcb9' },
  homework: { label: '寫作業 ✏️', color: '#f97316', bg: '#fff7ed', border: '#fdba74' },
  rest: { label: '放空休息 ☕', color: '#ea580c', bg: '#fff7ed', border: '#ffedd5' },
  entertainment: { label: '休閒娛樂 🎮', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  wasted: { label: '浪費時間 📱', color: '#a89280', bg: '#fcfaf5', border: '#ecdcb9' }
};

export const GroupsPage: React.FC = () => {
  const { token, user } = useAuth();
  
  const [groups, setGroups] = useState<GroupSummary[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [groupDetail, setGroupDetail] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);

  // Individual collapsible state for member timelines
  const [expandedMemberTimelines, setExpandedMemberTimelines] = useState<Record<number, boolean>>({});

  // Modals / Input states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [groupDescInput, setGroupDescInput] = useState('');
  const [groupGoalInput, setGroupGoalInput] = useState(120);

  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteCodeInput, setInviteCodeInput] = useState('');

  const [copiedCode, setCopiedCode] = useState(false);
  const [newTodoInput, setNewTodoInput] = useState('');

  // Group Shared Countdown States
  const [generatingPlanId, setGeneratingPlanId] = useState<number | null>(null);
  const [showAddDeadlineForm, setShowAddDeadlineForm] = useState(false);
  const [deadlineTitle, setDeadlineTitle] = useState('');
  const [deadlineDate, setDeadlineDate] = useState('');
  const [deadlineType, setDeadlineType] = useState('exam');
  const [customDeadlineType, setCustomDeadlineType] = useState('');
  const [addingDeadline, setAddingDeadline] = useState(false);

  // Group Live Study Room States
  const [cheeringUserId, setCheeringUserId] = useState<number | null>(null);
  const [activeBubbles, setActiveBubbles] = useState<Array<{ id: number; userId: number; text: string }>>([]);
  const shownCheerIdsRef = useRef<Set<number>>(new Set());

  const fetchGroups = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/groups', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = res.ok ? await res.json() : [];
      setGroups(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupDetail = async (id: number) => {
    if (!token) return;
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/groups/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setGroupDetail(data);

        // Process recent interaction cheers for floaty bubbles
        if (data.recentCheers && data.recentCheers.length > 0) {
          const newCheers = data.recentCheers.filter(
            (c: any) => !shownCheerIdsRef.current.has(c.id)
          );

          if (newCheers.length > 0) {
            const bubblesToAdd = newCheers.map((c: any) => {
              shownCheerIdsRef.current.add(c.id);
              const isCoffee = c.title.includes('咖啡');
              const actionText = isCoffee ? '☕ 送熱咖啡加油！' : '🧀 送幸運起司打氣！';
              return {
                id: c.id,
                userId: c.targetUserId,
                text: `${c.senderName} ${actionText}`
              };
            });

            setActiveBubbles(prev => [...prev, ...bubblesToAdd]);

            // Set timeout for each new bubble to fade out after 5 seconds
            bubblesToAdd.forEach((b: any) => {
              setTimeout(() => {
                setActiveBubbles(prev => prev.filter(item => item.id !== b.id));
              }, 5000);
            });
          }
        }
      } else {
        setSelectedGroupId(null);
      }
    } catch (err) {
      console.error(err);
      setSelectedGroupId(null);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAddTodo = async (e: React.FormEvent, groupId: number) => {
    e.preventDefault();
    if (!newTodoInput.trim() || !token) return;

    try {
      const res = await fetch(`/api/groups/${groupId}/todos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ todoText: newTodoInput.trim() })
      });

      if (res.ok) {
        setNewTodoInput('');
        fetchGroupDetail(groupId);
      } else {
        const data = await res.json();
        alert(data.message || '新增待辦事項失敗');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleTodo = async (groupId: number, todoId: number, currentStatus: number) => {
    if (!token) return;
    const nextStatus = currentStatus === 1 ? 0 : 1;

    try {
      const res = await fetch(`/api/groups/${groupId}/todos/${todoId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isCompleted: nextStatus })
      });

      if (res.ok) {
        fetchGroupDetail(groupId);
      } else {
        const data = await res.json();
        alert(data.message || '更新狀態失敗');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTodo = async (groupId: number, todoId: number) => {
    if (!token) return;
    const proceed = window.confirm('確定要刪除此待辦事項嗎？');
    if (!proceed) return;

    try {
      const res = await fetch(`/api/groups/${groupId}/todos/${todoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        fetchGroupDetail(groupId);
      } else {
        const data = await res.json();
        alert(data.message || '刪除待辦事項失敗');
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, [token]);

  useEffect(() => {
    if (selectedGroupId !== null) {
      shownCheerIdsRef.current.clear();
      setActiveBubbles([]);
      fetchGroupDetail(selectedGroupId);
      const interval = setInterval(() => {
        fetchGroupDetail(selectedGroupId);
      }, 10000);
      return () => clearInterval(interval);
    } else {
      setGroupDetail(null);
      setActiveBubbles([]);
    }
  }, [selectedGroupId]);

  // Create group submit
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupNameInput.trim()) return;

    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: groupNameInput.trim(),
          description: groupDescInput.trim(),
          dailyGoal: Number(groupGoalInput)
        })
      });

      if (res.ok) {
        setGroupNameInput('');
        setGroupDescInput('');
        setGroupGoalInput(120);
        setShowCreateModal(false);
        fetchGroups();
      } else {
        const data = await res.json();
        alert(data.message || '群組建立失敗');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Join group submit
  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCodeInput.trim()) return;

    try {
      const res = await fetch('/api/groups/join', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ inviteCode: inviteCodeInput.trim() })
      });

      const data = await res.json();
      if (res.ok) {
        setInviteCodeInput('');
        setShowJoinModal(false);
        fetchGroups();
        setSelectedGroupId(data.group.groupId); // navigate straight to the new group
      } else {
        alert(data.message || '加入群組失敗');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Leave Group
  const handleLeaveGroup = async () => {
    if (!groupDetail) return;
    const isOwner = groupDetail.role === 'owner';
    const confirmMsg = isOwner
      ? '您是群組建立者。退出後，此群組將會被刪除！確定要退出嗎？'
      : '確定要退出此讀書群組嗎？';
      
    const proceed = window.confirm(confirmMsg);
    if (!proceed) return;

    try {
      const res = await fetch(`/api/groups/${groupDetail.groupId}/leave`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        setSelectedGroupId(null);
        fetchGroups();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Copy Invite Code
  const handleCopyCode = () => {
    if (!groupDetail) return;
    navigator.clipboard.writeText(groupDetail.inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Group Shared Deadlines Handlers
  const calculateDaysRemaining = (targetDateStr: string) => {
    const target = new Date(targetDateStr);
    const today = new Date();
    target.setHours(0,0,0,0);
    today.setHours(0,0,0,0);
    const diffTime = target.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const handleGenerateGroupDeadlinePlan = async (itemId: number, title: string) => {
    if (!token || generatingPlanId !== null) return;
    setGeneratingPlanId(itemId);
    try {
      const res = await fetch(`/api/exams/${itemId}/plan`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert(`已成功為「${title}」生成個人 AI 衝刺計畫！您可至「考試倒數」頁面查看。`);
        if (selectedGroupId !== null) {
          fetchGroupDetail(selectedGroupId);
        }
      } else {
        const data = await res.json();
        alert(data.message || '生成衝刺計畫失敗');
      }
    } catch (err) {
      console.error(err);
      alert('連線錯誤');
    } finally {
      setGeneratingPlanId(null);
    }
  };

  const handleDeleteGroupDeadline = async (itemId: number) => {
    const confirmDelete = window.confirm('確定要刪除此群組共享倒數嗎？');
    if (!confirmDelete || !token) return;

    try {
      const res = await fetch(`/api/exams/${itemId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        if (selectedGroupId !== null) {
          fetchGroupDetail(selectedGroupId);
        }
      } else {
        const data = await res.json();
        alert(data.message || '刪除失敗');
      }
    } catch (err) {
      console.error(err);
      alert('連線錯誤');
    }
  };

  const handleAddGroupDeadline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deadlineTitle.trim() || !deadlineDate || !token || !selectedGroupId) return;

    const finalType = deadlineType === 'custom' ? customDeadlineType.trim() : deadlineType;
    if (!finalType) {
      alert('請填寫或選擇倒數類型');
      return;
    }

    setAddingDeadline(true);
    try {
      const res = await fetch('/api/exams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title: deadlineTitle.trim(),
          targetDate: deadlineDate,
          type: finalType,
          groupId: selectedGroupId
        })
      });

      if (res.ok) {
        setDeadlineTitle('');
        setDeadlineDate('');
        setDeadlineType('exam');
        setCustomDeadlineType('');
        setShowAddDeadlineForm(false);
        fetchGroupDetail(selectedGroupId);
      } else {
        const data = await res.json();
        alert(data.message || '新增失敗');
      }
    } catch (err) {
      console.error(err);
      alert('網路異常，請稍後再試');
    } finally {
      setAddingDeadline(false);
    }
  };

  const handleCheerMember = async (groupId: number, targetUserId: number, itemType: 'coffee' | 'cheese', targetUsername: string) => {
    if (!token || cheeringUserId !== null) return;
    setCheeringUserId(targetUserId);
    try {
      const res = await fetch(`/api/groups/${groupId}/members/${targetUserId}/cheer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ itemType })
      });
      if (res.ok) {
        // Add bubble locally immediately for instant feedback
        const localId = Date.now();
        const actionText = itemType === 'coffee' ? '☕ 送熱咖啡加油！' : '🧀 送幸運起司打氣！';
        
        setActiveBubbles(prev => [...prev, {
          id: localId,
          userId: targetUserId,
          text: `我 ${actionText}`
        }]);

        setTimeout(() => {
          setActiveBubbles(prev => prev.filter(item => item.id !== localId));
        }, 5000);
      } else {
        const data = await res.json();
        alert(data.message || '送出打氣失敗');
      }
    } catch (err) {
      console.error(err);
      alert('連線失敗');
    } finally {
      setCheeringUserId(null);
    }
  };

  // Render Member Status Badge
  const renderMemberStatus = (status: 'studying' | 'resting' | 'offline', autoStatus?: string) => {
    const displayStatus = autoStatus || (status === 'studying' ? '✍️ 讀書中' : status === 'resting' ? '☕ 休息中' : '離線');
    
    let color = '#64748b'; // default grey
    if (displayStatus.includes('讀書') || displayStatus.includes('學習') || displayStatus.includes('上課') || displayStatus.includes('作業')) {
      color = '#ca8a04'; // yellow/brown for studying
    } else if (displayStatus.includes('休息') || displayStatus.includes('娛樂')) {
      color = '#f97316'; // orange/orange-brown for resting
    } else if (displayStatus.includes('完成目標')) {
      color = '#854d0e'; // gold
    } else if (displayStatus.includes('進度落後')) {
      color = '#dc2626'; // warning red
    } else if (displayStatus.includes('浪費時間')) {
      color = '#7c6350'; // dark grey/brown
    }

    return <span style={{ ...styles.mStatus, color }}>{displayStatus}</span>;
  };
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
        <span>載入讀書群組中...</span>
      </div>
    );
  }

  // --- SUB-PAGE: Group Detail View ---
  if (selectedGroupId !== null && groupDetail) {
    const goalRate = groupDetail.dailyGroupGoal > 0 
      ? Math.round((groupDetail.groupTodayMinutes / groupDetail.dailyGroupGoal) * 100)
      : 0;

    // Categorize members for live study room
    const studyingMembers = groupDetail.members.filter(m => {
      const displayStatus = m.autoStatus || '';
      return displayStatus.includes('讀書') || displayStatus.includes('學習') || displayStatus.includes('上課') || displayStatus.includes('作業');
    });

    const restingMembers = groupDetail.members.filter(m => {
      const displayStatus = m.autoStatus || '';
      return !studyingMembers.some(sm => sm.userId === m.userId) && (
        displayStatus.includes('休息') || displayStatus.includes('娛樂') || displayStatus.includes('目標') || displayStatus.includes('落後') || displayStatus.includes('時間')
      );
    });

    const offlineMembers = groupDetail.members.filter(m => {
      return !studyingMembers.some(sm => sm.userId === m.userId) && !restingMembers.some(rm => rm.userId === m.userId);
    });

    return (
      <div style={styles.container} className="animate-fade-in">
        {/* Back header */}
        <div style={styles.detailHeader}>
          <button onClick={() => setSelectedGroupId(null)} style={styles.backBtn}>
            <ArrowLeft size={18} />
            <span>返回列表</span>
          </button>
          <button onClick={handleLeaveGroup} style={styles.leaveBtn}>
            <LogOut size={16} />
            <span>{groupDetail.role === 'owner' ? '解散群組' : '退出群組'}</span>
          </button>
        </div>

        <div className="responsive-layout-grid-left-main">
          {/* 主要內容欄 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Group Info Summary */}
            <div className="glass-card" style={styles.groupInfoCard}>
              <h2 style={styles.groupDetailTitle}>{groupDetail.groupName}</h2>
              {groupDetail.description && <p style={styles.groupDetailDesc}>{groupDetail.description}</p>}
              
              <div style={styles.groupProgressRow}>
                <div style={styles.progressTextCol}>
                  <span style={styles.progressLabel}>今日群組累計專注</span>
                  <span style={styles.progressVal}>{groupDetail.groupTodayMinutes} / {groupDetail.dailyGroupGoal} 分鐘</span>
                </div>
                <div style={styles.goalRateBadge} className={goalRate >= 100 ? 'glow-border' : ''}>
                  {goalRate}% 達成
                </div>
              </div>

              <div className="progress-bar-container">
                <div 
                  className="progress-bar-fill" 
                  style={{ 
                    width: `${Math.min(100, goalRate)}%`,
                    background: goalRate >= 100 ? 'var(--success-gradient)' : 'var(--primary-gradient)'
                  }}
                />
              </div>
            </div>

            {/* Live Study Room Card */}
            <div className="glass-card" style={{ ...styles.studyRoomCard, marginBottom: 0 }}>
              <div style={styles.boardHeader}>
                <Users size={18} color="#ca8a04" />
                <h3 style={styles.boardTitle}>🏫 小隊線上自習室 (Live Study Room)</h3>
              </div>

              <div style={styles.studyRoomContent}>
                {/* Box 1: Focus Desks */}
                <div style={styles.studyRoomSection}>
                  <span style={styles.studyRoomSectionTitle}>📖 專注書桌區 (Desk)</span>
                  <div style={styles.studyRoomGrid}>
                    {studyingMembers.length === 0 ? (
                      <span style={styles.roomEmptyText}>目前書桌空空如也，快開始讀書加入他們吧！</span>
                    ) : (
                      studyingMembers.map((m) => {
                        const isMe = m.userId === user?.userId;
                        const memberBubbles = activeBubbles.filter((b) => b.userId === m.userId);
                        return (
                          <div key={m.userId} style={styles.roomMemberAvatarCard} className="glow-border">
                            {memberBubbles.map((b) => (
                              <div key={b.id} className="bubble-float-animate" style={styles.bubbleFloat}>
                                {b.text}
                              </div>
                            ))}
                            <Avatar id={m.avatar} size={40} glow />
                            <div style={styles.roomMemberInfoCol}>
                              <div style={styles.roomMemberNameRow}>
                                <span style={styles.roomMemberName}>{m.username}</span>
                                {isMe && <span style={styles.meTag}>我</span>}
                              </div>
                              <span style={styles.roomMemberStatusLabel}>{m.autoStatus || '📚 專注中'}</span>
                            </div>
                            
                            {!isMe && (
                              <div style={styles.roomCheerActionRow}>
                                <button
                                  onClick={() => handleCheerMember(groupDetail.groupId, m.userId, 'coffee', m.username)}
                                  disabled={cheeringUserId === m.userId}
                                  style={styles.roomCheerBtn}
                                  title="送熱咖啡加油"
                                >
                                  ☕ 送咖啡
                                </button>
                                <button
                                  onClick={() => handleCheerMember(groupDetail.groupId, m.userId, 'cheese', m.username)}
                                  disabled={cheeringUserId === m.userId}
                                  style={styles.roomCheerBtn}
                                  title="送幸運起司打氣"
                                >
                                  🧀 送起司
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Box 2: Resting Lounge */}
                <div style={styles.studyRoomSection}>
                  <span style={styles.studyRoomSectionTitle}>☕ 休息沙發區 (Lounge)</span>
                  <div style={styles.studyRoomGrid}>
                    {restingMembers.length === 0 ? (
                      <span style={styles.roomEmptyText}>沙發區目前沒人休息中喔～</span>
                    ) : (
                      restingMembers.map((m) => {
                        const isMe = m.userId === user?.userId;
                        const memberBubbles = activeBubbles.filter((b) => b.userId === m.userId);
                        return (
                          <div key={m.userId} style={styles.roomMemberRestCard}>
                            {memberBubbles.map((b) => (
                              <div key={b.id} className="bubble-float-animate" style={styles.bubbleFloat}>
                                {b.text}
                              </div>
                            ))}
                            <Avatar id={m.avatar} size={36} />
                            <div style={styles.roomMemberInfoCol}>
                              <div style={styles.roomMemberNameRow}>
                                <span style={styles.roomMemberName}>{m.username}</span>
                                {isMe && <span style={styles.meTag}>我</span>}
                              </div>
                              <span style={styles.roomMemberRestStatusLabel}>{m.autoStatus || '☕ 休息中'}</span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Box 3: Offline Camp */}
                <div style={styles.studyRoomSection}>
                  <span style={styles.studyRoomSectionTitle}>💤 帳篷營地 (Offline)</span>
                  <div style={styles.roomOfflineGrid}>
                    {offlineMembers.length === 0 ? (
                      <span style={styles.roomEmptyText}>小隊全體在線！</span>
                    ) : (
                      offlineMembers.map((m) => (
                        <div key={m.userId} style={styles.roomOfflineMember} title={`${m.username} (離線)`}>
                          <Avatar id={m.avatar} size={32} />
                          <span style={styles.roomOfflineName}>{m.username}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Member Leaderboard */}
            <div className="glass-card" style={styles.leaderboardCard}>
              <div style={styles.boardHeader}>
                <Award size={18} color="#f59e0b" />
                <h3 style={styles.boardTitle}>今日成員專注榜</h3>
              </div>

              {detailLoading ? (
                <div style={styles.detailSpinnerWrapper}>
                  <div style={styles.spinner} />
                </div>
              ) : (
                <div style={styles.memberList}>
                  {groupDetail.members.map((member, idx) => (
                    <div key={member.userId} style={styles.memberCardContainer}>
                      <div style={styles.memberItemHeader}>
                        <div style={styles.memberLeft}>
                          {/* Rank Number */}
                          <div style={{
                            ...styles.rankBadge,
                            background: idx === 0 ? '#fef9c3' : idx === 1 ? '#fff7ed' : 'transparent',
                            border: idx === 0 ? '1.5px solid #fcd34d' : idx === 1 ? '1.5px solid #fdba74' : 'none',
                            color: idx === 0 ? '#ca8a04' : idx === 1 ? '#f97316' : 'var(--text-muted)'
                          }}>
                            {idx + 1}
                          </div>

                          <Avatar id={member.avatar} size={38} glow={member.status === 'studying'} />
                          
                          <div style={styles.memberNameCol}>
                            <div style={styles.memberNameRow}>
                              <span style={styles.memberName}>{member.username}</span>
                              {member.role === 'owner' && <span style={styles.ownerTag}>建立者</span>}
                              {member.userId === user?.userId && <span style={styles.meTag}>我</span>}
                            </div>
                            <div style={styles.memberStatusRow}>
                              {renderMemberStatus(member.status, member.autoStatus)}
                            </div>
                          </div>
                        </div>

                        <div style={styles.memberRight}>
                          <span style={styles.memberMins}>{member.todayMinutes} 分鐘</span>
                        </div>
                      </div>

                      {/* Group TODO Checklist Section */}
                      <div style={styles.todoArea}>
                        <div style={styles.todoAreaHeader}>
                          <span style={styles.todoAreaTitle}>📋 今日任務清單</span>
                        </div>

                        <div style={styles.todoList}>
                          {member.todos && member.todos.length > 0 ? (
                            member.todos.map((todo) => {
                              const isMe = member.userId === user?.userId;
                              return (
                                <div key={todo.todoId} style={styles.todoItem}>
                                  <label style={styles.todoLabel}>
                                    <input
                                      type="checkbox"
                                      checked={todo.isCompleted === 1}
                                      disabled={!isMe}
                                      onChange={() => handleToggleTodo(groupDetail.groupId, todo.todoId, todo.isCompleted)}
                                      style={styles.todoCheckbox}
                                    />
                                    <span style={{
                                      ...styles.todoText,
                                      textDecoration: todo.isCompleted === 1 ? 'line-through' : 'none',
                                      color: todo.isCompleted === 1 ? 'var(--text-muted)' : 'var(--text-primary)'
                                    }}>
                                      {todo.todoText}
                                    </span>
                                  </label>
                                  {isMe && (
                                    <button 
                                      onClick={() => handleDeleteTodo(groupDetail.groupId, todo.todoId)}
                                      style={styles.todoDeleteBtn}
                                      title="刪除任務"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <span style={styles.todoEmptyText}>今日尚無安排待辦事項</span>
                          )}
                        </div>

                        {/* Add todo form only visible for myself */}
                        {member.userId === user?.userId && (
                          <form onSubmit={(e) => handleAddTodo(e, groupDetail.groupId)} style={styles.todoForm}>
                            <input
                              type="text"
                              value={newTodoInput}
                              onChange={(e) => setNewTodoInput(e.target.value)}
                              placeholder="今日讀書規劃（例如：寫微積分習題）..."
                              style={styles.todoFormInput}
                            />
                            <button type="submit" style={styles.todoFormSubmitBtn}>
                              新增
                            </button>
                          </form>
                        )}
                      </div>

                      {/* Collapsible Timeline Section */}
                      <div style={styles.groupTimelineSection}>
                        <div 
                          onClick={() => {
                            setExpandedMemberTimelines(prev => ({
                              ...prev,
                              [member.userId]: !prev[member.userId]
                            }));
                          }}
                          style={styles.timelineToggleBar}
                        >
                          <div style={styles.timelineToggleLeft}>
                            <History size={14} color="#7c6350" />
                            <span style={styles.timelineToggleText}>
                              今日時間線軌跡 ({member.timeline?.length || 0} 筆活動)
                            </span>
                          </div>
                          {expandedMemberTimelines[member.userId] ? (
                            <ChevronUp size={16} color="#7c6350" />
                          ) : (
                            <ChevronDown size={16} color="#7c6350" />
                          )}
                        </div>

                        {expandedMemberTimelines[member.userId] && (
                          <div style={styles.memberTimelineList} className="animate-slide-up">
                            {!member.timeline || member.timeline.length === 0 ? (
                              <div style={styles.timelineEmpty}>
                                <span>🦉</span>
                                <span>今天尚未記錄任何時間線活動</span>
                              </div>
                            ) : (
                              <div style={styles.timelineListContainer}>
                                <div style={styles.timelineSpineLine} />
                                {member.timeline.map((act) => {
                                  const conf = categoryConfig[act.category] || categoryConfig.study;
                                  const formatTimeStr = (isoString: string) => {
                                    try {
                                      const d = parseDatabaseDate(isoString);
                                      return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
                                    } catch {
                                      return isoString;
                                    }
                                  };
                                  const formatDuration = (seconds: number) => {
                                    const mins = Math.round(seconds / 60);
                                    if (mins >= 60) {
                                      const hrs = Math.floor(mins / 60);
                                      const rem = mins % 60;
                                      return rem > 0 ? `${hrs}小時${rem}分` : `${hrs}小時`;
                                    }
                                    return `${mins}分鐘`;
                                  };
                                  return (
                                    <div key={act.activityId} style={styles.timelineItemRow}>
                                      {/* Color Dot indicator */}
                                      <div style={{ ...styles.timelineNodeDot, background: conf.color }} />
                                      
                                      {/* Timeline Item Details */}
                                      <div style={{ ...styles.timelineItemContent, background: conf.bg, borderColor: conf.border }}>
                                        <div style={styles.timelineItemHeader}>
                                          <span style={styles.timelineItemTitle}>{act.activityName}</span>
                                          <span style={{ ...styles.timelineItemBadge, color: conf.color, borderColor: conf.border }}>
                                            {conf.label.split(' ')[0]}
                                          </span>
                                        </div>
                                        <div style={styles.timelineItemTimeRow}>
                                          <Clock size={11} color="#a89280" />
                                          <span style={styles.timelineItemTimeText}>
                                            {formatTimeStr(act.startTime)} - {formatTimeStr(act.endTime)} ({formatDuration(act.duration)})
                                          </span>
                                        </div>
                                        {act.note && (
                                          <div style={styles.timelineItemNoteRow}>
                                            <AlignLeft size={10} color="#a89280" />
                                            <span style={styles.timelineItemNoteText}>{act.note}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 右側側邊欄 */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Invite Code Share Card */}
            <div className="glass-card" style={styles.inviteShareCard}>
              <div style={styles.inviteShareLeft}>
                <span style={styles.shareLabel}>群組邀請碼</span>
                <span style={styles.shareCode}>{groupDetail.inviteCode}</span>
              </div>
              <button onClick={handleCopyCode} style={styles.copyBtn}>
                {copiedCode ? <Check size={16} color="#10b981" /> : <Copy size={16} />}
                <span>{copiedCode ? '已複製' : '複製邀請碼'}</span>
              </button>
            </div>

            {/* Group Shared Deadlines Card */}
            <div className="glass-card" style={{ ...styles.deadlinesCard, marginBottom: 0 }}>
              <div style={styles.boardHeader}>
                <Calendar size={18} color="#ca8a04" />
                <h3 style={styles.boardTitle}>📅 群組共享倒數與衝刺計畫</h3>
                <button 
                  onClick={() => setShowAddDeadlineForm(!showAddDeadlineForm)}
                  style={styles.addDeadlineToggleBtn}
                >
                  {showAddDeadlineForm ? '取消' : '+ 新增'}
                </button>
              </div>

              {showAddDeadlineForm && (
                <form onSubmit={handleAddGroupDeadline} style={styles.inlineForm}>
                  <div style={styles.formRow}>
                    <input
                      type="text"
                      value={deadlineTitle}
                      onChange={(e) => setDeadlineTitle(e.target.value)}
                      placeholder="項目名稱（如：期末專題發表）"
                      style={styles.inlineInput}
                      required
                    />
                    <input
                      type="date"
                      value={deadlineDate}
                      onChange={(e) => setDeadlineDate(e.target.value)}
                      style={styles.inlineInput}
                      required
                    />
                  </div>
                  <div style={styles.formRow}>
                    <select
                      value={deadlineType}
                      onChange={(e) => setDeadlineType(e.target.value)}
                      style={styles.inlineSelect}
                    >
                      <option value="exam">重要考試 📝</option>
                      <option value="homework">作業截止 ✏️</option>
                      <option value="project">專題發表 💻</option>
                      <option value="quiz">平時小考 📖</option>
                      <option value="custom">自訂類別...</option>
                    </select>

                    {deadlineType === 'custom' && (
                      <input
                        type="text"
                        value={customDeadlineType}
                        onChange={(e) => setCustomDeadlineType(e.target.value)}
                        placeholder="輸入自訂類別（含 Emoji）"
                        style={styles.inlineInput}
                        required
                      />
                    )}

                    <button type="submit" disabled={addingDeadline} style={styles.inlineSubmitBtn}>
                      {addingDeadline ? '儲存中' : '儲存'}
                    </button>
                  </div>
                </form>
              )}

              <div style={styles.deadlinesList}>
                {!groupDetail.deadlines || groupDetail.deadlines.length === 0 ? (
                  <p style={styles.emptyDeadlinesText}>目前尚無群組共享倒數，點擊右上角新增吧！</p>
                ) : (
                  groupDetail.deadlines.map((dl) => {
                    const daysLeft = calculateDaysRemaining(dl.targetDate);
                    const isCreatorOrOwner = dl.userId === user?.userId || groupDetail.role === 'owner';
                    
                    return (
                      <div key={dl.itemId} style={styles.deadlineItemCard}>
                        <div style={styles.deadlineItemLeft}>
                          <div style={styles.deadlineBadgeRow}>
                            <span style={styles.deadlineTypeBadge}>
                              {dl.type === 'exam' ? '重要考試 📝' : dl.type === 'homework' ? '作業截止 ✏️' : dl.type === 'project' ? '專題發表 💻' : dl.type === 'quiz' ? '平時小考 📖' : dl.type}
                            </span>
                            <span style={{
                              ...styles.deadlineDaysVal,
                              color: daysLeft <= 3 ? '#ef4444' : daysLeft <= 7 ? '#f97316' : '#22c55e'
                            }}>
                              {daysLeft > 0 ? `剩 ${daysLeft} 天` : daysLeft === 0 ? '就在今天！' : '已到期'}
                            </span>
                          </div>
                          <h4 style={styles.deadlineTitleText}>{dl.title}</h4>
                          <span style={styles.deadlineDateText}>截止日: {dl.targetDate}</span>
                        </div>

                        <div style={styles.deadlineItemRight}>
                          <button
                            onClick={() => handleGenerateGroupDeadlinePlan(dl.itemId, dl.title)}
                            disabled={generatingPlanId === dl.itemId}
                            style={styles.deadlinePlanBtn}
                          >
                            <Sparkles size={12} fill="currentColor" />
                            <span>{generatingPlanId === dl.itemId ? '規劃中' : 'AI 衝刺計畫'}</span>
                          </button>

                          {isCreatorOrOwner && (
                            <button
                              onClick={() => handleDeleteGroupDeadline(dl.itemId)}
                              style={styles.deadlineDeleteBtn}
                              title="刪除共享倒數"
                            >
                              <Trash2 size={12} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN PAGE: Groups List View ---
  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.header}>
        <h1 style={styles.title}>讀書群組</h1>
        <p style={styles.subtitle}>建立或加入群組，與同儕共享每日目標，互相激勵。</p>
      </div>

      {/* Action CTA Buttons */}
      <div style={styles.ctaRow}>
        <button onClick={() => setShowCreateModal(true)} style={styles.ctaBtn} className="btn btn-primary">
          <Plus size={16} />
          <span>建立讀書群組</span>
        </button>
        <button onClick={() => setShowJoinModal(true)} style={styles.ctaBtn} className="btn btn-secondary">
          <Compass size={16} />
          <span>使用邀請碼加入</span>
        </button>
      </div>

      {/* Groups List */}
      <div className="glass-card" style={styles.listCard}>
        <h3 style={styles.sectionTitle}>我加入的群組 ({groups.length})</h3>

        {groups.length === 0 ? (
          <div style={styles.emptyGroups}>
            <Users size={36} color="#64748b" style={{ marginBottom: '12px' }} />
            <p>目前尚未加入任何讀書群組。</p>
            <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
              可以點選上方按鈕建立新群組，或輸入好友的邀請碼。
            </p>
          </div>
        ) : (
          <div style={styles.groupsList}>
            {groups.map((group) => (
              <div 
                key={group.groupId} 
                onClick={() => setSelectedGroupId(group.groupId)}
                style={styles.groupItem}
                className="interactive"
              >
                <div style={styles.groupItemLeft}>
                  <div style={styles.groupAvatar}>
                    📚
                  </div>
                  <div style={styles.groupItemInfo}>
                    <h4 style={styles.groupName}>{group.groupName}</h4>
                    {group.description && <p style={styles.groupDesc}>{group.description}</p>}
                    <div style={styles.groupMetaLine}>
                      <span style={styles.groupMemberCount}>{group.memberCount} 人</span>
                      <span style={styles.metaDivider}>•</span>
                      <span style={styles.groupGoalVal}>目標 {group.dailyGroupGoal} 分鐘/天</span>
                    </div>
                  </div>
                </div>
                <ChevronRight size={18} color="#64748b" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE MODAL DIALOG */}
      {showCreateModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent} className="glass-card animate-slide-up">
            <h3 style={styles.modalTitle}>建立讀書群組</h3>
            <form onSubmit={handleCreateGroup} style={styles.modalForm}>
              <div className="form-group">
                <label className="form-label" htmlFor="group-name">群組名稱</label>
                <input
                  id="group-name"
                  type="text"
                  value={groupNameInput}
                  onChange={(e) => setGroupNameInput(e.target.value)}
                  className="form-input"
                  placeholder="例如：統計學期末衝刺班"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="group-desc">群組描述 (選填)</label>
                <input
                  id="group-desc"
                  type="text"
                  value={groupDescInput}
                  onChange={(e) => setGroupDescInput(e.target.value)}
                  className="form-input"
                  placeholder="簡述此群組的讀書目標或規範..."
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="group-goal">每日共同讀書目標 (分鐘)</label>
                <input
                  id="group-goal"
                  type="number"
                  value={groupGoalInput}
                  onChange={(e) => setGroupGoalInput(Math.max(10, Number(e.target.value)))}
                  className="form-input"
                  min="10"
                />
              </div>

              <div style={styles.modalActions}>
                <button 
                  type="button" 
                  onClick={() => setShowCreateModal(false)}
                  style={styles.modalCancel}
                  className="btn btn-outline"
                >
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  建立群組
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* JOIN MODAL DIALOG */}
      {showJoinModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent} className="glass-card animate-slide-up">
            <h3 style={styles.modalTitle}>輸入邀請碼加入</h3>
            <form onSubmit={handleJoinGroup} style={styles.modalForm}>
              <div className="form-group">
                <label className="form-label" htmlFor="invite-code">邀請碼 (6 位英數字)</label>
                <input
                  id="invite-code"
                  type="text"
                  value={inviteCodeInput}
                  onChange={(e) => setInviteCodeInput(e.target.value)}
                  className="form-input"
                  placeholder="例如：A1B2C3"
                  maxLength={10}
                  required
                  style={styles.inviteCodeField}
                />
              </div>

              <div style={styles.modalActions}>
                <button 
                  type="button" 
                  onClick={() => setShowJoinModal(false)}
                  style={styles.modalCancel}
                  className="btn btn-outline"
                >
                  取消
                </button>
                <button type="submit" className="btn btn-secondary">
                  加入
                </button>
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
  ctaRow: {
    display: 'flex',
    gap: '12px',
    width: '100%',
  },
  ctaBtn: {
    flex: 1,
    padding: '12px 16px',
    fontSize: '13px',
    borderRadius: '12px',
  },
  listCard: {
    padding: '20px',
  },
  sectionTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    marginBottom: '16px',
  },
  emptyGroups: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 0',
    color: 'var(--text-muted)',
    fontSize: '13px',
    textAlign: 'center' as const,
  },
  groupsList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  groupItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px',
    background: '#fffdfa',
    border: '1.5px solid #f3ebd8',
    borderRadius: '16px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  groupItemLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  groupAvatar: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    background: '#fff7ed',
    border: '1.5px solid #fdba74',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
  },
  groupItemInfo: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  groupName: {
    fontSize: '14px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  groupDesc: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '220px',
  },
  groupMetaLine: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '11px',
    color: 'var(--text-secondary)',
    fontWeight: 600,
  },
  groupMemberCount: {
    color: '#f97316',
  },
  metaDivider: {
    color: '#ecdcb9',
  },
  groupGoalVal: {
    color: 'var(--text-secondary)',
  },
  // --- Detail View Styles ---
  detailHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  backBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
  },
  leaveBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    padding: '6px 12px',
    borderRadius: '8px',
    transition: 'all 0.2s',
  },
  groupInfoCard: {
    background: '#fffbeb',
    border: '2px solid #ecdcb9',
    padding: '24px',
  },
  groupDetailTitle: {
    fontSize: '20px',
    fontWeight: 800,
    color: 'var(--text-primary)',
    marginBottom: '6px',
  },
  groupDetailDesc: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    lineHeight: 1.5,
    marginBottom: '20px',
  },
  groupProgressRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: '10px',
  },
  progressTextCol: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },
  progressLabel: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  progressVal: {
    fontSize: '16px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  goalRateBadge: {
    padding: '4px 10px',
    borderRadius: '8px',
    background: '#fff7ed',
    border: '1.5px solid #fdba74',
    color: '#f97316',
    fontSize: '12px',
    fontWeight: 700,
  },
  inviteShareCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 20px',
    background: '#fff7ed',
    border: '1.5px solid #fdba74',
  },
  inviteShareLeft: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },
  shareLabel: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    fontWeight: 600,
  },
  shareCode: {
    fontSize: '18px',
    fontWeight: 800,
    fontFamily: 'Fredoka, monospace',
    color: '#f97316',
    letterSpacing: '1px',
  },
  copyBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    background: '#ffffff',
    border: '1.5px solid #ecdcb9',
    borderRadius: '10px',
    color: 'var(--text-primary)',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  leaderboardCard: {
    padding: '24px 20px',
  },
  boardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '18px',
  },
  boardTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  memberList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  memberItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 14px',
    background: '#fffdfa',
    border: '1.5px solid #f3ebd8',
    borderRadius: '14px',
  },
  memberLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  rankBadge: {
    width: '22px',
    height: '22px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 800,
    fontFamily: 'Fredoka, sans-serif',
  },
  memberNameCol: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },
  memberNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  memberName: {
    fontSize: '13px',
    fontWeight: 700,
    color: 'var(--text-primary)',
  },
  ownerTag: {
    fontSize: '9px',
    background: '#fef9c3',
    color: '#ca8a04',
    border: '1.5px solid #fcd34d',
    padding: '1px 5px',
    borderRadius: '4px',
    fontWeight: 700,
  },
  memberStatusRow: {
    display: 'flex',
  },
  mStatus: {
    fontSize: '10px',
    fontWeight: 600,
  },
  memberRight: {
    display: 'flex',
    alignItems: 'center',
  },
  memberMins: {
    fontSize: '13px',
    fontWeight: 700,
    color: 'var(--text-primary)',
    fontFamily: 'Fredoka, sans-serif',
  },
  // --- Modals Styles ---
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
    maxWidth: '420px',
    padding: '30px 24px',
    background: '#ffffff',
    border: '2px solid #ecdcb9',
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 800,
    marginBottom: '20px',
    color: 'var(--text-primary)',
    textAlign: 'center' as const,
  },
  modalForm: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '24px',
  },
  modalCancel: {
    padding: '10px 20px',
    fontSize: '13px',
  },
  inviteCodeField: {
    textTransform: 'uppercase' as const,
    textAlign: 'center' as const,
    letterSpacing: '2px',
    fontSize: '18px',
    fontFamily: 'Fredoka, monospace',
    fontWeight: 800,
  },
  detailSpinnerWrapper: {
    display: 'flex',
    justifyContent: 'center',
    padding: '30px 0',
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
  },
  memberCardContainer: {
    background: '#fffdfa',
    border: '1.5px solid #f3ebd8',
    borderRadius: '16px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '14px',
  },
  memberItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  meTag: {
    fontSize: '9px',
    background: '#fff7ed',
    color: '#f97316',
    border: '1.5px solid #fdba74',
    padding: '1px 5px',
    borderRadius: '4px',
    fontWeight: 700,
  },
  todoArea: {
    background: '#fcfaf5',
    borderRadius: '10px',
    padding: '12px',
    border: '1.5px solid #ecdcb9',
  },
  todoAreaHeader: {
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
  },
  todoAreaTitle: {
    fontSize: '11px',
    color: 'var(--text-secondary)',
    fontWeight: 700,
    letterSpacing: '0.5px',
  },
  todoList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
    marginBottom: '8px',
  },
  todoItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '6px 8px',
    background: '#ffffff',
    borderRadius: '6px',
  },
  todoLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    flex: 1,
  },
  todoCheckbox: {
    accentColor: '#fbbf24',
    cursor: 'pointer',
    width: '14px',
    height: '14px',
  },
  todoText: {
    fontSize: '12.5px',
    fontWeight: 500,
  },
  todoDeleteBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted)',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'color 0.2s',
  },
  todoEmptyText: {
    fontSize: '11.5px',
    color: 'var(--text-muted)',
    fontStyle: 'italic',
    padding: '4px 0',
  },
  todoForm: {
    display: 'flex',
    gap: '8px',
    marginTop: '10px',
  },
  todoFormInput: {
    flex: 1,
    background: '#ffffff',
    border: '2px solid #ecdcb9',
    borderRadius: '8px',
    padding: '8px 12px',
    color: 'var(--text-primary)',
    fontSize: '12px',
    outline: 'none',
  },
  todoFormSubmitBtn: {
    background: '#fffbeb',
    border: '2px solid #ecdcb9',
    color: 'var(--text-primary)',
    fontSize: '11px',
    fontWeight: 700,
    padding: '0 12px',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  groupTimelineSection: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  timelineToggleBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#fcfaf5',
    border: '1.5px solid #ecdcb9',
    borderRadius: '10px',
    padding: '10px 14px',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
  },
  timelineToggleLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  timelineToggleText: {
    fontSize: '12px',
    color: '#7c6350',
    fontWeight: 800,
  },
  memberTimelineList: {
    padding: '12px',
    background: '#fffdfa',
    border: '1.5px solid #f3ebd8',
    borderRadius: '12px',
  },
  timelineEmpty: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    fontSize: '11.5px',
    color: 'var(--text-muted)',
    padding: '8px 0',
    fontWeight: 600,
  },
  timelineListContainer: {
    position: 'relative' as const,
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    paddingLeft: '4px',
  },
  timelineSpineLine: {
    position: 'absolute' as const,
    top: '4px',
    bottom: '4px',
    left: '12px',
    width: '2px',
    background: '#ecdcb9',
    zIndex: 1,
  },
  timelineItemRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    position: 'relative' as const,
    zIndex: 2,
  },
  timelineNodeDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    marginTop: '12px',
    marginLeft: '9px',
    border: '1.5px solid #faf6ed',
  },
  timelineItemContent: {
    flex: 1,
    border: '1px solid',
    borderRadius: '10px',
    padding: '8px 12px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  timelineItemHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineItemTitle: {
    fontSize: '12.5px',
    fontWeight: 800,
    color: 'var(--text-primary)',
  },
  timelineItemBadge: {
    fontSize: '9px',
    fontWeight: 700,
    padding: '1px 6px',
    borderRadius: '4px',
    background: '#ffffff',
    border: '1px solid',
  },
  timelineItemTimeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  timelineItemTimeText: {
    fontSize: '10.5px',
    color: 'var(--text-secondary)',
    fontWeight: 600,
    fontFamily: 'Fredoka, sans-serif',
  },
  timelineItemNoteRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    background: 'rgba(255, 255, 255, 0.4)',
    padding: '4px 8px',
    borderRadius: '6px',
  },
  timelineItemNoteText: {
    fontSize: '10px',
    color: 'var(--text-secondary)',
    fontWeight: 500,
  },
  deadlinesCard: {
    padding: '20px',
    marginBottom: '20px',
  },
  addDeadlineToggleBtn: {
    marginLeft: 'auto',
    fontSize: '11.5px',
    fontWeight: 700,
    color: '#ca8a04',
    background: '#fef9c3',
    border: '1.5px solid #fcd34d',
    borderRadius: '8px',
    padding: '3px 10px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  inlineForm: {
    background: '#fffdfa',
    border: '1.5px solid #ecdcb9',
    borderRadius: '12px',
    padding: '12px',
    marginTop: '12px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '8px',
  },
  formRow: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
  },
  inlineInput: {
    flex: 1,
    minWidth: '120px',
    padding: '6px 10px',
    borderRadius: '8px',
    border: '1.5px solid #ecdcb9',
    fontSize: '12px',
    outline: 'none',
    color: 'var(--text-primary)',
    height: '32px',
  },
  inlineSelect: {
    flex: 1,
    minWidth: '120px',
    padding: '6px 10px',
    borderRadius: '8px',
    border: '1.5px solid #ecdcb9',
    fontSize: '12px',
    outline: 'none',
    color: 'var(--text-primary)',
    background: '#ffffff',
    height: '32px',
  },
  inlineSubmitBtn: {
    padding: '0 14px',
    borderRadius: '8px',
    border: 'none',
    background: '#ca8a04',
    color: '#ffffff',
    fontSize: '12px',
    fontWeight: 700,
    cursor: 'pointer',
    height: '32px',
  },
  deadlinesList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '10px',
    marginTop: '12px',
  },
  emptyDeadlinesText: {
    fontSize: '11.5px',
    color: 'var(--text-muted)',
    textAlign: 'center' as const,
    padding: '14px 0',
  },
  deadlineItemCard: {
    background: '#ffffff',
    border: '2px solid #ecdcb9',
    borderRadius: '12px',
    padding: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '12px',
  },
  deadlineItemLeft: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
    flex: 1,
  },
  deadlineBadgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  deadlineTypeBadge: {
    fontSize: '9px',
    padding: '1px 6px',
    borderRadius: '4px',
    fontWeight: 800,
    background: '#fef3c7',
    color: '#b45309',
    border: '1px solid #fde68a',
  },
  deadlineDaysVal: {
    fontSize: '11px',
    fontWeight: 800,
  },
  deadlineTitleText: {
    fontSize: '13.5px',
    fontWeight: 800,
    color: '#4a3728',
    margin: 0,
  },
  deadlineDateText: {
    fontSize: '10px',
    color: 'var(--text-muted)',
    fontWeight: 600,
  },
  deadlineItemRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  deadlinePlanBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '11px',
    fontWeight: 700,
    padding: '6px 12px',
    borderRadius: '8px',
    border: '1.5px solid #ddd6fe',
    background: '#f5f3ff',
    color: '#7c3aed',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  deadlineDeleteBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    padding: '6px',
    borderRadius: '6px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#7c6350',
    transition: 'background-color 0.2s',
  },
  studyRoomCard: {
    padding: '20px',
    marginBottom: '20px',
  },
  studyRoomContent: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
    marginTop: '12px',
  },
  studyRoomSection: {
    background: '#fffdfa',
    border: '1.5px solid #ecdcb9',
    borderRadius: '16px',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
  },
  studyRoomSectionTitle: {
    fontSize: '13px',
    color: '#7c6350',
    fontWeight: 800,
    borderBottom: '1.5px dashed #f3ebd8',
    paddingBottom: '8px',
  },
  studyRoomGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: '12px',
  },
  roomMemberAvatarCard: {
    background: '#ffffff',
    border: '2px solid #ecdcb9',
    borderRadius: '12px',
    padding: '10px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    position: 'relative' as const,
  },
  roomMemberRestCard: {
    background: '#ffffff',
    border: '1.5px solid #ecdcb9',
    borderRadius: '12px',
    padding: '10px 12px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    position: 'relative' as const,
  },
  bubbleFloat: {
    position: 'absolute' as const,
    bottom: '50px',
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'linear-gradient(135deg, #fef3c7, #fde047)',
    border: '1.5px solid #f59e0b',
    borderRadius: '12px',
    padding: '4px 8px',
    color: '#4a3728',
    fontSize: '11px',
    fontWeight: 800,
    whiteSpace: 'nowrap' as const,
    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.18)',
    zIndex: 99,
    pointerEvents: 'none' as const,
  },
  roomMemberInfoCol: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
    flex: 1,
  },
  roomMemberNameRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  roomMemberName: {
    fontSize: '13px',
    fontWeight: 800,
    color: 'var(--text-primary)',
  },
  roomMemberStatusLabel: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#ca8a04',
  },
  roomMemberRestStatusLabel: {
    fontSize: '11px',
    fontWeight: 700,
    color: '#f97316',
  },
  roomCheerActionRow: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '4px',
  },
  roomCheerBtn: {
    background: '#fef9c3',
    border: '1.5px solid #fcd34d',
    borderRadius: '6px',
    padding: '2px 8px',
    fontSize: '10px',
    fontWeight: 800,
    color: '#b45309',
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  roomEmptyText: {
    fontSize: '11.5px',
    color: 'var(--text-muted)',
    gridColumn: '1 / -1',
    textAlign: 'center' as const,
    padding: '8px 0',
  },
  roomOfflineGrid: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '12px',
    alignItems: 'center',
  },
  roomOfflineMember: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: '4px',
    opacity: 0.65,
  },
  roomOfflineName: {
    fontSize: '10.5px',
    color: 'var(--text-muted)',
    fontWeight: 600,
    maxWidth: '64px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  }
};

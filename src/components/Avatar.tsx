import React from 'react';

interface AvatarProps {
  id: string;
  size?: number;
  glow?: boolean;
}

export const avatarList = [
  { id: 'avatar_1', name: '專注貓頭鷹 🦉', emoji: '🦉', gradient: '#f5f3ff' },
  { id: 'avatar_2', name: '機智小狐狸 🦊', emoji: '🦊', gradient: '#fff7ed' },
  { id: 'avatar_3', name: '沉穩大熊貓 🐼', emoji: '🐼', gradient: '#f8fafc' },
  { id: 'avatar_4', name: '耐力無尾熊 🐨', emoji: '🐨', gradient: '#ecfeff' },
  { id: 'avatar_5', name: '自信大獅子 🦁', emoji: '🦁', gradient: '#fdf2f8' },
];

export const Avatar: React.FC<AvatarProps> = ({ id = 'avatar_1', size = 48, glow = false }) => {
  // Check if avatar ID is a URL
  const isUrl = id && (
    id.startsWith('http://') || 
    id.startsWith('https://') || 
    id.startsWith('/') || 
    id.startsWith('data:')
  );

  const containerStyle = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '30%', // squircle
    border: '2px solid #ecdcb9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: glow 
      ? '0 4px 12px rgba(139, 92, 26, 0.15)' 
      : '0 2px 4px rgba(139, 92, 26, 0.05)',
    transition: 'all 0.15s ease',
    overflow: 'hidden',
  };

  if (isUrl) {
    return (
      <div style={{ ...containerStyle, background: '#ffffff' }}>
        <img 
          src={id} 
          alt="User Avatar" 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => {
            // Fallback if image fails to load
            (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2280%22>👤</text></svg>';
          }}
        />
      </div>
    );
  }

  const avatar = avatarList.find(a => a.id === id) || avatarList[0];

  return (
    <div style={{ ...containerStyle, background: avatar.gradient }}>
      <span style={{ fontSize: `${size * 0.55}px`, userSelect: 'none' }}>
        {avatar.emoji}
      </span>
    </div>
  );
};

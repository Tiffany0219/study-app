import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { avatarList, Avatar } from '../components/Avatar';
import { BookOpen, User, Mail, Lock, AlertCircle, Upload, Trash2 } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(avatarList[0].id);
  const [customAvatar, setCustomAvatar] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('請選擇圖片檔案');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 160;
        let width = img.width;
        let height = img.height;

        const size = Math.min(width, height);
        canvas.width = MAX_SIZE;
        canvas.height = MAX_SIZE;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(
            img,
            (width - size) / 2,
            (height - size) / 2,
            size,
            size,
            0,
            0,
            MAX_SIZE,
            MAX_SIZE
          );
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setCustomAvatar(dataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !email || !password) {
      setError('請填寫所有欄位');
      return;
    }

    if (password.length < 6) {
      setError('密碼長度需至少為 6 個字元');
      return;
    }

    setError('');
    setLoading(true);

    const finalAvatar = customAvatar.trim() || selectedAvatar;

    try {
      const res = await register(username, email, password, finalAvatar);
      if (res.success) {
        navigate('/');
      } else {
        setError(res.message || '註冊失敗，請重試');
      }
    } catch (err) {
      setError('連線失敗，請檢查網路設定');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container} className="animate-fade-in">
      <div style={styles.formCard} className="glass-card">
        {/* Branding Logo */}
        <div style={styles.logoBlock}>
          <div style={styles.logoCircle}>
            <BookOpen size={28} color="#4a3728" />
          </div>
          <h1 style={styles.title}>註冊新帳號</h1>
          <p style={styles.subtitle}>加入「一起讀書監督」開始你的專注學習之旅</p>
        </div>

        {error && (
          <div style={styles.errorAlert}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div className="form-group">
            <label className="form-label" htmlFor="username">用戶名 (暱稱)</label>
            <div style={styles.inputWrapper}>
              <User size={18} style={styles.inputIcon} />
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="例如：學霸小明"
                className="form-input"
                style={styles.inputWithIcon}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email 電子信箱</label>
            <div style={styles.inputWrapper}>
              <Mail size={18} style={styles.inputIcon} />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@study.com"
                className="form-input"
                style={styles.inputWithIcon}
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">密碼</label>
            <div style={styles.inputWrapper}>
              <Lock size={18} style={styles.inputIcon} />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="密碼至少需要 6 個字元"
                className="form-input"
                style={styles.inputWithIcon}
                disabled={loading}
              />
            </div>
          </div>

          {/* Avatar Selector */}
          <div className="form-group" style={styles.avatarFormGroup}>
            <label className="form-label">選擇讀書夥伴 (頭像角色)</label>
            <div style={styles.avatarGrid}>
              {avatarList.map((avatar) => {
                const isSelected = !customAvatar && selectedAvatar === avatar.id;
                return (
                  <button
                    key={avatar.id}
                    type="button"
                    onClick={() => {
                      setSelectedAvatar(avatar.id);
                      setCustomAvatar('');
                    }}
                    style={styles.avatarBtn}
                    title={avatar.name}
                  >
                    <Avatar id={avatar.id} size={40} glow={isSelected} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Avatar Upload */}
          <div className="form-group">
            <label className="form-label">或上傳自訂個人照片 📷</label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-outline"
                style={{ flex: 1, padding: '10px 16px', fontSize: '13px', display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center' }}
                disabled={loading}
              >
                <Upload size={14} />
                <span>選擇自訂照片</span>
              </button>
              
              {customAvatar && (
                <button
                  type="button"
                  onClick={() => setCustomAvatar('')}
                  className="btn btn-outline"
                  style={{ borderColor: '#fda4af', color: '#e11d48', padding: '10px 16px', fontSize: '13px', display: 'flex', gap: '6px', alignItems: 'center', justifyContent: 'center' }}
                  disabled={loading}
                >
                  <Trash2 size={14} />
                  <span>移除照片</span>
                </button>
              )}

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                style={{ display: 'none' }}
              />

              {customAvatar && (
                <div style={{ border: '1.5px solid #fdba74', borderRadius: '12px', padding: '2px', background: '#fff7ed', display: 'flex' }}>
                  <Avatar id={customAvatar} size={42} glow />
                </div>
              )}
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={styles.submitBtn}
            disabled={loading}
          >
            {loading ? '註冊中...' : '註冊帳號'}
          </button>
        </form>

        <div style={styles.footer}>
          <span>已經有帳號了嗎？</span>
          <Link to="/login" style={styles.link}>立即登入</Link>
        </div>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '32px 16px',
    backgroundPosition: 'center',
  },
  formCard: {
    width: '100%',
    maxWidth: '440px',
    padding: '40px 30px',
  },
  logoBlock: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    textAlign: 'center' as const,
    marginBottom: '24px',
  },
  logoCircle: {
    width: '56px',
    height: '56px',
    borderRadius: '16px',
    background: '#fde047',
    border: '2px solid #ecdcb9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '16px',
    boxShadow: '0 3px 8px rgba(139, 92, 26, 0.08)',
  },
  title: {
    fontSize: '26px',
    fontWeight: 800,
    color: '#4a3728',
    letterSpacing: '-0.5px',
    marginBottom: '6px',
    fontFamily: 'Fredoka, sans-serif',
  },
  subtitle: {
    fontSize: '13.5px',
    color: '#7c6350',
    fontWeight: 700,
    lineHeight: 1.4,
  },
  errorAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    borderRadius: '12px',
    background: '#fff8f8',
    border: '2px solid #fda4af',
    boxShadow: '0 3px 8px rgba(225, 29, 72, 0.04)',
    color: '#e11d48',
    fontSize: '13px',
    fontWeight: 700,
    marginBottom: '20px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
  },
  inputWrapper: {
    position: 'relative' as const,
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute' as const,
    left: '16px',
    color: '#7c6350',
    pointerEvents: 'none' as const,
  },
  inputWithIcon: {
    paddingLeft: '48px',
    width: '100%',
  },
  avatarFormGroup: {
    marginTop: '8px',
  },
  avatarGrid: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '10px',
    marginTop: '4px',
  },
  avatarBtn: {
    border: 'none',
    background: 'transparent',
    padding: '0',
    cursor: 'pointer',
    borderRadius: '30%',
    transition: 'all 0.1s',
  },
  submitBtn: {
    marginTop: '24px',
    width: '100%',
  },
  footer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '6px',
    marginTop: '24px',
    fontSize: '13.5px',
    color: '#7c6350',
    fontWeight: 700,
  },
  link: {
    color: '#fb923c',
    textDecoration: 'none',
    fontWeight: 800,
  }
};

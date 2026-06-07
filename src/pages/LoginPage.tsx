import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Mail, Lock, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !password) {
      setError('請填寫所有欄位');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const res = await login(account, password);
      if (res.success) {
        navigate('/');
      } else {
        setError(res.message || '登入失敗，請檢查您的帳號密碼');
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
          <h1 style={styles.title}>一起讀書監督</h1>
          <p style={styles.subtitle}>與夥伴共同專注，累積讀書成果</p>
        </div>

        {error && (
          <div style={styles.errorAlert}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <div className="form-group">
            <label className="form-label" htmlFor="account">用戶名 或 Email</label>
            <div style={styles.inputWrapper}>
              <Mail size={18} style={styles.inputIcon} />
              <input
                id="account"
                type="text"
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                placeholder="請輸入用戶名或 Email"
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
                placeholder="請輸入密碼"
                className="form-input"
                style={styles.inputWithIcon}
                disabled={loading}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={styles.submitBtn}
            disabled={loading}
          >
            {loading ? '登入中...' : '登入'}
          </button>
        </form>

        <div style={styles.footer}>
          <span>還沒有帳號嗎？</span>
          <Link to="/register" style={styles.link}>立即註冊</Link>
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
    padding: '24px 16px',
    backgroundPosition: 'center',
  },
  formCard: {
    width: '100%',
    maxWidth: '420px',
    padding: '40px 30px',
  },
  logoBlock: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    textAlign: 'center' as const,
    marginBottom: '32px',
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
  submitBtn: {
    marginTop: '12px',
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

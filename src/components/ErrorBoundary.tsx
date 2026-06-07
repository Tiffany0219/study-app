import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RotateCcw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an unhandled error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <style>{`
            @keyframes float {
              0% { transform: translateY(0px) rotate(0deg); }
              50% { transform: translateY(-10px) rotate(3deg); }
              100% { transform: translateY(0px) rotate(0deg); }
            }
            .floating-icon {
              animation: float 4s ease-in-out infinite;
            }
            .retry-btn:hover {
              transform: scale(1.05);
              box-shadow: 0 8px 20px rgba(245, 158, 11, 0.25) !important;
              background: #f59e0b !important;
            }
            .home-btn:hover {
              transform: scale(1.05);
              box-shadow: 0 8px 20px rgba(74, 55, 40, 0.08) !important;
              background: rgba(255, 255, 255, 0.9) !important;
            }
          `}</style>
          
          <div className="glass-card" style={styles.card}>
            <div className="floating-icon" style={styles.iconWrapper}>
              <AlertOctagon size={48} color="#f59e0b" />
            </div>
            
            <h1 style={styles.title}>哎呀！自習室打瞌睡了 ☕</h1>
            <p style={styles.subtitle}>
              程式在運行時遇到了一點小意外。別擔心，你的專注時長已經安全記錄，請試著重新整理或返回首頁。
            </p>
            
            {this.state.error && (
              <div style={styles.errorDetails}>
                <span style={styles.errorLabel}>錯誤訊息：</span>
                <code style={styles.code}>{this.state.error.message || '未知運行時錯誤'}</code>
              </div>
            )}
            
            <div style={styles.btnGroup}>
              <button 
                onClick={this.handleReset} 
                className="retry-btn" 
                style={styles.primaryBtn}
              >
                <RotateCcw size={16} />
                <span>重新整理</span>
              </button>
              <button 
                onClick={this.handleGoHome} 
                className="home-btn" 
                style={styles.secondaryBtn}
              >
                <Home size={16} />
                <span>返回首頁</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles = {
  container: {
    minHeight: '100vh',
    width: '100%',
    background: 'linear-gradient(135deg, #fdfbf7 0%, #f5ebd3 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    fontFamily: '"Outfit", "PingFang TC", sans-serif',
    boxSizing: 'border-box' as const,
  },
  card: {
    maxWidth: '480px',
    width: '100%',
    background: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '2px solid #ecdcb9',
    borderRadius: '24px',
    padding: '40px 32px',
    textAlign: 'center' as const,
    boxShadow: '0 12px 40px rgba(74, 55, 40, 0.08)',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    boxSizing: 'border-box' as const,
  },
  iconWrapper: {
    background: 'rgba(245, 158, 11, 0.1)',
    borderRadius: '20px',
    padding: '16px',
    marginBottom: '24px',
    display: 'inline-flex',
  },
  title: {
    fontSize: '22px',
    fontWeight: 800,
    color: '#4a3728',
    margin: '0 0 12px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#7c6350',
    lineHeight: '1.6',
    margin: '0 0 24px 0',
  },
  errorDetails: {
    width: '100%',
    background: 'rgba(74, 55, 40, 0.04)',
    border: '1px solid rgba(74, 55, 40, 0.08)',
    borderRadius: '12px',
    padding: '12px 16px',
    marginBottom: '24px',
    textAlign: 'left' as const,
    boxSizing: 'border-box' as const,
  },
  errorLabel: {
    fontSize: '12px',
    color: '#a89280',
    fontWeight: 700,
    display: 'block',
    marginBottom: '4px',
  },
  code: {
    fontFamily: 'monospace',
    fontSize: '12.5px',
    color: '#ef4444',
    wordBreak: 'break-all' as const,
  },
  btnGroup: {
    display: 'flex',
    gap: '12px',
    width: '100%',
  },
  primaryBtn: {
    flex: 1,
    background: '#fbbf24',
    color: '#ffffff',
    border: 'none',
    borderRadius: '14px',
    padding: '12px 16px',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.15)',
  },
  secondaryBtn: {
    flex: 1,
    background: '#ffffff',
    color: '#7c6350',
    border: '2px solid #ecdcb9',
    borderRadius: '14px',
    padding: '10px 16px',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 2px 6px rgba(74, 55, 40, 0.03)',
  }
};

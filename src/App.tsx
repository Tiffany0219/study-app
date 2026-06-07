import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TimerProvider } from './context/TimerContext';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { HomePage } from './pages/HomePage';
import { StudyTimerPage } from './pages/StudyTimerPage';
import { StatisticsPage } from './pages/StatisticsPage';
import { ProfilePage } from './pages/ProfilePage';
import { FriendsPage } from './pages/FriendsPage';
import { GroupsPage } from './pages/GroupsPage';
import { TimelinePage } from './pages/TimelinePage';
import { FriendTimelinePage } from './pages/FriendTimelinePage';
import { ReportsPage } from './pages/ReportsPage';
import { ExamsPage } from './pages/ExamsPage';
import { ChatPage } from './pages/ChatPage';
import { Navbar } from './components/Navbar';
import { BottomTabBar } from './components/BottomTabBar';
import { NotificationToast } from './components/NotificationToast';
import { TimerMiniBar } from './components/TimerMiniBar';

// Protected Route Wrapper Component
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={styles.loadingScreen}>
        <div style={styles.spinner} />
        <span style={styles.loadingText}>讀取帳號驗證中...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-container">
      <Navbar />
      <NotificationToast />
      <TimerMiniBar />
      <main className="app-content">
        {children}
      </main>
      <BottomTabBar />
    </div>
  );
};

export const AppContent: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected Routes */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/timer" 
          element={
            <ProtectedRoute>
              <StudyTimerPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/friends" 
          element={
            <ProtectedRoute>
              <FriendsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/friends/:friendId/timeline" 
          element={
            <ProtectedRoute>
              <FriendTimelinePage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/groups" 
          element={
            <ProtectedRoute>
              <GroupsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/timeline" 
          element={
            <ProtectedRoute>
              <TimelinePage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/stats" 
          element={
            <ProtectedRoute>
              <StatisticsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/reports" 
          element={
            <ProtectedRoute>
              <ReportsPage />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/exams" 
          element={
            <ProtectedRoute>
              <ExamsPage />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/chat" 
          element={
            <ProtectedRoute>
              <ChatPage />
            </ProtectedRoute>
          } 
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <TimerProvider>
        <AppContent />
      </TimerProvider>
    </AuthProvider>
  );
};

const styles = {
  loadingScreen: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    gap: '16px',
    backgroundColor: '#faf6ed',
    color: '#7c6350',
  },
  spinner: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: '3px solid rgba(74, 55, 40, 0.15)',
    borderTopColor: '#fbbf24',
    animation: 'spin-slow 1s linear infinite',
  },
  loadingText: {
    fontSize: '14px',
    fontWeight: 500,
    letterSpacing: '0.5px',
  }
};

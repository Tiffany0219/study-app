import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';

export const ambientTracks = [
  { id: 'none', name: '無背景環境音 🔇', url: '' },
  { id: 'rain', name: '雨落敲窗 🌧️', url: 'https://www.soundjay.com/nature/sounds/rain-07.mp3' },
  { id: 'forest', name: '森林鳥語 🐦', url: 'https://www.soundjay.com/nature/sounds/forest-1.mp3' },
  { id: 'noise', name: '專注白噪音 ⚡', url: 'https://www.soundjay.com/misc/sounds/white-noise-01.mp3' },
  { id: 'lofi', name: '溫柔木吉他 🎸', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3' }
];

interface TimerContextType {
  subject: string;
  targetMinutes: number;
  secondsRemaining: number;
  isTimerActive: boolean;
  isPaused: boolean;
  elapsedSeconds: number;
  activeTrack: string;
  volume: number;
  playingTracks: Record<string, boolean>;
  trackVolumes: Record<string, number>;
  saveStatus: 'idle' | 'saving' | 'success' | 'error';
  errorMessage: string;
  rewardDetails: { exp: number; lvlUp: boolean; lvl: number } | null;
  startTimer: (subject: string) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  resetTimer: () => void;
  setTargetMinutes: (mins: number) => void;
  setSecondsRemaining: (secs: number) => void;
  setSubject: (sub: string) => void;
  setActiveTrack: (track: string) => void;
  setVolume: (vol: number) => void;
  setPlayingTracks: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  setTrackVolumes: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  saveSession: (status: 'completed' | 'cancelled') => Promise<void>;
  clearSaveStatus: () => void;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export const TimerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, reloadUserProfile } = useAuth();
  
  const [subject, setSubject] = useState('程式設計');
  const [targetMinutes, setTargetMinutes] = useState(25);
  const [secondsRemaining, setSecondsRemaining] = useState(25 * 60);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Ambient Sound Player States (Multi-track mixing)
  const [playingTracks, setPlayingTracks] = useState<Record<string, boolean>>({
    rain: false,
    forest: false,
    noise: false,
    lofi: false,
  });
  const [trackVolumes, setTrackVolumes] = useState<Record<string, number>>({
    rain: 0.4,
    forest: 0.4,
    noise: 0.4,
    lofi: 0.4,
  });
  const audiosRef = useRef<Record<string, HTMLAudioElement>>({});

  // Legacy fields for backward compatibility
  const activeTrack = 'none';
  const volume = 0.4;

  // Status for modal overlays
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [rewardDetails, setRewardDetails] = useState<{ exp: number; lvlUp: boolean; lvl: number } | null>(null);

  // Refs for tracking mutable states inside async calls and callbacks
  const subjectRef = useRef(subject);
  const elapsedSecondsRef = useRef(elapsedSeconds);
  const startTimeRef = useRef<string | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    subjectRef.current = subject;
  }, [subject]);

  useEffect(() => {
    elapsedSecondsRef.current = elapsedSeconds;
  }, [elapsedSeconds]);

  // Audio Playback Effects (Multi-track mixing)
  useEffect(() => {
    ambientTracks.forEach(track => {
      if (track.id === 'none') return;

      const isPlaying = playingTracks[track.id] && isTimerActive && !isPaused;
      const vol = trackVolumes[track.id] ?? 0.4;

      if (isPlaying) {
        if (!audiosRef.current[track.id]) {
          const audio = new Audio(track.url);
          audio.loop = true;
          audiosRef.current[track.id] = audio;
        }
        const audio = audiosRef.current[track.id];
        audio.volume = vol;
        if (audio.paused) {
          audio.play().catch(err => console.log(`Audio play error for ${track.id}:`, err));
        }
      } else {
        if (audiosRef.current[track.id]) {
          audiosRef.current[track.id].pause();
        }
      }
    });
  }, [playingTracks, trackVolumes, isTimerActive, isPaused]);

  useEffect(() => {
    return () => {
      // Clean up all audios on unmount
      Object.values(audiosRef.current).forEach(audio => {
        try {
          audio.pause();
        } catch (e) {}
      });
    };
  }, []);

  // Reset timer if user logs out
  useEffect(() => {
    if (!token) {
      resetTimer();
    }
  }, [token]);

  const updateLiveStatus = async (status: 'studying' | 'resting' | 'offline') => {
    if (!token) return;
    try {
      await fetch('/api/auth/status', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      });
      if (reloadUserProfile) {
        await reloadUserProfile();
      }
    } catch (e) {
      console.error('Failed to update live status globally:', e);
    }
  };

  // Start Timer
  const startTimer = (selectedSubject: string) => {
    setSubject(selectedSubject);
    setIsTimerActive(true);
    setIsPaused(false);
    startTimeRef.current = new Date().toISOString();
    updateLiveStatus('studying');
  };

  // Pause Timer
  const pauseTimer = () => {
    setIsPaused(true);
    updateLiveStatus('resting');
  };

  // Resume Timer
  const resumeTimer = () => {
    setIsPaused(false);
    updateLiveStatus('studying');
  };

  // Reset Timer to initial state
  const resetTimer = () => {
    setIsTimerActive(false);
    setIsPaused(false);
    setSecondsRemaining(targetMinutes * 60);
    setElapsedSeconds(0);
    startTimeRef.current = null;
    setSaveStatus('idle');
    setRewardDetails(null);
    updateLiveStatus('resting');
  };

  const clearSaveStatus = () => {
    setSaveStatus('idle');
    setRewardDetails(null);
  };

  // Call API to Save Study Session
  const saveSession = async (status: 'completed' | 'cancelled') => {
    if (!token || !startTimeRef.current) return;

    setSaveStatus('saving');
    const endTime = new Date().toISOString();
    updateLiveStatus('resting');

    try {
      const res = await fetch('/api/study/records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          subject: subjectRef.current,
          duration: elapsedSecondsRef.current,
          startTime: startTimeRef.current,
          endTime,
          status
        })
      });

      const data = await res.json();
      if (res.ok) {
        // Stop the timer visually before showing modal
        setIsTimerActive(false);
        setIsPaused(false);
        setSaveStatus('success');
        setRewardDetails({
          exp: data.rewardExp,
          lvlUp: data.leveledUp,
          lvl: data.level
        });
        
        await reloadUserProfile();
      } else {
        setSaveStatus('error');
        setErrorMessage(data.message || '儲存失敗');
      }
    } catch (err) {
      console.error('Error saving study record globally:', err);
      setSaveStatus('error');
      setErrorMessage('網路連線失敗，無法與伺服器連線');
    }
  };

  // Core Timer Interval Loop
  useEffect(() => {
    if (isTimerActive && !isPaused) {
      timerIntervalRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            if (timerIntervalRef.current) {
              clearInterval(timerIntervalRef.current);
            }
            saveSession('completed');
            return 0;
          }
          return prev - 1;
        });
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [isTimerActive, isPaused]);

  const value = {
    subject,
    targetMinutes,
    secondsRemaining,
    isTimerActive,
    isPaused,
    elapsedSeconds,
    activeTrack,
    volume,
    playingTracks,
    trackVolumes,
    saveStatus,
    errorMessage,
    rewardDetails,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    setTargetMinutes: (mins: number) => {
      setTargetMinutes(mins);
      if (!isTimerActive) {
        setSecondsRemaining(mins * 60);
      }
    },
    setSecondsRemaining,
    setSubject,
    setActiveTrack: (t: string) => {},
    setVolume: (v: number) => {},
    setPlayingTracks,
    setTrackVolumes,
    saveSession,
    clearSaveStatus
  };

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
};

export const useTimer = () => {
  const context = useContext(TimerContext);
  if (context === undefined) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
};

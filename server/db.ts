import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, 'database.sqlite');

export let db: Database;

export async function initDb() {
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  console.log('SQLite Database connected at:', dbPath);

  // Enable foreign keys, WAL mode, and busy timeout
  await db.run('PRAGMA foreign_keys = ON');
  await db.run('PRAGMA journal_mode = WAL');
  await db.run('PRAGMA busy_timeout = 5000');

  // Create Users table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      avatar TEXT,
      daily_goal INTEGER DEFAULT 60,
      level INTEGER DEFAULT 1,
      exp INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    await db.exec("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'offline'");
    console.log("Added status column to users table.");
  } catch (e) {
    // Column already exists
  }

  try {
    await db.exec("ALTER TABLE users ADD COLUMN timeline_visibility TEXT DEFAULT 'friends'");
    console.log("Added timeline_visibility column to users table.");
  } catch (e) {
    // Column already exists
  }

  // Create Study Records table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS study_records (
      record_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      subject TEXT NOT NULL,
      duration INTEGER NOT NULL, -- in seconds
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      status TEXT NOT NULL, -- 'completed', 'cancelled', 'paused'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
    )
  `);

  // Create Study Groups table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS study_groups (
      group_id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_name TEXT NOT NULL,
      description TEXT,
      owner_id INTEGER NOT NULL,
      invite_code TEXT UNIQUE NOT NULL,
      daily_group_goal INTEGER DEFAULT 120, -- minutes
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES users (user_id) ON DELETE CASCADE
    )
  `);

  // Create Group Members table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS group_members (
      member_id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      role TEXT DEFAULT 'member', -- 'owner', 'member'
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES study_groups (group_id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
      UNIQUE(group_id, user_id)
    )
  `);

  // Create Friends table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS friends (
      friend_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      friend_user_id INTEGER NOT NULL,
      status TEXT DEFAULT 'pending', -- 'pending', 'accepted'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
      FOREIGN KEY (friend_user_id) REFERENCES users (user_id) ON DELETE CASCADE,
      UNIQUE(user_id, friend_user_id)
    )
  `);

  // Check if notifications migration is needed (presence of title column)
  try {
    await db.get("SELECT title FROM notifications LIMIT 1");
  } catch (e) {
    console.log("Migrating notifications table...");
    await db.exec("DROP TABLE IF EXISTS notifications");
  }

  // Create Notifications table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      notification_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      sender_id INTEGER,
      group_id INTEGER,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT DEFAULT 'unread', -- 'unread', 'read', 'processed'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
      FOREIGN KEY (sender_id) REFERENCES users (user_id) ON DELETE SET NULL,
      FOREIGN KEY (group_id) REFERENCES study_groups (group_id) ON DELETE CASCADE
    )
  `);

  // Create Group Todos table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS group_todos (
      todo_id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      todo_text TEXT NOT NULL,
      is_completed INTEGER DEFAULT 0, -- 0: incomplete, 1: completed
      target_date TEXT NOT NULL, -- YYYY-MM-DD
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (group_id) REFERENCES study_groups (group_id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
    )
  `);

  // Create Personal Todos table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS personal_todos (
      todo_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      todo_text TEXT NOT NULL,
      is_completed INTEGER DEFAULT 0, -- 0: incomplete, 1: completed
      target_date TEXT NOT NULL, -- YYYY-MM-DD
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
    )
  `);

  // Create Daily Checkins table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS daily_checkins (
      checkin_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      checkin_date TEXT NOT NULL, -- YYYY-MM-DD
      photo TEXT NOT NULL,         -- Base64 image data
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
      UNIQUE(user_id, checkin_date)
    )
  `);

  // Create Timeline Activities table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS timeline_activities (
      activity_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      activity_name TEXT NOT NULL,
      category TEXT NOT NULL,          -- 'study', 'class', 'homework', 'rest', 'entertainment', 'wasted'
      start_time DATETIME NOT NULL,
      end_time DATETIME NOT NULL,
      duration INTEGER NOT NULL,       -- in seconds
      note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
    )
  `);

  try {
    await db.exec("ALTER TABLE timeline_activities ADD COLUMN is_timer_generated INTEGER DEFAULT 0");
    console.log("Added is_timer_generated column to timeline_activities table.");
  } catch (e) {}

  try {
    await db.exec("ALTER TABLE timeline_activities ADD COLUMN is_edited INTEGER DEFAULT 0");
    console.log("Added is_edited column to timeline_activities table.");
  } catch (e) {}

  // Create Daily Reviews table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS daily_reviews (
      review_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      review_date TEXT NOT NULL,       -- YYYY-MM-DD
      rating INTEGER NOT NULL,         -- 1-5 stars
      reflection TEXT,
      ai_advice TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
      UNIQUE(user_id, review_date)
    )
  `);

  // Create Learning Reports table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS learning_reports (
      report_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      report_type TEXT NOT NULL, -- 'weekly', 'monthly'
      start_date TEXT NOT NULL,   -- YYYY-MM-DD
      end_date TEXT NOT NULL,     -- YYYY-MM-DD
      total_duration INTEGER DEFAULT 0,
      favorite_subject TEXT,
      wasted_duration INTEGER DEFAULT 0,
      streak_days INTEGER DEFAULT 0,
      goal_met_rate REAL DEFAULT 0.0,
      ai_summary TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
    )
  `);

  // Create Exams & Deadlines table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS exams_deadlines (
      item_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      group_id INTEGER,
      title TEXT NOT NULL,
      target_date TEXT NOT NULL, -- YYYY-MM-DD
      type TEXT DEFAULT 'exam', -- 'exam', 'homework', 'project', 'quiz'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
      FOREIGN KEY (group_id) REFERENCES study_groups (group_id) ON DELETE CASCADE
    )
  `);

  try {
    await db.exec("ALTER TABLE exams_deadlines ADD COLUMN group_id INTEGER REFERENCES study_groups(group_id) ON DELETE CASCADE");
    console.log("Added group_id column to exams_deadlines table.");
  } catch (e) {
    // Column already exists
  }

  // Create Study Plans table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS study_plans (
      plan_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      item_id INTEGER NOT NULL,
      plan_text TEXT NOT NULL, -- Markdown text generated by AI
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE,
      FOREIGN KEY (item_id) REFERENCES exams_deadlines (item_id) ON DELETE CASCADE
    )
  `);

  // Create Chat Messages table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      message_id INTEGER PRIMARY KEY AUTOINCREMENT,
      room_type TEXT NOT NULL,            -- 'group' | 'plaza'
      room_id INTEGER,                    -- group_id (NULL for plaza)
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (user_id) ON DELETE CASCADE
    )
  `);

  // Create Indexes
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_study_records_user ON study_records(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_group ON notifications(group_id);
    CREATE INDEX IF NOT EXISTS idx_timeline_activities_user ON timeline_activities(user_id);
    CREATE INDEX IF NOT EXISTS idx_exams_deadlines_group ON exams_deadlines(group_id);
    CREATE INDEX IF NOT EXISTS idx_group_todos_user_date ON group_todos(user_id, target_date);
  `);

  console.log('Database tables verified/created successfully.');

}

export async function getAutoStatusForUser(userId: number, currentStatus: string, dailyGoal: number): Promise<string> {
  try {
    // 1. Get current overlapping activity category today (in UTC comparison)
    const activeActivity = await db.get(`
      SELECT category FROM timeline_activities 
      WHERE user_id = ? 
        AND datetime('now') BETWEEN datetime(start_time) AND datetime(end_time)
      LIMIT 1
    `, [userId]);
    const currentCategory = activeActivity ? activeActivity.category : undefined;

    // 2. Get today's total study minutes (in local time match)
    const todayResult = await db.get(`
      SELECT SUM(duration) as total_duration 
      FROM study_records 
      WHERE user_id = ? AND status = 'completed' AND date(start_time, 'localtime') = date('now', 'localtime')
    `, [userId]);
    const todayMinutes = todayResult && todayResult.total_duration ? Math.round(todayResult.total_duration / 60) : 0;

    // 3. Compute status string
    if (currentStatus === 'studying') {
      if (currentCategory === 'study') return '📚 讀書中';
      if (currentCategory === 'class') return '🏫 上課中';
      if (currentCategory === 'homework') return '✏️ 寫作業中';
      return '📚 讀書中';
    }

    if (currentStatus === 'resting') {
      if (currentCategory === 'entertainment') return '🎮 娛樂中';
      return '☕ 休息中';
    }

    if (currentCategory) {
      if (currentCategory === 'study') return '📚 讀書中';
      if (currentCategory === 'class') return '🏫 上課中';
      if (currentCategory === 'homework') return '✏️ 寫作業中';
      if (currentCategory === 'rest') return '☕ 休息中';
      if (currentCategory === 'entertainment') return '🎮 娛樂中';
      if (currentCategory === 'wasted') return '📱 浪費時間中';
    }

    if (todayMinutes >= dailyGoal && dailyGoal > 0) {
      return '🏆 今日已完成目標';
    }

    const currentHour = new Date().getHours();
    if (currentHour >= 16 && todayMinutes < (dailyGoal * 0.5) && dailyGoal > 0) {
      return '⚠️ 今日進度落後';
    }

    return '離線';
  } catch (err) {
    console.error('Error calculating auto status for user:', userId, err);
    return currentStatus === 'offline' ? '離線' : currentStatus;
  }
}


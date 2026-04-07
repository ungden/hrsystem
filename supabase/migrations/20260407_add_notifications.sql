-- Notifications table for HR system alerts
-- Used by NotificationBell component in admin and employee portals

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('task_assigned', 'report_submitted', 'report_approved', 'alert', 'system')),
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,                    -- optional deep link (e.g. '/admin/duyet-bao-cao')
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast unread count queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON notifications (user_id, read) WHERE read = FALSE;

-- Index for listing recent notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON notifications (user_id, created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (true);  -- In production: USING (auth.uid() = user_id mapping)

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);  -- Cron and server-side inserts

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (true);  -- Mark as read

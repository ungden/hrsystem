CREATE TABLE ceo_todos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'general' CHECK (category IN ('strategy','people','finance','operations','general')),
  is_urgent BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo','done')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Enable RLS
ALTER TABLE ceo_todos ENABLE ROW LEVEL SECURITY;

-- Permissive policy (small company, CEO-only table)
CREATE POLICY "Allow all access to ceo_todos" ON ceo_todos FOR ALL USING (true) WITH CHECK (true);

-- Index for listing active todos
CREATE INDEX idx_ceo_todos_status ON ceo_todos (status, is_urgent DESC, created_at DESC);

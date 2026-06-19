-- 建表：knowledge_items
CREATE TABLE IF NOT EXISTS knowledge_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  source TEXT,
  source_url TEXT,
  content TEXT,
  tags JSONB DEFAULT '[]',
  industry TEXT,
  weight FLOAT DEFAULT 0.7,
  status TEXT DEFAULT 'ACTIVE',
  knowledge_type TEXT DEFAULT 'general',
  scenario TEXT,
  customer_voice TEXT,
  response_example TEXT,
  psychology_tags TEXT[],
  language TEXT DEFAULT 'zh',
  success_count INT DEFAULT 0,
  use_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_knowledge_user ON knowledge_items(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_industry ON knowledge_items(industry);
CREATE INDEX IF NOT EXISTS idx_knowledge_type ON knowledge_items(knowledge_type);
CREATE INDEX IF NOT EXISTS idx_knowledge_status ON knowledge_items(status);

-- RLS（如果 policy 已存在会报错，可以忽略）
ALTER TABLE knowledge_items ENABLE ROW LEVEL SECURITY;

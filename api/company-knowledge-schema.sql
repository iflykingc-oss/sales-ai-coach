-- 公司专属知识表（租户隔离）
-- 合规说明：user_id 实现数据隔离，每个用户只能访问自己的数据

CREATE TABLE IF NOT EXISTS company_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL DEFAULT 'general',
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_company_knowledge_user_id ON company_knowledge(user_id);
CREATE INDEX IF NOT EXISTS idx_company_knowledge_category ON company_knowledge(category);

-- RLS 策略：严格租户隔离
ALTER TABLE company_knowledge ENABLE ROW LEVEL SECURITY;

-- 只有创建者能查看自己的知识
CREATE POLICY "Users can view own knowledge" ON company_knowledge
  FOR SELECT USING (auth.uid()::text = user_id);

-- 只有创建者能插入自己的知识
CREATE POLICY "Users can insert own knowledge" ON company_knowledge
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- 只有创建者能更新自己的知识
CREATE POLICY "Users can update own knowledge" ON company_knowledge
  FOR UPDATE USING (auth.uid()::text = user_id);

-- 只有创建者能删除自己的知识
CREATE POLICY "Users can delete own knowledge" ON company_knowledge
  FOR DELETE USING (auth.uid()::text = user_id);

-- 管理员也无法访问其他用户的数据（盲视设计）
-- 如需管理员权限，需通过独立的 service_role key 绕过 RLS

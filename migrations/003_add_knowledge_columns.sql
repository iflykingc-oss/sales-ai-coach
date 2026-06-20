-- 给 knowledge_items 表加新列
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS source_url TEXT;
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'zh';

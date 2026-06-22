-- Migration 005: Knowledge usage tracking + dynamic weight + style
-- Execute this in Supabase SQL Editor

-- 1. Knowledge usage tracking table
CREATE TABLE IF NOT EXISTS knowledge_usage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  knowledge_id TEXT NOT NULL,
  user_id TEXT,
  action TEXT NOT NULL,
  context TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_knowledge ON knowledge_usage_logs(knowledge_id);
CREATE INDEX IF NOT EXISTS idx_usage_action ON knowledge_usage_logs(action);
CREATE INDEX IF NOT EXISTS idx_usage_created ON knowledge_usage_logs(created_at DESC);

-- 2. RPC: log knowledge usage
CREATE OR REPLACE FUNCTION log_knowledge_usage(
  p_knowledge_id TEXT,
  p_user_id TEXT,
  p_action TEXT,
  p_context TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO knowledge_usage_logs (knowledge_id, user_id, action, context)
  VALUES (p_knowledge_id, p_user_id, p_action, p_context);
END;
$$;

-- 3. RPC: calculate dynamic weight
CREATE OR REPLACE FUNCTION calc_knowledge_weight(p_knowledge_id TEXT)
RETURNS FLOAT
LANGUAGE plpgsql
AS $$
DECLARE
  base_weight FLOAT;
  usage_count INT;
  up_count INT;
  down_count INT;
  days_since FLOAT;
  usage_factor FLOAT;
  feedback_factor FLOAT;
  time_factor FLOAT;
BEGIN
  SELECT COALESCE(weight, 0.7) INTO base_weight FROM knowledge_items WHERE id = p_knowledge_id;
  SELECT COUNT(*) INTO usage_count FROM knowledge_usage_logs WHERE knowledge_id = p_knowledge_id AND action IN ('script_ref', 'practice_ref');
  SELECT COUNT(*) FILTER (WHERE action = 'feedback_up'), COUNT(*) FILTER (WHERE action = 'feedback_down') INTO up_count, down_count FROM knowledge_usage_logs WHERE knowledge_id = p_knowledge_id;
  SELECT EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400 INTO days_since FROM knowledge_items WHERE id = p_knowledge_id;

  usage_factor := LEAST(1.0 + usage_count * 0.1, 2.0);
  feedback_factor := GREATEST(0.1, 1.0 + up_count * 0.2 - down_count * 0.3);
  time_factor := CASE WHEN days_since <= 30 THEN 1.0 WHEN days_since <= 90 THEN 0.9 WHEN days_since <= 180 THEN 0.8 ELSE 0.7 END;

  RETURN GREATEST(0.1, LEAST(10.0, base_weight * usage_factor * feedback_factor * time_factor));
END;
$$;

-- 4. RPC: batch refresh weights
CREATE OR REPLACE FUNCTION refresh_knowledge_weights()
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE item RECORD; updated INT := 0;
BEGIN
  FOR item IN SELECT id FROM knowledge_items WHERE status = 'ACTIVE'
  LOOP
    UPDATE knowledge_items SET weight = calc_knowledge_weight(item.id) WHERE id = item.id;
    updated := updated + 1;
  END LOOP;
  RETURN updated;
END;
$$;

-- 5. Add style column
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS style TEXT DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_knowledge_style ON knowledge_items(style);

-- 6. Update search_knowledge RPC with style
DROP FUNCTION IF EXISTS search_knowledge(TEXT, INT, TEXT, UUID);
CREATE OR REPLACE FUNCTION search_knowledge(
  search_text TEXT,
  match_count INT DEFAULT 30,
  filter_industry TEXT DEFAULT NULL,
  filter_user_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  id TEXT, content TEXT, source TEXT, source_url TEXT,
  industry TEXT, knowledge_type TEXT, style TEXT, tags JSONB,
  weight FLOAT, response_example TEXT, scenario TEXT,
  customer_voice TEXT, psychology_tags TEXT[],
  trigram_score FLOAT, fts_rank FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ki.id, ki.content, ki.source, ki.source_url,
    ki.industry, ki.knowledge_type, ki.style, ki.tags, ki.weight,
    ki.response_example, ki.scenario, ki.customer_voice, ki.psychology_tags,
    similarity(ki.content, search_text) AS trigram_score,
    COALESCE(ts_rank(ki.content_tsv, plainto_tsquery('simple', search_text)), 0) AS fts_rank
  FROM knowledge_items ki
  WHERE ki.status = 'ACTIVE'
    AND ki.content IS NOT NULL
    AND (
      similarity(ki.content, search_text) > 0.05
      OR (ki.content_tsv @@ plainto_tsquery('simple', search_text))
      OR ki.industry = filter_industry
    )
    AND (filter_industry IS NULL OR ki.industry = filter_industry OR ki.industry = '通用')
    AND (filter_user_id IS NULL OR ki.user_id = filter_user_id OR ki.user_id IS NULL)
  ORDER BY
    (similarity(ki.content, search_text) * 0.4
     + COALESCE(ts_rank(ki.content_tsv, plainto_tsquery('simple', search_text)), 0) * 0.3
     + ki.weight * 0.3) DESC
  LIMIT match_count;
END;
$$;

-- Migration 006: Unified retrieval with industry boost + feedback boost
-- Execute this in Supabase SQL Editor

-- 更新 search_knowledge RPC：行业匹配 boost + 权重 boost
DROP FUNCTION IF EXISTS search_knowledge(TEXT, INT, TEXT, TEXT);
CREATE OR REPLACE FUNCTION search_knowledge(
  search_text TEXT,
  match_count INT DEFAULT 30,
  filter_industry TEXT DEFAULT NULL,
  filter_user_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  id TEXT,
  content TEXT,
  source TEXT,
  source_url TEXT,
  industry TEXT,
  knowledge_type TEXT,
  style TEXT,
  tags JSONB,
  weight FLOAT,
  response_example TEXT,
  scenario TEXT,
  customer_voice TEXT,
  psychology_tags TEXT[],
  trigram_score FLOAT,
  fts_rank FLOAT,
  final_score FLOAT
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
    COALESCE(ts_rank(ki.content_tsv, plainto_tsquery('simple', search_text)), 0) AS fts_rank,
    -- 综合得分 = trigram * 0.3 + fts * 0.2 + weight * 0.2 + industry_boost * 0.2 + source_boost * 0.1
    (
      similarity(ki.content, search_text) * 0.3
      + COALESCE(ts_rank(ki.content_tsv, plainto_tsquery('simple', search_text)), 0) * 0.2
      + LEAST(ki.weight / 5.0, 1.0) * 0.2
      + CASE
          WHEN filter_industry IS NOT NULL AND ki.industry = filter_industry THEN 1.0
          WHEN ki.industry = '通用' THEN 0.5
          ELSE 0.0
        END * 0.2
      + CASE
          WHEN ki.source = 'industry_config' THEN 0.8  -- 行业配置优先
          WHEN ki.source LIKE 'AI%' THEN 0.6           -- AI 生成次之
          WHEN ki.source LIKE 'script:%' THEN 0.5      -- 用户反馈再次
          ELSE 0.3                                      -- 爬取数据最低
        END * 0.1
    ) AS final_score
  FROM knowledge_items ki
  WHERE ki.status = 'ACTIVE'
    AND ki.content IS NOT NULL
    AND (
      similarity(ki.content, search_text) > 0.03
      OR (ki.content_tsv @@ plainto_tsquery('simple', search_text))
      OR ki.industry = filter_industry
      OR ki.industry = '通用'
    )
    AND (filter_industry IS NULL OR ki.industry = filter_industry OR ki.industry = '通用')
    AND (filter_user_id IS NULL OR ki.user_id = filter_user_id OR ki.user_id IS NULL)
  ORDER BY final_score DESC
  LIMIT match_count;
END;
$$;

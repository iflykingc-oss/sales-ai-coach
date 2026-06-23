-- Migration 004: Hybrid knowledge retrieval (keyword + trigram + full-text)
-- Execute this in Supabase SQL Editor

-- 1. Enable pg_trgm for fuzzy text matching
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. GIN index on content for trigram similarity search
CREATE INDEX IF NOT EXISTS idx_knowledge_content_trgm
  ON knowledge_items USING gin (content gin_trgm_ops);

-- 3. Add tsvector column for full-text search
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS content_tsv TSVECTOR;

-- 4. GIN index on tsvector
CREATE INDEX IF NOT EXISTS idx_knowledge_content_tsv
  ON knowledge_items USING gin (content_tsv);

-- 5. Trigger to auto-update tsvector on insert/update
CREATE OR REPLACE FUNCTION knowledge_items_tsv_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.content_tsv := to_tsvector('simple', COALESCE(NEW.content, '') || ' ' || COALESCE(NEW.industry, '') || ' ' || COALESCE(NEW.knowledge_type, ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tsvector_update ON knowledge_items;
CREATE TRIGGER tsvector_update
  BEFORE INSERT OR UPDATE ON knowledge_items
  FOR EACH ROW EXECUTE FUNCTION knowledge_items_tsv_trigger();

-- 6. Composite index for common filter patterns
CREATE INDEX IF NOT EXISTS idx_knowledge_status_industry
  ON knowledge_items (status, industry, weight DESC);

-- 7. Update existing rows' tsvector
UPDATE knowledge_items SET content_tsv = to_tsvector('simple', COALESCE(content, '') || ' ' || COALESCE(industry, '') || ' ' || COALESCE(knowledge_type, ''))
WHERE content_tsv IS NULL;

-- 8. Coarse retrieval RPC: trigram + full-text + metadata filters
CREATE OR REPLACE FUNCTION search_knowledge(
  search_text TEXT,
  match_count INT DEFAULT 30,
  filter_industry TEXT DEFAULT NULL,
  filter_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  source TEXT,
  source_url TEXT,
  industry TEXT,
  knowledge_type TEXT,
  tags JSONB,
  weight FLOAT,
  response_example TEXT,
  scenario TEXT,
  customer_voice TEXT,
  psychology_tags TEXT[],
  trigram_score FLOAT,
  fts_rank FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ki.id, ki.content, ki.source, ki.source_url,
    ki.industry, ki.knowledge_type, ki.tags, ki.weight,
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

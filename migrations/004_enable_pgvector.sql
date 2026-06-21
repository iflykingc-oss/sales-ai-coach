-- Migration 004: Enable pgvector for RAG knowledge retrieval
-- Execute this in Supabase SQL Editor

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add embedding column to knowledge_items
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS embedding VECTOR(1536);

-- 3. Create HNSW index for fast similarity search
CREATE INDEX IF NOT EXISTS idx_knowledge_embedding
  ON knowledge_items USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 4. Semantic match RPC function
CREATE OR REPLACE FUNCTION match_knowledge(
  query_embedding VECTOR(1536),
  match_count INT DEFAULT 10,
  match_threshold FLOAT DEFAULT 0.3,
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
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ki.id, ki.content, ki.source, ki.source_url,
    ki.industry, ki.knowledge_type, ki.tags, ki.weight,
    ki.response_example, ki.scenario, ki.customer_voice, ki.psychology_tags,
    1 - (ki.embedding <=> query_embedding) AS similarity
  FROM knowledge_items ki
  WHERE ki.status = 'ACTIVE'
    AND ki.embedding IS NOT NULL
    AND (1 - (ki.embedding <=> query_embedding)) > match_threshold
    AND (filter_industry IS NULL OR ki.industry = filter_industry OR ki.industry = '通用')
    AND (filter_user_id IS NULL OR ki.user_id = filter_user_id OR ki.user_id IS NULL)
  ORDER BY ki.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

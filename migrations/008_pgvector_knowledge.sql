-- Migration 008: pgvector support for efficient knowledge similarity search
-- Execute this in Supabase SQL Editor
-- Depends on: 004_enable_pgvector.sql (pg_trgm already enabled)

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add embedding column to knowledge_items (1024 dims for DashScope text-embedding-v3)
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS embedding vector(1024);

-- 3. IVFFlat index for approximate nearest neighbor search
--    lists=100 is good for ~10K-100K rows; increase for larger datasets
CREATE INDEX IF NOT EXISTS idx_knowledge_embedding
  ON knowledge_items USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- 4. Vector similarity search RPC: cosine distance with metadata filters
--    Returns items ordered by vector similarity, filtered by user/industry/status.
--    The embedding parameter should be a JSON array of floats (pgvector literal).
CREATE OR REPLACE FUNCTION search_knowledge_vector(
  query_embedding VECTOR(1024),
  match_user_id TEXT,
  match_count INT DEFAULT 10,
  filter_industry TEXT DEFAULT NULL,
  similarity_threshold FLOAT DEFAULT 0.3
)
RETURNS TABLE (
  id TEXT,
  content TEXT,
  source TEXT,
  industry TEXT,
  tags TEXT[],
  weight FLOAT,
  status TEXT,
  created_at TIMESTAMPTZ,
  similarity_score FLOAT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ki.id,
    ki.content,
    ki.source,
    ki.industry,
    ki.tags,
    ki.weight,
    ki.status::TEXT,
    ki.created_at,
    (1 - (ki.embedding <=> query_embedding))::FLOAT AS similarity_score
  FROM knowledge_items ki
  WHERE ki.user_id = match_user_id
    AND ki.status = 'ACTIVE'
    AND ki.embedding IS NOT NULL
    AND (filter_industry IS NULL OR ki.industry = filter_industry OR ki.industry IS NULL)
    AND (1 - (ki.embedding <=> query_embedding)) >= similarity_threshold
  ORDER BY ki.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 5. Hybrid search RPC: combines vector similarity with text search scores
--    Useful when some items may not have embeddings yet
CREATE OR REPLACE FUNCTION search_knowledge_hybrid(
  search_text TEXT,
  query_embedding VECTOR(1024) DEFAULT NULL,
  match_user_id TEXT DEFAULT NULL,
  match_count INT DEFAULT 10,
  filter_industry TEXT DEFAULT NULL
)
RETURNS TABLE (
  id TEXT,
  content TEXT,
  source TEXT,
  industry TEXT,
  tags TEXT[],
  weight FLOAT,
  final_score FLOAT
)
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ki.id,
    ki.content,
    ki.source,
    ki.industry,
    ki.tags,
    ki.weight,
    (
      -- Vector similarity (if embedding available and query embedding provided)
      CASE
        WHEN query_embedding IS NOT NULL AND ki.embedding IS NOT NULL
          THEN (1 - (ki.embedding <=> query_embedding)) * 0.6
        ELSE 0
      END
      -- Trigram text similarity
      + similarity(ki.content, search_text) * 0.25
      -- Weight boost
      + LEAST(ki.weight / 5.0, 1.0) * 0.15
    )::FLOAT AS final_score
  FROM knowledge_items ki
  WHERE ki.status = 'ACTIVE'
    AND ki.content IS NOT NULL
    AND (match_user_id IS NULL OR ki.user_id = match_user_id)
    AND (filter_industry IS NULL OR ki.industry = filter_industry OR ki.industry IS NULL)
    AND (
      (query_embedding IS NOT NULL AND ki.embedding IS NOT NULL)
      OR similarity(ki.content, search_text) > 0.03
    )
  ORDER BY final_score DESC
  LIMIT match_count;
END;
$$;

-- Migration 004: Enable pgvector + Supabase AI for RAG
-- Execute this in Supabase SQL Editor

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Enable Supabase AI (gte-small embedding model)
CREATE EXTENSION IF NOT EXISTS supabase_ai;

-- 3. Add embedding column (384 dimensions for gte-small)
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS embedding VECTOR(384);

-- 4. Create HNSW index for fast similarity search
CREATE INDEX IF NOT EXISTS idx_knowledge_embedding
  ON knowledge_items USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- 5. RPC: generate embedding for a single text
CREATE OR REPLACE FUNCTION generate_embedding(input_text TEXT)
RETURNS VECTOR(384)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN supabase_ai.embed(input_text, 384);
END;
$$;

-- 6. RPC: semantic search
CREATE OR REPLACE FUNCTION match_knowledge(
  query_embedding VECTOR(384),
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

-- 7. RPC: batch generate embeddings for items without embedding
CREATE OR REPLACE FUNCTION backfill_embeddings(batch_size INT DEFAULT 50)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  item RECORD;
  updated_count INT := 0;
BEGIN
  FOR item IN
    SELECT id, content, industry, knowledge_type, source
    FROM knowledge_items
    WHERE embedding IS NULL
      AND status = 'ACTIVE'
    ORDER BY created_at DESC
    LIMIT batch_size
  LOOP
    -- Enhanced text: prepend metadata for better Chinese semantic quality
    DECLARE
      enhanced_text TEXT;
    BEGIN
      enhanced_text := COALESCE(item.industry, '') || ' ' ||
                       COALESCE(item.knowledge_type, '') || ' ' ||
                       COALESCE(item.source, '') || ' ' ||
                       COALESCE(item.content, '');
      UPDATE knowledge_items
      SET embedding = supabase_ai.embed(enhanced_text, 384)
      WHERE id = item.id;
      updated_count := updated_count + 1;
    END;
  END LOOP;
  RETURN updated_count;
END;
$$;

-- Migration 001: Add radar_scores and dimension tracking
-- Run this in Supabase SQL Editor

-- practice_sessions: add dimension scores
ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS radar_scores JSONB DEFAULT '{}';
ALTER TABLE practice_sessions ADD COLUMN IF NOT EXISTS dimension_scores JSONB DEFAULT '{}';

-- review_reports: add scores
ALTER TABLE review_reports ADD COLUMN IF NOT EXISTS radar_scores JSONB DEFAULT '{}';
ALTER TABLE review_reports ADD COLUMN IF NOT EXISTS overall_score FLOAT DEFAULT 0;

-- knowledge_items: add structured fields for RAG
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS knowledge_type TEXT DEFAULT 'general';
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS scenario TEXT;
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS sales_channel TEXT;
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS b2_type TEXT;
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS customer_voice TEXT;
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS response_example TEXT;
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS psychology_tags TEXT[];
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS success_count INT DEFAULT 0;
ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS use_count INT DEFAULT 0;

-- Note: embedding column requires pgvector extension
-- ALTER TABLE knowledge_items ADD COLUMN IF NOT EXISTS embedding VECTOR(1536);
-- CREATE INDEX IF NOT EXISTS idx_knowledge_embedding ON knowledge_items USING ivfflat (embedding vector_cosine_ops);

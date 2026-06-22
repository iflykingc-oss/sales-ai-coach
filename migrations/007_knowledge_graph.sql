-- Migration 007: Knowledge Graph for sales coaching
-- Execute this in Supabase SQL Editor

-- 1. 节点表
CREATE TABLE IF NOT EXISTS kg_nodes (
  id TEXT PRIMARY KEY,
  node_type TEXT NOT NULL, -- industry/objection/strategy/persona/stage/knowledge
  name TEXT NOT NULL,
  description TEXT,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nodes_type ON kg_nodes(node_type);
CREATE INDEX IF NOT EXISTS idx_nodes_name ON kg_nodes(name);

-- 2. 边表（关系）
CREATE TABLE IF NOT EXISTS kg_edges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id TEXT NOT NULL,
  target_id TEXT NOT NULL,
  edge_type TEXT NOT NULL,
  weight FLOAT DEFAULT 1.0,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_edges_source ON kg_edges(source_id);
CREATE INDEX IF NOT EXISTS idx_edges_target ON kg_edges(target_id);
CREATE INDEX IF NOT EXISTS idx_edges_type ON kg_edges(edge_type);
CREATE INDEX IF NOT EXISTS idx_edges_source_type ON kg_edges(source_id, edge_type);

-- 3. 反馈日志表
CREATE TABLE IF NOT EXISTS kg_feedback_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  edge_id UUID REFERENCES kg_edges(id),
  knowledge_id TEXT,
  user_id TEXT,
  feedback_type TEXT NOT NULL, -- 'up', 'down', 'copy', 'regenerate'
  context JSONB DEFAULT '{}', -- {"scenario": "...", "industry": "..."}
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_edge ON kg_feedback_log(edge_id);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON kg_feedback_log(feedback_type);

-- 4. 图谱检索 RPC：从行业+异议出发，找到最优策略
CREATE OR REPLACE FUNCTION kg_search(
  p_industry TEXT,
  p_objection TEXT,
  p_persona TEXT DEFAULT NULL,
  match_count INT DEFAULT 5
)
RETURNS TABLE (
  strategy_id TEXT,
  strategy_name TEXT,
  strategy_description TEXT,
  effectiveness FLOAT,
  knowledge_content TEXT,
  knowledge_id TEXT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH
  industry_node AS (
    SELECT id FROM kg_nodes
    WHERE node_type = 'industry' AND name = p_industry
    LIMIT 1
  ),
  objection_node AS (
    SELECT id FROM kg_nodes
    WHERE node_type = 'objection' AND name ILIKE '%' || p_objection || '%'
    LIMIT 1
  ),
  matched_strategies AS (
    SELECT
      s.id AS sid,
      s.name AS sname,
      s.description AS sdesc,
      -- 行业有效性
      COALESCE(e_ind.weight, 0.5) AS ind_score,
      -- 异议匹配度
      COALESCE(e_obj.weight, 0.5) AS obj_score,
      -- 角色适配度（可选）
      COALESCE(
        (SELECT e_p.weight FROM kg_edges e_p
         WHERE e_p.source_id = s.id AND e_p.edge_type = 'works_for'
         AND (p_persona IS NULL OR e_p.properties->>'persona' = p_persona)
         LIMIT 1),
        0.5
      ) AS persona_score,
      -- 综合得分
      (
        COALESCE(e_ind.weight, 0.5) * 0.35
        + COALESCE(e_obj.weight, 0.5) * 0.40
        + COALESCE(
            (SELECT e_p.weight FROM kg_edges e_p
             WHERE e_p.source_id = s.id AND e_p.edge_type = 'works_for'
             AND (p_persona IS NULL OR e_p.properties->>'persona' = p_persona)
             LIMIT 1),
            0.5
          ) * 0.25
      ) AS total_score
    FROM industry_node i
    CROSS JOIN objection_node o
    -- 行业 → 策略
    JOIN kg_edges e_ind ON e_ind.source_id = i.id
      AND e_ind.edge_type = 'effective_in'
    JOIN kg_nodes s ON s.id = e_ind.target_id
      AND s.node_type = 'strategy'
    -- 策略 → 异议
    JOIN kg_edges e_obj ON e_obj.source_id = s.id
      AND e_obj.target_id = o.id
      AND e_obj.edge_type = 'has_strategy'
  )
  SELECT
    ms.sid,
    ms.sname,
    ms.sdesc,
    ms.total_score,
    ki.content,
    ki.id
  FROM matched_strategies ms
  LEFT JOIN kg_edges e_k ON e_k.source_id = ms.sid AND e_k.edge_type = 'has_content'
  LEFT JOIN knowledge_items ki ON ki.id = e_k.target_id
  ORDER BY ms.total_score DESC
  LIMIT match_count;
END;
$$;

-- 5. 更新边权重的 RPC
CREATE OR REPLACE FUNCTION kg_update_edge_weight(
  p_edge_id UUID,
  p_delta FLOAT
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE kg_edges
  SET weight = GREATEST(0.1, LEAST(2.0, weight + p_delta)),
      updated_at = NOW()
  WHERE id = p_edge_id;
END;
$$;

-- 6. 记录反馈的 RPC
CREATE OR REPLACE FUNCTION kg_log_feedback(
  p_edge_id UUID,
  p_knowledge_id TEXT,
  p_user_id TEXT,
  p_feedback_type TEXT,
  p_context JSONB DEFAULT '{}'
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO kg_feedback_log (edge_id, knowledge_id, user_id, feedback_type, context)
  VALUES (p_edge_id, p_knowledge_id, p_user_id, p_feedback_type, p_context);

  -- 根据反馈类型更新权重
  IF p_feedback_type = 'up' THEN
    PERFORM kg_update_edge_weight(p_edge_id, 0.05);
  ELSIF p_feedback_type = 'down' THEN
    PERFORM kg_update_edge_weight(p_edge_id, -0.10);
  ELSIF p_feedback_type = 'copy' THEN
    PERFORM kg_update_edge_weight(p_edge_id, 0.02);
  END IF;
END;
$$;

/**
 * 行业配置 → 知识图谱
 *
 * 把 industry-context.js 中的数据转为 kg_nodes + kg_edges
 *
 * 用法：node scripts/seed-knowledge-graph.js
 */

const crypto = require('crypto');
const registry = require('../api/industry-context');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://doqcopkqbfpstuavfjsa.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sbUpsert(table, data, conflictColumn) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(data),
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`SB upsert ${table}: ${resp.status} ${err.slice(0, 100)}`);
  }
}

async function sbQuery(table, params) {
  const url = new URL(`${SUPABASE_URL}/rest/v1/${table}`);
  url.searchParams.set('select', params.select || '*');
  if (params.eq) Object.entries(params.eq).forEach(([k, v]) => url.searchParams.set(k, `eq.${v}`));
  if (params.limit) url.searchParams.set('limit', params.limit.toString());
  const resp = await fetch(url, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
  });
  if (!resp.ok) return [];
  return resp.json();
}

// 异议类型标准化映射
const OBJECTION_MAP = {
  '太贵了': '价格异议',
  '价格贵': '价格异议',
  '太贵': '价格异议',
  '价格太高': '价格异议',
  '价格高': '价格异议',
  '利润低': '利润异议',
  '要对比': '竞品对比',
  '要和领导商量': '决策权异议',
  '要和家人商量': '决策权异议',
  '犹豫不决': '犹豫拖延',
  '再看看': '犹豫拖延',
  '要考虑': '犹豫拖延',
  '不需要': '需求异议',
  '不需要了': '需求异议',
  '没时间': '时间异议',
  '怕亏本': '风险顾虑',
  '怕跌': '风险顾虑',
  '风险高': '风险顾虑',
  '不信任': '信任异议',
  '效果不好': '效果顾虑',
  '怕没效果': '效果顾虑',
  '用不起来': '使用顾虑',
  '功能不够': '功能顾虑',
  '数据安全': '安全顾虑',
  '已有系统': '迁移顾虑',
  '已有供应商': '迁移顾虑',
  '自己能处理': '自力更生',
  '之前被骗过': '历史创伤',
  '之前失败过': '历史创伤',
  '品牌不知名': '品牌顾虑',
  '身体很好不需要': '认知偏差',
  '我老公不同意': '决策权异议',
  '首付不够': '资金顾虑',
  '审批难': '流程顾虑',
  '太复杂': '复杂度顾虑',
  '卖不动': '动销顾虑',
  '不如XX品牌': '竞品对比',
  '等新款': '时机顾虑',
  '落不了地': '执行顾虑',
};

// 角色推断（从上下文推断，不从人口统计学假设）
function inferPersona(input) {
  if (!input) return null;
  const text = input.toLowerCase();
  if (text.includes('企业主') || text.includes('老板') || text.includes('创始人')) return '企业主';
  if (text.includes('高管') || text.includes('总监') || text.includes('vp')) return '高管';
  if (text.includes('有小孩') || text.includes('有孩子') || text.includes('宝妈')) return '有孩家长';
  if (text.includes('预算有限') || text.includes('预算少') || text.includes('钱不多')) return '预算敏感型';
  if (text.includes('首次') || text.includes('第一次') || text.includes('新手')) return '首次购买者';
  if (text.includes('老客户') || text.includes('续费') || text.includes('复购')) return '老客户';
  return null;
}

async function main() {
  if (!SUPABASE_KEY) {
    console.error('Error: SUPABASE_SERVICE_ROLE_KEY not set');
    process.exit(1);
  }

  console.log('=== Building Knowledge Graph ===\n');

  const industries = registry.getRegisteredIndustries();
  console.log(`Found ${industries.length} industries\n`);

  let nodeCount = 0;
  let edgeCount = 0;

  for (const industryName of industries) {
    const ctx = registry.getContext(industryName);
    if (!ctx) continue;

    // 1. 创建行业节点
    const industryId = `industry:${industryName}`;
    await sbUpsert('kg_nodes', {
      id: industryId,
      node_type: 'industry',
      name: industryName,
      description: ctx.role,
      properties: { keywords: ctx.keywords, colloquialPhrases: ctx.colloquialPhrases },
    });
    nodeCount++;

    // 2. 创建痛点节点 + 边
    for (const pain of (ctx.painPoints || [])) {
      const painId = `pain:${industryName}:${pain}`;
      await sbUpsert('kg_nodes', {
        id: painId,
        node_type: 'pain_point',
        name: pain,
        description: `${industryName}行业客户痛点`,
      });
      nodeCount++;

      await sbUpsert('kg_edges', {
        id: crypto.randomUUID(),
        source_id: industryId,
        target_id: painId,
        edge_type: 'has_pain',
        weight: 1.0,
      });
      edgeCount++;
    }

    // 3. 创建异议节点 + 策略节点 + 边
    for (const [objection, strategy] of Object.entries(ctx.objectionHandling || {})) {
      // 标准化异议名称
      const standardObjection = OBJECTION_MAP[objection] || objection;
      const objectionId = `objection:${standardObjection}`;

      // 异议节点（全局共享）
      await sbUpsert('kg_nodes', {
        id: objectionId,
        node_type: 'objection',
        name: standardObjection,
        description: `客户常见异议：${objection}`,
      });
      nodeCount++;

      // 行业 → 异议
      const industryObjectionEdgeId = crypto.randomUUID();
      await sbUpsert('kg_edges', {
        id: industryObjectionEdgeId,
        source_id: industryId,
        target_id: objectionId,
        edge_type: 'has_objection',
        weight: 1.0,
        properties: { original: objection },
      });
      edgeCount++;

      // 策略节点
      const strategyId = `strategy:${industryName}:${standardObjection}:${strategy.slice(0, 20)}`;
      await sbUpsert('kg_nodes', {
        id: strategyId,
        node_type: 'strategy',
        name: `${industryName}-${standardObjection}策略`,
        description: strategy.slice(0, 300),
        properties: { full_text: strategy },
      });
      nodeCount++;

      // 策略 → 异议（策略解决异议）
      await sbUpsert('kg_edges', {
        id: crypto.randomUUID(),
        source_id: strategyId,
        target_id: objectionId,
        edge_type: 'has_strategy',
        weight: 1.0,
      });
      edgeCount++;

      // 行业 → 策略（策略在该行业有效）
      await sbUpsert('kg_edges', {
        id: crypto.randomUUID(),
        source_id: industryId,
        target_id: strategyId,
        edge_type: 'effective_in',
        weight: 1.0,
      });
      edgeCount++;

      // 策略 → 知识条目（如果知识库中有相关条目）
      const relatedKnowledge = await sbQuery('knowledge_items', {
        select: 'id',
        eq: { industry: industryName, knowledge_type: 'objection_handling' },
        limit: 3,
      });
      for (const k of relatedKnowledge) {
        await sbUpsert('kg_edges', {
          id: crypto.randomUUID(),
          source_id: strategyId,
          target_id: k.id,
          edge_type: 'has_content',
          weight: 1.0,
        });
        edgeCount++;
      }
    }

    // 4. 创建成交技巧节点 + 边
    for (const technique of (ctx.closingTechniques || [])) {
      const techId = `closing:${industryName}:${technique}`;
      await sbUpsert('kg_nodes', {
        id: techId,
        node_type: 'closing_technique',
        name: technique,
        description: `${industryName}行业成交技巧`,
      });
      nodeCount++;

      await sbUpsert('kg_edges', {
        id: crypto.randomUUID(),
        source_id: industryId,
        target_id: techId,
        edge_type: 'has_closing',
        weight: 1.0,
      });
      edgeCount++;
    }

    // 5. 创建价值主张节点 + 边
    for (const prop of (ctx.valueProps || [])) {
      const propId = `value:${industryName}:${prop}`;
      await sbUpsert('kg_nodes', {
        id: propId,
        node_type: 'value_prop',
        name: prop,
        description: `${industryName}行业价值主张`,
      });
      nodeCount++;

      await sbUpsert('kg_edges', {
        id: crypto.randomUUID(),
        source_id: industryId,
        target_id: propId,
        edge_type: 'has_value',
        weight: 1.0,
      });
      edgeCount++;
    }

    console.log(`  ${industryName}: done`);
  }

  console.log(`\n=== DONE ===`);
  console.log(`Nodes: ${nodeCount}`);
  console.log(`Edges: ${edgeCount}`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });

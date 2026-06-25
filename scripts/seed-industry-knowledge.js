/**
 * 行业配置 → 知识入库
 *
 * 把 industry-context.js 中的 objectionHandling/sampleData/closingTechniques
 * 转为 knowledge_items 记录，进入统一检索系统。
 *
 * 用法：node scripts/seed-industry-knowledge.js
 */

const crypto = require('crypto');
const registry = require('../api/industry-context');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

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

async function sbInsert(table, data) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify(data),
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`SB insert failed: ${resp.status} ${err.slice(0, 100)}`);
  }
}

// 检测 style
function detectStyle(content) {
  const text = (content || '').toLowerCase();
  if (text.includes('共情') || text.includes('理解您') || text.includes('我理解')) return 'empathetic';
  if (text.includes('直接') || text.includes('算账') || text.includes('数据')) return 'direct';
  if (text.includes('专业') || text.includes('方案') || text.includes('分析')) return 'professional';
  if (text.includes('逼单') || text.includes('促成') || text.includes('紧迫')) return 'aggressive';
  return null;
}

async function main() {
  if (!SUPABASE_KEY) {
    console.error('Error: SUPABASE_SERVICE_ROLE_KEY not set');
    process.exit(1);
  }

  console.log('=== Industry Config → Knowledge Items ===');

  const industries = registry.getRegisteredIndustries();
  console.log(`Found ${industries.length} industries`);

  // 检查已有的行业配置知识
  const existing = await sbQuery('knowledge_items', {
    select: 'id',
    eq: { source: 'industry_config' },
    limit: 1000,
  });
  console.log(`Existing industry_config items: ${existing.length}`);

  let inserted = 0;
  let skipped = 0;

  for (const industryName of industries) {
    const ctx = registry.getContext(industryName);
    if (!ctx) continue;

    // 1. 异议处理 → 每条单独入库
    for (const [objection, strategy] of Object.entries(ctx.objectionHandling || {})) {
      const content = `【${industryName} - 异议处理】客户说"${objection}"\n\n应对策略：${strategy}`;
      const key = `${industryName}-objection-${objection}`;

      // 去重：检查是否已有
      const exists = existing.some(e => e.id === key);
      if (exists) { skipped++; continue; }

      try {
        await sbInsert('knowledge_items', {
          id: key,
          user_id: null,
          source: 'industry_config',
          content: content.slice(0, 500),
          tags: [industryName, '异议处理', objection],
          industry: industryName,
          knowledge_type: 'objection_handling',
          scenario: objection,
          style: detectStyle(strategy),
          weight: 1.5, // 行业配置权重高于爬取数据
          status: 'ACTIVE',
          language: 'zh',
          created_at: new Date().toISOString(),
        });
        inserted++;
      } catch (e) {
        console.error(`  Insert failed: ${industryName} - ${objection}: ${e.message.slice(0, 60)}`);
      }
    }

    // 2. 成交技巧 → 合并入库
    const closingContent = (ctx.closingTechniques || [])
      .map((t, i) => `${i + 1}. ${t}`)
      .join('\n');
    if (closingContent) {
      const key = `${industryName}-closing`;
      const exists = existing.some(e => e.id === key);
      if (!exists) {
        try {
          await sbInsert('knowledge_items', {
            id: key,
            user_id: null,
            source: 'industry_config',
            content: `【${industryName} - 成交技巧】\n${closingContent}`,
            tags: [industryName, '成交技巧'],
            industry: industryName,
            knowledge_type: 'closing',
            weight: 1.2,
            status: 'ACTIVE',
            language: 'zh',
            created_at: new Date().toISOString(),
          });
          inserted++;
        } catch (e) {
          console.error(`  Insert failed: ${industryName} - closing: ${e.message.slice(0, 60)}`);
        }
      } else {
        skipped++;
      }
    }

    // 3. 样本数据 → 合并入库
    const sampleEntries = Object.entries(ctx.sampleData || {});
    if (sampleEntries.length > 0) {
      const key = `${industryName}-sampledata`;
      const exists = existing.some(e => e.id === key);
      if (!exists) {
        const sampleContent = sampleEntries
          .map(([k, v]) => `${k}：${v}`)
          .join('\n');
        try {
          await sbInsert('knowledge_items', {
            id: key,
            user_id: null,
            source: 'industry_config',
            content: `【${industryName} - 行业数据】\n${sampleContent}`,
            tags: [industryName, '行业数据'],
            industry: industryName,
            knowledge_type: 'industry_insight',
            weight: 1.3,
            status: 'ACTIVE',
            language: 'zh',
            created_at: new Date().toISOString(),
          });
          inserted++;
        } catch (e) {
          console.error(`  Insert failed: ${industryName} - sampledata: ${e.message.slice(0, 60)}`);
        }
      } else {
        skipped++;
      }
    }

    // 4. 痛点 → 合并入库
    const painContent = (ctx.painPoints || []).join('、');
    if (painContent) {
      const key = `${industryName}-painpoints`;
      const exists = existing.some(e => e.id === key);
      if (!exists) {
        try {
          await sbInsert('knowledge_items', {
            id: key,
            user_id: null,
            source: 'industry_config',
            content: `【${industryName} - 客户痛点】${painContent}`,
            tags: [industryName, '客户痛点'],
            industry: industryName,
            knowledge_type: 'industry_insight',
            weight: 1.1,
            status: 'ACTIVE',
            language: 'zh',
            created_at: new Date().toISOString(),
          });
          inserted++;
        } catch (e) {
          console.error(`  Insert failed: ${industryName} - painpoints: ${e.message.slice(0, 60)}`);
        }
      } else {
        skipped++;
      }
    }

    // 5. 价值主张 → 合并入库
    const valueContent = (ctx.valueProps || []).join('、');
    if (valueContent) {
      const key = `${industryName}-valueprops`;
      const exists = existing.some(e => e.id === key);
      if (!exists) {
        try {
          await sbInsert('knowledge_items', {
            id: key,
            user_id: null,
            source: 'industry_config',
            content: `【${industryName} - 价值主张】${valueContent}`,
            tags: [industryName, '价值主张'],
            industry: industryName,
            knowledge_type: 'industry_insight',
            weight: 1.1,
            status: 'ACTIVE',
            language: 'zh',
            created_at: new Date().toISOString(),
          });
          inserted++;
        } catch (e) {
          console.error(`  Insert failed: ${industryName} - valueprops: ${e.message.slice(0, 60)}`);
        }
      } else {
        skipped++;
      }
    }

    console.log(`  ${industryName}: done`);
  }

  console.log(`\n=== DONE ===`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Skipped: ${skipped}`);
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });

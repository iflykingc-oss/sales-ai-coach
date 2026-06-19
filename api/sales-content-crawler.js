/**
 * 销售内容爬虫 - 用 Playwright 爬取中文销售实战内容
 *
 * 目标：从知乎、小红书等平台收集真实销售话术和案例
 */

const { chromium } = require('playwright');
const crypto = require('crypto');

// Supabase helper
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://doqcopkqbfpstuavfjsa.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function sbInsert(table, data) {
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
    },
    body: JSON.stringify(data),
  });
  if (!resp.ok) throw new Error(`Supabase insert failed: ${resp.status}`);
  return resp.json();
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

// ============================================================
// 搜索关键词配置
// ============================================================

const SEARCH_QUERIES = [
  // 保险销售
  { query: '保险销售话术 太贵了', industry: '保险', type: 'objection_handling' },
  { query: '保险销冠 经验分享', industry: '保险', type: 'case_study' },
  { query: '保险异议处理 实战', industry: '保险', type: 'objection_handling' },

  // 房产销售
  { query: '房产销售话术 客户说贵', industry: '房产', type: 'objection_handling' },
  { query: '置业顾问 销售技巧', industry: '房产', type: 'case_study' },
  { query: '卖房 异议处理 实战', industry: '房产', type: 'objection_handling' },

  // SaaS/B2B
  { query: 'SaaS销售 异议处理', industry: 'SaaS', type: 'objection_handling' },
  { query: 'B2B销售 话术技巧', industry: 'SaaS', type: 'case_study' },

  // 教育培训
  { query: '课程顾问 话术 异议', industry: '教育', type: 'objection_handling' },
  { query: '教育销售 促单技巧', industry: '教育', type: 'closing' },

  // 汽车销售
  { query: '汽车销售话术 价格谈判', industry: '汽车', type: 'objection_handling' },
  { query: '4S店 销售技巧 实战', industry: '汽车', type: 'case_study' },

  // 通用
  { query: '销售异议处理 话术大全', industry: '通用', type: 'objection_handling' },
  { query: '销冠经验分享 成交技巧', industry: '通用', type: 'case_study' },
  { query: '销售开场白 话术', industry: '通用', type: 'opening' },
  { query: '销售促成 话术技巧', industry: '通用', type: 'closing' },
];

// ============================================================
// 知乎爬取
// ============================================================

async function crawlZhihu(page, query, maxResults = 5) {
  const results = [];

  try {
    // 访问知乎搜索页面
    const searchUrl = `https://www.zhihu.com/search?type=content&q=${encodeURIComponent(query)}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });

    // 等待搜索结果加载
    await page.waitForSelector('.SearchResult-Card, .List-item', { timeout: 10000 }).catch(() => {});

    // 提取搜索结果
    const items = await page.evaluate((max) => {
      const results = [];
      const cards = document.querySelectorAll('.SearchResult-Card, .List-item');

      for (let i = 0; i < Math.min(cards.length, max); i++) {
        const card = cards[i];
        const titleEl = card.querySelector('h2, .ContentItem-title, .SearchResult-Card-title');
        const contentEl = card.querySelector('.RichContent-inner, .ContentItem-body, .SearchResult-Card-content');
        const linkEl = card.querySelector('a[href*="/p/"], a[href*="/question/"]');

        if (contentEl) {
          const content = contentEl.innerText?.trim();
          if (content && content.length > 50) {
            results.push({
              title: titleEl?.innerText?.trim() || '',
              content: content.slice(0, 3000),
              url: linkEl?.href || '',
            });
          }
        }
      }
      return results;
    }, maxResults);

    results.push(...items);
    console.log(`[Zhihu] Found ${results.length} results for: ${query}`);
  } catch (e) {
    console.error(`[Zhihu] Error crawling "${query}":`, e.message);
  }

  return results;
}

// ============================================================
// 小红书爬取
// ============================================================

async function crawlXiaohongshu(page, query, maxResults = 5) {
  const results = [];

  try {
    const searchUrl = `https://www.xiaohongshu.com/search_result?keyword=${encodeURIComponent(query)}&type=1`;
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });

    // 等待内容加载
    await page.waitForSelector('.note-item, .feeds-page', { timeout: 10000 }).catch(() => {});

    // 提取搜索结果
    const items = await page.evaluate((max) => {
      const results = [];
      const notes = document.querySelectorAll('.note-item, .feeds-page .note-item, section.note-item');

      for (let i = 0; i < Math.min(notes.length, max); i++) {
        const note = notes[i];
        const titleEl = note.querySelector('.title, .note-title, a.title');
        const descEl = note.querySelector('.desc, .note-desc, .content');
        const linkEl = note.querySelector('a[href*="/explore/"], a[href*="/discovery/item/"]');

        const title = titleEl?.innerText?.trim() || '';
        const desc = descEl?.innerText?.trim() || '';

        if (title || desc) {
          results.push({
            title: title,
            content: `${title}\n\n${desc}`.trim().slice(0, 2000),
            url: linkEl?.href || '',
          });
        }
      }
      return results;
    }, maxResults);

    results.push(...items);
    console.log(`[Xiaohongshu] Found ${results.length} results for: ${query}`);
  } catch (e) {
    console.error(`[Xiaohongshu] Error crawling "${query}":`, e.message);
  }

  return results;
}

// ============================================================
// 通用搜索（百度）
// ============================================================

async function crawlBaidu(page, query, maxResults = 5) {
  const results = [];

  try {
    const searchUrl = `https://www.baidu.com/s?wd=${encodeURIComponent(query)}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });

    // 提取搜索结果
    const items = await page.evaluate((max) => {
      const results = [];
      const items = document.querySelectorAll('.result, .c-container');

      for (let i = 0; i < Math.min(items.length, max); i++) {
        const item = items[i];
        const titleEl = item.querySelector('h3, .t');
        const contentEl = item.querySelector('.c-abstract, .c-span-last, .content-right_8Zs40');
        const linkEl = item.querySelector('a[href*="baidu.com/link"]');

        const title = titleEl?.innerText?.trim() || '';
        const content = contentEl?.innerText?.trim() || '';

        if (title && content && content.length > 30) {
          results.push({
            title: title,
            content: `${title}\n\n${content}`.trim().slice(0, 2000),
            url: linkEl?.href || '',
          });
        }
      }
      return results;
    }, maxResults);

    results.push(...items);
    console.log(`[Baidu] Found ${results.length} results for: ${query}`);
  } catch (e) {
    console.error(`[Baidu] Error crawling "${query}":`, e.message);
  }

  return results;
}

// ============================================================
// LLM 结构化提取
// ============================================================

async function extractKnowledge(text, industry, queryType) {
  const apiKey = process.env.QWEN_API_KEY || process.env.OPENAI_API_KEY;
  const baseUrl = process.env.QWEN_BASE_URL || 'https://api.openai.com/v1';
  const model = process.env.QWEN_MODEL || 'qwen-plus';

  if (!apiKey) {
    console.error('No API key configured');
    return null;
  }

  const prompt = `从以下销售内容中提取可用于销售培训的结构化知识。

内容：
${text.slice(0, 3000)}

行业：${industry}
内容类型：${queryType}

提取规则：
1. 必须是具体的、可直接使用的知识，不要提取泛泛的道理
2. 如果有具体话术，必须完整保留原话
3. 如果有心理学原理，必须说明具体怎么应用
4. 如果有数字/案例，必须保留

返回JSON（如果内容没有实用价值，返回 null）：
{
  "knowledge_type": "${queryType}",
  "industry": "${industry}",
  "scenario": "具体场景",
  "customer_voice": "客户原话（10字以内）",
  "response_example": "销冠回应（完整保留原话，200字以内）",
  "psychology_tags": ["用到的心理学原理"],
  "summary": "这个知识的核心要点（100字以内）",
  "key_insight": "一句话总结（30字以内）"
}

只返回JSON。`;

  try {
    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 500,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!resp.ok) return null;
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed || parsed === null || !parsed.knowledge_type) return null;
    return parsed;
  } catch (e) {
    console.error('LLM extraction failed:', e.message);
    return null;
  }
}

// ============================================================
// 去重检查
// ============================================================

async function contentExists(sourceUrl) {
  if (!sourceUrl) return false;
  const existing = await sbQuery('knowledge_items', {
    select: 'id',
    eq: { source: sourceUrl },
    limit: 1,
  });
  return existing.length > 0;
}

// ============================================================
// 主爬取流程
// ============================================================

async function crawlSalesContent() {
  console.log(`[Crawler] Starting at ${new Date().toISOString()}`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
  });

  const page = await context.newPage();

  let totalAdded = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (const { query, industry, type } of SEARCH_QUERIES) {
    console.log(`\n[Crawler] Processing: ${query} (${industry}/${type})`);

    // 爬取多个来源
    let items = [];

    // 尝试知乎
    const zhihuItems = await crawlZhihu(page, query, 3);
    items.push(...zhihuItems);

    // 尝试百度（作为备选）
    if (items.length < 2) {
      const baiduItems = await crawlBaidu(page, query, 3);
      items.push(...baiduItems);
    }

    // 处理每个结果
    for (const item of items) {
      // 去重
      if (await contentExists(item.url)) {
        totalSkipped++;
        continue;
      }

      // LLM 提取
      const knowledge = await extractKnowledge(item.content, industry, type);
      if (!knowledge) {
        totalSkipped++;
        continue;
      }

      // 写入数据库
      try {
        await sbInsert('knowledge_items', {
          id: crypto.randomUUID(),
          user_id: null,
          source: item.title || item.url || query,
          source_url: item.url,
          content: knowledge.summary || item.content.slice(0, 500),
          tags: [industry, knowledge.scenario, type].filter(Boolean),
          industry: industry,
          weight: 0.7,
          status: 'ACTIVE',
          knowledge_type: type,
          scenario: knowledge.scenario || null,
          customer_voice: knowledge.customer_voice || null,
          response_example: knowledge.response_example || null,
          psychology_tags: knowledge.psychology_tags || [],
          created_at: new Date().toISOString(),
        });
        totalAdded++;
        console.log(`[Crawler] Added: ${knowledge.key_insight}`);
      } catch (e) {
        console.error('[Crawler] DB insert failed:', e.message);
        totalFailed++;
      }
    }

    // 避免请求过快
    await page.waitForTimeout(2000);
  }

  await browser.close();

  const result = { added: totalAdded, skipped: totalSkipped, failed: totalFailed };
  console.log(`\n[Crawler] Complete:`, result);
  return result;
}

module.exports = { crawlSalesContent };

// 直接运行
if (require.main === module) {
  crawlSalesContent().then(result => {
    console.log('Result:', result);
    process.exit(0);
  }).catch(err => {
    console.error('Failed:', err);
    process.exit(1);
  });
}

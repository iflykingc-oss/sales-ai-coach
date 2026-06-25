/**
 * 销售内容爬虫 - 从 Google 搜索结果抓取销售知识
 *
 * 两种模式：
 * 1. 本地运行：用 Playwright（反检测浏览器）
 * 2. Vercel 运行：用 fetch + 正则提取（无浏览器依赖）
 */

// 尝试加载 Playwright，如果不可用则用 fetch
let chromium = null;
try {
  const pw = require('playwright');
  // 检查浏览器是否实际可用（不只是模块存在）
  if (pw.chromium && typeof pw.chromium.launch === 'function') {
    chromium = pw.chromium;
  }
} catch (e) {}

// 如果环境变量禁用 Playwright，也用 fetch 模式
if (process.env.DISABLE_PLAYWRIGHT === '1') chromium = null;
const crypto = require('crypto');

// Supabase helper
const SUPABASE_URL = process.env.SUPABASE_URL;
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

// 预定义优质来源（搜索引擎不可用时的备选）
// 这些是之前成功爬取过的、内容质量高的 URL
const PREDEFINED_SOURCES = [
  { url: 'https://www.cpic.com.cn/c/2021-05-31/1820152.shtml', industry: '保险', type: 'case_study' },
  { url: 'https://www.jiandaoyun.com/news/article/68beba81229b892d52226b61', industry: '房产', type: 'case_study' },
  { url: 'https://jingyan.baidu.com/article/425e69e69caffabe15fc16b7.html', industry: '保险', type: 'objection_handling' },
  { url: 'https://ask.imiker.com/m/question/83741', industry: '通用', type: 'objection_handling' },
  { url: 'https://www.xiazhi.co/overcoming-sales-objections-40-examples-strategies-and-rebuttals/', industry: '通用', type: 'objection_handling' },
  { url: 'https://www.fxiaoke.com/crm/information-36210.html', industry: '通用', type: 'general' },
  { url: 'https://www.woshipm.com/share/5919927.html', industry: '通用', type: 'case_study' },
  { url: 'https://www.wescrm.com/siyuzhishiku/siyuyunying/4119', industry: '通用', type: 'follow_up' },
  { url: 'https://club.xiaoshouyi.com/thread-9645-1-1.html', industry: '通用', type: 'case_study' },
  { url: 'https://www.zkj.com/industry_news/9317.html', industry: 'SaaS', type: 'case_study' },
];

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
// Google 搜索（绕过反爬）
// ============================================================

async function crawlGoogle(page, query, maxResults = 5) {
  const results = [];

  try {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&hl=zh-CN`;
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);

    const items = await page.evaluate((max) => {
      const results = [];
      document.querySelectorAll('.g, .tF2Cxc').forEach(el => {
        const title = el.querySelector('h3')?.innerText?.trim();
        const content = el.querySelector('.VwiC3b, .IsZvec')?.innerText?.trim();
        const link = el.querySelector('a')?.href;
        if (title && content && content.length > 30) {
          results.push({
            title: title.slice(0, 200),
            content: content.slice(0, 1000),
            url: link || '',
          });
        }
      });
      return results.slice(0, max);
    }, maxResults);

    results.push(...items);
    console.log(`[Google] Found ${results.length} results for: ${query}`);
  } catch (e) {
    console.error(`[Google] Error crawling "${query}":`, e.message);
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

  let usePlaywright = !!chromium;
  let browser, page;

  if (usePlaywright) {
    try {
      // Playwright 模式（本地运行）
      browser = await chromium.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
      });
      const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        viewport: { width: 1366, height: 768 },
        locale: 'zh-CN',
      });
      await context.addInitScript(() => {
        Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
      });
      page = await context.newPage();
      console.log('[Crawler] Using Playwright mode');
    } catch (e) {
      console.log('[Crawler] Playwright launch failed, falling back to fetch:', e.message.slice(0, 80));
      usePlaywright = false;
      browser = null;
      page = null;
    }
  }

  if (!usePlaywright) {
    console.log('[Crawler] Using fetch mode');
  }

  let totalAdded = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  for (const { query, industry, type } of SEARCH_QUERIES) {
    console.log(`\n[Crawler] Processing: ${query} (${industry}/${type})`);

    // 爬取多个来源
    let items = [];

    // 搜索
    try {
      if (usePlaywright) {
        const googleItems = await crawlGoogle(page, query, 3);
        items.push(...googleItems);
      } else {
        // fetch 模式：用 DuckDuckGo HTML 版（比 Google 更容易解析）
        try {
          const resp = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
              'Accept': 'text/html',
            },
            signal: AbortSignal.timeout(15000),
          });
          if (resp.ok) {
            const html = await resp.text();
            // DuckDuckGo HTML 格式：结果在 <a class="result__a"> 和 <a class="result__snippet"> 中
            const resultBlocks = html.split(/class="result /);
            for (let i = 1; i < Math.min(resultBlocks.length, 4); i++) {
              const block = resultBlocks[i];
              const titleMatch = block.match(/class="result__a"[^>]*>([^<]+)</);
              const snippetMatch = block.match(/class="result__snippet"[^>]*>([^<]+)/);
              const linkMatch = block.match(/href="([^"]+)"/);
              if (titleMatch) {
                const title = titleMatch[1].trim();
                const content = snippetMatch ? snippetMatch[1].trim() : '';
                const url = linkMatch ? linkMatch[1] : '';
                if (title && content.length > 20) {
                  items.push({ title: title.slice(0, 200), content: content.slice(0, 800), url });
                }
              }
            }
          }
        } catch (e) {
          console.log(`[Crawler] Fetch search error: ${e.message.slice(0, 50)}`);
        }
      }
    } catch (e) {
      console.log(`[Crawler] Search error: ${e.message.slice(0, 50)}`);
    }

    // 如果搜索没有结果，使用预定义来源
    if (items.length === 0) {
      const matchingSources = PREDEFINED_SOURCES.filter(s =>
        s.industry === industry || s.industry === '通用'
      );
      if (matchingSources.length > 0) {
        console.log(`[Crawler] Using ${matchingSources.length} predefined sources`);
        items = matchingSources.map(s => ({
          title: s.url.split('/').pop() || s.url,
          content: '',
          url: s.url,
        }));
      }
    }

    console.log(`[Crawler] Found ${items.length} results`);

    // 处理每个结果
    for (const item of items) {
      // 去重
      if (await contentExists(item.url)) {
        totalSkipped++;
        continue;
      }

      // 如果内容太短，尝试访问原始页面
      let fullContent = item.content;
      if (item.content.length < 200 && item.url) {
        try {
          const resp = await fetch(item.url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
            signal: AbortSignal.timeout(10000),
          });
          if (resp.ok) {
            const html = await resp.text();
            const text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
              .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
              .slice(0, 5000);
            if (text.length > fullContent.length) fullContent = text;
          }
        } catch (e) {}
      }

      // LLM 提取
      const knowledge = await extractKnowledge(fullContent, industry, type);
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
          content: knowledge.summary || fullContent.slice(0, 500),
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
    if (usePlaywright) {
      await page.waitForTimeout(2000);
    } else {
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  if (browser) await browser.close();

  const result = { added: totalAdded, skipped: totalSkipped, failed: totalFailed };
  console.log(`\n[Crawler] Complete:`, result);
  return result;
}

/**
 * 从抓取的文章中批量提取知识
 */
function extractKnowledgeFromArticles(articles) {
  const keywords = ['话术', '异议', '客户', '销售', '成交', '促单', '信任', '价格', '太贵', '考虑', '对比', '竞品', '心理学', '损失厌恶', '锚定', '开场白', '跟进', '朋友圈'];
  const knowledgeItems = [];
  const seen = new Set();

  for (const article of articles) {
    const { content, query, title } = article;
    const paragraphs = content.split(/\n\n+/).filter(p => p.length > 50 && p.length < 2000);

    for (const para of paragraphs) {
      const matchedKeywords = keywords.filter(k => para.includes(k));
      if (matchedKeywords.length < 2) continue;

      // 去重
      const key = para.slice(0, 100);
      if (seen.has(key)) continue;
      seen.add(key);

      // 判断类型
      let type = 'general';
      if (para.includes('异议') || para.includes('太贵') || para.includes('考虑') || para.includes('对比')) type = 'objection_handling';
      else if (para.includes('开场白') || para.includes('开场')) type = 'opening';
      else if (para.includes('成交') || para.includes('促单') || para.includes('逼单')) type = 'closing';
      else if (para.includes('心理学') || para.includes('损失厌恶') || para.includes('锚定')) type = 'psychology';
      else if (para.includes('跟进') || para.includes('维护')) type = 'follow_up';
      else if (para.includes('信任')) type = 'trust_building';
      else if (para.includes('朋友圈')) type = 'social_selling';

      // 判断行业
      let industry = '通用';
      if (query.includes('保险') || title.includes('保险')) industry = '保险';
      else if (query.includes('房产') || title.includes('房产') || title.includes('地产')) industry = '房产';
      else if (query.includes('教育') || title.includes('课程') || title.includes('培训')) industry = '教育';
      else if (query.includes('汽车') || title.includes('汽车') || title.includes('4S')) industry = '汽车';
      else if (query.includes('SaaS') || title.includes('SaaS') || title.includes('B2B')) industry = 'SaaS';
      else if (query.includes('金融') || title.includes('理财') || title.includes('银行')) industry = '金融';
      else if (query.includes('快消') || title.includes('快消')) industry = '快消品';
      else if (query.includes('跨境') || title.includes('跨境') || title.includes('外贸')) industry = '跨境电商';

      knowledgeItems.push({
        knowledge_type: type,
        industry,
        content: para.slice(0, 500),
        source: title.slice(0, 100),
        matchedKeywords,
      });
    }
  }

  return knowledgeItems;
}

module.exports = { crawlSalesContent, extractKnowledgeFromArticles };

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

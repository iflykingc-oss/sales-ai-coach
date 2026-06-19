/**
 * Knowledge Crawler v2 - 销售知识爬虫
 *
 * 策略：
 * 1. 使用搜索引擎 API 发现销售相关内容
 * 2. 抓取页面内容
 * 3. LLM 结构化提取
 * 4. 写入 knowledge_items 表
 *
 * 参考开源项目：
 * - node-crawler: https://github.com/bda-research/node-crawler
 * - x-crawl: https://github.com/coder-hxl/x-crawl
 * - AnyCrawl: https://github.com/any4ai/AnyCrawl
 */

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
  if (params.order) url.searchParams.set('order', params.order);
  if (params.limit) url.searchParams.set('limit', params.limit.toString());
  const resp = await fetch(url, {
    headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
  });
  if (!resp.ok) return [];
  return resp.json();
}

// ============================================================
// 销售知识来源配置
// ============================================================

const KNOWLEDGE_SOURCES = [
  // 知乎销售话题 - 高赞回答
  {
    name: '知乎-销售技巧',
    type: 'zhihu',
    url: 'https://www.zhihu.com/api/v4/search_v3?t=general&q=销售技巧+话术&correction=1&offset=0&limit=10',
    parseType: 'api',
  },
  {
    name: '知乎-异议处理',
    type: 'zhihu',
    url: 'https://www.zhihu.com/api/v4/search_v3?t=general&q=客户异议+处理方法&correction=1&offset=0&limit=10',
    parseType: 'api',
  },
  {
    name: '知乎-销冠经验',
    type: 'zhihu',
    url: 'https://www.zhihu.com/api/v4/search_v3?t=general&q=销冠+销售经验&correction=1&offset=0&limit=10',
    parseType: 'api',
  },
  // 36氪 - 销售管理文章
  {
    name: '36氪-销售管理',
    type: '36kr',
    url: 'https://36kr.com/api/search-column/mainsite?keyword=销售管理&per_page=10',
    parseType: 'api',
  },
];

// 行业特定搜索关键词
const INDUSTRY_KEYWORDS = {
  '保险': ['保险销售话术', '保险异议处理', '保险成单技巧'],
  '房产': ['房产销售技巧', '置业顾问话术', '房产异议处理'],
  '教育': ['课程顾问销售', '教育销售话术', '培训招生技巧'],
  'SaaS': ['SaaS销售方法', 'B2B销售技巧', '软件销售话术'],
  '汽车': ['汽车销售话术', '4S店销售技巧', '汽车异议处理'],
  '金融': ['理财顾问销售', '金融产品销售', '理财异议处理'],
};

// ============================================================
// 内容抓取
// ============================================================

/**
 * 抓取网页内容（简化版，适合静态页面）
 */
async function fetchPageContent(url, timeout = 10000) {
  try {
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      },
      signal: AbortSignal.timeout(timeout),
    });
    if (!resp.ok) return null;
    const html = await resp.text();
    return extractTextFromHtml(html);
  } catch (e) {
    console.error(`Failed to fetch ${url}:`, e.message);
    return null;
  }
}

/**
 * 从 HTML 提取纯文本（简化版 cheerio）
 */
function extractTextFromHtml(html) {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
    .replace(/<[^>]+>/g, '\n')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 10)
    .join('\n')
    .trim()
    .slice(0, 5000);
}

// ============================================================
// LLM 结构化提取
// ============================================================

/**
 * 用 LLM 从原始文本提取结构化销售知识
 */
async function extractKnowledge(text, sourceName) {
  const apiKey = process.env.QWEN_API_KEY || process.env.OPENAI_API_KEY;
  const baseUrl = process.env.QWEN_BASE_URL || 'https://api.openai.com/v1';
  const model = process.env.QWEN_MODEL || 'qwen-plus';

  if (!apiKey) {
    console.error('No API key configured');
    return null;
  }

  const prompt = `你是一位销售知识提取专家。从以下内容中提取可用于销售培训的结构化知识。

来源：${sourceName}
内容：
${text.slice(0, 3000)}

请提取并返回 JSON（如果内容不含销售知识，返回 null）：
{
  "knowledge_type": "objection_handling | opening | closing | psychology | case_study | industry_insight",
  "industry": "行业（保险/房产/教育/SaaS/汽车/金融/通用）",
  "scenario": "场景（如：价格异议/竞品比较/客户犹豫/促成成交）",
  "customer_voice": "客户原话（如有，10字以内）",
  "response_example": "销冠回应示例（100字以内）",
  "psychology_tags": ["涉及的心理学原理"],
  "summary": "知识摘要（200字以内）",
  "key_insight": "核心洞察（50字以内）"
}

只返回 JSON，不要其他内容。`;

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
        temperature: 0.2,
        max_tokens: 500,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!resp.ok) return null;
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || '';

    // 提取 JSON
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
// 搜索引擎发现
// ============================================================

/**
 * 使用搜索引擎发现销售相关内容
 */
async function discoverFromSearch(query, limit = 5) {
  // 使用 Bing 搜索（免费，无需 API key）
  try {
    const searchUrl = `https://www.bing.com/search?q=${encodeURIComponent(query)}&count=${limit}`;
    const html = await fetchPageContent(searchUrl);

    if (!html) return [];

    // 提取搜索结果中的 URL
    const urlPattern = /https?:\/\/[^\s<>"]+/g;
    const urls = (html.match(urlPattern) || [])
      .filter(url => !url.includes('bing.com') && !url.includes('microsoft.com'))
      .slice(0, limit);

    return urls;
  } catch (e) {
    console.error('Search discovery failed:', e.message);
    return [];
  }
}

// ============================================================
// 主爬取逻辑
// ============================================================

/**
 * 爬取单个来源
 */
async function crawlSource(source) {
  const results = [];

  try {
    if (source.parseType === 'api') {
      // API 类型：直接请求
      const resp = await fetch(source.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (resp.ok) {
        const data = await resp.json();
        // 根据来源类型解析
        if (source.type === 'zhihu') {
          // 知乎搜索 API 返回格式
          const items = data.data || [];
          for (const item of items.slice(0, 5)) {
            if (item.object?.content) {
              results.push({
                text: item.object.content.slice(0, 2000),
                source: `知乎 - ${item.object.question?.title || '销售话题'}`,
                url: item.object.url || '',
              });
            }
          }
        }
      }
    }
  } catch (e) {
    console.error(`Crawl ${source.name} failed:`, e.message);
  }

  return results;
}

/**
 * 检查知识是否已存在
 */
async function knowledgeExists(sourceUrl) {
  if (!sourceUrl) return false;
  const existing = await sbQuery('knowledge_items', {
    select: 'id',
    eq: { source: sourceUrl },
    limit: 1,
  });
  return existing.length > 0;
}

/**
 * 主爬取函数
 */
async function crawlKnowledge() {
  console.log(`[Crawler] Starting at ${new Date().toISOString()}`);

  let totalAdded = 0;
  let totalSkipped = 0;
  let totalFailed = 0;

  // 1. 爬取预定义来源
  for (const source of KNOWLEDGE_SOURCES) {
    console.log(`[Crawler] Processing: ${source.name}`);

    const crawled = await crawlSource(source);

    for (const item of crawled) {
      // 去重
      if (await knowledgeExists(item.url)) {
        totalSkipped++;
        continue;
      }

      // LLM 提取
      const knowledge = await extractKnowledge(item.text, item.source);
      if (!knowledge) {
        totalSkipped++;
        continue;
      }

      // 写入数据库
      try {
        await sbInsert('knowledge_items', {
          id: crypto.randomUUID(),
          user_id: null,
          source: item.source,
          source_url: item.url,
          content: knowledge.summary || item.text.slice(0, 500),
          tags: [knowledge.industry, knowledge.scenario, knowledge.knowledge_type].filter(Boolean),
          industry: knowledge.industry || '通用',
          weight: 0.7,
          status: 'ACTIVE',
          knowledge_type: knowledge.knowledge_type || 'general',
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
  }

  // 2. 按行业搜索发现新内容
  for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
    const query = keywords[0]; // 取第一个关键词
    console.log(`[Crawler] Searching: ${query}`);

    const urls = await discoverFromSearch(query, 3);

    for (const url of urls) {
      if (await knowledgeExists(url)) {
        totalSkipped++;
        continue;
      }

      const content = await fetchPageContent(url);
      if (!content || content.length < 200) {
        totalSkipped++;
        continue;
      }

      const knowledge = await extractKnowledge(content, `${industry}行业`);
      if (!knowledge) {
        totalSkipped++;
        continue;
      }

      try {
        await sbInsert('knowledge_items', {
          id: crypto.randomUUID(),
          user_id: null,
          source: `${industry}行业知识`,
          source_url: url,
          content: knowledge.summary || content.slice(0, 500),
          tags: [industry, knowledge.scenario, knowledge.knowledge_type].filter(Boolean),
          industry: industry,
          weight: 0.6,
          status: 'ACTIVE',
          knowledge_type: knowledge.knowledge_type || 'general',
          scenario: knowledge.scenario || null,
          customer_voice: knowledge.customer_voice || null,
          response_example: knowledge.response_example || null,
          psychology_tags: knowledge.psychology_tags || [],
          created_at: new Date().toISOString(),
        });
        totalAdded++;
        console.log(`[Crawler] Added ${industry}: ${knowledge.key_insight}`);
      } catch (e) {
        console.error('[Crawler] DB insert failed:', e.message);
        totalFailed++;
      }
    }
  }

  const result = { added: totalAdded, skipped: totalSkipped, failed: totalFailed };
  console.log(`[Crawler] Complete:`, result);
  return result;
}

module.exports = { crawlKnowledge };

// 直接运行
if (require.main === module) {
  crawlKnowledge().then(result => {
    console.log('Result:', result);
    process.exit(0);
  }).catch(err => {
    console.error('Failed:', err);
    process.exit(1);
  });
}

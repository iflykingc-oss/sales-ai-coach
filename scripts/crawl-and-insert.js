/**
 * 销售知识爬虫 — 爬取 + 提取 + 直接入库
 *
 * 用法：node scripts/crawl-and-insert.js
 * 执行后自动：搜索 → 抓取 → 提取 → 写入 Supabase
 */

const { chromium } = require('playwright');
const crypto = require('crypto');

// Supabase 配置
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://doqcopkqbfpstuavfjsa.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// API 配置（通过 API 入库，不直接连数据库）
const API_BASE = process.env.API_BASE || 'http://localhost:3000/api';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

async function apiInsertKnowledge(items) {
  const resp = await fetch(`${API_BASE}/admin/knowledge/batch-insert`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': `token=${ADMIN_TOKEN}`,
    },
    body: JSON.stringify({ items }),
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`API insert failed: ${resp.status} ${err.slice(0, 100)}`);
  }
  return resp.json();
}

// ============================================================
// 合规工具函数
// ============================================================

// 检查域名是否在黑名单
function isDomainBlocked(url) {
  try {
    const domain = new URL(url).hostname;
    return COMPLIANCE.blockedDomains.some(d => domain.includes(d));
  } catch { return false; }
}

// 检查 robots.txt（简化版）
async function canCrawl(page, url) {
  if (!COMPLIANCE.respectRobotsTxt) return true;
  try {
    const domain = new URL(url).origin;
    const robotsUrl = `${domain}/robots.txt`;
    const resp = await fetch(robotsUrl, { signal: AbortSignal.timeout(5000) });
    if (!resp.ok) return true; // 没有 robots.txt，默认允许
    const text = await resp.text();
    const path = new URL(url).pathname;
    // 检查是否有 Disallow 规则匹配
    const lines = text.split('\n');
    let userAgentMatch = false;
    for (const line of lines) {
      if (line.startsWith('User-agent: *') || line.startsWith('User-agent: Googlebot')) {
        userAgentMatch = true;
      } else if (line.startsWith('User-agent:') && userAgentMatch) {
        userAgentMatch = false;
      }
      if (userAgentMatch && line.startsWith('Disallow:')) {
        const disallowed = line.split(':')[1]?.trim();
        if (disallowed && path.startsWith(disallowed)) return false;
      }
    }
    return true;
  } catch { return true; }
}

// 请求频率控制
const domainLastRequest = {};
async function rateLimit(url) {
  const domain = new URL(url).hostname;
  const last = domainLastRequest[domain] || 0;
  const elapsed = Date.now() - last;
  if (elapsed < COMPLIANCE.requestDelay) {
    await new Promise(r => setTimeout(r, COMPLIANCE.requestDelay - elapsed));
  }
  domainLastRequest[domain] = Date.now();
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
    throw new Error(`Supabase insert failed: ${resp.status} ${err.slice(0, 100)}`);
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

// ============================================================
// 合规配置
// ============================================================
const COMPLIANCE = {
  // 遵守 robots.txt
  respectRobotsTxt: true,
  // 请求间隔（毫秒）— 避免被封 IP
  requestDelay: 2000,
  // 每个域名最大请求数
  maxRequestsPerDomain: 10,
  // 不爬取的域名（仅屏蔽与销售无关的站点）
  blockedDomains: [
    'facebook.com', 'instagram.com', 'tiktok.com',
    'youtube.com', 'pornhub.com', 'gambling',
  ],
  // 内容归属：标记来源
  attribution: true,
};

// ============================================================
// 搜索关键词 — 国内 + 海外
// ============================================================
const QUERIES = [
  // ========== 国内市场（中文）==========
  // 保险
  '保险销售话术 太贵了 实战', '保险异议处理 客户说不需要',
  '保险销冠 经验分享', '重疾险销售 客户犹豫',
  // 房产
  '房产销售话术 客户说贵', '置业顾问 异议处理',
  '房产销售 价格谈判', '楼盘销售 竞品对比',
  // 教育
  '课程顾问 异议处理', '教育销售 客户说贵',
  // 汽车
  '汽车销售话术 价格谈判', '4S店 异议处理',
  // SaaS/B2B
  'SaaS销售 异议处理', 'B2B销售 需求挖掘',
  // 通用
  '销售异议处理 话术大全', '销冠经验分享 成交技巧',
  '销售开场白 话术', '销售促成成交 话术',
  '销售心理学 损失厌恶', '客户说再考虑 怎么回应',
  '客户说要和领导商量', '销售竞品对比 话术',
  '电话销售 开场白', '微信销售 朋友圈',
  '销售逼单 话术', '客户异议 分类 处理',
  // 行业
  '快消品 终端话术', '跨境电商 销售技巧',
  '金融理财 异议处理', '家居建材 销售话术',

  // ========== 社交媒体平台（中文）==========
  // 小红书 — 销售话术、异议处理、成交技巧
  'site:xiaohongshu.com 销售话术 异议', 'site:xiaohongshu.com 保险销售 经验',
  'site:xiaohongshu.com 房产销售 话术', 'site:xiaohongshu.com 销冠 成交技巧',
  // 知乎 — 深度销售分析、方法论
  'site:zhihu.com 销售异议处理 方法', 'site:zhihu.com 销冠经验 深度分析',
  'site:zhihu.com SPIN销售 实战', 'site:zhihu.com B2B销售 技巧',
  // 微博 — 销售日常、实战分享
  'site:weibo.com 销售话术 异议处理', 'site:weibo.com 保险销冠 经验',
  // B站 — 销售培训视频的文字内容
  'site:bilibili.com 销售话术 教程', 'site:bilibili.com 异议处理 实战',
  // 脉脉 — 职场销售经验
  'site:maimai.cn 销售经验 成交', 'site:maimai.cn B2B销售 技巧',
  // 抖音 — 销售短视频的文字内容
  'site:douyin.com 销售话术 异议', 'site:douyin.com 销冠 经验分享',

  // ========== 海外市场（英文）==========
  // LinkedIn — B2B sales insights
  'site:linkedin.com sales objection handling', 'site:linkedin.com B2B sales techniques',
  // Reddit — sales community discussions
  'site:reddit.com r/sales objection handling', 'site:reddit.com r/sales closing techniques',
  // Twitter/X — sales tips
  'site:x.com sales objection tips', 'site:x.com sales closing techniques',
  // General sales
  'sales objection handling techniques', 'sales closing techniques 2025',
  'how to handle price objection sales', 'sales negotiation tactics',
  'cold call opening lines that work', 'sales follow up best practices',
  'SPIN selling examples', 'consultative selling techniques',
  // B2B SaaS
  'SaaS sales objection handling', 'B2B sales discovery questions',
  'enterprise sales techniques', 'SaaS pricing objection response',
  'demo to close conversion tips', 'B2B cold outreach templates',
  // Real estate
  'real estate sales objection handling', 'how to sell house when buyer says too expensive',
  'real estate agent negotiation tips', 'open house sales techniques',
  // Insurance
  'insurance sales objection handling', 'how to sell insurance to millennials',
  'insurance closing techniques', 'life insurance sales scripts',
  // Automotive
  'car sales objection handling', 'auto dealer negotiation tactics',
  'how to close car sales', 'test drive follow up techniques',
  // Sales psychology
  'loss aversion in sales', 'anchoring effect pricing negotiation',
  'social proof sales techniques', 'reciprocity principle in selling',
  'Cialdini principles sales application',
  // Phone/remote sales
  'phone sales techniques objection handling', 'video call sales tips',
  'WhatsApp sales conversation tips', 'email follow up after no response',
  // Southeast Asia
  'sales techniques Southeast Asia', 'insurance sales Thailand tips',
  'real estate Vietnam sales', 'e-commerce Indonesia selling技巧',
];

// ============================================================
// 知识提取关键词
// ============================================================
const KEYWORDS = [
  '话术', '异议', '客户', '销售', '成交', '促单', '信任', '价格', '太贵',
  '考虑', '对比', '竞品', '心理学', '损失厌恶', '锚定', '开场白', '跟进',
  '需求挖掘', 'SPIN', '促成', '逼单', '报价', '谈判', '价值', '方案',
];

// ============================================================
// 主流程
// ============================================================
async function main() {
  if (!SUPABASE_KEY) {
    console.error('Error: SUPABASE_SERVICE_ROLE_KEY not set');
    process.exit(1);
  }

  console.log('=== 销售知识爬取 + 入库 ===');
  console.log('Time:', new Date().toISOString());

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1366, height: 768 },
    locale: 'zh-CN',
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  const page = await context.newPage();

  // Phase 1: 搜索（随机排序 + cache busting）
  const shuffled = [...QUERIES].sort(() => Math.random() - 0.5);
  const today = new Date().toISOString().split('T')[0];
  console.log(`\nPhase 1: Searching (${shuffled.length} queries, date: ${today})...`);
  const allResults = [];
  for (let i = 0; i < shuffled.length; i++) {
    const q = shuffled[i];
    process.stdout.write(`[${i + 1}/${shuffled.length}] ${q.slice(0, 20)}...`);
    try {
      // 加 tbs=qdr:d 参数按天去重，加随机 token 防缓存
      const rand = Math.random().toString(36).slice(2, 8);
      const url = `https://www.google.com/search?q=${encodeURIComponent(q)}&hl=zh-CN&num=5&tbs=qdr:w&sei=${rand}`;
      await page.goto(url, { waitUntil: 'networkidle', timeout: 25000 });
      await page.waitForTimeout(1200 + Math.random() * 800);
      const results = await page.evaluate(() => {
        const items = [];
        document.querySelectorAll('.g, .tF2Cxc').forEach(el => {
          const t = el.querySelector('h3')?.innerText?.trim();
          const c = el.querySelector('.VwiC3b, .IsZvec')?.innerText?.trim();
          const l = el.querySelector('a')?.href;
          if (t && c && l && !l.includes('google.com')) items.push({ title: t.slice(0, 200), content: c.slice(0, 800), url: l });
        });
        return items.slice(0, 3);
      });
      allResults.push(...results.map(r => ({ ...r, query: q })));
      console.log(` ${results.length}`);
    } catch (e) {
      console.log(' err');
    }
  }

  // 去重
  const seen = new Set();
  const unique = allResults.filter(r => { if (seen.has(r.url)) return false; seen.add(r.url); return true; });
  console.log(`\nUnique URLs: ${unique.length}`);

  // Phase 2: 抓取内容（合规）
  console.log(`\nPhase 2: Fetching (${unique.length} URLs, with compliance)...`);
  const articles = [];
  const domainCounts = {};
  let blockedCount = 0;
  let robotsBlockedCount = 0;

  for (let i = 0; i < unique.length; i++) {
    const url = unique[i].url;
    if (i % 20 === 0) console.log(`Progress: ${i}/${unique.length}`);

    // 合规检查 1：域名黑名单
    if (isDomainBlocked(url)) {
      blockedCount++;
      continue;
    }

    // 合规检查 2：每个域名最大请求数
    const domain = new URL(url).hostname;
    domainCounts[domain] = (domainCounts[domain] || 0) + 1;
    if (domainCounts[domain] > COMPLIANCE.maxRequestsPerDomain) continue;

    // 合规检查 3：robots.txt
    if (!await canCrawl(page, url)) {
      robotsBlockedCount++;
      continue;
    }

    // 合规检查 4：请求频率
    await rateLimit(url);

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 12000 });
      await page.waitForTimeout(1200);
      const content = await page.evaluate(() => {
        const el = document.querySelector('article, .Post-RichText, .RichContent-inner, .article-content, main, .content, .article-body, .post-content');
        return el ? el.innerText.slice(0, 8000) : '';
      });
      if (content && content.length > 200) {
        articles.push({ ...unique[i], content });
      }
    } catch (e) {}
  }
  console.log(`Fetched: ${articles.length}`);
  console.log(`Blocked: ${blockedCount} (domain blacklist), ${robotsBlockedCount} (robots.txt)`);

  // Phase 3: 提取知识
  console.log('\nPhase 3: Extracting...');
  const items = [];
  const cSeen = new Set();

  for (const a of articles) {
    for (const p of a.content.split(/\n\n+/).filter(x => x.length > 50 && x.length < 2000)) {
      const m = KEYWORDS.filter(k => p.includes(k));
      if (m.length < 2) continue;
      const key = p.slice(0, 100);
      if (cSeen.has(key)) continue;
      cSeen.add(key);

      let type = 'general';
      if (p.includes('异议') || p.includes('太贵') || p.includes('考虑') || p.includes('竞品')) type = 'objection_handling';
      else if (p.includes('开场白')) type = 'opening';
      else if (p.includes('成交') || p.includes('促单') || p.includes('逼单')) type = 'closing';
      else if (p.includes('心理学') || p.includes('损失厌恶') || p.includes('锚定')) type = 'psychology';
      else if (p.includes('跟进')) type = 'follow_up';
      else if (p.includes('信任')) type = 'trust_building';
      else if (p.includes('需求挖掘') || p.includes('SPIN')) type = 'needs_discovery';
      else if (p.includes('报价') || p.includes('谈判')) type = 'price_negotiation';

      let industry = '通用';
      const q = `${a.query} ${a.title}`;
      if (q.includes('保险')) industry = '保险';
      else if (q.includes('房产') || q.includes('楼盘') || q.includes('置业')) industry = '房产';
      else if (q.includes('教育') || q.includes('课程') || q.includes('培训')) industry = '教育';
      else if (q.includes('汽车') || q.includes('4S')) industry = '汽车';
      else if (q.includes('SaaS') || q.includes('B2B')) industry = 'SaaS';
      else if (q.includes('金融') || q.includes('理财')) industry = '金融';
      else if (q.includes('快消')) industry = '快消品';
      else if (q.includes('跨境')) industry = '跨境电商';
      else if (q.includes('家居') || q.includes('装修')) industry = '家居';
      else if (q.includes('医疗')) industry = '医疗';

      // 检测语言
      const isChinese = /[一-鿿]/.test(p);
      const language = isChinese ? 'zh' : 'en';

      items.push({
        knowledge_type: type,
        industry,
        content: p.slice(0, 500),
        source: a.title.slice(0, 100),
        source_url: a.url,
        language,
        matchedKeywords: m,
      });
    }
  }
  console.log(`Extracted: ${items.length}`);

  // 统计
  const byType = {}, byInd = {};
  for (const i of items) {
    byType[i.knowledge_type] = (byType[i.knowledge_type] || 0) + 1;
    byInd[i.industry] = (byInd[i.industry] || 0) + 1;
  }
  console.log('By type:', JSON.stringify(byType));
  console.log('By industry:', JSON.stringify(byInd));

  // Phase 4: 去重 + 入库（Supabase REST API）
  console.log('\nPhase 4: Dedup + Inserting into Supabase...');

  // 4a. 拉取已有的 source_url，用于去重
  const existingUrls = new Set();
  const existingContents = new Set();
  try {
    const existing = await sbQuery('knowledge_items', { select: 'source_url,content', limit: 10000 });
    for (const row of existing) {
      if (row.source_url) existingUrls.add(row.source_url);
      if (row.content) existingContents.add(row.content.slice(0, 100));
    }
    console.log(`  Existing records: ${existingUrls.size} URLs, ${existingContents.size} content hashes`);
  } catch (e) {
    console.error(`  Warning: Could not fetch existing records: ${e.message}`);
  }

  let inserted = 0;
  let skipped = 0;
  let failed = 0;

  // 4b. 过滤出需要插入的新项
  const toInsert = [];
  for (const item of items) {
    const url = (item.source_url || '').slice(0, 500);
    const contentKey = (item.content || '').slice(0, 100);
    if (url && existingUrls.has(url)) { skipped++; continue; }
    if (contentKey && existingContents.has(contentKey)) { skipped++; continue; }
    toInsert.push(item);
  }
  console.log(`  To insert: ${toInsert.length} (skipped ${skipped} duplicates)`);

  // 4c. 插入
  for (const item of toInsert) {
    try {
      await sbInsert('knowledge_items', {
        id: crypto.randomUUID(),
        user_id: null,
        source: (item.source || '').slice(0, 200),
        source_url: (item.source_url || '').slice(0, 500),
        content: (item.content || '').slice(0, 500),
        tags: [item.industry, item.knowledge_type, item.language, ...item.matchedKeywords.slice(0, 3)].filter(Boolean),
        industry: item.industry || '通用',
        weight: 0.7,
        status: 'ACTIVE',
        knowledge_type: item.knowledge_type || 'general',
        language: item.language || 'zh',
        created_at: new Date().toISOString(),
      });
      inserted++;
      if (inserted % 50 === 0) console.log(`  Inserted: ${inserted}/${toInsert.length}`);
    } catch (e) {
      failed++;
      if (failed <= 3) console.error(`  Insert failed: ${e.message.slice(0, 80)}`);
    }
  }

  console.log(`\n=== DONE ===`);
  console.log(`Inserted: ${inserted}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);

  await browser.close();
}

main().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});

const { chromium } = require('playwright');
const fs = require('fs');
const crypto = require('crypto');

(async () => {
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

  // 精选 30 个高价值搜索词
  const queries = [
    '保险销售话术 太贵了 实战', '保险异议处理 客户说不需要',
    '保险销冠 经验分享', '重疾险销售 客户犹豫',
    '房产销售话术 客户说贵', '置业顾问 异议处理',
    '房产销售 价格谈判', '楼盘销售 竞品对比',
    '课程顾问 异议处理', '教育销售 客户说贵',
    '汽车销售话术 价格谈判', '4S店 异议处理',
    'SaaS销售 异议处理', 'B2B销售 需求挖掘',
    '销售异议处理 话术大全', '销冠经验分享 成交技巧',
    '销售开场白 话术', '销售促成成交 话术',
    '销售心理学 损失厌恶', '客户说再考虑 怎么回应',
    '客户说要和领导商量', '销售竞品对比 话术',
    '电话销售 开场白', '微信销售 朋友圈',
    '销售逼单 话术', '客户异议 分类 处理',
    '快消品 终端话术', '跨境电商 销售技巧',
    '金融理财 异议处理', '家居建材 销售话术',
  ];

  console.log('Phase 1: Search (' + queries.length + ' queries)');
  const allResults = [];

  for (let i = 0; i < queries.length; i++) {
    process.stdout.write('[' + (i+1) + '] ' + queries[i].slice(0, 20) + '...');
    try {
      await page.goto('https://www.google.com/search?q=' + encodeURIComponent(queries[i]) + '&hl=zh-CN&num=5', { waitUntil: 'networkidle', timeout: 20000 });
      await page.waitForTimeout(1000);
      const results = await page.evaluate(() => {
        const items = [];
        document.querySelectorAll('.g, .tF2Cxc').forEach(el => {
          const t = el.querySelector('h3')?.innerText?.trim();
          const c = el.querySelector('.VwiC3b, .IsZvec')?.innerText?.trim();
          const l = el.querySelector('a')?.href;
          if (t && c && l && !l.includes('google.com')) items.push({ title: t.slice(0,200), content: c.slice(0,800), url: l });
        });
        return items.slice(0, 3);
      });
      allResults.push(...results.map(r => ({ ...r, query: queries[i] })));
      console.log(' ' + results.length);
    } catch (e) { console.log(' err'); }
  }

  const seen = new Set();
  const unique = allResults.filter(r => { if (seen.has(r.url)) return false; seen.add(r.url); return true; });
  console.log('\nUnique URLs:', unique.length);

  console.log('\nPhase 2: Fetch (' + unique.length + ' URLs)');
  const articles = [];
  for (let i = 0; i < unique.length; i++) {
    if (i % 20 === 0) console.log('Progress: ' + i + '/' + unique.length);
    try {
      await page.goto(unique[i].url, { waitUntil: 'domcontentloaded', timeout: 10000 });
      await page.waitForTimeout(1000);
      const content = await page.evaluate(() => {
        const el = document.querySelector('article, .Post-RichText, .RichContent-inner, .article-content, main, .content, .article-body, .post-content');
        return el ? el.innerText.slice(0, 6000) : '';
      });
      if (content && content.length > 200) articles.push({ ...unique[i], content });
    } catch (e) {}
  }
  console.log('Fetched:', articles.length);

  console.log('\nPhase 3: Extract');
  const keywords = ['话术','异议','客户','销售','成交','促单','信任','价格','太贵','考虑','对比','竞品','心理学','损失厌恶','锚定','开场白','跟进','需求挖掘','SPIN','促成','逼单','报价','谈判','价值','方案'];
  const items = [];
  const cSeen = new Set();

  for (const a of articles) {
    for (const p of a.content.split(/\n\n+/).filter(x => x.length > 50 && x.length < 2000)) {
      const m = keywords.filter(k => p.includes(k));
      if (m.length < 2) continue;
      const key = p.slice(0, 100);
      if (cSeen.has(key)) continue;
      cSeen.add(key);

      let type = 'general';
      if (p.includes('异议')||p.includes('太贵')||p.includes('考虑')||p.includes('竞品')) type = 'objection_handling';
      else if (p.includes('开场白')) type = 'opening';
      else if (p.includes('成交')||p.includes('促单')||p.includes('逼单')) type = 'closing';
      else if (p.includes('心理学')||p.includes('损失厌恶')||p.includes('锚定')) type = 'psychology';
      else if (p.includes('跟进')) type = 'follow_up';
      else if (p.includes('信任')) type = 'trust_building';
      else if (p.includes('需求挖掘')||p.includes('SPIN')) type = 'needs_discovery';
      else if (p.includes('报价')||p.includes('谈判')) type = 'price_negotiation';

      let industry = '通用';
      const q = a.query + ' ' + a.title;
      if (q.includes('保险')) industry = '保险';
      else if (q.includes('房产')||q.includes('楼盘')||q.includes('置业')) industry = '房产';
      else if (q.includes('教育')||q.includes('课程')||q.includes('培训')) industry = '教育';
      else if (q.includes('汽车')||q.includes('4S')) industry = '汽车';
      else if (q.includes('SaaS')||q.includes('B2B')) industry = 'SaaS';
      else if (q.includes('金融')||q.includes('理财')) industry = '金融';
      else if (q.includes('快消')) industry = '快消品';
      else if (q.includes('跨境')) industry = '跨境电商';
      else if (q.includes('家居')||q.includes('装修')) industry = '家居';
      else if (q.includes('医疗')) industry = '医疗';

      items.push({ knowledge_type: type, industry, content: p.slice(0, 500), source: a.title.slice(0, 100), matchedKeywords: m });
    }
  }

  console.log('Extracted:', items.length);

  // 统计
  const byType = {}, byInd = {};
  for (const i of items) { byType[i.knowledge_type] = (byType[i.knowledge_type]||0)+1; byInd[i.industry] = (byInd[i.industry]||0)+1; }
  console.log('By type:', JSON.stringify(byType));
  console.log('By industry:', JSON.stringify(byInd));

  // 生成 SQL
  const values = items.map(item => {
    const id = crypto.randomUUID();
    const tags = [item.industry, item.knowledge_type, ...item.matchedKeywords.slice(0, 3)].filter(Boolean);
    const c = item.content.replace(/'/g, "''").slice(0, 500);
    const s = (item.source || '').replace(/'/g, "''").slice(0, 200);
    return `( '${id}', null, '${s}', '${c}', '${JSON.stringify(tags)}', '${item.industry}', 0.7, 'ACTIVE', '${item.knowledge_type}', null, null, null, null, NOW() )`;
  });

  const sql = `INSERT INTO knowledge_items (id, user_id, source, content, tags, industry, weight, status, knowledge_type, scenario, customer_voice, response_example, psychology_tags, created_at) VALUES \n${values.join(',\n')};`;
  fs.writeFileSync('C:/Users/Administrator/Desktop/sales-ai-coach/migrations/002_seed_sales_knowledge.sql', sql);
  console.log('\nSaved SQL:', values.length, 'items');

  await browser.close();
  console.log('DONE');
})().catch(e => console.error('Fatal:', e.message));

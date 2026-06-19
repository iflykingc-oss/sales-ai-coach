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

  const queries = [
    // 保险
    '保险销售话术 太贵了 实战案例', '保险异议处理 客户说不需要',
    '保险销冠 经验分享 成交', '保险销售 开场白 技巧',
    '重疾险销售 客户犹豫 促单', '保险销售 促成成交 方法',
    '保险客户 跟进维护', '保险销售 信任建立',
    '保险理赔 异议处理', '养老保险 销售话术',
    // 房产
    '房产销售话术 客户说贵', '置业顾问 异议处理 实战',
    '房产销售 客户犹豫 促单', '卖房技巧 开场白 需求挖掘',
    '楼盘销售 竞品对比', '房产中介 跟进客户',
    '二手房销售 异议处理', '商业地产 销售技巧',
    '房产销售 价格谈判', '买房客户 异议处理',
    // 教育
    '课程顾问 异议处理 实战', '教育销售 客户说贵',
    '培训机构 招生话术', '早教销售 异议处理',
    'K12教育 销售话术', '职业培训 销售技巧',
    '在线教育 销售话术', '教育机构 家长异议',
    // 汽车
    '汽车销售话术 价格谈判', '4S店 异议处理 实战',
    '汽车销售 客户犹豫 促成', '新能源汽车 销售话术',
    '二手车销售 话术', '汽车金融 销售异议',
    '汽车保养 销售话术', '豪华车 销售技巧',
    // SaaS/B2B
    'SaaS销售 异议处理', 'B2B销售 需求挖掘 SPIN',
    '企业级销售 方案呈现', 'SaaS销售 客户说贵',
    'CRM销售 异议处理', '云计算 销售话术',
    '企业软件 销售技巧', 'B2B 促成成交',
    // 通用
    '销售异议处理 话术大全', '销冠经验分享 成交技巧',
    '销售开场白 话术 技巧', '销售促成成交 话术',
    '销售需求挖掘 SPIN提问', '销售心理学 损失厌恶',
    '销售心理学 锚定效应', '客户说再考虑 怎么回应',
    '客户说没时间 销售话术', '客户说要和领导商量',
    '销售竞品对比 话术', '销售信任建立 方法',
    '电话销售 开场白 不被挂', '微信销售 朋友圈 经营',
    '面销技巧 肢体语言', '销售跟进 客户维护',
    '销售逼单 话术', '客户异议 分类 处理',
    '销售漏斗 管理', '顾问式销售 技巧',
    // 行业专项
    '金融理财 异议处理', '医疗健康 客户异议',
    '快消品 终端话术', '跨境电商 销售技巧',
    '零售 连带销售', '餐饮招商 销售话术',
    '美容院 销售话术', '健身房 销售话术',
    '家居建材 销售话术', '装修销售 异议处理',
    '旅游销售 话术', '母婴产品 销售话术',
    '服装销售 连带话术', '家电销售 异议处理',
  ];

  console.log('=== Phase 1: Google Search ===');
  console.log('Total queries:', queries.length);

  const allResults = [];
  for (let i = 0; i < queries.length; i++) {
    const query = queries[i];
    process.stdout.write('[' + (i+1) + '/' + queries.length + '] ' + query.slice(0, 25) + '...');
    try {
      await page.goto('https://www.google.com/search?q=' + encodeURIComponent(query) + '&hl=zh-CN&num=10', { waitUntil: 'networkidle', timeout: 25000 });
      await page.waitForTimeout(1200);

      const results = await page.evaluate(() => {
        const items = [];
        document.querySelectorAll('.g, .tF2Cxc').forEach(el => {
          const title = el.querySelector('h3')?.innerText?.trim();
          const content = el.querySelector('.VwiC3b, .IsZvec')?.innerText?.trim();
          const link = el.querySelector('a')?.href;
          if (title && content && link && !link.includes('google.com') && content.length > 30) {
            items.push({ title: title.slice(0, 200), content: content.slice(0, 800), url: link });
          }
        });
        return items.slice(0, 5);
      });
      allResults.push(...results.map(r => ({ ...r, query })));
      console.log(' ' + results.length);
    } catch (e) {
      console.log(' err');
    }
  }

  const seen = new Set();
  const unique = allResults.filter(r => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });
  console.log('\nUnique URLs:', unique.length);

  console.log('\n=== Phase 2: Fetch Content ===');
  const articles = [];
  for (let i = 0; i < unique.length; i++) {
    const { url, title, query } = unique[i];
    if (i % 30 === 0) console.log('Progress: ' + i + '/' + unique.length);
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 12000 });
      await page.waitForTimeout(1200);
      const content = await page.evaluate(() => {
        const el = document.querySelector('article, .Post-RichText, .RichContent-inner, .article-content, main, .content, .article-body, .post-content, #js_content');
        return el ? el.innerText.slice(0, 8000) : '';
      });
      if (content && content.length > 200) {
        articles.push({ url, title, query, content });
      }
    } catch (e) {}
  }
  console.log('Fetched articles:', articles.length);

  console.log('\n=== Phase 3: Extract Knowledge ===');
  const keywords = ['话术', '异议', '客户', '销售', '成交', '促单', '信任', '价格', '太贵', '考虑', '对比', '竞品', '心理学', '损失厌恶', '锚定', '开场白', '跟进', '朋友圈', '需求挖掘', 'SPIN', '促成', '逼单', '报价', '谈判', '价值', '方案', '演示', '试用'];
  const knowledgeItems = [];
  const contentSeen = new Set();

  for (const article of articles) {
    const paragraphs = article.content.split(/\n\n+/).filter(p => p.length > 50 && p.length < 2000);
    for (const para of paragraphs) {
      const matched = keywords.filter(k => para.includes(k));
      if (matched.length < 2) continue;
      const key = para.slice(0, 100);
      if (contentSeen.has(key)) continue;
      contentSeen.add(key);

      let type = 'general';
      if (para.includes('异议') || para.includes('太贵') || para.includes('考虑') || para.includes('竞品')) type = 'objection_handling';
      else if (para.includes('开场白')) type = 'opening';
      else if (para.includes('成交') || para.includes('促单') || para.includes('逼单')) type = 'closing';
      else if (para.includes('心理学') || para.includes('损失厌恶') || para.includes('锚定')) type = 'psychology';
      else if (para.includes('跟进')) type = 'follow_up';
      else if (para.includes('信任')) type = 'trust_building';
      else if (para.includes('朋友圈')) type = 'social_selling';
      else if (para.includes('需求挖掘') || para.includes('SPIN')) type = 'needs_discovery';
      else if (para.includes('报价') || para.includes('谈判')) type = 'price_negotiation';
      else if (para.includes('方案') || para.includes('演示')) type = 'presentation';
      else if (para.includes('试用')) type = 'trial_close';

      let industry = '通用';
      const q = article.query + ' ' + article.title;
      if (q.includes('保险')) industry = '保险';
      else if (q.includes('房产') || q.includes('楼盘') || q.includes('置业') || q.includes('地产')) industry = '房产';
      else if (q.includes('教育') || q.includes('课程') || q.includes('培训') || q.includes('早教') || q.includes('K12')) industry = '教育';
      else if (q.includes('汽车') || q.includes('4S') || q.includes('新能源') || q.includes('二手车')) industry = '汽车';
      else if (q.includes('SaaS') || q.includes('B2B') || q.includes('CRM') || q.includes('企业软件') || q.includes('云计算')) industry = 'SaaS';
      else if (q.includes('金融') || q.includes('理财') || q.includes('银行')) industry = '金融';
      else if (q.includes('快消')) industry = '快消品';
      else if (q.includes('跨境') || q.includes('外贸')) industry = '跨境电商';
      else if (q.includes('医疗') || q.includes('健康')) industry = '医疗';
      else if (q.includes('美容') || q.includes('健身')) industry = '美业';
      else if (q.includes('家居') || q.includes('装修') || q.includes('建材')) industry = '家居';
      else if (q.includes('零售') || q.includes('服装') || q.includes('家电')) industry = '零售';
      else if (q.includes('餐饮')) industry = '餐饮';
      else if (q.includes('旅游')) industry = '旅游';
      else if (q.includes('母婴')) industry = '母婴';
      else if (q.includes('农资')) industry = '农资';
      else if (q.includes('工业')) industry = '工业品';

      knowledgeItems.push({
        knowledge_type: type,
        industry,
        content: para.slice(0, 500),
        source: article.title.slice(0, 100),
        matchedKeywords: matched,
      });
    }
  }

  console.log('Extracted:', knowledgeItems.length, 'items');

  // 统计
  const byType = {};
  const byIndustry = {};
  for (const item of knowledgeItems) {
    byType[item.knowledge_type] = (byType[item.knowledge_type] || 0) + 1;
    byIndustry[item.industry] = (byIndustry[item.industry] || 0) + 1;
  }
  console.log('By type:', JSON.stringify(byType));
  console.log('By industry:', JSON.stringify(byIndustry));

  // 生成 SQL
  console.log('\n=== Phase 4: Generate SQL ===');
  const values = knowledgeItems.map(item => {
    const id = crypto.randomUUID();
    const tags = [item.industry, item.knowledge_type, ...item.matchedKeywords.slice(0, 3)].filter(Boolean);
    const content = item.content.replace(/'/g, "''").slice(0, 500);
    const source = (item.source || '').replace(/'/g, "''").slice(0, 200);
    return `( '${id}', null, '${source}', '${content}', '${JSON.stringify(tags)}', '${item.industry}', 0.7, 'ACTIVE', '${item.knowledge_type}', null, null, null, null, NOW() )`;
  });

  const sql = `INSERT INTO knowledge_items (id, user_id, source, content, tags, industry, weight, status, knowledge_type, scenario, customer_voice, response_example, psychology_tags, created_at) VALUES \n${values.join(',\n')};`;

  const sqlPath = 'C:/Users/Administrator/Desktop/sales-ai-coach/migrations/002_seed_sales_knowledge.sql';
  fs.writeFileSync(sqlPath, sql);
  console.log('Saved SQL:', values.length, 'items to', sqlPath);

  await browser.close();
  console.log('\n=== DONE ===');
})().catch(e => console.error('Fatal:', e.message));

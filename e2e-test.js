const { chromium } = require('playwright');

const BASE = 'https://www.aisalecoach.work';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const results = [];
  const test = (name, pass, detail = '') => {
    results.push({ name, pass, detail });
    console.log(`${pass ? '✓' : '✗'} ${name}${detail ? ' — ' + detail : ''}`);
  };

  try {
    // 1. Landing Page
    console.log('\n=== LANDING PAGE ===');
    await page.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
    const landingTitle = await page.textContent('h1');
    test('Landing page loads', landingTitle?.includes('销冠') || landingTitle?.includes('销售'));
    test('Landing has features section', (await page.textContent('body')).includes('核心功能'));
    test('Landing has pricing section', (await page.textContent('body')).includes('定价'));

    // 2. Login Page
    console.log('\n=== LOGIN ===');
    await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 15000 });
    const loginTitle = await page.textContent('h1');
    test('Login page loads', loginTitle?.includes('销冠') || loginTitle?.includes('教练'));

    // Fill login form
    await page.fill('input[type="email"]', 'admin@aisalecoach.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Wait for redirect to /app
    await page.waitForURL('**/app**', { timeout: 10000 });
    test('Login redirects to app', page.url().includes('/app'));

    // 3. Dashboard
    console.log('\n=== DASHBOARD ===');
    await page.waitForTimeout(2000);
    const dashContent = await page.textContent('body');
    test('Dashboard loads', dashContent.includes('工作台') || dashContent.includes('首页') || dashContent.includes('欢迎'));

    // 4. Scripts Page
    console.log('\n=== SCRIPTS ===');
    await page.goto(BASE + '/app/scripts', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    const scriptContent = await page.textContent('body');
    test('Script page loads', scriptContent.includes('话术') || scriptContent.includes('生成'));

    // 5. Practice Page
    console.log('\n=== PRACTICE ===');
    await page.goto(BASE + '/app/practice', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    const practiceContent = await page.textContent('body');
    test('Practice page loads', practiceContent.includes('陪练') || practiceContent.includes('练习'));
    test('Practice has mode selector', practiceContent.includes('场景模拟') || practiceContent.includes('实战对练'));
    test('Practice has difficulty selector', practiceContent.includes('难度'));

    // 6. Practice History Page
    console.log('\n=== PRACTICE HISTORY ===');
    await page.goto(BASE + '/app/practice/history', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    const historyContent = await page.textContent('body');
    test('Practice history page loads', historyContent.includes('练习历史') || historyContent.includes('历史'));

    // 7. Knowledge Page
    console.log('\n=== KNOWLEDGE ===');
    await page.goto(BASE + '/app/knowledge', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    const knowledgeContent = await page.textContent('body');
    test('Knowledge page loads', knowledgeContent.includes('知识') || knowledgeContent.includes('库'));

    // 8. Review Page
    console.log('\n=== REVIEW ===');
    await page.goto(BASE + '/app/review', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    const reviewContent = await page.textContent('body');
    test('Review page loads', reviewContent.includes('复盘') || reviewContent.includes('回顾'));

    // 9. Analytics Page
    console.log('\n=== ANALYTICS ===');
    await page.goto(BASE + '/app/analytics', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    const analyticsContent = await page.textContent('body');
    test('Analytics page loads', analyticsContent.includes('分析') || analyticsContent.includes('统计'));

    // 10. Leaderboard Page
    console.log('\n=== LEADERBOARD ===');
    await page.goto(BASE + '/app/leaderboard', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    const leaderboardContent = await page.textContent('body');
    test('Leaderboard page loads', leaderboardContent.includes('排行榜') || leaderboardContent.includes('排名'));

    // 11. Team Page
    console.log('\n=== TEAM ===');
    await page.goto(BASE + '/app/team', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    const teamContent = await page.textContent('body');
    test('Team page loads', teamContent.includes('团队') || teamContent.includes('协作'));

    // 12. Plugin Page
    console.log('\n=== PLUGINS ===');
    await page.goto(BASE + '/app/plugins', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    const pluginContent = await page.textContent('body');
    test('Plugin page loads', pluginContent.includes('插件') || pluginContent.includes('行业'));

    // 13. Admin Page
    console.log('\n=== ADMIN ===');
    await page.goto(BASE + '/app/admin', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    const adminContent = await page.textContent('body');
    test('Admin page loads', adminContent.includes('管理') || adminContent.includes('后台'));
    test('Admin has user management', adminContent.includes('用户'));
    test('Admin has model config', adminContent.includes('模型'));
    test('Admin has knowledge management', adminContent.includes('知识'));

    // 14. Pricing Page
    console.log('\n=== PRICING ===');
    await page.goto(BASE + '/app/pricing', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    const pricingContent = await page.textContent('body');
    test('Pricing page loads', pricingContent.includes('定价') || pricingContent.includes('套餐'));

    // 15. Data Rights Page
    console.log('\n=== DATA RIGHTS ===');
    await page.goto(BASE + '/app/data-rights', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    const dataContent = await page.textContent('body');
    test('Data rights page loads', dataContent.includes('数据') || dataContent.includes('隐私') || dataContent.includes('权利'));

    // 16. Navigation Test
    console.log('\n=== NAVIGATION ===');
    await page.goto(BASE + '/app', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);
    const navContent = await page.textContent('body');
    test('Sidebar has all nav items', navContent.includes('首页') && navContent.includes('话术') && navContent.includes('陪练'));
    test('Sidebar has leaderboard', navContent.includes('排行榜'));

    // 17. Responsive Test
    console.log('\n=== RESPONSIVE ===');
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone size
    await page.goto(BASE + '/app', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);
    const mobileContent = await page.textContent('body');
    test('Mobile viewport loads', mobileContent.includes('首页') || mobileContent.includes('工作台'));

    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    // Take screenshot
    await page.screenshot({ path: 'e2e-final.png', fullPage: true });
    test('Screenshot saved', true, 'e2e-final.png');

  } catch (err) {
    console.error('\nFATAL:', err.message);
    await page.screenshot({ path: 'e2e-error.png', fullPage: true }).catch(() => {});
  }

  await browser.close();

  console.log('\n=== SUMMARY ===');
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => r.pass === false).length;
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => !r.pass).forEach(r => console.log(`  ✗ ${r.name}`));
    process.exit(1);
  }
})();

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
    // 1. Login Page
    console.log('\n=== LOGIN ===');
    await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 15000 });

    // Check for h1 with "销冠AI教练" (actual structure)
    const loginTitle = await page.textContent('h1');
    test('Login page loads', loginTitle?.includes('销冠') || loginTitle?.includes('教练'));

    // Fill login form
    await page.fill('input[type="email"]', 'admin@aisalecoach.com');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Wait for redirect to /app (not /dashboard)
    await page.waitForURL('**/app**', { timeout: 10000 });
    test('Login redirects to app', page.url().includes('/app'));

    // 2. App Layout
    console.log('\n=== APP LAYOUT ===');
    await page.waitForTimeout(2000);
    const appContent = await page.textContent('body');
    test('App has navigation', appContent.includes('工作台') || appContent.includes('仪表盘'));

    // 3. Sessions Page
    console.log('\n=== SESSIONS ===');
    await page.goto(BASE + '/app/sessions', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    const sessionContent = await page.textContent('body');
    test('Session page loads', sessionContent.includes('会话') || sessionContent.includes('管道'));

    // 4. Script Generation
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
    test('Logic framework hidden', !practiceContent.includes('销售逻辑框架'));

    // 6. Review Page
    console.log('\n=== REVIEW ===');
    await page.goto(BASE + '/app/review', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    const reviewContent = await page.textContent('body');
    test('Review page loads', reviewContent.includes('复盘') || reviewContent.includes('回顾'));

    // 7. Knowledge Page
    console.log('\n=== KNOWLEDGE ===');
    await page.goto(BASE + '/app/knowledge', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    const knowledgeContent = await page.textContent('body');
    test('Knowledge page loads', knowledgeContent.includes('知识') || knowledgeContent.includes('库'));

    // 8. Team Page
    console.log('\n=== TEAM ===');
    await page.goto(BASE + '/app/team', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    const teamContent = await page.textContent('body');
    test('Team page loads', teamContent.includes('团队') || teamContent.includes('协作'));

    // 9. Plugin Page
    console.log('\n=== PLUGINS ===');
    await page.goto(BASE + '/app/plugins', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    const pluginContent = await page.textContent('body');
    test('Plugin page loads', pluginContent.includes('插件') || pluginContent.includes('行业'));

    // 10. Achievements Page
    console.log('\n=== ACHIEVEMENTS ===');
    await page.goto(BASE + '/app/achievements', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    const achieveContent = await page.textContent('body');
    test('Achievements page loads', achieveContent.includes('成就') || achieveContent.includes('徽章'));

    // 11. Analytics Page
    console.log('\n=== ANALYTICS ===');
    await page.goto(BASE + '/app/analytics', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    const analyticsContent = await page.textContent('body');
    test('Analytics page loads', analyticsContent.includes('分析') || analyticsContent.includes('统计'));

    // 12. Pricing Page
    console.log('\n=== PRICING ===');
    await page.goto(BASE + '/pricing', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    const pricingContent = await page.textContent('body');
    test('Pricing page loads', pricingContent.includes('定价') || pricingContent.includes('套餐') || pricingContent.includes('方案'));

    // 13. Profile Page
    console.log('\n=== PROFILE ===');
    await page.goto(BASE + '/app/profile', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    const profileContent = await page.textContent('body');
    test('Profile page loads', profileContent.includes('个人') || profileContent.includes('设置'));

    // 14. Admin Page
    console.log('\n=== ADMIN ===');
    await page.goto(BASE + '/app/admin', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    const adminContent = await page.textContent('body');
    test('Admin page loads', adminContent.includes('管理') || adminContent.includes('后台'));
    test('Admin has user management', adminContent.includes('用户'));
    test('Admin has model config', adminContent.includes('模型'));

    // 15. Data Rights Page
    console.log('\n=== DATA RIGHTS ===');
    await page.goto(BASE + '/data-rights', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    const dataContent = await page.textContent('body');
    test('Data rights page loads', dataContent.includes('数据') || dataContent.includes('隐私') || dataContent.includes('权利'));

    // Take screenshot of final state
    await page.screenshot({ path: 'e2e-final.png', fullPage: true });
    test('Screenshot saved', true, 'e2e-final.png');

  } catch (err) {
    console.error('\nFATAL:', err.message);
    await page.screenshot({ path: 'e2e-error.png', fullPage: true }).catch(() => {});
  }

  await browser.close();

  console.log('\n=== SUMMARY ===');
  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => !r.pass).forEach(r => console.log(`  ✗ ${r.name}`));
    process.exit(1);
  }
})();

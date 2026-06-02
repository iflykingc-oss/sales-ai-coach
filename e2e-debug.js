const { chromium } = require('playwright');

const BASE = 'https://www.aisalecoach.work';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    // Take screenshot of login page
    await page.goto(BASE + '/login', { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'e2e-login.png', fullPage: true });
    console.log('Login page screenshot saved');

    // Check what's on the page
    const title = await page.title();
    console.log('Title:', title);

    const bodyText = await page.textContent('body');
    console.log('Body text (first 500):', bodyText?.substring(0, 500));

    // Check for any visible input fields
    const inputs = await page.locator('input').count();
    console.log('Input fields:', inputs);

    const buttons = await page.locator('button').count();
    console.log('Buttons:', buttons);

  } catch (err) {
    console.error('Error:', err.message);
    await page.screenshot({ path: 'e2e-error.png', fullPage: true }).catch(() => {});
  }

  await browser.close();
})();

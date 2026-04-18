const { chromium } = require('playwright');
const { E2E_ADMIN_USER, E2E_ADMIN_PASSWORD } = require('./auth-fixture');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', msg => console.log('CONSOLE:', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  await page.goto('http://localhost:3001');
  await page.waitForTimeout(1000);
  
  // Click "로그인" on landing page
  await page.locator('button:has-text("로그인")').first().click();
  await page.waitForTimeout(1000);
  
  // Login
  await page.locator('input[type="text"]').fill(E2E_ADMIN_USER);
  await page.locator('input[type="password"]').fill(E2E_ADMIN_PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForTimeout(2000);
  
  const content = await page.content();
  console.log(content.substring(0, 2000));
  
  await browser.close();
})();

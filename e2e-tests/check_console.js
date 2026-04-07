const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3001');
  await page.waitForTimeout(2000);
  const content = await page.content();
  console.log(content.includes('아이디를 입력하세요'));
  console.log(content.includes('BATP Platform'));
  await browser.close();
})();

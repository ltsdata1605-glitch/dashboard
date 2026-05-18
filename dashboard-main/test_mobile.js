const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setViewport({ width: 375, height: 812, isMobile: true });
  page.on('pageerror', err => {
    console.log('Page error:', err.toString());
  });
  page.on('console', msg => {
    if (msg.type() === 'error') {
       console.log('Console error:', msg.text());
    }
  });
  await page.goto('http://localhost:3006/');
  await new Promise(r => setTimeout(r, 2000));
  await browser.close();
})();

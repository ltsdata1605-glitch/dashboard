import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 },
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.goto('https://www.thegioididong.com/tim-kiem?key=Asus+TP3407SA', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));
  
  // Log the current URL (might have redirected)
  console.log('URL:', page.url());
  
  // Get ALL li items inside .listproduct
  const data = await page.evaluate(() => {
    const lis = document.querySelectorAll('.listproduct li');
    const results = [];
    for (const li of lis) {
      const aMain = li.querySelector('a.main-contain, a');
      const h3 = li.querySelector('h3');
      const ps = li.querySelectorAll('p');
      const strong = li.querySelector('strong');
      const classes = li.className;
      
      results.push({
        classes,
        hasMainLink: !!aMain,
        linkHref: aMain?.getAttribute('href')?.substring(0, 80),
        h3Text: h3?.textContent?.trim()?.substring(0, 80),
        pTexts: Array.from(ps).map(p => p.textContent?.trim()?.substring(0, 80)),
        strongText: strong?.textContent?.trim(),
        innerHTML: li.innerHTML.substring(0, 300),
      });
    }
    return { count: lis.length, items: results.slice(0, 3) };
  });
  
  console.log(JSON.stringify(data, null, 2));
  
  await browser.close();
})();

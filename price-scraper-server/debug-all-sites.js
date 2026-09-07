import puppeteer from 'puppeteer';

async function debugAllSites() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 },
  });
  
  const query = 'Asus M3407HA';

  // ─── 1. CellphoneS ───
  console.log('\n========== CellphoneS ==========');
  const page1 = await browser.newPage();
  await page1.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page1.goto(`https://cellphones.com.vn/catalogsearch/result/?q=${encodeURIComponent(query)}`, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 4000));
  console.log('Title:', await page1.title());
  console.log('URL:', page1.url());
  
  const cpsData = await page1.evaluate(() => {
    // Get all anchor links with product text
    const items = [];
    document.querySelectorAll('a').forEach(a => {
      const h3 = a.querySelector('h3');
      if (h3) {
        items.push({
          name: h3.textContent.trim(),
          href: a.getAttribute('href'),
          parentClass: a.parentElement?.getAttribute('class')?.substring(0, 80),
        });
      }
    });
    
    // Get all elements with 'price' in class
    const prices = [];
    document.querySelectorAll('[class*="price"]').forEach(el => {
      const cls = el.getAttribute('class') || '';
      const text = el.textContent?.trim();
      if (text && text.length < 50 && text.match(/\d/)) {
        prices.push({ class: cls.substring(0, 60), text });
      }
    });
    
    return { items: items.slice(0, 5), prices: prices.slice(0, 10) };
  });
  console.log('CPS:', JSON.stringify(cpsData, null, 2));
  await page1.screenshot({ path: '/tmp/debug_cellphones.png' });
  await page1.close();

  // ─── 2. FPT Shop ───
  console.log('\n========== FPT Shop ==========');
  const page2 = await browser.newPage();
  await page2.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page2.goto(`https://fptshop.com.vn/tim-kiem?s=${encodeURIComponent(query)}`, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 6000));
  console.log('Title:', await page2.title());
  console.log('URL:', page2.url());
  
  const fptData = await page2.evaluate(() => {
    const items = [];
    document.querySelectorAll('a').forEach(a => {
      const href = a.getAttribute('href') || '';
      if (href.includes('/laptop/') || href.includes('/dien-thoai/') || href.includes('/tablet/')) {
        const h3 = a.querySelector('h3');
        const name = h3 ? h3.textContent.trim() : a.textContent.trim().substring(0, 80);
        if (name.length > 5) {
          items.push({ name, href: href.substring(0, 100) });
        }
      }
    });
    
    const prices = [];
    document.querySelectorAll('[class*="rice"]').forEach(el => {
      const cls = el.getAttribute('class') || '';
      const text = el.textContent?.trim();
      if (text && text.match(/\d/) && text.length < 50) {
        prices.push({ class: cls.substring(0, 60), text });
      }
    });
    
    return { items: items.slice(0, 5), prices: prices.slice(0, 10) };
  });
  console.log('FPT:', JSON.stringify(fptData, null, 2));
  await page2.screenshot({ path: '/tmp/debug_fptshop.png' });
  await page2.close();

  // ─── 3. Viettel Store ───
  console.log('\n========== Viettel Store ==========');
  const page3 = await browser.newPage();
  await page3.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page3.goto(`https://viettelstore.vn/tim-kiem.html?keyword=${encodeURIComponent(query)}`, { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));
  console.log('Title:', await page3.title());
  console.log('URL:', page3.url());
  
  const vtData = await page3.evaluate(() => {
    const items = [];
    // Look for any product container
    document.querySelectorAll('a[href]').forEach(a => {
      const href = a.getAttribute('href') || '';
      if (href.includes('pid') || href.includes('laptop') || href.includes('dien-thoai') || href.includes('.html')) {
        const text = a.textContent?.trim();
        if (text && text.length > 10 && text.length < 200 && !text.includes('\n\n')) {
          items.push({
            text: text.substring(0, 100),
            href: href.substring(0, 120),
            class: a.getAttribute('class')?.substring(0, 60),
            parentClass: a.parentElement?.getAttribute('class')?.substring(0, 60),
          });
        }
      }
    });
    
    const prices = [];
    document.querySelectorAll('[class*="price"], [class*="Price"]').forEach(el => {
      const cls = el.getAttribute('class') || '';
      const text = el.textContent?.trim();
      if (text && text.match(/\d/) && text.length < 80) {
        prices.push({ 
          class: cls.substring(0, 60), 
          text, 
          tag: el.tagName,
          parentClass: el.parentElement?.getAttribute('class')?.substring(0, 60),
        });
      }
    });
    
    return { items: items.slice(0, 10), prices: prices.slice(0, 10) };
  });
  console.log('VT:', JSON.stringify(vtData, null, 2));
  await page3.screenshot({ path: '/tmp/debug_viettelstore.png' });
  await page3.close();
  
  await browser.close();
  console.log('\n✅ Debug complete!');
}

debugAllSites().catch(console.error);

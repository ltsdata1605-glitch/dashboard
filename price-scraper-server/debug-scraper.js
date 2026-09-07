import puppeteer from 'puppeteer';

async function debugScrape() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    defaultViewport: { width: 1280, height: 800 },
  });

  // Test TGDD
  console.log('Testing TGDD...');
  const page1 = await browser.newPage();
  await page1.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  await page1.goto('https://www.thegioididong.com/tim-kiem?key=Asus+TP3407SA', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));
  await page1.screenshot({ path: '/tmp/tgdd_debug.png', fullPage: false });
  
  // Get all product-like elements
  const tgddResult = await page1.evaluate(() => {
    const allElements = document.querySelectorAll('*');
    const priceEls = [];
    for (const el of allElements) {
      const text = el.textContent || '';
      const cls = el.className || '';
      if (typeof cls === 'string' && (cls.includes('price') || cls.includes('product') || cls.includes('item'))) {
        if (text.includes('₫') || text.match(/\d+\.\d+đ/)) {
          priceEls.push({
            tag: el.tagName,
            class: cls.substring(0, 100),
            text: text.substring(0, 200),
          });
        }
      }
    }
    
    // Also try to find .listproduct
    const listProd = document.querySelector('.listproduct');
    const categoryPage = document.querySelector('.CategoryPage');
    const searchResult = document.querySelector('.searchresult, .search-result');
    
    return {
      title: document.title,
      hasListProduct: !!listProd,
      hasCategoryPage: !!categoryPage,
      hasSearchResult: !!searchResult,
      priceElements: priceEls.slice(0, 5),
      bodyText: document.body?.textContent?.substring(0, 500),
    };
  });
  console.log('TGDD Result:', JSON.stringify(tgddResult, null, 2));
  await page1.close();
  
  // Test CellphoneS
  console.log('\nTesting CellphoneS...');
  const page2 = await browser.newPage();
  await page2.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  await page2.goto('https://cellphones.com.vn/catalogsearch/result/?q=Asus+TP3407SA', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3000));
  await page2.screenshot({ path: '/tmp/cellphones_debug.png', fullPage: false });
  
  const cpsResult = await page2.evaluate(() => {
    const allElements = document.querySelectorAll('*');
    const priceEls = [];
    for (const el of allElements) {
      const text = el.textContent || '';
      const cls = el.className || '';
      if (typeof cls === 'string' && (cls.includes('price') || cls.includes('product') || cls.includes('item'))) {
        if (text.includes('₫') || text.match(/\d+/) && text.length < 50) {
          priceEls.push({
            tag: el.tagName,
            class: cls.substring(0, 100),
            text: text.substring(0, 200),
          });
        }
      }
    }
    
    return {
      title: document.title,
      priceElements: priceEls.slice(0, 10),
      bodyClasses: Array.from(document.body?.classList || []).join(', '),
    };
  });
  console.log('CPS Result:', JSON.stringify(cpsResult, null, 2));
  await page2.close();
  
  await browser.close();
}

debugScrape().catch(console.error);

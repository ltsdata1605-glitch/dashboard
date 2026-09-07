import puppeteer from 'puppeteer';
import { isProductMatch, parseVNDPrice } from '../utils/productMatcher.js';

let browserInstance = null;

async function getBrowser() {
  if (!browserInstance || !browserInstance.isConnected()) {
    browserInstance = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--window-size=1280,800'],
      defaultViewport: { width: 1280, height: 800 },
    });
  }
  return browserInstance;
}

export async function closeBrowser() {
  if (browserInstance) { await browserInstance.close(); browserInstance = null; }
}

function findBestMatch(candidates, searchQuery) {
  let best = null;
  let bestConf = 0;
  for (const c of candidates) {
    const m = isProductMatch(searchQuery, c.name);
    if (m.isMatch && m.confidence > bestConf) {
      bestConf = m.confidence;
      best = { ...c, matchInfo: m };
    }
  }
  return best;
}

// ── CellphoneS ──────────────────────────────
// CellphoneS strips URL query params via JS. We use their internal search API.
export async function scrapeCellphones(query) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  
  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    console.log(`  [CellphoneS] Searching: "${query}"`);

    // Try the search API directly
    const apiUrl = `https://cellphones.com.vn/catalogsearch/result/?q=${encodeURIComponent(query)}`;
    await page.goto('https://cellphones.com.vn/', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await new Promise(r => setTimeout(r, 2000));
    
    // Type in the search box
    const searchSelectors = [
      'input[type="search"]',
      'input[placeholder*="Bạn cần tìm"]',
      'input[placeholder*="tìm"]',
      'input.cps-input',
      '.search-bar input',
      'header input',
    ];
    
    let searchInput = null;
    for (const sel of searchSelectors) {
      searchInput = await page.$(sel);
      if (searchInput) break;
    }
    
    if (searchInput) {
      await searchInput.click();
      await new Promise(r => setTimeout(r, 500));
      await searchInput.type(query, { delay: 30 });
      await new Promise(r => setTimeout(r, 2000));
      
      // Check for suggestion dropdown results
      const suggestResults = await page.evaluate(() => {
        const results = [];
        // CellphoneS shows suggestions in a dropdown
        document.querySelectorAll('[class*="suggest"] a, [class*="search-result"] a, [class*="search-popup"] a, [class*="result"] a').forEach(a => {
          const href = a.getAttribute('href') || '';
          const text = a.textContent?.trim();
          if (text && text.length > 10 && href.includes('cellphones.com.vn')) {
            results.push({ name: text.substring(0, 150), link: href });
          }
        });
        return results;
      });
      
      if (suggestResults.length > 0) {
        // Use suggestion results
        const candidates = suggestResults.map(r => ({ ...r, price: 0, priceText: '' }));
        // We need to visit each candidate to get price
        for (const c of candidates.slice(0, 3)) {
          try {
            const detailPage = await browser.newPage();
            await detailPage.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
            await detailPage.goto(c.link, { waitUntil: 'networkidle2', timeout: 15000 });
            await new Promise(r => setTimeout(r, 2000));
            
            const priceData = await detailPage.evaluate(() => {
              const priceEl = document.querySelector('[class*="product-price"] span, [class*="tpt-box"] p, [class*="product__price"] span, .box-info__box-price span, .product__price--show');
              return priceEl ? priceEl.textContent?.trim() : '';
            });
            c.priceText = priceData;
            c.price = parseVNDPrice(priceData);
            await detailPage.close();
            if (c.price > 0) break; // Got a price, stop
          } catch (e) { /* ignore */ }
        }
        
        const best = findBestMatch(candidates.filter(c => c.price > 0), query);
        if (best) {
          console.log(`  [CellphoneS] ✅ ${best.name} - ${best.price.toLocaleString()} (${best.matchInfo.reason})`);
          return { found: true, name: best.name, price: best.price, priceFormatted: best.price.toLocaleString('vi-VN') + '₫', link: best.link, site: 'CellphoneS' };
        }
      }
      
      // Press Enter and wait for search results page
      await page.keyboard.press('Enter');
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => null);
      await new Promise(r => setTimeout(r, 4000));
    }
    
    // Parse search results page
    const candidates = await page.evaluate(() => {
      const results = [];
      document.querySelectorAll('a').forEach(a => {
        const h3 = a.querySelector('h3');
        if (!h3) return;
        const name = h3.textContent.trim();
        const href = a.getAttribute('href') || '';
        if (!name || name.length < 5) return;
        
        // Find price near this element
        const container = a.closest('[class*="product"]') || a.parentElement;
        const priceEl = container?.querySelector('[class*="price"]');
        const priceText = priceEl?.textContent?.trim() || '';
        
        results.push({ name, priceText, link: href.startsWith('http') ? href : 'https://cellphones.com.vn' + href });
      });
      return results;
    });
    
    const parsedCandidates = candidates.map(c => ({ ...c, price: parseVNDPrice(c.priceText) })).filter(c => c.price > 0);
    const best = findBestMatch(parsedCandidates, query);
    
    if (best) {
      console.log(`  [CellphoneS] ✅ ${best.name} - ${best.price.toLocaleString()} (${best.matchInfo.reason})`);
      return { found: true, name: best.name, price: best.price, priceFormatted: best.price.toLocaleString('vi-VN') + '₫', link: best.link, site: 'CellphoneS' };
    }
    
    console.log(`  [CellphoneS] ❌ Not found (${candidates.length} candidates)`);
    return { found: false, name: '', price: 0, priceFormatted: '', link: '', site: 'CellphoneS' };
    
  } catch (err) {
    console.error(`  [CellphoneS] Error: ${err.message}`);
    return { found: false, name: '', price: 0, priceFormatted: '', link: '', site: 'CellphoneS', error: err.message };
  } finally {
    await page.close();
  }
}

// ── FPT Shop ────────────────────────────────
// FPT Shop uses Next.js CSR. Product cards use div.cardInfo with h3 and a[title].
export async function scrapeFPTShop(query) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  
  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    const searchUrl = `https://fptshop.com.vn/tim-kiem?s=${encodeURIComponent(query)}`;
    console.log(`  [FPT Shop] Searching: ${searchUrl}`);
    
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 6000));
    
    const candidates = await page.evaluate(() => {
      const results = [];
      
      // FPT Shop confirmed structure: div.cardInfo contains product cards
      // h3 has the product name
      // a[title] has full name + href to product page
      // Price is in span with line-through (old) and another span (new price)
      
      const cards = document.querySelectorAll('div.cardInfo, [class*="cardInfo"]');
      for (const card of cards) {
        // Get product name from h3
        const h3 = card.querySelector('h3');
        if (!h3) continue;
        const name = h3.textContent.trim();
        
        // Get link from a[title] which contains the full product name
        const productLink = card.querySelector('a[title]');
        let link = '';
        let fullName = name;
        if (productLink) {
          const href = productLink.getAttribute('href') || '';
          link = href.startsWith('http') ? href : ('https://fptshop.com.vn' + href);
          fullName = productLink.getAttribute('title') || name;
        }
        
        // Get price - look for the discounted/current price (not line-through)
        // Structure: span.line-through (old price) then span with new price containing ₫ or đ
        const allSpans = card.querySelectorAll('span, p');
        let price = 0;
        let priceText = '';
        
        for (const span of allSpans) {
          const cls = span.getAttribute('class') || '';
          const text = span.textContent.trim();
          
          // Skip old/crossed-out prices
          if (cls.includes('line-through')) continue;
          
          // Look for price with đ/₫ symbol
          if ((text.includes('đ') || text.includes('₫')) && text.match(/\d+\.\d{3}/)) {
            const parsed = parseInt(text.replace(/[^\d]/g, ''), 10);
            if (parsed >= 100000 && parsed <= 500000000) {
              price = parsed;
              priceText = text;
              break;
            }
          }
        }
        
        if (name.length > 5) {
          results.push({ name: fullName, priceText, price, link });
        }
      }
      
      return results;
    });
    
    // Parse prices with our safe parser
    const parsedCandidates = candidates.map(c => ({
      ...c,
      price: c.price > 0 ? c.price : parseVNDPrice(c.priceText),
    })).filter(c => c.price > 0);
    
    const best = findBestMatch(parsedCandidates, query);
    
    if (best) {
      console.log(`  [FPT Shop] ✅ ${best.name} - ${best.price.toLocaleString()} (${best.matchInfo.reason})`);
      return { found: true, name: best.name, price: best.price, priceFormatted: best.price.toLocaleString('vi-VN') + '₫', link: best.link, site: 'FPT Shop' };
    }
    
    console.log(`  [FPT Shop] ❌ Not found (${candidates.length} candidates)`);
    return { found: false, name: '', price: 0, priceFormatted: '', link: '', site: 'FPT Shop' };
    
  } catch (err) {
    console.error(`  [FPT Shop] Error: ${err.message}`);
    return { found: false, name: '', price: 0, priceFormatted: '', link: '', site: 'FPT Shop', error: err.message };
  } finally {
    await page.close();
  }
}

// ── Viettel Store ───────────────────────────
// Confirmed structure:
//   Container: div.product-info-container.product-item.item
//   Name: h3 (inside a child of .product-info)
//   Price: div.price (inside div.block-box-price)
//   Link: a[href] (first child of .product-info)
export async function scrapeViettelStore(query) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  
  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    const searchUrl = `https://viettelstore.vn/tim-kiem.html?keyword=${encodeURIComponent(query)}`;
    console.log(`  [Viettel Store] Searching: ${searchUrl}`);
    
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    
    const candidates = await page.evaluate(() => {
      const results = [];
      
      // Confirmed container: div.product-info-container OR div.product-item
      const containers = document.querySelectorAll('div.product-info-container, div.product-item');
      
      for (const container of containers) {
        // Product name in h3
        const h3 = container.querySelector('h3');
        if (!h3) continue;
        const name = h3.textContent.trim();
        
        // Price in div.price (NOT div.price-old)
        const priceEl = container.querySelector('div.price:not(.price-old)');
        const priceText = priceEl ? priceEl.textContent.trim() : '';
        
        // Link: first a[href] in the container
        const linkEl = container.querySelector('a[href]');
        let link = '';
        if (linkEl) {
          const href = linkEl.getAttribute('href') || '';
          link = href.startsWith('http') ? href : ('https://viettelstore.vn' + href);
        }
        
        if (name.length > 5) {
          results.push({ name, priceText, link });
        }
      }
      
      return results;
    });
    
    const parsedCandidates = candidates.map(c => ({
      ...c,
      price: parseVNDPrice(c.priceText),
    })).filter(c => c.price > 0);
    
    const best = findBestMatch(parsedCandidates, query);
    
    if (best) {
      console.log(`  [Viettel Store] ✅ ${best.name} - ${best.price.toLocaleString()} (${best.matchInfo.reason})`);
      return { found: true, name: best.name, price: best.price, priceFormatted: best.price.toLocaleString('vi-VN') + '₫', link: best.link, site: 'Viettel Store' };
    }
    
    console.log(`  [Viettel Store] ❌ Not found (${candidates.length} candidates, no match)`);
    return { found: false, name: '', price: 0, priceFormatted: '', link: '', site: 'Viettel Store' };
    
  } catch (err) {
    console.error(`  [Viettel Store] Error: ${err.message}`);
    return { found: false, name: '', price: 0, priceFormatted: '', link: '', site: 'Viettel Store', error: err.message };
  } finally {
    await page.close();
  }
}

// ── TGDD ────────────────────────────────────
export async function scrapeTGDD(query) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  
  try {
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    const searchUrl = `https://www.thegioididong.com/tim-kiem?key=${encodeURIComponent(query)}`;
    console.log(`  [TGDD] Searching: ${searchUrl}`);
    
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    
    const candidates = await page.evaluate(() => {
      const results = [];
      const items = document.querySelectorAll('.listproduct li.item');
      
      for (const item of items) {
        if (item.classList.contains('hide') || item.classList.contains('top20ProductFilter')) continue;
        
        const mainLink = item.querySelector('a[href]');
        if (!mainLink) continue;
        
        const dataName = mainLink.getAttribute('data-name') || '';
        const nameEl = mainLink.querySelector('p');
        const productName = dataName || (nameEl ? nameEl.textContent.trim() : '');
        if (!productName) continue;
        
        const priceEl = item.querySelector('strong');
        const priceText = priceEl ? priceEl.textContent.trim() : '';
        
        const href = mainLink.getAttribute('href') || '';
        const link = href.startsWith('http') ? href : ('https://www.thegioididong.com' + href);
        
        results.push({ name: productName, priceText, link });
      }
      return results;
    });
    
    const parsedCandidates = candidates.map(c => ({ ...c, price: parseVNDPrice(c.priceText) })).filter(c => c.price > 0);
    const best = findBestMatch(parsedCandidates, query);
    
    if (best) {
      console.log(`  [TGDD] ✅ ${best.name} - ${best.price.toLocaleString()} (${best.matchInfo.reason})`);
      return { found: true, name: best.name, price: best.price, priceFormatted: best.price.toLocaleString('vi-VN') + '₫', link: best.link, site: 'Thế Giới Di Động' };
    }
    
    console.log(`  [TGDD] ❌ Not found (${candidates.length} candidates)`);
    return { found: false, name: '', price: 0, priceFormatted: '', link: '', site: 'Thế Giới Di Động' };
    
  } catch (err) {
    console.error(`  [TGDD] Error: ${err.message}`);
    return { found: false, name: '', price: 0, priceFormatted: '', link: '', site: 'Thế Giới Di Động', error: err.message };
  } finally {
    await page.close();
  }
}

export const SCRAPERS = {
  'cellphones': { name: 'CellphoneS', fn: scrapeCellphones, url: 'https://cellphones.com.vn' },
  'fptshop': { name: 'FPT Shop', fn: scrapeFPTShop, url: 'https://fptshop.com.vn' },
  'viettelstore': { name: 'Viettel Store', fn: scrapeViettelStore, url: 'https://viettelstore.vn' },
  'tgdd': { name: 'Thế Giới Di Động', fn: scrapeTGDD, url: 'https://www.thegioididong.com' },
};

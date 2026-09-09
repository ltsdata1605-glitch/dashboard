import express from 'express';
import cors from 'cors';
import { SCRAPERS, closeBrowser } from './scrapers/index.js';
import { normalizeProductName } from './utils/nameNormalizer.js';

const app = express();
const PORT = 3456;
// Chỉ lắng nghe trên máy này (KE_HOACH_TONG_THE.md mục 2.7, vá 2026-09-09).
// Trước đây `app.listen(PORT)` mặc định bind 0.0.0.0 = MỌI card mạng, nên bất kỳ máy nào trong
// cùng Wi-Fi (siêu thị, quán cà phê...) đều gọi được server này: chạy Puppeteer tốn CPU/mạng của
// máy bạn, và biết được máy bạn đang bật nó. Server này không có xác thực và cũng không cần —
// nó chỉ phục vụ đúng tab "So sánh giá" chạy trên chính máy này.
const HOST = '127.0.0.1';

// CORS: chỉ cho trang chạy trên chính máy này gọi vào.
// Trước đây `cors()` cho phép MỌI origin — nghĩa là bất kỳ website nào bạn đang mở trong trình
// duyệt cũng có thể âm thầm POST vào http://localhost:3456 để bắt máy bạn đi cào giá.
// Cho phép mọi cổng của localhost/127.0.0.1 vì cổng dev thay đổi (5173 khi `npm run dev`,
// 4173 khi `npm run preview`...), nhưng chặn mọi tên miền bên ngoài.
const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
app.use(cors({
  origin: (origin, cb) => {
    // origin rỗng = gọi trực tiếp (curl, EventSource cùng origin) → vẫn cho qua.
    if (!origin || LOCAL_ORIGIN.test(origin)) return cb(null, true);
    // CỐ Ý ném lỗi (chặn ngay tại server) thay vì `cb(null, false)`: cách kia vẫn để request
    // CHẠY và chỉ trình duyệt chặn đọc kết quả — nghĩa là trang độc vẫn bắt được máy này đi cào
    // giá, chỉ là không đọc được kết quả. Ném lỗi thì handler không bao giờ chạy.
    const err = new Error(`CORS: origin không được phép — ${origin}`);
    err.status = 403;
    return cb(err);
  },
}));
app.use(express.json({ limit: '10mb' }));

// Store active SSE connections for progress updates
const activeConnections = new Map();

/**
 * POST /api/scrape-prices
 * 
 * Body: {
 *   products: [{ name: string, sku?: string, group?: string }],
 *   competitors: string[], // keys from SCRAPERS: 'cellphones', 'fptshop', 'viettelstore', 'tgdd'
 *   mainSite?: string,     // key of the main site (default: 'tgdd')
 *   sessionId?: string     // for SSE progress updates
 * }
 * 
 * Response: {
 *   results: [{
 *     product: { name, sku, group, searchQuery },
 *     prices: {
 *       [siteKey]: { found, name, price, priceFormatted, link, site }
 *     }
 *   }],
 *   summary: { total, found, notFound, timestamp }
 * }
 */
app.post('/api/scrape-prices', async (req, res) => {
  const { products = [], competitors = [], mainSite = 'tgdd', sessionId } = req.body;
  
  if (!products.length) {
    return res.status(400).json({ error: 'Danh sách sản phẩm trống' });
  }
  
  // Validate competitor keys
  const allSiteKeys = [...new Set([mainSite, ...competitors])];
  const validSites = allSiteKeys.filter(key => SCRAPERS[key]);
  
  if (!validSites.length) {
    return res.status(400).json({ error: 'Không có trang web hợp lệ' });
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Starting price comparison for ${products.length} products across ${validSites.length} sites`);
  console.log(`Sites: ${validSites.map(k => SCRAPERS[k].name).join(', ')}`);
  console.log(`${'='.repeat(60)}\n`);
  
  const results = [];
  
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const searchQuery = normalizeProductName(product.name);
    
    console.log(`\n[${i + 1}/${products.length}] "${product.name}"`);
    console.log(`  Search query: "${searchQuery}"`);
    
    // Send progress via SSE if sessionId is provided
    if (sessionId) {
      const sseConn = activeConnections.get(sessionId);
      if (sseConn) {
        sseConn.write(`data: ${JSON.stringify({
          type: 'progress',
          current: i + 1,
          total: products.length,
          product: product.name,
          searchQuery,
        })}\n\n`);
      }
    }
    
    const prices = {};
    
    // Scrape each site sequentially (to avoid overwhelming browsers)
    for (const siteKey of validSites) {
      const scraper = SCRAPERS[siteKey];
      try {
        const result = await scraper.fn(searchQuery);
        prices[siteKey] = result;
      } catch (err) {
        console.error(`  Error scraping ${scraper.name}: ${err.message}`);
        prices[siteKey] = {
          found: false,
          name: '',
          price: 0,
          priceFormatted: '',
          link: '',
          site: scraper.name,
          error: err.message,
        };
      }
    }
    
    results.push({
      product: {
        name: product.name,
        sku: product.sku || '',
        group: product.group || '',
        searchQuery,
      },
      prices,
    });
    
    // Small delay between products to be polite
    if (i < products.length - 1) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  
  // Send completion via SSE
  if (sessionId) {
    const sseConn = activeConnections.get(sessionId);
    if (sseConn) {
      sseConn.write(`data: ${JSON.stringify({ type: 'complete', total: products.length })}\n\n`);
    }
  }
  
  const summary = {
    total: products.length,
    sites: validSites.map(k => SCRAPERS[k].name),
    timestamp: new Date().toISOString(),
  };
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Completed! ${products.length} products scraped.`);
  console.log(`${'='.repeat(60)}\n`);
  
  res.json({ results, summary });
});

/**
 * GET /api/progress/:sessionId
 * SSE endpoint for real-time progress updates
 */
app.get('/api/progress/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });
  
  activeConnections.set(sessionId, res);
  
  // Send initial connection event
  res.write(`data: ${JSON.stringify({ type: 'connected', sessionId })}\n\n`);
  
  req.on('close', () => {
    activeConnections.delete(sessionId);
  });
});

/**
 * GET /api/sites
 * Returns available scraper sites
 */
app.get('/api/sites', (req, res) => {
  const sites = Object.entries(SCRAPERS).map(([key, val]) => ({
    key,
    name: val.name,
    url: val.url,
  }));
  res.json({ sites });
});

/**
 * POST /api/normalize-name
 * Test endpoint for name normalization
 */
app.post('/api/normalize-name', (req, res) => {
  const { name } = req.body;
  const normalized = normalizeProductName(name);
  res.json({ original: name, normalized });
});

/**
 * GET /api/health
 * Health check
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  await closeBrowser();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeBrowser();
  process.exit(0);
});

// Trả 403 rõ ràng cho request bị CORS chặn, thay vì 500 khó hiểu.
app.use((err, _req, res, next) => {
  if (err && String(err.message || '').startsWith('CORS:')) {
    return res.status(err.status || 403).json({ error: err.message });
  }
  return next(err);
});

app.listen(PORT, HOST, () => {
  console.log(`\n🚀 Price Scraper Server running on http://${HOST}:${PORT} (chỉ máy này truy cập được)`);
  console.log(`   - POST /api/scrape-prices  — Scrape prices for products`);
  console.log(`   - GET  /api/sites          — List available sites`);
  console.log(`   - GET  /api/health         — Health check`);
  console.log(`   - GET  /api/progress/:id   — SSE progress stream\n`);
});

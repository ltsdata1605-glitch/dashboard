import express from 'express';
import cors from 'cors';
import { SCRAPERS, closeBrowser } from './scrapers/index.js';
import { normalizeProductName } from './utils/nameNormalizer.js';

const app = express();
const PORT = 3456;

app.use(cors());
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

app.listen(PORT, () => {
  console.log(`\n🚀 Price Scraper Server running on http://localhost:${PORT}`);
  console.log(`   - POST /api/scrape-prices  — Scrape prices for products`);
  console.log(`   - GET  /api/sites          — List available sites`);
  console.log(`   - GET  /api/health         — Health check`);
  console.log(`   - GET  /api/progress/:id   — SSE progress stream\n`);
});

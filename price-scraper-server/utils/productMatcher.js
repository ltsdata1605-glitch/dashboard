/**
 * Kiểm tra sản phẩm tìm thấy có khớp với sản phẩm cần tìm hay không.
 * 
 * Chiến lược:
 * 1. Trích xuất model number từ cả 2 tên
 * 2. So sánh brand + model
 * 3. Nếu model trùng → match
 * 4. Nếu không có model rõ ràng → so sánh keyword overlap
 */

// Extract model numbers from product name
// Examples: "TP3407SA", "X1404VA", "AL15-53P-56EC", "DC15250", "14IPH11"
function extractModels(name) {
  if (!name) return [];
  
  // Common model patterns (alphanumeric with at least 1 letter + 1 number)
  const patterns = [
    /\b([A-Z]{1,4}\d{3,6}[A-Z]{0,3})\b/gi,     // TP3407SA, X1404VA, DC15250
    /\b([A-Z]{2,}\d+-\w+)\b/gi,                    // AL15-53P-56EC
    /\b(\d{2}[A-Z]{3}\d{1,2})\b/gi,               // 14IPH11
    /\b([A-Z]\d{4,}[A-Z]*)\b/gi,                   // M3407GA
  ];
  
  const models = new Set();
  for (const pat of patterns) {
    const matches = name.matchAll(pat);
    for (const m of matches) {
      const model = m[1].toUpperCase();
      // Filter out common non-model strings
      if (model.match(/^(WIN\d+|GB\d*|TB\d*|USB\d*|WIFI\d*|BT\d*|SSD\d*|DDR\d*|HDD\d*)$/i)) continue;
      if (model.length >= 4) { // Model should be at least 4 chars
        models.add(model);
      }
    }
  }
  return [...models];
}

// Extract brand name
const KNOWN_BRANDS = [
  'APPLE', 'SAMSUNG', 'XIAOMI', 'OPPO', 'VIVO', 'REALME', 'NOKIA', 'HUAWEI',
  'ASUS', 'ACER', 'DELL', 'HP', 'LENOVO', 'MSI', 'LG', 'SONY', 'TOSHIBA',
  'IPHONE', 'IPAD', 'MACBOOK', 'IMAC', 'MAC',
  'GALAXY', 'REDMI', 'POCO', 'ROG', 'THINKPAD', 'IDEAPAD', 'INSPIRON',
  'PAVILION', 'ENVY', 'SPECTRE', 'ZENBOOK', 'VIVOBOOK', 'TUF',
  'SURFACE', 'MICROSOFT', 'GOOGLE', 'PIXEL', 'ONEPLUS', 'NOTHING',
  'JBL', 'BOSE', 'MARSHALL', 'ANKER', 'GARMIN', 'FITBIT', 'AMAZFIT',
];

function extractBrand(name) {
  if (!name) return '';
  const upper = name.toUpperCase();
  
  // Sort brands by length DESC to match longer names first
  // This prevents "VIVOBOOK" matching "VIVO" instead of "ASUS"
  const sortedBrands = [...KNOWN_BRANDS].sort((a, b) => b.length - a.length);
  
  // Sub-brand to parent mapping (check sub-brands first)
  const SUB_BRAND_TO_PARENT = {
    'VIVOBOOK': 'ASUS', 'ZENBOOK': 'ASUS', 'TUF': 'ASUS', 'ROG': 'ASUS',
    'THINKPAD': 'LENOVO', 'IDEAPAD': 'LENOVO', 'YOGA': 'LENOVO',
    'INSPIRON': 'DELL', 'LATITUDE': 'DELL', 'XPS': 'DELL', 'VOSTRO': 'DELL',
    'PAVILION': 'HP', 'ENVY': 'HP', 'SPECTRE': 'HP', 'VICTUS': 'HP',
    'GALAXY': 'SAMSUNG',
    'REDMI': 'XIAOMI', 'POCO': 'XIAOMI',
    'IPHONE': 'APPLE', 'IPAD': 'APPLE', 'MACBOOK': 'APPLE', 'IMAC': 'APPLE',
  };
  
  // Check sub-brands first (they are more specific)
  for (const [subBrand, parent] of Object.entries(SUB_BRAND_TO_PARENT)) {
    if (upper.includes(subBrand)) return parent;
  }
  
  // Then check main brands, but use word boundaries to avoid false positives
  // e.g. "VIVO" should not match in "VIVOBOOK" (already handled above)
  for (const brand of sortedBrands) {
    // Use word boundary check
    const regex = new RegExp('\\b' + brand + '\\b', 'i');
    if (regex.test(upper)) return brand;
  }
  
  // First word as brand
  const firstWord = name.trim().split(/[\s/]+/)[0]?.toUpperCase();
  return firstWord || '';
}

/**
 * Check if found product matches the searched product.
 * @param {string} searchQuery - The simplified search query (e.g. "Asus TP3407SA")
 * @param {string} foundName - The product name found on the competitor site
 * @returns {{ isMatch: boolean, confidence: number, reason: string }}
 */
export function isProductMatch(searchQuery, foundName) {
  if (!searchQuery || !foundName) {
    return { isMatch: false, confidence: 0, reason: 'Empty name' };
  }
  
  const queryUpper = searchQuery.toUpperCase();
  const foundUpper = foundName.toUpperCase();
  
  // 1. Extract and compare brands
  const queryBrand = extractBrand(searchQuery);
  const foundBrand = extractBrand(foundName);
  
  if (queryBrand && foundBrand && queryBrand !== foundBrand) {
    // Some brands are sub-brands of others
    const brandAliases = {
      'VIVOBOOK': 'ASUS', 'ZENBOOK': 'ASUS', 'TUF': 'ASUS', 'ROG': 'ASUS',
      'THINKPAD': 'LENOVO', 'IDEAPAD': 'LENOVO', 'YOGA': 'LENOVO',
      'INSPIRON': 'DELL', 'LATITUDE': 'DELL', 'XPS': 'DELL', 'VOSTRO': 'DELL',
      'PAVILION': 'HP', 'ENVY': 'HP', 'SPECTRE': 'HP', 'VICTUS': 'HP',
      'GALAXY': 'SAMSUNG',
      'REDMI': 'XIAOMI', 'POCO': 'XIAOMI',
      'IPHONE': 'APPLE', 'IPAD': 'APPLE', 'MACBOOK': 'APPLE',
    };
    
    const qParent = brandAliases[queryBrand] || queryBrand;
    const fParent = brandAliases[foundBrand] || foundBrand;
    
    if (qParent !== fParent) {
      return { isMatch: false, confidence: 0, reason: `Brand mismatch: ${queryBrand} vs ${foundBrand}` };
    }
  }
  
  // 2. Extract and compare model numbers
  const queryModels = extractModels(searchQuery);
  const foundModels = extractModels(foundName);
  
  if (queryModels.length > 0 && foundModels.length > 0) {
    // Check if any query model appears in found models
    for (const qm of queryModels) {
      for (const fm of foundModels) {
        // Exact match
        if (qm === fm) {
          return { isMatch: true, confidence: 95, reason: `Model match: ${qm}` };
        }
        // Partial match (one contains the other)
        if (qm.includes(fm) || fm.includes(qm)) {
          return { isMatch: true, confidence: 80, reason: `Partial model match: ${qm} ~ ${fm}` };
        }
      }
    }
    
    // Models don't match at all
    return { 
      isMatch: false, 
      confidence: 10, 
      reason: `Model mismatch: [${queryModels.join(',')}] vs [${foundModels.join(',')}]` 
    };
  }
  
  // 3. Fallback: keyword overlap check
  const queryWords = queryUpper.split(/[\s/\-_()]+/).filter(w => w.length >= 2);
  const foundWords = foundUpper.split(/[\s/\-_()]+/).filter(w => w.length >= 2);
  
  const commonWords = queryWords.filter(w => foundWords.some(fw => fw.includes(w) || w.includes(fw)));
  const overlap = commonWords.length / Math.max(queryWords.length, 1);
  
  if (overlap >= 0.6) {
    return { isMatch: true, confidence: 70, reason: `Keyword overlap: ${Math.round(overlap * 100)}%` };
  }
  
  return { 
    isMatch: false, 
    confidence: Math.round(overlap * 50), 
    reason: `Low keyword overlap: ${Math.round(overlap * 100)}% (${commonWords.join(', ')})` 
  };
}

/**
 * Parse a Vietnamese price string correctly.
 * Vietnamese prices use dots as thousand separators: "26.590.000₫"
 * Must handle cases where multiple prices appear in the same text.
 * 
 * @param {string} text - Raw text that may contain a price
 * @returns {number} - Price in VND (integer), or 0 if not found
 */
export function parseVNDPrice(text) {
  if (!text || typeof text !== 'string') return 0;
  
  // Match Vietnamese price patterns: XX.XXX.XXX₫ or XX,XXX,XXXđ or just digits
  // Pattern: 1-3 digits, followed by groups of .XXX, optionally ending with ₫ or đ
  const pricePatterns = [
    /(\d{1,3}(?:\.\d{3})+)\s*[₫đ]/g,     // 26.590.000₫
    /(\d{1,3}(?:\.\d{3})+)/g,              // 26.590.000 (without currency symbol)
    /(\d{5,})\s*[₫đ]/g,                     // 26590000₫ (no separators)
  ];
  
  for (const pattern of pricePatterns) {
    const matches = [...text.matchAll(pattern)];
    if (matches.length > 0) {
      // Take the FIRST match (usually the sale/current price)
      const priceStr = matches[0][1];
      const price = parseInt(priceStr.replace(/\./g, ''), 10);
      
      // Sanity check: Vietnamese electronics prices should be between 100K and 500M VND
      if (price >= 100000 && price <= 500000000) {
        return price;
      }
    }
  }
  
  return 0;
}

export default { isProductMatch, parseVNDPrice };

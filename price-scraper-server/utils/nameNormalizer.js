/**
 * Rút gọn tên sản phẩm dài thành search query ngắn hơn để tìm kiếm trên các trang đối thủ.
 * 
 * Ví dụ:
 *  "Asus TP3407SA Ultra 5 226V/16GB/512GB/14"F/Touch/Pen/Win11/(SG349W)/Xám"
 *  → "Asus TP3407SA"
 * 
 *  "Acer Aspire Lite 15 AL15-53P-56EC Core 5 120U/16GB/512GB/15.6"F/Win11/(NX.DG3SV.002.16G)/Bạc"
 *  → "Acer Aspire Lite 15 AL15-53P-56EC"
 *
 *  "Dell 15 DC15250 i7 1355U/16GB/512GB/15.6"F/120Hz/OfficeHS24+365/Win11/(71084747)/Bạc"
 *  → "Dell DC15250"
 */

// Common brand names to help identify product model
const BRANDS = [
  'Apple', 'Samsung', 'Xiaomi', 'OPPO', 'Vivo', 'Realme', 'Nokia', 'Huawei',
  'Asus', 'Acer', 'Dell', 'HP', 'Lenovo', 'MSI', 'LG', 'Sony', 'Toshiba',
  'iPhone', 'iPad', 'MacBook', 'iMac', 'Mac',
  'Galaxy', 'Redmi', 'POCO', 'ROG', 'ThinkPad', 'IdeaPad', 'Inspiron',
  'Pavilion', 'Envy', 'Spectre', 'ZenBook', 'VivoBook', 'TUF',
  'Surface', 'Microsoft', 'Google', 'Pixel', 'OnePlus', 'Nothing',
  'JBL', 'Bose', 'Sony', 'Marshall', 'Harman', 'Anker',
  'Canon', 'Nikon', 'Fujifilm', 'GoPro', 'DJI',
  'Garmin', 'Fitbit', 'Amazfit',
];

/**
 * Normalizes a product name for search.
 * Strategy: Take the brand + model identifier (first 2-4 meaningful words).
 * Remove specs like RAM/Storage/Screen size/Color/SKU.
 * @param {string} fullName - The full product name from the inventory
 * @returns {string} - Shortened name suitable for search queries
 */
export function normalizeProductName(fullName) {
  if (!fullName || typeof fullName !== 'string') return '';
  
  // Remove barcode/SKU numbers (long digit sequences like 0220042003659)
  let cleaned = fullName.replace(/\b0\d{12,}\b/g, '').trim();
  
  // Remove content in parentheses (usually SKU codes)
  cleaned = cleaned.replace(/\([^)]*\)/g, '');
  
  // Remove color suffixes (Vietnamese)
  const colors = ['Xám', 'Bạc', 'Đen', 'Trắng', 'Xanh', 'Đỏ', 'Hồng', 'Vàng', 
                   'Tím', 'Nâu', 'Cam', 'Kem', 'Be', 'Gold', 'Silver', 'Black', 
                   'White', 'Blue', 'Red', 'Pink', 'Green', 'Gray', 'Grey',
                   'Space Gray', 'Midnight', 'Starlight', 'Purple', 'Titanium'];
  
  // Split by / first to separate specs
  const parts = cleaned.split('/');
  
  // The meaningful part is usually before the first spec separator
  // but sometimes the model name contains / (e.g., AL15-53P-56EC)
  // So we take the first part and check if next parts are model continuations
  
  let nameCandidate = parts[0].trim();
  
  // Remove specs patterns from the candidate
  // Remove RAM specs (e.g., 16GB, 8GB)
  nameCandidate = nameCandidate.replace(/\b\d+\s*GB\b/gi, '');
  // Remove storage specs
  nameCandidate = nameCandidate.replace(/\b\d+\s*TB\b/gi, '');
  // Remove screen sizes (e.g., 14", 15.6")
  nameCandidate = nameCandidate.replace(/\b\d+\.?\d*["″']\s*(F|inch)?\b/gi, '');
  // Remove processor specs (e.g., Core 5 120U, i7 1355U, Ultra 5 226V)
  nameCandidate = nameCandidate.replace(/\b(Core\s*\d+|i[3579]\s*\d{4,5}\w*|Ultra\s*\d+\s*\w+|Ryzen\s*\d+\s*\w+|R[357]\s*\d{4}\w*|M[1-4]\s*(Pro|Max|Ultra)?)\b/gi, '');
  // Remove Win11, Win10, Office specs
  nameCandidate = nameCandidate.replace(/\b(Win\d+|Windows\s*\d+|Office\w*)\b/gi, '');
  // Remove Touch/Pen/Hz specs
  nameCandidate = nameCandidate.replace(/\b(Touch|Pen|120Hz|144Hz|60Hz|OLED|IPS|TN|VA)\b/gi, '');
  
  // Remove colors at the end
  for (const color of colors) {
    const regex = new RegExp(`\\b${color}\\b`, 'gi');
    nameCandidate = nameCandidate.replace(regex, '');
  }
  
  // Clean up multiple spaces and trim
  nameCandidate = nameCandidate.replace(/\s+/g, ' ').trim();
  
  // Remove trailing punctuation
  nameCandidate = nameCandidate.replace(/[/\-,;:]+$/, '').trim();
  
  // If still too long (>60 chars), take first 4 words
  if (nameCandidate.length > 60) {
    const words = nameCandidate.split(/\s+/);
    nameCandidate = words.slice(0, 4).join(' ');
  }
  
  // If empty after all cleaning, use first 3 words of original
  if (!nameCandidate || nameCandidate.length < 3) {
    const words = fullName.split(/[\s/]+/);
    nameCandidate = words.slice(0, 3).join(' ');
  }
  
  return nameCandidate;
}

/**
 * Extract the product group number (e.g., "42" from "42 - Laptop")
 * @param {string} groupName 
 * @returns {string}
 */
export function extractGroupNumber(groupName) {
  const match = groupName?.match(/^(\d+)/);
  return match ? match[1] : '';
}

export default { normalizeProductName, extractGroupNumber };

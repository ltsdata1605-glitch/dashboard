import { Product, InventoryItem } from '../types';

function parseBonus(bonusCode: string | undefined | null): { thuongERP: number; thuongNong: number } {
  if (!bonusCode || typeof bonusCode !== 'string') {
    return { thuongERP: 0, thuongNong: 0 };
  }
  
  // Strip any leading non-digit characters to handle prefixes like 'ĐD'
  const cleanedCode = bonusCode.trim().replace(/^[^\d]*/, '');

  // Regex to capture: 1. initial digits (ERP), 2. letters (brand), 3. subsequent digits (Hot Bonus), 4. the rest
  const regex = /^(\d+)([A-Z]+)(\d*)?(.*)?$/;
  const matches = cleanedCode.match(regex);

  if (!matches) {
    return { thuongERP: 0, thuongNong: 0 };
  }

  const erpPoints = parseInt(matches[1] || '0', 10);
  const hotBonusPoints = parseInt(matches[3] || '0', 10);

  return {
    thuongERP: erpPoints * 1000,
    thuongNong: hotBonusPoints * 1000,
  };
}

export function parseCurrency(value: string | number | undefined | null): number {
  if (typeof value === 'number') {
    return value;
  }
  if (!value || typeof value !== 'string') {
    return 0;
  }
  // Removes currency symbols, commas, and any non-digit characters.
  const numericString = value.replace(/[^\d]/g, '');
  return parseInt(numericString, 10) || 0;
}


import { formatCurrency } from '../utils/format';

// Helper function to check if a value looks like a valid MSP (mostly digits, length > 3)
const isValidMsp = (value: unknown): boolean => {
    if (!value) return false;
    const str = String(value).trim();
    // Must be at least 4 chars and contain at least one digit to be a product code
    return str.length >= 4 && /\d/.test(str);
};

export const parseProductFile = (file: File): Promise<{ products: Product[], exportDate: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e: ProgressEvent<FileReader>) => {
      try {
        const data = e.target?.result;
        const XLSX = await import('xlsx');
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        // any: dữ liệu Excel thô, mỗi ô có thể là string/number/Date/null tùy nội dung file
        const json: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Try to find export date from the first few rows (usually in column AI/34)
        // We scan the first 5 rows to find a cell containing "Ngày in:"
        let exportDate = 'N/A';
        for(let i=0; i<Math.min(json.length, 5); i++) {
            const row = json[i];
            const dateCellIndex = row.findIndex((cell) => String(cell).includes('Ngày in:'));
            if (dateCellIndex !== -1) {
                exportDate = String(row[dateCellIndex]);
                break;
            }
        }

        // Process ALL rows (removed .slice(1)) to handle files starting with data at Row 1
        const products: Product[] = json.map((row) => {
          // Default fixed indices
          const colA = row[0] || '';
          const colB = row[1] || '';
          const colE = row[4] || '0';
          const colF = row[5] || '0';
          const colH = row[7] || '';
          
          // SMART PARSING LOGIC
          // Find the "Anchor" column which is "Ngày in:" (Date)
          let dateIndex = -1;
          for (let i = row.length - 1; i > 20; i--) { // Scan backwards from end, assuming Date is towards the right
              if (String(row[i]).toLowerCase().includes('ngày in')) {
                  dateIndex = i;
                  break;
              }
          }

          let colAI, colAJ, colAK;

          if (dateIndex !== -1) {
              // If Anchor found, use relative positions
              colAI = row[dateIndex];         // Date
              colAJ = row[dateIndex + 1];     // Bonus Code (Internal ID)
              colAK = row[dateIndex + 2];     // MSP (Barcode)
          } else {
              // Fallback to fixed indices if Anchor not found
              colAI = row[34] || '';
              colAJ = row[35] || '';
              colAK = row[36] || '';
              
              // Fallback Level 2: If MSP at 36 is empty, look at adjacent columns (37 or 35)
              // This handles slight column shifts
              if (!isValidMsp(colAK)) {
                  if (isValidMsp(row[37])) colAK = row[37]; // Shifted Right
                  else if (isValidMsp(row[35]) && !String(row[35]).match(/[a-zA-Z]/)) colAK = row[35]; // Shifted Left (check if not bonus code)
              }
              
              // Fallback Level 3: Scan last 10 columns for something that looks like a barcode
              if (!isValidMsp(colAK)) {
                  for(let i = row.length - 1; i > 30; i--) {
                      const val = row[i];
                      // Strict check: only digits, length > 8 (typical barcode)
                      if (val && String(val).match(/^\d{8,}$/)) {
                          colAK = val;
                          break;
                      }
                  }
              }
          }

          const { thuongERP, thuongNong } = parseBonus(colAJ);
          const tongThuong = thuongNong * 0.4 + thuongERP;

          return {
            msp: String(colAK || '').trim(),
            sanPham: `${colA} ${colB}`.trim(),
            thuongERP: thuongERP,
            thuongNong: thuongNong,
            tongThuong: tongThuong,
            giaGoc: formatCurrency(parseCurrency(colE)),
            giaGiam: formatCurrency(parseCurrency(colF)),
            khuyenMai: String(colH),
            ngayIn: String(colAI),
            selected: false,
            quantity: 1,
          };
        }).filter(p => p.msp && p.msp !== 'undefined' && p.msp.length > 0); // Strict filter removes empty rows or headers without MSP

        resolve({ products, exportDate });
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = (error) => {
      reject(error);
    };

    reader.readAsArrayBuffer(file);
  });
};

const getArrayBuffer = async (file: File): Promise<ArrayBuffer> => {
  if (typeof file.arrayBuffer === 'function') {
    return await file.arrayBuffer();
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as ArrayBuffer);
    reader.onerror = (e) => reject(e);
    reader.readAsArrayBuffer(file);
  });
};

export const parseInventoryFile = async (file: File): Promise<InventoryItem[]> => {
  const data = await getArrayBuffer(file);
  const XLSX = await import('xlsx');
  const workbook = XLSX.read(data, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  // any: dữ liệu Excel thô, mỗi ô có thể là string/number/Date/null tùy nội dung file
  const json: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  if (!json || json.length === 0) {
    return [];
  }

  // Cấu trúc cột mặc định theo định dạng file tồn kho mới:
  // Cột D (index 3): Ngành hàng
  // Cột E (index 4): Nhóm hàng
  // Cột F (index 5): Nhà sản xuất
  // Cột G (index 6): Mã sản phẩm
  // Cột H (index 7): Tên sản phẩm
  // Cột Q (index 16): Số lượng
  let colNganhHang = 3;
  let colNhomHang = 4;
  let colNhaSanXuat = 5;
  let colMaSanPham = 6;
  let colTenSanPham = 7;
  let colSoLuong = 16;
  let colMaSieuThi = 0;
  let colTenSieuThi = 1;

  let headerRowIndex = -1;

  // Quét 10 dòng đầu để tự động nhận diện dòng tiêu đề nếu có
  for (let i = 0; i < Math.min(json.length, 10); i++) {
    const row = json[i];
    if (!row || !Array.isArray(row)) continue;

    let matchCount = 0;
    row.forEach((cell, idx) => {
      const str = String(cell || '').toLowerCase().trim();
      if (str.includes('ngành hàng')) { colNganhHang = idx; matchCount++; }
      else if (str.includes('nhóm hàng')) { colNhomHang = idx; matchCount++; }
      else if (str.includes('nhà sản xuất') || str.includes('nha san xuat') || str.includes('hãng')) { colNhaSanXuat = idx; matchCount++; }
      else if (str.includes('mã sản phẩm') || str.includes('mã sp') || str === 'msp') { colMaSanPham = idx; matchCount++; }
      else if (str.includes('tên sản phẩm') || str.includes('tên sp')) { colTenSanPham = idx; matchCount++; }
      else if (str.includes('số lượng') || str.includes('tồn') || str === 'sl') { colSoLuong = idx; matchCount++; }
      else if (str.includes('mã siêu thị') || str.includes('mã kho')) { colMaSieuThi = idx; }
      else if (str.includes('tên siêu thị') || str.includes('tên kho')) { colTenSieuThi = idx; }
    });

    if (matchCount >= 2) {
      headerRowIndex = i;
      break;
    }
  }

    let dataStartIndex = 0;
    if (headerRowIndex !== -1) {
      dataStartIndex = headerRowIndex + 1;
    } else if (json.length > 0 && !isValidMsp(json[0]?.[colMaSanPham])) {
      dataStartIndex = 1;
    }

  return json.slice(dataStartIndex).map((row) => {
    if (!row || !Array.isArray(row)) return null;

    const maSanPham = String(row[colMaSanPham] || '').trim();
    if (!maSanPham || !isValidMsp(maSanPham) || maSanPham.toLowerCase().includes('mã')) {
      return null;
    }

    const rawQty = row[colSoLuong];
    let qty = 0;
    if (typeof rawQty === 'number') {
      qty = isNaN(rawQty) ? 0 : rawQty;
    } else if (rawQty) {
      const cleaned = String(rawQty).replace(/,/g, '').trim();
      const parsed = parseFloat(cleaned);
      qty = isNaN(parsed) ? 0 : parsed;
    }

    const nhaSanXuat = String(row[colNhaSanXuat] || '').trim();

    return {
      maSieuThi: String(row[colMaSieuThi] || '').trim(),
      tenSieuThi: String(row[colTenSieuThi] || '').trim(),
      thuongHieu: nhaSanXuat,
      nhaSanXuat,
      nganhHang: String(row[colNganhHang] || '').trim(),
      nhomHang: String(row[colNhomHang] || '').trim(),
      maSanPham,
      tenSanPham: String(row[colTenSanPham] || '').trim(),
      trangThaiKinhDoanh: '',
      trangThaiSanPham: '',
      tongSoLuong: qty,
      soLuongDiDuong: 0,
      soLuongThucTe: qty,
      soLuongDaDat: 0,
      soLuongCoTheBan: qty,
      sucBan: '',
      saleAverage: 0,
      saleEstimate: 0,
    };
  }).filter((item): item is InventoryItem => item !== null);
};

// --- IndexedDB Persistence ---

const DB_NAME = 'ProductSearchDB';
const DB_VERSION = 1;
const STORE_NAME = 'appData';

interface FileInfo {
  fileName: string | null;
  uploadTimestamp: Date | null;
  fileExportDate: string | null;
}

const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject('Error opening IndexedDB.');
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

const getStore = async (mode: IDBTransactionMode) => {
  const db = await getDB();
  return db.transaction(STORE_NAME, mode).objectStore(STORE_NAME);
};

export const saveData = async (products: Product[], fileInfo: FileInfo): Promise<void> => {
  const store = await getStore('readwrite');
  store.put(products, 'products');
  store.put(fileInfo, 'fileInfo');
};

export const saveInventoryData = async (inventory: InventoryItem[], timestamp: Date): Promise<void> => {
    const store = await getStore('readwrite');
    store.put(inventory, 'inventory');
    store.put(timestamp, 'inventoryUploadTimestamp');
};

export const saveDisplayedProducts = async (products: Product[], timestamp?: number): Promise<void> => {
    const store = await getStore('readwrite');
    store.put(products, 'displayedProducts');
    store.put(timestamp || Date.now(), 'displayedProductsLastModified');
};

export const saveEmployeeName = async (name: string): Promise<void> => {
    const store = await getStore('readwrite');
    store.put(name, 'employeeName');
};

interface LoadDataResult {
    products: Product[];
    displayedProducts: Product[];
    inventory: InventoryItem[];
    fileInfo: FileInfo | null;
    employeeName: string;
    inventoryUploadTimestamp: Date | null;
    displayedProductsLastModified: number | null;
}

export const loadData = async (): Promise<LoadDataResult | null> => {
    try {
        const store = await getStore('readonly');
        const productsReq = store.get('products');
        const displayedProductsReq = store.get('displayedProducts');
        const inventoryReq = store.get('inventory');
        const fileInfoReq = store.get('fileInfo');
        const employeeNameReq = store.get('employeeName');
        const inventoryUploadTimestampReq = store.get('inventoryUploadTimestamp');
        const displayedProductsLastModifiedReq = store.get('displayedProductsLastModified');

        return new Promise((resolve) => {
            const results: LoadDataResult = { products: [], displayedProducts: [], inventory: [], fileInfo: null, employeeName: '', inventoryUploadTimestamp: null, displayedProductsLastModified: null };
            let completed = 0;
            const totalRequests = 7;

            const checkCompletion = () => {
                completed++;
                if (completed === totalRequests) {
                   resolve(results);
                }
            };
            
            const onError = () => {
                checkCompletion();
            };

            productsReq.onsuccess = () => {
                results.products = Array.isArray(productsReq.result) ? productsReq.result : [];
                checkCompletion();
            };
            displayedProductsReq.onsuccess = () => {
                results.displayedProducts = Array.isArray(displayedProductsReq.result) ? displayedProductsReq.result : [];
                checkCompletion();
            };
            inventoryReq.onsuccess = () => {
                results.inventory = Array.isArray(inventoryReq.result) ? inventoryReq.result : [];
                checkCompletion();
            };
            fileInfoReq.onsuccess = () => {
                results.fileInfo = fileInfoReq.result;
                checkCompletion();
            };
             employeeNameReq.onsuccess = () => {
                results.employeeName = employeeNameReq.result || '';
                checkCompletion();
            };
            inventoryUploadTimestampReq.onsuccess = () => {
                results.inventoryUploadTimestamp = inventoryUploadTimestampReq.result || null;
                checkCompletion();
            };
            displayedProductsLastModifiedReq.onsuccess = () => {
                results.displayedProductsLastModified = displayedProductsLastModifiedReq.result || null;
                checkCompletion();
            };
            
            productsReq.onerror = onError;
            displayedProductsReq.onerror = onError;
            inventoryReq.onerror = onError;
            fileInfoReq.onerror = onError;
            employeeNameReq.onerror = onError;
            inventoryUploadTimestampReq.onerror = onError;
            displayedProductsLastModifiedReq.onerror = onError;
        });
    } catch (e) {
        console.error("Failed to load data from IndexedDB", e);
        return null;
    }
};

export const clearData = async (): Promise<void> => {
  const store = await getStore('readwrite');
  return new Promise((resolve, reject) => {
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject('Error clearing IndexedDB.');
  });
};
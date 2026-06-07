import { Product, InventoryItem } from '../types';
import * as XLSX from 'xlsx';

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
const isValidMsp = (value: any): boolean => {
    if (!value) return false;
    const str = String(value).trim();
    // Must be at least 4 chars and contain at least one digit to be a product code
    return str.length >= 4 && /\d/.test(str);
};

export const parseProductFile = (file: File): Promise<{ products: Product[], exportDate: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Try to find export date from the first few rows (usually in column AI/34)
        // We scan the first 5 rows to find a cell containing "Ngày in:"
        let exportDate = 'N/A';
        for(let i=0; i<Math.min(json.length, 5); i++) {
            const row = json[i];
            const dateCellIndex = row.findIndex((cell: any) => String(cell).includes('Ngày in:'));
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

export const parseInventoryFile = (file: File): Promise<InventoryItem[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        // Skip header row (row 0)
        const inventory: InventoryItem[] = json.slice(1).map((row) => {
          return {
            maSieuThi: String(row[0] || '').trim(),
            tenSieuThi: String(row[1] || '').trim(),
            thuongHieu: String(row[2] || '').trim(),
            nganhHang: String(row[3] || '').trim(),
            nhomHang: String(row[4] || '').trim(),
            maSanPham: String(row[5] || '').trim(),
            tenSanPham: String(row[6] || '').trim(),
            trangThaiKinhDoanh: String(row[7] || '').trim(),
            trangThaiSanPham: String(row[8] || '').trim(),
            tongSoLuong: Number(row[9] || 0),
            soLuongDiDuong: Number(row[10] || 0),
            soLuongThucTe: Number(row[11] || 0),
            soLuongDaDat: Number(row[12] || 0),
            soLuongCoTheBan: Number(row[13] || 0),
            sucBan: String(row[14] || '').trim(),
            saleAverage: Number(row[15] || 0),
            saleEstimate: Number(row[16] || 0),
          };
        }).filter(item => item.maSanPham);

        resolve(inventory);
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

export const loadData = async (): Promise<{ products: Product[]; displayedProducts: Product[]; inventory: InventoryItem[]; fileInfo: FileInfo | null; employeeName: string; inventoryUploadTimestamp: Date | null; displayedProductsLastModified: number | null; } | null> => {
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
            const results: any = { products: [], displayedProducts: [], inventory: [], fileInfo: null, employeeName: '', inventoryUploadTimestamp: null, displayedProductsLastModified: null };
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
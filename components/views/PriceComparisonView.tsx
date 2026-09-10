import React, { useState, useCallback, useRef, useMemo } from 'react';
import { Button } from '../shared/ui/Button';
import { 
  Search, Upload, Download, Play, Trash2, Plus, X, 
  CheckCircle, AlertCircle, Loader2, FileSpreadsheet,
  Globe, ArrowUpDown, ExternalLink, RefreshCw
} from 'lucide-react';
import * as XLSX from 'xlsx';

// ─── Types ───────────────────────────────────────────────
interface Product {
  name: string;
  sku: string;
  group: string;
}

interface SiteResult {
  found: boolean;
  name: string;
  price: number;
  priceFormatted: string;
  link: string;
  site: string;
  error?: string;
}

interface ProductResult {
  product: {
    name: string;
    sku: string;
    group: string;
    searchQuery: string;
  };
  prices: Record<string, SiteResult>;
}

interface ScrapeResponse {
  results: ProductResult[];
  summary: {
    total: number;
    sites: string[];
    timestamp: string;
  };
}

interface SiteConfig {
  key: string;
  name: string;
  url: string;
  enabled: boolean;
}

interface ProgressData {
  type: 'progress' | 'complete' | 'connected';
  current?: number;
  total?: number;
  product?: string;
  searchQuery?: string;
}

// ─── Constants ───────────────────────────────────────────
const DEFAULT_SITES: SiteConfig[] = [
  { key: 'tgdd', name: 'Thế Giới Di Động', url: 'https://www.thegioididong.com', enabled: true },
  { key: 'cellphones', name: 'CellphoneS', url: 'https://cellphones.com.vn', enabled: true },
  { key: 'fptshop', name: 'FPT Shop', url: 'https://fptshop.com.vn', enabled: true },
  { key: 'viettelstore', name: 'Viettel Store', url: 'https://viettelstore.vn', enabled: true },
];

const API_BASE = 'http://localhost:3456';

// ─── Helpers ─────────────────────────────────────────────
function formatVND(num: number): string {
  if (!num || num <= 0) return '—';
  return num.toLocaleString('vi-VN') + 'đ';
}

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Component ───────────────────────────────────────────
export default function PriceComparisonView({ isActive }: { isActive?: boolean }) {
  // State: Sites config
  const [mainSite, setMainSite] = useState('tgdd');
  const [sites, setSites] = useState<SiteConfig[]>(DEFAULT_SITES);
  
  // State: Products input
  const [products, setProducts] = useState<Product[]>([]);
  const [inputText, setInputText] = useState('');
  
  // State: Scraping
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [results, setResults] = useState<ProductResult[]>([]);
  const [error, setError] = useState('');
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Check server health on mount
  React.useEffect(() => {
    if (!isActive) return;
    checkServerHealth();
  }, [isActive]);

  const checkServerHealth = useCallback(async () => {
    setServerStatus('checking');
    try {
      const res = await fetch(`${API_BASE}/api/health`, { signal: AbortSignal.timeout(5000) });
      if (res.ok) {
        setServerStatus('online');
      } else {
        setServerStatus('offline');
      }
    } catch {
      setServerStatus('offline');
    }
  }, []);

  // Competitor sites (excluding main site)
  const competitorSites = useMemo(
    () => sites.filter(s => s.key !== mainSite && s.enabled),
    [sites, mainSite]
  );

  // ─── Parse Input ─────────────────────────────────────
  const parseTextInput = useCallback(() => {
    if (!inputText.trim()) return;
    
    const lines = inputText.trim().split('\n').filter(l => l.trim());
    const parsed: Product[] = lines.map(line => {
      // Try to parse tab-separated: group \t sku \t name
      const parts = line.split('\t');
      if (parts.length >= 3) {
        return {
          group: parts[0]?.trim() || '',
          sku: parts[1]?.trim() || '',
          name: parts[2]?.trim() || line.trim(),
        };
      }
      // Just product name
      return { name: line.trim(), sku: '', group: '' };
    });
    
    setProducts(prev => [...prev, ...parsed]);
    setInputText('');
  }, [inputText]);

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { header: 1 });
        
        // Try to find header row with "Tên sản phẩm" or similar
        let startRow = 0;
        let nameCol = -1;
        let skuCol = -1;
        let groupCol = -1;
        
        for (let i = 0; i < Math.min(5, rows.length); i++) {
          const row = rows[i] as unknown as string[];
          if (!row) continue;
          for (let j = 0; j < row.length; j++) {
            const val = String(row[j] || '').toLowerCase();
            if (val.includes('tên sản phẩm') || val.includes('ten san pham') || val === 'name') {
              nameCol = j;
              startRow = i + 1;
            }
            if (val.includes('mã sản phẩm') || val.includes('ma san pham') || val === 'sku' || val === 'mã sp') {
              skuCol = j;
            }
            if (val.includes('nhóm hàng') || val.includes('nhom hang') || val === 'group') {
              groupCol = j;
            }
          }
          if (nameCol >= 0) break;
        }
        
        // If no header found, assume first column is name
        if (nameCol < 0) {
          nameCol = 0;
          startRow = 0;
        }
        
        const parsed: Product[] = [];
        for (let i = startRow; i < rows.length; i++) {
          const row = rows[i] as unknown as string[];
          if (!row || !row[nameCol]) continue;
          const name = String(row[nameCol]).trim();
          if (!name) continue;
          parsed.push({
            name,
            sku: skuCol >= 0 ? String(row[skuCol] || '').trim() : '',
            group: groupCol >= 0 ? String(row[groupCol] || '').trim() : '',
          });
        }
        
        if (parsed.length === 0) {
          setError('Không tìm thấy sản phẩm trong file. Hãy đảm bảo file có cột "Tên sản phẩm".');
          return;
        }
        
        setProducts(prev => [...prev, ...parsed]);
        setError('');
      } catch (err) {
        setError('Lỗi đọc file: ' + (err instanceof Error ? err.message : String(err)));
      }
    };
    reader.readAsArrayBuffer(file);
    
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const removeProduct = useCallback((index: number) => {
    setProducts(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearProducts = useCallback(() => {
    setProducts([]);
    setResults([]);
    setProgress(null);
  }, []);

  // ─── Run Scraping ────────────────────────────────────
  const startScraping = useCallback(async () => {
    if (products.length === 0 || isRunning) return;
    
    setIsRunning(true);
    setError('');
    setResults([]);
    
    const sessionId = generateSessionId();
    
    // Setup SSE for progress
    const evtSource = new EventSource(`${API_BASE}/api/progress/${sessionId}`);
    eventSourceRef.current = evtSource;
    
    evtSource.onmessage = (event) => {
      try {
        const data: ProgressData = JSON.parse(event.data);
        setProgress(data);
      } catch { /* ignore parse errors */ }
    };
    
    evtSource.onerror = () => {
      // SSE connection error — continue without progress updates
    };
    
    try {
      const competitorKeys = competitorSites.map(s => s.key);
      
      const response = await fetch(`${API_BASE}/api/scrape-prices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          products: products.map(p => ({ name: p.name, sku: p.sku, group: p.group })),
          competitors: competitorKeys,
          mainSite,
          sessionId,
        }),
      });
      
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server error: ${response.status}`);
      }
      
      const data: ScrapeResponse = await response.json();
      setResults(data.results);
      
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
        setError('Không thể kết nối tới server scraping. Hãy chạy: cd price-scraper-server && npm start');
      } else {
        setError('Lỗi: ' + msg);
      }
    } finally {
      evtSource.close();
      eventSourceRef.current = null;
      setIsRunning(false);
      setProgress(null);
    }
  }, [products, isRunning, competitorSites, mainSite]);

  // ─── Export Excel ────────────────────────────────────
  const exportToExcel = useCallback(() => {
    if (results.length === 0) return;
    
    const allSiteKeys = [mainSite, ...competitorSites.map(s => s.key)];
    
    // Build worksheet data
    const headers = [
      'STT', 'Nhóm hàng', 'Mã SP', 'Tên sản phẩm', 'Từ khóa tìm kiếm',
      ...allSiteKeys.flatMap(key => {
        const site = sites.find(s => s.key === key);
        return [`Giá ${site?.name || key}`, `Link ${site?.name || key}`];
      }),
      'Chênh lệch thấp nhất',
    ];
    
    const rows = results.map((r, idx) => {
      const priceValues = allSiteKeys
        .map(key => r.prices[key]?.price || 0)
        .filter(p => p > 0);
      
      const mainPrice = r.prices[mainSite]?.price || 0;
      const minCompetitorPrice = competitorSites
        .map(s => r.prices[s.key]?.price || 0)
        .filter(p => p > 0);
      const lowestCompetitor = minCompetitorPrice.length > 0 ? Math.min(...minCompetitorPrice) : 0;
      const diff = mainPrice > 0 && lowestCompetitor > 0 ? mainPrice - lowestCompetitor : 0;
      
      return [
        idx + 1,
        r.product.group,
        r.product.sku,
        r.product.name,
        r.product.searchQuery,
        ...allSiteKeys.flatMap(key => {
          const p = r.prices[key];
          return [
            p?.found ? p.price : 'Không KD',
            p?.found ? p.link : '',
          ];
        }),
        diff,
      ];
    });
    
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    
    // Auto column widths
    const colWidths = headers.map((h, i) => {
      const maxLen = Math.max(
        String(h).length,
        ...rows.map(r => String(r[i] || '').length)
      );
      return { wch: Math.min(maxLen + 2, 50) };
    });
    ws['!cols'] = colWidths;
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'So sánh giá');
    
    const fileName = `so-sanh-gia_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, fileName);
  }, [results, mainSite, competitorSites, sites]);

  // ─── Toggle Site ─────────────────────────────────────
  const toggleSite = useCallback((key: string) => {
    setSites(prev => prev.map(s => 
      s.key === key ? { ...s, enabled: !s.enabled } : s
    ));
  }, []);

  // ─── Computed values for results table ───────────────
  const allDisplaySites = useMemo(() => {
    const main = sites.find(s => s.key === mainSite);
    return [main!, ...competitorSites].filter(Boolean);
  }, [sites, mainSite, competitorSites]);

  // ─── Render ──────────────────────────────────────────
  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ArrowUpDown className="w-6 h-6 text-sky-700" />
            So sánh giá đối thủ
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Tự động tìm kiếm và so sánh giá sản phẩm trên các trang TMĐT
          </p>
        </div>
        
        {/* Server Status */}
        <div className="flex items-center gap-2">
          <Button
            variant="unstyled" size="none"
            onClick={checkServerHealth}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition"
            title="Kiểm tra kết nối server"
          >
            <RefreshCw className="w-4 h-4 text-slate-500" />
          </Button>
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
            serverStatus === 'online' 
              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
              : serverStatus === 'offline'
              ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
              : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              serverStatus === 'online' ? 'bg-emerald-500 animate-pulse' 
              : serverStatus === 'offline' ? 'bg-rose-500' 
              : 'bg-amber-500 animate-pulse'
            }`} />
            {serverStatus === 'online' ? 'Server Online' : serverStatus === 'offline' ? 'Server Offline' : 'Đang kiểm tra...'}
          </div>
        </div>
      </div>

      {/* Server offline warning */}
      {serverStatus === 'offline' && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-300">Server scraping chưa chạy</p>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-1">
                Mở terminal và chạy lệnh sau:
              </p>
              <code className="block mt-2 px-3 py-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg text-sm text-amber-900 dark:text-amber-200 font-mono">
                cd price-scraper-server && npm start
              </code>
            </div>
          </div>
        </div>
      )}

      {/* Config Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sites Config */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <h2 className="font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4 text-sky-500" />
            Cấu hình trang web
          </h2>
          
          {/* Main Site */}
          <div className="mb-3">
            <label className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
              Trang chính (của mình)
            </label>
            <select 
              value={mainSite}
              onChange={(e) => setMainSite(e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            >
              {sites.map(s => (
                <option key={s.key} value={s.key}>{s.name} — {s.url}</option>
              ))}
            </select>
          </div>
          
          {/* Competitor Sites */}
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">
              Trang đối thủ
            </label>
            <div className="mt-1 space-y-1.5">
              {sites.filter(s => s.key !== mainSite).map(site => (
                <label 
                  key={site.key}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg border cursor-pointer transition ${
                    site.enabled 
                      ? 'border-sky-200 bg-sky-50/50 dark:border-sky-800 dark:bg-sky-900/20' 
                      : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={site.enabled}
                    onChange={() => toggleSite(site.key)}
                    className="rounded border-slate-300 text-sky-700 focus:ring-sky-500"
                  />
                  <span className={`text-sm ${site.enabled ? 'text-slate-800 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`}>
                    {site.name}
                  </span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 ml-auto">{site.url}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Product Input */}
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4">
          <h2 className="font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            Nhập danh sách sản phẩm
          </h2>
          
          {/* File upload */}
          <div className="flex gap-2 mb-3">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              leftIcon={<Upload className="w-4 h-4" />}
            >
              Upload Excel/CSV
            </Button>
            {products.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearProducts}
                leftIcon={<Trash2 className="w-4 h-4" />}
                className="text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/20"
              >
                Xóa tất cả ({products.length})
              </Button>
            )}
          </div>
          
          {/* Text input */}
          <div className="space-y-2">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste danh sách sản phẩm vào đây (mỗi dòng 1 sản phẩm)&#10;&#10;Hoặc paste từ Excel (Nhóm hàng ⇥ Mã SP ⇥ Tên sản phẩm)..."
              rows={4}
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white text-sm resize-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 placeholder:text-slate-400"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={parseTextInput}
              disabled={!inputText.trim()}
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Thêm vào danh sách
            </Button>
          </div>
        </div>
      </div>

      {/* Product List Preview */}
      {products.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <h3 className="font-medium text-slate-800 dark:text-slate-200">
              📋 Danh sách sản phẩm ({products.length} sản phẩm)
            </h3>
            <Button
              variant="primary"
              size="sm"
              onClick={startScraping}
              disabled={isRunning || serverStatus !== 'online'}
              isLoading={isRunning}
              leftIcon={isRunning ? undefined : <Play className="w-4 h-4" />}
            >
              {isRunning ? 'Đang chạy...' : 'Bắt đầu so sánh giá'}
            </Button>
          </div>
          
          {/* Progress bar */}
          {isRunning && progress && progress.type === 'progress' && (
            <div className="px-4 py-3 bg-sky-50 dark:bg-sky-900/20 border-b border-sky-100 dark:border-sky-800">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-sky-800 dark:text-sky-300 flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang xử lý: <span className="font-medium truncate max-w-[300px]">{progress.product}</span>
                </span>
                <span className="text-sm font-semibold text-sky-700 dark:text-sky-400">
                  {progress.current}/{progress.total}
                </span>
              </div>
              <div className="w-full bg-sky-200 dark:bg-sky-800 rounded-full h-2">
                <div 
                  className="bg-sky-600 h-2 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${((progress.current || 0) / (progress.total || 1)) * 100}%` }}
                />
              </div>
              {progress.searchQuery && (
                <p className="text-xs text-sky-700 dark:text-sky-400 mt-1">
                  Từ khóa: "{progress.searchQuery}"
                </p>
              )}
            </div>
          )}
          
          {/* Product table */}
          <div className="max-h-[300px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700/50 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase w-12">STT</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase w-28">Nhóm</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase w-36">Mã SP</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase">Tên sản phẩm</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {/* key theo NỘI DUNG sản phẩm, không theo index: nút xoá dưới đây gọi
                    removeProduct(idx) → mảng ngắn lại, nếu key là index thì React tái dùng DOM
                    theo VỊ TRÍ khiến các dòng sau trượt lên chiếm DOM của dòng trước (sai trạng
                    thái hover/focus). Trùng key chỉ xảy ra khi dán trùng hệt 1 sản phẩm 2 lần —
                    lúc đó 2 dòng giống hệt nhau nên đổi chỗ cũng không thấy khác biệt. */}
                {products.map((p, idx) => (
                  <tr key={`${p.sku}|${p.name}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                    <td className="px-4 py-2 text-slate-500">{idx + 1}</td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{p.group || '—'}</td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-300 font-mono text-xs">{p.sku || '—'}</td>
                    <td className="px-4 py-2 text-slate-800 dark:text-slate-200">{p.name}</td>
                    <td className="px-2 py-2">
                      <Button
                        variant="unstyled" size="none"
                        onClick={() => removeProduct(idx)}
                        className="p-1 rounded hover:bg-rose-50 dark:hover:bg-rose-900/20 text-slate-400 hover:text-rose-500 transition"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-500 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-rose-800 dark:text-rose-300">Lỗi</p>
            <p className="text-sm text-rose-700 dark:text-rose-400 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Results Table */}
      {results.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between flex-wrap gap-2">
            <h3 className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              Kết quả so sánh giá ({results.length} sản phẩm)
            </h3>
            <Button
              variant="primary"
              size="sm"
              onClick={exportToExcel}
              leftIcon={<Download className="w-4 h-4" />}
            >
              Tải Excel
            </Button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-700/50 sticky top-0 z-10">
                <tr>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase whitespace-nowrap w-10">STT</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase whitespace-nowrap min-w-[120px]">Mã SP</th>
                  <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase whitespace-nowrap min-w-[250px]">Tên sản phẩm</th>
                  {allDisplaySites.map(site => (
                    <th key={site.key} className={`text-right px-3 py-2.5 text-xs font-semibold uppercase whitespace-nowrap min-w-[140px] ${
                      site.key === mainSite 
                        ? 'text-sky-700 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-900/20' 
                        : 'text-slate-500 dark:text-slate-400'
                    }`}>
                      {site.name}
                      {site.key === mainSite && <span className="ml-1 text-[11px]">★</span>}
                    </th>
                  ))}
                  <th className="text-right px-3 py-2.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase whitespace-nowrap min-w-[100px]">Chênh lệch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {results.map((r, idx) => {
                  // Calculate prices for highlighting
                  const allPrices = allDisplaySites
                    .map(s => ({ key: s.key, price: r.prices[s.key]?.price || 0, found: r.prices[s.key]?.found }))
                    .filter(p => p.found && p.price > 0);
                  
                  const minPrice = allPrices.length > 0 ? Math.min(...allPrices.map(p => p.price)) : 0;
                  const maxPrice = allPrices.length > 0 ? Math.max(...allPrices.map(p => p.price)) : 0;
                  
                  const mainPrice = r.prices[mainSite]?.price || 0;
                  const competitorPrices = competitorSites
                    .map(s => r.prices[s.key]?.price || 0)
                    .filter(p => p > 0);
                  const lowestCompetitor = competitorPrices.length > 0 ? Math.min(...competitorPrices) : 0;
                  const diff = mainPrice > 0 && lowestCompetitor > 0 ? mainPrice - lowestCompetitor : 0;
                  
                  return (
                    // key theo sản phẩm, không theo index — kết quả được đổ dần trong lúc quét giá
                    <tr key={`${r.product.sku}|${r.product.name}`} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition">
                      <td className="px-3 py-2.5 text-slate-500">{idx + 1}</td>
                      <td className="px-3 py-2.5 text-slate-600 dark:text-slate-300 font-mono text-xs">{r.product.sku || '—'}</td>
                      <td className="px-3 py-2.5">
                        <div className="text-slate-800 dark:text-slate-200 text-sm">{r.product.name}</div>
                        <div className="text-xs text-slate-400 mt-0.5">🔍 {r.product.searchQuery}</div>
                      </td>
                      {allDisplaySites.map(site => {
                        const p = r.prices[site.key];
                        const isMin = p?.found && p.price === minPrice && allPrices.length > 1;
                        const isMax = p?.found && p.price === maxPrice && allPrices.length > 1 && minPrice !== maxPrice;
                        
                        return (
                          <td key={site.key} className={`px-3 py-2.5 text-right ${
                            site.key === mainSite ? 'bg-sky-50/30 dark:bg-sky-900/10' : ''
                          }`}>
                            {p?.found ? (
                              <div>
                                <span className={`font-semibold ${
                                  isMin ? 'text-emerald-700 dark:text-emerald-400' :
                                  isMax ? 'text-rose-700 dark:text-rose-400' :
                                  'text-slate-800 dark:text-slate-200'
                                }`}>
                                  {formatVND(p.price)}
                                </span>
                                {isMin && <span className="ml-1 text-xs">✅</span>}
                                {isMax && <span className="ml-1 text-xs">🔴</span>}
                                {p.link && (
                                  <a
                                    href={p.link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block text-xs text-sky-500 hover:text-sky-700 mt-0.5 flex items-center justify-end gap-0.5"
                                  >
                                    Xem <ExternalLink className="w-3 h-3" />
                                  </a>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500 text-xs italic">
                                {p?.error ? '⚠ Lỗi' : 'Không KD'}
                              </span>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2.5 text-right">
                        {diff !== 0 ? (
                          <span className={`font-semibold ${
                            diff > 0 ? 'text-rose-700 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'
                          }`}>
                            {diff > 0 ? '+' : ''}{formatVND(Math.abs(diff))}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {/* Summary footer */}
          <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700/30 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>
              ✅ Giá thấp nhất &nbsp; 🔴 Giá cao nhất &nbsp; Không KD = Không kinh doanh
            </span>
            <span>
              Cập nhật: {new Date().toLocaleString('vi-VN')}
            </span>
          </div>
        </div>
      )}

      {/* Empty state */}
      {products.length === 0 && results.length === 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
          <Search className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-600 dark:text-slate-300 mb-2">Chưa có sản phẩm nào</h3>
          <p className="text-sm text-slate-400 dark:text-slate-500 max-w-md mx-auto">
            Nhập danh sách sản phẩm bằng cách paste text hoặc upload file Excel, sau đó bấm "Bắt đầu so sánh giá" để tool tự động tìm kiếm giá trên các trang đối thủ.
          </p>
        </div>
      )}
    </div>
  );
}

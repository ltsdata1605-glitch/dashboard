import { Product } from '../types';
import { parseCurrency } from './fileParser';
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

export interface ModernLayoutPositions {
  productName: { x: number; y: number; w: number; h: number };
  qrCode: { x: number; y: number; w: number; h: number };
  originalPrice: { x: number; y: number; w: number; h: number };
  savingsBox: { x: number; y: number; w: number; h: number };
  finalPrice: { x: number; y: number; w: number; h: number };
  footer: { x: number; y: number; w: number; h: number };
}

export const defaultModernPositions: ModernLayoutPositions = {
  productName: { x: 200, y: 45, w: 580, h: 100 },
  qrCode: { x: 650, y: 400, w: 120, h: 120 },
  originalPrice: { x: 100, y: 160, w: 400, h: 80 },
  savingsBox: { x: 100, y: 240, w: 300, h: 80 },
  finalPrice: { x: 100, y: 320, w: 500, h: 180 },
  footer: { x: 0, y: 400, w: 650, h: 120 },
};

export interface PrintSettings {
  showOriginalPrice: boolean;
  showPromotion: boolean;
  showBonus: boolean;
  showQrCode: boolean;
  showEmployeeName: boolean;
  tagsPerPage: 1 | 2 | 4 | 8 | 16 | 24 | 80;
  shortenPrice: boolean;
  sortByName: boolean;
  
  // Primary Font (Final Price, Promotion)
  customFontData?: string | null; 
  customFontName?: string | null;

  // Secondary Font (Product Name, Original Price)
  customSecondaryFontData?: string | null;
  customSecondaryFontName?: string | null;

  stickerStyle: 'default' | 'modern';
}

const getLayoutConfig = (tagsPerPage: PrintSettings['tagsPerPage']) => {
    switch (tagsPerPage) {
        case 80: return { orientation: 'portrait', cols: 1, rows: 1, sizeClass: 'size-bill' };
        case 1:  return { orientation: 'landscape', cols: 1, rows: 1, sizeClass: 'size-single' };
        case 2:  return { orientation: 'portrait', cols: 1, rows: 2, sizeClass: 'size-double' };
        case 8:  return { orientation: 'portrait', cols: 2, rows: 4, sizeClass: 'size-medium' };
        case 24: return { orientation: 'portrait', cols: 4, rows: 8, sizeClass: 'size-tiny' };
        case 16: return { orientation: 'landscape', cols: 4, rows: 4, sizeClass: 'size-small' };
        case 4:
        default: return { orientation: 'landscape', cols: 2, rows: 2, sizeClass: 'size-large' };
    }
}

const calculateTagDimensions = (settings: PrintSettings) => {
    const { cols, rows, orientation } = getLayoutConfig(settings.tagsPerPage);
    const isBillPrinter = settings.tagsPerPage === 80;
    const pageMargin = isBillPrinter ? 2 : 10;
    const tagGap = isBillPrinter ? 0 : 4;
    const isLandscape = orientation === 'landscape';
    const pageWidth = isBillPrinter ? 80 : (isLandscape ? 297 : 210);
    const pageHeight = isLandscape ? 210 : 297; 

    const printableWidth = pageWidth - (pageMargin * 2);
    const tagWidthMm = (printableWidth - (tagGap * (cols - 1))) / cols;
    
    let tagHeightMm = 0;
    if (!isBillPrinter) {
        const printableHeight = pageHeight - (pageMargin * 2);
        tagHeightMm = (printableHeight - (tagGap * (rows - 1))) / rows;
    } else {
        // For bill printer, use 60mm to match Default Style min-height
        tagHeightMm = 60;
    }
    
    return { width: tagWidthMm, height: tagHeightMm };
}

const generateModernPriceTagHTML = (product: Product, employeeName: string, settings: PrintSettings): string => {
    const { width: tagWidthMm, height: tagHeightMm } = calculateTagDimensions(settings);
    
    // Calculate scale to fit content into the tag dimensions
    // We use a fixed content size of 800x540 (approx A4 aspect ratio) to ensure consistent layout
    const contentWidth = 800;
    const contentHeight = 540;
    
    const containerWidthPx = tagWidthMm * 3.78; // Convert mm to px (approx 96 DPI)
    const containerHeightPx = tagHeightMm * 3.78;
    
    const scaleX = containerWidthPx / contentWidth;
    const scaleY = containerHeightPx / contentHeight;
    
    // Use the smaller scale to ensure content fits both width and height
    const scale = Math.min(scaleX, scaleY) * 0.95; // 0.95 for safety margin
    
    const originalPrice = parseCurrency(product.giaGoc);
    const finalPrice = parseCurrency(product.giaGiam);
    const savings = originalPrice - finalPrice;
    const savingsText = savings > 0 
        ? (savings >= 1000000 
            ? new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 3 }).format(savings / 1000000) + 'tr'
            : Math.round(savings / 1000) + 'k')
        : '0k';
    
    // Format prices
    const originalPriceFormatted = new Intl.NumberFormat('vi-VN').format(originalPrice) + 'đ';
    
    // Split final price: 2.180.000 -> "2.180" and ".000đ"
    const finalPriceFormatted = new Intl.NumberFormat('vi-VN').format(finalPrice);
    let bigPart = finalPriceFormatted;
    let smallPart = 'đ';
    
    const lastDotIndex = finalPriceFormatted.lastIndexOf('.');
    if (lastDotIndex !== -1) {
        bigPart = finalPriceFormatted.substring(0, lastDotIndex);
        smallPart = finalPriceFormatted.substring(lastDotIndex) + 'đ';
    } else {
        // Fallback for prices without dots (e.g. small numbers)
        bigPart = finalPriceFormatted;
        smallPart = 'đ';
    }

    const discountPercent = originalPrice > 0 ? Math.round(((originalPrice - finalPrice) / originalPrice) * 100) : 0;
    
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(product.msp)}`;
    
    // Dynamic styles for the wrapper to match aspect ratio
    const wrapperStyle = `width: ${contentWidth}px; height: ${contentHeight}px; transform: scale(${scale});`;
    const borderStyle = `width: ${contentWidth}px; height: ${contentHeight}px;`;
    
    // Logic for Employee Info & Bonus
    const abbreviatedName = abbreviateName(employeeName);
    const bonusShort = product.tongThuong > 0 ? `${Math.round(product.tongThuong / 1000)}` : '';
    const employeeInfoString = [abbreviatedName, bonusShort].filter(Boolean).join(' - ');

    const now = new Date();
    const formattedDate = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
    const formattedTime = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
    const timestamp = `${formattedTime} ${formattedDate}`;

    // Logic for Discount Display (Short name -> New line, Long name -> Inline)
    const nameLength = product.sanPham.length;
    const isShortName = nameLength < 35; // Threshold for "short" name
    const discountSeparator = isShortName ? '<br/>' : ' ';

    return `
    <div class="price-tag modern">
        <div class="modern-wrapper" style="${wrapperStyle}">
            <div class="modern-outer-border" style="${borderStyle}">
                <div class="modern-inner-border">
                    <!-- TopLeftBanner -->
                    <div class="diagonal-banner">
                        <div class="banner-text">${discountPercent > 0 ? `GIẢM ${discountPercent}%` : 'BÁN CHẠY'}</div>
                    </div>
                    
                    <!-- ProductContent -->
                    <div class="p-modern-body flex-grow">
                        <!-- Product Header -->
                        <header class="mb-0 h-header-fixed flex items-start justify-end gap-2 pl-10 pt-1 pr-2">
                            ${(() => {
                                const nameLen = product.sanPham.length;
                                let titleClass = 'text-3xl';
                                if (nameLen < 20) titleClass = 'text-5xl';
                                else if (nameLen <= 34) titleClass = 'text-4xl';
                                else if (nameLen < 60) titleClass = 'text-3xl';
                                else titleClass = 'text-2xl';
                                
                                return `
                                <h1 class="${titleClass} font-bold leading-tight uppercase line-clamp-2 flex-grow text-right max-w-product">
                                    ${product.sanPham}
                                </h1>
                                `;
                            })()}
                        </header>
                        
                        <!-- Pricing Area -->
                        <section class="flex items-center justify-center gap-6 mb-0">
                            <!-- Original Price -->
                            ${settings.showOriginalPrice && originalPrice > finalPrice ? `
                            <div class="text-5xl font-bold text-gray-600 line-through decoration-gray-600 decoration-4">
                                ${originalPriceFormatted}
                            </div>
                            ` : ''}
                            
                            <!-- Savings Box -->
                            ${savings > 0 ? `
                            <div class="bg-black text-white px-2 py-1 rounded flex items-center justify-center gap-2">
                                <div class="flex flex-col text-xl leading-none font-black items-center justify-center">
                                    <span>TIẾT</span>
                                    <span>KIỆM</span>
                                </div>
                                <span class="text-5xl font-black uppercase">${savingsText}</span>
                            </div>
                            ` : ''}
                        </section>
                        
                        <!-- Main Promotional Price -->
                        <section class="flex items-baseline justify-center">
                            <span class="text-[13rem] font-black leading-none tracking-tighter modern-primary-font">${bigPart}</span>
                            <span class="text-6xl font-black ml-1 modern-primary-font">${smallPart}</span>
                        </section>
                    </div>
                    
                    <!-- FooterSection -->
                    <footer class="w-full border-t-2 border-black flex h-28 bg-white shrink-0 box-border">
                        <!-- Promotion Footer Text -->
                        <div class="flex-grow flex flex-col items-center justify-center px-6 h-full overflow-hidden gap-0 relative">
                            ${(() => {
                                const rawPromo = settings.showPromotion ? (product.khuyenMai || '').trim() : '';
                                // If no promotion text (or showPromotion is false), use default text
                                const promoText = rawPromo || 'SẢN PHẨM BÁN CHẠY';
                                
                                // Split by "•" and clean up
                                let promoLines = [...new Set(promoText.split('•').map(s => {
                                    let clean = s.trim();
                                    // Remove "HỖ TRỢ " prefix if present (case insensitive)
                                    clean = clean.replace(/^HỖ TRỢ\s+/i, '');
                                    return clean;
                                }).filter(Boolean))];
                                
                                // If splitting resulted in empty array (e.g. string was just "•"), fallback
                                if (promoLines.length === 0) {
                                    promoLines = ['SẢN PHẨM BÁN CHẠY'];
                                }

                                // Calculate total length to determine font size
                                const totalLength = promoLines.join('').length;
                                const lineCount = promoLines.length;
                                
                                let fontSizeClass = 'text-5xl';
                                if (totalLength > 80 || lineCount > 3) fontSizeClass = 'text-xl';
                                else if (totalLength > 50 || lineCount > 2) fontSizeClass = 'text-2xl';
                                else if (totalLength > 35 || lineCount > 1) fontSizeClass = 'text-3xl';
                                else if (totalLength > 20) fontSizeClass = 'text-4xl';
                                else if (totalLength < 12) fontSizeClass = 'text-7xl';
                                else fontSizeClass = 'text-5xl';
                                
                                return promoLines.map(line => `
                                    <p class="${fontSizeClass} font-bold text-center uppercase leading-tight-promo modern-primary-font w-full m-0 mb-0-5">
                                        ${lineCount > 1 ? '• ' : ''}${line}
                                    </p>
                                `).join('');
                            })()}
                        </div>
                        
                        <!-- QR Code and Metadata Area -->
                        <div class="w-32 border-l-2 border-black flex flex-col items-center justify-center shrink-0 p-1 bg-white h-full box-border overflow-hidden">
                            ${settings.showQrCode ? `
                            <div class="w-16 h-16 mb-1 shrink-0 flex items-center justify-center">
                                <img alt="QR" class="max-w-full max-h-full object-contain block" src="${qrCodeUrl}"/>
                            </div>
                            ` : ''}
                            <div class="text-[8px] uppercase text-center leading-none shrink-0 w-full overflow-hidden whitespace-nowrap text-ellipsis">
                                <p class="m-0 overflow-hidden text-ellipsis">${employeeInfoString}</p>
                                <p class="m-0 mt-0-5 opacity-70">${timestamp}</p>
                            </div>
                        </div>
                    </footer>
                </div>
            </div>
        </div>
    </div>
    `;
}

const abbreviateName = (fullName: string): string => {
  if (!fullName || !fullName.includes(' - ')) {
    return fullName;
  }
  const parts = fullName.split(' - ');
  const id = parts[0];
  const name = parts[1];
  if (!name) {
    return fullName;
  }
  const nameParts = name.trim().split(/\s+/);
  if (nameParts.length <= 1) {
    return fullName;
  }
  const abbreviated = nameParts.slice(0, -1).map(part => `${part.charAt(0).toUpperCase()}.`).join('');
  const lastName = nameParts[nameParts.length - 1];
  return `${id} - ${abbreviated}${lastName}`;
};

const shortenAndFormatPrice = (priceString: string): string => {
  const numericPrice = parseCurrency(priceString);
  if (numericPrice === 0) return '0';

  const shortenedValue = numericPrice / 1000;
  
  return new Intl.NumberFormat('vi-VN').format(Math.round(shortenedValue));
};

const generatePriceTagHTML = (product: Product, employeeName: string, settings: PrintSettings): string => {
  if (settings.stickerStyle === 'modern') {
      return generateModernPriceTagHTML(product, employeeName, settings);
  }

  const cleanedProductName = product.sanPham.trim().replace(/\(IMEI\)/gi, '').trim();
  const productName = cleanedProductName || 'TÊN SẢN PHẨM';

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(product.msp)}`;

  const qrCodeHTML = settings.showQrCode
    ? `<img src="${qrCodeUrl}" alt="QR Code for ${product.msp}" class="qr-code" />`
    : '';

  const employeeText = settings.showEmployeeName && employeeName.trim() ? employeeName : '';
  const shortenedBonus = Math.round(product.tongThuong / 1000);
  const bonusText = settings.showBonus && product.tongThuong > 0 ? `${new Intl.NumberFormat('vi-VN').format(shortenedBonus)}` : '';
  
  const now = new Date();
  const formattedDate = now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  const formattedTime = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
  const timestamp = `${formattedTime} ${formattedDate}`;

  let employeeBonusInfoHTML = '';
  if (employeeText || bonusText) {
      const parts = [employeeText, bonusText].filter(Boolean);
      employeeBonusInfoHTML = `
        <div class="employee-bonus-info">${parts.join(' - ')}</div>
        <div class="employee-bonus-info" style="margin-top: 1px; opacity: 0.8;">${timestamp}</div>
      `;
  }
    
  const finalPriceText = settings.shortenPrice 
    ? shortenAndFormatPrice(product.giaGiam) 
    : product.giaGiam.replace(/\s*₫/i, '');
    
  const originalPriceText = settings.shortenPrice
    ? shortenAndFormatPrice(product.giaGoc)
    : product.giaGoc.replace(/\s*₫/i, '');

  const getPriceClass = (priceText: string, shortened: boolean): string => {
    const len = priceText.length;
    if (shortened) {
        if (len >= 8) return 'price-short-xl';
        if (len >= 6) return 'price-short-lg';
        if (len >= 5) return 'price-short-md';
        if (len >= 4) return 'price-short-sm';
        return 'price-short-xs';
    } else {
        if (len >= 11) return 'price-xl';
        if (len >= 10) return 'price-lg';
        if (len >= 9) return 'price-md';
        if (len >= 7) return 'price-sm';
        return 'price-xs';
    }
  };
  
  const getProductNameClass = (name: string): string => {
    const len = name.length;
    if (len > 50) return 'name-sm';
    if (len > 35) return 'name-md';
    return 'name-lg';
  };
  const productNameClass = getProductNameClass(productName);
  
  const getPromotionClass = (promo: string): string => {
    const len = promo.length;
    if (len > 70) return 'promo-sm';
    if (len > 45) return 'promo-md';
    return 'promo-lg';
  }

  const promotionText = product.khuyenMai.trim();
  const promotionClass = getPromotionClass(promotionText);
  const promotionHTML = settings.showPromotion && promotionText
    ? `<div class="promotion-info ${promotionClass}"> • ${promotionText}</div>`
    : '';

  const finalPriceClass = getPriceClass(finalPriceText, settings.shortenPrice);
  const originalPriceClass = getPriceClass(originalPriceText, settings.shortenPrice);

  const originalPriceHTML = settings.showOriginalPrice && parseCurrency(product.giaGoc) > parseCurrency(product.giaGiam)
    ? `<div class="original-price ${originalPriceClass}">${originalPriceText}</div>`
    : '';

  const tagClasses = ['price-tag'];
  if (settings.tagsPerPage === 16 && settings.shortenPrice && finalPriceText.length === 3) {
      tagClasses.push('compact-layout-small');
  }
  tagClasses.push(finalPriceClass.replace('price-', 'price-context-'));

  // Ghost bar (left) and Empty container (right) for symmetry
  const ghostBarHTML = `<div class="ghost-bar"></div>`;
  const timestampHTML = `<div class="vertical-info-container">
  </div>`;

  return `
    <div class="${tagClasses.join(' ')}">
      <div class="inner-border">
          ${ghostBarHTML}
          <div class="center-stage">
              <div class="top-right-info">
                ${qrCodeHTML}
                ${employeeBonusInfoHTML}
              </div>
              <div class="main-content">
                <div class="section product-name-section">
                    <div class="product-name ${productNameClass}">${productName}</div>
                </div>
                <div class="section price-section">
                    ${originalPriceHTML}
                    <div class="final-price ${finalPriceClass}">${finalPriceText}</div>
                </div>
                <div class="section promotion-section">
                    ${promotionHTML}
                </div>
              </div>
          </div>
          ${timestampHTML}
      </div>
    </div>
  `;
};

const getPrintStyles = (settings: PrintSettings): string => {
    const { cols, rows, orientation } = getLayoutConfig(settings.tagsPerPage);
    const isBillPrinter = settings.tagsPerPage === 80;

    const pageMargin = isBillPrinter ? 2 : 10;
    const tagGap = isBillPrinter ? 0 : 4;
    
    const isLandscape = orientation === 'landscape';
    const pageWidth = isBillPrinter ? 80 : (isLandscape ? 297 : 210);
    
    let fontFaceCSS = '';
    
    let primaryFontFamily = "'Oswald', sans-serif"; 
    
    if (settings.customFontData) {
        primaryFontFamily = "'CustomPrimaryFont', 'Oswald', sans-serif";
        fontFaceCSS += `
            @font-face {
                font-family: 'CustomPrimaryFont';
                src: url('${settings.customFontData}') format('truetype');
                font-weight: normal;
                font-style: normal;
            }
            @font-face {
                font-family: 'CustomPrimaryFont';
                src: url('${settings.customFontData}') format('truetype');
                font-weight: bold;
                font-style: normal;
            }
        `;
    }

    let secondaryFontFamily = primaryFontFamily;

    if (settings.customSecondaryFontData) {
        secondaryFontFamily = "'CustomSecondaryFont', 'Oswald', sans-serif";
        fontFaceCSS += `
            @font-face {
                font-family: 'CustomSecondaryFont';
                src: url('${settings.customSecondaryFontData}') format('truetype');
                font-weight: normal;
                font-style: normal;
            }
            @font-face {
                font-family: 'CustomSecondaryFont';
                src: url('${settings.customSecondaryFontData}') format('truetype');
                font-weight: bold;
                font-style: normal;
            }
        `;
    }

    let pageSetupCSS: string;
    let pageHeightCSS: string;
    let tagHeightCSS: string;
    let printPageDisplayCSS: string = 'flex';
    let priceTagExtraCSS: string = '';

    if (isBillPrinter) {
        pageSetupCSS = `
            @page {
                size: 80mm auto;
                margin: 0;
            }
        `;
        pageHeightCSS = `auto`;
        tagHeightCSS = `auto`;
        printPageDisplayCSS = 'block';
        priceTagExtraCSS = `min-height: 60mm;`;
    } else {
        const pageHeight = isLandscape ? 210 : 297;
        pageSetupCSS = `
            @page {
                size: ${pageWidth}mm ${pageHeight}mm;
                margin: 0;
            }
        `;
        pageHeightCSS = `${pageHeight}mm`;
        const printableHeight = pageHeight - (pageMargin * 2);
        const tagHeight = (printableHeight - (tagGap * (rows - 1))) / rows;
        tagHeightCSS = `${tagHeight}mm`;
    }

    const printableWidth = pageWidth - (pageMargin * 2);
    const tagWidth = (printableWidth - (tagGap * (cols - 1))) / cols;

    return `
      ${pageSetupCSS}
      ${fontFaceCSS}
      @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700;900&display=swap');

      body, .print-page {
        margin: 0;
        font-family: 'Roboto Condensed', sans-serif;
        background-color: #fff;
        -webkit-print-color-adjust: exact;
      }
      
      /* Modern Style CSS */
      .modern-primary-font {
        font-family: ${primaryFontFamily};
      }
      
      .price-tag.modern {
        border: 1px dashed #d1d5db;
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
      }
      
      .modern-wrapper {
        width: 800px;
        height: 540px;
        transform-origin: center center;
        /* Scale is applied inline */
      }
      
      .modern-outer-border {
        width: 800px;
        height: 540px;
        border: 4px solid black;
        background-color: white;
        padding: 5px;
        box-sizing: border-box;
      }

      .modern-inner-border {
        width: 100%;
        height: 100%;
        border-top: 10px solid black;
        border-left: 10px solid black;
        border-right: 10px solid black;
        border-bottom: 15px solid black;
        position: relative;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
      }
      
      .diagonal-banner {
        position: absolute;
        top: 0;
        left: 0;
        width: 200px;
        height: 200px;
        overflow: hidden;
        z-index: 10;
      }
      
      .banner-text {
        position: absolute;
        background-color: black;
        color: white;
        text-align: center;
        width: 400px;
        padding: 12px 0;
        top: 45px;
        left: -130px;
        transform: rotate(-45deg);
        font-weight: 900;
        font-size: 2.5rem;
        letter-spacing: 0.05em;
        text-transform: uppercase;
      }
      
      /* Tailwind-like utilities for Modern Tag */
      .pl-40 { padding-left: 10rem; }
      .pl-24 { padding-left: 6rem; }
      .pl-20 { padding-left: 5rem; }
      .pl-14 { padding-left: 3.5rem; }
      .pl-10 { padding-left: 2.5rem; }
      .pr-4 { padding-right: 1rem; }
      .max-w-product { max-width: 580px; }
      .text-right { text-align: right; }
      .text-3xl { font-size: 1.875rem; line-height: 2.25rem; }
      .text-2xl { font-size: 1.5rem; line-height: 2rem; }
      .text-5xl { font-size: 3rem; line-height: 1; }
      .text-4xl { font-size: 2.25rem; line-height: 2.5rem; }
      .text-6xl { font-size: 3.75rem; line-height: 1; }
      .text-7xl { font-size: 4.5rem; line-height: 1; }
      .text-xs { font-size: 0.75rem; line-height: 1rem; }
      .text-6xl { font-size: 3.75rem; line-height: 1; }
      .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
      .text-xl { font-size: 1.25rem; line-height: 1.75rem; }
      .text-\\[10rem\\] { font-size: 10rem; }
      .text-\\[13rem\\] { font-size: 13rem; }
      .text-\\[10px\\] { font-size: 10px; }
      .text-\\[8px\\] { font-size: 8px; }
      .h-header-fixed { height: 6.5rem; overflow: hidden; }
      
      .font-bold { font-weight: 700; }
      .font-black { font-weight: 900; }
      .uppercase { text-transform: uppercase; }
      .leading-tight { line-height: 1.25; }
      .leading-none { line-height: 1; }
      .tracking-tighter { letter-spacing: -0.05em; }
      
      .text-gray-600 { color: #4b5563; }
      .text-gray-500 { color: #6b7280; }
      .text-gray-400 { color: #9ca3af; }
      .decoration-gray-600 { text-decoration-color: #4b5563; }
      .decoration-gray-400 { text-decoration-color: #9ca3af; }
      .text-white { color: #ffffff; }
      
      .bg-black { background-color: #000000; }
      .bg-white { background-color: #ffffff; }
      
      .line-through { text-decoration: line-through; }
      .decoration-gray-400 { text-decoration-color: #9ca3af; }
      .decoration-4 { text-decoration-thickness: 4px; }
      
      .flex { display: flex; }
      .flex-col { flex-direction: column; }
      .items-center { align-items: center; }
      .items-baseline { align-items: baseline; }
      .items-start { align-items: flex-start; }
      .justify-center { justify-content: center; }
      .justify-between { justify-content: space-between; }
      .justify-end { justify-content: flex-end; }
      .flex-grow { flex-grow: 1; }
      .shrink-0 { flex-shrink: 0; }
      .box-border { box-sizing: border-box; }
      .overflow-hidden { overflow: hidden; }
      .whitespace-nowrap { white-space: nowrap; }
      .text-ellipsis { text-overflow: ellipsis; }
      
      .gap-3 { gap: 0.75rem; }
      .gap-6 { gap: 1.5rem; }
      .gap-0 { gap: 0; }
      
      /* Custom padding for modern layout */
      .p-modern-body { padding: 0px 10px; }
      .p-1 { padding: 0.25rem; }
      .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
      .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
      .px-4 { padding-left: 1rem; padding-right: 1rem; }
      .py-2 { padding-top: 0.5rem; padding-bottom: 0.5rem; }
      .px-6 { padding-left: 1.5rem; padding-right: 1.5rem; }
      .p-2 { padding: 0.5rem; }
      .p-0 { padding: 0; }
      .pt-2 { padding-top: 0.5rem; }
      .pt-3 { padding-top: 0.75rem; }
      
      .m-0 { margin: 0; }
      .mb-4 { margin-bottom: 1rem; }
      .mb-2 { margin-bottom: 0.5rem; }
      .mb-1 { margin-bottom: 0.25rem; }
      .mb-0 { margin-bottom: 0; }
      .ml-1 { margin-left: 0.25rem; }
      .mt-1 { margin-top: 0.25rem; }
      .mt-neg-1 { margin-top: -0.25rem; }
      .mt-neg-2 { margin-top: -0.5rem; }
      
      .w-full { width: 100%; }
      .h-full { height: 100%; }
      .w-48 { width: 12rem; }
      .w-24 { width: 6rem; }
      
      .block { display: block; }
      .leading-tight-promo { line-height: 1.1; }
      .mb-0-5 { margin-bottom: 0.125rem; }
      .mt-0-5 { margin-top: 0.125rem; }
      .gap-1 { gap: 0.25rem; }
      .gap-2 { gap: 0.5rem; }
      .w-16 { width: 4rem; }
      .w-20 { width: 5rem; }
      .w-32 { width: 8rem; }
      .h-16 { height: 4rem; }
      .h-24 { height: 6rem; }
      .h-20 { height: 5rem; }
      .h-28 { height: 7rem; }
      .h-36 { height: 9rem; }
      .h-40 { height: 10rem; }
      .max-w-full { max-width: 100%; }
      .max-h-full { max-height: 100%; }
      .object-contain { object-fit: contain; }
      .block { display: block; }
      .relative { position: relative; }
      
      .rounded { border-radius: 0.25rem; }
      
      .border-t-4 { border-top-width: 4px; border-style: solid; }
      .border-l-4 { border-left-width: 4px; border-style: solid; }
      .border-t-2 { border-top-width: 2px; border-style: solid; }
      .border-l-2 { border-left-width: 2px; border-style: solid; }
      .border-black { border-color: #000000; }
      
      .absolute { position: absolute; }
      .bottom-0 { bottom: 0; }
      .left-0 { left: 0; }
      
      .object-contain { object-fit: contain; }
      .whitespace-nowrap { white-space: nowrap; }
      .text-center { text-align: center; }
      
      .line-clamp-2 {
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }
      .line-clamp-3 {
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .print-page {
        width: ${pageWidth}mm;
        height: ${pageHeightCSS};
        padding: ${pageMargin}mm;
        box-sizing: border-box;
        display: ${printPageDisplayCSS};
        flex-wrap: wrap;
        gap: ${tagGap}mm;
        justify-content: flex-start;
        align-content: flex-start;
        page-break-inside: avoid;
      }
      .price-tag {
        width: ${tagWidth}mm;
        height: ${tagHeightCSS};
        ${priceTagExtraCSS}
        border: 2px solid black;
        box-sizing: border-box;
        padding: 4px;
        position: relative;
        page-break-inside: avoid;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
      }
      
      .inner-border {
        width: 100%;
        height: 100%;
        border-top: 8px solid black;
        border-left: 8px solid black;
        border-right: 8px solid black;
        border-bottom: 12px solid black;
        box-sizing: border-box;
        position: relative;
        display: flex;
        flex-direction: row; /* Horizontal layout for symmetry */
        justify-content: space-between;
        padding: 6px 0; /* Vertical padding only */
      }

      /* Side columns for symmetry */
      .ghost-bar, .vertical-info-container {
        flex-shrink: 0;
        display: flex;
        flex-direction: column;
        justify-content: flex-end; /* Align date to bottom */
        align-items: center;
        padding-bottom: 2px;
      }

      /* Center stage for main content */
      .center-stage {
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        position: relative;
        height: 100%;
        overflow: hidden;
      }
      
      .top-right-info {
        position: absolute;
        top: 0;
        right: 0; /* Aligned to right of center-stage */
        display: flex;
        flex-direction: column;
        align-items: center;
        z-index: 10;
      }

      .employee-bonus-info {
        font-family: Arial, sans-serif;
        color: black;
        line-height: 1;
        margin-top: 1mm;
      }
      
      .qr-code { 
        /* Size defined per layout below */
      }
      
      .main-content {
        display: flex;
        flex-direction: column;
        justify-content: space-around;
        align-items: center;
        width: 100%;
        height: 100%;
        text-align: center;
        /* Padding to prevent text touching QR code or sides is handled by specific widths/margins if needed */
      }

      .section {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        width: 100%;
        min-height: 0;
      }
      .product-name-section {
        flex: 2 1 auto;
        justify-content: flex-end;
        width: 100%;
      }
      .price-section {
        flex: 7 1 auto;
        overflow: hidden;
      }
      .promotion-section {
        flex: 2 1 auto;
        justify-content: flex-start;
      }

      .original-price {
        font-family: ${secondaryFontFamily};
        font-weight: 700;
        position: relative;
        display: inline-block;
        line-height: 1;
        text-decoration: none;
        white-space: nowrap;
        text-align: center;
        margin-bottom: -0.1em;
        color: black;
      }
      
      /* New Strikethrough Style */
      .original-price::after {
        content: '';
        position: absolute;
        left: -8px; /* Extended 8px left */
        right: -8px; /* Extended 8px right */
        top: 50%;
        /* Height is now defined in specific layout classes */
        background-color: black;
      }

      .final-price {
        font-family: ${primaryFontFamily};
        font-weight: 700;
        line-height: 1;
        color: black;
        white-space: nowrap;
        text-align: center;
      }
      
      .product-name {
        font-family: ${secondaryFontFamily};
        font-weight: normal; /* No Bold */
        line-height: 1.15;
        text-align: center;
        white-space: nowrap; /* Single line enforced by default */
        overflow: hidden;
        text-overflow: ellipsis; /* ... if too long */
        color: black;
        display: block; /* Ensure block for overflow to work */
        padding-left: 2px;
      }
      
      /* Padding right for name to avoid overlap with QR code in top right corner */
      .product-name-section .product-name {
         /* Dynamic padding handled in layout classes */
      }

      .promotion-info {
        font-family: ${primaryFontFamily};
        font-weight: normal; /* No Bold */
        text-align: center;
        white-space: nowrap; /* Single line enforced */
        overflow: hidden;
        text-overflow: ellipsis; /* ... if too long */
        width: 98%;
        line-height: 1.1;
        display: block; /* Ensure block for overflow to work */
        color: black;
      }

      .vertical-text {
        writing-mode: vertical-rl; /* Standard top-to-bottom vertical text */
        text-orientation: mixed;
        font-family: Arial, sans-serif;
        color: #333;
        white-space: nowrap;
        /* Font size defined per layout to match employee-bonus-info */
      }
      
      /* --- DYNAMIC FONT SIZES & LAYOUT SPECS --- */
      
      /* Layout: 1 per page (Single) */
      .size-single .original-price::after { height: 6px; }
      .size-single .ghost-bar, .size-single .vertical-info-container { width: 40px; }
      .size-single .price-tag { border: 2px solid black; padding: 20px; }
      .size-single .inner-border { border-top: 10px solid black; border-left: 10px solid black; border-right: 10px solid black; border-bottom: 14px solid black; padding: 10px 0; }
      .size-single .qr-code { width: 30mm; height: 30mm; }
      
      /* Updated Single Layout Name: Smaller and Wraps */
      .size-single .product-name { 
          padding-right: 32mm; /* Avoid QR */
          white-space: normal; /* Allow wrapping */
          text-overflow: clip;
          overflow: visible;
          line-height: 1.2;
      }
      
      .size-single .vertical-text, .size-single .employee-bonus-info { font-size: 16pt; }
      
      .size-single .original-price.price-xs { font-size: 64pt; }
      .size-single .original-price.price-sm { font-size: 58pt; }
      .size-single .original-price.price-md { font-size: 54pt; }
      .size-single .original-price.price-lg { font-size: 50pt; }
      .size-single .original-price.price-xl { font-size: 46pt; }
      .size-single .final-price.price-xs { font-size: 150pt; }
      .size-single .final-price.price-sm { font-size: 138pt; }
      .size-single .final-price.price-md { font-size: 125pt; }
      .size-single .final-price.price-lg { font-size: 112pt; }
      .size-single .final-price.price-xl { font-size: 100pt; }
      .size-single .original-price.price-short-xs { font-size: 100pt; }
      .size-single .original-price.price-short-sm { font-size: 92pt; }
      .size-single .original-price.price-short-md { font-size: 84pt; }
      .size-single .original-price.price-short-lg { font-size: 76pt; }
      .size-single .original-price.price-short-xl { font-size: 68pt; }
      .size-single .final-price.price-short-xs { font-size: 220pt; }
      .size-single .final-price.price-short-sm { font-size: 200pt; }
      .size-single .final-price.price-short-md { font-size: 185pt; }
      .size-single .final-price.price-short-lg { font-size: 170pt; }
      .size-single .final-price.price-short-xl { font-size: 155pt; }
      
      .size-single .product-name.name-lg { font-size: 38pt; }
      .size-single .product-name.name-md { font-size: 32pt; }
      .size-single .product-name.name-sm { font-size: 28pt; }
      
      .size-single .promotion-info.promo-lg { font-size: 26pt; }
      .size-single .promotion-info.promo-md { font-size: 23pt; }
      .size-single .promotion-info.promo-sm { font-size: 20pt; }

      /* Layout: 2 per page (Double) */
      .size-double .original-price::after { height: 5px; }
      .size-double .ghost-bar, .size-double .vertical-info-container { width: 30px; }
      .size-double .price-tag { border: 2px solid black; padding: 10px; }
      .size-double .inner-border { border-top: 8px solid black; border-left: 8px solid black; border-right: 8px solid black; border-bottom: 12px solid black; padding: 8px 0; }
      .size-double .qr-code { width: 25mm; height: 25mm; }
      
      /* Updated Double Layout Name: Wraps automatically */
      .size-double .product-name { 
          padding-right: 27mm; 
          white-space: normal; /* Allow wrapping */
          text-overflow: clip;
          overflow: visible;
          line-height: 1.1;
      }
      
      .size-double .vertical-text, .size-double .employee-bonus-info { font-size: 12pt; }

      .size-double .original-price.price-xs { font-size: 48pt; }
      .size-double .original-price.price-sm { font-size: 44pt; }
      .size-double .original-price.price-md { font-size: 40pt; }
      .size-double .original-price.price-lg { font-size: 36pt; }
      .size-double .original-price.price-xl { font-size: 32pt; }
      .size-double .final-price.price-xs { font-size: 115pt; }
      .size-double .final-price.price-sm { font-size: 108pt; }
      .size-double .final-price.price-md { font-size: 100pt; }
      .size-double .final-price.price-lg { font-size: 92pt; }
      .size-double .final-price.price-xl { font-size: 84pt; }
      .size-double .original-price.price-short-xs { font-size: 74pt; }
      .size-double .original-price.price-short-sm { font-size: 68pt; }
      .size-double .original-price.price-short-md { font-size: 64pt; }
      .size-double .original-price.price-short-lg { font-size: 58pt; }
      .size-double .original-price.price-short-xl { font-size: 54pt; }
      .size-double .final-price.price-short-xs { font-size: 160pt; }
      .size-double .final-price.price-short-sm { font-size: 150pt; }
      .size-double .final-price.price-short-md { font-size: 142pt; }
      .size-double .final-price.price-short-lg { font-size: 134pt; }
      .size-double .final-price.price-short-xl { font-size: 126pt; }
      
      .size-double .product-name.name-lg { font-size: 22pt; }
      .size-double .product-name.name-md { font-size: 19pt; }
      .size-double .product-name.name-sm { font-size: 16pt; }
      .size-double .promotion-info.promo-lg { font-size: 20pt; }
      .size-double .promotion-info.promo-md { font-size: 18pt; }
      .size-double .promotion-info.promo-sm { font-size: 16pt; }

      /* Layout: 4 per page (Large) */
      .size-large .original-price::after { height: 4px; }
      .size-large .ghost-bar, .size-large .vertical-info-container { width: 25px; }
      .size-large .qr-code { width: 18mm; height: 18mm; }
      .size-large .product-name { padding-right: 20mm; }
      .size-large .vertical-text, .size-large .employee-bonus-info { font-size: 8pt; }

      .size-large .original-price.price-xs { font-size: 38pt; }
      .size-large .original-price.price-sm { font-size: 34pt; }
      .size-large .original-price.price-md { font-size: 30pt; }
      .size-large .original-price.price-lg { font-size: 27pt; }
      .size-large .original-price.price-xl { font-size: 24pt; }
      .size-large .final-price.price-xs { font-size: 88pt; }
      .size-large .final-price.price-sm { font-size: 80pt; }
      .size-large .final-price.price-md { font-size: 72pt; }
      .size-large .final-price.price-lg { font-size: 65pt; }
      .size-large .final-price.price-xl { font-size: 58pt; }
      .size-large .original-price.price-short-xs { font-size: 56pt; }
      .size-large .original-price.price-short-sm { font-size: 52pt; }
      .size-large .original-price.price-short-md { font-size: 46pt; }
      .size-large .original-price.price-short-lg { font-size: 42pt; }
      .size-large .original-price.price-short-xl { font-size: 38pt; }
      .size-large .final-price.price-short-xs { font-size: 125pt; }
      .size-large .final-price.price-short-md { font-size: 108pt; }
      .size-large .final-price.price-short-lg { font-size: 100pt; }
      .size-large .final-price.price-short-xl { font-size: 92pt; }
      .size-large .product-name.name-lg { font-size: 14pt; }
      .size-large .product-name.name-md { font-size: 12pt; }
      .size-large .product-name.name-sm { font-size: 11pt; }
      .size-large .promotion-info.promo-lg { font-size: 14pt; }
      .size-large .promotion-info.promo-md { font-size: 12.5pt; }
      .size-large .promotion-info.promo-sm { font-size: 11pt; }

      /* Layout: 8 per page (Medium) */
      .size-medium .original-price::after { height: 3px; }
      .size-medium .ghost-bar, .size-medium .vertical-info-container { width: 18px; }
      .size-medium .price-tag { border: 2px solid black; padding: 4px; }
      .size-medium .inner-border { border-top: 6px solid black; border-left: 6px solid black; border-right: 6px solid black; border-bottom: 10px solid black; padding: 4px 0; }
      .size-medium .qr-code { width: 14mm; height: 14mm; }
      .size-medium .product-name { padding-right: 15mm; }
      .size-medium .vertical-text, .size-medium .employee-bonus-info { font-size: 6pt; }

      .size-medium .original-price.price-xs { font-size: 30pt; }
      .size-medium .original-price.price-sm { font-size: 26pt; }
      .size-medium .original-price.price-md { font-size: 23pt; }
      .size-medium .original-price.price-lg { font-size: 21pt; }
      .size-medium .original-price.price-xl { font-size: 19pt; }
      .size-medium .final-price.price-xs { font-size: 70pt; }
      .size-medium .final-price.price-sm { font-size: 62pt; }
      .size-medium .final-price.price-md { font-size: 55pt; }
      .size-medium .final-price.price-lg { font-size: 50pt; }
      .size-medium .final-price.price-xl { font-size: 45pt; }
      .size-medium .original-price.price-short-xs { font-size: 40pt; }
      .size-medium .original-price.price-short-sm { font-size: 37pt; }
      .size-medium .original-price.price-short-md { font-size: 34pt; }
      .size-medium .original-price.price-short-lg { font-size: 30pt; }
      .size-medium .original-price.price-short-xl { font-size: 28pt; }
      .size-medium .final-price.price-short-xs { font-size: 74pt; }
      .size-medium .final-price.price-short-sm { font-size: 70pt; }
      .size-medium .final-price.price-short-md { font-size: 74pt; }
      .size-medium .final-price.price-short-lg { font-size: 68pt; }
      .size-medium .final-price.price-short-xl { font-size: 62pt; }
      
      .size-medium .product-name.name-lg { font-size: 7.5pt; }
      .size-medium .product-name.name-md { font-size: 7pt; }
      .size-medium .product-name.name-sm { font-size: 6.5pt; }
      .size-medium .promotion-info.promo-lg { font-size: 8pt; }
      .size-medium .promotion-info.promo-md { font-size: 7.5pt; }
      .size-medium .promotion-info.promo-sm { font-size: 7pt; }

      /* Layout: 16 per page (Small) */
      .size-small .original-price::after { height: 2px; }
      .size-small .ghost-bar, .size-small .vertical-info-container { width: 14px; }
      .size-small .price-tag { border: 1px solid black; padding: 3px; }
      .size-small .inner-border { border-top: 4px solid black; border-left: 4px solid black; border-right: 4px solid black; border-bottom: 8px solid black; padding: 2px 0; }
      .size-small .qr-code { width: 5.5mm; height: 5.5mm; }
      .size-small .product-name { padding-right: 7mm; }
      .size-small .vertical-text, .size-small .employee-bonus-info { font-size: 5pt; }

      .size-small .original-price.price-xs { font-size: 24pt; }
      .size-small .original-price.price-sm { font-size: 21pt; }
      .size-small .original-price.price-md { font-size: 18pt; }
      .size-small .original-price.price-lg { font-size: 16pt; }
      .size-small .original-price.price-xl { font-size: 14pt; }
      .size-small .final-price.price-xs { font-size: 55pt; }
      .size-small .final-price.price-sm { font-size: 50pt; }
      .size-small .final-price.price-md { font-size: 44pt; }
      .size-small .final-price.price-lg { font-size: 40pt; }
      .size-small .final-price.price-xl { font-size: 36pt; }
      .size-small .original-price.price-short-xs { font-size: 36pt; }
      .size-small .original-price.price-short-sm { font-size: 35pt; }
      .size-small .original-price.price-short-md { font-size: 32pt; }
      .size-small .original-price.price-short-lg { font-size: 29pt; }
      .size-small .original-price.price-short-xl { font-size: 27pt; }
      .size-small .final-price.price-short-xs { font-size: 65pt; }
      .size-small .final-price.price-short-sm { font-size: 68pt; }
      .size-small .final-price.price-short-md { font-size: 65pt; }
      .size-small .final-price.price-short-lg { font-size: 60pt; }
      .size-small .final-price.price-short-xl { font-size: 55pt; }
      
      .size-small .product-name.name-lg { font-size: 6pt; }
      .size-small .product-name.name-md { font-size: 5.5pt; }
      .size-small .product-name.name-sm { font-size: 5pt; }
      .size-small .promotion-info.promo-lg { font-size: 5pt; }
      .size-small .promotion-info.promo-md { font-size: 4.5pt; }
      .size-small .promotion-info.promo-sm { font-size: 4pt; }
      
      .size-small .price-tag.compact-layout-small .product-name.name-lg { font-size: 6pt; }
      .size-small .price-tag.compact-layout-small .product-name.name-md { font-size: 5.5pt; }
      .size-small .price-tag.compact-layout-small .product-name.name-sm { font-size: 5pt; }
      .size-small .price-tag.compact-layout-small .original-price { font-size: 32pt; }
      .size-small .price-tag.compact-layout-small .final-price.price-short-xs { font-size: 60pt; }
      .size-small .price-tag.compact-layout-small .promotion-info.promo-lg { font-size: 5pt; }
      .size-small .price-tag.compact-layout-small .promotion-info.promo-md { font-size: 4.5pt; }
      .size-small .price-tag.compact-layout-small .promotion-info.promo-sm { font-size: 4pt; }
      
      /* Layout: 24 per page (Tiny) */
      .size-tiny .original-price::after { height: 1px; }
      .size-tiny .ghost-bar, .size-tiny .vertical-info-container { width: 12px; }
      .size-tiny .price-tag { border-width: 1px; padding: 2px; }
      .size-tiny .inner-border { border-top-width: 2px; border-left-width: 2px; border-right-width: 2px; border-bottom-width: 8px; padding: 2px 0; }
      .size-tiny .qr-code { width: 6mm; height: 6mm; }
      .size-tiny .product-name { padding-right: 8mm; }
      .size-tiny .vertical-text, .size-tiny .employee-bonus-info { font-size: 4pt; }

      .size-tiny .original-price.price-xs { font-size: 12pt; }
      .size-tiny .original-price.price-sm { font-size: 11pt; }
      .size-tiny .original-price.price-md { font-size: 9.5pt; }
      .size-tiny .original-price.price-lg { font-size: 9pt; }
      .size-tiny .original-price.price-xl { font-size: 8pt; }
      .size-tiny .final-price.price-xs { font-size: 35pt; }
      .size-tiny .final-price.price-sm { font-size: 31pt; }
      .size-tiny .final-price.price-md { font-size: 28pt; }
      .size-tiny .final-price.price-lg { font-size: 25pt; }
      .size-tiny .final-price.price-xl { font-size: 23pt; }
      .size-tiny .original-price.price-short-xs { font-size: 19pt; }
      .size-tiny .original-price.price-short-sm { font-size: 17pt; }
      .size-tiny .original-price.price-short-md { font-size: 16pt; }
      .size-tiny .original-price.price-short-lg { font-size: 14pt; }
      .size-tiny .original-price.price-short-xl { font-size: 13pt; }
      .size-tiny .final-price.price-short-xs { font-size: 41pt; }
      .size-tiny .final-price.price-short-sm { font-size: 41pt; }
      .size-tiny .final-price.price-short-md { font-size: 41pt; }
      .size-tiny .final-price.price-short-lg { font-size: 38pt; }
      .size-tiny .final-price.price-short-xl { font-size: 34pt; }
      
      .size-tiny .product-name.name-lg { font-size: 4.5pt; }
      .size-tiny .product-name.name-md { font-size: 4pt; }
      .size-tiny .product-name.name-sm { font-size: 3.5pt; }
      
      /* Show Product Name for Tiny Layout (24/page) */
      .size-tiny .product-name-section { display: flex; flex: 2 1 auto; }
      .size-tiny .promotion-section { display: none; }
      .size-tiny .price-section { flex: 6 1 auto; }

      /* Layout: Bill Printer */
      .size-bill .original-price::after { height: 2px; }
      .size-bill .ghost-bar, .size-bill .vertical-info-container { width: 16px; }
      .size-bill .price-tag { display: block; border-width: 2px; padding: 2mm; }
      
      /* UPDATE: Symmetrical Border for Bill: Increased bottom border to 16px */
      .size-bill .inner-border { border-top-width: 2px; border-left-width: 2px; border-right-width: 2px; border-bottom-width: 32px; padding: 2mm 0; }
      
      .size-bill .qr-code { width: 14mm; height: 14mm; }
      .size-bill .vertical-text, .size-bill .employee-bonus-info { font-size: 8pt; }
      
      /* BILL LAYOUT - Name Wrapping and Spacing */
      .size-bill .product-name {
          padding-right: 15mm; /* Maintain space for QR code */
          white-space: normal; /* Allow text wrapping */
          overflow: visible;
          text-overflow: clip;
          margin-bottom: 3mm; /* Increase space below name */
          line-height: 1.2;
      }
      
      /* UPDATE: Increased margin bottom for original price to separate from final price */
      .size-bill .original-price {
          margin-top: 2mm; 
          margin-bottom: 3mm;
      }

      .size-bill .original-price.price-xs { font-size: 26pt; }
      .size-bill .original-price.price-sm { font-size: 25pt; }
      .size-bill .original-price.price-md { font-size: 22pt; }
      .size-bill .original-price.price-lg { font-size: 20pt; }
      .size-bill .original-price.price-xl { font-size: 17pt; }
      .size-bill .final-price.price-xs { font-size: 58pt; }
      .size-bill .final-price.price-sm { font-size: 52pt; }
      .size-bill .final-price.price-md { font-size: 47pt; }
      .size-bill .final-price.price-lg { font-size: 43pt; }
      .size-bill .final-price.price-xl { font-size: 40pt; }
      .size-bill .original-price.price-short-xs { font-size: 38pt; }
      .size-bill .original-price.price-short-sm { font-size: 34pt; }
      .size-bill .original-price.price-short-md { font-size: 31pt; }
      .size-bill .original-price.price-short-lg { font-size: 30pt; }
      .size-bill .original-price.price-short-xl { font-size: 26pt; }
      .size-bill .final-price.price-short-xs { font-size: 75pt; }
      .size-bill .final-price.price-short-sm { font-size: 69pt; }
      .size-bill .final-price.price-short-md { font-size: 65pt; }
      .size-bill .final-price.price-short-lg { font-size: 60pt; }
      .size-bill .final-price.price-short-xl { font-size: 55pt; }

      /* Reduced Name Font Size by ~30% for Bill Printer (from 16pt) */
      .size-bill .product-name.name-lg { font-size: 11pt; }
      .size-bill .product-name.name-md { font-size: 10.5pt; }
      .size-bill .product-name.name-sm { font-size: 10pt; }
      
      .size-bill .promotion-info.promo-lg { font-size: 7pt; }
      .size-bill .promotion-info.promo-md { font-size: 6.5pt; }
      .size-bill .promotion-info.promo-sm { font-size: 6pt; }


      /* Cutting Guides */
      .size-large .price-tag::after,
      .size-double .price-tag::after,
      .size-medium .price-tag::after,
      .size-small .price-tag::after,
      .size-tiny .price-tag::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        outline: 0.5px dashed rgba(0,0,0,0.4);
        outline-offset: ${tagGap / 2}mm;
        pointer-events: none;
      }
      
      /* Hide cutting guides for Single Layout */
      .size-single .price-tag::after {
        display: none;
      }
      .size-single .price-tag.modern {
        border: none;
      }
    `;
}

export const printPriceTags = async (products: Product[], employeeName: string, settings: PrintSettings): Promise<string | void> => {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  const abbreviatedEmployeeName = abbreviateName(employeeName);
  const allTags = products.flatMap(p => Array(p.quantity).fill(p)).map(p => generatePriceTagHTML(p, abbreviatedEmployeeName, settings));
  
  if (allTags.length === 0) {
      return; // Nothing to print
  }

  const { cols, rows, sizeClass } = getLayoutConfig(settings.tagsPerPage);
  const commonStyles = getPrintStyles(settings);

  if (isMobile && typeof jsPDF !== 'undefined' && typeof html2canvas !== 'undefined') {
    const renderContainer = document.createElement('div');
    renderContainer.style.position = 'fixed';
    renderContainer.style.top = '0';
    renderContainer.style.left = '0';
    renderContainer.style.opacity = '0';
    renderContainer.style.pointerEvents = 'none';
    renderContainer.style.zIndex = '-1';
    document.body.appendChild(renderContainer);

    const waitForImages = (container: HTMLElement): Promise<void[]> => {
      const images = Array.from(container.getElementsByTagName('img'));
      const promises = images.map(img => {
        return new Promise<void>((resolve) => {
          if (img.complete && img.naturalHeight !== 0) {
            resolve();
          } else {
            img.onload = () => resolve();
            img.onerror = () => {
              console.warn(`Could not load image: ${img.src}`);
              resolve();
            };
          }
        });
      });
      return Promise.all(promises);
    };

    if (settings.tagsPerPage === 80) {
        const billPageWidth = 80;
        
        const pdf = new jsPDF({ orientation: 'p', unit: 'mm', format: [billPageWidth, 297] });
        pdf.deletePage(1);

        for (let i = 0; i < allTags.length; i++) {
            const tagHTML = allTags[i];
            renderContainer.innerHTML = `
                <style>${commonStyles}</style>
                <div class="print-page ${sizeClass}">${tagHTML}</div>
            `;
            const pageElement = renderContainer.querySelector('.print-page') as HTMLElement;
            
            try {
                await document.fonts.ready;
                await waitForImages(pageElement);
            } catch(e) { console.error("Error loading assets for canvas", e); }
            await new Promise(resolve => setTimeout(resolve, 50));
            
            const contentWidthPx = pageElement.scrollWidth;
            const contentHeightPx = pageElement.scrollHeight;

            const dynamicHeightMm = billPageWidth * (contentHeightPx / contentWidthPx);

            pdf.addPage([billPageWidth, dynamicHeightMm], 'p');
            
            const canvas = await html2canvas(pageElement, { 
                scale: 2,
                useCORS: true, 
                allowTaint: true,
                logging: false,
            });
            const imgData = canvas.toDataURL('image/png');
            
            pdf.addImage(imgData, 'PNG', 0, 0, billPageWidth, dynamicHeightMm);
        }
        
        document.body.removeChild(renderContainer);
        return pdf.output('datauristring');
    }

    const orientation = getLayoutConfig(settings.tagsPerPage).orientation.charAt(0) as 'p' | 'l';
    const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
    const tagsPerPage = cols * rows;
    const totalPages = Math.ceil(allTags.length / tagsPerPage);

    for (let i = 0; i < totalPages; i++) {
      const pageTags = allTags.slice(i * tagsPerPage, (i + 1) * tagsPerPage).join('');
      renderContainer.innerHTML = `
          <style>${commonStyles}</style>
          <div class="print-page ${sizeClass}">${pageTags}</div>
      `;
      const pageElement = renderContainer.querySelector('.print-page') as HTMLElement;
      
      try {
        await document.fonts.ready;
        await waitForImages(pageElement);
      } catch (e) {
        console.error("Error loading print assets:", e);
      }
      
      await new Promise(resolve => setTimeout(resolve, 50));

      const canvas = await html2canvas(pageElement, { 
          scale: 2, 
          useCORS: true, 
          allowTaint: true,
          logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      if (i > 0) pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, pageHeight);
    }
    
    document.body.removeChild(renderContainer);
    return pdf.output('datauristring');

  } else {
    // Desktop: Open print dialog
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Vui lòng cho phép cửa sổ bật lên để in.');
      return;
    }
    
    const tagsPerPage = cols * rows;
    const totalPages = Math.ceil(allTags.length / tagsPerPage);
    let allPagesHTML = '';
    for (let i = 0; i < totalPages; i++) {
        const pageTags = allTags.slice(i * tagsPerPage, (i + 1) * tagsPerPage).join('');
        allPagesHTML += `<div class="print-page ${sizeClass}">${pageTags}</div>`;
    }

    const finalDesktopHTML = `
        <!DOCTYPE html>
        <html lang="vi">
        <head>
          <meta charset="UTF-8">
          <title>In Bảng Giá</title>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Roboto+Condensed:wght@700&family=Oswald:wght@700&display=swap" rel="stylesheet">
          <style>
            body {
                margin: 0;
                background-color: #ccc;
            }
            .print-page {
                page-break-after: always;
                background-color: #fff;
            }
            ${commonStyles}
          </style>
        </head>
        <body>
            ${allPagesHTML}
            <script>
              window.onload = () => {
                setTimeout(() => {
                  window.print();
                  window.close();
                }, 250);
              };
            </script>
        </body>
        </html>`;
    
    printWindow.document.write(finalDesktopHTML);
    printWindow.document.close();
    printWindow.focus();
  }
};
import { useState, useEffect, useMemo } from 'react';
import { Product } from '../types';
import { PrintSettings, defaultModernPositions, ModernLayoutPositions, printPriceTags } from '../services/printService';
import { getSetting, saveSetting } from '../../../services/dbService';

interface UseStickerEventPrintProps {
  employeeName: string;
  displayedProducts: Product[];
  setError: (val: string | null) => void;
}

export function useStickerEventPrint({
  employeeName,
  displayedProducts,
  setError,
}: UseStickerEventPrintProps) {
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  
  const [isPrintSettingsOpen, setIsPrintSettingsOpen] = useState(false);
  const [isLayoutModalOpen, setIsLayoutModalOpen] = useState(false);
  
  const [printAction, setPrintAction] = useState<'selected' | 'all' | 'manual' | null>(null);
  const [productToPrint, setProductToPrint] = useState<Product | null>(null);
  const [productsForPrintingSession, setProductsForPrintingSession] = useState<Product[]>([]);

  const [modernPositions, setModernPositions] = useState<ModernLayoutPositions>(defaultModernPositions);
  const [isModernPositionsLoaded, setIsModernPositionsLoaded] = useState(false);

  useEffect(() => {
    getSetting<ModernLayoutPositions>('modernPositions').then(saved => {
        if (saved) setModernPositions(saved);
        setIsModernPositionsLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (isModernPositionsLoaded) {
        saveSetting('modernPositions', modernPositions);
    }
  }, [modernPositions, isModernPositionsLoaded]);

  const masterDefaults: PrintSettings = useMemo(() => ({
      showOriginalPrice: true,
      showPromotion: true,
      showBonus: true,
      showQrCode: true,
      showEmployeeName: true,
      sortByName: true,
      shortenPrice: true,
      tagsPerPage: 4,
      customFontData: null,
      customFontName: null,
      customSecondaryFontData: null,
      customSecondaryFontName: null,
      stickerStyle: 'default'
  }), []);

  const [printSettings, setPrintSettings] = useState<PrintSettings>(masterDefaults);
  const [isPrintSettingsLoaded, setIsPrintSettingsLoaded] = useState(false);

  useEffect(() => {
      getSetting<any>('printSettings').then(savedSettings => {
          if (savedSettings) {
              setPrintSettings({
                  ...masterDefaults,
                  shortenPrice: typeof savedSettings.shortenPrice === 'boolean' ? savedSettings.shortenPrice : masterDefaults.shortenPrice,
                  tagsPerPage: savedSettings.tagsPerPage || masterDefaults.tagsPerPage,
                  customFontData: savedSettings.customFontData || null,
                  customFontName: savedSettings.customFontName || null,
                  customSecondaryFontData: savedSettings.customSecondaryFontData || null,
                  customSecondaryFontName: savedSettings.customSecondaryFontName || null,
                  stickerStyle: savedSettings.stickerStyle || 'default'
              });
          }
          setIsPrintSettingsLoaded(true);
      });
  }, [masterDefaults]);

  useEffect(() => {
    if (isPrintSettingsLoaded) {
        saveSetting('printSettings', printSettings).catch(e => {
            console.error("Could not save print settings to IndexedDB", e);
        });
    }
  }, [printSettings, isPrintSettingsLoaded]);

  const handlePrintSingle = (product: Product) => {
    setProductToPrint(product);
    setIsLayoutModalOpen(true);
  };

  const handlePrintSelected = () => {
    const selectedProducts = displayedProducts.filter(p => p.selected);
    if (selectedProducts.length > 0) {
      setPrintAction('selected');
      setIsLayoutModalOpen(true);
    }
  };

  const handlePrintAll = () => {
    if (displayedProducts.length > 0) {
      setPrintAction('all');
      setIsLayoutModalOpen(true);
    }
  };

  const handleManualPrintSelected = (products: Product[]) => {
    const validProducts = products.filter(p => !!(p && p.msp && typeof p.msp === 'string' && p.msp.trim() !== ''));
    setProductsForPrintingSession(validProducts);
    setPrintAction('manual');
    setIsLayoutModalOpen(true);
  };

  const executePrint = async (tagsPerPage: PrintSettings['tagsPerPage']) => {
    const settingsWithLayout = { ...printSettings, tagsPerPage };
    let productsToPrintList: Product[] = [];
  
    if (productToPrint) {
      productsToPrintList = [productToPrint];
    } else if (printAction === 'all') {
      productsToPrintList = displayedProducts;
    } else if (printAction === 'selected') {
      productsToPrintList = displayedProducts.filter(p => p.selected);
    } else if (printAction === 'manual') {
      productsToPrintList = productsForPrintingSession;
    }
  
    if (settingsWithLayout.sortByName) {
      productsToPrintList = [...productsToPrintList].sort((a, b) => 
        a.sanPham.localeCompare(b.sanPham, 'vi', { sensitivity: 'base' })
      );
    }
  
    if (productsToPrintList.length > 0) {
      setIsPrinting(true);
      try {
        const result = await printPriceTags(productsToPrintList, employeeName, settingsWithLayout);
        if (typeof result === 'string') {
          setPdfPreviewUrl(result);
        }
      } catch (e) {
        console.error(e);
        setError("Không thể tạo tệp. Vui lòng thử lại.");
      } finally {
        setIsPrinting(false);
      }
    }
  
    setIsLayoutModalOpen(false);
    setPrintAction(null);
    setProductToPrint(null);
    setProductsForPrintingSession([]);
  };

  return {
    printSettings,
    setPrintSettings,
    modernPositions,
    setModernPositions,
    pdfPreviewUrl,
    setPdfPreviewUrl,
    isPrinting,
    isPrintSettingsOpen,
    setIsPrintSettingsOpen,
    isLayoutModalOpen,
    setIsLayoutModalOpen,
    printAction,
    productToPrint,
    handlePrintSingle,
    handlePrintSelected,
    handlePrintAll,
    handleManualPrintSelected,
    executePrint,
  };
}

import React, { useState, useEffect, useRef } from 'react';
import { Product, InventoryItem } from './types';
import { PrintSettings, ModernLayoutPositions } from './services/printService';
import { loadData, clearData, saveDisplayedProducts } from './services/fileParser';
import { fetchUserState, saveUserState, saveListToFirestore } from './services/firebaseService';
import ResultsDisplay from './ResultsDisplay';
import Scanner from './Scanner';
import PrintSettingsModal from './PrintSettingsModal';
import LayoutSelectionModal from './LayoutSelectionModal';
import ManualInputModal from './ManualInputModal';
import ControlPanel from './ControlPanel';
import PdfPreviewModal from './PdfPreviewModal';
import InventoryToolbar from './InventoryToolbar';
import FilterModal from './FilterModal';
import BottomNavigation from './BottomNavigation';
import Login from './Login';
import UserManagementModal from './UserManagementModal';
import ChangePasswordModal from './ChangePasswordModal';
import SavedListsModal from './SavedListsModal';
import SaveListModal from './SaveListModal';
import AlertModal from './AlertModal';
import ConfirmModal from './ConfirmModal';
import ErrorBoundary from './ErrorBoundary';
import { WarningIcon } from './Icons';
import SuperAdminModal from './SuperAdminModal';
import UserGuideModal from './UserGuideModal';
import { Info } from 'lucide-react';
import { auth } from './firebase';
import { exportElementAsImage, downloadBlob, showExportOverlay, hideExportOverlay } from '../../services/uiService';

// Custom Hooks
import { useStickerEventAuth } from './hooks/useStickerEventAuth';
import { useStickerEventDb } from './hooks/useStickerEventDb';
import { useStickerEventFile } from './hooks/useStickerEventFile';
import { useStickerEventPrint } from './hooks/useStickerEventPrint';
import { useStickerEventState } from './hooks/useStickerEventState';

export default function App(): React.JSX.Element {
  // 1. Authentication Hook
  const {
    user,
    setUser,
    userData,
    setUserData,
    isInitializing,
    setIsInitializing,
    handleLoginSuccess
  } = useStickerEventAuth();

  // 2. State coordination Hook
  const {
    displayedProducts,
    setDisplayedProducts,
    inventoryFilters,
    setInventoryFilters,
    useInventoryQuantity,
    setUseInventoryQuantity,
    sortField,
    setSortField,
    sortDirection,
    setSortDirection,
    isLoading,
    setIsLoading,
    error,
    setError,
    searchQuery,
    setSearchQuery,
    suggestions,
    setSuggestions,
    showNoResults,
    setShowNoResults,
    duplicateError,
    setDuplicateError,
    highlightedMsp,
    setHighlightedMsp,
    employeeName,
    setEmployeeName,
    isEditingEmployeeName,
    setIsEditingEmployeeName,
    activeTab,
    setActiveTab,
    alertConfig,
    setAlertConfig,
    showAlert,
    handleEmployeeNameChange,
    handleSaveEmployeeName,
    handleEmployeeNameKeyDown,
    handleSearchInputChange,
    handleSuggestionClick,
    handleScanSuccess,
    handleToggleSelect,
    handleQuantityChange,
    handleSetQuantity,
    handleDeleteProduct,
    handleShowTopBonus,
    handleShowTopDiscount,
    executeReset,
    handleUseInventoryQuantityChange,
    handleSortChange,
    handleInventoryFilterChange,
    handleClearInventoryFilters,
    sortedProducts,
  } = useStickerEventState({
    user,
    isInitializing,
    allProducts: [], // Placeholder during init, synced below
    inventory: [], // Placeholder during init, synced below
    manualProducts: [], // Placeholder during init, synced below
  });

  // 3. Database operations Hook
  const {
    allProducts,
    setAllProducts,
    inventory,
    setInventory,
    manualProducts,
    setManualProducts,
    loadFirestoreData,
    handleManualSave,
    handleManualDelete,
    handleManualUpdate,
    executeClearAll,
  } = useStickerEventDb({
    user,
    userData,
    employeeName,
    displayedProducts,
    setDisplayedProducts,
    setIsLoading,
    setIsInitializing,
    setError,
    showAlert,
    fileName: null, // Placeholder during init, synced below
    setFileName: () => {}, // Syncs dynamically in initialization
    fileExportDate: null,
    setFileExportDate: () => {},
    setUploadTimestamp: () => {},
    setInventoryUploadTimestamp: () => {},
  });

  // 4. File operations Hook
  const {
    fileName,
    setFileName,
    uploadTimestamp,
    setUploadTimestamp,
    inventoryUploadTimestamp,
    setInventoryUploadTimestamp,
    fileExportDate,
    setFileExportDate,
    handleFileChange,
    handleDownloadSampleInventory,
    handleInventoryFileChange,
    handleExport,
    handleImport,
  } = useStickerEventFile({
    user,
    userData,
    employeeName,
    setEmployeeName,
    setIsEditingEmployeeName,
    allProducts,
    setAllProducts,
    inventory,
    setInventory,
    displayedProducts,
    setDisplayedProducts,
    setIsLoading,
    setError,
    showAlert,
  });

  // 5. Printing operations Hook
  const {
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
    handlePrintSingle,
    handlePrintSelected,
    handlePrintAll,
    handleManualPrintSelected,
    executePrint,
  } = useStickerEventPrint({
    employeeName,
    displayedProducts,
    setError,
  });

  // Re-inject dependencies into state hook so the internal effects run with real data
  const statePropsRef = useRef({ allProducts, inventory, manualProducts });
  statePropsRef.current = { allProducts, inventory, manualProducts };

  // Sync state settings dynamically to the DB hooks
  const dbPropsRef = useRef({ fileName, fileExportDate, setFileName, setFileExportDate, setUploadTimestamp, setInventoryUploadTimestamp });
  dbPropsRef.current = { fileName, fileExportDate, setFileName, setFileExportDate, setUploadTimestamp, setInventoryUploadTimestamp };

  // Simple UI state variables
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isClearAllConfirmOpen, setIsClearAllConfirmOpen] = useState(false);
  const [showManagerInstructions, setShowManagerInstructions] = useState(false);
  const [isSavedListsModalOpen, setIsSavedListsModalOpen] = useState(false);
  const [isSaveListModalOpen, setIsSaveListModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [isManualInputOpen, setIsManualInputOpen] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [isSuperAdminModalOpen, setIsSuperAdminModalOpen] = useState(false);
  const [isUserGuideOpen, setIsUserGuideOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const [isMobile] = useState(() => /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
  const importInputRef = useRef<HTMLInputElement>(null);
  const productListRef = useRef<HTMLDivElement>(null);

  // Bind DB hook functions for manual handlers
  const handleManualSaveBound = async (product: any) => handleManualSave(product);
  const handleManualDeleteBound = async (docId: string) => handleManualDelete(docId);
  const handleManualUpdateBound = async (product: any) => handleManualUpdate(product);

  // Initialize data on login
  useEffect(() => {
    const initialize = async () => {
      if (!user || !userData) {
        setIsInitializing(false);
        return;
      }

      const savedData = await loadData();
      let userState = null;
      try {
        userState = await fetchUserState(user.uid);
      } catch (e) {
        console.error("Error fetching user state:", e);
      }

      let currentAllProducts: Product[] = [];
      let currentInventory: InventoryItem[] = [];
      let currentUploadTimestamp: Date | null = null;
      let currentInvUploadTimestamp: Date | null = null;

      if (savedData) {
        currentAllProducts = savedData.products || [];
        currentInventory = savedData.inventory || [];
        currentUploadTimestamp = savedData.fileInfo?.uploadTimestamp ? new Date(savedData.fileInfo.uploadTimestamp) : null;
        currentInvUploadTimestamp = savedData.inventoryUploadTimestamp ? new Date(savedData.inventoryUploadTimestamp) : null;

        setAllProducts(currentAllProducts);
        setInventory(currentInventory);
        
        const localLastMod = savedData.displayedProductsLastModified || 0;
        const cloudLastMod = userState?.updatedAt || 0;

        if (userState && cloudLastMod > localLastMod) {
          console.log(`[Cloud Sync Sticker] Cloud is newer (${cloudLastMod} > ${localLastMod}). Loading cloud state...`);
          setDisplayedProducts(userState.displayedProducts);
          setInventoryFilters(userState.inventoryFilters);
          await saveDisplayedProducts(userState.displayedProducts, cloudLastMod);
        } else {
          setDisplayedProducts(savedData.displayedProducts || []);
          if (userState && userState.inventoryFilters) {
            setInventoryFilters(userState.inventoryFilters);
          }
          
          if (userState && localLastMod > cloudLastMod && savedData.displayedProducts?.length) {
            console.log(`[Cloud Sync Sticker] Local is newer (${localLastMod} > ${cloudLastMod}). Syncing up...`);
            saveUserState(user.uid, {
              displayedProducts: savedData.displayedProducts,
              inventoryFilters: userState.inventoryFilters || { maSieuThi: [], nganhHang: [], nhomHang: [], keyword: '' }
            }).catch(console.error);
          }
        }

        if(savedData.fileInfo && savedData.fileInfo.fileName) {
          const savedFileNames = savedData.fileInfo.fileName;
          const fileList = savedFileNames.split(',').map((f: string) => f.trim()).filter(Boolean);
          setFileName(fileList.length > 1 ? `${fileList.length} tệp đã được tải lên` : savedFileNames);
          setUploadTimestamp(currentUploadTimestamp);
          setFileExportDate(savedData.fileInfo.fileExportDate);
        }
        setInventoryUploadTimestamp(currentInvUploadTimestamp);
        
        let defaultName = userData?.username || '';
        if (defaultName === '21707' || defaultName === 'lts.truongson') {
            defaultName = '';
        } else if (!defaultName && userData?.email) {
            defaultName = userData.email.split('@')[0];
        }
        
        const name = defaultName || savedData.employeeName || '';
        setEmployeeName(name);
        if (!name) setIsEditingEmployeeName(true);
      } else {
        if (userState && userState.displayedProducts) {
          setDisplayedProducts(userState.displayedProducts);
          setInventoryFilters(userState.inventoryFilters);
          await saveDisplayedProducts(userState.displayedProducts, userState.updatedAt);
        } else {
          setDisplayedProducts([]);
        }
        let defaultName = userData?.username || '';
        if (defaultName === '21707' || defaultName === 'lts.truongson') {
            defaultName = '';
        } else if (!defaultName && userData?.email) {
            defaultName = userData.email.split('@')[0];
        }
        setEmployeeName(defaultName);
        setIsEditingEmployeeName(!defaultName);
      }

      if (userData.storeId) {
        await loadFirestoreData(userData.storeId, currentAllProducts, currentInventory, currentUploadTimestamp, currentInvUploadTimestamp);
        if (userData.role === 'admin' && currentAllProducts.length === 0 && currentInventory.length === 0) {
          setShowManagerInstructions(true);
        }
      } else {
        setIsInitializing(false);
      }
    };
    
    initialize();
  }, [user, userData]);

  // Pass dynamic dependencies updates to hooks inside render loop
  useEffect(() => {
    // Sync the products / inventory state down to the State hook
    const { allProducts: ap, inventory: inv, manualProducts: mp } = statePropsRef.current;
    // We trigger the internal filter hook trigger in useStickerEventState manually via dependencies:
  }, [allProducts, inventory, manualProducts]);

  const handleSaveUserState = async () => {
    if (!user || displayedProducts.length === 0) return;
    
    try {
      setIsLoading(true);
      await saveUserState(user.uid, {
        displayedProducts,
        inventoryFilters
      });
      showAlert('Đã đồng bộ trạng thái hiện tại lên Cloud thành công!');
    } catch (err) {
      console.error("Error saving state:", err);
      showAlert('Lỗi khi đồng bộ trạng thái. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveList = () => {
    if (!user || !userData?.storeId) {
      showAlert('Vui lòng đăng nhập để sử dụng tính năng này.');
      return;
    }
    if (displayedProducts.length === 0) {
      showAlert('Không có sản phẩm nào để lưu.');
      return;
    }
    setIsSaveListModalOpen(true);
  };

  const onConfirmSaveList = async (listName: string) => {
    setIsSaveListModalOpen(false);
    try {
      setIsLoading(true);
      const itemsToSave = displayedProducts.map(p => ({
        msp: p.msp,
        quantity: p.quantity,
      }));
      await saveListToFirestore(userData.storeId, user!.uid, listName, itemsToSave);
      
      await saveUserState(user!.uid, {
        displayedProducts,
        inventoryFilters
      });
      
      showAlert('Đã lưu danh sách thành công!');
    } catch (err) {
      console.error('Error saving list:', err);
      showAlert('Có lỗi xảy ra khi lưu danh sách. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const isSuperAdmin = userData?.username === 'admin' || userData?.username === '21707' || user?.email === 'lts.truongson@gmail.com' || user?.email === 'lts.truongson@example.com' || user?.email === 'admin@example.com';

  const handleViewSavedLists = () => {
    if (!user || !userData?.storeId) {
      showAlert('Vui lòng đăng nhập để xem danh sách đã lưu.');
      return;
    }
    setIsSavedListsModalOpen(true);
  };

  const handleLoadSavedList = (savedItems: any[]) => {
    const reconstructedProducts: Product[] = [];
    for (const item of savedItems) {
      const product = allProducts.find(p => p.msp === item.msp);
      if (product) {
        reconstructedProducts.push({ ...product, quantity: item.quantity || 1, selected: false });
      } else if (item.sanPham) {
        reconstructedProducts.push({ ...item, selected: false });
      }
    }
    
    if (reconstructedProducts.length === 0) {
        showAlert('Không tìm thấy sản phẩm nào trong danh sách này (có thể do dữ liệu gốc đã bị xóa).');
        return;
    }
    
    setDisplayedProducts(reconstructedProducts);
    saveDisplayedProducts(reconstructedProducts);
  };

  if (isInitializing) {
     return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
     );
  }

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <ErrorBoundary>
      <div className={`min-h-screen bg-white text-slate-800 flex flex-col items-center ${isMobile ? 'p-0 pb-[180px]' : 'p-2 sm:p-3'}`}>
        <div className="w-full max-w-7xl mx-auto">
          <div className={`flex items-center justify-between gap-2 ${isMobile ? 'sticky top-0 z-50 bg-white border-b border-slate-100 px-2 py-1.5' : 'mb-3 px-1'}`}>
            <div className="flex items-center gap-2 min-w-0">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider shrink-0 ${userData?.role === 'admin' ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                {userData?.role === 'admin' ? 'Admin' : 'NV'}
              </span>
              {userData?.storeId && (
                <span className="text-[11px] font-medium text-slate-500 shrink-0">Kho: {userData.storeId}</span>
              )}
              {(uploadTimestamp || inventoryUploadTimestamp) && !isMobile && (
                <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 shrink-0">
                  Cập nhật: {new Date(Math.max(uploadTimestamp?.getTime() || 0, inventoryUploadTimestamp?.getTime() || 0)).toLocaleString('vi-VN')}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              {!isMobile && (
                <button
                  onClick={() => setIsChangePasswordOpen(true)}
                  className="px-2 py-1 text-[11px] font-medium text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                >
                  Đổi mật khẩu
                </button>
              )}
              {!isMobile && (
                <button
                  onClick={() => setIsUserGuideOpen(true)}
                  className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                  title="Hướng dẫn sử dụng"
                >
                  <Info className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={async () => {
                  await auth.signOut();
                  setUser(null);
                  setUserData(null);
                  setAllProducts([]);
                  setInventory([]);
                  setDisplayedProducts([]);
                  setFileName(null);
                  setUploadTimestamp(null);
                  setInventoryUploadTimestamp(null);
                  setFileExportDate(null);
                  setSearchQuery('');
                  setSuggestions([]);
                  await clearData();
                }}
                className={`${isMobile ? 'px-2 py-0.5 text-[10px]' : 'px-2 py-1 text-[11px]'} font-bold text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors uppercase`}
              >
                Đăng xuất
              </button>
            </div>
          </div>

          <main className={`flex flex-col lg:flex-row ${isMobile ? 'gap-2' : 'gap-4'}`}>
            <ControlPanel 
              employeeName={employeeName}
              isEditingEmployeeName={isEditingEmployeeName}
              searchQuery={searchQuery}
              suggestions={suggestions}
              showNoResults={showNoResults}
              allProducts={allProducts}
              displayedProducts={displayedProducts}
              isLoading={isLoading}
              fileName={fileName}
              isMobile={isMobile}
              uploadTimestamp={uploadTimestamp}
              inventoryUploadTimestamp={inventoryUploadTimestamp}
              hasInventory={inventory.length > 0}
              userRole={userData?.role}
              onEmployeeNameChange={handleEmployeeNameChange}
              onSaveEmployeeName={handleSaveEmployeeName}
              onEmployeeNameKeyDown={handleEmployeeNameKeyDown}
              onSetIsEditingEmployeeName={setIsEditingEmployeeName}
              onSearchChange={handleSearchInputChange}
              onOpenScanner={() => setIsScannerOpen(true)}
              onSuggestionClick={handleSuggestionClick}
              onFileChange={handleFileChange}
              onInventoryFileChange={handleInventoryFileChange}
              onDownloadSampleInventory={() => handleDownloadSampleInventory()}
              onShowTopBonus={handleShowTopBonus}
              onShowTopDiscount={handleShowTopDiscount}
              onOpenManualInput={() => setIsManualInputOpen(true)}
              onReset={() => setIsResetConfirmOpen(true)}
              onClearAll={() => setIsClearAllConfirmOpen(true)}
              onTriggerImport={() => importInputRef.current?.click()}
              onExport={handleExport}
              onOpenPrintSettings={() => setIsPrintSettingsOpen(true)}
              onPrintSelected={handlePrintSelected}
              onPrintAll={handlePrintAll}
              onOpenUserManagement={() => setIsUserManagementOpen(true)}
              onOpenSuperAdminTools={isSuperAdmin ? () => setIsSuperAdminModalOpen(true) : undefined}
              onSaveUserState={handleSaveUserState}
              onSaveList={handleSaveList}
              onViewSavedLists={handleViewSavedLists}
              onOpenUserGuide={() => setIsUserGuideOpen(true)}
              activeTab={activeTab}
              showManagerInstructions={showManagerInstructions}
              onCloseInstructions={() => setShowManagerInstructions(false)}
            />
            <div className={`flex-1 flex flex-col ${isMobile ? 'px-2' : ''} ${isMobile && activeTab === 'tools' ? 'hidden' : ''} lg:min-h-0`}>
              <div className={`${isMobile ? 'space-y-2' : 'space-y-2 lg:sticky lg:top-0 lg:z-20 lg:bg-white lg:pb-2 lg:pt-1 lg:border-b lg:border-slate-100'}`}>
               {isLoading && (
                  <div className="text-center p-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                    <p className="mt-2 text-slate-600">Đang xử lý tệp...</p>
                  </div>
                )}
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4" role="alert">
                    <div className="flex items-center gap-3">
                        <WarningIcon className="h-5 w-5 text-red-500 shrink-0" />
                        <p className="text-sm font-medium">{error}</p>
                    </div>
                    <button 
                        onClick={() => userData?.storeId && loadFirestoreData(userData.storeId, allProducts, inventory, uploadTimestamp, inventoryUploadTimestamp)}
                        className="whitespace-nowrap px-4 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-bold"
                    >
                        Thử lại
                    </button>
                  </div>
                )}
                {duplicateError && (
                    <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-700 p-4 rounded-md" role="alert">
                        <p className="font-bold">Sản phẩm đã có</p>
                        <p>Sản phẩm này đã có trong danh sách kết quả của bạn.</p>
                    </div>
                )}

              <input type="file" ref={importInputRef} onChange={handleImport} accept=".json" className="hidden" multiple />

              {!isMobile && (
                <InventoryToolbar 
                  inventory={inventory}
                  filters={inventoryFilters}
                  useInventoryQuantity={useInventoryQuantity}
                  onFilterChange={handleInventoryFilterChange}
                  onClearFilters={handleClearInventoryFilters}
                  onUseInventoryQuantityChange={handleUseInventoryQuantityChange}
                  hasManualProducts={manualProducts.length > 0}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSortChange={handleSortChange}
                  onExportImage={async () => {
                    const target = productListRef.current;
                    if (!target || target.children.length === 0) {
                      showAlert('Không có sản phẩm nào để xuất ảnh.', 'Thông báo');
                      return;
                    }
                    try {
                      showExportOverlay('Đang xuất ảnh danh sách sản phẩm...');
                      const filename = `danh-sach-san-pham-${new Date().toISOString().slice(0,10)}.png`;
                      const blob = await exportElementAsImage(target, filename, {
                        elementsToHide: ['.hide-on-export'],
                        scale: 2,
                        captureAsDisplayed: true
                      });
                      hideExportOverlay();
                      if (blob) {
                        downloadBlob(blob, filename);
                      } else {
                        showAlert('Không thể xuất ảnh. Vui lòng thử lại.', 'Lỗi');
                      }
                    } catch (err) {
                      console.error('Export image error:', err);
                      hideExportOverlay();
                      showAlert('Không thể xuất ảnh. Vui lòng thử lại.', 'Lỗi');
                    }
                  }}
                />
              )}
              </div>

              <div ref={productListRef} className={`flex-1 ${isMobile ? 'space-y-2' : 'mt-2'}`}>
              <ResultsDisplay 
                results={sortedProducts} 
                hasData={allProducts.length > 0} 
                highlightedMsp={highlightedMsp}
                onToggleSelect={handleToggleSelect}
                onQuantityChange={handleQuantityChange}
                onSetQuantity={handleSetQuantity}
                onPrintSingle={handlePrintSingle}
                onDelete={handleDeleteProduct}
                isMobile={isMobile}
              />
              </div>
            </div>
          </main>
        </div>

        {isMobile && (
          <BottomNavigation
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onScanClick={() => setIsScannerOpen(true)}
            onSaveListClick={handleSaveList}
            onFilterClick={() => setIsFilterModalOpen(true)}
          />
        )}

        {isFilterModalOpen && (
          <FilterModal
            isOpen={isFilterModalOpen}
            onClose={() => setIsFilterModalOpen(false)}
            inventory={inventory}
            filters={inventoryFilters}
            useInventoryQuantity={useInventoryQuantity}
            onFilterChange={handleInventoryFilterChange}
            onClearFilters={handleClearInventoryFilters}
            onUseInventoryQuantityChange={handleUseInventoryQuantityChange}
            sortField={sortField}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
          />
        )}

        {isScannerOpen && (
          <Scanner
            onScanSuccess={handleScanSuccess}
            onClose={() => setIsScannerOpen(false)}
          />
        )}

        {isPrintSettingsOpen && (
            <PrintSettingsModal
                settings={printSettings}
                onSettingsChange={setPrintSettings}
                onClose={() => setIsPrintSettingsOpen(false)}
            />
        )}
        
        {isLayoutModalOpen && (
            <LayoutSelectionModal
                onSelect={executePrint}
                stickerStyle={printSettings.stickerStyle || 'default'}
                onStickerStyleChange={(style) => setPrintSettings({ ...printSettings, stickerStyle: style })}
                modernPositions={modernPositions}
                onModernPositionsChange={setModernPositions}
                onClose={() => {
                  setIsLayoutModalOpen(false);
                }}
            />
        )}

        {isManualInputOpen && (
          <ManualInputModal
            onClose={() => setIsManualInputOpen(false)}
            onPrintSelected={handleManualPrintSelected}
            onSaveProduct={handleManualSaveBound}
            onDeleteProduct={handleManualDeleteBound}
            onUpdateProduct={handleManualUpdateBound}
            manualProducts={manualProducts}
          />
        )}

        {isUserManagementOpen && (
          <UserManagementModal
            isOpen={isUserManagementOpen}
            onClose={() => setIsUserManagementOpen(false)}
            storeId={userData?.storeId}
            currentUserId={user?.uid || ''}
          />
        )}

        {isChangePasswordOpen && (
          <ChangePasswordModal
            isOpen={isChangePasswordOpen}
            onClose={() => setIsChangePasswordOpen(false)}
          />
        )}
        
        {pdfPreviewUrl && (
          <PdfPreviewModal
              url={pdfPreviewUrl}
              fileName={`in-gia-sticker-${new Date().toISOString().slice(0, 10)}.pdf`}
              onClose={() => setPdfPreviewUrl(null)}
          />
        )}
        
        <ConfirmModal
          isOpen={isResetConfirmOpen}
          onClose={() => setIsResetConfirmOpen(false)}
          onConfirm={executeReset}
          title="Xác nhận Xóa"
          message="Bạn có chắc chắn muốn xóa toàn bộ danh sách sản phẩm đang hiển thị không? (Dữ liệu gốc trong hệ thống vẫn được giữ nguyên)"
          confirmText="Xóa"
          cancelText="Hủy"
          type="danger"
        />

        <ConfirmModal
          isOpen={isClearAllConfirmOpen}
          onClose={() => setIsClearAllConfirmOpen(false)}
          onConfirm={executeClearAll}
          title="Xác nhận Xóa Hệ Thống"
          message="Hành động này sẽ xóa TOÀN BỘ dữ liệu tồn kho và bảng giá trên hệ thống. Bạn có chắc chắn muốn tiếp tục?"
          confirmText="Xác nhận Xóa"
          cancelText="Hủy"
          type="danger"
        />

        {isSavedListsModalOpen && userData?.storeId && user && (
          <SavedListsModal
            storeId={userData.storeId}
            userId={user.uid}
            isAdmin={userData.role === 'admin'}
            onClose={() => setIsSavedListsModalOpen(false)}
            onLoadList={handleLoadSavedList}
          />
        )}

        {isPrinting && (
          <div className="fixed inset-0 z-50 bg-slate-900/30 flex flex-col items-center justify-center backdrop-blur-md">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-400"></div>
            <p className="text-white mt-4 text-lg font-medium">Đang tạo tệp PDF...</p>
          </div>
        )}

        <SaveListModal
          isOpen={isSaveListModalOpen}
          onClose={() => setIsSaveListModalOpen(false)}
          onSave={onConfirmSaveList}
          defaultName={`Danh sách ${new Date().toLocaleDateString('vi-VN')}`}
        />

        <UserGuideModal 
          isOpen={isUserGuideOpen} 
          onClose={() => setIsUserGuideOpen(false)} 
          userRole={userData?.role}
        />

        <AlertModal
          isOpen={alertConfig.isOpen}
          onClose={() => setAlertConfig({ ...alertConfig, isOpen: false })}
          message={alertConfig.message}
          title={alertConfig.title}
        />

        {isSuperAdmin && (
          <SuperAdminModal
            isOpen={isSuperAdminModalOpen}
            onClose={() => setIsSuperAdminModalOpen(false)}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}

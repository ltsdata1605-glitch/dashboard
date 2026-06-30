import React from 'react';
import { createPortal } from 'react-dom';
import './phanca.css';
import { usePhanCa } from './hooks/usePhanCa';

import Controls from './components/Controls';
import Legend from './components/Legend';
import ScheduleTable from './components/ScheduleTable';
import VerticalIndividualSchedule from './components/VerticalIndividualSchedule';
import EditRulesModal from './components/EditRulesModal';
import ConfirmModal from './components/ConfirmModal';
import EditShiftModal from './components/EditShiftModal';
import DailyStatsTable from './components/DailyStatsTable';
import ImportStaffModal from './components/ImportStaffModal';
import EditPatternModal from './components/EditPatternModal';
import HistoryModal from './components/HistoryModal';
import ConflictListModal from './components/ConflictListModal';
import { ConfirmDialog } from '../../components/shared/ui/ConfirmDialog';
import { recalculateStatsForStaff } from './utils/scheduleUtils';

const App: React.FC = () => {
  const {
    mounted,
    activeTab,
    handleImportClick,
    handleDeleteStaffList,
    setEditPatternModalOpen,
    handleExportAll,
    hasStaff,
    handleExportWeekly,
    handleExportIndividual,
    handleExportExcel,
    handleExportGoogleSheet,
    isExportingImage,
    monthYear,
    setMonthYear,
    startDay,
    setStartDay,
    duration,
    setDuration,
    handleGenerateClick,
    uniqueDepartments,
    departmentFilter,
    setDepartmentFilter,
    supermarkets,
    currentSupermarket,
    handleSupermarketChange,
    onboardingStep,
    departmentPatterns,
    handleDateControlClick,
    exportContainerRef,
    isIndividualExport,
    exportTitle,
    setHistoryModalOpen,
    targets,
    handleEditRule,
    includeTnInSbh,
    setIncludeTnInSbh,
    autoAddWeekendShifts,
    handleAutoAddWeekendShiftsChange,
    autoAddWeekendShift1,
    handleAutoAddWeekendShift1Change,
    staffList,
    scheduleConfig,
    dailyRequirements,
    setDailyRequirements,
    statsDay,
    setStatsDay,
    unresolvedConflicts,
    handleShowConflicts,
    listForTable,
    tableRef,
    handleDeleteEmployee,
    handleEditShift,
    handleDayHover,
    hoveredDay,
    weeklyExportConfig,
    currentHighlightedId,
    handleSwapShifts,
    fileInputRef,
    handleFileChange,
    isEditRulesModalOpen,
    editingRuleKey,
    rules,
    setRules,
    setEditRulesModalOpen,
    generateNewSchedule,
    isEditPatternModalOpen,
    setDepartmentPatterns,
    staffCountByDept,
    shiftDefinitions,
    setShiftDefinitions,
    isImportModalOpen,
    importedStaff,
    setImportModalOpen,
    handleConfirmImport,
    isEditShiftModalOpen,
    editingCellInfo,
    setEditShiftModalOpen,
    handleSaveShift,
    busySchedule,
    isHistoryModalOpen,
    scheduleHistory,
    isConflictModalOpen,
    setConflictModalOpen,
    isDeleteConfirmOpen,
    confirmDeleteStaffList,
    setIsDeleteConfirmOpen,
    confirmDialog,
    closeConfirm,
    batchExportProgress
  } = usePhanCa();


  return (
    <div className="phan-ca-layout min-h-screen bg-[#f0f2f5] pb-20">
      {/* EXPORT OVERLAY */}
      {batchExportProgress && (
          <div className="fixed inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-[100]">
              <div className="bg-white p-10 shadow-2xl flex flex-col items-center max-w-md w-full border border-slate-200">
                <div className="spinner !w-14 !h-14 !border-[5px] mb-6"></div>
                <p className="text-xl font-extrabold text-slate-800 mb-3">Đang xử lý dữ liệu</p>
                <div className="w-full bg-slate-100 h-2 mb-3 overflow-hidden">
                    <div className="bg-indigo-600 h-full transition-all duration-500" style={{ width: `${(batchExportProgress.current / batchExportProgress.total) * 100}%` }}></div>
                </div>
                <p className="text-slate-400 font-semibold text-sm mb-5">{batchExportProgress.current} / {batchExportProgress.total}</p>
                <div className="bg-indigo-50 text-indigo-700 font-bold px-5 py-3 w-full text-center truncate text-sm">
                    {batchExportProgress.name}
                </div>
              </div>
          </div>
      )}

      {/* GLOBAL HEADER ACTIONS PORTAL */}
      {mounted && activeTab === 'tools-phanca' && document.getElementById('global-header-actions') && createPortal(
          <div className="flex items-center gap-2 bg-white/60 dark:bg-slate-900/60 p-1.5 rounded-full border border-slate-200/50 dark:border-slate-700/50 backdrop-blur-xl shadow-sm">
            {/* Data management group */}
            <div className="flex items-center rounded-full overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)]">
              <button onClick={handleImportClick} className="flex items-center gap-2 px-4 py-2 bg-blue-50/50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 font-semibold text-sm transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                  <span>Nhập NV</span>
              </button>
              <a href="https://office.thegioididong.com/quan-ly-phan-ca" target="_blank" rel="noopener noreferrer" className="p-2 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 border-l border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors" title="Lấy danh sách nhân viên từ hệ thống">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              </a>
              <button onClick={handleDeleteStaffList} className="p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-50 dark:text-slate-400 dark:hover:bg-rose-900/20 border-l border-slate-100 dark:border-slate-700 transition-colors" title="Xóa danh sách">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
              <button onClick={() => setEditPatternModalOpen(true)} className="flex items-center gap-2 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-indigo-50 hover:text-indigo-700 dark:hover:bg-indigo-900/30 dark:hover:text-indigo-400 font-semibold text-sm border-l border-slate-100 dark:border-slate-700 transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" /></svg>
                  <span>Ca Xoay</span>
              </button>
            </div>

            {/* Export group */}
            <div className="flex items-center rounded-full overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.05)]">
              <button onClick={handleExportAll} className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors" disabled={!hasStaff}>
                  Tất cả
              </button>
              <button onClick={handleExportWeekly} className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/50 border-l border-slate-100 dark:border-slate-700 transition-colors" disabled={!hasStaff}>
                  Tuần
              </button>
              <button onClick={handleExportIndividual} className="px-4 py-2 text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 border-l border-slate-700 transition-colors" disabled={!hasStaff}>
                  Từng NV
              </button>
              <button onClick={handleExportExcel} className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 border-l border-emerald-700 transition-colors" disabled={!hasStaff}>
                  Excel
              </button>
              <button onClick={handleExportGoogleSheet} className="px-4 py-2 text-sm font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border-l border-blue-200 transition-colors" disabled={!hasStaff} title="Xuất ra Google Sheet">
                  Sheet
              </button>
            </div>
          </div>,
          document.getElementById('global-header-actions')!
      )}

      {/* Mobile action bar — lg:hidden */}
      <div className="lg:hidden sticky top-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/60 px-3 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <button onClick={handleImportClick} className="h-8 px-3 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-md transition-colors flex items-center gap-1.5 shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
              Nhập NV
          </button>
          <a href="https://office.thegioididong.com/quan-ly-phan-ca" target="_blank" rel="noopener noreferrer" className="h-8 px-2.5 text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors flex items-center justify-center shrink-0" title="Lấy DS NV">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
          </a>
          <button onClick={handleDeleteStaffList} className="h-8 px-2.5 text-xs font-semibold text-slate-500 bg-slate-100 hover:bg-rose-50 hover:text-rose-600 rounded-md transition-colors flex items-center gap-1.5 shrink-0" title="Xóa danh sách">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Xoá
          </button>
          <button onClick={() => setEditPatternModalOpen(true)} className="h-8 px-3 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 rounded-md transition-colors flex items-center gap-1.5 shrink-0">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16m-7 6h7" /></svg>
              Ca Xoay
          </button>
          <div className="w-px h-5 bg-slate-200 shrink-0"></div>
          <button onClick={handleExportAll} className="h-8 px-2.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-md transition-colors shrink-0" disabled={!hasStaff}>
              Tất cả
          </button>
          <button onClick={handleExportWeekly} className="h-8 px-2.5 text-xs font-semibold text-slate-600 bg-white border border-slate-200 rounded-md transition-colors shrink-0" disabled={!hasStaff}>
              Tuần
          </button>
          <button onClick={handleExportIndividual} className="h-8 px-2.5 text-xs font-bold text-white bg-slate-800 rounded-md transition-colors shrink-0" disabled={!hasStaff}>
              Từng NV
          </button>
          <button onClick={handleExportExcel} className="h-8 px-2.5 text-xs font-bold text-white bg-emerald-600 rounded-md transition-colors shrink-0" disabled={!hasStaff}>
              Excel
          </button>
          <button onClick={handleExportGoogleSheet} className="h-8 px-2.5 text-xs font-bold text-blue-700 bg-blue-50 rounded-md transition-colors shrink-0" disabled={!hasStaff} title="Xuất ra Google Sheet">
              Sheet
          </button>
      </div>

      <main className="max-w-[1600px] mx-auto px-6 mt-6">
        <div className={`bg-white p-5 border border-slate-200 mb-6 ${isExportingImage ? 'export-hidden' : ''}`}>
          <Controls 
            monthYear={monthYear} setMonthYear={setMonthYear} startDay={startDay} setStartDay={setStartDay} duration={duration} setDuration={setDuration}
            onGenerate={handleGenerateClick} departments={uniqueDepartments} departmentFilter={departmentFilter} setDepartmentFilter={setDepartmentFilter}
            supermarkets={supermarkets} currentSupermarket={currentSupermarket} setSupermarket={handleSupermarketChange} onboardingStep={onboardingStep}
            hasStaff={hasStaff} hasPatternsForCurrentDept={!!departmentPatterns[departmentFilter]} onDateControlClick={handleDateControlClick}
          />
        </div>

        <div ref={exportContainerRef} className={`bg-white overflow-hidden border border-slate-200 shadow-sm ${isIndividualExport ? 'max-w-5xl mx-auto' : ''}`}>
          <div className={`px-8 pt-8 pb-6 border-b border-slate-100 ${isIndividualExport ? 'hidden' : ''}`}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">
                  {exportTitle || `LỊCH PHÂN CA - ${currentSupermarket || 'Cửa Hàng'}`}
                </h1>
              </div>
              {!isExportingImage && (
                <button onClick={() => setHistoryModalOpen(true)} className="p-2.5 border border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition-colors" title="Lịch sử thay đổi">
                  <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </button>
              )}
            </div>
            <div>
               <Legend 
                 targets={targets} 
                 onEditRule={handleEditRule} 
                 includeTnInSbh={includeTnInSbh} 
                 onIncludeTnInSbhChange={setIncludeTnInSbh} 
                 onboardingStep={onboardingStep} 
                 autoAddWeekendShifts={autoAddWeekendShifts}
                 onAutoAddWeekendShiftsChange={handleAutoAddWeekendShiftsChange}
                 autoAddWeekendShift1={autoAddWeekendShift1}
                 onAutoAddWeekendShift1Change={handleAutoAddWeekendShift1Change}
               />
            </div>
          </div>

          <div className={`px-5 pb-0 ${isExportingImage ? 'export-hidden' : ''}`}>
             <DailyStatsTable 
                staffList={staffList} config={scheduleConfig} requirements={dailyRequirements} setRequirements={setDailyRequirements}
                selectedDay={statsDay} setSelectedDay={setStatsDay} departmentFilter={departmentFilter} unresolvedConflicts={unresolvedConflicts} onShowUnresolvedConflicts={handleShowConflicts}
             />
          </div>

          <div className="px-5 py-6">
            {hasStaff && targets ? (
              isIndividualExport ? (
                 <VerticalIndividualSchedule 
                    staff={listForTable[0]} 
                    config={scheduleConfig} 
                    targets={targets} 
                    includeTnInSbh={includeTnInSbh} 
                 />
              ) : (
                <ScheduleTable 
                    staffList={listForTable} 
                    config={scheduleConfig} 
                    targets={targets} 
                    tableRef={tableRef}
                    includeTnInSbh={includeTnInSbh}
                    onDeleteEmployee={handleDeleteEmployee} 
                    onEditShift={handleEditShift}
                    onDayHover={handleDayHover} 
                    hoveredDay={hoveredDay} 
                    weekRange={weeklyExportConfig} 
                    highlightId={currentHighlightedId}
                    onSwapShift={handleSwapShifts}
                />
              )
            ) : hasStaff ? (
              <div className="py-32 flex flex-col items-center justify-center">
                <div className="spinner !w-10 !h-10"></div>
                <p className="mt-4 font-semibold text-slate-400 text-sm">Đang khởi tạo mục tiêu...</p>
              </div>
            ) : (
              <div className="py-32 flex flex-col items-center justify-center opacity-25">
                <svg className="w-24 h-24 mb-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.8} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                <p className="font-bold text-lg uppercase tracking-[0.15em] text-slate-400">Dữ liệu đang trống</p>
              </div>
            )}
          </div>
          
          {/* Footer signature for official exports */}
          {!isIndividualExport && isExportingImage && (
              <div className="px-8 py-8 flex justify-end">
                  <div className="text-center w-56 border-t-2 border-slate-200 pt-4">
                      <p className="font-bold text-slate-800 uppercase text-[10px] tracking-wider mb-10">Quản Lý Duyệt</p>
                      <p className="font-semibold text-slate-400 text-[9px] italic">(Ký và ghi rõ họ tên)</p>
                  </div>
              </div>
          )}
        </div>
      </main>

      {/* Modals & Inputs */}
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".xlsx, .xls" />
      {isEditRulesModalOpen && <EditRulesModal ruleKey={editingRuleKey!} currentRules={rules} availableShifts={[]} onClose={() => setEditRulesModalOpen(false)} onSave={(r) => { setRules(r); setEditRulesModalOpen(false); generateNewSchedule({rulesOverride: r}); }} />}
      {isEditPatternModalOpen && <EditPatternModal 
        allDepartments={uniqueDepartments} 
        currentPatterns={departmentPatterns} 
        onClose={() => setEditPatternModalOpen(false)} 
        onSave={(p) => { 
          setDepartmentPatterns(p); 
          setEditPatternModalOpen(false); 
          generateNewSchedule({patternsOverride: p}); 
        }} 
        staffCountByDept={staffCountByDept} 
        dailyRequirements={dailyRequirements} 
        onRequirementsUpdate={setDailyRequirements}
        shiftDefinitions={shiftDefinitions}
        onShiftDefinitionsUpdate={(sd) => {
            setShiftDefinitions(sd);
            idb.saveData(getKey('shiftDefinitions'), sd);
        }}
      />}
      {isImportModalOpen && <ImportStaffModal staffList={importedStaff} onClose={() => setImportModalOpen(false)} onConfirm={handleConfirmImport} existingSupermarkets={supermarkets} />}
      {isEditShiftModalOpen && editingCellInfo && <EditShiftModal info={editingCellInfo} onClose={() => setEditShiftModalOpen(false)} onSave={handleSaveShift} onFindSolution={() => null} onConfirmReplacement={() => {}} onConfirmDaySwap={() => {}} onFindSolutionForDemotion={() => null} onConfirmSwapAndChange={() => {}} rules={rules} allStaff={staffList} dailyRequirements={dailyRequirements} busySchedule={busySchedule} onConfirmCutShift={()=>{}} onConfirmNormalSwap={handleSwapShifts} onConfirmCutAndSwap={()=>{}} onConfirmMultipleChanges={(a) => {
          setStaffList(prev => {
             const newList = [...prev];
             a.forEach(act => {
                const idx = newList.findIndex(s => s.id === act.staff.id);
                if (idx !== -1) {
                    const s = { ...newList[idx], schedule: [...newList[idx].schedule], stats: { ...newList[idx].stats } };
                    s.schedule[editingCellInfo.dayIndex] = { ...act.newShift, isManual: true };
                    s.stats = recalculateStatsForStaff(s);
                    newList[idx] = s;
                }
             });
             return newList;
          });
          setEditShiftModalOpen(false);
      }} />}
      {isHistoryModalOpen && <HistoryModal history={scheduleHistory} onClose={() => setHistoryModalOpen(false)} onRestore={(i) => { setStaffList(scheduleHistory[i].scheduleSnapshot); setHistoryModalOpen(false); }} />}
      {isConflictModalOpen && <ConflictListModal conflicts={unresolvedConflicts} onClose={() => setConflictModalOpen(false)} />}
      {isDeleteConfirmOpen && <ConfirmModal 
        message="Bạn có chắc chắn muốn xóa danh sách nhân viên hiện tại? Lịch phân ca, mẫu ca, và lịch bận cũng sẽ bị xóa." 
        onConfirm={confirmDeleteStaffList} 
        onCancel={() => setIsDeleteConfirmOpen(false)} 
      />}

      <ConfirmDialog 
          isOpen={confirmDialog.isOpen}
          onClose={closeConfirm}
          onConfirm={confirmDialog.onConfirm}
          title={confirmDialog.title}
          message={confirmDialog.message}
          variant={confirmDialog.variant}
          confirmText={confirmDialog.confirmText}
      />

    </div>
  );
};

export default App;


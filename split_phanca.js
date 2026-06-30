const fs = require('fs');

const path = './features/phan-ca/PhanCaView.tsx';
const content = fs.readFileSync(path, 'utf8');

// Find the start of the App component
const appStartMatch = content.match(/const App: React\.FC = \(\) => {\n/);
const appStartIndex = appStartMatch.index;

// Find the start of the JSX return statement
const returnMatch = content.match(/\n  return \(\n    <div className="phan-ca-layout/);
const returnIndex = returnMatch.index;

// 1. IMPORTS & CONSTANTS (Top of file up to App component)
const importsAndConstants = content.substring(0, appStartIndex);

// 2. LOGIC (Inside App component before return)
const logicBody = content.substring(appStartIndex + appStartMatch[0].length, returnIndex);

// 3. JSX (The return statement and everything after)
const jsxBody = content.substring(returnIndex);

// We need to figure out what variables are used in JSX so we can return them from usePhanCa.
// Instead of complex AST parsing, we can just manually list the known ones, or extract them.
const exportedKeys = [
  'mounted', 'activeTab', 'handleImportClick', 'handleDeleteStaffList', 'setEditPatternModalOpen',
  'handleExportAll', 'hasStaff', 'handleExportWeekly', 'handleExportIndividual', 'handleExportExcel',
  'handleExportGoogleSheet', 'isExportingImage', 'monthYear', 'setMonthYear', 'startDay', 'setStartDay',
  'duration', 'setDuration', 'handleGenerateClick', 'uniqueDepartments', 'departmentFilter',
  'setDepartmentFilter', 'supermarkets', 'currentSupermarket', 'handleSupermarketChange',
  'onboardingStep', 'departmentPatterns', 'handleDateControlClick', 'exportContainerRef',
  'isIndividualExport', 'exportTitle', 'setHistoryModalOpen', 'targets', 'handleEditRule',
  'includeTnInSbh', 'setIncludeTnInSbh', 'autoAddWeekendShifts', 'handleAutoAddWeekendShiftsChange',
  'autoAddWeekendShift1', 'handleAutoAddWeekendShift1Change', 'staffList', 'scheduleConfig',
  'dailyRequirements', 'setDailyRequirements', 'statsDay', 'setStatsDay', 'unresolvedConflicts',
  'handleShowConflicts', 'listForTable', 'tableRef', 'handleDeleteEmployee', 'handleEditShift',
  'handleDayHover', 'hoveredDay', 'weeklyExportConfig', 'currentHighlightedId', 'handleSwapShifts',
  'fileInputRef', 'handleFileChange', 'isEditRulesModalOpen', 'editingRuleKey', 'rules', 'setRules',
  'setEditRulesModalOpen', 'generateNewSchedule', 'isEditPatternModalOpen', 'setDepartmentPatterns',
  'staffCountByDept', 'shiftDefinitions', 'setShiftDefinitions', 'isImportModalOpen', 'importedStaff',
  'setImportModalOpen', 'handleConfirmImport', 'isEditShiftModalOpen', 'editingCellInfo',
  'setEditShiftModalOpen', 'handleSaveShift', 'busySchedule', 'isHistoryModalOpen', 'scheduleHistory',
  'isConflictModalOpen', 'setConflictModalOpen', 'isDeleteConfirmOpen', 'confirmDeleteStaffList',
  'setIsDeleteConfirmOpen', 'confirmDialog', 'closeConfirm', 'batchExportProgress'
];

// Let's create the usePhanCa hook
let usePhanCaContent = importsAndConstants.replace(/import \.\/phanca\.css';\n/g, ''); // Remove CSS import from hook
usePhanCaContent += `\nexport const usePhanCa = () => {\n`;
usePhanCaContent += logicBody;
usePhanCaContent += `\n  return { ${exportedKeys.join(', ')} };\n};\n`;

fs.writeFileSync('./features/phan-ca/hooks/usePhanCa.ts', usePhanCaContent);

// Let's create the refactored PhanCaView.tsx
let newViewContent = `import React from 'react';
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
    ${exportedKeys.join(',\n    ')}
  } = usePhanCa();

${jsxBody}
`;

fs.writeFileSync('./features/phan-ca/PhanCaView.tsx', newViewContent);
console.log("Refactoring complete");

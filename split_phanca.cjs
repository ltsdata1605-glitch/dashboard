const fs = require('fs');

const path = './features/phan-ca/PhanCaView.tsx';
const content = fs.readFileSync(path, 'utf8');

const appStartMatch = content.match(/const App: React\.FC = \(\) => {\n/);
const appStartIndex = appStartMatch.index;

const returnMatch = content.match(/\n  return \(\n    <div className="phan-ca-layout/);
const returnIndex = returnMatch.index;

const importsAndConstants = content.substring(0, appStartIndex);
const logicBody = content.substring(appStartIndex + appStartMatch[0].length, returnIndex);
const jsxBody = content.substring(returnIndex);

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

let usePhanCaContent = importsAndConstants.replace(/import '\.\/phanca\.css';\n/g, ''); 
usePhanCaContent += `\nexport const usePhanCa = () => {\n`;
usePhanCaContent += logicBody;
usePhanCaContent += `\n  return { ${exportedKeys.join(', ')} };\n};\n`;

if (!fs.existsSync('./features/phan-ca/hooks')) {
    fs.mkdirSync('./features/phan-ca/hooks');
}
fs.writeFileSync('./features/phan-ca/hooks/usePhanCa.ts', usePhanCaContent);

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

const fs = require('fs');

const path = './features/sticker-event/StickerPrinterView.tsx';
const content = fs.readFileSync(path, 'utf8');

const appStartMatch = content.match(/export default function StickerPrinterView\(\) {\n/);
const appStartIndex = appStartMatch.index;

const returnMatch = content.match(/\n    return \(\n        <div className="print-wrapper/);
const returnIndex = returnMatch.index;

const importsAndConstants = content.substring(0, appStartIndex);
const logicBody = content.substring(appStartIndex + appStartMatch[0].length, returnIndex);
const jsxBody = content.substring(returnIndex);

// Define variables to export from useStickerPrinter
const exportedKeys = [
    'activeTab', 'mounted', 'stickerMode', 'setStickerMode', 'eventEverOpened', 'setEventEverOpened',
    'stickerType', 'setStickerType', 'bgImage', 'setBgImage', 'priceSource', 'setPriceSource',
    'activeField', 'setActiveField', 'getActiveFieldLabel', 'getActiveFontSize', 'setActiveFontSize',
    'discountDisplayMode', 'setDiscountDisplayMode', 'discountThreshold', 'setDiscountThreshold',
    'activeQueuePageId', 'setActiveQueuePageId', 'activeSubTab', 'setActiveSubTab',
    'isMobile', 'showSettings', 'setShowSettings', 'printQueue', 'setPrintQueue',
    'printHistory', 'setPrintHistory', 'savedLists', 'setSavedLists', 'selectedHistoryId',
    'setSelectedHistoryId', 'historyViewMode', 'setHistoryViewMode', 'printFrameRef',
    'fileInputRef', 'isLoaded', 'hasAutoSaved', 'historySearchTerm', 'setHistorySearchTerm',
    'isSaveModalOpen', 'setIsSaveModalOpen', 'saveTitle', 'setSaveTitle', 'saveDesc', 'setSaveDesc',
    'selectedSavedListId', 'setSelectedSavedListId', 'headerTextSize', 'subHeaderTextSize',
    'percentTextSize', 'oldPriceTextSize', 'nameTextSize', 'newPriceTextSize', 'footerTextSize',
    'updatePageField', 'handleGlobalFieldChange', 'handleImageUpload', 'removePage', 'clearQueue',
    'handleLoadSavedList', 'handleDeleteSavedList', 'handleSaveListClick', 'confirmSaveList',
    'handleFileImport', 'handlePrintClick', 'loadHistoryToQueue', 'deleteHistoryEntry'
];

let useStickerPrinterContent = importsAndConstants;
// Replace internal imports
useStickerPrinterContent = useStickerPrinterContent.replace(/from '\.\/stickerprinter/g, "from '../stickerprinter");
useStickerPrinterContent = useStickerPrinterContent.replace(/from '\.\.\/\.\.\//g, "from '../../../");
useStickerPrinterContent = useStickerPrinterContent.replace(/from '\.\/SaveListModal'/g, "from '../SaveListModal'");
useStickerPrinterContent = useStickerPrinterContent.replace(/import StickerEventApp from '\.\/StickerEventApp';\n/g, ''); 

useStickerPrinterContent += `\nexport const useStickerPrinter = () => {\n`;
useStickerPrinterContent += logicBody;
useStickerPrinterContent += `\n  return { ${exportedKeys.join(', ')} };\n};\n`;

if (!fs.existsSync('./features/sticker-event/hooks')) {
    fs.mkdirSync('./features/sticker-event/hooks');
}
fs.writeFileSync('./features/sticker-event/hooks/useStickerPrinter.ts', useStickerPrinterContent);

let newViewContent = `import React, { Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, Package } from 'lucide-react';
import { useStickerPrinter } from './hooks/useStickerPrinter';
import { StickerPrintPreview } from './stickerprinter/StickerPrintPreview';
import { StickerManualQueue } from './stickerprinter/StickerManualQueue';
import { StickerPrintControls } from './stickerprinter/StickerPrintControls';
import ErrorBoundary from '../../components/common/ErrorBoundary';
const StickerEventApp = lazy(() => import('./StickerEventApp'));
import SaveListModal from './SaveListModal';

export default function StickerPrinterView() {
    const {
        ${exportedKeys.join(',\n        ')}
    } = useStickerPrinter();

${jsxBody}
`;

fs.writeFileSync('./features/sticker-event/StickerPrinterView.tsx', newViewContent);
console.log("StickerPrinterView refactored");

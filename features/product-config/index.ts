export { ProductConfigManagerTab } from './components/ProductConfigManagerTab';
export {
    getGlobalProductConfig,
    saveGlobalProductConfig,
    parseExcelProductConfigFile,
    exportProductConfigToExcel,
    computeConfigSummary,
} from './services/firebaseProductConfigService';
export type {
    GlobalProductConfigDoc,
    ProductConfigSummary,
    CategoryTableItem,
} from './types';

export { ProductConfigManagerTab } from './components/ProductConfigManagerTab';
export { HtxConfigTable } from './components/HtxConfigTable';
export { ProductCodeConfigTable } from './components/ProductCodeConfigTable';
export { ConfigTable } from './components/ConfigTable';
export { ProductConfigTemplateHub } from './components/ProductConfigTemplateHub';
export {
    getGlobalProductConfig,
    saveGlobalProductConfig,
    parseExcelProductConfigFile,
    parseExcelProductCodeConfigFile,
    parseExcelHtxConfigFile,
    exportProductConfigToExcel,
    exportProductCodeConfigToExcel,
    exportHtxConfigToExcel,
    exportCategoryConfigTemplateToExcel,
    exportHtxConfigTemplateToExcel,
    extractHtxTableItems,
    computeConfigSummary,
} from './services/firebaseProductConfigService';
export type {
    GlobalProductConfigDoc,
    ProductConfigSummary,
    CategoryTableItem,
    ProductCodeTableItem,
    HtxTableItem,
    HtxClassificationType,
} from './types';

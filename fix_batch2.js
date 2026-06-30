const fs = require('fs');

// dbService.ts
let db = fs.readFileSync('./services/dbService.ts', 'utf8');
db = db.replace(/export const DEDUPLICATION_SETTING_KEY/g, 'const DEDUPLICATION_SETTING_KEY');
db = db.replace(/export const SUMMARY_TABLE_CONFIG_KEY/g, 'const SUMMARY_TABLE_CONFIG_KEY');
db = db.replace(/export \{ getSetting as getValue, saveSetting as setValue \};\n/g, '');
db = db.replace(/export async function saveSalesData/g, 'async function saveSalesData');
db = db.replace(/export async function getSalesData/g, 'async function getSalesData');
db = db.replace(/export async function getTopSellerAnalysisHistory/g, 'async function getTopSellerAnalysisHistory');
db = db.replace(/export async function saveThemeMap/g, 'async function saveThemeMap');
db = db.replace(/export async function getThemeMap/g, 'async function getThemeMap');
db = db.replace(/export async function saveEmployeeColumnConfig/g, 'async function saveEmployeeColumnConfig');
db = db.replace(/export async function getEmployeeColumnConfig/g, 'async function getEmployeeColumnConfig');
db = db.replace(/export async function clearCustomTabs/g, 'async function clearCustomTabs');
db = db.replace(/export async function saveIndustryGridFilters/g, 'async function saveIndustryGridFilters');
db = db.replace(/export async function saveEmployeeAnalysisFilters/g, 'async function saveEmployeeAnalysisFilters');
db = db.replace(/export async function getEmployeeAnalysisFilters/g, 'async function getEmployeeAnalysisFilters');
fs.writeFileSync('./services/dbService.ts', db);

// filterService.ts
let filter = fs.readFileSync('./services/filterService.ts', 'utf8');
filter = filter.replace(/export const isXuatMatch/g, 'const isXuatMatch');
filter = filter.replace(/export const getCreatorDepartment/g, 'const getCreatorDepartment');
filter = filter.replace(/export const isTrangThaiMatch/g, 'const isTrangThaiMatch');
filter = filter.replace(/export const isNguoiTaoMatch/g, 'const isNguoiTaoMatch');
filter = filter.replace(/export const isDepartmentMatch/g, 'const isDepartmentMatch');
fs.writeFileSync('./services/filterService.ts', filter);

// syncService.ts
let sync = fs.readFileSync('./services/syncService.ts', 'utf8');
sync = sync.replace(/export async function pullSettingsFromFirebase/g, 'async function pullSettingsFromFirebase');
sync = sync.replace(/export async function pushSettingsToFirebase/g, 'async function pushSettingsToFirebase');
fs.writeFileSync('./services/syncService.ts', sync);

console.log("Batch 2 fixed");

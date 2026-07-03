const fs = require('fs');
const path = 'hooks/useDataManagement.ts';
let content = fs.readFileSync(path, 'utf8');

const bgSyncCode = `
                // 3. Background Sheet Check (Auto-update config once gracefully)
                if (config) {
                    setTimeout(async () => {
                        try {
                            const latestConfig = await loadConfigFromSheet(configUrl, () => {});
                            const serializeConfig = (c: any) => JSON.stringify(c, (key, value) => (value instanceof Set ? Array.from(value).sort() : value));
                            if (serializeConfig(config) !== serializeConfig(latestConfig)) {
                                console.log("Phát hiện cấu hình ProductConfig mới từ Google Sheet, tự động nạp ngầm & lưu lên mây...");
                                dbService.saveProductConfig(latestConfig, configUrl).catch(console.error);
                                setProductConfig(latestConfig);
                            } else {
                                console.log("[Background Check] Cấu hình ProductConfig trên Sheet không thay đổi.");
                            }
                        } catch (updateError) {
                            console.warn("Không thể kiểm tra Sheet tĩnh ngầm:", updateError);
                        }
                    }, 5000); // Wait 5s to ensure app is fully interactive before doing heavy fetch
                }

                // Load registry
                await refreshRegistry();`;

content = content.replace(
    /\/\/ Load registry\s+await refreshRegistry\(\);/g,
    bgSyncCode
);

fs.writeFileSync(path, content);

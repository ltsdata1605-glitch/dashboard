const fs = require('fs');
const path = 'hooks/useDataManagement.ts';
let content = fs.readFileSync(path, 'utf8');

// Replace the background check in useDataManagement.ts
const targetCheck = `                // 3. Background Sheet Check (Auto-update config once gracefully)
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
                            console.error("[Background Check] Lỗi tải cấu hình:", updateError);
                        }
                    }, 5000); // Wait 5s before checking to not block main thread
                }`;

const replacementCheck = `                // 3. Background Sheet Check (Auto-update config once gracefully)
                if (config) {
                    setTimeout(async () => {
                        try {
                            // FAST CHECK: Use HEAD request to get the published timestamp from the redirect URL
                            const headResponse = await fetch(configUrl, { method: 'HEAD' }).catch(() => null);
                            let shouldDownload = true;
                            
                            if (headResponse && headResponse.url) {
                                const match = headResponse.url.match(/\\/(\\d{13})\\//);
                                if (match && cachedConfigReq && cachedConfigReq.fetchedAt) {
                                    const cloudTimestamp = parseInt(match[1]);
                                    const localTimestamp = new Date(cachedConfigReq.fetchedAt).getTime();
                                    
                                    // If cloud timestamp is older or equal to our fetch time (minus a small margin to be safe), we don't need to download
                                    if (cloudTimestamp < localTimestamp + 60000) {
                                        shouldDownload = false;
                                        console.log("[Background Check] Cấu hình ProductConfig trên Sheet chưa có bản mới. (Bỏ qua tải xuống toàn bộ)");
                                    }
                                }
                            }

                            if (shouldDownload) {
                                console.log("[Background Check] Có thể có cấu hình mới, bắt đầu tải toàn bộ...");
                                const latestConfig = await loadConfigFromSheet(configUrl, () => {});
                                const serializeConfig = (c: any) => JSON.stringify(c, (key, value) => (value instanceof Set ? Array.from(value).sort() : value));
                                if (serializeConfig(config) !== serializeConfig(latestConfig)) {
                                    console.log("Phát hiện cấu hình ProductConfig mới từ Google Sheet, tự động nạp ngầm & lưu lên mây...");
                                    dbService.saveProductConfig(latestConfig, configUrl).catch(console.error);
                                    setProductConfig(latestConfig);
                                } else {
                                    console.log("[Background Check] Cấu hình ProductConfig trên Sheet không thay đổi so với hiện tại.");
                                }
                            }
                        } catch (updateError) {
                            console.error("[Background Check] Lỗi tải cấu hình:", updateError);
                        }
                    }, 5000); // Wait 5s before checking to not block main thread
                }`;

if (content.includes(targetCheck)) {
    content = content.replace(targetCheck, replacementCheck);
    fs.writeFileSync(path, content);
    console.log("Successfully replaced background check.");
} else {
    console.log("Target string not found in useDataManagement.ts.");
}

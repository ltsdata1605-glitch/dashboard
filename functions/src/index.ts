// Entry point Cloud Functions — xem implementation_plan.md mục 5 để biết
// vai trò từng hàm và file client sẽ gọi tới nó.
export { resolveSession, requestAccess, demoteExpiredUsers } from './session';
export { adminUpdateUser, listManagedUsers } from './admin';
export { getApprovalSettings, updateApprovalSettings } from './approvalSettings';
export { generateWithGemini, parseSalarySlipWithGemini } from './gemini';
export { stickerRegister, stickerResolveSession, stickerAdminUpdateUser, stickerStaffAuth } from './stickerEvent';
export { lineBotWebhook } from './lineBotWebhook';
export { lineBotFindWarehouseBot } from './lineBotScope';
export { dailyMorningInventoryReport, dailyEveningUsageSummary, lineBotUserSchedules } from './lineBotScheduler';
export { pmhRelayPoll, pmhRelayComplete } from './pmhRelay';


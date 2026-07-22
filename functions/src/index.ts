// Entry point Cloud Functions — xem implementation_plan.md mục 5 để biết
// vai trò từng hàm và file client sẽ gọi tới nó.
export { resolveSession, requestAccess, demoteExpiredUsers } from './session';
export { adminUpdateUser, listManagedUsers } from './admin';
export { generateWithGemini } from './gemini';
export { stickerRegister, stickerResolveSession, stickerAdminUpdateUser } from './stickerEvent';

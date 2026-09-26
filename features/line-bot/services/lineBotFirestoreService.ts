/**
 * Firestore Service cho Phân hệ BOT LINE (Multi-tenant theo userId)
 */

import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    getDocs,
    deleteDoc,
    writeBatch,
    query,
    where,
    orderBy,
    limit
} from 'firebase/firestore';
import { db } from '../../../services/firebase';
import {
    LineBotConfig,
    WarehouseBotSummary,
    Coupon,
    BotSchedule,
    KeywordReply,
    LineAdmin,
    LineGroup,
    InteractedUser,
    ExpiredProductRecord,
    FilteredCouponRecord,
    GroupFeatureConfig
} from '../types/lineBot.types';
import { getVietnamTodayString } from './couponParser';

const ROOT_COLLECTION = 'line_bots';

export const lineBotFirestoreService = {
    /**
     * Tìm Bot LINE đã được tạo và chia sẻ trong cùng Mã Kho (departmentId)
     */
    async findWarehouseBot(departmentId: string): Promise<WarehouseBotSummary | null> {
        const cleanDept = (departmentId || '').trim();
        if (!cleanDept || cleanDept === 'ALL' || cleanDept === 'ALL (Super Admin)') return null;
        try {
            const q = query(
                collection(db, ROOT_COLLECTION),
                where('departmentId', '==', cleanDept),
                where('active', '==', true),
                limit(5)
            );
            const snap = await getDocs(q);
            if (snap.empty) return null;
            // Tìm bot có isWarehouseShared !== false và đã có channelAccessToken
            const sharedDoc = snap.docs.find(d => {
                const data = d.data();
                return data.isWarehouseShared !== false && Boolean(data.channelAccessToken);
            });
            if (!sharedDoc) return null;
            const data = sharedDoc.data();
            return {
                id: sharedDoc.id,
                botName: data.botName || 'BOT LINE PMH',
                botBasicId: data.botBasicId || '',
                pictureUrl: data.pictureUrl,
                departmentId: data.departmentId || cleanDept,
                ownerEmail: data.ownerEmail,
                ownerName: data.ownerName,
                active: data.active ?? true,
                autoApprove: data.autoApprove ?? true,
                updatedAt: data.updatedAt || new Date().toISOString()
            };
        } catch (error) {
            console.error('[lineBotFirestoreService] Lỗi findWarehouseBot:', error);
            return null;
        }
    },

    /**
     * Lấy cấu hình Bot của Quản lý
     */
    async getBotConfig(userId: string): Promise<LineBotConfig | null> {
        if (!userId) return null;
        try {
            const docRef = doc(db, ROOT_COLLECTION, userId);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                return snap.data() as LineBotConfig;
            }
            return null;
        } catch (error) {
            console.error('[lineBotFirestoreService] Lỗi getBotConfig:', error);
            return null;
        }
    },

    /**
     * Lưu hoặc cập nhật cấu hình Bot
     */
    async saveBotConfig(userId: string, config: Partial<LineBotConfig>): Promise<void> {
        if (!userId) throw new Error('Thiếu userId');
        const docRef = doc(db, ROOT_COLLECTION, userId);
        const now = new Date().toISOString();
        const payload: Record<string, unknown> = {
            ...config,
            userId,
            isWarehouseShared: config.isWarehouseShared ?? true,
            updatedAt: now
        };
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
            payload.createdAt = now;
            payload.active = config.active ?? true;
            payload.autoApprove = config.autoApprove ?? true;
            payload.approvalCommand = config.approvalCommand || 'DUYỆT';
            payload.lowStockThresholds = config.lowStockThresholds || { warning: 30, high: 20, critical: 10 };
            payload.syntaxTemplate = config.syntaxTemplate || '[ĐĂNG KÝ PMH]\nKho: 910\nMĐH: 12345678\nLoại: PMH 100K\nQuản lý: Họ và Tên';
        }
        await setDoc(docRef, payload, { merge: true });
    },

    /**
     * Lấy danh sách kho Coupon
     */
    async getCoupons(userId: string): Promise<Coupon[]> {
        if (!userId) return [];
        try {
            const colRef = collection(db, ROOT_COLLECTION, userId, 'coupons');
            const q = query(colRef, orderBy('createdAt', 'desc'));
            const snap = await getDocs(q);
            return snap.docs.map(d => ({ id: d.id, ...d.data() } as Coupon));
        } catch (error) {
            console.error('[lineBotFirestoreService] Lỗi getCoupons:', error);
            return [];
        }
    },

    /**
     * Nạp hàng loạt mã coupon (tự động loại bỏ trùng lặp mã đã có, lưu ngày hết hạn nếu có)
     */
    async addCouponsBatch(
        userId: string,
        newCoupons: Array<{ code: string; type: string; productName?: string; syntax?: string; expiryDate?: string }>
    ): Promise<{ added: number; skipped: number; batchId?: string }> {
        if (!userId || !newCoupons || newCoupons.length === 0) {
            return { added: 0, skipped: 0 };
        }

        const existingCoupons = await this.getCoupons(userId);
        const existingCodeSet = new Set(existingCoupons.map(c => c.code.trim().toUpperCase()));

        const toAdd: Array<{ code: string; type: string; productName?: string; syntax?: string; expiryDate?: string }> = [];
        let skipped = 0;

        for (const item of newCoupons) {
            const cleanCode = (item.code || '').trim().toUpperCase();
            if (!cleanCode || existingCodeSet.has(cleanCode)) {
                skipped++;
                continue;
            }
            existingCodeSet.add(cleanCode);
            toAdd.push({
                code: cleanCode,
                type: item.type.trim() || 'PMH',
                productName: item.productName?.trim() || '',
                syntax: item.syntax?.trim() || '',
                expiryDate: item.expiryDate?.trim() || ''
            });
        }

        if (toAdd.length === 0) {
            return { added: 0, skipped };
        }

        const now = new Date().toISOString();
        const importBatchId = 'batch_' + Date.now();
        const batchSize = 450;

        for (let i = 0; i < toAdd.length; i += batchSize) {
            const chunk = toAdd.slice(i, i + batchSize);
            const batch = writeBatch(db);

            for (const c of chunk) {
                const colRef = collection(db, ROOT_COLLECTION, userId, 'coupons');
                const newDoc = doc(colRef);
                const couponData: Omit<Coupon, 'id'> = {
                    code: c.code,
                    type: c.type,
                    productName: c.productName || '',
                    syntax: c.syntax || '',
                    status: 'UNUSED',
                    createdAt: now,
                    updatedAt: now,
                    importBatchId,
                    ...(c.expiryDate ? { expiryDate: c.expiryDate } : {})
                };
                batch.set(newDoc, couponData);
            }

            await batch.commit();
        }

        await this.logAudit(userId, 'IMPORT_COUPONS', `Đã nạp ${toAdd.length} mã coupon mới (bỏ qua ${skipped} mã trùng)`, 'Quản lý');

        return { added: toAdd.length, skipped, batchId: importBatchId };
    },

    /**
     * Xoá toàn bộ các mã coupon theo danh sách ID (dùng khi xoá theo đợt nạp)
     */
    async deleteCouponsBatch(userId: string, couponIds: string[]): Promise<{ deleted: number }> {
        if (!userId || !couponIds || couponIds.length === 0) return { deleted: 0 };
        try {
            const batchSize = 450;
            let deleted = 0;
            for (let i = 0; i < couponIds.length; i += batchSize) {
                const chunk = couponIds.slice(i, i + batchSize);
                const batch = writeBatch(db);
                for (const id of chunk) {
                    const docRef = doc(db, ROOT_COLLECTION, userId, 'coupons', id);
                    batch.delete(docRef);
                    deleted++;
                }
                await batch.commit();
            }

            await this.logAudit(userId, 'DELETE_IMPORT_BATCH', `Đã xoá nhanh ${deleted} mã coupon theo đợt nạp`, 'Quản lý');
            return { deleted };
        } catch (error) {
            console.error('[lineBotFirestoreService] Lỗi deleteCouponsBatch:', error);
            throw error;
        }
    },

    /**
     * Tự động quét và xoá các mã coupon UNUSED đã quá ngày hết hạn khỏi kho
     * Đồng thời lưu thông tin sản phẩm hết hạn vào 'expired_products' để Bot LINE thông báo cho người dùng
     */
    async cleanupExpiredCoupons(userId: string): Promise<{ deleted: number; products: string[] }> {
        if (!userId) return { deleted: 0, products: [] };
        try {
            const todayVN = getVietnamTodayString();
            const colRef = collection(db, ROOT_COLLECTION, userId, 'coupons');
            const q = query(colRef, orderBy('createdAt', 'desc'));
            const snap = await getDocs(q);

            const expiredDocs: Array<{ doc: any; data: Coupon }> = [];
            for (const d of snap.docs) {
                const data = d.data() as Coupon;
                // Thu gom toàn bộ các mã hết hạn trong kho (bao gồm chưa dùng UNUSED hoặc đã thu hồi REVOKED)
                const isStockCoupon = data.status !== 'SENT';
                if (isStockCoupon && data.expiryDate && data.expiryDate < todayVN) {
                    expiredDocs.push({ doc: d, data });
                }
            }

            if (expiredDocs.length === 0) {
                return { deleted: 0, products: [] };
            }

            // Gom nhóm theo sản phẩm để ghi nhận vào expired_products
            const productMap = new Map<string, {
                productName: string;
                syntax?: string;
                type?: string;
                expiryDate: string;
                count: number;
            }>();

            for (const item of expiredDocs) {
                const pName = (item.data.productName || item.data.type || 'PMH').trim();
                const key = pName.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'pmh';
                const existing = productMap.get(key);
                if (!existing) {
                    productMap.set(key, {
                        productName: pName,
                        syntax: item.data.syntax,
                        type: item.data.type,
                        expiryDate: item.data.expiryDate || todayVN,
                        count: 1
                    });
                } else {
                    existing.count++;
                    if (item.data.expiryDate && item.data.expiryDate > existing.expiryDate) {
                        existing.expiryDate = item.data.expiryDate;
                    }
                }
            }

            // Xoá các document coupon hết hạn khỏi kho (UNUSED) theo batch
            const batchSize = 450;
            const now = new Date().toISOString();

            for (let i = 0; i < expiredDocs.length; i += batchSize) {
                const chunk = expiredDocs.slice(i, i + batchSize);
                const batch = writeBatch(db);
                for (const item of chunk) {
                    batch.delete(item.doc.ref);
                }
                await batch.commit();
            }

            // Lưu vết các sản phẩm hết hạn vào collection expired_products
            for (const [key, prod] of productMap.entries()) {
                const expDocRef = doc(db, ROOT_COLLECTION, userId, 'expired_products', key);
                await setDoc(expDocRef, {
                    id: key,
                    productName: prod.productName,
                    syntax: prod.syntax || '',
                    type: prod.type || '',
                    expiryDate: prod.expiryDate,
                    expiredAt: now,
                    count: prod.count
                }, { merge: true });
            }

            const affectedProducts = Array.from(productMap.values()).map(p => p.productName);
            await this.logAudit(
                userId,
                'CLEANUP_EXPIRED_COUPONS',
                `Đã tự động xoá ${expiredDocs.length} mã coupon hết hạn khỏi kho (${affectedProducts.join(', ')})`,
                'Hệ thống tự động'
            );

            return { deleted: expiredDocs.length, products: affectedProducts };
        } catch (error) {
            console.error('[lineBotFirestoreService] Lỗi cleanupExpiredCoupons:', error);
            return { deleted: 0, products: [] };
        }
    },

    /**
     * Lấy danh sách sản phẩm đã hết hạn
     */
    async getExpiredProducts(userId: string): Promise<ExpiredProductRecord[]> {
        if (!userId) return [];
        try {
            const colRef = collection(db, ROOT_COLLECTION, userId, 'expired_products');
            const snap = await getDocs(colRef);
            return snap.docs.map(d => ({ id: d.id, ...d.data() } as ExpiredProductRecord));
        } catch {
            return [];
        }
    },

    /**
     * Thu hồi mã coupon về kho trạng thái UNUSED
     */
    async revokeCoupon(userId: string, couponId: string, reason = 'Quản lý thu hồi về kho'): Promise<void> {
        if (!userId || !couponId) return;
        const docRef = doc(db, ROOT_COLLECTION, userId, 'coupons', couponId);
        const now = new Date().toISOString();
        await updateDoc(docRef, {
            status: 'REVOKED',
            revokedAt: now,
            revokeReason: reason,
            updatedAt: now
        });
        await this.logAudit(userId, 'REVOKE_COUPON', `Thu hồi mã coupon ID ${couponId}: ${reason}`, 'Quản lý');
    },

    /**
     * Ghi nhận thời gian người dùng bấm copy mã coupon
     */
    async recordCouponCopied(userId: string, couponId: string, timestamp?: string): Promise<string> {
        if (!userId || !couponId) return '';
        const now = timestamp || new Date().toISOString();
        try {
            const docRef = doc(db, ROOT_COLLECTION, userId, 'coupons', couponId);
            await updateDoc(docRef, {
                copiedAt: now
            });
        } catch (err) {
            console.error('Lỗi cập nhật thời gian copy mã coupon:', err);
        }
        return now;
    },

    /**
     * Xóa hoàn toàn một mã coupon khỏi kho
     */
    async deleteCoupon(userId: string, couponId: string): Promise<void> {
        if (!userId || !couponId) return;
        const docRef = doc(db, ROOT_COLLECTION, userId, 'coupons', couponId);
        await deleteDoc(docRef);
    },

    /**
     * Xóa toàn bộ mã coupon trong kho của Quản lý (xử lý an toàn theo từng batch)
     */
    async deleteAllCoupons(userId: string): Promise<number> {
        if (!userId) return 0;
        const colRef = collection(db, ROOT_COLLECTION, userId, 'coupons');
        const snap = await getDocs(colRef);
        if (snap.empty) return 0;

        const docs = snap.docs;
        const total = docs.length;
        const batchSize = 450;

        for (let i = 0; i < total; i += batchSize) {
            const chunk = docs.slice(i, i + batchSize);
            const batch = writeBatch(db);
            for (const d of chunk) {
                batch.delete(d.ref);
            }
            await batch.commit();
        }

        await this.logAudit(userId, 'DELETE_ALL_COUPONS', `Đã xoá toàn bộ ${total} mã coupon khỏi kho`, 'Quản lý');
        return total;
    },

    /**
     * Lấy danh sách Lịch hẹn thông báo
     */
    async getSchedules(userId: string): Promise<BotSchedule[]> {
        if (!userId) return [];
        try {
            const colRef = collection(db, ROOT_COLLECTION, userId, 'schedules');
            const snap = await getDocs(colRef);
            return snap.docs.map(d => ({ id: d.id, ...d.data() } as BotSchedule));
        } catch (error) {
            console.error('[lineBotFirestoreService] Lỗi getSchedules:', error);
            return [];
        }
    },

    /**
     * Lưu lịch hẹn thông báo
     */
    async saveSchedule(userId: string, schedule: Partial<BotSchedule>): Promise<string> {
        if (!userId) throw new Error('Thiếu userId');
        const now = new Date().toISOString();
        const id = schedule.id || `sched_${Date.now()}`;
        const docRef = doc(db, ROOT_COLLECTION, userId, 'schedules', id);
        const payload: Record<string, any> = {
            ...schedule,
            id,
            active: schedule.active ?? true,
            updatedAt: now,
            createdAt: schedule.createdAt || now
        };
        // Loại bỏ triệt để mọi key có giá trị undefined để tránh lỗi Firestore Unsupported field value: undefined
        const cleanPayload: Record<string, any> = {};
        for (const [k, v] of Object.entries(payload)) {
            if (v !== undefined) {
                cleanPayload[k] = v;
            }
        }
        await setDoc(docRef, cleanPayload, { merge: true });
        return id;
    },

    /**
     * Xóa lịch hẹn
     */
    async deleteSchedule(userId: string, scheduleId: string): Promise<void> {
        if (!userId || !scheduleId) return;
        const docRef = doc(db, ROOT_COLLECTION, userId, 'schedules', scheduleId);
        await deleteDoc(docRef);
    },

    /**
     * Lấy thư viện Từ khoá tự động
     */
    async getKeywords(userId: string): Promise<KeywordReply[]> {
        if (!userId) return [];
        try {
            const colRef = collection(db, ROOT_COLLECTION, userId, 'keywords');
            const snap = await getDocs(colRef);
            return snap.docs.map(d => ({ id: d.id, ...d.data() } as KeywordReply));
        } catch (error) {
            console.error('[lineBotFirestoreService] Lỗi getKeywords:', error);
            return [];
        }
    },

    /**
     * Lưu từ khoá tự động
     */
    async saveKeyword(userId: string, keyword: Partial<KeywordReply>): Promise<string> {
        if (!userId) throw new Error('Thiếu userId');
        const now = new Date().toISOString();
        const id = keyword.id || `kw_${Date.now()}`;
        const docRef = doc(db, ROOT_COLLECTION, userId, 'keywords', id);
        const payload = {
            ...keyword,
            id,
            keyword: (keyword.keyword || '').trim().toLowerCase(),
            matchType: keyword.matchType || 'EXACT',
            active: keyword.active ?? true,
            imageUrls: keyword.imageUrls || [],
            updatedAt: now,
            createdAt: keyword.createdAt || now
        };
        await setDoc(docRef, payload, { merge: true });
        return id;
    },

    /**
     * Xóa từ khoá
     */
    async deleteKeyword(userId: string, keywordId: string): Promise<void> {
        if (!userId || !keywordId) return;
        const docRef = doc(db, ROOT_COLLECTION, userId, 'keywords', keywordId);
        await deleteDoc(docRef);
    },

    /**
     * Lấy danh sách Admin
     */
    async getAdmins(userId: string): Promise<LineAdmin[]> {
        if (!userId) return [];
        try {
            const colRef = collection(db, ROOT_COLLECTION, userId, 'admins');
            const snap = await getDocs(colRef);
            return snap.docs.map(d => ({ id: d.id, ...d.data() } as LineAdmin));
        } catch (error) {
            console.error('[lineBotFirestoreService] Lỗi getAdmins:', error);
            return [];
        }
    },

    /**
     * Lưu Admin
     */
    async saveAdmin(userId: string, admin: Partial<LineAdmin>): Promise<string> {
        if (!userId) throw new Error('Thiếu userId');
        const now = new Date().toISOString();
        const id = admin.id || `admin_${Date.now()}`;
        const docRef = doc(db, ROOT_COLLECTION, userId, 'admins', id);
        const payload = {
            ...admin,
            id,
            active: admin.active ?? true,
            role: admin.role || 'APPROVER',
            updatedAt: now,
            createdAt: admin.createdAt || now
        };
        await setDoc(docRef, payload, { merge: true });
        return id;
    },

    /**
     * Xóa Admin
     */
    async deleteAdmin(userId: string, adminId: string): Promise<void> {
        if (!userId || !adminId) return;
        const docRef = doc(db, ROOT_COLLECTION, userId, 'admins', adminId);
        await deleteDoc(docRef);
    },

    /**
     * Lấy danh sách người dùng đã tương tác (từ collection interacted_users và tổng hợp từ coupons/pending_requests)
     */
    async getInteractedUsers(userId: string): Promise<InteractedUser[]> {
        if (!userId) return [];
        try {
            const userMap = new Map<string, InteractedUser>();

            // 1. Lấy từ collection chuyên biệt interacted_users
            try {
                const colRef = collection(db, ROOT_COLLECTION, userId, 'interacted_users');
                const q = query(colRef, orderBy('lastInteractedAt', 'desc'), limit(200));
                const snap = await getDocs(q);
                for (const d of snap.docs) {
                    const data = d.data() as InteractedUser;
                    const lId = data.lineUserId || d.id;
                    if (lId && lId.startsWith('U')) {
                        userMap.set(lId, {
                            id: lId,
                            lineUserId: lId,
                            displayName: data.displayName || 'Người dùng LINE',
                            pictureUrl: data.pictureUrl,
                            statusMessage: data.statusMessage,
                            lastInteractionType: data.lastInteractionType || 'GROUP',
                            lastGroupId: data.lastGroupId,
                            lastGroupName: data.lastGroupName,
                            lastMessage: data.lastMessage,
                            lastInteractedAt: data.lastInteractedAt || new Date().toISOString()
                        });
                    }
                }
            } catch (err) {
                console.warn('[lineBotFirestoreService] Không tải được interacted_users trực tiếp:', err);
            }

            // 2. Quét thêm từ coupons đã phát (nếu có recipientId là LINE User ID)
            try {
                const couponsRef = collection(db, ROOT_COLLECTION, userId, 'coupons');
                const qCoupons = query(couponsRef, orderBy('sentAt', 'desc'), limit(150));
                const couponSnap = await getDocs(qCoupons);
                for (const d of couponSnap.docs) {
                    const data = d.data();
                    const recId = data.recipientId;
                    if (recId && typeof recId === 'string' && recId.startsWith('U') && recId.length >= 30) {
                        if (!userMap.has(recId)) {
                            userMap.set(recId, {
                                id: recId,
                                lineUserId: recId,
                                displayName: data.recipient || 'Người nhận PMH',
                                lastInteractionType: 'GROUP',
                                lastInteractedAt: data.sentAt || data.createdAt || new Date().toISOString()
                            });
                        }
                    }
                }
            } catch (err) {
                // Ignore fallback error
            }

            // 3. Quét thêm từ pending_requests
            try {
                const pendingRef = collection(db, ROOT_COLLECTION, userId, 'pending_requests');
                const qPending = query(pendingRef, orderBy('createdAt', 'desc'), limit(100));
                const pendingSnap = await getDocs(qPending);
                for (const d of pendingSnap.docs) {
                    const data = d.data();
                    const sId = data.senderUserId;
                    if (sId && typeof sId === 'string' && sId.startsWith('U') && sId.length >= 30) {
                        if (!userMap.has(sId)) {
                            userMap.set(sId, {
                                id: sId,
                                lineUserId: sId,
                                displayName: data.managerName || 'Người gửi yêu cầu',
                                lastInteractionType: 'GROUP',
                                lastInteractedAt: data.createdAt || new Date().toISOString()
                            });
                        }
                    }
                }
            } catch (err) {
                // Ignore fallback error
            }

            // Chuyển Map thành mảng và sắp xếp thời gian mới nhất lên đầu
            const result = Array.from(userMap.values());
            result.sort((a, b) => new Date(b.lastInteractedAt).getTime() - new Date(a.lastInteractedAt).getTime());
            return result;
        } catch (error) {
            console.error('[lineBotFirestoreService] Lỗi getInteractedUsers:', error);
            return [];
        }
    },

    /**
     * Lưu hoặc cập nhật người dùng tương tác thủ công / webhook
     */
    async saveInteractedUser(userId: string, user: Partial<InteractedUser> & { lineUserId: string }): Promise<void> {
        if (!userId || !user.lineUserId) return;
        const colRef = collection(db, ROOT_COLLECTION, userId, 'interacted_users');
        await setDoc(doc(colRef, user.lineUserId), {
            id: user.lineUserId,
            lineUserId: user.lineUserId,
            displayName: user.displayName || 'Thành viên LINE',
            pictureUrl: user.pictureUrl || null,
            statusMessage: user.statusMessage || null,
            lastInteractionType: user.lastInteractionType || 'GROUP',
            lastGroupId: user.lastGroupId || null,
            lastGroupName: user.lastGroupName || null,
            lastMessage: user.lastMessage || null,
            lastInteractedAt: user.lastInteractedAt || new Date().toISOString()
        }, { merge: true });
    },

    /**
     * Lấy danh sách nhóm LINE
     */
    async getGroups(userId: string): Promise<LineGroup[]> {
        if (!userId) return [];
        try {
            const colRef = collection(db, ROOT_COLLECTION, userId, 'groups');
            const snap = await getDocs(colRef);
            return snap.docs.map(d => ({ id: d.id, ...d.data() } as LineGroup));
        } catch (error) {
            console.error('[lineBotFirestoreService] Lỗi getGroups:', error);
            return [];
        }
    },

    /**
     * Thêm hoặc cập nhật nhóm LINE
     */
    async saveGroup(userId: string, group: Partial<LineGroup> & { groupId: string }): Promise<void> {
        if (!userId || !group.groupId) return;
        const colRef = collection(db, ROOT_COLLECTION, userId, 'groups');
        await setDoc(doc(colRef, group.groupId), {
            groupId: group.groupId,
            groupName: group.groupName || 'Nhóm LINE',
            active: group.active ?? true,
            joinedAt: group.joinedAt || new Date().toISOString(),
            lastActiveAt: new Date().toISOString()
        }, { merge: true });
    },

    /**
     * Xoá nhóm LINE khỏi danh sách
     */
    async deleteGroup(userId: string, groupId: string): Promise<void> {
        if (!userId || !groupId) return;
        const docRef = doc(db, ROOT_COLLECTION, userId, 'groups', groupId);
        await deleteDoc(docRef);
    },

    /**
     * Ghi nhật ký thao tác (Audit Log)
     */
    async logAudit(userId: string, action: string, description: string, performedBy: string, details?: Record<string, unknown>): Promise<void> {
        if (!userId) return;
        try {
            const colRef = collection(db, ROOT_COLLECTION, userId, 'audit_logs');
            const newDoc = doc(colRef);
            await setDoc(newDoc, {
                id: newDoc.id,
                action,
                description,
                performedBy,
                details: details || {},
                timestamp: new Date().toISOString()
            });
        } catch (e) {
            // Không ngắt luồng nếu log lỗi
        }
    },

    /**
     * Lấy danh sách các coupon đã lọc từ tin nhắn gộp
     */
    async getFilteredCoupons(userId: string): Promise<FilteredCouponRecord[]> {
        if (!userId) return [];
        try {
            const colRef = collection(db, ROOT_COLLECTION, userId, 'filtered_coupons');
            const q = query(colRef, orderBy('filteredAt', 'desc'), limit(300));
            const snap = await getDocs(q);
            return snap.docs.map(d => ({ id: d.id, ...d.data() } as FilteredCouponRecord));
        } catch (error) {
            console.error('[lineBotFirestoreService] Lỗi getFilteredCoupons:', error);
            return [];
        }
    },

    /**
     * Lưu danh sách coupon vừa lọc được từ tin nhắn gộp
     */
    async saveFilteredCouponsBatch(
        userId: string,
        coupons: Array<Omit<FilteredCouponRecord, 'id'>>
    ): Promise<void> {
        if (!userId || !coupons || coupons.length === 0) return;
        const batch = writeBatch(db);
        const colRef = collection(db, ROOT_COLLECTION, userId, 'filtered_coupons');

        for (const item of coupons) {
            const docId = `${item.code}_${item.recipient}`.replace(/[^a-zA-Z0-9_-]/g, '_');
            const docRef = doc(colRef, docId);
            batch.set(docRef, {
                id: docId,
                ...item
            }, { merge: true });
        }

        await batch.commit();
    },

    /**
     * Đánh dấu coupon lọc được là ĐÃ SỬ DỤNG khi người dùng bấm qua LIFF
     */
    async markFilteredCouponUsed(
        userId: string,
        code: string,
        usedBy: string,
        usedAt?: string
    ): Promise<boolean> {
        if (!userId || !code) return false;
        try {
            const cleanCode = code.trim().toUpperCase();
            const colRef = collection(db, ROOT_COLLECTION, userId, 'filtered_coupons');
            const snap = await getDocs(colRef);
            const now = usedAt || new Date().toISOString();

            let found = false;
            for (const d of snap.docs) {
                const data = d.data() as FilteredCouponRecord;
                if (data.code && data.code.trim().toUpperCase() === cleanCode) {
                    await updateDoc(d.ref, {
                        status: 'USED',
                        usedBy: usedBy || 'Người dùng LINE',
                        usedAt: now
                    });
                    found = true;
                }
            }
            return found;
        } catch (error) {
            console.error('[lineBotFirestoreService] Lỗi markFilteredCouponUsed:', error);
            return false;
        }
    },

    /**
     * Xóa sạch lịch sử các coupon lọc được
     */
    async deleteFilteredCoupons(userId: string): Promise<void> {
        if (!userId) return;
        try {
            const colRef = collection(db, ROOT_COLLECTION, userId, 'filtered_coupons');
            const snap = await getDocs(colRef);
            if (snap.empty) return;

            const batch = writeBatch(db);
            for (const d of snap.docs) {
                batch.delete(d.ref);
            }
            await batch.commit();
        } catch (error) {
            console.error('[lineBotFirestoreService] Lỗi deleteFilteredCoupons:', error);
        }
    },

    /**
     * Lấy danh sách cấu hình tính năng cho các nhóm của Quản lý
     */
    async getGroupFeatureConfigs(userId: string): Promise<GroupFeatureConfig[]> {
        if (!userId) return [];
        try {
            const colRef = collection(db, ROOT_COLLECTION, userId, 'group_features');
            const snap = await getDocs(colRef);
            return snap.docs.map(d => d.data() as GroupFeatureConfig);
        } catch (error) {
            console.error('[lineBotFirestoreService] Lỗi getGroupFeatureConfigs:', error);
            return [];
        }
    },

    /**
     * Lưu hoặc cập nhật cấu hình tính năng cho một nhóm
     */
    async saveGroupFeatureConfig(config: GroupFeatureConfig): Promise<void> {
        try {
            const docRef = doc(db, ROOT_COLLECTION, config.userId, 'group_features', config.groupId);
            await setDoc(docRef, {
                ...config,
                updatedAt: new Date().toISOString()
            }, { merge: true });
        } catch (error) {
            console.error('[lineBotFirestoreService] Lỗi saveGroupFeatureConfig:', error);
            throw error;
        }
    }
};

/**
 * DỊCH VỤ TỰ ĐỘNG XUẤT ẢNH BÁO CÁO CHO BOT LINE (2026-10-16)
 *
 * Cho phép thiết lập các khu vực (Chi Tiết Theo Kho, Tổng Quan Doanh Thu, Doanh Thu BI...)
 * tự động chụp ảnh và lưu lên Firebase sau khi hoàn tất Auto Sync Realtime hoặc Luỹ kế.
 * Khi Admin/người dùng gõ cú pháp trong nhóm LINE hoặc chat bot:
 * - "bcrt": Bot gửi ảnh báo cáo Realtime mới nhất
 * - "bclk": Bot gửi ảnh báo cáo Luỹ kế mới nhất
 * - "bc": Bot gửi ảnh báo cáo mới nhất
 */

import { getSetting, saveSetting } from './dbService';
import { db } from './firebase';
import { doc, setDoc } from 'firebase/firestore';
import {
    resolveLineBot,
    prepareLineImage,
    prepareLineHdImage,
    uploadLineImage,
    uploadLineHdImage,
    lineHdSupported
} from './lineReportDelivery';
import { toast } from '../components/shared/ui/toast';

export type ReportExportMode = 'realtime' | 'luyke';

export interface AreaExportSetting {
    realtime: boolean; // Tự xuất khi chạy Realtime -> gán lệnh 'bcrt'
    luyke: boolean;    // Tự xuất khi chạy Luỹ kế -> gán lệnh 'bclk'
}

export type AutoExportSettingsMap = Record<string, AreaExportSetting>;

export interface AutoExportAreaInfo {
    id: string;
    name: string;
    scope: 'ycx' | 'bi';
    description?: string;
}

export const AVAILABLE_AUTO_EXPORT_AREAS: AutoExportAreaInfo[] = [
    // Phân tích (YCX)
    { id: 'Chi Tiết Theo Kho', name: 'Chi Tiết Theo Kho', scope: 'ycx', description: 'Bảng hiệu suất & chỉ số từng siêu thị' },
    { id: 'Tổng Quan Doanh Thu', name: 'Tổng Quan Doanh Thu', scope: 'ycx', description: 'Cụm thẻ KPI doanh thu thực, quy đổi, chờ xuất' },
    { id: 'Toàn Bộ Bản Tin', name: 'Toàn Bộ Bản Tin', scope: 'ycx', description: 'Toàn bộ khối bản tin tổng quan & chi tiết' },
    { id: 'Xu Hướng Doanh Thu', name: 'Xu Hướng Doanh Thu', scope: 'ycx', description: 'Biểu đồ xu hướng doanh thu theo giờ/ngày' },
    { id: 'Bảng Tổng Hợp', name: 'Bảng Tổng Hợp Ngành Hàng', scope: 'ycx', description: 'Bảng chi tiết doanh thu theo ngành hàng' },
    { id: 'Phân Tích Ngành Hàng', name: 'Phân Tích Ngành Hàng', scope: 'ycx', description: 'Lưới ma trận chi tiết ngành hàng' },
    // Nhân viên
    { id: 'Phân Tích Nhân Viên - Top', name: 'Nhân Viên: Top', scope: 'ycx', description: 'Bảng xếp hạng Top nhân viên' },
    { id: 'Phân Tích Nhân Viên - Hiệu Suất (D.Thu)', name: 'Nhân Viên: Hiệu Suất (Doanh Thu)', scope: 'ycx', description: 'Bảng hiệu suất doanh thu thực & quy đổi nhân viên' },
    { id: 'Phân Tích Nhân Viên - Hiệu Suất (T.Chậm)', name: 'Nhân Viên: Hiệu Suất (Trả Chậm)', scope: 'ycx', description: 'Bảng hiệu suất doanh thu trả chậm nhân viên' },
    { id: 'Phân Tích Nhân Viên - Hiệu Suất (V.Trội)', name: 'Nhân Viên: Hiệu Suất (Vượt Trội)', scope: 'ycx', description: 'Bảng mục tiêu vượt trội nhân viên' },
    { id: 'Phân Tích Nhân Viên - Hiệu Suất', name: 'Nhân Viên: Hiệu Suất', scope: 'ycx', description: 'Bảng hiệu suất nhân viên tổng quan' },
    { id: 'Phân Tích Nhân Viên - Khai Thác', name: 'Nhân Viên: Khai Thác', scope: 'ycx', description: 'Phân tích cơ cấu & khai thác ngành hàng nhân viên' },
    { id: 'Phân Tích Nhân Viên - 7 Ngày', name: 'Nhân Viên: 7 Ngày', scope: 'ycx', description: 'Biểu đồ đối đầu & phong độ 7 ngày' },
    // Report BI (Siêu thị)
    { id: 'bi-doanh-thu-tong', name: 'BI: Doanh Thu — Tổng', scope: 'bi', description: 'Báo cáo doanh thu tổng siêu thị trên BI' },
    { id: 'bi-doanh-thu-tung-st', name: 'BI: Doanh Thu — Từng Siêu Thị', scope: 'bi', description: 'Bảng doanh thu chi tiết từng siêu thị' },
    { id: 'bi-nganh-hang-tung-st', name: 'BI: Ngành Hàng — Từng Siêu Thị', scope: 'bi', description: 'Bảng phân tích ngành hàng trên BI' },
    { id: 'bi-thi-dua-tong', name: 'BI: Thi Đua — Tổng', scope: 'bi', description: 'Bảng thi đua tổng các siêu thị' },
    { id: 'bi-thi-dua-tung-st', name: 'BI: Thi Đua — Từng Siêu Thị', scope: 'bi', description: 'Bảng thi đua chi tiết từng siêu thị' },
];

const SETTING_KEY = 'auto_report_export_config';
const EVT = 'ycx-auto-report-export-settings-changed';

interface Store {
    map: AutoExportSettingsMap;
    loaded: Promise<void> | null;
    ycxRunners: Map<string, () => Promise<Blob | null>>;
}

const G = globalThis as unknown as { __ycxAutoReportExportStore?: Store };
const store: Store = G.__ycxAutoReportExportStore || (G.__ycxAutoReportExportStore = {
    map: {
        // Mặc định kích hoạt Chi Tiết Theo Kho cho cả realtime và luỹ kế
        'Chi Tiết Theo Kho': { realtime: true, luyke: true }
    },
    loaded: null,
    ycxRunners: new Map()
});

/** Nạp cài đặt từ IndexedDB / cloud */
export function loadAutoExportSettings(): Promise<void> {
    if (!store.loaded) {
        store.loaded = getSetting<AutoExportSettingsMap>(SETTING_KEY)
            .then((m) => {
                if (m && typeof m === 'object') {
                    store.map = { ...store.map, ...m };
                }
                if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVT));
            })
            .catch(() => { /* dùng mặc định */ });
    }
    return store.loaded;
}

/** Lấy toàn bộ bản đồ cấu hình */
export function getAutoExportSettings(): AutoExportSettingsMap {
    return { ...store.map };
}

/** Lấy cấu hình của 1 khu vực cụ thể */
export function getAreaExportSetting(areaId: string): AreaExportSetting {
    return store.map[areaId] || { realtime: false, luyke: false };
}

/** Lưu cấu hình cho 1 khu vực */
export async function setAreaExportSetting(areaId: string, setting: Partial<AreaExportSetting>): Promise<void> {
    await loadAutoExportSettings();
    const current = getAreaExportSetting(areaId);
    const nextSetting: AreaExportSetting = {
        realtime: setting.realtime !== undefined ? setting.realtime : current.realtime,
        luyke: setting.luyke !== undefined ? setting.luyke : current.luyke,
    };

    const nextMap = { ...store.map, [areaId]: nextSetting };
    store.map = nextMap;
    if (typeof window !== 'undefined') window.dispatchEvent(new Event(EVT));
    await saveSetting(SETTING_KEY, nextMap);
}

/** Lắng nghe thay đổi cấu hình */
export function onAutoExportSettingsChanged(cb: () => void): () => void {
    if (typeof window === 'undefined') return () => {};
    window.addEventListener(EVT, cb);
    return () => window.removeEventListener(EVT, cb);
}

/** Lấy danh sách ID các khu vực được bật cho một chế độ chạy */
export function getEnabledAreasForMode(mode: ReportExportMode, scope?: 'ycx' | 'bi'): string[] {
    const out: string[] = [];
    for (const area of AVAILABLE_AUTO_EXPORT_AREAS) {
        if (scope && area.scope !== scope) continue;
        const cfg = getAreaExportSetting(area.id);
        if (mode === 'realtime' && cfg.realtime) out.push(area.id);
        if (mode === 'luyke' && cfg.luyke) out.push(area.id);
    }
    return out;
}

/** Đăng ký hàm tự chụp của một khu vực YCX */
export function registerYcxAutoExportRunner(areaId: string, runner: () => Promise<Blob | null>): () => void {
    store.ycxRunners.set(areaId, runner);
    return () => {
        if (store.ycxRunners.get(areaId) === runner) {
            store.ycxRunners.delete(areaId);
        }
    };
}

export interface UploadedReportImage {
    reportKey: string;
    imageUrl: string;
    previewUrl: string;
    caption?: string;
}

/**
 * Tải danh sách ảnh blob lên Firebase Storage / bot_media và gán vào collection report_commands
 * Đồng thời cập nhật vào:
 * - Lệnh theo loại: 'bcrt' (Realtime) hoặc 'bclk' (Luỹ kế)
 * - Lệnh chung: 'bc' (Báo cáo mới nhất)
 */
export async function saveAutoReportImagesToFirebase(params: {
    mode: ReportExportMode;
    images: { reportKey: string; blob: Blob; fileName?: string }[];
    user: any;
    departmentId?: string | null;
}): Promise<{ ok: boolean; count: number; commands: string[] }> {
    if (!params.images || params.images.length === 0) {
        return { ok: false, count: 0, commands: [] };
    }

    const uid = params.user?.uid;
    const bot = await resolveLineBot(uid, params.departmentId);
    if (!bot) {
        console.warn('[AutoExport] Chưa kết nối Bot LINE cho tài khoản này.');
        return { ok: false, count: 0, commands: [] };
    }

    const uploadedImages: UploadedReportImage[] = [];
    const isHd = await lineHdSupported().catch(() => false);

    for (const item of params.images) {
        try {
            const rawName = item.fileName || `${item.reportKey}.png`;
            const img = await prepareLineImage(item.blob);
            const previewUrl = await uploadLineImage(img.base64, rawName.replace(/\.png$/i, '.jpg'));
            let mainUrl = previewUrl;

            if (isHd) {
                try {
                    const hd = await prepareLineHdImage(item.blob);
                    mainUrl = await uploadLineHdImage(hd.base64, hd.contentType, rawName);
                } catch (e) {
                    console.warn('[AutoExport] Không tải được bản HD, dùng preview', e);
                }
            }

            uploadedImages.push({
                reportKey: item.reportKey,
                imageUrl: mainUrl,
                previewUrl,
                caption: item.reportKey,
            });
        } catch (err) {
            console.error(`[AutoExport] Lỗi upload ảnh cho "${item.reportKey}":`, err);
        }
    }

    if (uploadedImages.length === 0) {
        return { ok: false, count: 0, commands: [] };
    }

    const nowIso = new Date().toISOString();
    const modeLabel = params.mode === 'luyke' ? 'LŨY KẾ' : 'REALTIME';
    const targetCmd = params.mode === 'luyke' ? 'bclk' : 'bcrt';
    const summaryTitle = uploadedImages.map((u) => u.reportKey).join(', ');

    const docPayload = {
        command: targetCmd,
        reportKey: summaryTitle,
        imageUrl: uploadedImages[0].imageUrl,
        previewUrl: uploadedImages[0].previewUrl,
        images: uploadedImages,
        caption: `📊 Báo cáo ${modeLabel} — ${summaryTitle}`,
        mode: params.mode,
        updatedAt: nowIso,
        ...(uid ? { updatedBy: uid } : {}),
    };

    const targetCommands = [targetCmd, 'bc'];

    try {
        await Promise.all(
            targetCommands.map((cmd) =>
                setDoc(doc(db, 'line_bots', bot.botId, 'report_commands', cmd), {
                    ...docPayload,
                    command: cmd,
                }, { merge: true })
            )
        );

        console.info(`[AutoExport] Đã lưu ${uploadedImages.length} ảnh cho lệnh "${targetCmd}" và "bc" trên Bot ${bot.botId}`);
        return { ok: true, count: uploadedImages.length, commands: targetCommands };
    } catch (err) {
        console.error('[AutoExport] Lỗi lưu Firestore report_commands:', err);
        return { ok: false, count: uploadedImages.length, commands: [] };
    }
}

/**
 * Tự động chạy xuất và lưu ảnh cho YCX (Phân tích) sau khi nạp xong file
 */
export async function triggerYcxAutoReportExport(
    mode: ReportExportMode,
    user: any,
    departmentId?: string | null
): Promise<void> {
    await loadAutoExportSettings();
    const enabledAreas = getEnabledAreasForMode(mode, 'ycx');
    if (enabledAreas.length === 0) return;

    console.info(`[AutoExport YCX] Bắt đầu xuất tự động ${enabledAreas.length} khu vực cho chế độ ${mode}:`, enabledAreas);

    const collectedImages: { reportKey: string; blob: Blob; fileName?: string }[] = [];

    for (const areaId of enabledAreas) {
        const runner = store.ycxRunners.get(areaId);
        if (!runner) {
            console.warn(`[AutoExport YCX] Chưa đăng ký runner cho khu vực "${areaId}"`);
            continue;
        }

        try {
            const blob = await runner();
            if (blob) {
                collectedImages.push({
                    reportKey: areaId,
                    blob,
                    fileName: `${areaId}.png`,
                });
            }
        } catch (err) {
            console.error(`[AutoExport YCX] Lỗi khi chụp khu vực "${areaId}":`, err);
        }
    }

    if (collectedImages.length > 0) {
        const res = await saveAutoReportImagesToFirebase({
            mode,
            images: collectedImages,
            user,
            departmentId,
        });

        if (res.ok) {
            const cmdName = mode === 'luyke' ? 'bclk' : 'bcrt';
            toast.success(
                `🤖 Đã tự động lưu ${res.count} ảnh báo cáo lên Bot LINE (Lệnh "${cmdName}" / "bc")`,
                { duration: 4000 }
            );
        }
    }
}

/**
 * Tự động chạy xuất và lưu ảnh cho Report BI sau khi nạp xong dữ liệu
 */
export async function triggerBiAutoReportExport(
    mode: ReportExportMode,
    user: any,
    departmentId?: string | null
): Promise<void> {
    await loadAutoExportSettings();
    const enabledAreas = getEnabledAreasForMode(mode, 'bi');
    if (enabledAreas.length === 0) return;

    console.info(`[AutoExport BI] Bắt đầu yêu cầu xuất tự động ${enabledAreas.length} khu vực cho chế độ ${mode}:`, enabledAreas);

    const requestId = `bi_auto_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    // Tạo Promise chờ kết quả từ sự kiện 'ycx-bi-auto-export:done'
    const waitPromise = new Promise<{ area: string; label: string; blob: Blob }[]>((resolve) => {
        const onDone = (e: Event) => {
            const d = (e as CustomEvent).detail;
            if (d?.requestId === requestId) {
                window.removeEventListener('ycx-bi-auto-export:done', onDone);
                resolve(d.images || []);
            }
        };
        window.addEventListener('ycx-bi-auto-export:done', onDone);
        // Timeout an toàn sau 30s
        setTimeout(() => {
            window.removeEventListener('ycx-bi-auto-export:done', onDone);
            resolve([]);
        }, 30_000);
    });

    // Phát sự kiện yêu cầu Report BI xuất ảnh các khu vực này
    window.dispatchEvent(new CustomEvent('ycx-bi-auto-export:request', {
        detail: {
            requestId,
            mode,
            areas: enabledAreas,
        }
    }));

    const resultImages = await waitPromise;
    if (resultImages.length > 0) {
        const res = await saveAutoReportImagesToFirebase({
            mode,
            images: resultImages.map(img => ({
                reportKey: img.label || img.area,
                blob: img.blob,
                fileName: `BI_${img.area}.png`,
            })),
            user,
            departmentId,
        });

        if (res.ok) {
            const cmdName = mode === 'luyke' ? 'bclk' : 'bcrt';
            toast.success(
                `🤖 Đã tự động lưu ${res.count} ảnh Report BI lên Bot LINE (Lệnh "${cmdName}" / "bc")`,
                { duration: 4000 }
            );
        }
    }
}

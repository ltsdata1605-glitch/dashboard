
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../services/firebase';
import { VIETNAMESE_BANKS } from './bankCatalog';
import { SalarySlipDay5Data, SalarySlipDay20Data, BonusItem } from '../types/tax.types';

export interface SalarySlipExtractedData {
    fullName: string;
    totalIncome: number;
    dependents: number;
    totalInsurance: number;
    unionFee: number;
    bankAccount: string;
    bankName: string;
    matchedBankCode?: string;
}

/**
 * Resize và nén hình ảnh phiếu lương về kích thước tối ưu (max width 1024px, JPEG 0.9)
 * Giúp tải lên Cloud siêu nhanh và không vượt hạn mức payload
 */
export const processAndResizeImage = (file: File): Promise<{ base64Data: string; mimeType: string }> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1024;
                let width = img.width;
                let height = img.height;

                if (width > MAX_WIDTH) {
                    height *= MAX_WIDTH / width;
                    width = MAX_WIDTH;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    return reject(new Error('Không thể khởi tạo Canvas 2D'));
                }

                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                resolve({
                    base64Data: dataUrl.split(',')[1],
                    mimeType: 'image/jpeg'
                });
            };
            img.onerror = reject;
        };
        reader.onerror = reject;
    });
};

/**
 * Tìm mã ngân hàng tương ứng trong danh mục 21 ngân hàng Việt Nam
 */
export const matchBankFromRawText = (rawBankName: string): string | undefined => {
    if (!rawBankName) return undefined;
    const cleanName = rawBankName.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
    if (!cleanName) return undefined;

    const found = VIETNAMESE_BANKS.find(b => {
        const shortLower = b.short_name.toLowerCase();
        const codeLower = b.code.toLowerCase();
        const nameClean = b.name.toLowerCase().replace(/[^a-z0-9]/g, '');

        return cleanName.includes(shortLower) ||
               cleanName.includes(codeLower) ||
               (cleanName.length >= 3 && nameClean.includes(cleanName));
    });

    return found ? found.short_name : undefined;
};

/**
 * Phân loại khoản thưởng thành Thưởng Nóng ('hot') hoặc Thưởng Chính ('main')
 */
export const classifyBonusItem = (
    item: { name: string; amount: number; category?: string },
    index: number
): BonusItem => {
    const rawCategory = item.category?.toLowerCase() || '';
    const nameLower = (item.name || '').toLowerCase();
    const isHot =
        rawCategory === 'hot' ||
        nameLower.includes('nóng') ||
        nameLower.includes('khoán') ||
        nameLower.includes('thi đua') ||
        nameLower.includes('vas') ||
        nameLower.includes('combo') ||
        nameLower.includes('quỹ thưởng') ||
        nameLower.includes('kiến thức');

    return {
        id: `bonus_${index}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: item.name || 'Khoản thưởng',
        amount: Number(item.amount) || 0,
        category: isHot ? 'hot' : 'main',
        isProxy: false
    };
};

/**
 * Danh sách mẫu các khoản thưởng bóc tách từ Bảng thưởng HRM MWG thực tế
 */
export const SAMPLE_MWG_DAY20_BONUS_ITEMS: BonusItem[] = [
    { id: 'sample_hot_1', name: 'Khoán công việc T08.2026', amount: 9305000, category: 'hot', isProxy: true },
    { id: 'sample_hot_2', name: 'Thưởng thi đua VAS T08.2026', amount: 2337000, category: 'hot', isProxy: true },
    { id: 'sample_hot_3', name: 'Thưởng nóng NV ST T08.2026 - Chia theo quỹ thưởng nóng ST', amount: 6894000, category: 'hot', isProxy: false },
    { id: 'sample_hot_4', name: 'Thưởng nóng NV ST T08.2026 - Thưởng cá nhân', amount: 3720000, category: 'hot', isProxy: false },
    { id: 'sample_hot_5', name: 'Thưởng nóng đào tạo kiến thức sản phẩm T08.2026', amount: 200000, category: 'hot', isProxy: false },
    { id: 'sample_hot_6', name: 'Thưởng bán hàng Combo T08.2026', amount: 190000, category: 'hot', isProxy: false },
    { id: 'sample_hot_7', name: 'Thưởng nóng hồ sơ trả góp T08.2026', amount: 168000, category: 'hot', isProxy: false },
    { id: 'sample_main_1', name: '01. Thưởng ERP còn lại (tích lũy - nhập trả, dán màn hình)', amount: 702909, category: 'main', isProxy: false },
    { id: 'sample_main_2', name: '02. Thưởng thêm Hệ số K', amount: 373488, category: 'main', isProxy: false },
    { id: 'sample_main_3', name: '04. Thưởng Trả góp', amount: 515000, category: 'main', isProxy: false },
    { id: 'sample_main_4', name: '08. Thưởng giao hàng', amount: 742000, category: 'main', isProxy: false },
    { id: 'sample_main_5', name: '09. Thưởng kho Hub', amount: 39474, category: 'main', isProxy: false },
    { id: 'sample_main_6', name: '10. Thưởng Up hình máy cũ', amount: 6000, category: 'main', isProxy: false },
    { id: 'sample_main_7', name: '11. Thưởng BH máy (ST tự chuyển hàng)', amount: 20100, category: 'main', isProxy: false },
    { id: 'sample_main_8', name: '14. Thưởng phục vụ', amount: 249253, category: 'main', isProxy: false },
];

/**
 * Trích xuất dữ liệu phiếu lương chuẩn 2 đợt (Ngày 5 hoặc Ngày 20) của MWG
 * Tự động kiểm tra cú pháp và phát hiện đúng loại phiếu
 */
export const extractSalarySlip = async (
    file: File,
    targetSlip: 'day5' | 'day20'
): Promise<SalarySlipDay5Data | SalarySlipDay20Data> => {
    const { base64Data, mimeType } = await processAndResizeImage(file);
    /** Lý do lỗi phía Cloud Function (nếu có) — dùng để soạn thông báo cuối cùng cho đúng. */
    let serverReason = '';

    // 1. Thử gọi qua Firebase Cloud Function trước
    try {
        const parseFn = httpsCallable<
            { base64Data: string; mimeType: string; targetSlip: 'day5' | 'day20' },
            any
        >(functions, 'parseSalarySlipWithGemini');

        const res = await parseFn({ base64Data, mimeType, targetSlip });
        if (res.data) {
            const raw = res.data;

            if (raw.isValid === false) {
                throw new Error(raw.error || 'Ảnh tải lên không đúng định dạng yêu cầu.');
            }

            if (targetSlip === 'day5') {
                const incomeDay5 = Number(raw.incomeDay5) || 0;
                const insurance = Number(raw.insurance) || 0;
                const dependents = Number(raw.dependents) || 0;
                const personalDeduction = Number(raw.personalDeduction) || 15_500_000;
                const totalDeductionsDay1 = Number(raw.totalDeductions) || (personalDeduction + (dependents * 6_200_000) + insurance);
                const remainingDeductionsDay1 = Math.max(0, totalDeductionsDay1 - incomeDay5);

                const data: SalarySlipDay5Data = {
                    fullName: raw.fullName || '',
                    monthYear: raw.monthYear || '',
                    incomeDay5,
                    insuranceSalary: Number(raw.insuranceSalary) || 0,
                    insurance,
                    dependents,
                    personalDeduction,
                    totalDeductionsDay1,
                    remainingDeductionsDay1,
                    bankAccount: String(raw.bankAccount || '').replace(/\s+/g, ''),
                    bankName: raw.bankName || '',
                    matchedBankCode: matchBankFromRawText(raw.bankName || ''),
                    isValid: true
                };
                return data;
            } else {
                // targetSlip === 'day20'
                const bonusItems: BonusItem[] = Array.isArray(raw.bonusItems)
                    ? raw.bonusItems.map((item: any, index: number) => classifyBonusItem(item, index))
                    : [];

                const data: SalarySlipDay20Data = {
                    fullName: raw.fullName || '',
                    monthYear: raw.monthYear || '',
                    incomeDay20: Number(raw.incomeDay20) || 0,
                    bonusMain: Number(raw.bonusMain) || 0,
                    bonusHot: Number(raw.bonusHot) || 0,
                    actualTaxDay20: Number(raw.actualTaxDay20) || 0,
                    bonusItems,
                    bankAccount: String(raw.bankAccount || '').replace(/\s+/g, ''),
                    bankName: raw.bankName || '',
                    matchedBankCode: matchBankFromRawText(raw.bankName || ''),
                    isValid: true
                };
                return data;
            }
        }
    } catch (cloudErr: any) {
        if (cloudErr.message && cloudErr.message.includes('Ảnh tải lên')) {
            throw cloudErr;
        }
        // Giữ lý do THẬT của phía server để báo đúng việc người dùng cần làm (xem cuối hàm):
        // khoá bị Google vô hiệu / hết hạn mức khác hẳn "thử lại sau".
        serverReason = String(cloudErr?.message || cloudErr?.details || '');
        console.warn('[SalarySlipOcr] Cloud Function không khả dụng hoặc lỗi, thử fallback sang Client API Key:', cloudErr);
    }

    // 2. Client-side fallback nếu Cloud Function bận và người dùng có set Gemini API Key
    const clientApiKey = localStorage.getItem('CUSTOM_GEMINI_API_KEY') ||
                         (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : '') ||
                         (import.meta as unknown as { env: Record<string, string> }).env?.VITE_GEMINI_API_KEY;

    if (clientApiKey && clientApiKey !== 'PLACEHOLDER_API_KEY') {
        try {
            const { GoogleGenAI, Type } = await import('@google/genai');
            const ai = new GoogleGenAI({ apiKey: clientApiKey });
            const candidateModels = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.5-flash'];
            let responseText = '';

            const prompt = `Phân tích ảnh chụp màn hình bảng lương hoặc bảng thưởng từ hệ thống HRM Thế Giới Di Động (MWG/ĐMX).
Yêu cầu phân tích và trích xuất dữ liệu:
1. Xác định chính xác loại phiếu (detectedType):
   - "day5_salary": Nếu là trang "Chi tiết lương" (Đợt 1 ngày 5), có chứa các mục như "Lương BHXH", "Chấm công", "Lương khoán", "Tổng tiền giảm trừ", "Giảm trừ bản thân", "8% BHXH", "Thực lãnh".
   - "day20_bonus": Nếu là trang "Xem chi tiết thưởng" (Đợt 2 ngày 20), có chứa tiêu đề ngày chuyển khoản (ví dụ "CK 21/09/2026"), "Thưởng chính", "Thưởng nóng", "Trừ thuế TNCN", "Khoán công việc", "Tổng chuyển khoản".
   - "unknown": Nếu không phải là phiếu lương hoặc phiếu thưởng hợp lệ của HRM MWG.

2. Trích xuất các trường: fullName, monthYear, bankAccount, bankName.
Nếu là day5_salary: incomeDay5, insuranceSalary, insurance (tổng 10.5% BHXH+BHYT+BHTN), dependents, personalDeduction, totalDeductions.
Nếu là day20_bonus: bonusMain, bonusHot, incomeDay20, actualTaxDay20 (dòng "Trừ thuế TNCN"), bonusItems (mỗi mục gồm name và amount).`;

            for (const model of candidateModels) {
                try {
                    const response = await ai.models.generateContent({
                        model,
                        contents: {
                            parts: [
                                { inlineData: { mimeType, data: base64Data } },
                                { text: prompt }
                            ]
                        },
                        config: {
                            responseMimeType: "application/json",
                            responseSchema: {
                                type: Type.OBJECT,
                                properties: {
                                    detectedType: { type: Type.STRING },
                                    fullName: { type: Type.STRING },
                                    monthYear: { type: Type.STRING },
                                    bankAccount: { type: Type.STRING },
                                    bankName: { type: Type.STRING },
                                    incomeDay5: { type: Type.NUMBER },
                                    insuranceSalary: { type: Type.NUMBER },
                                    insurance: { type: Type.NUMBER },
                                    dependents: { type: Type.NUMBER },
                                    personalDeduction: { type: Type.NUMBER },
                                    totalDeductions: { type: Type.NUMBER },
                                    incomeDay20: { type: Type.NUMBER },
                                    bonusMain: { type: Type.NUMBER },
                                    bonusHot: { type: Type.NUMBER },
                                    actualTaxDay20: { type: Type.NUMBER },
                                    bonusItems: {
                                        type: Type.ARRAY,
                                        items: {
                                            type: Type.OBJECT,
                                            properties: {
                                                name: { type: Type.STRING },
                                                amount: { type: Type.NUMBER }
                                            },
                                            required: ['name', 'amount']
                                        }
                                    }
                                },
                                required: ['detectedType', 'fullName', 'monthYear', 'bankAccount', 'bankName']
                            }
                        }
                    });
                    responseText = response.text?.trim() || '';
                    if (responseText) break;
                } catch (candidateErr) {
                    console.warn(`[SalarySlipOcr] Thử model ${model} thất bại:`, candidateErr);
                }
            }

            if (responseText) {
                const raw = JSON.parse(responseText);

                // Kiểm tra tính hợp lệ
                if (targetSlip === 'day5' && raw.detectedType === 'day20_bonus') {
                    throw new Error('Ảnh tải lên là Bảng thưởng ngày 20. Vui lòng tải đúng Bảng lương ngày 5 (Chi tiết lương) vào ô này.');
                }
                if (targetSlip === 'day20' && raw.detectedType === 'day5_salary') {
                    throw new Error('Ảnh tải lên là Bảng lương ngày 5. Vui lòng tải đúng Bảng thưởng ngày 20 (Xem chi tiết thưởng) vào ô này.');
                }
                if (raw.detectedType === 'unknown') {
                    throw new Error('Hình ảnh không phải là bảng lương hoặc bảng thưởng hợp lệ của HRM MWG. Vui lòng chụp lại rõ nét.');
                }

                if (targetSlip === 'day5') {
                    const incomeDay5 = Number(raw.incomeDay5) || 0;
                    const insurance = Number(raw.insurance) || 0;
                    const dependents = Number(raw.dependents) || 0;
                    const personalDeduction = Number(raw.personalDeduction) || 15_500_000;
                    const totalDeductionsDay1 = Number(raw.totalDeductions) || (personalDeduction + (dependents * 6_200_000) + insurance);
                    const remainingDeductionsDay1 = Math.max(0, totalDeductionsDay1 - incomeDay5);

                    return {
                        fullName: raw.fullName || '',
                        monthYear: raw.monthYear || '',
                        incomeDay5,
                        insuranceSalary: Number(raw.insuranceSalary) || 0,
                        insurance,
                        dependents,
                        personalDeduction,
                        totalDeductionsDay1,
                        remainingDeductionsDay1,
                        bankAccount: String(raw.bankAccount || '').replace(/\s+/g, ''),
                        bankName: raw.bankName || '',
                        matchedBankCode: matchBankFromRawText(raw.bankName || ''),
                        isValid: true
                    } as SalarySlipDay5Data;
                } else {
                    const bonusItems: BonusItem[] = Array.isArray(raw.bonusItems)
                        ? raw.bonusItems.map((item: any, index: number) => classifyBonusItem(item, index))
                        : [];

                    return {
                        fullName: raw.fullName || '',
                        monthYear: raw.monthYear || '',
                        incomeDay20: Number(raw.incomeDay20) || 0,
                        bonusMain: Number(raw.bonusMain) || 0,
                        bonusHot: Number(raw.bonusHot) || 0,
                        actualTaxDay20: Number(raw.actualTaxDay20) || 0,
                        bonusItems,
                        bankAccount: String(raw.bankAccount || '').replace(/\s+/g, ''),
                        bankName: raw.bankName || '',
                        matchedBankCode: matchBankFromRawText(raw.bankName || ''),
                        isValid: true
                    } as SalarySlipDay20Data;
                }
            }
        } catch (clientErr: any) {
            console.error('[SalarySlipOcr] Client fallback cũng gặp lỗi:', clientErr);
            throw clientErr;
        }
    }

    // Thông báo phải nói ĐÚNG việc cần làm: khoá bị Google vô hiệu (thường do bị lộ ra repo công
    // khai) thì "thử lại" bao nhiêu lần cũng vô ích — phải cấp khoá mới.
    const reason = serverReason.toLowerCase();
    if (reason.includes('leak') || reason.includes('permission_denied') || reason.includes('api key not valid') || reason.includes('403')) {
        throw new Error('Khoá Gemini API của hệ thống đã bị Google vô hiệu (bị lộ hoặc sai). Quản trị cần cấp khoá mới, hoặc bạn tự dán API Key riêng ở nút "API Key".');
    }
    if (reason.includes('quota') || reason.includes('429') || reason.includes('resource_exhausted')) {
        throw new Error('Hạn mức Gemini API hôm nay đã hết. Thử lại sau, hoặc dán API Key riêng của bạn ở nút "API Key".');
    }
    throw new Error('Không thể phân tích phiếu lương bằng AI. Vui lòng thử lại hoặc cài đặt API Key dự phòng.');
};

/**
 * Hàm tương thích cũ cho trường hợp gọi đơn lẻ
 */
export const extractSalarySlipInfo = async (file: File): Promise<SalarySlipExtractedData> => {
    const data = await extractSalarySlip(file, 'day5');
    const day5 = data as SalarySlipDay5Data;
    return {
        fullName: day5.fullName,
        totalIncome: day5.incomeDay5,
        dependents: day5.dependents,
        totalInsurance: day5.insurance,
        unionFee: 0,
        bankAccount: day5.bankAccount || '',
        bankName: day5.bankName || '',
        matchedBankCode: day5.matchedBankCode
    };
};


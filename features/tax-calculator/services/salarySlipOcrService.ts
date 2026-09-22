import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../services/firebase';
import { VIETNAMESE_BANKS } from './bankCatalog';

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
 * Trích xuất thông tin phiếu lương bằng AI (Gemini Vision)
 */
export const extractSalarySlipInfo = async (file: File): Promise<SalarySlipExtractedData> => {
    const { base64Data, mimeType } = await processAndResizeImage(file);

    // 1. Thử gọi qua Firebase Cloud Function trước
    try {
        const parseFn = httpsCallable<{ base64Data: string; mimeType: string }, SalarySlipExtractedData>(
            functions,
            'parseSalarySlipWithGemini'
        );
        const res = await parseFn({ base64Data, mimeType });
        if (res.data) {
            const raw = res.data;
            return {
                fullName: raw.fullName || '',
                totalIncome: Number(raw.totalIncome) || 0,
                dependents: Number(raw.dependents) || 0,
                totalInsurance: Number(raw.totalInsurance) || 0,
                unionFee: Number(raw.unionFee) || 0,
                bankAccount: String(raw.bankAccount || '').replace(/\s+/g, ''),
                bankName: raw.bankName || '',
                matchedBankCode: matchBankFromRawText(raw.bankName || '')
            };
        }
    } catch (cloudErr) {
        console.warn('[SalarySlipOcr] Cloud Function không khả dụng hoặc lỗi, thử fallback:', cloudErr);
    }

    // 2. Client-side fallback nếu Cloud Function bận: đã thiết lập sẵn Key hệ thống để người dùng chỉ cần up ảnh là dùng ngay
    const clientApiKey = localStorage.getItem('CUSTOM_GEMINI_API_KEY') ||
                         (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : '') ||
                         (import.meta as unknown as { env: Record<string, string> }).env?.VITE_GEMINI_API_KEY ||
                         'AIzaSyCDWY2shJhSl6-oxfRB6N3QLkqfmwtY1jQ';

    if (clientApiKey) {
        try {
            const { GoogleGenAI, Type } = await import('@google/genai');
            const ai = new GoogleGenAI({ apiKey: clientApiKey });
            const candidateModels = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.5-flash'];
            let responseText = '';

            for (const model of candidateModels) {
                try {
                    const response = await ai.models.generateContent({
                        model,
                        contents: {
                            parts: [
                                { inlineData: { mimeType, data: base64Data } },
                                { text: `Phân tích phiếu lương trong hình ảnh này. Trích xuất chính xác các giá trị sau: "fullName", "totalIncome" (tổng thu nhập chịu thuế), "dependents" (số người phụ thuộc), "totalInsurance" (tổng các khoản bảo hiểm), "unionFee" (phí công đoàn), "bankAccount", "bankName". Trả về 0 cho số không tìm thấy, chuỗi rỗng cho chữ không tìm thấy.` }
                            ]
                        },
                        config: {
                            responseMimeType: "application/json",
                            responseSchema: {
                                type: Type.OBJECT,
                                properties: {
                                    fullName: { type: Type.STRING },
                                    totalIncome: { type: Type.NUMBER },
                                    dependents: { type: Type.NUMBER },
                                    totalInsurance: { type: Type.NUMBER },
                                    unionFee: { type: Type.NUMBER },
                                    bankAccount: { type: Type.STRING },
                                    bankName: { type: Type.STRING }
                                },
                                required: ["fullName", "totalIncome", "dependents", "totalInsurance", "unionFee", "bankAccount", "bankName"]
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
                const data = JSON.parse(responseText);
                return {
                    fullName: data.fullName || '',
                    totalIncome: Number(data.totalIncome) || 0,
                    dependents: Number(data.dependents) || 0,
                    totalInsurance: Number(data.totalInsurance) || 0,
                    unionFee: Number(data.unionFee) || 0,
                    bankAccount: String(data.bankAccount || '').replace(/\s+/g, ''),
                    bankName: data.bankName || '',
                    matchedBankCode: matchBankFromRawText(data.bankName || '')
                };
            }
        } catch (clientErr) {
            console.error('[SalarySlipOcr] Client fallback cũng gặp lỗi:', clientErr);
        }
    }

    throw new Error('Không thể phân tích phiếu lương bằng AI. Vui lòng thử lại hoặc nhập tay thông tin.');
};

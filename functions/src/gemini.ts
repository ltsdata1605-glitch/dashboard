import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

export const generateWithGemini = onCall({ secrets: [GEMINI_API_KEY] }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Cần đăng nhập.');
  }

  const { prompt } = (request.data ?? {}) as { prompt?: string };
  if (!prompt || typeof prompt !== 'string') {
    throw new HttpsError('invalid-argument', 'Thiếu prompt.');
  }

  const { GoogleGenAI, Type } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY.value() });

  const candidateModels = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.5-flash'];
  let lastError: unknown = null;
  let responseText = '';

  for (const model of candidateModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              ca_xoay: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: 'Danh sách các mã ca trong chuỗi ca xoay.',
              },
            },
            required: ['ca_xoay'],
          },
        },
      });
      responseText = response.text?.trim() || '{}';
      break;
    } catch (err) {
      lastError = err;
      console.warn(`[Gemini] Thử model ${model} thất bại, chuyển model tiếp theo:`, err);
    }
  }

  if (!responseText && lastError) {
    throw new HttpsError('internal', `Lỗi xử lý AI: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
  }

  let result: unknown;
  try {
    result = JSON.parse(responseText || '{}');
  } catch {
    throw new HttpsError('internal', 'AI trả về định dạng không hợp lệ.');
  }

  const parsed = result as { ca_xoay?: unknown };
  if (!Array.isArray(parsed.ca_xoay) || !parsed.ca_xoay.every((i) => typeof i === 'string')) {
    throw new HttpsError('internal', 'Định dạng phản hồi của AI không chính xác.');
  }

  return { ca_xoay: parsed.ca_xoay as string[] };
});

/**
 * Cloud Function trích xuất thông tin phiếu lương & bảng thưởng 2 đợt của MWG bằng Gemini AI
 */
export const parseSalarySlipWithGemini = onCall({ secrets: [GEMINI_API_KEY] }, async (request) => {
  const { base64Data, mimeType, targetSlip } = (request.data ?? {}) as {
    base64Data?: string;
    mimeType?: string;
    targetSlip?: 'day5' | 'day20' | 'auto';
  };

  if (!base64Data || !mimeType) {
    throw new HttpsError('invalid-argument', 'Thiếu dữ liệu hình ảnh phiếu lương.');
  }

  const { GoogleGenAI, Type } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY.value() });

  const candidateModels = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.5-flash'];
  let lastError: unknown = null;
  let responseText = '';

  const prompt = `Phân tích ảnh chụp màn hình bảng lương hoặc bảng thưởng từ hệ thống HRM Thế Giới Di Động (MWG/ĐMX).
Yêu cầu phân tích và trích xuất dữ liệu:
1. Xác định chính xác loại phiếu (detectedType):
   - "day5_salary": Nếu là trang "Chi tiết lương" (Đợt 1 ngày 5), có chứa các mục như "Lương BHXH", "Chấm công", "Lương khoán", "Tổng tiền giảm trừ", "Giảm trừ bản thân 15.500.000", "8% BHXH", "Thực lãnh".
   - "day20_bonus": Nếu là trang "Xem chi tiết thưởng" (Đợt 2 ngày 20), có chứa tiêu đề ngày chuyển khoản (ví dụ "CK 21/09/2026"), "Thưởng chính", "Thưởng nóng", "Trừ thuế TNCN", "Khoán công việc", "Tổng chuyển khoản".
   - "unknown": Nếu không phải là phiếu lương hoặc phiếu thưởng hợp lệ của HRM MWG.

2. Trích xuất các trường thông tin:
   - fullName: Tên nhân viên hoặc Chủ tài khoản (chữ in hoa hoặc thường).
   - monthYear: Tháng năm của kỳ lương (ví dụ "08/2026").
   - bankAccount: Số tài khoản ngân hàng nhận tiền.
   - bankName: Tên ngân hàng nhận tiền (ví dụ VietinBank, Vietcombank...).

   Nếu là day5_salary (Đợt 1):
   - incomeDay5: Tổng thu nhập chịu thuế TNCN trong tháng tại đợt 1 (số nguyên).
   - insuranceSalary: Lương đóng BHXH (số nguyên).
   - insurance: Tổng các khoản bảo hiểm 10.5% (BHXH + BHYT + BHTN).
   - dependents: Số lượng người phụ thuộc (0 nếu không có).
   - personalDeduction: Mức giảm trừ bản thân (thường 15500000).
   - totalDeductions: Tổng tiền giảm trừ đợt 1.

   Nếu là day20_bonus (Đợt 2):
   - bonusMain: Tổng thưởng chính (số nguyên).
   - bonusHot: Thực nhận thưởng nóng (số nguyên).
   - incomeDay20: Tổng thu nhập đợt 2 (bonusMain + bonusHot hoặc tổng thu nhập chịu thuế đợt 2).
   - actualTaxDay20: Số tiền bị trừ thuế TNCN thực tế tại dòng "Trừ thuế TNCN" (ví dụ 974415).
   - bonusItems: Danh sách tất cả các dòng thưởng chi tiết được bóc tách rõ ràng:
     + Các mục thuộc "Thưởng nóng" (gán category là "hot"): Khoán công việc, Thưởng bán hàng Combo, Thưởng nóng NV ST - Thưởng cá nhân, Thưởng nóng NV ST - Chia theo quỹ thưởng nóng ST, Thưởng nóng hồ sơ trả góp, Thưởng nóng đào tạo kiến thức sản phẩm, Thưởng thi đua VAS...
     + Các mục thuộc "Thưởng chính" (gán category là "main"): Thưởng ERP còn lại, Thưởng thêm Hệ số K, Thưởng Trả góp, Thưởng giao hàng, Thưởng kho Hub, Thưởng Up hình máy cũ, Thưởng BH máy, Thưởng phục vụ...

Trả về 0 cho số không tìm thấy, chuỗi rỗng cho chữ không tìm thấy, mảng rỗng [] cho danh sách không có.`;

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
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detectedType: { type: Type.STRING },
              fullName: { type: Type.STRING },
              monthYear: { type: Type.STRING },
              bankAccount: { type: Type.STRING },
              bankName: { type: Type.STRING },
              // Đợt 1
              incomeDay5: { type: Type.NUMBER },
              insuranceSalary: { type: Type.NUMBER },
              insurance: { type: Type.NUMBER },
              dependents: { type: Type.NUMBER },
              personalDeduction: { type: Type.NUMBER },
              totalDeductions: { type: Type.NUMBER },
              // Đợt 2
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
                    amount: { type: Type.NUMBER },
                    category: { type: Type.STRING }
                  },
                  required: ['name', 'amount']
                }
              }
            },
            required: [
              'detectedType',
              'fullName',
              'monthYear',
              'bankAccount',
              'bankName'
            ]
          }
        }
      });

      responseText = response.text?.trim() || '{}';
      if (responseText) break;
    } catch (err) {
      lastError = err;
      console.warn(`[Gemini OCR] Model ${model} thất bại, thử model tiếp theo:`, err);
    }
  }

  if (!responseText && lastError) {
    throw new HttpsError('internal', `Lỗi xử lý AI: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
  }

  let parsed: any;
  try {
    parsed = JSON.parse(responseText);
  } catch {
    throw new HttpsError('internal', 'AI trả về phản hồi không hợp lệ.');
  }

  // Kiểm tra tính hợp lệ với targetSlip được yêu cầu
  if (targetSlip === 'day5' && parsed.detectedType === 'day20_bonus') {
    return {
      isValid: false,
      detectedType: parsed.detectedType,
      error: 'Ảnh tải lên là Bảng thưởng ngày 20. Vui lòng tải đúng Bảng lương ngày 5 (Chi tiết lương) vào ô này.'
    };
  }

  if (targetSlip === 'day20' && parsed.detectedType === 'day5_salary') {
    return {
      isValid: false,
      detectedType: parsed.detectedType,
      error: 'Ảnh tải lên là Bảng lương ngày 5. Vui lòng tải đúng Bảng thưởng ngày 20 (Xem chi tiết thưởng) vào ô này.'
    };
  }

  if (parsed.detectedType === 'unknown') {
    return {
      isValid: false,
      detectedType: parsed.detectedType,
      error: 'Hình ảnh không phải là bảng lương hoặc bảng thưởng hợp lệ của HRM MWG. Vui lòng chụp lại rõ nét.'
    };
  }

  parsed.isValid = true;
  return parsed;
});

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
// Import TĨNH thay vì await import(...) trong handler: module nặng được nạp lúc khởi động
// container, request đầu tiên sau cold start không phải chờ nạp nữa (đo 2026-09-23: lượt gọi
// đầu 24s, các lượt sau 5-7s).
import { GoogleGenAI, Type } from '@google/genai';

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

/** Vùng gần người dùng nhất (Singapore) — ảnh phiếu lương vài trăm KB không phải bay sang Mỹ. */
const GEMINI_REGION = 'asia-southeast1';

/**
 * Thứ tự model — ĐO THẬT 2026-09-23 trên ảnh bảng thưởng ngày 20 (12 dòng thưởng):
 *   gemini-3.6-flash  : xong trong 4,0s
 *   gemini-flash-latest: TREO, chạm trần 30s rồi phải bỏ
 * Nên model cụ thể đứng đầu, alias `-latest` chỉ là dự phòng (alias có lúc trỏ sang bản đang
 * quá tải). Sáng cùng ngày từng đảo ngược thứ tự này và làm mỗi lượt ảnh thưởng tốn thêm 30s.
 */
const CANDIDATE_MODELS = ['gemini-3.6-flash', 'gemini-flash-latest', 'gemini-3.5-flash'];

/** Trần thời gian cho MỖI model: model tốt chỉ mất 2-5s, nên 20s là quá đủ để kết luận "treo". */
const MODEL_TIMEOUT_MS = 20_000;

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} quá ${ms / 1000}s`)), ms)),
  ]);
}

/**
 * Tắt "thinking" của model flash: đọc bảng lương là việc trích xuất thuần, không cần suy luận
 * nhiều bước, mà thinking làm mỗi lượt lâu thêm vài giây. Model không hiểu trường này sẽ báo lỗi
 * và vòng lặp tự chuyển sang model kế.
 */
const NO_THINKING = { thinkingConfig: { thinkingBudget: 0 } } as const;

/**
 * Gemini có thể trả Infinity/NaN (vd chia cho 0 khi suy luận số) — firebase-functions không
 * encode được, ném "Data cannot be encoded in JSON: Infinity" và CẢ REQUEST hỏng, client phải
 * chạy lại đường dự phòng (gặp thật 2026-09-23, log Cloud Run).
 */
function sanitizeForJson<T>(value: T): T {
  if (typeof value === 'number') return (Number.isFinite(value) ? value : 0) as unknown as T;
  if (Array.isArray(value)) return value.map(sanitizeForJson) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = sanitizeForJson(v);
    return out as unknown as T;
  }
  return value;
}

export const generateWithGemini = onCall({ secrets: [GEMINI_API_KEY], memory: '512MiB' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Cần đăng nhập.');
  }

  const { prompt } = (request.data ?? {}) as { prompt?: string };
  if (!prompt || typeof prompt !== 'string') {
    throw new HttpsError('invalid-argument', 'Thiếu prompt.');
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY.value() });

  const candidateModels = CANDIDATE_MODELS;
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
export const parseSalarySlipWithGemini = onCall(
  // 512MiB: Cloud Run cấp CPU theo RAM nên container khởi động & parse JSON nhanh hơn hẳn 256MiB.
  // timeout 120s: ảnh dài (phiếu lương chụp dọc) có lúc chạm trần 60s mặc định rồi hỏng cả lượt.
  { secrets: [GEMINI_API_KEY], region: GEMINI_REGION, memory: '512MiB', timeoutSeconds: 120 },
  async (request) => {
  const { base64Data, mimeType, targetSlip } = (request.data ?? {}) as {
    base64Data?: string;
    mimeType?: string;
    targetSlip?: 'day5' | 'day20' | 'auto';
  };

  if (!base64Data || !mimeType) {
    throw new HttpsError('invalid-argument', 'Thiếu dữ liệu hình ảnh phiếu lương.');
  }

  const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY.value() });

  const candidateModels = CANDIDATE_MODELS;
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
    const startedAt = Date.now();
    try {
      const response = await withTimeout(ai.models.generateContent({
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
          },
          ...NO_THINKING
        }
      }), MODEL_TIMEOUT_MS, `Model ${model}`);

      const text = response.text?.trim() || '';
      if (!text) throw new Error('AI trả về nội dung rỗng');
      // Parse NGAY tại đây: model trả chuỗi không phải JSON thì còn cơ hội thử model kế, thay vì
      // hỏng cả lượt như trước (log 2026-09-23: "AI trả về phản hồi không hợp lệ" sau 113 giây).
      JSON.parse(text);
      responseText = text;
      console.info(`[Gemini OCR] Model ${model} xong sau ${Date.now() - startedAt}ms`);
      break;
    } catch (err) {
      lastError = err;
      console.warn(`[Gemini OCR] Model ${model} thất bại sau ${Date.now() - startedAt}ms, thử model tiếp theo:`, err);
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
  return sanitizeForJson(parsed);
  }
);

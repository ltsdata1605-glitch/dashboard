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
 * Cloud Function trích xuất thông tin phiếu lương tự động bằng Gemini AI
 */
export const parseSalarySlipWithGemini = onCall({ secrets: [GEMINI_API_KEY] }, async (request) => {
  const { base64Data, mimeType } = (request.data ?? {}) as { base64Data?: string; mimeType?: string };
  if (!base64Data || !mimeType) {
    throw new HttpsError('invalid-argument', 'Thiếu dữ liệu hình ảnh phiếu lương.');
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
        contents: {
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            {
              text: 'Phân tích phiếu lương trong hình ảnh này. Trích xuất chính xác các giá trị sau: "fullName", "totalIncome" (tổng thu nhập chịu thuế), "dependents" (số người phụ thuộc), "totalInsurance" (tổng các khoản bảo hiểm), "unionFee" (phí công đoàn), "bankAccount", "bankName". Trả về 0 cho số không tìm thấy, chuỗi rỗng cho chữ không tìm thấy.'
            }
          ]
        },
        config: {
          responseMimeType: 'application/json',
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
            required: [
              'fullName',
              'totalIncome',
              'dependents',
              'totalInsurance',
              'unionFee',
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

  try {
    return JSON.parse(responseText);
  } catch {
    throw new HttpsError('internal', 'AI trả về phản hồi không hợp lệ.');
  }
});

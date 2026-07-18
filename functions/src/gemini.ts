import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

// Thay thế features/phan-ca/components/AiSuggestPatternModal.tsx gọi
// GoogleGenAI trực tiếp từ client (lộ API key trong bundle — xem
// implementation_plan.md mục 1.1). Client chỉ còn build chuỗi `prompt`,
// việc gọi Gemini chuyển hẳn sang server, key lưu trong Secret Manager
// (firebase functions:secrets:set GEMINI_API_KEY).
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

  const response = await ai.models.generateContent({
    model: 'gemini-3.5-flash',
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

  const jsonText = response.text?.trim() || '{}';
  let result: unknown;
  try {
    result = JSON.parse(jsonText);
  } catch {
    throw new HttpsError('internal', 'AI trả về định dạng không hợp lệ.');
  }

  const parsed = result as { ca_xoay?: unknown };
  if (!Array.isArray(parsed.ca_xoay) || !parsed.ca_xoay.every((i) => typeof i === 'string')) {
    throw new HttpsError('internal', 'Định dạng phản hồi của AI không chính xác.');
  }

  return { ca_xoay: parsed.ca_xoay as string[] };
});

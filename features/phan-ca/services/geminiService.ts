import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

interface GenerateWithGeminiResult {
    ca_xoay: string[];
}

const generateWithGeminiFn = httpsCallable<{ prompt: string }, GenerateWithGeminiResult>(
    functions,
    'generateWithGemini'
);

// Gọi Cloud Function generateWithGemini (functions/src/gemini.ts) — thay cho
// việc gọi GoogleGenAI trực tiếp từ client (lộ GEMINI_API_KEY trong bundle,
// xem implementation_plan.md mục 1.1). Prompt vẫn build ở client như cũ.
export const suggestShiftPattern = async (prompt: string): Promise<string[]> => {
    const result = await generateWithGeminiFn({ prompt });
    return result.data.ca_xoay;
};

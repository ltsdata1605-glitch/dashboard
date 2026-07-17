import { httpsCallable, Functions } from 'firebase/functions';

interface GenerateWithGeminiResult {
    ca_xoay: string[];
}

// Nhận `functions` từ ngoài truyền vào (lấy từ useAuth() — root AuthContext) thay
// vì tự tạo instance riêng cho app Firebase của phan-ca: app riêng của phan-ca có
// auth session KHÁC với session người dùng thật sự đăng nhập (ở root), nên gọi
// qua instance đó sẽ không đính kèm ID token → Cloud Run từ chối request ở tầng
// hạ tầng (401 "Empty Authorization header value") trước khi chạm tới code hàm.
export const suggestShiftPattern = async (functions: Functions, prompt: string): Promise<string[]> => {
    const generateWithGeminiFn = httpsCallable<{ prompt: string }, GenerateWithGeminiResult>(
        functions,
        'generateWithGemini'
    );
    const result = await generateWithGeminiFn({ prompt });
    return result.data.ca_xoay;
};

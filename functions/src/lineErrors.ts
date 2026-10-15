/**
 * Đổi lỗi LINE Messaging API thành câu tiếng Việt người dùng hiểu được (2026-10-15).
 *
 * Lý do: lịch "Gửi Notify" chạy đúng giờ nhưng LINE trả `429 You have reached your monthly limit.` (hết hạn mức tin
 * nhắn tháng của Official Account) — giao diện chỉ hiện "Đã gửi 0/1 nhóm", người dùng tưởng tính năng hỏng.
 * Lưu ý tính phí của LINE: tin PUSH vào nhóm tính theo SỐ THÀNH VIÊN nhóm; tin REPLY (trả lời tin nhắn) miễn phí.
 */
export const LINE_HET_HAN_MUC = 'Bot đã hết hạn mức tin nhắn LINE của tháng này (LINE cấp lại vào ngày 1 hàng tháng, hoặc nâng gói Official Account để gửi tiếp).';

export const moTaLoiLine = (status: number, message?: string): string => {
    const m = String(message || '');
    if (status === 429 && /monthly limit/i.test(m)) return LINE_HET_HAN_MUC;
    if (status === 429) return 'LINE đang giới hạn tốc độ gửi — thử lại sau ít phút.';
    if (status === 401) return 'Channel Access Token của bot không hợp lệ hoặc đã hết hạn — cập nhật Token trong Cài đặt bot.';
    if (status === 403) return 'LINE từ chối quyền gửi (gói Official Account không cho phép tin này).';
    if (status === 400 && /not.*(found|member)|invalid.*to|The property, 'to'/i.test(m)) return 'Bot không còn trong nhóm này hoặc mã nhóm sai.';
    return m ? `LINE báo lỗi (${status}): ${m}` : `LINE báo lỗi (mã ${status}).`;
};

export const laHetHanMuc = (status: number, message?: string): boolean => status === 429 && /monthly limit/i.test(String(message || ''));

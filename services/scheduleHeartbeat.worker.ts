/**
 * Nhịp đếm cho bộ hẹn giờ Auto Sync (2026-10-02). Timer trên trang chính bị Chrome làm chậm mạnh khi tab nằm nền
 * ("intensive throttling"); timer trong Web Worker thì không — nên nhịp 20s đặt ở đây, trang chỉ nghe tin nhắn.
 */
setInterval(() => { (self as unknown as Worker).postMessage('tick'); }, 20_000);
export {};

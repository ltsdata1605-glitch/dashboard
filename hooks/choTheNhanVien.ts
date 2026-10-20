/**
 * Chờ thẻ của ĐÚNG nhân viên vẽ xong ở khung ngoài màn hình (vòng xuất hàng loạt — hooks/useExportLogic.ts). React vẽ BẤT ĐỒNG BỘ:
 * máy đang bận (vd lượt tự xuất Bot LINE chụp ảnh ngầm ngay sau khi tải tệp, iPhone cũ) thì chờ cứng 800 ms không đủ → mục đó bị
 * đánh "Không dựng được nội dung" oan (CI WebKit đỏ 2/27 lượt, 2026-10-20), hoặc chụp nhầm thẻ người trước còn sót. Vẫn giữ
 * 800 ms để biểu đồ ổn định. Tách file riêng (không phụ thuộc gì) để test đơn vị đo được bằng đồng hồ giả: tests/unit/cho-the-nhan-vien.test.ts.
 */
export const choTheNhanVien = async (
    container: Pick<HTMLElement, 'querySelector'>,
    ten: string,
): Promise<HTMLElement | null> => {
    const dungNguoi = () => {
        const el = container.querySelector<HTMLElement>('.modal-content[data-batch-employee]');
        return el && el.getAttribute('data-batch-employee') === ten ? el : null;
    };
    await new Promise(resolve => setTimeout(resolve, 800));
    let el = dungNguoi();
    if (el) return el;
    const han = Date.now() + 15_000;
    while (!el && Date.now() < han) {
        await new Promise(resolve => setTimeout(resolve, 100));
        el = dungNguoi();
    }
    // Vẽ trễ → thêm một nhịp cho hiệu ứng sau khi vẽ (biểu đồ đo kích thước), như 800 ms ở nhịp thường
    if (el) await new Promise(resolve => setTimeout(resolve, 400));
    return el;
};

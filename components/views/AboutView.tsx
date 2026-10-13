import React from 'react';
import { AppIcon } from '../shared/ui/icon/AppIcon';
import type { IconName } from '../shared/ui/icon/iconRegistry';
import { ListGroup, ListRow, type ListIconTone } from '../shared/ui/ListGroup';
import { useActiveTab } from '../../contexts/LayoutContext';

/**
 * Trang Giới thiệu — kiểu "Giới thiệu" của Cài đặt iOS (GĐ7, KE_HOACH_GIAO_DIEN_APPLE.md).
 *
 * Bản cũ hứa SAI: "Bảo mật tuyệt đối… hoàn toàn không đẩy lên máy chủ" và "Trợ lý AI phân tích chuyên sâu" — thực tế dữ liệu
 * bán hàng CÓ đồng bộ lên tài khoản (Firebase) để người cùng Kho xem và dùng nhiều máy; AI (Gemini) chỉ có ở Phân ca (gợi ý ca
 * xoay) và Tính thuế (đọc ảnh phiếu lương). Nay mỗi câu đều đúng với code đang chạy. Mỗi phân hệ là một hàng bấm được để mở.
 */
const PHAN_HE: { tab: string; ten: string; moTa: string; icon: IconName; tone: ListIconTone }[] = [
    { tab: 'analysis', ten: 'Phân tích YCX', moTa: 'Doanh thu, DTQĐ, ngành hàng, nhân viên từ file Excel YCX', icon: 'chartLine', tone: 'sky' },
    { tab: 'employees', ten: 'Report BI', moTa: 'Realtime, luỹ kế, thi đua và thưởng theo siêu thị', icon: 'chartBar', tone: 'sky' },
    { tab: 'check-thuong', ten: 'Check thưởng', moTa: 'Tra cứu và so sánh thưởng thi đua giữa các siêu thị', icon: 'award', tone: 'amber' },
    { tab: 'reports', ten: 'Báo cáo khai thác', moTa: 'Ghi nhận khai thác của nhân viên trong ca', icon: 'report', tone: 'emerald' },
    { tab: 'tools-line-bot', ten: 'Bot LINE', moTa: 'Cấp phát mã PMH và gửi thông báo vào nhóm LINE', icon: 'bot', tone: 'emerald' },
    { tab: 'tools-print-sticker', ten: 'In Sticker', moTa: 'Tem giá sốc, giờ vàng, phiếu rút thăm', icon: 'print', tone: 'amber' },
    { tab: 'tools-phanca', ten: 'Phân ca', moTa: 'Xếp lịch làm việc theo ca xoay', icon: 'calendar', tone: 'sky' },
    { tab: 'tools-tax', ten: 'Tính thuế', moTa: 'Thuế TNCN 2 đợt lương, thưởng', icon: 'calculator', tone: 'rose' },
];

export default function AboutView() {
    const { setActiveTab } = useActiveTab();

    return (
        <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10 space-y-7 pb-32">
            {/* Đầu trang: biểu tượng ứng dụng + tên + phiên bản (như trang Giới thiệu của iOS) */}
            <header className="flex flex-col items-center text-center">
                <div className="w-[72px] h-[72px] rounded-card bg-gradient-to-br from-sky-500 to-sky-700 flex items-center justify-center shadow-md shadow-sky-500/20">
                    <AppIcon name="chartBar" size="hero" className="text-white" />
                </div>
                <h1 className="mt-3 type-title font-bold text-slate-900">Dashboard YCX</h1>
                <p className="type-footnote text-slate-500">Phiên bản 11.2 · 2026</p>
                <p className="mt-3 type-subhead text-slate-600 max-w-md">
                    Phân tích doanh số và công cụ vận hành cho quản lý siêu thị — dùng trên laptop và iPhone.
                </p>
            </header>

            <ListGroup title="Phân hệ">
                {PHAN_HE.map(p => (
                    <ListRow key={p.tab} icon={p.icon} iconTone={p.tone} label={p.ten} description={p.moTa} onClick={() => setActiveTab(p.tab)} />
                ))}
            </ListGroup>

            <ListGroup
                title="Dữ liệu và quyền riêng tư"
                footer="Đăng xuất là dọn dữ liệu của bạn đã lưu trên máy (trừ Báo cáo khai thác — chỉ có trên máy, không có bản cloud)."
            >
                <ListRow icon="spreadsheet" iconTone="slate" label="File Excel xử lý trên máy"
                    description="File được đọc và tính ngay trên trình duyệt — không gửi file lên máy chủ." />
                <ListRow icon="cloud" iconTone="slate" label="Kết quả đồng bộ theo tài khoản"
                    description="Lưu vào tài khoản Google (Firebase) để dùng trên nhiều máy; báo cáo chung chỉ người cùng Kho xem được." />
                <ListRow icon="department" iconTone="slate" label="Phân quyền theo Kho"
                    description="Admin, Quản lý, Nhân viên — mỗi người chỉ thấy dữ liệu Kho của mình." />
                <ListRow icon="sparkles" iconTone="slate" label="AI (Google Gemini)"
                    description="Gợi ý ca xoay ở Phân ca và đọc ảnh phiếu lương ở Tính thuế — chỉ gửi nội dung bạn chọn." />
            </ListGroup>

            <p className="text-center type-footnote text-slate-400">@21707</p>
        </div>
    );
}

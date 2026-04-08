import React from 'react';
import { 
    Shield, 
    Zap, 
    BarChart3, 
    Users, 
    Package, 
    Sparkles, 
    Code, 
    Cpu,
    Target,
    Activity,
    LineChart,
    Layers,
    Github
} from 'lucide-react';

export default function AboutView() {
    return (
        <div className="p-4 sm:p-6 lg:p-8 space-y-8 pb-32 animate-in fade-in duration-500 max-w-7xl mx-auto">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-800 p-8 sm:p-12 text-white shadow-xl">
                <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
                    <Cpu size={240} />
                </div>
                <div className="relative z-10 max-w-3xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/30 border border-indigo-400/30 backdrop-blur-md mb-6">
                        <Sparkles size={16} className="text-amber-300" />
                        <span className="text-sm font-bold tracking-wide uppercase text-indigo-100">Phiên bản 11.2 - 2026</span>
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-black mb-4 tracking-tight leading-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-200">
                        Dashboard YCX
                        <br />
                        Bảo Mật Tuyệt Đối
                    </h1>
                    <p className="text-lg sm:text-xl text-indigo-100/90 leading-relaxed max-w-2xl font-medium">
                        Nền tảng phân tích dữ liệu bán hàng hiệu suất cao tích hợp Trợ lý ảo AI. Xử lý file Excel dung lượng lớn cực kỳ mượt mà, trực quan hóa dữ liệu đa chiều mang lại cái nhìn sâu sắc cho nhà quản trị.
                    </p>
                </div>
            </div>

            {/* Core Benefits */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 mb-4">
                        <Zap size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Tốc Độ Xử Lý Nhanh</h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                        Thuật toán tối ưu hóa cho phép nạp và xử lý hàng chục ngàn dòng dữ liệu từ file Excel chỉ trong chớp mắt mà không làm treo trình duyệt.
                    </p>
                </div>
                
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 mb-4">
                        <Shield size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Bảo Mật Tuyệt Đối</h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                        Mọi dữ liệu bảng tính nhạy cảm đều được xử lý cục bộ ngay trên máy của người dùng (Client-side) hoàn toàn không đẩy lên máy chủ.
                    </p>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 mb-4">
                        <Cpu size={24} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Trợ Lý AI Tích Hợp</h3>
                    <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                        Trợ lý ảo phân tích nâng cao, sẵn sàng đưa ra nhận định chuyên sâu dựa trên số liệu thực tế được cung cấp từ bảng dữ liệu.
                    </p>
                </div>
            </div>

            {/* Feature Breakdown */}
            <h2 className="text-2xl font-black text-slate-800 dark:text-white pt-4 flex items-center gap-3">
                <Layers className="text-[#0584c7]" /> Chi Tiết Tính Năng Chuyên Sâu
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* 1. Màn Hình Phân Tích */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="bg-slate-50 dark:bg-slate-800/80 p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#0584c7]/10 text-[#0584c7] flex items-center justify-center">
                            <BarChart3 size={18} />
                        </div>
                        <h3 className="font-bold text-slate-800 dark:text-white">Khu Vực "Phân Tích"</h3>
                    </div>
                    <div className="p-5">
                        <ul className="space-y-3">
                            <li className="flex gap-3">
                                <Target className="text-indigo-500 shrink-0 mt-0.5" size={16} />
                                <span className="text-sm text-slate-600 dark:text-slate-300"><strong className="text-slate-800 dark:text-slate-200">Hệ thống KPI & Summary:</strong> Trực quan hóa Doanh thu thực, tỷ lệ phần trăm tiến độ mục tiêu, Hiệu quả QĐ một cách thông minh. Báo động tự động những Cửa hàng bị tụt hậu so với chỉ tiêu bằng sắc màu đỏ trực quan.</span>
                            </li>
                            <li className="flex gap-3">
                                <LineChart className="text-emerald-500 shrink-0 mt-0.5" size={16} />
                                <span className="text-sm text-slate-600 dark:text-slate-300"><strong className="text-slate-800 dark:text-slate-200">Table Dữ liệu Động:</strong> Tích hợp ma trận đánh giá Bán Kèm, Bảo Hành và Phụ Kiện. Bạn hoàn toàn có thể chủ động bổ sung/cắt giảm các cột linh hoạt dựa vào hệ thống thiết lập riêng biệt.</span>
                            </li>
                            <li className="flex gap-3">
                                <Activity className="text-rose-500 shrink-0 mt-0.5" size={16} />
                                <span className="text-sm text-slate-600 dark:text-slate-300"><strong className="text-slate-800 dark:text-slate-200">Cảnh Báo Đơn Quá Hạn:</strong> Thu thập đơn chờ xuất và thông báo cho người dùng một danh sách minh bạch nếu đã bước qua thời điểm giao hẹn trên ERP.</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* 2. Màn Hình Nhân Viên */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="bg-slate-50 dark:bg-slate-800/80 p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-teal-500/10 text-teal-600 flex items-center justify-center">
                            <Users size={18} />
                        </div>
                        <h3 className="font-bold text-slate-800 dark:text-white">Khu Vực "Nhân Viên"</h3>
                    </div>
                    <div className="p-5">
                        <ul className="space-y-3">
                            <li className="flex gap-3">
                                <Target className="text-indigo-500 shrink-0 mt-0.5" size={16} />
                                <span className="text-sm text-slate-600 dark:text-slate-300"><strong className="text-slate-800 dark:text-slate-200">Sơ Đồ Tổ Chức Động:</strong> Quản lý danh sách từng phòng ban qua giao diện cây phả hệ (Tree View). Di chuyển nhân sự/kho thả-kéo dể dàng.</span>
                            </li>
                            <li className="flex gap-3">
                                <LineChart className="text-emerald-500 shrink-0 mt-0.5" size={16} />
                                <span className="text-sm text-slate-600 dark:text-slate-300"><strong className="text-slate-800 dark:text-slate-200">Trích xuất Doanh Thu Nhân Viên:</strong> Chọn cụ thể từng nhân viên để xem lại tổng giá trị hoá đơn đã chốt trong tháng dựa theo dữ liệu thô tải lên từ Hệ thống.</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* 3. Công Cụ & Check Thưởng */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="bg-slate-50 dark:bg-slate-800/80 p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                            <Package size={18} />
                        </div>
                        <h3 className="font-bold text-slate-800 dark:text-white">Bộ "Công Cụ Mở Rộng"</h3>
                    </div>
                    <div className="p-5">
                        <ul className="space-y-3">
                            <li className="flex gap-3">
                                <Target className="text-indigo-500 shrink-0 mt-0.5" size={16} />
                                <span className="text-sm text-slate-600 dark:text-slate-300"><strong className="text-slate-800 dark:text-slate-200">Hoàn thuế & Coupon:</strong> Thuận tiện mở ứng dụng tính thuế thu nhập doanh thu (PIT) hoặc các công cụ chuyển đổi Coupon trực tiếp qua tab mới không gián đoạn công việc hiện tại.</span>
                            </li>
                            <li className="flex gap-3">
                                <LineChart className="text-emerald-500 shrink-0 mt-0.5" size={16} />
                                <span className="text-sm text-slate-600 dark:text-slate-300"><strong className="text-slate-800 dark:text-slate-200">Check Thưởng:</strong> Nhanh chóng định vị và quy đổi các khoản Bonus cuối kỳ theo cơ chế tính lương chuẩn sát nhất.</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* 4. Quản trị Phân quyền */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="bg-slate-50 dark:bg-slate-800/80 p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center">
                            <Shield size={18} />
                        </div>
                        <h3 className="font-bold text-slate-800 dark:text-white">Kiểm Soát "Quyền Truy Cập"</h3>
                    </div>
                    <div className="p-5">
                        <ul className="space-y-3">
                            <li className="flex gap-3">
                                <Target className="text-indigo-500 shrink-0 mt-0.5" size={16} />
                                <span className="text-sm text-slate-600 dark:text-slate-300"><strong className="text-slate-800 dark:text-slate-200">Role-based Access Control (RBAC):</strong> Cơ chế quản trị chặt chẽ từ Admin, Manager đến Member. Admin duyệt quyền đăng nhập tránh kẻ xâm nhập lạ. Phân hệ mã hóa tài chính riêng.</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Author */}
            <div className="mt-12 bg-slate-900 rounded-3xl p-8 sm:p-10 text-center relative overflow-hidden shadow-xl">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-blue-500/10 mix-blend-overlay"></div>
                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-20 h-20 bg-gradient-to-tr from-[#0584c7] to-indigo-500 rounded-2xl p-1 mb-5 flex items-center justify-center rotate-3 hover:rotate-0 transition-transform">
                        <div className="w-full h-full bg-slate-900 rounded-xl flex items-center justify-center">
                            <Code className="text-white" size={32} />
                        </div>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-black text-white mb-3">Phát Triển Hệ Thống</h3>
                    <p className="text-slate-400 font-medium mb-6 max-w-lg mx-auto">
                        Được lên ý tưởng và code hoàn toàn độc quyền. Mọi quyền sở hữu và tài sản trí tuệ đều tuân thủ và được nâng cấp thường xuyên.
                    </p>
                    <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 font-semibold shadow-inner">
                        <Github size={18} className="text-slate-400" />
                        Tác giả: <span className="text-white hover:text-[#0584c7] cursor-pointer transition-colors">21707 - Lê Trường Sơn</span>
                    </div>
                </div>
            </div>
            
        </div>
    );
}

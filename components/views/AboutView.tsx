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
        <div className="p-3 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 pb-32 animate-in fade-in duration-500 max-w-7xl mx-auto">
            {/* Hero Section */}
            <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-800 p-6 sm:p-12 text-white shadow-xl">
                <div className="absolute top-0 right-0 p-6 sm:p-12 opacity-10 pointer-events-none">
                    <Cpu size={240} className="w-40 h-40 sm:w-60 sm:h-60" />
                </div>
                <div className="relative z-10 max-w-3xl">
                    <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1 rounded-full bg-indigo-500/30 border border-indigo-400/30 backdrop-blur-md mb-4 sm:mb-6">
                        <Sparkles size={14} className="text-amber-300 sm:w-4 sm:h-4" />
                        <span className="text-xs sm:text-sm font-bold tracking-wide uppercase text-indigo-100">Phiên bản 11.2 - 2026</span>
                    </div>
                    <h1 className="text-3xl sm:text-5xl font-black mb-3 sm:mb-4 tracking-tight leading-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-indigo-200">
                        Dashboard YCX
                        <br />
                        Bảo Mật Tuyệt Đối
                    </h1>
                    <p className="text-sm sm:text-xl text-indigo-100/90 leading-relaxed max-w-2xl font-medium">
                        Nền tảng phân tích dữ liệu bán hàng hiệu suất cao tích hợp Trợ lý ảo AI. Xử lý file Excel dung lượng lớn cực kỳ mượt mà, trực quan hóa dữ liệu đa chiều mang lại cái nhìn sâu sắc cho nhà quản trị.
                    </p>
                </div>
            </div>

            {/* Core Benefits */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 mb-3 sm:mb-4">
                        <Zap className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white mb-1.5 sm:mb-2">Tốc Độ Xử Lý Nhanh</h3>
                    <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm leading-relaxed">
                        Thuật toán tối ưu hóa cho phép nạp và xử lý hàng chục ngàn dòng dữ liệu từ file Excel chỉ trong chớp mắt mà không làm treo trình duyệt.
                    </p>
                </div>
                
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 mb-3 sm:mb-4">
                        <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white mb-1.5 sm:mb-2">Bảo Mật Tuyệt Đối</h3>
                    <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm leading-relaxed">
                        Mọi dữ liệu bảng tính nhạy cảm đều được xử lý cục bộ ngay trên máy của người dùng (Client-side) hoàn toàn không đẩy lên máy chủ.
                    </p>
                </div>

                <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 mb-3 sm:mb-4">
                        <Cpu className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white mb-1.5 sm:mb-2">Trợ Lý AI Tích Hợp</h3>
                    <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm leading-relaxed">
                        Trợ lý ảo phân tích nâng cao, sẵn sàng đưa ra nhận định chuyên sâu dựa trên số liệu thực tế được cung cấp từ bảng dữ liệu.
                    </p>
                </div>
            </div>

            {/* Feature Breakdown */}
            <h2 className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white pt-2 sm:pt-4 flex items-center gap-2 sm:gap-3">
                <Layers className="text-[#0584c7] w-5 h-5 sm:w-6 sm:h-6" /> Chi Tiết Tính Năng Chuyên Sâu
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                
                {/* 1. Hệ Sinh Thái Dashboard */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="bg-slate-50 dark:bg-slate-800/80 p-3 sm:p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2.5 sm:gap-3">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#0584c7]/10 text-[#0584c7] flex items-center justify-center">
                            <BarChart3 className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                        </div>
                        <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white">Hệ Sinh Thái Dashboard</h3>
                    </div>
                    <div className="p-4 sm:p-5">
                        <ul className="space-y-2.5 sm:space-y-3">
                            <li className="flex gap-2.5 sm:gap-3">
                                <Target className="text-indigo-500 shrink-0 mt-0.5 w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300"><strong className="text-slate-800 dark:text-slate-200">Giao diện Hiện đại:</strong> Thiết kế "High-Density" phẳng hóa, tích hợp hệ thống Badges (#1, #2) trực quan cho các phân hệ Thi Đua & Phân Tích.</span>
                            </li>
                            <li className="flex gap-2.5 sm:gap-3">
                                <Activity className="text-rose-500 shrink-0 mt-0.5 w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300"><strong className="text-slate-800 dark:text-slate-200">Tối ưu Mobile:</strong> Hệ thống bộ lọc (Filter) thông minh dạng Drawer, thanh điều hướng linh hoạt, tối ưu không gian trải nghiệm vuốt chạm trên thiết bị di động.</span>
                            </li>
                            <li className="flex gap-2.5 sm:gap-3">
                                <LineChart className="text-emerald-500 shrink-0 mt-0.5 w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300"><strong className="text-slate-800 dark:text-slate-200">Export Chuyên Nghiệp:</strong> Trích xuất báo cáo dạng ảnh gọn gàng, tính năng chia sẻ (Share API) tự động nhận diện và dịch tên bảng sang tiếng Việt thân thiện.</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* 2. Quản Lý & Tự Động Hoá */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
                    <div className="bg-slate-50 dark:bg-slate-800/80 p-3 sm:p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2.5 sm:gap-3">
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-teal-500/10 text-teal-600 flex items-center justify-center">
                            <Users className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                        </div>
                        <h3 className="text-sm sm:text-base font-bold text-slate-800 dark:text-white">Quản Lý & Tự Động Hoá</h3>
                    </div>
                    <div className="p-4 sm:p-5">
                        <ul className="space-y-2.5 sm:space-y-3">
                            <li className="flex gap-2.5 sm:gap-3">
                                <Zap className="text-amber-500 shrink-0 mt-0.5 w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300"><strong className="text-slate-800 dark:text-slate-200">Tự động hoá Nhập liệu:</strong> Tính năng "Cập nhật thưởng" sao chép ID hàng loạt (Context-Aware Clipboard), tự động chuyển tab loại bỏ thao tác thủ công.</span>
                            </li>
                            <li className="flex gap-2.5 sm:gap-3">
                                <Shield className="text-indigo-500 shrink-0 mt-0.5 w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300"><strong className="text-slate-800 dark:text-slate-200">An toàn Dữ liệu:</strong> Cơ chế Backup / Restore cấu hình hệ thống an toàn qua IndexedDB, bảo mật tuyệt đối (Client-side) không truyền tải dữ liệu nhạy cảm.</span>
                            </li>
                            <li className="flex gap-2.5 sm:gap-3">
                                <Users className="text-teal-500 shrink-0 mt-0.5 w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300"><strong className="text-slate-800 dark:text-slate-200">Phân quyền RBAC:</strong> Quản trị truy cập chặt chẽ từ Admin đến Member với hệ thống phân tầng tài chính tuyệt mật.</span>
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="mt-8 sm:mt-12 text-center pb-4">
                <span className="text-slate-400 dark:text-slate-500 text-sm font-bold tracking-widest uppercase">@21707</span>
            </div>
            
        </div>
    );
}

import React from 'react';

interface HelpModalProps {
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
      <div className="bg-white p-0 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col relative overflow-hidden">
        {/* Header */}
        <div className="bg-blue-600 p-4 flex justify-between items-center text-white shrink-0">
            <h2 className="text-xl font-bold uppercase flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Hướng dẫn sử dụng phần mềm phân ca tự động
            </h2>
            <button onClick={onClose} className="text-white hover:text-gray-200 text-3xl font-bold leading-none">&times;</button>
        </div>
        
        {/* Content */}
        <div className="overflow-y-auto p-6 text-gray-800 text-sm leading-relaxed custom-scroll">
            
            <div className="mb-6">
                <h3 className="text-lg font-bold text-blue-800 border-b-2 border-blue-100 pb-1 mb-3">1. TỔNG QUAN</h3>
                <p>Phần mềm này giúp tự động tạo lịch làm việc cho nhân viên dựa trên cơ chế <strong>luân phiên (rolling)</strong> để đảm bảo tính công bằng. Hệ thống ưu tiên các vị trí đặc biệt (Giao Hàng, Kho, Thu Ngân) trước, sau đó lấp đầy bằng các ca thường theo mẫu (Pattern) của từng bộ phận.</p>
            </div>

            <div className="mb-6">
                <h3 className="text-lg font-bold text-blue-800 border-b-2 border-blue-100 pb-1 mb-3">2. THANH CÔNG CỤ (TOP BAR)</h3>
                <p className="mb-2 italic text-gray-600">Khu vực trên cùng chứa các tính năng quản lý dữ liệu đầu vào và đầu ra.</p>
                
                <h4 className="font-bold text-gray-700 mt-3">A. Nhóm Import (Nhập liệu)</h4>
                <ul className="list-disc pl-5 space-y-2 mb-3">
                    <li>
                        <span className="inline-flex rounded-md shadow-sm align-middle mr-2">
                            <span className="bg-purple-200 text-purple-700 font-bold py-1 px-2.5 rounded-l-md flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                            </span>
                            <span className="bg-purple-200 text-purple-700 font-bold py-1 px-2.5 rounded-r-md border-l border-purple-400">Nhập DS</span>
                        </span>
                        dùng để nhập danh sách nhân viên từ file Excel.
                        <ul className="list-circle pl-5 mt-1 text-gray-600">
                            <li><em>Cấu trúc file:</em> Cột A (Bộ phận), Cột B (Mã NV), Cột C (Họ tên).</li>
                            <li><em>Lưu ý:</em> Sau khi nhập, hệ thống sẽ yêu cầu bạn xác nhận giới tính (Nam/Nữ) cho nhân viên mới để tính toán phân bổ ca Giao Hàng (chỉ Nam làm).</li>
                        </ul>
                    </li>
                    <li>
                        <span className="inline-flex items-center bg-teal-200 text-teal-700 font-bold py-1 px-3 rounded shadow-sm text-sm mr-2">
                             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/></svg>
                             <span className="ml-2">Ca Xoay</span>
                        </span>
                         Cấu hình mẫu ca cho từng bộ phận.
                         <ul className="list-circle pl-5 mt-1 text-gray-600">
                            <li>Ví dụ: BP All In One đi ca <code>123</code>, <code>456</code>. BP Bảo Vệ đi ca <code>12345</code>.</li>
                            <li>Hệ thống sẽ xoay vòng các ca này cho nhân viên theo ngày.</li>
                        </ul>
                    </li>
                </ul>

                <h4 className="font-bold text-gray-700 mt-3">B. Nhóm Lịch Bận (Busy Schedule)</h4>
                <p className="mb-1">Đây là tính năng quan trọng để đảm bảo nhân viên không bị xếp lịch vào ngày họ xin nghỉ hoặc bận việc riêng.</p>
                <ul className="list-disc pl-5 space-y-2 mb-3">
                    <li><strong>File mẫu:</strong> Tải xuống file Excel mẫu. File này liệt kê tên nhân viên và các ngày trong tháng.
                         <ul className="list-circle pl-5 mt-1 text-gray-600">
                            <li>Điền <code>S</code>: Bận sáng (Không xếp ca có số 1, 2, 3).</li>
                            <li>Điền <code>C</code>: Bận chiều (Không xếp ca có số 4, 5, 6).</li>
                            <li>Điền <code>OFF</code>: Xin nghỉ cả ngày.</li>
                        </ul>
                    </li>
                    <li><strong>Nhập:</strong> Tải file Excel đã điền lên hệ thống. Lịch phân ca sẽ tự động tránh các khung giờ này.</li>
                </ul>

                <h4 className="font-bold text-gray-700 mt-3">C. Nhóm Export (Xuất dữ liệu)</h4>
                 <ul className="list-disc pl-5 space-y-1 mb-3">
                    <li><strong>Tuần:</strong> Xuất lịch ra 4 ảnh riêng biệt tương ứng với 4 tuần (thích hợp gửi Zalo).</li>
                    <li><strong>All:</strong> Xuất toàn bộ lịch ra 1 ảnh dài.</li>
                    <li><strong>Excel:</strong> Xuất ra file Excel để chỉnh sửa thủ công nếu cần.</li>
                </ul>

                <h4 className="font-bold text-gray-700 mt-3">D. Lịch Sử & Khôi Phục</h4>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Ghi lại mọi thao tác thay đổi thủ công (đổi ca, cắt ca).</li>
                    <li>Nếu lỡ tay sửa sai, bạn có thể bấm vào đây và chọn <strong>"Khôi phục"</strong> để quay lại trạng thái trước đó.</li>
                </ul>
            </div>

            <div className="mb-6">
                <h3 className="text-lg font-bold text-blue-800 border-b-2 border-blue-100 pb-1 mb-3">3. KHU VỰC CẤU HÌNH & TẠO LỊCH (CONTROLS)</h3>
                <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Tháng/Năm:</strong> Chọn tháng cần xếp lịch. <em>Lưu ý: Thuật toán xoay ca dựa vào tháng, nên tháng 2 sẽ có lịch xoay khác tháng 3 để đảm bảo công bằng.</em></li>
                    <li><strong>Ngày bắt đầu:</strong> Thường là ngày 1.</li>
                    <li><strong>Số ngày xếp:</strong> Thường là 30 hoặc 31 ngày.</li>
                    <li><strong>Bộ phận:</strong> Lọc để xem lịch riêng của từng bộ phận hoặc xem tất cả.</li>
                    <li>
                        <strong className="inline-flex items-center bg-blue-600 text-white font-bold py-1 px-3 rounded-md text-sm shadow-md align-middle">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 20h5v-5M20 4h-5v5" />
                            </svg>
                            Tạo Lịch
                        </strong>: Bấm nút này để chạy thuật toán phân ca. Mỗi khi thay đổi nhân sự hoặc quy tắc, cần bấm lại nút này.
                    </li>
                </ul>
            </div>

            <div className="mb-6">
                <h3 className="text-lg font-bold text-blue-800 border-b-2 border-blue-100 pb-1 mb-3">4. QUẢN LÝ MỤC TIÊU (LEGEND)</h3>
                <p className="mb-2">Nằm ngay dưới tiêu đề, hiển thị các định mức ca đặc biệt.</p>
                <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Các nút Kho / Thu Ngân / GH:</strong>
                        <ul className="list-circle pl-5 mt-1 text-gray-600">
                            <li>Hiển thị số ngày <em>trung bình</em> mà một nhân viên phải làm vị trí đó trong tháng.</li>
                            <li><strong>Bấm vào nút có biểu tượng bút chì ✏️</strong> để thay đổi định mức.</li>
                        </ul>
                    </li>
                    <li><strong>Checkbox "Cân bằng ca ĐB (+1 Nữ, -1 Nam)":</strong>
                        <ul className="list-circle pl-5 mt-1 text-gray-600">
                             <li><em>Tác dụng:</em> Do nhân viên Nam phải làm thêm ca Giao Hàng (GH), nên tổng tải công việc của họ thường cao hơn Nữ.</li>
                             <li><em>Khi bật:</em> Hệ thống sẽ "cộng điểm ảo" cho Nam, khiến thuật toán ưu tiên xếp Nữ vào các vị trí Kho/Thu Ngân nhiều hơn, giúp Nam đỡ vất vả.</li>
                             <li><em>Kết quả:</em> Nữ sẽ làm Kho/TN nhiều hơn Nam khoảng 1-2 ngày/tháng.</li>
                        </ul>
                    </li>
                </ul>
            </div>

            <div className="mb-6">
                <h3 className="text-lg font-bold text-blue-800 border-b-2 border-blue-100 pb-1 mb-3">5. BẢNG THỐNG KÊ NGÀY (DAILY STATS)</h3>
                <p className="mb-2">Bảng màu xám nằm trên lịch chính.</p>
                 <ul className="list-disc pl-5 space-y-1">
                    <li>Hiển thị tổng số nhân viên đang làm việc tại các khung giờ (Ca 1 đến Ca 6).</li>
                    <li><strong>Ô nhập liệu (Yêu cầu):</strong> Bạn có thể điền số lượng nhân viên tối thiểu cần thiết cho từng ca.</li>
                    <li>Nếu số lượng thực tế <strong>THẤP HƠN</strong> yêu cầu {"->"} Số hiện màu cam/đỏ (Cảnh báo thiếu người).</li>
                    <li>Nếu số lượng thực tế <strong>CAO HƠN</strong> yêu cầu {"->"} Số hiện màu đỏ (Cảnh báo thừa người).</li>
                 </ul>
            </div>

            <div className="mb-6">
                <h3 className="text-lg font-bold text-blue-800 border-b-2 border-blue-100 pb-1 mb-3">6. THAO TÁC TRÊN LỊCH (CHỈNH SỬA & ĐỔI CA)</h3>
                <p className="mb-2">Đây là tính năng mạnh mẽ nhất. Bấm vào bất kỳ ô nào trên lịch để mở hộp thoại chỉnh sửa.</p>
                
                <h4 className="font-bold text-gray-700 mt-2">A. Đổi ca thông thường</h4>
                <p className="pl-5 mb-2">Chọn một mã ca khác (VD: từ <code>123</code> sang <code>456</code>) trong danh sách <strong>Chọn Ca Thường</strong>.</p>

                <h4 className="font-bold text-gray-700 mt-2">B. Cho Nghỉ (OFF) & Tìm người thay thế</h4>
                <ul className="list-disc pl-5 space-y-1 mb-2">
                    <li><strong>Nếu là ca thường:</strong> Hệ thống cho nghỉ ngay lập tức.</li>
                    <li><strong>Nếu là ca đặc biệt (VD: Kho):</strong> Hệ thống sẽ báo động: <em>"Nhân viên này đang giữ vị trí quan trọng"</em>. Bấm <strong>Tìm người thay thế</strong>: Hệ thống sẽ quét toàn bộ nhân viên rảnh trong ngày đó, ưu tiên người có số giờ công thấp nhất để đề xuất thay thế.</li>
                </ul>

                <h4 className="font-bold text-gray-700 mt-2">C. Xử lý Bận Đột Xuất (Bận Sáng / Bận Chiều)</h4>
                <ul className="list-disc pl-5 space-y-1 mb-2">
                    <li>Bấm vào ô ca của nhân viên đó {"->"} Bấm nút <strong>Bận Sáng</strong> hoặc <strong>Bận Chiều</strong>.</li>
                    <li>Hệ thống sẽ hiển thị danh sách <strong>Đề Xuất Xử Lý</strong> (Đổi ca thuần túy hoặc Cắt & Đổi).</li>
                </ul>
            </div>

            <div>
                <h3 className="text-lg font-bold text-blue-800 border-b-2 border-blue-100 pb-1 mb-3">7. CÁCH ĐỌC MÀU SẮC TRÊN LỊCH</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <h4 className="font-bold text-gray-700">Màu ô lịch:</h4>
                        <ul className="list-none space-y-1 pl-2">
                            <li className="flex items-center"><span className="w-4 h-4 mr-2 rounded" style={{ backgroundColor: '#fef9c3', border: '1px solid #facc15' }}></span> Giao Hàng (GH)</li>
                            <li className="flex items-center"><span className="w-4 h-4 mr-2 rounded" style={{ backgroundColor: '#dcfce7', border: '1px solid #4ade80' }}></span> Kho</li>
                            <li className="flex items-center"><span className="w-4 h-4 mr-2 rounded" style={{ backgroundColor: '#f3e8ff', border: '1px solid #c084fc' }}></span> Thu Ngân (TN)</li>
                            <li className="flex items-center"><span className="w-4 h-4 mr-2 rounded" style={{ backgroundColor: '#fee2e2', border: '1px solid #fca5a5' }}></span> OFF (Nghỉ)</li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="font-bold text-gray-700">Dấu chấm trạng thái (Góc trên ô):</h4>
                         <ul className="list-none space-y-1 pl-2 text-xs">
                            <li className="flex items-center"><span className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: '#22c55e' }}></span> Sửa trực tiếp (Nhập tay)</li>
                            <li className="flex items-center"><span className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: '#ef4444' }}></span> Chủ động đổi (Người xin nghỉ)</li>
                            <li className="flex items-center"><span className="w-2.5 h-2.5 rounded-full mr-2" style={{ backgroundColor: '#3b82f6' }}></span> Người đổi cùng (Người làm thay)</li>
                        </ul>
                    </div>
                </div>
            </div>

        </div>

        {/* Footer */}
        <div className="bg-gray-100 p-4 border-t border-gray-200 flex justify-end shrink-0">
          <button type="button" onClick={onClose} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded transition shadow-md">
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
  );
};

export default HelpModal;
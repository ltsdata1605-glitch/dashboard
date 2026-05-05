
import React, { useState, useCallback, useMemo } from 'react';
// import { GoogleGenAI, Type } from "@google/genai"; // Removed top-level import
import { DailyRequirements, StaffInitialData } from '../types';

interface AiSuggestPatternModalProps {
  onClose: () => void;
  onApply: (patterns: string[]) => void;
  departmentName: string;
  nams: StaffInitialData[];
  nus: StaffInitialData[];
  dailyRequirements: DailyRequirements;
}

type SpecialShiftRole = 'kho' | 'tn' | 'gh';

const AiSuggestPatternModal: React.FC<AiSuggestPatternModalProps> = ({ onClose, onApply, departmentName, nams, nus, dailyRequirements }) => {
    const initialStaffInDept = useMemo(() => {
        const namCount = nams.filter(n => n.department === departmentName).length;
        const nuCount = nus.filter(n => n.department === departmentName).length;
        return { namCount, nuCount };
    }, [nams, nus, departmentName]);
    
    const [specialShifts, setSpecialShifts] = useState<{ [key in SpecialShiftRole]: { gender: 'Nam' | 'Nu' | 'All', shifts: { code: string; count: number }[] } }>({
        kho: { gender: 'All', shifts: [{ code: '123', count: 2 }, { code: '456', count: 2 }] },
        tn: { gender: 'All', shifts: [{ code: '123', count: 1 }, { code: '456', count: 1 }] },
        gh: { gender: 'Nam', shifts: [{ code: '2345', count: 1 }] },
    });
    
    // Cập nhật mặc định theo yêu cầu: 208 giờ
    const [maxHours, setMaxHours] = useState(208);
    const [numNam, setNumNam] = useState(initialStaffInDept.namCount);
    const [numNu, setNumNu] = useState(initialStaffInDept.nuCount);
    
    // Cập nhật mặc định danh sách ca thường dùng
    const [commonShifts, setCommonShifts] = useState('123, 456, 2345, 23, 45, 1235, 2456');
    const [slotRequirements, setSlotRequirements] = useState(dailyRequirements);

    // State cho bảng quy đổi giờ công
    const [hourConfig, setHourConfig] = useState<{ [key: string]: number }>({ 
        '1': 1, '2': 3, '3': 3, '4': 3, '5': 3, '6': 1 
    });
    
    const [isLoading, setIsLoading] = useState(false);
    const [suggestion, setSuggestion] = useState<string[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    const handleSpecialShiftChange = (role: SpecialShiftRole, index: number, field: 'code' | 'count', value: string) => {
        const updatedRole = { ...specialShifts[role] };
        if (field === 'count') {
            updatedRole.shifts[index].count = parseInt(value, 10) || 1;
        } else {
            updatedRole.shifts[index].code = value;
        }
        setSpecialShifts(prev => ({ ...prev, [role]: updatedRole }));
    };

    const addSpecialShift = (role: SpecialShiftRole) => {
        const updatedRole = { ...specialShifts[role] };
        updatedRole.shifts.push({ code: '', count: 1 });
        setSpecialShifts(prev => ({ ...prev, [role]: updatedRole }));
    };

    const removeSpecialShift = (role: SpecialShiftRole, index: number) => {
        const updatedRole = { ...specialShifts[role] };
        updatedRole.shifts = updatedRole.shifts.filter((_, i) => i !== index);
        setSpecialShifts(prev => ({ ...prev, [role]: updatedRole }));
    };
    
    const moveSuggestionItem = (index: number, direction: 'left' | 'right') => {
        if (!suggestion) return;
        const newSuggestion = [...suggestion];
        const targetIndex = direction === 'left' ? index - 1 : index + 1;
        
        if (targetIndex >= 0 && targetIndex < newSuggestion.length) {
            [newSuggestion[index], newSuggestion[targetIndex]] = [newSuggestion[targetIndex], newSuggestion[index]];
            setSuggestion(newSuggestion);
        }
    };

    // --- Drag and Drop Handlers ---
    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = "move";
        // Ẩn bóng mờ mặc định của trình duyệt một chút để đẹp hơn (tuỳ chọn)
        e.dataTransfer.setData("text/plain", index.toString());
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault(); // Cần thiết để cho phép drop
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === targetIndex || !suggestion) return;

        const newSuggestion = [...suggestion];
        const itemToMove = newSuggestion[draggedIndex];
        
        // Xóa item ở vị trí cũ và chèn vào vị trí mới
        newSuggestion.splice(draggedIndex, 1);
        newSuggestion.splice(targetIndex, 0, itemToMove);

        setSuggestion(newSuggestion);
        setDraggedIndex(null);
    };

    const handleHourConfigChange = (slot: string, value: string) => {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
            setHourConfig(prev => ({ ...prev, [slot]: numValue }));
        }
    };
    
    const handleGenerate = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setSuggestion(null);

        // Tính độ dài pattern lý tưởng: 1/2 tổng nhân sự
        const totalStaff = numNam + numNu;
        const idealPatternLength = Math.ceil(totalStaff / 2);

        // Sử dụng hourConfig từ state thay vì HOURS_CONFIG hằng số
        const prompt = `Bạn là một chuyên gia lập lịch làm việc cho siêu thị. Hãy tạo ra một danh sách "Ca Xoay" (chuỗi các mã ca) tối ưu cho bộ phận "${departmentName}" dựa trên các yêu cầu sau.

**Bối cảnh:**
- Tổng số nhân viên: ${totalStaff} (Nam: ${numNam}, Nữ: ${numNu})
- Giờ công tối đa mỗi nhân viên/tháng: ${maxHours} giờ.
- **Bảng quy đổi giờ công (BẮT BUỘC):** ${JSON.stringify(hourConfig)}
- **Định nghĩa Ca:**
  - Ca Sáng: Bao gồm các ca CHỈ chứa số 1, 2, hoặc 3 (Ví dụ: 123, 12, 23...).
  - Ca Chiều: Bao gồm các ca CHỈ chứa số 4, 5, hoặc 6 (Ví dụ: 456, 45, 56...).
  - Ca Full/Gãy: Bao gồm các ca chứa CẢ số thuộc nhóm sáng (1,2,3) VÀ số thuộc nhóm chiều (4,5,6) (Ví dụ: 2345, 12356, 1256...).
- Các mã ca thường dùng có thể sử dụng: ${commonShifts}
- Số lượng nhân sự tối thiểu cần có mặt tại mỗi khung giờ trong ngày:
  - Ca 1: ${slotRequirements['1']} người
  - Ca 2: ${slotRequirements['2']} người
  - Ca 3: ${slotRequirements['3']} người
  - Ca 4: ${slotRequirements['4']} người
  - Ca 5: ${slotRequirements['5']} người
  - Ca 6: ${slotRequirements['6']} người

**Yêu cầu về ca đặc biệt:**
- **Kho:**
  - Yêu cầu giới tính: ${specialShifts.kho.gender === 'All' ? 'Không yêu cầu' : specialShifts.kho.gender}
  - Ca cần xếp: ${JSON.stringify(specialShifts.kho.shifts.reduce((obj, item) => ({...obj, [item.code]: item.count}), {}))}
- **Thu Ngân:**
  - Yêu cầu giới tính: ${specialShifts.tn.gender === 'All' ? 'Không yêu cầu' : specialShifts.tn.gender}
  - Ca cần xếp: ${JSON.stringify(specialShifts.tn.shifts.reduce((obj, item) => ({...obj, [item.code]: item.count}), {}))}
- **Giao Hàng:**
  - Yêu cầu giới tính: ${specialShifts.gh.gender === 'All' ? 'Không yêu cầu' : specialShifts.gh.gender}
  - Ca cần xếp: ${JSON.stringify(specialShifts.gh.shifts.reduce((obj, item) => ({...obj, [item.code]: item.count}), {}))}

**Mục tiêu quan trọng nhất (phải tuân thủ NGHIÊM NGẶT):**
1.  **TUYỆT ĐỐI KHÔNG SỬ DỤNG MÃ "OFF":** Danh sách ca xoay này KHÔNG được chứa ngày nghỉ (OFF). Ngày nghỉ sẽ được hệ thống tự động chèn sau.
2.  **Độ dài chuỗi ca xoay:** BẮT BUỘC phải bằng chính xác **${idealPatternLength}** ca (bằng 1/2 tổng số nhân viên). Nếu danh sách ca thường dùng không đủ, hãy lặp lại chúng sao cho đủ số lượng.
3.  **Nhịp điệu sắp xếp (RẤT QUAN TRỌNG):** Hãy sắp xếp các ca theo thứ tự lặp lại như sau: 
    **Ca Sáng -> Ca Chiều -> Ca Full/Gãy -> Ca Sáng -> Ca Chiều...**
    Ví dụ mong muốn: 123 -> 45 -> 2345 -> 23 -> 456...
4.  **Logic Giao Hàng (GH):** Trong chuỗi ca xoay PHẢI có đủ các mã ca có thể làm Giao Hàng để đảm bảo mỗi ngày đều có thể phân công ít nhất 1 người Nam làm GH.
5.  **Logic Kho/Thu Ngân:** Phải có đủ các mã ca đặc biệt (Kho, Thu Ngân) trong chuỗi để hệ thống có thể gán vai trò này cho nhân viên mà không cần đổi ca.
6.  **Cân bằng giờ công:** Tổng giờ công trung bình phải đảm bảo không vượt quá Max Hours khi nhân lên 30 ngày.

Hãy trả về kết quả dưới dạng JSON với định dạng sau:
{
  "ca_xoay": ["mã ca 1", "mã ca 2", ...]
}`;

        try {
            const { GoogleGenAI, Type } = await import("@google/genai");
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            ca_xoay: {
                                type: Type.ARRAY,
                                items: { type: Type.STRING },
                                description: "Danh sách các mã ca trong chuỗi ca xoay."
                            }
                        },
                        required: ["ca_xoay"]
                    }
                }
            });
            
            const jsonText = response.text?.trim() || '{}';
            const result = JSON.parse(jsonText);

            if (result.ca_xoay && Array.isArray(result.ca_xoay) && result.ca_xoay.every((i: any) => typeof i === 'string')) {
                setSuggestion(result.ca_xoay);
            } else {
                throw new Error("Định dạng phản hồi của AI không chính xác. Vui lòng thử lại.");
            }

        } catch (e: any) {
            console.error(e);
            setError(`Đã có lỗi xảy ra: ${e.message || 'Không thể tạo gợi ý.'}`);
        } finally {
            setIsLoading(false);
        }
    }, [departmentName, numNam, numNu, maxHours, commonShifts, slotRequirements, specialShifts, hourConfig]);
    
    const renderSpecialShiftConfig = (role: SpecialShiftRole, title: string) => (
        <div className="p-3 bg-white rounded-lg border">
            <h4 className="font-bold text-gray-700 mb-2">{title}</h4>
            <div className="mb-2">
                <label className="text-xs font-medium text-gray-600">Giới tính:</label>
                <select 
                    value={specialShifts[role].gender}
                    onChange={(e) => setSpecialShifts(prev => ({ ...prev, [role]: { ...prev[role], gender: e.target.value as any } }))}
                    className="config-input w-full mt-1 !text-sm !py-1"
                >
                    <option value="All">Không yêu cầu</option>
                    <option value="Nam">Chỉ Nam</option>
                    <option value="Nu">Chỉ Nữ</option>
                </select>
            </div>
            <div className="space-y-2">
                {specialShifts[role].shifts.map((shift, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <input type="text" value={shift.code} onChange={e => handleSpecialShiftChange(role, index, 'code', e.target.value)} placeholder="Mã ca" className="config-input w-1/2 !text-sm !py-1" />
                        <input type="number" value={shift.count} onChange={e => handleSpecialShiftChange(role, index, 'count', e.target.value)} min="1" className="config-input w-1/2 !text-sm !py-1" />
                        <button onClick={() => removeSpecialShift(role, index)} className="text-red-500 hover:text-red-700 p-1">&times;</button>
                    </div>
                ))}
            </div>
            <button onClick={() => addSpecialShift(role)} className="text-xs text-blue-600 hover:underline mt-2">+ Thêm ca</button>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
            <div className="bg-slate-50 p-6 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-800">Gợi Ý Ca Xoay Bằng AI cho <span className="text-violet-600">{departmentName}</span></h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-800 text-3xl">&times;</button>
                </div>

                <div className="flex-grow overflow-y-auto pr-3 -mr-3 custom-scroll">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Column 1: Special Shifts */}
                        <div className="space-y-4">
                            {renderSpecialShiftConfig('kho', 'Kho')}
                            {renderSpecialShiftConfig('tn', 'Thu Ngân')}
                            {renderSpecialShiftConfig('gh', 'Giao Hàng')}
                        </div>
                        {/* Column 2: General Config */}
                        <div className="space-y-4">
                            <div className="p-3 bg-white rounded-lg border">
                                <label className="block text-sm font-bold text-gray-700 mb-1">Giờ công MAX/tháng</label>
                                <input type="number" value={maxHours} onChange={e => setMaxHours(parseInt(e.target.value))} className="config-input w-full" />
                            </div>
                            <div className="p-3 bg-white rounded-lg border">
                                <label className="block text-sm font-bold text-gray-700 mb-1">Số lượng nhân sự Nam/Nữ</label>
                                <div className="flex gap-2">
                                     <input type="number" value={numNam} onChange={e => setNumNam(parseInt(e.target.value))} className="config-input w-1/2" placeholder="Nam" title="Nam" />
                                     <input type="number" value={numNu} onChange={e => setNumNu(parseInt(e.target.value))} className="config-input w-1/2" placeholder="Nữ" title="Nữ" />
                                </div>
                            </div>
                            
                            {/* Bảng Quy Đổi Giờ Công */}
                            <div className="p-3 bg-white rounded-lg border">
                                <h4 className="font-bold text-gray-700 mb-2">Bảng Quy Đổi Giờ Công</h4>
                                <div className="grid grid-cols-3 gap-2">
                                    {['1', '2', '3', '4', '5', '6'].map(slot => (
                                        <div key={slot}>
                                            <label className="text-xs font-medium text-gray-600 block">Ca {slot}</label>
                                            <div className="flex items-center">
                                                <input 
                                                    type="number" 
                                                    value={hourConfig[slot]} 
                                                    onChange={(e) => handleHourConfigChange(slot, e.target.value)}
                                                    className="config-input w-full !py-1 !text-sm"
                                                    step="0.5"
                                                />
                                                <span className="ml-1 text-xs text-gray-500">h</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-3 bg-white rounded-lg border">
                                <label className="block text-sm font-bold text-gray-700 mb-1">Ca thường dùng (cách nhau bởi dấu phẩy)</label>
                                <textarea value={commonShifts} onChange={e => setCommonShifts(e.target.value)} className="config-input w-full" rows={3}></textarea>
                            </div>
                        </div>
                        {/* Column 3: Slot Requirements */}
                        <div className="p-3 bg-white rounded-lg border">
                             <h4 className="font-bold text-gray-700 mb-2">Yêu cầu nhân sự tối thiểu/ca</h4>
                             <div className="grid grid-cols-2 gap-3">
                                {Object.keys(slotRequirements).map(slot => (
                                    <div key={slot}>
                                        <label className="text-sm font-medium text-gray-600">Ca {slot}</label>
                                        <input 
                                            type="number" 
                                            value={slotRequirements[slot as keyof DailyRequirements]}
                                            onChange={e => setSlotRequirements(prev => ({...prev, [slot]: parseInt(e.target.value)}))}
                                            className="config-input w-full mt-1"
                                        />
                                    </div>
                                ))}
                             </div>
                        </div>
                    </div>

                    {(isLoading || error || suggestion) && (
                        <div className="mt-4 p-4 bg-white rounded-lg border">
                            <h3 className="font-bold text-lg text-center mb-2">Kết quả từ AI</h3>
                            {isLoading && <div className="flex justify-center items-center p-4"><div className="spinner !w-8 !h-8 !border-4"></div></div>}
                            {error && <div className="p-3 bg-red-100 text-red-700 rounded text-center">{error}</div>}
                            {suggestion && (
                                <div>
                                    <p className="text-sm text-gray-600 mb-2 text-center">AI đã đề xuất {suggestion.length} ca xoay (kéo thả để sắp xếp):</p>
                                    <div className="flex flex-wrap gap-2 justify-center items-center bg-gray-100 p-4 rounded min-h-[60px]">
                                        {suggestion.map((s, i) => (
                                            <div 
                                                key={i} 
                                                className={`group relative flex items-center transition-all duration-200 ${draggedIndex === i ? 'opacity-50 scale-95' : 'opacity-100'}`}
                                                draggable
                                                onDragStart={(e) => handleDragStart(e, i)}
                                                onDragOver={(e) => handleDragOver(e, i)}
                                                onDrop={(e) => handleDrop(e, i)}
                                            >
                                                 {i > 0 && (
                                                    <button 
                                                        onClick={() => moveSuggestionItem(i, 'left')}
                                                        className="opacity-0 group-hover:opacity-100 absolute -left-2 z-10 text-gray-400 hover:text-blue-600"
                                                        title="Di chuyển sang trái"
                                                    >
                                                        &#9664;
                                                    </button>
                                                )}
                                                <span className="bg-blue-100 text-blue-800 font-mono font-bold px-3 py-1.5 rounded shadow-sm border border-blue-200 cursor-grab active:cursor-grabbing hover:bg-blue-200 transition-colors select-none">
                                                    {s}
                                                </span>
                                                 {i < suggestion.length - 1 && (
                                                    <button 
                                                        onClick={() => moveSuggestionItem(i, 'right')}
                                                        className="opacity-0 group-hover:opacity-100 absolute -right-2 z-10 text-gray-400 hover:text-blue-600"
                                                        title="Di chuyển sang phải"
                                                    >
                                                        &#9654;
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="text-center mt-2 text-xs text-gray-500 italic">Mẹo: Kéo thả các ô màu xanh để thay đổi thứ tự</div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 mt-6 border-t pt-4">
                    <button type="button" onClick={onClose} className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-bold py-2 px-4 rounded transition">Hủy</button>
                    <button type="button" onClick={handleGenerate} disabled={isLoading} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition disabled:bg-gray-400">
                        {isLoading ? 'Đang xử lý...' : 'Tạo Gợi Ý'}
                    </button>
                    <button type="button" onClick={() => suggestion && onApply(suggestion)} disabled={!suggestion || isLoading} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded transition disabled:bg-gray-400">
                        Áp Dụng
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AiSuggestPatternModal;


import React, { useState, useCallback, useMemo } from 'react';
import { DailyRequirements, SchedulingRules, StaffInitialData } from '../types';
import { Modal } from '../../../components/shared/ui/Modal';
import { Button } from '../../../components/shared/ui/Button';
import { getErrorMessage } from '../../../utils/dataUtils';
import { useAuth } from '../../../contexts/AuthContext';
import { HOURS_CONFIG, KHO_TN_MIN_GAP_DAYS, GH_MIN_GAP_DAYS } from '../constants';
import { suggestShiftPattern } from '../services/geminiService';

interface AiSuggestPatternModalProps {
  onClose: () => void;
  onApply: (patterns: string[]) => void;
  departmentName: string;
  nams: StaffInitialData[];
  nus: StaffInitialData[];
  dailyRequirements: DailyRequirements;
  rules: SchedulingRules;
}

type SpecialShiftRole = 'kho' | 'tn' | 'gh';

// Chuyển { "123": 2, "456": 2 } (SchedulingRules.kho/tn/gh) sang dạng danh sách
// { code, count }[] mà UI của modal này dùng để hiển thị/chỉnh sửa.
const rulesToShiftList = (roleRules: { [shiftCode: string]: number }): { code: string; count: number }[] => {
    const entries = Object.entries(roleRules);
    return entries.length > 0 ? entries.map(([code, count]) => ({ code, count })) : [{ code: '', count: 1 }];
};

const AiSuggestPatternModal: React.FC<AiSuggestPatternModalProps> = ({ onClose, onApply, departmentName, nams, nus, dailyRequirements, rules }) => {
    const { functions } = useAuth();
    const initialStaffInDept = useMemo(() => {
        const namCount = nams.filter(n => n.department === departmentName).length;
        const nuCount = nus.filter(n => n.department === departmentName).length;
        return { namCount, nuCount };
    }, [nams, nus, departmentName]);

    // Khởi tạo từ SchedulingRules thật (cấu hình ở "Chỉnh Sửa Quy Tắc") thay vì hard-code,
    // để gợi ý AI không bị lệch pha với cấu hình GH/Kho/TN đang thực sự áp dụng cho thuật
    // toán phân ca. Người dùng vẫn có thể chỉnh sửa tự do trong modal như trước.
    const [specialShifts, setSpecialShifts] = useState<{ [key in SpecialShiftRole]: { gender: 'Nam' | 'Nu' | 'All', shifts: { code: string; count: number }[] } }>({
        kho: { gender: rules.khoGender, shifts: rulesToShiftList(rules.kho) },
        tn: { gender: rules.tnGender, shifts: rulesToShiftList(rules.tn) },
        gh: { gender: rules.ghGender, shifts: rulesToShiftList(rules.gh) },
    });

    // Cập nhật mặc định theo yêu cầu: 208 giờ
    const [maxHours, setMaxHours] = useState(208);
    const [numNam, setNumNam] = useState(initialStaffInDept.namCount);
    const [numNu, setNumNu] = useState(initialStaffInDept.nuCount);

    // Cập nhật mặc định danh sách ca thường dùng
    const [commonShifts, setCommonShifts] = useState('123, 456, 2345, 23, 45, 1235, 2456');
    const [slotRequirements, setSlotRequirements] = useState(dailyRequirements);

    // State cho bảng quy đổi giờ công
    const [hourConfig, setHourConfig] = useState<{ [key: string]: number }>({ ...HOURS_CONFIG });

    const [isLoading, setIsLoading] = useState(false);
    const [suggestion, setSuggestion] = useState<string[] | null>(null);
    const [feasibilityWarnings, setFeasibilityWarnings] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    // Ước lượng nhanh xem mẫu ca AI trả về có đủ "nguyên liệu" (số lượng nhân sự, độ phủ ca)
    // để thuật toán phân ca thật (scheduleService.ts/scheduleUtils.ts) đáp ứng các ràng buộc
    // công bằng hiện có hay không — CHỈ là ước lượng tham khảo dựa trên toán học đơn giản
    // (giả định xoay vòng đều), không mô phỏng chính xác từng ngày. Từ khi có bước "luôn đảm
    // bảo có người" trong scheduleService.ts, ca sẽ không còn bị bỏ trống, nhưng nếu thiếu
    // nhân sự so với ước lượng ở đây, hệ thống có thể phải phá vỡ giãn cách công bằng để bù.
    const checkFeasibility = useCallback((pattern: string[]): string[] => {
        const warnings: string[] = [];
        const totalStaff = numNam + numNu;
        if (totalStaff === 0 || pattern.length === 0) return warnings;

        // 1. Độ dài mẫu ca có đúng 1/2 tổng nhân sự như yêu cầu không
        const idealLength = Math.ceil(totalStaff / 2);
        if (pattern.length !== idealLength) {
            warnings.push(`Độ dài mẫu ca (${pattern.length}) khác 1/2 tổng nhân sự lý tưởng (${idealLength}) — vòng xoay có thể không đều.`);
        }

        // 2. Yêu cầu nhân sự tối thiểu/ca (theo tỉ lệ mã ca xuất hiện trong mẫu)
        const slotCounts: { [key: string]: number } = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0, '6': 0 };
        pattern.forEach(code => {
            for (const ch of code) {
                if (slotCounts[ch] !== undefined) slotCounts[ch]++;
            }
        });
        (['1', '2', '3', '4', '5', '6'] as const).forEach(slot => {
            const required = slotRequirements[slot] || 0;
            if (required <= 0) return;
            const avgCount = Math.round((slotCounts[slot] / pattern.length) * totalStaff);
            if (avgCount < required) {
                warnings.push(`Ca ${slot}: mẫu ca cho trung bình ~${avgCount} người/ngày, thấp hơn yêu cầu tối thiểu ${required} người.`);
            }
        });

        // 3. Giao Hàng: đủ Nam để giãn cách GH_MIN_GAP_DAYS ngày/lần (giả định xoay vòng đều)
        const ghPerDay = specialShifts.gh.shifts.reduce((sum, s) => sum + (s.count || 0), 0);
        if (ghPerDay > 0) {
            const ghPool = specialShifts.gh.gender === 'Nu' ? numNu : specialShifts.gh.gender === 'Nam' ? numNam : totalStaff;
            const neededForGap = ghPerDay * (GH_MIN_GAP_DAYS + 1);
            if (ghPool < neededForGap) {
                warnings.push(`Giao Hàng: cần tối thiểu ~${neededForGap} người phù hợp (hiện có ${ghPool}) để giãn cách ${GH_MIN_GAP_DAYS} ngày/lần cho mỗi người — nếu thiếu, hệ thống vẫn đảm bảo luôn có người làm GH nhưng có thể phải rút ngắn giãn cách.`);
            }
        }

        // 4. Kho: đủ người (theo giới tính áp dụng) để giãn cách 2 ngày/lần VÀ không quá 1 lần
        // trong khối Thứ 6-7-CN (ước lượng riêng theo từng giới vì Kho cân bằng Nam-Nam, Nữ-Nữ)
        const khoPerDay = specialShifts.kho.shifts.reduce((sum, s) => sum + (s.count || 0), 0);
        if (khoPerDay > 0) {
            const checkKhoPool = (poolSize: number, share: number, label: string) => {
                if (share <= 0) return;
                const needed = Math.max(share * (KHO_TN_MIN_GAP_DAYS + 1), share * 3);
                if (poolSize < needed) {
                    warnings.push(`Kho (${label}): cần tối thiểu ~${needed} người (hiện có ${poolSize}) để đáp ứng giãn cách ${KHO_TN_MIN_GAP_DAYS} ngày/lần và không quá 1 lần trong khối Thứ 6-7-CN.`);
                }
            };
            if (specialShifts.kho.gender === 'All') {
                checkKhoPool(numNam, Math.ceil(khoPerDay / 2), 'Nam');
                checkKhoPool(numNu, Math.ceil(khoPerDay / 2), 'Nữ');
            } else if (specialShifts.kho.gender === 'Nam') {
                checkKhoPool(numNam, khoPerDay, 'Nam');
            } else {
                checkKhoPool(numNu, khoPerDay, 'Nữ');
            }
        }

        // 5. Thu Ngân: đủ người để giãn cách 2 ngày/lần
        const tnPerDay = specialShifts.tn.shifts.reduce((sum, s) => sum + (s.count || 0), 0);
        if (tnPerDay > 0) {
            const tnPool = specialShifts.tn.gender === 'Nu' ? numNu : specialShifts.tn.gender === 'Nam' ? numNam : totalStaff;
            const needed = tnPerDay * (KHO_TN_MIN_GAP_DAYS + 1);
            if (tnPool < needed) {
                warnings.push(`Thu Ngân: cần tối thiểu ~${needed} người (hiện có ${tnPool}) để giãn cách ${KHO_TN_MIN_GAP_DAYS} ngày/lần.`);
            }
        }

        return warnings;
    }, [numNam, numNu, specialShifts, slotRequirements]);

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
        setFeasibilityWarnings([]);

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
            const caXoay = await suggestShiftPattern(functions, prompt);
            setSuggestion(caXoay);
            setFeasibilityWarnings(checkFeasibility(caXoay));
        } catch (e: unknown) {
            console.error(e);
            setError(`Đã có lỗi xảy ra: ${getErrorMessage(e) || 'Không thể tạo gợi ý.'}`);
        } finally {
            setIsLoading(false);
        }
    }, [functions, departmentName, numNam, numNu, maxHours, commonShifts, slotRequirements, specialShifts, hourConfig, checkFeasibility]);

    const renderSpecialShiftConfig = (role: SpecialShiftRole, title: string) => (
        <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
            <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-2">{title}</h4>
            <div className="mb-2">
                <label className="text-xs font-medium text-slate-600 dark:text-slate-400">Giới tính:</label>
                <select
                    value={specialShifts[role].gender}
                    onChange={(e) => setSpecialShifts(prev => ({ ...prev, [role]: { ...prev[role], gender: e.target.value as 'Nam' | 'Nu' | 'All' } }))}
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
                        <Button variant="ghost" onClick={() => removeSpecialShift(role, index)} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit text-rose-500 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 p-1">&times;</Button>
                    </div>
                ))}
            </div>
            <Button variant="ghost" onClick={() => addSpecialShift(role)} className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit text-xs text-sky-600 dark:text-sky-400 hover:underline mt-2">+ Thêm ca</Button>
        </div>
    );

    return (
        <Modal
            isOpen
            onClose={onClose}
            zIndex="z-[70]"
            maxWidth="4xl"
            title={<>Gợi Ý Ca Xoay Bằng AI cho <span className="text-sky-600 dark:text-sky-400">{departmentName}</span></>}
            footer={
                <div className="flex justify-end gap-3">
                    <Button variant="secondary" onClick={onClose}>Hủy</Button>
                    <Button onClick={handleGenerate} isLoading={isLoading}>Tạo Gợi Ý</Button>
                    <Button
                        onClick={() => suggestion && onApply(suggestion)}
                        disabled={!suggestion || isLoading}
                        className="bg-emerald-600 hover:bg-emerald-700"
                    >
                        Áp Dụng
                    </Button>
                </div>
            }
        >
            <div className="-m-5 p-5 bg-slate-50 dark:bg-slate-900/40">
                <p className="text-xs text-slate-500 dark:text-slate-400 italic mb-3">
                    AI chỉ tạo <strong>mẫu ca xoay</strong> (chuỗi mã ca) — sau khi bấm "Áp Dụng" và "Lưu Thay Đổi", việc gán cụ thể ai làm Giao Hàng/Kho/Thu Ngân ngày nào vẫn do thuật toán phân ca tự động xử lý khi tạo lại lịch, không phải AI.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Column 1: Special Shifts */}
                    <div className="space-y-4">
                        {renderSpecialShiftConfig('kho', 'Kho')}
                        {renderSpecialShiftConfig('tn', 'Thu Ngân')}
                        {renderSpecialShiftConfig('gh', 'Giao Hàng')}
                    </div>
                    {/* Column 2: General Config */}
                    <div className="space-y-4">
                        <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Giờ công MAX/tháng</label>
                            <input type="number" value={maxHours} onChange={e => setMaxHours(parseInt(e.target.value))} className="config-input w-full" />
                        </div>
                        <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Số lượng nhân sự Nam/Nữ</label>
                            <div className="flex gap-2">
                                 <input type="number" value={numNam} onChange={e => setNumNam(parseInt(e.target.value))} className="config-input w-1/2" placeholder="Nam" title="Nam" />
                                 <input type="number" value={numNu} onChange={e => setNumNu(parseInt(e.target.value))} className="config-input w-1/2" placeholder="Nữ" title="Nữ" />
                            </div>
                        </div>

                        {/* Bảng Quy Đổi Giờ Công */}
                        <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                            <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-2">Bảng Quy Đổi Giờ Công</h4>
                            <div className="grid grid-cols-3 gap-2">
                                {['1', '2', '3', '4', '5', '6'].map(slot => (
                                    <div key={slot}>
                                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block">Ca {slot}</label>
                                        <div className="flex items-center">
                                            <input
                                                type="number"
                                                value={hourConfig[slot]}
                                                onChange={(e) => handleHourConfigChange(slot, e.target.value)}
                                                className="config-input w-full !py-1 !text-sm"
                                                step="0.5"
                                            />
                                            <span className="ml-1 text-xs text-slate-500 dark:text-slate-400">h</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">Ca thường dùng (cách nhau bởi dấu phẩy)</label>
                            <textarea value={commonShifts} onChange={e => setCommonShifts(e.target.value)} className="config-input w-full" rows={3}></textarea>
                        </div>
                    </div>
                    {/* Column 3: Slot Requirements */}
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                         <h4 className="font-bold text-slate-700 dark:text-slate-300 mb-2">Yêu cầu nhân sự tối thiểu/ca</h4>
                         <div className="grid grid-cols-2 gap-3">
                            {Object.keys(slotRequirements).map(slot => (
                                <div key={slot}>
                                    <label className="text-sm font-medium text-slate-600 dark:text-slate-400">Ca {slot}</label>
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
                    <div className="mt-4 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                        <h3 className="font-bold text-lg text-center mb-2 text-slate-800 dark:text-slate-200">Kết quả từ AI</h3>
                        {isLoading && <div className="flex justify-center items-center p-4"><div className="spinner !w-8 !h-8 !border-4"></div></div>}
                        {error && <div className="p-3 bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 rounded text-center">{error}</div>}
                        {suggestion && (
                            <div>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2 text-center">AI đã đề xuất {suggestion.length} ca xoay (kéo thả để sắp xếp):</p>
                                <div className="flex flex-wrap gap-2 justify-center items-center bg-slate-100 dark:bg-slate-900/60 p-4 rounded min-h-[60px]">
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
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => moveSuggestionItem(i, 'left')}
                                                    className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit opacity-100 lg:opacity-0 lg:group-hover:opacity-100 absolute -left-2 z-10 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400"
                                                    title="Di chuyển sang trái"
                                                >
                                                    &#9664;
                                                </Button>
                                            )}
                                            <span className="bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300 font-mono font-bold px-3 py-1.5 rounded shadow-sm border border-sky-200 dark:border-sky-800 cursor-grab active:cursor-grabbing hover:bg-sky-200 dark:hover:bg-sky-900/60 transition-colors select-none">
                                                {s}
                                            </span>
                                             {i < suggestion.length - 1 && (
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => moveSuggestionItem(i, 'right')}
                                                    className="bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit opacity-100 lg:opacity-0 lg:group-hover:opacity-100 absolute -right-2 z-10 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400"
                                                    title="Di chuyển sang phải"
                                                >
                                                    &#9654;
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <div className="text-center mt-2 text-xs text-slate-500 dark:text-slate-400 italic">Mẹo: Kéo thả các ô màu xanh để thay đổi thứ tự</div>

                                {feasibilityWarnings.length > 0 ? (
                                    <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                                        <h4 className="text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1.5">
                                            Cảnh báo khả thi (ước lượng)
                                        </h4>
                                        <ul className="list-disc list-inside space-y-1 text-xs text-amber-800 dark:text-amber-300">
                                            {feasibilityWarnings.map((w, i) => <li key={i}>{w}</li>)}
                                        </ul>
                                    </div>
                                ) : (
                                    <div className="mt-3 p-2 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg text-center text-xs font-bold text-emerald-700 dark:text-emerald-400">
                                        Đủ điều kiện theo ước lượng nhân sự/ca hiện tại.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default AiSuggestPatternModal;

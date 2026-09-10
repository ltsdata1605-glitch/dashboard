
import React from 'react';
import { Button } from '../../../../components/shared/ui/Button';

export const Switch: React.FC<{ checked: boolean; onChange: () => void; id?: string }> = ({ checked, onChange, id }) => (
    <Button
      variant="unstyled" size="none"
      type="button"
      role="switch"
      aria-checked={checked}
      id={id}
      // Chặn nổi bọt: ở Bộ lọc bảng Thi đua, Switch nằm TRONG một <div onClick> bật/tắt cả dòng —
      // để sự kiện nổi lên thì 1 cú bấm chạy onChange rồi chạy tiếp handler của dòng, đảo trạng
      // thái 2 lần và trông như nút không phản ứng. Các nơi khác đặt nhãn là phần tử anh em nên
      // không phụ thuộc việc nổi bọt này.
      onClick={(e) => { e.stopPropagation(); onChange(); }}
      className={`justify-start ${
        checked ? 'bg-sky-500 shadow-inner' : 'bg-slate-300 dark:bg-slate-600'
      } relative inline-flex h-4 w-7 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none`}
    >
      <span
        aria-hidden="true"
        className={`${
          checked ? 'translate-x-3' : 'translate-x-0'
        } pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
      />
    </Button>
  );

export const ProgressBar: React.FC<{ value: number; customColorClass?: string }> = ({ value, customColorClass }) => {
    const percentage = Math.min(Math.max(value, 0), 200);
    const displayPercentage = Math.min(percentage, 100);

    let colorClass = customColorClass;
    if (!colorClass) {
        colorClass = 'bg-sky-500';
        if (value >= 100) colorClass = 'bg-emerald-500';
        else if (value < 100) colorClass = 'bg-amber-500';
        if (value < 50) colorClass = 'bg-rose-500';
    }

    return (
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 my-1 relative overflow-hidden">
            <div
                className={`${colorClass} h-full rounded-full transition-all duration-500 ease-out`}
                style={{ width: `${displayPercentage}%` }}
            ></div>
             {percentage > 100 && (
                <div
                    className="absolute top-0 left-0 h-full bg-emerald-300 rounded-full"
                    style={{ width: `${Math.min(percentage - 100, 100)}%` }}
                ></div>
             )}
        </div>
    );
};

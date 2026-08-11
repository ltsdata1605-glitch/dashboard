
import React from 'react';
import { Button } from '../../../../components/shared/ui/Button';

export const Switch: React.FC<{ checked: boolean; onChange: () => void; id?: string }> = ({ checked, onChange, id }) => (
    <Button
      variant="ghost"
      type="button"
      role="switch"
      aria-checked={checked}
      id={id}
      onClick={onChange}
      className={`bg-transparent hover:bg-transparent border-0 rounded-none h-auto w-auto p-0 text-inherit justify-start ${
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

export const ProgressBar: React.FC<{ value: number }> = ({ value }) => {
    const percentage = Math.min(Math.max(value, 0), 200);
    const displayPercentage = Math.min(percentage, 100);

    let colorClass = 'bg-indigo-500';
    if (value >= 100) colorClass = 'bg-emerald-500';
    else if (value < 85) colorClass = 'bg-amber-500';
    if (value < 50) colorClass = 'bg-rose-500';

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

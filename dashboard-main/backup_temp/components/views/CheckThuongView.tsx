
import React from 'react';

export default function CheckThuongView() {
    return (
        <div className="w-full h-full flex flex-col bg-white dark:bg-slate-900">
            <div className="flex-grow relative">
                <iframe 
                    src="https://checkthuong-487587635482.us-west1.run.app" 
                    className="absolute inset-0 w-full h-full border-none"
                    title="Check Thưởng"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                />
            </div>
        </div>
    );
}

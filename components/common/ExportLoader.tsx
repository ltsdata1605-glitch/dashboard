
import React from 'react';
import { Overlay } from '../shared/ui/Overlay';

const ExportLoader: React.FC = () => {
    return (
        <Overlay kind="busy" id="export-loading-overlay" className="bg-black/60 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center text-white">
            <div className="pong-loader">
                <div className="pong-ball"></div>
                <div className="pong-paddle left"></div>
                <div className="pong-paddle right"></div>
            </div>
            <p className="mt-8 text-lg font-semibold">Đang xử lý ảnh, vui lòng chờ...</p>
        </Overlay>
    );
};

export default ExportLoader;

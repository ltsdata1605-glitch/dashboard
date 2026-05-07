import React, { useState, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import { ModernLayoutPositions, defaultModernPositions } from './services/printService';
import { XIcon, SaveIcon, RotateCcwIcon } from './Icons';

interface ModernLayoutEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    positions: ModernLayoutPositions;
    onSave: (positions: ModernLayoutPositions) => void;
}

const ModernLayoutEditorModal: React.FC<ModernLayoutEditorModalProps> = ({ isOpen, onClose, positions, onSave }) => {
    const [currentPositions, setCurrentPositions] = useState<ModernLayoutPositions>(positions || defaultModernPositions);

    useEffect(() => {
        if (isOpen) {
            setCurrentPositions(positions || defaultModernPositions);
        }
    }, [isOpen, positions]);

    if (!isOpen) return null;

    const handleDragStop = (key: keyof ModernLayoutPositions, d: { x: number, y: number }) => {
        setCurrentPositions(prev => ({
            ...prev,
            [key]: { ...prev[key], x: d.x, y: d.y }
        }));
    };

    const handleResizeStop = (key: keyof ModernLayoutPositions, ref: HTMLElement, position: { x: number, y: number }) => {
        setCurrentPositions(prev => ({
            ...prev,
            [key]: {
                ...prev[key],
                x: position.x,
                y: position.y,
                w: parseInt(ref.style.width, 10),
                h: parseInt(ref.style.height, 10)
            }
        }));
    };

    const handleReset = () => {
        setCurrentPositions(defaultModernPositions);
    };

    const handleSave = () => {
        onSave(currentPositions);
        onClose();
    };

    // Scale down the editor to fit in the modal
    const scale = 0.8;
    const editorWidth = 800 * scale;
    const editorHeight = 540 * scale;

    const renderRnd = (
        key: keyof ModernLayoutPositions,
        label: string,
        content: React.ReactNode,
        style?: React.CSSProperties
    ) => {
        const pos = currentPositions[key];
        return (
            <Rnd
                size={{ width: pos.w, height: pos.h }}
                position={{ x: pos.x, y: pos.y }}
                onDragStop={(e, d) => handleDragStop(key, d)}
                onResizeStop={(e, direction, ref, delta, position) => handleResizeStop(key, ref, position)}
                bounds="parent"
                className="group border border-dashed border-transparent hover:border-indigo-500 hover:bg-indigo-50/30 transition-colors cursor-move"
                style={{ ...style, zIndex: 10 }}
            >
                <div className="absolute -top-6 left-0 bg-indigo-500 text-white text-[10px] px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {label}
                </div>
                {content}
            </Rnd>
        );
    };

    return (
        <div className="fixed inset-0 z-[60] bg-slate-900/30 flex items-center justify-center p-4 backdrop-blur-md">
            <div className="bg-white rounded-2xl shadow-2xl flex flex-col max-w-5xl w-full max-h-[95vh] overflow-hidden">
                <div className="flex justify-between items-center p-4 border-b border-slate-200">
                    <h2 className="text-xl font-bold text-slate-900">Chỉnh sửa bố cục Kiểu hiện đại</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-slate-500 hover:bg-slate-200 transition-colors">
                        <XIcon className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-4 bg-slate-100 flex-grow overflow-auto flex items-center justify-center">
                    <div 
                        className="relative bg-white shadow-lg overflow-hidden"
                        style={{ 
                            width: 800, 
                            height: 540,
                            transform: `scale(${scale})`,
                            transformOrigin: 'center center',
                            border: '4px solid black'
                        }}
                    >
                        <div className="absolute inset-0 border-t-[10px] border-l-[10px] border-r-[10px] border-b-[15px] border-black pointer-events-none z-20"></div>
                        
                        {/* Static Banner */}
                        <div className="absolute top-[45px] left-[-75px] w-[300px] py-3 bg-black text-white text-center transform -rotate-45 font-black text-[2.5rem] uppercase tracking-wide z-10 pointer-events-none">
                            GIẢM 42%
                        </div>

                        {renderRnd('productName', 'Tên sản phẩm', (
                            <div className="w-full h-full flex items-start justify-end overflow-hidden">
                                <h1 className="text-4xl font-bold leading-tight uppercase line-clamp-2 text-right m-0">
                                    TÊN SẢN PHẨM MẪU
                                </h1>
                            </div>
                        ))}

                        {renderRnd('qrCode', 'QR Code & NV', (
                            <div className="w-full h-full flex flex-col items-center justify-start gap-2">
                                <div className="w-20 h-20 bg-slate-200 border border-slate-300 flex items-center justify-center text-xs text-slate-500">
                                    QR
                                </div>
                                <div className="text-[8px] uppercase text-center leading-none">
                                    <p className="m-0 mb-0.5">NV - 100</p>
                                    <p className="m-0">12:00 01/01</p>
                                </div>
                            </div>
                        ))}

                        {renderRnd('originalPrice', 'Giá gốc', (
                            <div className="w-full h-full flex items-center">
                                <div className="text-5xl font-bold text-gray-400 line-through decoration-gray-400 decoration-4">
                                    1.000.000đ
                                </div>
                            </div>
                        ))}

                        {renderRnd('savingsBox', 'Tiết kiệm', (
                            <div className="w-full h-full flex items-center">
                                <div className="bg-black text-white px-2 py-1 rounded flex items-center justify-center gap-2">
                                    <div className="flex flex-col text-xl leading-none font-bold items-center justify-center">
                                        <span>TIẾT</span>
                                        <span>KIỆM</span>
                                    </div>
                                    <span className="text-5xl font-bold uppercase">100K</span>
                                </div>
                            </div>
                        ))}

                        {renderRnd('finalPrice', 'Giá bán', (
                            <div className="w-full h-full flex items-baseline">
                                <span className="text-[13rem] font-black leading-none tracking-tighter">900</span>
                                <span className="text-6xl font-black ml-1">.000đ</span>
                            </div>
                        ))}

                        {renderRnd('footer', 'Khuyến mãi (Footer)', (
                            <div className="w-full h-full border-t-2 border-black flex flex-col items-center justify-center px-6 box-border">
                                <p className="text-5xl font-bold text-center uppercase leading-tight w-full m-0">
                                    SẢN PHẨM BÁN CHẠY
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="p-4 border-t border-slate-200 flex justify-between items-center bg-white">
                    <button 
                        onClick={handleReset}
                        className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                    >
                        <RotateCcwIcon className="w-4 h-4" />
                        Khôi phục mặc định
                    </button>
                    <div className="flex gap-3">
                        <button 
                            onClick={onClose}
                            className="px-6 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors font-medium"
                        >
                            Hủy
                        </button>
                        <button 
                            onClick={handleSave}
                            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-colors font-medium shadow-sm"
                        >
                            <SaveIcon className="w-4 h-4" />
                            Lưu bố cục
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ModernLayoutEditorModal;

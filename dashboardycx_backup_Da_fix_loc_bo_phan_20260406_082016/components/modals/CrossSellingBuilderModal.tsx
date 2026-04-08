import React, { useState, useEffect, useMemo } from 'react';
import { useDashboardContext } from '../../contexts/DashboardContext';
import ModalWrapper from './ModalWrapper';
import { Icon } from '../common/Icon';
import MultiSelectDropdown from '../common/MultiSelectDropdown';
import { CrossSellingConfig, CrossSellingDynamicSection, CrossSellingDynamicRow, CrossSellingDynamicColumn, CrossSellingColumnType } from '../../types';

interface CrossSellingBuilderModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

const INITIAL_CONFIG: CrossSellingConfig = {
    columns: [],
    sections: []
};

export const SAMPLE_CONFIG: CrossSellingConfig = {
    columns: [
        { id: "c_target", name: "TỈ LỆ T.B VÙNG", type: "target" },
        { id: "c_ms", name: "SỐ LƯỢNG MẪU SỐ", type: "data", dataType: "quantity", subgroupsNhomCha: ["164 - Điện Thoại", "164 - Điện Tử", "164 - Máy tính bảng", "164 - Laptop", "164 - Điện lạnh", "164 - Điện gia dụng"] },
        { id: "c_kt", name: "SL BÁN KÈM", type: "data", dataType: "quantity", subgroupsNhomCha: [], subgroupsNhomCon: [] },
        { id: "c_ratio", name: "TỈ LỆ SIÊU THỊ", type: "ratio", numeratorColId: "c_kt", denominatorColId: "c_ms", compareWithTarget: true },
        { id: "c_dtqd", name: "D.THU QUY ĐỔI", type: "data", dataType: "revenueQD", subgroupsNhomCha: ["164 - Phụ Kiện", "164 - Đồ gia dụng", "164 - Đồng Hồ", "164 - Dịch Vụ Mở Rộng", "164 - VAS"] }
    ],
    sections: [
        {
            id: "s_ict",
            header: "ICT : Điện Thoại + Tablet + Laptop",
            rows: [
                { id: "r1", name: "PSDP", targetValue: 39.9, subgroupsNhomCon: ["4363 - Cáp Sạc Phụ Kiện"] },
                { id: "r2", name: "Camera", targetValue: 25.6, subgroupsNhomCon: ["4383 - Camera IT"] },
                { id: "r3", name: "Tai Nghe", targetValue: 20.9, subgroupsNhomCon: ["4367 - Tai Nghe"] },
                { id: "r4", name: "Cáp Sạc", targetValue: 56.0, subgroupsNhomCon: ["4363 - Cáp sạc"] },
                { id: "r5", name: "Loa Di Động", targetValue: 2.9, subgroupsNhomCon: ["4366 - Loa Di Động"] },
                { id: "r6", name: "Sim", targetValue: 27.0, subgroupsNhomCon: ["4471 - Sim cước"] },
                { id: "r7", name: "Ứng dụng - VAS", targetValue: 36.4, subgroupsNhomCon: ["4506 - Thu Hộ Trả Góp"] },
                { id: "r8", name: "Đồng Hồ", targetValue: 20.1, subgroupsNhomCon: ["4371 - Đồng hồ thông minh", "4376 - Đồng hồ thời trang"] }
            ]
        },
        {
            id: "s_ce",
            header: "C.E : Điện Tử + Điện Lạnh",
            rows: [
                { id: "r9", name: "Máy Lọc Nước", targetValue: 12.3, subgroupsNhomCon: ["4429 - Máy lọc nước"] },
                { id: "r10", name: "Nồi Cơm", targetValue: 36.4, subgroupsNhomCon: ["4428 - Nồi cơm"] },
                { id: "r11", name: "Nồi Chiên", targetValue: 8.8, subgroupsNhomCon: ["4428 - Nồi chiên"] },
                { id: "r12", name: "Bếp Gas", targetValue: 15.8, subgroupsNhomCon: ["4426 - Bếp Gas"] },
                { id: "r13", name: "Bếp Điện", targetValue: 14.3, subgroupsNhomCon: ["4426 - Bếp Điện", "4426 - Bếp Hồng Ngoại", "4426 - Bếp Từ"] },
                { id: "r14", name: "Quạt Điều Hòa", targetValue: 8.0, subgroupsNhomCon: ["4427 - Quạt Điều Hòa"] },
                { id: "r15", name: "Quạt Gió", targetValue: 23.3, subgroupsNhomCon: ["4427 - Quạt", "4427 - Quạt sạc"] }
            ]
        },
        {
            id: "s_bh",
            header: "Bảo Hiểm",
            rows: [
                { id: "r16", name: "Bảo Hiểm", targetValue: 4.5, subgroupsNhomCon: ["4479 - Dịch Vụ Bảo Hiểm", "4499 - Thu Hộ Phí Bảo Hiểm"] }
            ]
        }
    ]
};

const CrossSellingBuilderModal: React.FC<CrossSellingBuilderModalProps> = ({ isOpen, onClose }) => {
    const { crossSellingConfig, updateCrossSellingConfig, productConfig, uniqueFilterOptions } = useDashboardContext();
    const [config, setConfig] = useState<CrossSellingConfig>(INITIAL_CONFIG);

    const nganhHangOptions = useMemo(() => {
        if (!productConfig?.subgroups) return [];
        return Object.keys(productConfig.subgroups).filter(Boolean).sort();
    }, [productConfig]);

    const nhomHangOptions = useMemo(() => {
        if (!productConfig?.subgroups) return [];
        const opts = new Set<string>();
        Object.values(productConfig.subgroups).forEach(nhomObj => {
            Object.keys(nhomObj).forEach(nhom => {
                if (nhom && nhom.trim() !== '') opts.add(nhom);
            });
        });
        return Array.from(opts).sort();
    }, [productConfig]);

    useEffect(() => {
        if (isOpen) {
            // Migration legacy guard
            if (crossSellingConfig && Array.isArray(crossSellingConfig.columns) && crossSellingConfig.columns.length > 0 && typeof crossSellingConfig.columns[0] === 'string') {
                console.warn("Legacy Config detected! Wiping out old configuration.");
                setConfig(SAMPLE_CONFIG);
            } else if (crossSellingConfig && (crossSellingConfig.columns.length > 0 || crossSellingConfig.sections.length > 0)) {
                setConfig(crossSellingConfig);
            } else {
                setConfig(SAMPLE_CONFIG); // Automatically pour data for first time use
            }
        }
    }, [isOpen, crossSellingConfig]);

    const handleSave = () => {
        updateCrossSellingConfig(config);
        onClose();
    };

    const loadSampleConfig = () => {
        if (window.confirm("Thao tác này sẽ ghi đè toàn bộ cấu hình hiện tại bằng Cấu hình mẫu (y hệt hình ảnh mẫu). Bạn có chắc chắn không?")) {
            setConfig(SAMPLE_CONFIG);
        }
    };

    // --- Column Actions ---
    const addColumn = (type: CrossSellingColumnType) => {
        setConfig(prev => ({
            ...prev,
            columns: [
                ...prev.columns,
                { id: generateId(), name: type === 'target' ? 'Cột Mục Tiêu Mới' : type === 'data' ? 'Cột Dữ Liệu Mới' : 'Cột Tỉ Lệ Mới', type, dataType: type === 'data' ? 'quantity' : undefined }
            ]
        }));
    };

    const updateColumn = (colId: string, field: keyof CrossSellingDynamicColumn, value: any) => {
        setConfig(prev => ({
            ...prev,
            columns: prev.columns.map(c => c.id === colId ? { ...c, [field]: value } : c)
        }));
    };

    const removeColumn = (colId: string) => {
        setConfig(prev => ({
            ...prev,
            columns: prev.columns.filter(c => c.id !== colId)
        }));
    };

    // --- Section & Row Actions ---
    const addSection = () => {
        setConfig(prev => ({
            ...prev,
            sections: [
                ...prev.sections,
                { id: generateId(), header: 'Nhóm Mới', rows: [] }
            ]
        }));
    };

    const updateSectionHeader = (secId: string, val: string) => {
        setConfig(prev => ({
            ...prev,
            sections: prev.sections.map(s => s.id === secId ? { ...s, header: val } : s)
        }));
    };

    const removeSection = (secId: string) => {
        setConfig(prev => ({
            ...prev,
            sections: prev.sections.filter(s => s.id !== secId)
        }));
    };

    const addRow = (secId: string) => {
        setConfig(prev => ({
            ...prev,
            sections: prev.sections.map(s => {
                if (s.id === secId) {
                    return {
                        ...s,
                        rows: [...s.rows, { id: generateId(), name: 'Dòng Mới' }]
                    };
                }
                return s;
            })
        }));
    };

    const updateRow = (secId: string, rowId: string, field: keyof CrossSellingDynamicRow, value: any) => {
        setConfig(prev => ({
            ...prev,
            sections: prev.sections.map(s => {
                if (s.id === secId) {
                    return {
                        ...s,
                        rows: s.rows.map(r => r.id === rowId ? { ...r, [field]: value } : r)
                    };
                }
                return s;
            })
        }));
    };

    const removeRow = (secId: string, rowId: string) => {
        setConfig(prev => ({
            ...prev,
            sections: prev.sections.map(s => {
                if (s.id === secId) {
                    return { ...s, rows: s.rows.filter(r => r.id !== rowId) };
                }
                return s;
            })
        }));
    };

    if (!isOpen) return null;

    return (
        <ModalWrapper isOpen={isOpen} onClose={onClose} title="Cấu Hình Bảng Động" subTitle="Tuỳ biến cột/dòng" titleColorClass="text-indigo-600">
            <div className="bg-slate-50 dark:bg-slate-900 w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
                {/* Header Custom - Hidden as we use ModalWrapper props now */}
                <div className="hidden items-center justify-between p-5 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shrink-0">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            <Icon name="sliders" size={6} className="text-indigo-600 dark:text-indigo-400" />
                            Cấu Hình Bảng Động (Bán Kèm)
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Chỉnh sửa tùy chọn Các Cột và Các Dòng giao diện bảng một cách tùy biến hoàn toàn.</p>
                    </div>
                </div>

                <div className="flex justify-between items-center p-4 bg-slate-100/50 dark:bg-slate-800/30 border-b border-slate-200 dark:border-slate-700">
                    <button 
                        onClick={loadSampleConfig}
                        className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 font-bold text-xs rounded shadow-sm hover:opacity-80 transition"
                    >
                        <Icon name="layout-template" size={3.5} /> Nạp Cấu Hình Mẫu
                    </button>
                    <div className="text-[10px] text-slate-400 italic">Tính năng thiết lập Cấu hình mẫu tự động dựa vào ảnh mẫu</div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar space-y-8">
                    {/* COLUMNS BUILDER */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="bg-slate-100 dark:bg-slate-800/80 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                <Icon name="columns" size={4.5} className="text-indigo-600 dark:text-indigo-400" />
                                Cấu Hình Cột
                            </h3>
                            <div className="flex gap-2">
                                <button onClick={() => addColumn('target')} className="px-3 py-1.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-bold text-xs rounded-lg flex items-center gap-1 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition border border-amber-200 dark:border-amber-800">
                                    <Icon name="target" size={3.5} /> Cột Mục Tiêu
                                </button>
                                <button onClick={() => addColumn('data')} className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold text-xs rounded-lg flex items-center gap-1 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition border border-blue-200 dark:border-blue-800">
                                    <Icon name="plus" size={3.5} /> Cột Dữ Liệu
                                </button>
                                <button onClick={() => addColumn('ratio')} className="px-3 py-1.5 bg-fuchsia-50 dark:bg-fuchsia-900/30 text-fuchsia-600 dark:text-fuchsia-400 font-bold text-xs rounded-lg flex items-center gap-1 hover:bg-fuchsia-100 dark:hover:bg-fuchsia-900/50 transition border border-fuchsia-200 dark:border-fuchsia-800">
                                    <Icon name="percent" size={3.5} /> Cột Tỉ Lệ /
                                </button>
                            </div>
                        </div>
                        
                        <div className="p-4 space-y-3">
                            {config.columns.map((col, cIdx) => (
                                <div key={col.id} className="flex flex-col lg:flex-row gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-700/50">
                                    <div className={`w-12 flex items-center justify-center rounded font-black text-sm ${col.type === 'target' ? 'bg-amber-100 text-amber-600' : col.type === 'ratio' ? 'bg-fuchsia-100 text-fuchsia-600' : 'bg-blue-100 text-blue-600'}`}>
                                        Cột {cIdx + 1}
                                    </div>
                                    <div className="flex-1 space-y-2">
                                        <div className="flex items-center justify-between gap-3">
                                            <input 
                                                type="text" 
                                                value={col.name} 
                                                onChange={e => updateColumn(col.id, 'name', e.target.value)}
                                                className="w-1/3 text-sm font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-1.5 outline-none focus:border-indigo-500 text-slate-700 dark:text-slate-300"
                                                placeholder="Tên cột hiển thị..."
                                            />
                                            {col.type === 'data' && (
                                                <div className="flex-1 flex gap-2 items-center">
                                                    <select
                                                        value={col.dataType || 'quantity'}
                                                        onChange={e => updateColumn(col.id, 'dataType', e.target.value)}
                                                        className="w-32 text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border-none outline-none rounded p-1.5 shadow-sm"
                                                    >
                                                        <option value="quantity">Số Lượng</option>
                                                        <option value="revenueQD">Doanh Thu QĐ</option>
                                                    </select>
                                                    <div className="flex-1 grid grid-cols-2 gap-2">
                                                        <MultiSelectDropdown
                                                            label="Lọc Ngành Hàng (Cha)"
                                                            options={nganhHangOptions}
                                                            selected={col.subgroupsNhomCha || []}
                                                            onChange={selected => updateColumn(col.id, 'subgroupsNhomCha', selected)}
                                                            variant="compact"
                                                        />
                                                        <MultiSelectDropdown
                                                            label="Lọc Nhóm Hàng (Con)"
                                                            options={nhomHangOptions}
                                                            selected={col.subgroupsNhomCon || []}
                                                            onChange={selected => updateColumn(col.id, 'subgroupsNhomCon', selected)}
                                                            variant="compact"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                            {col.type === 'ratio' && (
                                                <div className="flex-1 flex flex-col gap-1.5">
                                                    <div className="flex items-center gap-2 bg-fuchsia-50 dark:bg-fuchsia-900/10 p-1 rounded-md border border-fuchsia-100 dark:border-fuchsia-900/50">
                                                        <select 
                                                            value={col.numeratorColId || ''} 
                                                            onChange={e => updateColumn(col.id, 'numeratorColId', e.target.value)}
                                                            className="flex-1 text-xs p-1 bg-white dark:bg-slate-800 border-none outline-none font-bold text-slate-700 dark:text-slate-200 rounded"
                                                        >
                                                            <option value="">-- Cột Tử Số (A) --</option>
                                                            {config.columns.filter(c => c.id !== col.id && c.type === 'data').map(c => (
                                                                <option key={c.id} value={c.id}>Cột: {c.name}</option>
                                                            ))}
                                                        </select>
                                                        <span className="font-black text-fuchsia-500">/</span>
                                                        <select 
                                                            value={col.denominatorColId || ''} 
                                                            onChange={e => updateColumn(col.id, 'denominatorColId', e.target.value)}
                                                            className="flex-1 text-xs p-1 bg-white dark:bg-slate-800 border-none outline-none font-bold text-slate-700 dark:text-slate-200 rounded"
                                                        >
                                                            <option value="">-- Cột Mẫu Số (B) --</option>
                                                            {config.columns.filter(c => c.id !== col.id && c.type === 'data').map(c => (
                                                                <option key={c.id} value={c.id}>Cột: {c.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 cursor-pointer w-max ml-1">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={col.compareWithTarget || false}
                                                            onChange={e => updateColumn(col.id, 'compareWithTarget', e.target.checked)}
                                                            className="rounded text-fuchsia-500 focus:ring-fuchsia-500 outline-none"
                                                        />
                                                        So sánh bôi xanh/đỏ với Target của Dòng?
                                                    </label>
                                                </div>
                                            )}
                                            {col.type === 'target' && (
                                                <div className="flex-1 text-xs text-amber-600 dark:text-amber-500 font-medium italic">
                                                    Cột này sẽ vạch ra mốc Chỉ Tiêu (Target %) dựa trên thiết lập từng Dòng bên dưới.
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <button onClick={() => removeColumn(col.id)} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors title='Xóa cột'"><Icon name="trash-2" size={4.5} /></button>
                                </div>
                            ))}
                            {config.columns.length === 0 && <div className="text-center p-6 text-sm text-slate-400">Chưa có cột nào được thiết lập. Hãy thêm cột Dữ liệu trước.</div>}
                        </div>
                    </div>

                    {/* ROWS BUILDER */}
                    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                        <div className="bg-slate-100 dark:bg-slate-800/80 px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                <Icon name="list" size={4.5} className="text-indigo-600 dark:text-indigo-400" />
                                Cấu Hình Dòng
                            </h3>
                            <button onClick={addSection} className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold text-xs rounded-lg flex items-center gap-1 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition border border-indigo-200 dark:border-indigo-800">
                                <Icon name="plus" size={3.5} /> Thêm Nhóm & Header
                            </button>
                        </div>
                        
                        <div className="p-4 space-y-6">
                            {config.sections.map((section, sIdx) => (
                                <div key={section.id} className="relative bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl p-4 transition-all focus-within:border-indigo-400 dark:focus-within:border-indigo-500">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="h-8 w-8 rounded bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black">
                                            {sIdx + 1}
                                        </div>
                                        <div className="flex-1 flex gap-2">
                                            <input 
                                                type="text" 
                                                value={section.header} 
                                                onChange={e => updateSectionHeader(section.id, e.target.value)}
                                                className="w-full sm:w-1/2 text-sm font-black bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-lg p-2 outline-none focus:border-indigo-500 uppercase text-slate-800 dark:text-slate-100"
                                                placeholder="Tên Nhóm Dòng (Header)..."
                                            />
                                        </div>
                                        <button onClick={() => removeSection(section.id)} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"><Icon name="trash-2" size={4.5} /></button>
                                    </div>

                                    {/* Rows Wrapper */}
                                    <div className="space-y-3 pl-2 sm:pl-10">
                                        {section.rows.map((row, rIdx) => (
                                            <div key={row.id} className="flex flex-col lg:flex-row gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-lg border border-slate-100 dark:border-slate-700/50">
                                                <div className="flex-1 space-y-2">
                                                    <input 
                                                        type="text" 
                                                        value={row.name} 
                                                        onChange={e => updateRow(section.id, row.id, 'name', e.target.value)}
                                                        className="w-full text-xs font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-1.5 outline-none focus:border-indigo-500 text-slate-700 dark:text-slate-300"
                                                        placeholder="Tên dòng hiển thị..."
                                                    />
                                                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
                                                        <MultiSelectDropdown
                                                            label="Lọc Ngành Hàng"
                                                            options={nganhHangOptions}
                                                            selected={row.subgroupsNhomCha || []}
                                                            onChange={selected => updateRow(section.id, row.id, 'subgroupsNhomCha', selected)}
                                                            variant="compact"
                                                        />
                                                        <MultiSelectDropdown
                                                            label="Lọc Nhóm Hàng"
                                                            options={nhomHangOptions}
                                                            selected={row.subgroupsNhomCon || []}
                                                            onChange={selected => updateRow(section.id, row.id, 'subgroupsNhomCon', selected)}
                                                            variant="compact"
                                                        />
                                                        <MultiSelectDropdown
                                                            label="Hãng Sản Xuất"
                                                            options={uniqueFilterOptions?.hangSX || []}
                                                            selected={row.manufacturers || []}
                                                            onChange={selected => updateRow(section.id, row.id, 'manufacturers', selected)}
                                                            variant="compact"
                                                        />
                                                        <input 
                                                            type="text" 
                                                            value={row.keywords || ''} 
                                                            onChange={e => updateRow(section.id, row.id, 'keywords', e.target.value)}
                                                            className="w-full text-[11px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded p-1.5 outline-none focus:border-indigo-500 text-slate-600 dark:text-slate-400 placeholder-slate-400"
                                                            placeholder="Mã SP (phẩy để tách)"
                                                        />
                                                        <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/50 rounded p-1 px-1.5 focus-within:ring-1 focus-within:ring-amber-500">
                                                            <div className="text-[9px] font-black text-amber-700 dark:text-amber-500 uppercase leading-none tracking-tighter w-8 shrink-0">
                                                                Mục<br/>Tiêu
                                                            </div>
                                                            <input 
                                                                type="number" 
                                                                value={row.targetValue === undefined ? '' : row.targetValue} 
                                                                onChange={e => updateRow(section.id, row.id, 'targetValue', e.target.value ? Number(e.target.value) : undefined)}
                                                                className="w-full h-full text-sm font-black text-amber-600 dark:text-amber-400 bg-transparent border-none outline-none text-right placeholder-amber-200/50"
                                                                placeholder="%"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                                <button onClick={() => removeRow(section.id, row.id)} className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors flex shrink-0 items-center justify-center"><Icon name="trash-2" size={4.5} /></button>
                                            </div>
                                        ))}

                                        <button 
                                            onClick={() => addRow(section.id)}
                                            className="w-full py-2 border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                                        >
                                            <Icon name="plus" size={3.5} /> Thêm dòng
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {config.sections.length === 0 && <div className="text-center p-6 text-sm text-slate-400">Chưa có Header và Dòng nào. Hãy bấm "Thêm Nhóm & Header"</div>}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 shrink-0">
                    <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors shadow-sm">
                        Hủy bỏ
                    </button>
                    <button onClick={handleSave} className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors shadow-md flex items-center gap-2">
                        <Icon name="save" size={4.5} />
                        Lưu cấu hình
                    </button>
                </div>
            </div>
        </ModalWrapper>
    );
};

export default CrossSellingBuilderModal;

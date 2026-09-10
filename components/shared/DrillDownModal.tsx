import React, { useMemo, useState } from 'react';
import type { DataRow, ProductConfig } from '../../types';
import { COL } from '../../constants';
import { getRowValue, calculateRowMetrics, formatCurrency, formatQuantity, parseExcelDate } from '../../utils/dataUtils';
import { Modal } from '../shared/ui/Modal';
import { Button } from '../shared/ui/Button';
import { Input } from '../shared/ui/Input';
import { EmptyState } from '../shared/ui/EmptyState';
import { Icon } from '../common/Icon';

/**
 * Modal DRILL-DOWN dùng chung (KE_HOACH_TONG_THE.md mục 6 — "bấm một ô bất kỳ → xem các dòng cấu
 * thành. Hiện chỉ có ở vài bảng").
 *
 * Trả lời đúng 1 câu hỏi: *"con số này từ đâu ra?"* — hiện danh sách dòng đơn hàng THẬT tạo nên ô
 * vừa bấm, cộng lại đúng bằng con số đó.
 *
 * PHÂN QUYỀN: modal này KHÔNG tự truy vấn dữ liệu. Nơi gọi truyền vào đúng mảng dòng đã tạo nên ô
 * đó — vốn bắt nguồn từ `baseFilteredData` đã qua `computeRbacFilteredData()`. Vì vậy nhân viên
 * mở drill-down cũng chỉ thấy đơn của chính mình. Giữ nguyên nguyên tắc "chỉ có MỘT nơi quyết
 * định quyền xem" như `services/pivotService.ts`.
 */

export interface DrillDownModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Tiêu đề mô tả ô đang xem, vd "Ngành hàng: ICT — Doanh thu QĐ". */
    title: string;
    /** Các dòng THẬT cấu thành con số. Đã được nơi gọi lọc sẵn. */
    rows: DataRow[];
    productConfig: ProductConfig | null;
    /** Giá trị của ô, để người dùng đối chiếu với tổng bên dưới. */
    expectedTotal?: number;
    expectedTotalLabel?: string;
}

const MAX_RENDER = 300;

export const DrillDownModal: React.FC<DrillDownModalProps> = ({
    isOpen, onClose, title, rows, productConfig, expectedTotal, expectedTotalLabel,
}) => {
    const [search, setSearch] = useState('');

    const prepared = useMemo(() => {
        const mapped = rows.map((r, i) => {
            const m = calculateRowMetrics(r, productConfig);
            const dateRaw = getRowValue(r, COL.DATE_CREATED);
            const d = r.parsedDate instanceof Date ? r.parsedDate : parseExcelDate(dateRaw);
            return {
                key: `${String(getRowValue(r, COL.ID) ?? '')}-${i}`,
                maDon: String(getRowValue(r, COL.ID) ?? '—'),
                ngay: d && !isNaN(d.getTime()) ? d.toLocaleDateString('vi-VN') : '—',
                sanPham: String(getRowValue(r, COL.PRODUCT) ?? '—'),
                nhomHang: String(getRowValue(r, COL.MA_NHOM_HANG) ?? '—'),
                nguoiTao: String(getRowValue(r, COL.NGUOI_TAO) ?? '—'),
                soLuong: m.quantity,
                doanhThu: m.revenue,
                doanhThuQD: m.revenueQD,
            };
        });
        const q = search.trim().toLowerCase();
        const filtered = q
            ? mapped.filter(x =>
                x.maDon.toLowerCase().includes(q) ||
                x.sanPham.toLowerCase().includes(q) ||
                x.nhomHang.toLowerCase().includes(q) ||
                x.nguoiTao.toLowerCase().includes(q))
            : mapped;
        return {
            list: filtered,
            tongDT: filtered.reduce((s, x) => s + x.doanhThu, 0),
            tongDTQD: filtered.reduce((s, x) => s + x.doanhThuQD, 0),
            tongSL: filtered.reduce((s, x) => s + x.soLuong, 0),
        };
    }, [rows, productConfig, search]);

    const bịCắt = prepared.list.length > MAX_RENDER;
    const hiển = bịCắt ? prepared.list.slice(0, MAX_RENDER) : prepared.list;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            subTitle={`${rows.length.toLocaleString('vi-VN')} dòng cấu thành`}
            maxWidth="4xl"
        >
            <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                    <div className="flex-1 min-w-[180px]">
                        <Input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Tìm mã đơn / sản phẩm / nhân viên..."
                            className="h-9 text-xs"
                        />
                    </div>
                    {expectedTotal !== undefined && (
                        <span className="text-[11px] text-slate-500">
                            Giá trị ô: <strong className="text-sky-700">{formatCurrency(expectedTotal)}</strong>
                            {expectedTotalLabel ? ` (${expectedTotalLabel})` : ''}
                        </span>
                    )}
                </div>

                {prepared.list.length === 0 ? (
                    <EmptyState icon="search" title="Không có dòng nào khớp" description="Thử xoá bớt từ khoá tìm kiếm." />
                ) : (
                    <>
                        <div className="max-h-[55vh] overflow-auto border border-slate-200">
                            <table className="w-full border-collapse">
                                <thead className="sticky top-0 z-10">
                                    <tr>
                                        {['Mã đơn', 'Ngày', 'Sản phẩm', 'Nhóm hàng', 'Nhân viên', 'SL', 'Doanh thu', 'DTQĐ'].map((h, i) => (
                                            <th
                                                key={h}
                                                className={`px-2 py-1 text-[11px] font-bold tracking-wider uppercase text-slate-700 bg-slate-50 border-b-2 border-b-slate-100 border-r border-slate-200 ${i >= 5 ? 'text-center' : 'text-left'}`}
                                            >
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {hiển.map(x => (
                                        <tr key={x.key} className="border-b border-slate-100 bg-white hover:bg-slate-50">
                                            <td className="px-2 py-1 text-[12px] font-mono text-slate-600 border-r border-slate-200">{x.maDon}</td>
                                            <td className="px-2 py-1 text-[12px] text-slate-500 border-r border-slate-200 whitespace-nowrap">{x.ngay}</td>
                                            <td className="px-2 py-1 text-[12px] text-slate-700 border-r border-slate-200 max-w-[240px] truncate" title={x.sanPham}>{x.sanPham}</td>
                                            <td className="px-2 py-1 text-[12px] text-slate-500 border-r border-slate-200 max-w-[140px] truncate" title={x.nhomHang}>{x.nhomHang}</td>
                                            <td className="px-2 py-1 text-[12px] text-slate-500 border-r border-slate-200 max-w-[140px] truncate" title={x.nguoiTao}>{x.nguoiTao}</td>
                                            <td className="px-2 py-1 text-[12px] text-center tabular-nums border-r border-slate-200">{formatQuantity(x.soLuong)}</td>
                                            <td className="px-2 py-1 text-[12px] text-center tabular-nums border-r border-slate-200 text-slate-600">{formatCurrency(x.doanhThu)}</td>
                                            <td className="px-2 py-1 text-[12px] text-center tabular-nums font-bold text-sky-700">{formatCurrency(x.doanhThuQD)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="sticky bottom-0">
                                    <tr className="bg-emerald-50 border-t-2 border-emerald-200 font-extrabold">
                                        <td colSpan={5} className="px-2 py-1 text-[12px] text-left text-slate-800 border-r border-slate-200">
                                            TỔNG {search ? '(theo tìm kiếm)' : ''}
                                        </td>
                                        <td className="px-2 py-1 text-[12px] text-center tabular-nums border-r border-slate-200">{formatQuantity(prepared.tongSL)}</td>
                                        <td className="px-2 py-1 text-[12px] text-center tabular-nums border-r border-slate-200 text-slate-700">{formatCurrency(prepared.tongDT)}</td>
                                        <td className="px-2 py-1 text-[12px] text-center tabular-nums text-emerald-700">{formatCurrency(prepared.tongDTQD)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {bịCắt && (
                            // Cắt bớt để không treo trình duyệt với ô có hàng chục nghìn dòng. Nói RÕ
                            // là chỉ cắt phần HIỂN THỊ — dòng TỔNG bên trên vẫn cộng đủ, để người dùng
                            // không tưởng số bị thiếu.
                            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                                Chỉ hiển thị {MAX_RENDER.toLocaleString('vi-VN')} dòng đầu cho nhẹ máy —
                                dòng TỔNG phía trên vẫn tính đủ {prepared.list.length.toLocaleString('vi-VN')} dòng.
                                Dùng ô tìm kiếm để thu hẹp lại.
                            </p>
                        )}
                    </>
                )}

                <div className="flex justify-end pt-1">
                    <Button variant="secondary" size="sm" onClick={onClose}>
                        <Icon name="x" size={3.5} className="mr-1" /> Đóng
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

export default DrillDownModal;

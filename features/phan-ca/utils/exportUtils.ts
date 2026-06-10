import type { RefObject } from 'react';
import type { WorkBook } from 'xlsx';
import type { StaffMember } from '../types';
import { abbreviateVietnameseName } from './stringUtils';

import { exportElementAsImage } from '../../../services/uiService';

export const exportToExcel = async (tableRef: RefObject<HTMLTableElement>) => {
    if (tableRef.current) {
        const XLSX = await import('xlsx');
        const wb = XLSX.utils.table_to_book(tableRef.current, { sheet: "LichLamViec" });
        XLSX.writeFile(wb, 'Lich_Phan_Ca.xlsx');
    }
};

export const exportToImage = async (exportRef: RefObject<HTMLElement>, filename: string = 'Lich_Phan_Ca.png'): Promise<void> => {
    if (!exportRef.current) {
        throw new Error("Phần tử để xuất không tồn tại.");
    }
    
    try {
        const blob = await exportElementAsImage(exportRef.current, filename, {
            mode: 'download',
            scale: 2,
            elementsToHide: ['.export-hidden']
        });
        
        if (!blob) {
            throw new Error("Không thể tạo ảnh từ DOM (kết quả trả về trống).");
        }
    } catch (error) {
        console.error("Lỗi khi xuất ảnh:", error);
        throw error;
    }
};

export const generateBusyTemplateTSV = (staffList: StaffMember[], duration: number, startDay: number, month: number, year: number): string => {
    const header = ['Họ và Tên'];
    for (let i = 0; i < duration; i++) {
        const date = new Date(year, month - 1, startDay + i);
        header.push(`Ngày ${date.getDate()}/${date.getMonth() + 1}`);
    }
    
    const formatDisplayName = (fullName: string): string => {
        const parts = fullName.split(' - ');
        if (parts.length < 2) {
            return fullName;
        }
        const id = parts[0];
        const name = parts.slice(1).join(' - ');
        return `${id} - ${abbreviateVietnameseName(name)}`;
    };

    const dataRows = staffList.map(staff => [formatDisplayName(staff.name)]);

    const headerRowString = header.join('\t');
    const dataRowsStrings = dataRows.map(row => row.join('\t'));
    
    // Combine everything into one string
    return [headerRowString, ...dataRowsStrings].join('\n');
};
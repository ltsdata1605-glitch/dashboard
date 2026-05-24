import type { RefObject } from 'react';
import type { WorkBook } from 'xlsx';
import type { StaffMember } from '../types';
import { abbreviateVietnameseName } from './stringUtils';

import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';

export const exportToExcel = (tableRef: RefObject<HTMLTableElement>) => {
    if (tableRef.current) {
        const wb = XLSX.utils.table_to_book(tableRef.current, { sheet: "LichLamViec" });
        XLSX.writeFile(wb, 'Lich_Phan_Ca.xlsx');
    }
};

export const exportToImage = (exportRef: RefObject<HTMLElement>, filename: string = 'Lich_Phan_Ca.png'): Promise<void> => {
    return new Promise((resolve, reject) => {
        if (!exportRef.current) {
            return reject(new Error("Phần tử để xuất không tồn tại."));
        }

        const elementToCapture = exportRef.current;
        const scrollContainers = elementToCapture.querySelectorAll<HTMLElement>('.overflow-x-auto');
        let scrollContainer: HTMLElement | null = null;
        let maxScrollWidth = 0;
        scrollContainers.forEach(container => {
            if (container.scrollWidth > maxScrollWidth) {
                maxScrollWidth = container.scrollWidth;
                scrollContainer = container;
            }
        });
        const stickyCols = elementToCapture.querySelectorAll<HTMLElement>('.sticky-col');

        // Cuộn về đầu để tránh lỗi render của html2canvas
        window.scrollTo(0, 0);

        // Nếu không có phần tử cuộn, chỉ cần chụp ảnh như bình thường.
        if (!scrollContainer) {
            html2canvas(elementToCapture, { 
                scale: 2, 
                useCORS: true, 
                allowTaint: true, 
                logging: false,
                backgroundColor: '#ffffff'
            })
                .then((canvas: HTMLCanvasElement) => {
                    const link = document.createElement('a');
                    link.download = filename;
                    link.href = canvas.toDataURL("image/png");
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    resolve();
                })
                .catch(reject);
            return;
        }
        
        // Lưu lại style gốc để khôi phục
        const originalElementStyles = {
            minWidth: elementToCapture.style.minWidth,
            alignItems: elementToCapture.style.alignItems,
            width: elementToCapture.style.width,
            height: elementToCapture.style.height,
            overflow: elementToCapture.style.overflow
        };
        const originalStickyPositions = new Map<HTMLElement, string>();
        stickyCols.forEach(col => originalStickyPositions.set(col, col.style.position));

        const restoreStyles = () => {
            // Khôi phục style gốc sau khi chụp ảnh
            elementToCapture.style.minWidth = originalElementStyles.minWidth;
            elementToCapture.style.alignItems = originalElementStyles.alignItems;
            elementToCapture.style.width = originalElementStyles.width;
            elementToCapture.style.height = originalElementStyles.height;
            elementToCapture.style.overflow = originalElementStyles.overflow;
            
            stickyCols.forEach(col => {
                col.style.position = originalStickyPositions.get(col) || 'sticky';
            });
        };

        // Tạm thời điều chỉnh style để chụp ảnh toàn bộ nội dung
        // Thêm khoảng đệm 40px để tránh bị cắt lề phải
        const fullWidth = scrollContainer.scrollWidth + 40; 
        elementToCapture.style.width = `${fullWidth}px`;
        elementToCapture.style.minWidth = `${fullWidth}px`;
        elementToCapture.style.alignItems = 'flex-start';
        elementToCapture.style.overflow = 'visible';
        
        // Chuyển các cột "dính" thành tĩnh để tránh lỗi render chồng chéo trong html2canvas
        stickyCols.forEach(col => {
            col.style.position = 'static';
        });

        // Đợi một chút để trình duyệt cập nhật layout ổn định và các class highlight được áp dụng hoàn toàn
        setTimeout(() => {
            html2canvas(elementToCapture, { 
                scale: 2, // Đảm bảo chất lượng ảnh xuất ra là cao nhất (retina)
                useCORS: true, 
                allowTaint: true, 
                logging: false,
                backgroundColor: '#ffffff',
                width: fullWidth,
                windowWidth: fullWidth,
                onclone: (clonedDoc: Document) => {
                    // Fix lỗi hiển thị sticky header khi clone (nếu cần)
                    const clonedSticky = clonedDoc.querySelectorAll('.sticky-col');
                    clonedSticky.forEach((el: any) => el.style.position = 'static');
                }
            })
                .then((canvas: HTMLCanvasElement) => {
                    const link = document.createElement('a');
                    link.download = filename;
                    link.href = canvas.toDataURL("image/png");
                    link.style.display = 'none'; // Ẩn link để không làm vỡ layout
                    document.body.appendChild(link);
                    link.click();
                    
                    // Delay xóa link để trình duyệt kịp xử lý luồng download, đặc biệt trên Firefox/Chrome
                    setTimeout(() => {
                        if (document.body.contains(link)) document.body.removeChild(link);
                    }, 1000);
                })
                .catch((error: any) => {
                    console.error("Lỗi khi xuất ảnh:", error);
                    reject(error);
                })
                .finally(() => {
                    // QUAN TRỌNG: Khôi phục style TRƯỚC khi resolve để vòng lặp tiếp theo nhận được DOM sạch
                    restoreStyles();
                    // Resolve promise để báo hiệu hoàn tất
                    resolve();
                });
        }, 500); // Tăng delay lên 500ms để đảm bảo layout ổn định
    });
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
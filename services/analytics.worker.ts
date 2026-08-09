import { applyFiltersAndProcess } from './filterService';
import { computeRbacFilteredData, computeUniqueFilterOptions, computeUnconfiguredGroups } from '../utils/dataUtils';
import type { DataRow } from '../types';

let cachedData: DataRow[] = [];         // Đã lọc RBAC — PROCESS bên dưới dùng y nguyên biến này như trước.
let cachedOriginalData: DataRow[] = []; // Thô, chưa lọc — allUnconfiguredGroups cố ý dùng phạm vi rộng hơn RBAC.

self.onmessage = (event: MessageEvent) => {
    const { type, payload } = event.data;

    if (type === 'SET_DATA') {
        // Mục 65b: trước đây SET_DATA chỉ nhận rbacData đã lọc SẴN trên main thread (tính qua
        // useMemo, chặn main thread 1-3s với dữ liệu lớn). Giờ nhận thẳng originalData thô +
        // tham số RBAC/config, tự lọc + tính uniqueFilterOptions/allUnconfiguredGroups NGAY
        // TRONG WORKER — dù Worker tự "đứng hình" bao lâu cũng không ảnh hưởng UI main thread.
        const { generation, originalData, rbacParams, productConfig, departmentMap } = payload;
        try {
            cachedOriginalData = originalData;
            cachedData = computeRbacFilteredData(originalData, rbacParams);

            const uniqueFilterOptions = computeUniqueFilterOptions(cachedData, departmentMap);
            const allUnconfiguredGroups = computeUnconfiguredGroups(cachedOriginalData, productConfig);

            self.postMessage({ type: 'SET_DATA_SUCCESS', payload: { generation, uniqueFilterOptions, allUnconfiguredGroups } });
        } catch (error) {
            console.error("Analytics Worker Error (SET_DATA):", error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error while filtering/analyzing data in worker";
            self.postMessage({ type: 'SET_DATA_ERROR', payload: { generation, message: errorMessage } });
        }
    }
    else if (type === 'PROCESS') {
        const { productConfig, filterState, departmentMap } = payload;

        try {
            // Chạy thuật toán lọc và tính toán nặng trĩu trên Worker
            const { processedData } = applyFiltersAndProcess(
                cachedData,
                productConfig,
                filterState,
                departmentMap
            );

            // Mục 65d: KHÔNG còn gửi baseFilteredData/warehouseFilteredData (main thread giờ tự
            // tính lại từ originalData đã có sẵn, xem hooks/useDataManagement.ts) và KHÔNG gửi
            // filteredValidSalesData (cũng tự tính lại trên main thread) — 3 mảng dòng dữ liệu
            // thô này (tới 50k dòng mỗi mảng) trước đây chiếm phần lớn payload postMessage
            // (~197MB ở tập 50k dòng), đo được chiếm ~3s/4-5s tổng thời gian xử lý MỘT MÌNH chi
            // phí structured-clone — không phải do thuật toán tính toán chậm. Chỉ còn gửi lại
            // processedData đã lược bỏ filteredValidSalesData (nhẹ, đã tổng hợp/gộp nhóm).
            const { filteredValidSalesData: _filteredValidSalesData, ...resultToSend } = processedData;

            self.postMessage({
                type: 'PROCESS_SUCCESS',
                payload: { result: resultToSend }
            });
        } catch (error) {
            console.error("Analytics Worker Error:", error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error in analytics worker";
            self.postMessage({ type: 'PROCESS_ERROR', payload: errorMessage });
        }
    }
};

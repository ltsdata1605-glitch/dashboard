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
            const { processedData, baseFilteredData, warehouseFilteredData, calendarSourceData } = applyFiltersAndProcess(
                cachedData,
                productConfig,
                filterState,
                departmentMap
            );

            // Gửi kết quả (đã tính xong, rất nhẹ) về Main Thread
            self.postMessage({
                type: 'PROCESS_SUCCESS',
                payload: {
                    result: processedData,
                    newBaseData: baseFilteredData,
                    newWarehouseData: warehouseFilteredData,
                    newCalendarSourceData: calendarSourceData
                }
            });
        } catch (error) {
            console.error("Analytics Worker Error:", error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error in analytics worker";
            self.postMessage({ type: 'PROCESS_ERROR', payload: errorMessage });
        }
    }
};

import { applyFiltersAndProcess } from './filterService';
import type { DataRow, FilterState, ProductConfig, ProcessedData } from '../types';

let cachedData: DataRow[] = [];

self.onmessage = (event: MessageEvent) => {
    const { type, payload } = event.data;

    if (type === 'SET_DATA') {
        // Lưu trữ dữ liệu vào bộ nhớ của Worker (Stateful)
        cachedData = payload;
        self.postMessage({ type: 'DATA_SET_SUCCESS' });
    } 
    else if (type === 'PROCESS') {
        const { productConfig, filterState, departmentMap, isDeduplicationEnabled } = payload;
        
        try {
            // Chạy thuật toán lọc và tính toán nặng trĩu trên Worker
            const { processedData, baseFilteredData, warehouseFilteredData, calendarSourceData } = applyFiltersAndProcess(
                cachedData,
                productConfig,
                filterState,
                departmentMap,
                isDeduplicationEnabled
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

import { useEffect, useRef, useCallback } from 'react';

// Giữ một instance duy nhất (singleton) cho toàn app
let workerInstance: Worker | null = null;
let requestCounter = 0;
const pendingRequests = new Map<number, { resolve: (val: unknown) => void; reject: (err: unknown) => void }>();

const getWorker = () => {
    if (!workerInstance) {
        workerInstance = new Worker(new URL('../workers/analytics.worker.ts', import.meta.url), { type: 'module' });
        workerInstance.onmessage = (e) => {
            const { id, type, result, error } = e.data;
            const promise = pendingRequests.get(id);
            if (promise) {
                if (type === 'SUCCESS') promise.resolve(result);
                else promise.reject(new Error(error));
                pendingRequests.delete(id);
            }
        };
    }
    return workerInstance;
};

// any: kết quả phụ thuộc `type` (mỗi loại task trả về 1 shape khác nhau, dispatch qua Worker
// message-passing); >10 nơi gọi ở nhiều hook/component khác nhau đang tự suy luận kiểu qua .then(),
// generic hóa đúng cần sửa đồng loạt các nơi gọi — để lại cho đợt xử lý các file đó.
export const runWorkerTask = (type: string, payload: any): Promise<any> => {
    const worker = getWorker();
    const id = ++requestCounter;
    return new Promise((resolve, reject) => {
        pendingRequests.set(id, { resolve, reject });
        worker.postMessage({ id, type, payload });
    });
};

export const useWorker = () => {
    return { runWorkerTask };
};

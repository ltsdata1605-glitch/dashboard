import { useEffect, useRef, useCallback } from 'react';

// Giữ một instance duy nhất (singleton) cho toàn app
let workerInstance: Worker | null = null;
let requestCounter = 0;
const pendingRequests = new Map<number, { resolve: (val: any) => void; reject: (err: any) => void }>();

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

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
        // Không có onerror trước đây: 1 lỗi worker-level (crash module, exception ngoài
        // try/catch của analytics.worker.ts) không bắn onmessage — mọi pendingRequests treo
        // vĩnh viễn (không resolve/reject), toàn bộ view phụ thuộc worker giữ dữ liệu cũ/rỗng
        // im lặng. Reject hết các request đang chờ để lỗi lan lên .catch() ở nơi gọi thay vì treo.
        workerInstance.onerror = (e) => {
            const err = new Error(e.message || 'Worker crashed');
            pendingRequests.forEach(promise => promise.reject(err));
            pendingRequests.clear();
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

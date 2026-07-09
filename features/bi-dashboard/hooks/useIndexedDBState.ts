import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import * as db from '../utils/db';
import { configStore } from '../store/configStore';

type SetStateAction<S> = S | ((prevState: S) => S);
type Dispatch<A> = (value: A) => void;

const DB_CHANGE_EVENT = 'indexeddb-change';

export function useIndexedDBState<T>(
    key: db.BIKey | null,
    defaultValue: T,
    debounceMs: number = 0
): [T, Dispatch<SetStateAction<T>>, boolean] {
    // Snapshot chỉ theo key của riêng hook này, không theo toàn bộ configStore.state —
    // configStore.getState() trả về object mới mỗi lần BẤT KỲ key nào thay đổi (spread pattern),
    // nên subscribe trực tiếp vào nó khiến toàn bộ ~30+ chỗ dùng useIndexedDBState re-render
    // mỗi khi 1 key bất kỳ đổi. Cache lại snapshot theo key để useSyncExternalStore chỉ báo
    // "đổi" khi đúng cache[key]/loaded[key] của hook này thay đổi.
    const lastSnapshotRef = useRef<{ cacheVal: T | undefined; loadedVal: boolean; result: [T | undefined, boolean] } | null>(null);
    const getSnapshot = useCallback((): [T | undefined, boolean] => {
        const s = configStore.getState();
        const cacheVal = key ? (s.cache[key] as T | undefined) : undefined;
        const loadedVal = key ? !!s.loaded[key] : true;
        const prev = lastSnapshotRef.current;
        if (prev && Object.is(prev.cacheVal, cacheVal) && prev.loadedVal === loadedVal) {
            return prev.result;
        }
        const result: [T | undefined, boolean] = [cacheVal, loadedVal];
        lastSnapshotRef.current = { cacheVal, loadedVal, result };
        return result;
    }, [key]);
    const [cacheValueForKey, isLoadedForKey] = useSyncExternalStore(configStore.subscribe, getSnapshot);
    const defaultValueRef = useRef(defaultValue);
    const debounceMsRef = useRef(debounceMs);
    
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const pendingValueRef = useRef<T | null>(null);
    const hasPendingWriteRef = useRef<boolean>(false);

    useEffect(() => {
        defaultValueRef.current = defaultValue;
    }, [defaultValue]);

    useEffect(() => {
        debounceMsRef.current = debounceMs;
    }, [debounceMs]);

    const writeQueueRef = useRef<(() => Promise<void>)[]>([]);
    const isWritingRef = useRef(false);
    // Increments on every user-initiated write so stale loadValue() calls can detect they're outdated
    const writeVersionRef = useRef(0);

    const performWrite = useCallback((keyToSave: db.BIKey, valueToWrite: T) => {
        const processQueue = () => {
            if (isWritingRef.current || writeQueueRef.current.length === 0) return;
            isWritingRef.current = true;
            const writeTask = writeQueueRef.current.shift();

            if (writeTask) {
                writeTask().finally(() => {
                    isWritingRef.current = false;
                    processQueue();
                });
            }
        };

        const task = () => db.set(keyToSave, valueToWrite, 'hook-write')
            .catch(err => console.error(`Save error ${keyToSave}`, err));
        
        writeQueueRef.current.push(task);
        processQueue();
    }, []);

    // Handle unmount or key change: flush any pending writes immediately using the queue
    useEffect(() => {
        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            if (hasPendingWriteRef.current && key) {
                const valueToFlush = pendingValueRef.current;
                hasPendingWriteRef.current = false;
                if (valueToFlush !== null) {
                    performWrite(key, valueToFlush);
                }
            }
        };
    }, [key, performWrite]);

    useEffect(() => {
        if (!key) return;

        const loadValue = () => {
            // Capture the write version before the async read so we can detect if the
            // user fired setStoredValue() while we were waiting for IDB — if so, discard.
            const capturedVersion = writeVersionRef.current;
            db.get<T>(key).then(storedValue => {
                if (writeVersionRef.current !== capturedVersion) return;
                const defValue = defaultValueRef.current;
                let finalValue = defValue;
                if (storedValue !== undefined && storedValue !== null) {
                    if (Array.isArray(defValue) && !Array.isArray(storedValue)) {
                        finalValue = defValue;
                    } else {
                        finalValue = storedValue;
                    }
                }
                configStore.setCache(key, finalValue);
                configStore.setLoaded(key, true);
            }).catch(err => {
                console.error(`Failed to load key "${key}"`, err);
                configStore.setCache(key, defaultValueRef.current);
                configStore.setLoaded(key, true);
            });
        };

        const handleDbChange = (event: CustomEvent) => {
            if (event.detail.key === 'ALL') {
                configStore.clearCache();
                return;
            }
            if (event.detail.key === key && event.detail.source !== 'hook-write') {
                loadValue();
            }
        };

        window.addEventListener(DB_CHANGE_EVENT, handleDbChange as EventListener);

        if (!configStore.getState().loaded[key]) {
            loadValue();
        }

        return () => window.removeEventListener(DB_CHANGE_EVENT, handleDbChange as EventListener);
    }, [key]);

    const setStoredValue = useCallback((newValue: SetStateAction<T>) => {
        if (!key) return;
        // Invalidate any in-flight loadValue() calls so they won't overwrite this user action
        writeVersionRef.current++;

        const currentState = configStore.getState();
        const prevValue = (currentState.cache[key] !== undefined ? currentState.cache[key] : defaultValueRef.current) as T;
        
        const finalValue = typeof newValue === 'function'
            ? (newValue as (prevState: T) => T)(prevValue)
            : newValue;
            
        // Immediately update RAM cache
        configStore.setCache(key, finalValue);
        configStore.setLoaded(key, true);

        if (debounceMsRef.current > 0) {
            pendingValueRef.current = finalValue;
            hasPendingWriteRef.current = true;
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            timerRef.current = setTimeout(() => {
                hasPendingWriteRef.current = false;
                performWrite(key, finalValue);
            }, debounceMsRef.current);
        } else {
            performWrite(key, finalValue);
        }
    }, [key, performWrite]);

    const currentValue = (key && isLoadedForKey && cacheValueForKey !== undefined)
        ? cacheValueForKey
        : defaultValueRef.current;

    const isLoaded = isLoadedForKey;

    return [currentValue, setStoredValue, isLoaded];
}

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
    const state = useSyncExternalStore(configStore.subscribe, configStore.getState);
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

    const writeQueueRef = useRef<(() => Promise<any>)[]>([]);
    const isWritingRef = useRef(false);

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

        const task = () => db.set(keyToSave, valueToWrite)
            .then(() => {
                window.dispatchEvent(new CustomEvent(DB_CHANGE_EVENT, { 
                    detail: { key: keyToSave, source: 'hook-write' } 
                }));
            })
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
            db.get(key).then(storedValue => {
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
        
        const currentState = configStore.getState();
        const prevValue = currentState.cache[key] !== undefined ? currentState.cache[key] : defaultValueRef.current;
        
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

    const currentValue = (key && state.loaded[key] && state.cache[key] !== undefined) 
        ? state.cache[key] 
        : defaultValueRef.current;
        
    const isLoaded = key ? !!state.loaded[key] : true;

    return [currentValue, setStoredValue, isLoaded];
}

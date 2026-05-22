import { useCallback, useEffect, useRef, useSyncExternalStore } from 'react';
import * as db from '../utils/db';
import { configStore } from '../store/configStore';

type SetStateAction<S> = S | ((prevState: S) => S);
type Dispatch<A> = (value: A) => void;

const DB_CHANGE_EVENT = 'indexeddb-change';

export function useIndexedDBState<T>(key: string | null, defaultValue: T): [T, Dispatch<SetStateAction<T>>, boolean] {
    const state = useSyncExternalStore(configStore.subscribe, configStore.getState);
    const defaultValueRef = useRef(defaultValue);

    const writeQueueRef = useRef<(() => Promise<any>)[]>([]);
    const isWritingRef = useRef(false);

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

        // Async write to IndexedDB
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

        const task = () => db.set(key, finalValue)
            .then(() => {
                window.dispatchEvent(new CustomEvent(DB_CHANGE_EVENT, { 
                    detail: { key, source: 'hook-write' } 
                }));
            })
            .catch(err => console.error(`Save error ${key}`, err));
        
        writeQueueRef.current.push(task);
        processQueue();
    }, [key]);

    const currentValue = (key && state.loaded[key] && state.cache[key] !== undefined) 
        ? state.cache[key] 
        : defaultValueRef.current;
        
    const isLoaded = key ? !!state.loaded[key] : true;

    return [currentValue, setStoredValue, isLoaded];
}

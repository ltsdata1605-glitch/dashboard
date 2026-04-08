
import { useState, useEffect, useCallback, useRef } from 'react';
import * as db from '../utils/db';

type SetStateAction<S> = S | ((prevState: S) => S);
type Dispatch<A> = (value: A) => void;

const DB_CHANGE_EVENT = 'indexeddb-change';
// Dùng Map để quản lý debounce cho sự kiện theo từng key riêng biệt
const eventTimeouts = new Map<string, any>();

export function useIndexedDBState<T>(key: string | null, defaultValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(defaultValue);
  const loadIdRef = useRef(0);
  const writeQueueRef = useRef<(() => Promise<any>)[]>([]);
  const isWritingRef = useRef(false);

  useEffect(() => {
    if (!key) {
      setValue(defaultValue);
      return;
    }

    const currentLoadId = ++loadIdRef.current;
    
    const loadValue = () => {
        db.get(key).then(storedValue => {
            if (currentLoadId === loadIdRef.current) {
                if (storedValue !== undefined && storedValue !== null) {
                    setValue(storedValue);
                } else {
                    setValue(defaultValue);
                }
            }
        }).catch(err => {
            console.error(`Failed to load key "${key}"`, err);
        });
    };
    
    loadValue();

    const handleDbChange = (event: CustomEvent) => {
        if (event.detail.key === key) {
            loadValue();
        }
    };

    window.addEventListener(DB_CHANGE_EVENT, handleDbChange as EventListener);
    return () => window.removeEventListener(DB_CHANGE_EVENT, handleDbChange as EventListener);
  }, [key, defaultValue]);

  const setStoredValue = useCallback((newValue: SetStateAction<T>) => {
    if (!key) return;
    
    setValue(prevValue => {
        const finalValue = typeof newValue === 'function'
            ? (newValue as (prevState: T) => T)(prevValue)
            : newValue;
        
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
                // Debounce event: Chỉ phát sự kiện sau khi các thay đổi dồn dập kết thúc cho key này
                if (eventTimeouts.has(key)) {
                    clearTimeout(eventTimeouts.get(key));
                }
                const timeout = setTimeout(() => {
                    window.dispatchEvent(new CustomEvent(DB_CHANGE_EVENT, { detail: { key } }));
                    eventTimeouts.delete(key);
                }, 100); 
                eventTimeouts.set(key, timeout);
            })
            .catch(err => console.error(`Save error ${key}`, err));
        
        writeQueueRef.current.push(task);
        processQueue();
        return finalValue;
    });
  }, [key]);

  return [value, setStoredValue];
}

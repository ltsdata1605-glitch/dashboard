
import { useState, useEffect, useCallback, useRef } from 'react';
import * as db from '../utils/db';

type SetStateAction<S> = S | ((prevState: S) => S);
type Dispatch<A> = (value: A) => void;

const DB_CHANGE_EVENT = 'indexeddb-change';

export function useIndexedDBState<T>(key: string | null, defaultValue: T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(defaultValue);
  const loadIdRef = useRef(0);
  const writeQueueRef = useRef<(() => Promise<any>)[]>([]);
  const isWritingRef = useRef(false);
  // Ref để lưu defaultValue ổn định (tránh object/array literal gây re-render vô tận)
  const defaultValueRef = useRef(defaultValue);
  // Ref đánh dấu key vừa ghi — khi nhận event cho key này, bỏ qua reload (vì state đã đúng)
  const justWroteKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!key) {
      setValue(defaultValueRef.current);
      return;
    }

    const currentLoadId = ++loadIdRef.current;
    
    const loadValue = () => {
        db.get(key).then(storedValue => {
            if (currentLoadId === loadIdRef.current) {
                if (storedValue !== undefined && storedValue !== null) {
                    setValue(storedValue);
                } else {
                    setValue(defaultValueRef.current);
                }
            }
        }).catch(err => {
            console.error(`Failed to load key "${key}"`, err);
        });
    };
    
    loadValue();

    const handleDbChange = (event: CustomEvent) => {
        if (event.detail.key === key) {
            // Nếu chính hook này vừa ghi key đó → state đã đúng rồi, bỏ qua reload
            if (justWroteKeyRef.current === key) {
                justWroteKeyRef.current = null;
                return;
            }
            loadValue();
        }
    };

    window.addEventListener(DB_CHANGE_EVENT, handleDbChange as EventListener);
    return () => window.removeEventListener(DB_CHANGE_EVENT, handleDbChange as EventListener);
  }, [key]); // ← ĐÃ XOÁ defaultValue khỏi deps — tránh vòng lặp vô tận

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

        // Đánh dấu key đang được ghi bởi hook này
        justWroteKeyRef.current = key;
        const task = () => db.set(key, finalValue)
            .catch(err => console.error(`Save error ${key}`, err));
        
        writeQueueRef.current.push(task);
        processQueue();
        return finalValue;
    });
  }, [key]);

  return [value, setStoredValue];
}

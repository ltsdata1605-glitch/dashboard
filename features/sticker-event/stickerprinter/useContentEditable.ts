import React, { useRef, useCallback, useEffect } from 'react';

/**
 * Hook to manage a contentEditable div without cursor-jumping.
 * Synchronizes external state with DOM while handling element mounting / changing.
 */
export function useContentEditable<T extends HTMLElement = HTMLDivElement>(
    externalValue: string,
    onChange?: (text: string) => void,
    useHTML: boolean = false,
) {
    const ref = useRef<T>(null);
    const lastElementRef = useRef<T | null>(null);

    // Sync from external state -> DOM on mount or when DOM element changes
    useEffect(() => {
        if (ref.current && ref.current !== lastElementRef.current) {
            lastElementRef.current = ref.current;
            const currentVal = useHTML ? ref.current.innerHTML : ref.current.innerText;
            if (currentVal !== externalValue) {
                if (useHTML) {
                    ref.current.innerHTML = externalValue;
                } else {
                    ref.current.innerText = externalValue;
                }
            }
        }
    });

    // Sync from external state → DOM, but ONLY when element is NOT focused
    useEffect(() => {
        if (ref.current && document.activeElement !== ref.current) {
            const currentVal = useHTML ? ref.current.innerHTML : ref.current.innerText;
            if (currentVal !== externalValue) {
                if (useHTML) {
                    ref.current.innerHTML = externalValue;
                } else {
                    ref.current.innerText = externalValue;
                }
            }
        }
    }, [externalValue, useHTML]);

    const handleInput = useCallback((e: React.FormEvent<T>) => {
        onChange?.(useHTML ? e.currentTarget.innerHTML : e.currentTarget.innerText);
    }, [onChange, useHTML]);

    return { ref, handleInput };
}

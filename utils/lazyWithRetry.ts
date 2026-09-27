import React, { ComponentType, lazy } from 'react';

/**
 * Lazy loads a component with automatic retry on chunk load / preload failures.
 * Handles cases where a new version was deployed and chunk hashes changed,
 * or temporary network hiccups caused the chunk import to fail or resolve to undefined.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
    factory: () => Promise<{ default: T } | any>,
    name?: string
) {
    return lazy(async () => {
        const reloadKey = `lazy_retry_${name || 'module'}`;
        const hasRetried = typeof sessionStorage !== 'undefined' && sessionStorage.getItem(reloadKey) === 'true';

        try {
            const module = await factory();
            // If Vite resolved to undefined (e.g. from network failure or vite:preloadError), or lacks default export
            if (!module || !module.default) {
                // In case the module itself is the component
                if (typeof module === 'function') {
                    return { default: module as T };
                }
                throw new Error(`Module "${name || 'unknown'}" failed to load or has no default export.`);
            }
            if (typeof sessionStorage !== 'undefined') {
                sessionStorage.removeItem(reloadKey);
            }
            return module;
        } catch (err: any) {
            console.warn(`[lazyWithRetry] Error loading lazy module "${name || 'unknown'}":`, err);
            if (!hasRetried && typeof window !== 'undefined') {
                try {
                    sessionStorage.setItem(reloadKey, 'true');
                } catch {
                    // Ignore quota or private mode issues
                }
                // Auto reload page to pick up latest index.html and chunk hashes
                window.location.reload();
                // Return an unresolved promise to keep Suspense in loading state while browser reloads
                return new Promise<{ default: T }>(() => {});
            }
            // If already retried once and still failing, throw so ErrorBoundary can show fallback
            throw err;
        }
    });
}

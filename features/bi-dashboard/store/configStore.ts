type ConfigState = {
    cache: Record<string, any>;
    loaded: Record<string, boolean>;
};

let state: ConfigState = {
    cache: {},
    loaded: {},
};

const listeners = new Set<() => void>();

const emitChange = () => {
    listeners.forEach(listener => listener());
};

export const configStore = {
    getState: () => state,
    
    subscribe: (listener: () => void) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
    },
    
    setCache: (key: string, value: any) => {
        state = {
            ...state,
            cache: { ...state.cache, [key]: value }
        };
        emitChange();
    },
    
    setLoaded: (key: string, isLoaded: boolean) => {
        state = {
            ...state,
            loaded: { ...state.loaded, [key]: isLoaded }
        };
        emitChange();
    },
    
    clearCache: () => {
        state = { cache: {}, loaded: {} };
        emitChange();
    }
};

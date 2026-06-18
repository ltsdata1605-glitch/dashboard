import WebSocket from 'ws';

const wsUrl = 'ws://127.0.0.1:9222/devtools/page/55F603034DE33A9F5ADCA93DDB05AE27';

const ws = new WebSocket(wsUrl);

ws.on('open', () => {
    console.log("Connected to page debugger!");
    
    // Evaluate script
    const expr = `
        new Promise((resolve, reject) => {
            const request = indexedDB.open('BI_HUB_DATABASE_V2');
            request.onerror = () => reject('DB Open Error');
            request.onsuccess = (e) => {
                const db = e.target.result;
                try {
                    const registryTx = db.transaction(['settings'], 'readonly');
                    const settingsStore = registryTx.objectStore('settings');
                    const getRegistry = settingsStore.get('salesFilesRegistry');
                    
                    getRegistry.onsuccess = () => {
                        const registry = getRegistry.result || [];
                        
                        const appTx = db.transaction(['appStorage'], 'readonly');
                        const appStore = appTx.objectStore('appStorage');
                        const getKeys = appStore.getAllKeys();
                        
                        getKeys.onsuccess = () => {
                            const keys = getKeys.result;
                            resolve({
                                registry,
                                appStorageKeys: keys
                            });
                        };
                        getKeys.onerror = () => {
                            resolve({ registry, appStorageKeys: [] });
                        };
                    };
                    getRegistry.onerror = () => {
                        reject('Registry get error');
                    };
                } catch(err) {
                    reject(err.toString());
                }
            };
        });
    `;
    
    const evalMsg = {
        id: 1,
        method: 'Runtime.evaluate',
        params: {
            expression: expr,
            awaitPromise: true,
            returnByValue: true
        }
    };
    ws.send(JSON.stringify(evalMsg));
});

ws.on('message', (data) => {
    const msg = JSON.parse(data.toString());
    if (msg.id === 1) {
        if (msg.error) {
            console.error("Eval Error:", msg.error);
        } else {
            const result = msg.result?.result?.value;
            console.log("INDEXEDDB DIAGNOSIS RESULT:\n", JSON.stringify(result, null, 2));
        }
        ws.close();
    }
});

ws.on('error', (err) => {
    console.error("WS Connection Error:", err);
});

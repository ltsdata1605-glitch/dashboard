import { exec } from 'child_process';
import http from 'http';
import WebSocket from 'ws';

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getDebuggerUrl() {
    return new Promise((resolve, reject) => {
        http.get('http://127.0.0.1:9222/json/list', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const list = JSON.parse(data);
                    const page = list.find(p => p.type === 'page');
                    if (page && page.webSocketDebuggerUrl) {
                        resolve(page.webSocketDebuggerUrl);
                    } else {
                        resolve(null);
                    }
                } catch (e) {
                    resolve(null);
                }
            });
        }).on('error', (err) => {
            resolve(null);
        });
    });
}

async function run() {
    console.log("Checking if Chrome is running on port 9222...");
    let debuggerUrl = await getDebuggerUrl();
    let chromeProcess = null;
    
    if (!debuggerUrl) {
        console.log("Chrome not running on port 9222. Starting headless Chrome...");
        const chromeCmd = `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --remote-debugging-port=9222 --disable-gpu --user-data-dir=/tmp/chrome-debug-profile`;
        chromeProcess = exec(chromeCmd);
        
        // Wait for Chrome to start
        for (let i = 0; i < 10; i++) {
            await delay(1000);
            debuggerUrl = await getDebuggerUrl();
            if (debuggerUrl) break;
        }
    }
    
    if (!debuggerUrl) {
        console.error("Could not start Chrome or connect to remote debugging port.");
        if (chromeProcess) chromeProcess.kill();
        return;
    }
    
    console.log("Connected to Chrome! Debugger URL:", debuggerUrl);
    
    const ws = new WebSocket(debuggerUrl);
    ws.on('open', async () => {
        console.log("WebSocket connection established. Navigating to http://localhost:5173...");
        
        // Navigate to the local site
        const navigateMsg = {
            id: 1,
            method: 'Page.navigate',
            params: { url: 'http://localhost:5173' }
        };
        ws.send(JSON.stringify(navigateMsg));
    });
    
    ws.on('message', async (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.id === 1) {
            console.log("Navigation triggered. Waiting 3 seconds for page load...");
            await delay(3000);
            
            // Now evaluate JS to read IndexedDB
            console.log("Evaluating script in page to read IndexedDB...");
            const evalMsg = {
                id: 2,
                method: 'Runtime.evaluate',
                params: {
                    expression: `
                        new Promise((resolve, reject) => {
                            const request = indexedDB.open('BI_HUB_DATABASE_V2');
                            request.onerror = () => reject('DB Open Error');
                            request.onsuccess = (e) => {
                                const db = e.target.result;
                                try {
                                    const transaction = db.transaction(['settings'], 'readonly');
                                    const store = transaction.objectStore('settings');
                                    const getKeys = store.getAllKeys();
                                    getKeys.onsuccess = () => {
                                        const keys = getKeys.result;
                                        // Fetch values for interesting keys
                                        const promises = keys.map(k => {
                                            return new Promise(res => {
                                                const getVal = store.get(k);
                                                getVal.onsuccess = () => res({ key: k, value: getVal.result });
                                            });
                                        });
                                        Promise.all(promises).then(resolve);
                                    };
                                } catch(err) {
                                    reject(err.toString());
                                }
                            };
                        });
                    `,
                    awaitPromise: true,
                    returnByValue: true
                }
            };
            ws.send(JSON.stringify(evalMsg));
        } else if (msg.id === 2) {
            if (msg.error) {
                console.error("Evaluation error:", msg.error);
            } else {
                const result = msg.result?.result?.value;
                if (result) {
                    console.log("\nFiltered IndexedDB Database Keys and Values:");
                    result.forEach(item => {
                        const k = item.key;
                        if (k.includes('comptarget') || k.includes('targethero') || k.includes('thidua') || k.includes('supermarket-list') || k.includes('active-supermarkets')) {
                            console.log(`\nKey: ${k}`);
                            console.log(`Value:`, typeof item.value === 'object' ? JSON.stringify(item.value, null, 2) : String(item.value).slice(0, 1000));
                        }
                    });
                } else {
                    console.log("No data returned or empty DB.");
                }
            }
            ws.close();
            if (chromeProcess) chromeProcess.kill();
        }
    });
}

run().catch(console.error);

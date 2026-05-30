import { exec } from 'child_process';
import http from 'http';
import WebSocket from 'ws';

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getDebuggerUrl() {
    return new Promise((resolve) => {
        http.get('http://127.0.0.1:9222/json/list', (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const list = JSON.parse(data);
                    const page = list.find(p => p.type === 'page');
                    resolve(page ? page.webSocketDebuggerUrl : null);
                } catch (e) {
                    resolve(null);
                }
            });
        }).on('error', () => resolve(null));
    });
}

async function run() {
    let debuggerUrl = await getDebuggerUrl();
    if (!debuggerUrl) {
        console.error("Chrome not running.");
        return;
    }
    
    const ws = new WebSocket(debuggerUrl);
    ws.on('open', () => {
        const evalMsg = {
            id: 1,
            method: 'Runtime.evaluate',
            params: {
                expression: `
                    new Promise((resolve, reject) => {
                        const request = indexedDB.open('BI_HUB_DATABASE_V2');
                        request.onsuccess = (e) => {
                            const db = e.target.result;
                            const transaction = db.transaction(['settings'], 'readonly');
                            const store = transaction.objectStore('settings');
                            
                            Promise.all([
                                new Promise(res => {
                                    const req = store.get('bi_competition-luy-ke');
                                    req.onsuccess = () => res(req.result);
                                }),
                                new Promise(res => {
                                    const req = store.get('bi_competition-realtime');
                                    req.onsuccess = () => res(req.result);
                                })
                            ]).then(resolve);
                        };
                    });
                `,
                awaitPromise: true,
                returnByValue: true
            }
        };
        ws.send(JSON.stringify(evalMsg));
    });
    
    ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.id === 1) {
            const [luyKe, realtime] = msg.result?.result?.value || [];
            console.log("=== competition-luy-ke ===");
            console.log(luyKe ? luyKe.slice(0, 2000) : "No luy ke");
            console.log("\n=== competition-realtime ===");
            console.log(realtime ? realtime.slice(0, 2000) : "No realtime");
            ws.close();
        }
    });
}

run().catch(console.error);

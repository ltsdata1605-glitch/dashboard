import puppeteer from 'puppeteer';

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    await page.goto('http://localhost:5173');
    await new Promise(r => setTimeout(r, 2000));

    const result = await page.evaluate(async () => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('dashboard-db');
            request.onerror = event => reject('IDB Error');
            request.onsuccess = event => {
                const db = event.target.result;
                try {
                    const transaction = db.transaction(['keyvaluepairs'], 'readonly');
                    const store = transaction.objectStore('keyvaluepairs');
                    
                    const getReq = store.get('competition-luy-ke');
                    getReq.onsuccess = () => resolve(getReq.result);
                    getReq.onerror = () => reject('Get Error');
                } catch (e) {
                    resolve("Store not found");
                }
            };
        });
    });

    console.log("competition-luy-ke data length:", result ? result.length : 0);
    if (result && typeof result === 'string') {
        console.log("First 10 lines:");
        console.log(result.split('\n').slice(0, 10).join('\n'));
        console.log("Searching for VAS:");
        console.log(result.split('\n').filter(l => l.includes('VAS')));
    }

    // Now get the targets
    const debugTargets = await page.evaluate(() => {
        if (!window.debugEmployeeCompetitionTargets) return "No debug targets";
        return JSON.stringify(Array.from(window.debugEmployeeCompetitionTargets.entries()).map(([k,v]) => [k, Array.from(v.entries())]));
    });
    console.log("Debug Targets:", debugTargets);

    await browser.close();
})();

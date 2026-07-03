const fs = require('fs');
const path = 'hooks/useDataManagement.ts';
let content = fs.readFileSync(path, 'utf8');

// Add unwrapProductConfigProxies import if not there
if (!content.includes('unwrapProductConfigProxies')) {
    content = content.replace(
        /wrapProductConfigWithProxies, cleanAndNormalize } from '\.\.\/utils\/dataUtils';/,
        "wrapProductConfigWithProxies, cleanAndNormalize, unwrapProductConfigProxies } from '../utils/dataUtils';"
    );
}

// Add worker setup if not there
if (!content.includes('workerRef = useRef')) {
    const workerSetup = `
    // Analytics Worker setup
    const workerRef = useRef<Worker | null>(null);

    useEffect(() => {
        // @ts-ignore
        import('../services/analytics.worker?worker').then((WorkerModule) => {
            workerRef.current = new WorkerModule.default();
        });
        return () => {
            if (workerRef.current) workerRef.current.terminate();
        };
    }, []);

    useEffect(() => {
        if (workerRef.current && rbacData.length > 0) {
            workerRef.current.postMessage({ type: 'SET_DATA', payload: rbacData });
        }
    }, [rbacData]);
    
    // Central Data Processing`;
    
    content = content.replace(/\/\/ Central Data Processing/, workerSetup);
}

// Replace setTimeout with worker communication
const filterProcessingRegex = /const timer = setTimeout\(\(\) => \{[\s\S]*?return \(\) => clearTimeout\(timer\);\n    \}, \[.*\]\);/;
const workerProcessing = `
        const handleWorkerMessage = (e: MessageEvent) => {
            const { type, payload } = e.data;
            if (type === 'PROCESS_COMPLETE') {
                const { result, baseFilteredData: newBaseData, warehouseFilteredData: newWarehouseData, calendarSourceData: newCalendarSourceData } = payload;
                setAppState('dashboard');
                setProcessedData(result);
                setBaseFilteredData(newBaseData);
                setWarehouseFilteredData(newWarehouseData);
                setCalendarSourceData(newCalendarSourceData);
                setEmployeeAnalysisData(result.employeeData);
                setIsFilterProcessing(false);
            } else if (type === 'PROCESS_ERROR') {
                console.error("Lỗi khi xử lý lại dữ liệu:", payload);
                setStatus({ message: payload, type: 'error', progress: 0 });
                setAppState('upload');
                setIsFilterProcessing(false);
            }
        };

        if (workerRef.current) {
            workerRef.current.onmessage = handleWorkerMessage;
            workerRef.current.postMessage({ 
                type: 'PROCESS', 
                payload: { 
                    productConfig: productConfig ? unwrapProductConfigProxies(productConfig) : null, 
                    filterState, 
                    departmentMap, 
                    isDeduplicationEnabled: false 
                } 
            });
        }
    }, [productConfig, filterState, departmentMap, setStatus, appState, setAppState]);`;

content = content.replace(filterProcessingRegex, workerProcessing);

// Fix the undefined cloudItem bug
content = content.replace(
    /if \(localValue === null \|\| cloudTime > localTime\) {/g,
    "if (cloudItem && (localValue === null || cloudTime > localTime)) {"
);

fs.writeFileSync(path, content);

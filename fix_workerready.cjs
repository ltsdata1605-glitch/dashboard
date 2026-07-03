const fs = require('fs');
const path = 'hooks/useDataManagement.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
    /const workerRef = useRef<Worker \| null>\(null\);/g,
    "const workerRef = useRef<Worker | null>(null);\n    const [workerReady, setWorkerReady] = useState(false);"
);

content = content.replace(
    /workerRef\.current = new WorkerModule\.default\(\);/g,
    "workerRef.current = new WorkerModule.default();\n            setWorkerReady(true);"
);

content = content.replace(
    /useEffect\(\(\) => {\n\s+if \(workerRef\.current && rbacData\.length > 0\)/g,
    "useEffect(() => {\n        if (workerRef.current && rbacData.length > 0 && workerReady)"
);

content = content.replace(
    /}, \[rbacData\]\);/g,
    "}, [rbacData, workerReady]);"
);

fs.writeFileSync(path, content);

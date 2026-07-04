const fs = require('fs');
const path = 'components/employees/performance/PerformanceSingleTable.tsx';
let content = fs.readFileSync(path, 'utf8');

// We add a state to limit rendering
const targetRenderInit = "const dataToRender = groupType === 'vuotTroi' ? outstandingData : groupedData;";
const replacementRenderInit = `const dataToRender = groupType === 'vuotTroi' ? outstandingData : groupedData;

    const [renderLimit, setRenderLimit] = useState(20);

    // Optimize lag by lazy rendering
    React.useEffect(() => {
        if (isExporting) {
            setRenderLimit(99999);
            return;
        }
        setRenderLimit(20);
        const timer = setTimeout(() => {
            setRenderLimit(99999);
        }, 150);
        return () => clearTimeout(timer);
    }, [dataToRender, isExporting, groupType]);`;

if (!content.includes('setRenderLimit')) {
    content = content.replace(targetRenderInit, replacementRenderInit);
}

// Now replace the loop. The loop is Object.entries(dataToRender).map(([dept, employees]: [string, any], deptIdx) => {
// We need to limit the employees array mapped
const targetLoop = `                        {Object.entries(dataToRender).map(([dept, employees]: [string, any], deptIdx) => {
                            if (!Array.isArray(employees)) return null;
                            const dc = DEPT_COLORS[deptIdx % DEPT_COLORS.length];`;

const replacementLoop = `                        {Object.entries(dataToRender).map(([dept, employees]: [string, any], deptIdx) => {
                            if (!Array.isArray(employees)) return null;
                            const dc = DEPT_COLORS[deptIdx % DEPT_COLORS.length];
                            
                            // Apply render limit to avoid freezing the browser on tab switch
                            const visibleEmployees = isExporting ? employees : employees.slice(0, renderLimit);
`;

if (!content.includes('visibleEmployees')) {
    content = content.replace(targetLoop, replacementLoop);
}

// Then we have to replace the `employees.map((emp: any, idx: number) => {`
content = content.replace(
    /\{employees\.map\(\(emp: any, idx: number\) => \{/g,
    "{visibleEmployees.map((emp: any, idx: number) => {"
);

fs.writeFileSync(path, content);

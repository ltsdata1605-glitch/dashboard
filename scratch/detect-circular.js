import fs from 'fs';
import path from 'path';

const BASE_DIR = '/Users/dangkhoa/Downloads/Vide Coding/dashboardycx';
const EXCLUDE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '.gemini']);

const fileExtensions = ['.ts', '.tsx', '.js', '.jsx'];
const dependencyGraph = new Map();

function resolveImportPath(currentFile, importPath) {
    if (!importPath.startsWith('.')) {
        return null; // Ignore third-party packages
    }
    const currentDir = path.dirname(currentFile);
    let resolved = path.resolve(currentDir, importPath);

    // Try extensions
    for (const ext of fileExtensions) {
        if (fs.existsSync(resolved + ext) && fs.statSync(resolved + ext).isFile()) {
            return resolved + ext;
        }
    }
    
    // Try index files
    for (const ext of fileExtensions) {
        const indexFile = path.join(resolved, 'index' + ext);
        if (fs.existsSync(indexFile) && fs.statSync(indexFile).isFile()) {
            return indexFile;
        }
    }

    if (fs.existsSync(resolved) && fs.statSync(resolved).isFile()) {
        return resolved;
    }

    return null;
}

function parseImports(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const imports = [];
    
    // Match: import ... from 'path';
    // Match: import 'path';
    const importRegex = /import\s+(?:[\w*\s{},]*\s+from\s+)?['"]([^'"]+)['"]/g;
    let match;
    while ((match = importRegex.exec(content)) !== null) {
        imports.push(match[1]);
    }

    // Match: import('path')
    const dynamicImportRegex = /import\(['"]([^'"]+)['"]\)/g;
    while ((match = dynamicImportRegex.exec(content)) !== null) {
        imports.push(match[1]);
    }

    return imports;
}

function traverseDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (!EXCLUDE_DIRS.has(file)) {
                traverseDirectory(fullPath);
            }
        } else if (fileExtensions.some(ext => file.endsWith(ext))) {
            const imports = parseImports(fullPath);
            const resolvedImports = [];
            for (const imp of imports) {
                const resolved = resolveImportPath(fullPath, imp);
                if (resolved) {
                    resolvedImports.push(resolved);
                }
            }
            dependencyGraph.set(fullPath, resolvedImports);
        }
    }
}

console.log('Scanning files...');
traverseDirectory(BASE_DIR);
console.log(`Scanned ${dependencyGraph.size} files.`);

// Find cycles
const visited = new Set();
const stack = new Set();
const cycles = [];

function findCyclesDFS(node, pathTrace = []) {
    if (stack.has(node)) {
        const cycleStartIndex = pathTrace.indexOf(node);
        const cycle = pathTrace.slice(cycleStartIndex);
        cycle.push(node);
        cycles.push(cycle);
        return;
    }
    if (visited.has(node)) return;

    visited.add(node);
    stack.add(node);
    pathTrace.push(node);

    const neighbors = dependencyGraph.get(node) || [];
    for (const neighbor of neighbors) {
        findCyclesDFS(neighbor, [...pathTrace]);
    }

    stack.delete(node);
}

for (const file of dependencyGraph.keys()) {
    findCyclesDFS(file);
}

if (cycles.length === 0) {
    console.log('No circular dependencies found!');
} else {
    console.log(`Found ${cycles.length} circular dependencies:`);
    cycles.forEach((cycle, index) => {
        console.log(`\nCycle #${index + 1}:`);
        console.log(cycle.map(f => path.relative(BASE_DIR, f)).join(' -> '));
    });
}

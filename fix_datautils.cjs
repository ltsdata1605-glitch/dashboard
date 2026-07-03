const fs = require('fs');
const path = 'utils/dataUtils.ts';
let content = fs.readFileSync(path, 'utf8');

// Add __target to proxy get
content = content.replace(
    /if \(prop === '__isProxy'\) return true;/g,
    "if (prop === '__isProxy') return true;\n                if (prop === '__target') return target;"
);

// Add unwrapProductConfigProxies
const unwrapFunc = `
export function unwrapProductConfigProxies(config: ProductConfig): ProductConfig {
    if (!config) return config;
    if (!(config.childToParentMap as any)?.__isProxy) return config;

    return {
        ...config,
        childToParentMap: (config.childToParentMap as any).__target || config.childToParentMap,
        childToSubgroupMap: (config.childToSubgroupMap as any).__target || config.childToSubgroupMap
    };
}
`;

content += unwrapFunc;
fs.writeFileSync(path, content);

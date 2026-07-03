const fs = require('fs');
const path = 'hooks/useDataManagement.ts';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
    /wrapProductConfigWithProxies, cleanAndNormalize } from '\.\.\/utils\/dataUtils';/,
    "wrapProductConfigWithProxies, cleanAndNormalize, unwrapProductConfigProxies } from '../utils/dataUtils';"
);

content = content.replace(
    /payload: {\s+productConfig,\s+filterState,\s+departmentMap,\s+isDeduplicationEnabled: false\s+}/,
    "payload: { productConfig: productConfig ? unwrapProductConfigProxies(productConfig) : null, filterState, departmentMap, isDeduplicationEnabled: false }"
);

fs.writeFileSync(path, content);

// Offline execution of the original message handler with fake UI/storage.
// No browser/network/production data. Does not prove deployed framing/COOP policy.
const fs = require('node:fs');
const vm = require('node:vm');
const { stripTypeScriptTypes } = require('node:module');
const source = fs.readFileSync((process.env.PROJECT_DIR || '/workspace/project-audit/dashboard-main') + '/components/views/CheckThuongView.tsx', 'utf8');
const start = source.indexOf('const handleMessage =');
const end = source.indexOf('// Tự động áp dụng bản Cloud mới', start);
const handlerSource = stripTypeScriptTypes(source.slice(start, end).trim(), { mode: 'transform' });
const saved = [];
const trustedFrame = {};
const context = vm.createContext({
  setHasData: () => {}, setCodes: () => {}, setCompetitionData: () => {},
  setFileName: () => {}, setUploadTime: () => {},
  saveSettingOrThrow: async (key, value) => saved.push({ key, value }),
  getUnifiedCheckThuongData: async () => null,
  iframeRef: { current: { contentWindow: trustedFrame } },
  window: { location: { origin: 'https://dashboard.example.test' } },
  toast: { error: () => {} }, console, Date,
});
vm.runInContext(handlerSource + '\nglobalThis.handler = handleMessage;', context);
context.handler({ origin: 'https://untrusted.example.test', source: {}, data: {
  type: 'CHECK_THUONG_STATE_CHANGED',
  payload: { competitionData: [['FAKE_OFFLINE_TAMPER']], fileName: 'fake.xlsx', lastModified: 9999999999999 },
} });
const result = {
  scope: 'Original message handler with fake UI/storage, no browser or network',
  untrustedOriginAccepted: saved.length === 1,
  saved,
  limitations: 'Browser exploit requires attacker to hold window reference (parent/opener/frame) and CheckThuongView listener mounted. Deployed CSP/COOP/framing policy was not checked. Does not demonstrate data exfiltration; reply targets app iframe, not sender.',
};
fs.writeFileSync(require('node:path').join(__dirname, 'check-thuong-message-results.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
if (!result.untrustedOriginAccepted) process.exitCode = 1;

/* Audit harness: executes ORIGINAL callable bodies offline with fake Auth/Firestore.
 * Never opens a network connection or loads Firebase SDK. All identities are fictitious.
 * This proves code-path behavior, not production deployment/configuration.
 */
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { stripTypeScriptTypes } = require('node:module');
const root = process.env.PROJECT_DIR || '/workspace/project-audit/dashboard-main';

class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
class Timestamp {
  constructor(date) { this.date = date; }
  toDate() { return this.date; }
  static fromDate(date) { return new Timestamp(date); }
  static now() { return new Timestamp(new Date()); }
}
const FieldValue = {
  serverTimestamp: () => Timestamp.now(),
  increment: value => ({ increment: value }),
  delete: () => ({ deleted: true }),
};
const onCall = (...args) => args.at(-1);
const onSchedule = (...args) => args.at(-1);

function environment(seedUsers = [], seedRecords = []) {
  const docs = new Map(seedUsers.map(user => [`users/${user.uid}`, { ...user }]));
  const accounts = new Map(seedRecords.map(user => [user.uid, { ...user }]));
  const claims = new Map();
  const events = [];
  function apply(existing, update) {
    for (const [key, value] of Object.entries(update)) {
      if (value && value.deleted) delete existing[key];
      else if (value && value.increment) existing[key] = (existing[key] || 0) + value.increment;
      else existing[key] = value;
    }
    return existing;
  }
  function docRef(key) {
    return {
      async get() {
        const data = docs.get(key);
        return { exists: !!data, data: () => data, get: field => data?.[field] };
      },
      async set(value, options) {
        docs.set(key, options?.merge ? apply(docs.get(key) || {}, value) : { ...value });
        events.push({ operation: 'set', key });
        return {};
      },
      async update(value) {
        if (!docs.has(key)) throw Error('Document not found: ' + key);
        apply(docs.get(key), value);
        events.push({ operation: 'update', key });
        return {};
      },
      async delete() { docs.delete(key); events.push({ operation: 'delete', key }); },
    };
  }
  function collection(name, filters = [], max = Infinity) {
    return {
      doc: uid => docRef(`${name}/${uid}`),
      where: (field, operator, value) => collection(name, [...filters, [field, operator, value]], max),
      limit: value => collection(name, filters, value),
      async get() {
        const selected = [...docs.entries()].filter(([key, data]) => key.startsWith(name + '/') && filters.every(([field, op, value]) => op === '==' ? data[field] === value : true)).slice(0, max);
        return { empty: selected.length === 0, docs: selected.map(([key, data]) => ({ id: key.split('/').at(-1), data: () => data, get: field => data[field], ref: docRef(key) })) };
      },
    };
  }
  const db = { collection, batch: () => ({ update: () => {}, delete: () => {}, commit: async () => {} }) };
  const auth = {
    async getUserByEmail(email) {
      const account = [...accounts.values()].find(a => a.email === email);
      if (!account) { const error = Error('User not found'); error.code = 'auth/user-not-found'; throw error; }
      return { ...account };
    },
    async updateUser(uid, update) {
      apply(accounts.get(uid), update);
      events.push({ operation: 'updateAuth', uid, fields: Object.keys(update) });
    },
    async createUser(input) {
      const user = { ...input, uid: `fake-new-${accounts.size}` };
      accounts.set(user.uid, user); return user;
    },
    async setCustomUserClaims(uid, update) {
      claims.set(uid, { ...update });
      events.push({ operation: 'replaceClaims', uid, claims: { ...update } });
    },
    async createCustomToken(uid) { events.push({ operation: 'mintCustomToken', uid }); return `OFFLINE_FAKE_CUSTOM_TOKEN_FOR_${uid}`; },
  };
  return { db, auth, docs, accounts, claims, events };
}

function load(relativePath, names, env) {
  let code = stripTypeScriptTypes(fs.readFileSync(path.join(root, relativePath), 'utf8'), { mode: 'transform' });
  code = code.replace(/^import\s[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '').replace(/^export\s+/gm, '');
  code += `\n;globalThis.handlers = { ${names.join(', ')} };`;
  const context = vm.createContext({
    ...env, stickerDb: env.db, onCall, onSchedule, HttpsError, FieldValue, Timestamp,
    normalizeSuperAdminDept: () => 'ALL (Super Admin)',
    notifyUser: async () => {}, notifyAdminsAndManagers: async () => {},
    console, setTimeout, clearTimeout, Date, Promise,
  });
  vm.runInContext(code, context, { filename: relativePath });
  return context.handlers;
}

(async () => {
  const results = [];
  // Existing privileged Auth account can be overwritten without authentication.
  const takeoverEnv = environment([], [{ uid: 'victim-admin', email: 'victim-admin@example.test', password: 'FAKE_STRONG_SECRET' }]);
  takeoverEnv.docs.set('stickerUsers/existing-store-admin', { uid: 'existing-store-admin', username: 'legit-admin', storeId: 'LAB', role: 'admin' });
  takeoverEnv.docs.set('stickerUsers/victim-admin', { uid: 'victim-admin', username: 'victim-admin@example.test', storeId: 'LAB', role: 'admin' });
  const takeover = load('functions/src/stickerEvent.ts', ['stickerStaffAuth'], takeoverEnv);
  const response = await takeover.stickerStaffAuth({ auth: undefined, data: { username: 'victim-admin@example.test', storeId: 'LAB', isLogin: false } });
  results.push({ finding: 'AUTH-01', pass: response.customToken.includes('victim-admin') && takeoverEnv.accounts.get('victim-admin').password !== 'FAKE_STRONG_SECRET', observed: 'Unauthenticated registration changed existing admin Auth password, demoted sticker profile and minted token for victim UID.', events: takeoverEnv.events });

  // Caller controls privileged username independently of verified identity.
  const privilegeEnv = environment();
  const privilege = load('functions/src/stickerEvent.ts', ['stickerRegister'], privilegeEnv);
  await privilege.stickerRegister({ auth: { uid: 'ordinary-attacker', token: { email: 'ordinary@example.test' } }, data: { username: 'admin', storeId: 'LABNEW', requestedRole: 'admin' } });
  results.push({ finding: 'AUTH-02', pass: privilegeEnv.claims.get('ordinary-attacker').stickerRole === 'superadmin', observed: 'Ordinary authenticated identity received superadmin by supplying reserved username.', events: privilegeEnv.events });

  // Revocation button sends only status, server preserves role/warehouse claims.
  const revokeEnv = environment([{ uid: 'lab-manager', role: 'manager', status: 'approved', departmentId: 'LAB' }]);
  const adminHandlers = load('functions/src/admin.ts', ['adminUpdateUser'], revokeEnv);
  await adminHandlers.adminUpdateUser({ auth: { uid: 'lab-admin', token: { role: 'admin' } }, data: { targetUid: 'lab-manager', status: 'expired' } });
  const sessionHandlers = load('functions/src/session.ts', ['resolveSession', 'requestAccess'], revokeEnv);
  const revokedProfile = await sessionHandlers.resolveSession({ auth: { uid: 'lab-manager', token: { email: 'lab-manager@example.test' } }, data: {} });
  results.push({ finding: 'AUTH-05', pass: revokedProfile.role === 'manager' && revokedProfile.status === 'expired' && revokeEnv.claims.get('lab-manager').role === 'manager', observed: 'After revoke and fresh resolveSession, status is expired but role remains manager and department claim LAB remains authorized.', events: revokeEnv.events });

  // Root and sticker namespace claims overwrite each other, despite distinct names.
  const claimsEnv = environment([{ uid: 'dual-zone', role: 'manager', status: 'approved', departmentId: 'LAB' }]);
  claimsEnv.docs.set('stickerUsers/dual-zone', { uid: 'dual-zone', username: 'dual-zone', storeId: 'LAB', role: 'staff' });
  const rootSession = load('functions/src/session.ts', ['resolveSession'], claimsEnv);
  const stickerSession = load('functions/src/stickerEvent.ts', ['stickerResolveSession'], claimsEnv);
  await rootSession.resolveSession({ auth: { uid: 'dual-zone', token: { email: 'dual-zone@example.test' } }, data: {} });
  await stickerSession.stickerResolveSession({ auth: { uid: 'dual-zone', token: { email: 'dual-zone@example.test' } }, data: {} });
  const erasedRoot = claimsEnv.claims.get('dual-zone').role === undefined;
  await rootSession.resolveSession({ auth: { uid: 'dual-zone', token: { email: 'dual-zone@example.test' } }, data: {} });
  results.push({ finding: 'AUTH-06', pass: erasedRoot && claimsEnv.claims.get('dual-zone').stickerRole === undefined, observed: 'Sticker resolve erased root claims; root resolve erased sticker claims.', events: claimsEnv.events });

  // Unapproved request includes arbitrary warehouse in server-issued claims.
  const pendingEnv = environment([{ uid: 'new-user', role: 'pending', status: 'new', departmentId: '' }]);
  const pendingSession = load('functions/src/session.ts', ['requestAccess', 'resolveSession'], pendingEnv);
  const pendingAuth = { uid: 'new-user', token: { email: 'new-user@example.test' } };
  await pendingSession.requestAccess({ auth: pendingAuth, data: { requestedRole: 'employee', departmentId: 'UNAPPROVED_WAREHOUSE' } });
  await pendingSession.resolveSession({ auth: pendingAuth, data: {} });
  results.push({ finding: 'AUTH-03', pass: pendingEnv.claims.get('new-user').departmentId === 'UNAPPROVED_WAREHOUSE' && pendingEnv.claims.get('new-user').role === 'pending', observed: 'Unapproved user receives arbitrary requested department in issued claims. Rules allow signed-in users with matching department to read khoData/biData (static analysis; emulator not executed).', events: pendingEnv.events });

  const output = { scope: 'Original callable bodies, mocked Auth/Firestore, zero production calls', limitations: 'Does not test deployed code, actual Firebase rules engine, IAM, token verification or real browsers.', results };
  fs.writeFileSync(require('node:path').join(__dirname, 'auth-offline-results.json'), JSON.stringify(output, null, 2) + '\n');
  console.log(JSON.stringify(output, null, 2));
  if (results.some(result => !result.pass)) process.exitCode = 1;
})().catch(error => { console.error(error); process.exitCode = 1; });

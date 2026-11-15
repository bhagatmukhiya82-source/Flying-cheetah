const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = 'c:/AUTOMATION BUSSNIESS/flying-cheetah';
const content = fs.readFileSync(path.join(root, 'js', 'auth.js'), 'utf8');

const win = {
  window: {},
  location: { hostname: 'localhost', pathname: '/', search: '', hash: '' },
  FC_BACKEND: {
    getClient: () => ({
      auth: {
        getSession: async () => ({ data: { session: null } }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
      }
    }),
    getConfig: () => ({ ADMIN_EMAILS: [] })
  },
  document: {
    addEventListener: () => {},
    getElementById: (id) => ({
      classList: { add: ()=>{}, remove: ()=>{} },
      style: {},
      addEventListener: () => {}
    }),
    querySelectorAll: () => [],
    createElement: () => ({ style: {}, classList: { add: ()=>{}, remove: ()=>{} }, setAttribute: ()=>{} }),
    body: { appendChild: ()=>{}, classList: { add: ()=>{}, remove: ()=>{} } }
  },
  localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  sessionStorage: { getItem: () => null, setItem: () => {} },
  CustomEvent: function() {},
  dispatchEvent: () => {},
  console: console
};
win.window = win;
vm.runInNewContext(content, win);

console.log('Testing FC_AUTH runtime modal operations:');

const tests = [
  { name: 'openProfileModal()', run: () => win.FC_AUTH.openProfileModal() },
  { name: 'openAuthModal("signin")', run: () => win.FC_AUTH.openAuthModal('signin') },
  { name: 'openAuthModal("profile")', run: () => win.FC_AUTH.openAuthModal('profile') },
  { name: 'switchTab("signin")', run: () => win.FC_AUTH.switchTab('signin') },
  { name: 'switchTab("profile")', run: () => win.FC_AUTH.switchTab('profile') },
  { name: 'switchTab("security")', run: () => win.FC_AUTH.switchTab('security') },
  { name: 'populateAuthModalProfileForm()', run: () => win.FC_AUTH.populateAuthModalProfileForm() },
  { name: 'populateSecurityView()', run: () => win.FC_AUTH.populateSecurityView() }
];

let failed = 0;
for (const t of tests) {
  try {
    t.run();
    console.log(`  PASS: ${t.name}`);
  } catch (err) {
    console.error(`  FAIL: ${t.name} -> ${err.name}: ${err.message}`);
    failed++;
  }
}

console.log(`Total tests: ${tests.length}, Failed: ${failed}`);
if (failed > 0) process.exit(1);

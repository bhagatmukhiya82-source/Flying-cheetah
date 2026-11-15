const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = 'c:/AUTOMATION BUSSNIESS/flying-cheetah';

console.log('=== Auth Modularization & Facade Stress Test ===');

const authDir = path.join(root, 'js', 'auth');
const modularFiles = [
  'auth-validation.js',
  'auth-profile.js',
  'auth-core.js',
  'auth-modal.js'
];

for (const f of modularFiles) {
  const p = path.join(authDir, f);
  if (!fs.existsSync(p)) {
    console.error(`FAIL: Missing modular file ${f}`);
    process.exit(1);
  }
  const stat = fs.statSync(p);
  console.log(`Modular file ${f}: ${stat.size} bytes`);
}

// Create a realistic DOM & browser environment
const createMockWindow = () => {
  const listeners = {};
  const mockStorage = {
    _data: {},
    getItem(k) { return this._data[k] || null; },
    setItem(k, v) { this._data[k] = String(v); },
    removeItem(k) { delete this._data[k]; },
    clear() { this._data = {}; }
  };

  const win = {
    location: {
      hostname: 'localhost',
      pathname: '/',
      search: '',
      hash: '',
      reload: () => {}
    },
    localStorage: mockStorage,
    sessionStorage: Object.assign({}, mockStorage, { _data: {} }),
    document: {
      addEventListener: (event, fn) => {
        listeners[event] = listeners[event] || [];
        listeners[event].push(fn);
      },
      getElementById: (id) => null,
      querySelectorAll: (sel) => [],
      querySelector: (sel) => null,
      createElement: (tag) => ({
        style: {},
        classList: { add: () => {}, remove: () => {}, contains: () => false },
        setAttribute: () => {},
        appendChild: () => {}
      }),
      body: {
        appendChild: () => {},
        removeChild: () => {},
        classList: { add: () => {}, remove: () => {} }
      }
    },
    CustomEvent: function(name, opts) { this.name = name; this.detail = opts ? opts.detail : null; },
    dispatchEvent: () => true,
    FC_BACKEND: {
      getClient: () => ({
        auth: {
          getSession: async () => ({ data: { session: null } }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
          signInWithPassword: async () => ({ data: {}, error: null }),
          signInWithOtp: async () => ({ data: {}, error: null }),
          signOut: async () => ({ error: null })
        }
      }),
      getConfig: () => ({ ADMIN_EMAILS: ['founder@flyingcheetah.in'] })
    },
    alert: () => {},
    console: console
  };
  win.window = win;
  return win;
};

const win = createMockWindow();

// 1. Load js/auth.js in context
const authJsCode = fs.readFileSync(path.join(root, 'js', 'auth.js'), 'utf8');
vm.runInNewContext(authJsCode, win);

console.log('window.FC_AUTH defined:', typeof win.FC_AUTH === 'object');

const expectedMethods = [
  'openAuthModal',
  'openTrialModal',
  'closeAuthModal',
  'openForgotPasswordModal',
  'closeForgotPasswordModal',
  'openProfileModal',
  'closeProfileModal',
  'getMerchantProfile',
  'hasSavedMerchantProfile',
  'saveMerchantProfile',
  'openGoogleEmailModal',
  'closeGoogleEmailModal',
  'openMandatoryPhoneModal',
  'closeMandatoryPhoneModal',
  'checkMandatoryPhoneRequirement',
  'completeGoogleEmailSignIn',
  'switchTab',
  'signInWithGoogle',
  'signInWithMagicLink',
  'signOut',
  'getUser',
  'getProfile',
  'syncNavbarUI',
  'syncModalTabVisibility',
  'evaluatePassword',
  'sanitizePhone',
  'validatePhone',
  'formatPhoneDisplay'
];

let missing = [];
for (const m of expectedMethods) {
  if (typeof win.FC_AUTH[m] !== 'function') {
    missing.push(m);
  }
}

console.log('Expected methods total:', expectedMethods.length, 'Missing:', missing.length);
if (missing.length > 0) {
  console.error('FAIL: Missing methods:', missing);
  process.exit(1);
}

// 2. Test Phone Validation & Sanitization
console.log('Testing sanitizePhone & validatePhone:');
const clean1 = win.FC_AUTH.sanitizePhone('9820012345');
const valid1 = win.FC_AUTH.validatePhone('9820012345');
console.log('  9820012345 -> sanitize:', clean1, 'validate:', valid1);

const clean2 = win.FC_AUTH.sanitizePhone('+91 98200-12345');
const valid2 = win.FC_AUTH.validatePhone('+91 98200-12345');
console.log('  +91 98200-12345 -> sanitize:', clean2, 'validate:', valid2);

const validBad = win.FC_AUTH.validatePhone('12345');
console.log('  12345 -> validate:', validBad);

if (!valid1 || !valid2 || validBad) {
  console.error('FAIL: Phone validation logic faulty!');
  process.exit(1);
}

// 3. Test Merchant Profile Storage
console.log('Testing Merchant Profile API:');
const profileBefore = win.FC_AUTH.getMerchantProfile();
console.log('  hasSavedMerchantProfile before save:', win.FC_AUTH.hasSavedMerchantProfile());

win.FC_AUTH.saveMerchantProfile({
  merchant_name: 'Test Store',
  merchant_upi_id: 'merchant@okaxis',
  merchant_phone: '+919820012345'
});

const profileAfter = win.FC_AUTH.getMerchantProfile();
console.log('  hasSavedMerchantProfile after save:', win.FC_AUTH.hasSavedMerchantProfile());
console.log('  Saved profile:', profileAfter);

if (profileAfter.merchant_upi_id !== 'merchant@okaxis' || !win.FC_AUTH.hasSavedMerchantProfile()) {
  console.error('FAIL: Merchant profile persistence broken!');
  process.exit(1);
}

console.log('Auth Facade Stress Test: ALL CHECKS PASSED!');

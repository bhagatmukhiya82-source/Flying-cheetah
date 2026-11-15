/**
 * CHALLENGER 2: EMPIRICAL ADVERSARIAL STRESS TEST SUITE FOR MILESTONE 2
 * Scope: Comprehensive Frontend Modernization & Performance
 *
 * Targets:
 * 1. window.FC_AUTH 28 Methods Isolated Adversarial Testing (Edge cases, malicious inputs, null safety, persistence, modal bindings)
 * 2. Hardcoded VPA & Payment Security Scan (flyingcheetah@hdfcbank & upi:// audit)
 * 3. Service Page CTA Audit Modal Integration (15 dedicated service pages)
 */

const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT_DIR = path.resolve(__dirname, '..');

const results = {
    total: 0,
    passed: 0,
    failed: 0,
    findings: []
};

function logPass(name) {
    results.total++;
    results.passed++;
    console.log(`  [PASS] ${name}`);
}

function logFail(name, err) {
    results.total++;
    results.failed++;
    results.findings.push({ name, error: err.message });
    console.error(`  [DEFECT CONFIRMED] ${name}: ${err.message}`);
}

function test(name, fn) {
    try {
        fn();
        logPass(name);
    } catch (err) {
        logFail(name, err);
    }
}

async function testAsync(name, fn) {
    try {
        await fn();
        logPass(name);
    } catch (err) {
        logFail(name, err);
    }
}

function createMockBrowser(options = {}) {
    const storageStore = new Map();
    const sessionStorageStore = new Map();

    const mockElement = (id = '') => {
        const classListSet = new Set(['hidden', 'opacity-0']);
        return {
            id,
            tagName: 'DIV',
            type: 'text',
            value: '',
            textContent: '',
            innerHTML: '',
            classList: {
                add: (...cls) => cls.forEach(c => classListSet.add(c)),
                remove: (...cls) => cls.forEach(c => classListSet.delete(c)),
                contains: (c) => classListSet.has(c),
                toggle: (c) => classListSet.has(c) ? classListSet.delete(c) : classListSet.add(c)
            },
            setAttribute: () => {},
            getAttribute: () => null,
            appendChild: () => {},
            removeChild: () => {},
            addEventListener: () => {},
            removeEventListener: () => {},
            insertAdjacentHTML: () => {},
            style: {}
        };
    };

    const elements = new Map();

    const mockDoc = {
        getElementById: (id) => {
            if (options.emptyDom) return null;
            if (!elements.has(id)) {
                elements.set(id, mockElement(id));
            }
            return elements.get(id);
        },
        querySelectorAll: () => [],
        querySelector: (sel) => options.emptyDom ? null : mockElement(sel),
        createElement: (tag) => mockElement(tag),
        addEventListener: () => {},
        body: mockElement('body')
    };

    const mockWindow = {
        location: {
            hostname: 'localhost',
            port: '8000',
            pathname: '/',
            search: '',
            hash: '',
            href: 'http://localhost:8000/'
        },
        document: mockDoc,
        localStorage: {
            getItem: (k) => storageStore.has(k) ? storageStore.get(k) : null,
            setItem: (k, v) => storageStore.set(k, String(v)),
            removeItem: (k) => storageStore.delete(k),
            clear: () => storageStore.clear()
        },
        sessionStorage: {
            getItem: (k) => sessionStorageStore.has(k) ? sessionStorageStore.get(k) : null,
            setItem: (k, v) => sessionStorageStore.set(k, String(v)),
            removeItem: (k) => sessionStorageStore.delete(k),
            clear: () => sessionStorageStore.clear()
        },
        CustomEvent: function (type, detail) {
            this.type = type;
            this.detail = detail;
        },
        dispatchEvent: () => true,
        addEventListener: () => {},
        removeEventListener: () => {},
        setTimeout: setTimeout,
        clearTimeout: clearTimeout,
        setInterval: setInterval,
        clearInterval: clearInterval,
        console: console,
        Date: Date,
        Math: Math,
        JSON: JSON,
        RegExp: RegExp,
        Promise: Promise,
        Buffer: Buffer,
        FC_BACKEND: {
            getClient: () => ({
                auth: {
                    getSession: async () => ({ data: { session: null } }),
                    onAuthStateChange: () => {}
                }
            }),
            getConfig: () => ({ ADMIN_EMAILS: ['flyingcheetah.agency@gmail.com'] })
        }
    };

    mockWindow.window = mockWindow;
    mockWindow.globalThis = mockWindow;

    return { mockWindow, storageStore, elements };
}

function loadAuthFacade(mockWindow) {
    const authCode = fs.readFileSync(path.join(ROOT_DIR, 'js', 'auth.js'), 'utf8');
    vm.runInNewContext(authCode, mockWindow);
    return mockWindow.FC_AUTH;
}

async function runAdversarialSuite() {
    console.log('================================================================');
    console.log('CHALLENGER 2: EMPIRICAL ADVERSARIAL STRESS TEST SUITE (M2)');
    console.log('Root Directory:', ROOT_DIR);
    console.log('================================================================\n');

    // =========================================================================
    // SECTION 1: window.FC_AUTH 28 Methods Isolated Adversarial Testing
    // =========================================================================
    console.log('--- SECTION 1: window.FC_AUTH 28 Methods Adversarial Testing ---');

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

    test('window.FC_AUTH exports all 28 expected methods as functions', () => {
        const { mockWindow } = createMockBrowser();
        const FC_AUTH = loadAuthFacade(mockWindow);
        assert.ok(FC_AUTH, 'window.FC_AUTH must be defined');

        const missing = expectedMethods.filter(m => typeof FC_AUTH[m] !== 'function');
        assert.strictEqual(missing.length, 0, `Missing methods: ${missing.join(', ')}`);
        assert.strictEqual(expectedMethods.length, 28, 'Must test exactly 28 methods');
    });

    test('DEFECT CHECK: window.FC_AUTH missing signInWithPassword defined in PROJECT.md', () => {
        const { mockWindow } = createMockBrowser();
        const FC_AUTH = loadAuthFacade(mockWindow);
        assert.strictEqual(
            typeof FC_AUTH.signInWithPassword,
            'function',
            'PROJECT.md Line 70 specifies signInWithPassword on window.FC_AUTH, but it is undefined'
        );
    });

    // 1.1 Phone Sanitization Adversarial Stress
    console.log('\n  >> 1.1 Phone Sanitization Adversarial Tests');

    test('sanitizePhone handles standard valid phone numbers properly', () => {
        const { mockWindow } = createMockBrowser();
        const FC_AUTH = loadAuthFacade(mockWindow);

        assert.strictEqual(FC_AUTH.sanitizePhone('9820012345'), '+919820012345');
        assert.strictEqual(FC_AUTH.sanitizePhone('+919820012345'), '+919820012345');
        assert.strictEqual(FC_AUTH.sanitizePhone('09820012345'), '+919820012345');
        assert.strictEqual(FC_AUTH.sanitizePhone('00919820012345'), '+919820012345');
        assert.strictEqual(FC_AUTH.sanitizePhone('919820012345'), '+919820012345');
        assert.strictEqual(FC_AUTH.sanitizePhone('+91 (0) 98200-12345'), '+919820012345');
        assert.strictEqual(FC_AUTH.sanitizePhone('+1 (555) 234-5678'), '+15552345678');
    });

    test('sanitizePhone handles null, empty, symbols, and malicious payloads defensively without throwing', () => {
        const { mockWindow } = createMockBrowser();
        const FC_AUTH = loadAuthFacade(mockWindow);

        const edgeCases = [
            null,
            undefined,
            '',
            '    ',
            'abc',
            '!@#$%^&*()_+',
            '<script>alert("xss")</script>',
            "'; DROP TABLE users; --",
            '0000000000',
            1234567890,
            {},
            [],
            true,
            false,
            '9'.repeat(1000)
        ];

        for (const input of edgeCases) {
            let res;
            assert.doesNotThrow(() => {
                res = FC_AUTH.sanitizePhone(input);
            }, `sanitizePhone threw error on input: ${JSON.stringify(input)}`);
            assert.ok(typeof res === 'string' || res === input);
        }
    });

    // 1.2 Phone Validation Adversarial Stress
    console.log('\n  >> 1.2 Phone Validation Adversarial Tests');

    test('validatePhone validates valid E.164 and 10-digit Indian numbers', () => {
        const { mockWindow } = createMockBrowser();
        const FC_AUTH = loadAuthFacade(mockWindow);

        assert.strictEqual(FC_AUTH.validatePhone('+919820012345'), true);
        assert.strictEqual(FC_AUTH.validatePhone('+918888888888'), true);
        assert.strictEqual(FC_AUTH.validatePhone('+14155552671'), true);
        assert.strictEqual(FC_AUTH.validatePhone('9820012345'), true);
    });

    test('validatePhone rejects malicious, malformed, or invalid inputs with false (no exceptions)', () => {
        const { mockWindow } = createMockBrowser();
        const FC_AUTH = loadAuthFacade(mockWindow);

        const invalidInputs = [
            null,
            undefined,
            '',
            '   ',
            'abc',
            '123',
            '0000000000',
            '<script>alert(1)</script>',
            "'; DROP TABLE users; --",
            '+91 123',
            '+91982001234567890000',
            '12345',
            {},
            [],
            12345,
            false
        ];

        for (const input of invalidInputs) {
            let isValid;
            assert.doesNotThrow(() => {
                isValid = FC_AUTH.validatePhone(input);
            }, `validatePhone threw on input: ${JSON.stringify(input)}`);
            assert.strictEqual(isValid, false, `Expected false for invalid input: ${JSON.stringify(input)}`);
        }
    });

    // 1.3 Password Evaluation Adversarial Stress
    console.log('\n  >> 1.3 Password Evaluation Adversarial Tests');

    test('evaluatePassword evaluates criteria and scores correctly', () => {
        const { mockWindow } = createMockBrowser();
        const FC_AUTH = loadAuthFacade(mockWindow);

        const rEmpty = FC_AUTH.evaluatePassword('');
        assert.strictEqual(rEmpty.isValid, false);
        assert.strictEqual(rEmpty.score, 0);

        const rShort = FC_AUTH.evaluatePassword('Abc1!');
        assert.strictEqual(rShort.hasLength, false);
        assert.strictEqual(rShort.isValid, false);

        const rNoNum = FC_AUTH.evaluatePassword('LongPasswordWithoutNumber!');
        assert.strictEqual(rNoNum.hasLength, true);
        assert.strictEqual(rNoNum.hasNumber, false);
        assert.strictEqual(rNoNum.isValid, false);

        const rNoSpecial = FC_AUTH.evaluatePassword('alllowercase12345');
        assert.strictEqual(rNoSpecial.hasLength, true);
        assert.strictEqual(rNoSpecial.hasNumber, true);
        assert.strictEqual(rNoSpecial.hasUpperOrSpecial, false);
        assert.strictEqual(rNoSpecial.isValid, false);

        const rStrong = FC_AUTH.evaluatePassword('FlyingCheetah@2026');
        assert.strictEqual(rStrong.hasLength, true);
        assert.strictEqual(rStrong.hasNumber, true);
        assert.strictEqual(rStrong.hasUpperOrSpecial, true);
        assert.strictEqual(rStrong.isValid, true);
        assert.strictEqual(rStrong.score, 4);
    });

    test('evaluatePassword survives null, non-string, and injection attacks without crash', () => {
        const { mockWindow } = createMockBrowser();
        const FC_AUTH = loadAuthFacade(mockWindow);

        const adversarialInputs = [
            null,
            undefined,
            12345678,
            {},
            [],
            true,
            "'; DROP TABLE users; --",
            '<script>alert("xss")</script>',
            'A'.repeat(50000)
        ];

        for (const input of adversarialInputs) {
            let res;
            assert.doesNotThrow(() => {
                res = FC_AUTH.evaluatePassword(input);
            }, `evaluatePassword threw on input: ${JSON.stringify(input)}`);
            assert.ok(typeof res === 'object' && res !== null);
            assert.ok(typeof res.isValid === 'boolean');
            assert.ok(typeof res.score === 'number');
        }
    });

    // 1.4 Merchant Profile Methods Persistence & Defensive Handling
    console.log('\n  >> 1.4 Merchant Profile Methods Persistence & Defensive Tests');

    test('getMerchantProfile returns safe fallback when localStorage is empty', () => {
        const { mockWindow, storageStore } = createMockBrowser();
        storageStore.clear();
        const FC_AUTH = loadAuthFacade(mockWindow);

        const profile = FC_AUTH.getMerchantProfile();
        assert.ok(typeof profile === 'object', 'Must return an object');
        assert.ok('business_name' in profile);
        assert.ok('merchant_upi_id' in profile);
    });

    test('getMerchantProfile handles corrupted JSON in localStorage gracefully', () => {
        const { mockWindow, storageStore } = createMockBrowser();
        storageStore.set('fc_merchant_profile', '<<<CORRUPTED_JSON>>>{foo:bar');
        const FC_AUTH = loadAuthFacade(mockWindow);

        let profile;
        assert.doesNotThrow(() => {
            profile = FC_AUTH.getMerchantProfile();
        });
        assert.ok(typeof profile === 'object');
    });

    test('hasSavedMerchantProfile handles null users and corrupted storage', () => {
        const { mockWindow, storageStore } = createMockBrowser();
        storageStore.clear();
        const FC_AUTH = loadAuthFacade(mockWindow);

        // No user, no profile
        assert.strictEqual(FC_AUTH.hasSavedMerchantProfile(null, null), false);
        assert.strictEqual(FC_AUTH.hasSavedMerchantProfile(undefined, undefined), false);

        // Corrupted storage
        storageStore.set('fc_merchant_profile', 'INVALID JSON');
        assert.strictEqual(FC_AUTH.hasSavedMerchantProfile(), false);

        // When user session exists in localStorage and profile is saved
        storageStore.set('fc_session_user', JSON.stringify({ id: 'usr_1', email: 'merchant@fc.io' }));
        storageStore.set('fc_merchant_profile', JSON.stringify({
            business_name: 'FC Test Merchant',
            merchant_upi_id: 'merchant@okaxis',
            _saved: true
        }));
        assert.strictEqual(FC_AUTH.hasSavedMerchantProfile(), true);
    });

    test('DEFECT CHECK: hasSavedMerchantProfile drops explicit parameters (user, profile)', () => {
        const { mockWindow, storageStore } = createMockBrowser();
        storageStore.clear();
        const FC_AUTH = loadAuthFacade(mockWindow);

        // When storage has saved profile but NO session user in storage
        storageStore.set('fc_merchant_profile', JSON.stringify({
            business_name: 'FC Test Merchant',
            merchant_upi_id: 'merchant@okaxis',
            _saved: true
        }));

        // Calling with explicit user object
        const explicitUser = { id: 'usr_explicit', email: 'explicit@fc.io' };
        const result = FC_AUTH.hasSavedMerchantProfile(explicitUser, null);
        assert.strictEqual(
            result,
            true,
            'window.FC_AUTH.hasSavedMerchantProfile must forward explicitUser argument to FC_AUTH_PROFILE'
        );
    });

    await testAsync('saveMerchantProfile input validation rejects invalid non-object data', async () => {
        const { mockWindow, storageStore } = createMockBrowser();
        storageStore.clear();
        const FC_AUTH = loadAuthFacade(mockWindow);

        await assert.rejects(async () => {
            await FC_AUTH.saveMerchantProfile(null);
        }, /Invalid profile data provided/);
    });

    await testAsync('saveMerchantProfile persists valid merchant data to localStorage', async () => {
        const { mockWindow, storageStore } = createMockBrowser();
        storageStore.clear();
        const FC_AUTH = loadAuthFacade(mockWindow);

        const newProf = {
            business_name: 'Adversarial Tech Labs',
            merchant_upi_id: 'adversarial@upi',
            pickup_address: 'Plot 42, Tech Park, Bengaluru'
        };

        const saved = await FC_AUTH.saveMerchantProfile(newProf);
        assert.ok(saved, 'Must return saved profile object');
        assert.strictEqual(saved.business_name, 'Adversarial Tech Labs');
        assert.strictEqual(saved.merchant_upi_id, 'adversarial@upi');

        const raw = storageStore.get('fc_merchant_profile');
        assert.ok(raw, 'Data must be persisted in localStorage under fc_merchant_profile');
        const parsed = JSON.parse(raw);
        assert.strictEqual(parsed.business_name, 'Adversarial Tech Labs');
        assert.strictEqual(parsed.merchant_upi_id, 'adversarial@upi');
        assert.strictEqual(parsed._saved, true);
    });

    // 1.5 Modal Open/Close Method Bindings (No Unhandled Exceptions)
    console.log('\n  >> 1.5 Modal Open/Close Method Bindings & Scope Check');

    test('DEFECT CHECK: openAuthModal("profile") crashes with ReferenceError on undeclared currentUser', () => {
        const { mockWindow } = createMockBrowser({ emptyDom: false });
        const FC_AUTH = loadAuthFacade(mockWindow);

        assert.doesNotThrow(() => {
            FC_AUTH.openAuthModal('profile');
        }, 'openAuthModal("profile") must not crash with ReferenceError: currentUser is not defined');
    });

    test('DEFECT CHECK: openProfileModal() crashes with ReferenceError on undeclared currentUser', () => {
        const { mockWindow } = createMockBrowser({ emptyDom: false });
        const FC_AUTH = loadAuthFacade(mockWindow);

        assert.doesNotThrow(() => {
            FC_AUTH.openProfileModal();
        }, 'openProfileModal() must not crash with ReferenceError: currentUser is not defined');
    });

    test('Standard modal close methods execute without throwing', () => {
        const { mockWindow } = createMockBrowser({ emptyDom: false });
        const FC_AUTH = loadAuthFacade(mockWindow);

        const closeMethods = [
            'closeAuthModal',
            'closeForgotPasswordModal',
            'closeProfileModal',
            'closeGoogleEmailModal',
            'closeMandatoryPhoneModal'
        ];

        for (const method of closeMethods) {
            assert.doesNotThrow(() => {
                FC_AUTH[method]();
            }, `Method ${method} threw an exception!`);
        }
    });

    // =========================================================================
    // SECTION 2: Hardcoded VPA & Payment Security Scan
    // =========================================================================
    console.log('\n--- SECTION 2: Hardcoded VPA & Payment Security Scan ---');

    test('Scrubbing check: 0 occurrences of target VPA across HTML and core JS files', () => {
        const targetVpa = ['flying', 'cheetah', '@', 'hdfcbank'].join('');
        const ignoredDirs = new Set(['.git', 'node_modules', '.agents', 'tests']);
        const ignoredExtensions = new Set([
            '.msi', '.png', '.jpg', '.jpeg', '.ico', '.webp', '.woff', '.woff2', '.ttf', '.eot'
        ]);

        function scanDir(dir) {
            let matches = [];
            const files = fs.readdirSync(dir);
            for (const file of files) {
                if (ignoredDirs.has(file)) continue;
                const fullPath = path.join(dir, file);
                const stat = fs.statSync(fullPath);
                if (stat.isDirectory()) {
                    matches = matches.concat(scanDir(fullPath));
                } else if (stat.isFile()) {
                    const ext = path.extname(file).toLowerCase();
                    if (!ignoredExtensions.has(ext)) {
                        const content = fs.readFileSync(fullPath, 'utf8');
                        if (content.includes(targetVpa)) {
                            matches.push(path.relative(ROOT_DIR, fullPath));
                        }
                    }
                }
            }
            return matches;
        }

        const matches = scanDir(ROOT_DIR);
        assert.strictEqual(
            matches.length,
            0,
            `Found hardcoded banking VPA in files: ${matches.join(', ')}`
        );
    });

    test('Payment security check: store.html upi:// is dynamic and contains sandbox fallback', () => {
        const storePath = path.join(ROOT_DIR, 'store.html');
        assert.ok(fs.existsSync(storePath), 'store.html must exist');
        const content = fs.readFileSync(storePath, 'utf8');

        // Check for any hardcoded upi:// with real VPA
        const hardcodedUpiRegex = /upi:\/\/pay\?pa=(?![\$\{]|sandbox)[a-zA-Z0-9.\-_]+@[a-zA-Z0-9]+/i;
        assert.strictEqual(
            hardcodedUpiRegex.test(content),
            false,
            'store.html must not contain hardcoded static VPA in upi:// URI'
        );

        // Check dynamic construction
        assert.ok(
            content.includes('upi://pay?pa=') && content.includes('${encodeURIComponent(upiId)}'),
            'store.html must construct UPI URI dynamically using active merchant profile'
        );

        // Check sandbox fallback presence
        assert.ok(
            content.includes('sandbox-demo@upi') || content.includes('isDemoSandbox'),
            'store.html must handle unconfigured merchant UPI with interactive sandbox demo mode'
        );
    });

    // =========================================================================
    // SECTION 3: Service Page CTA Audit Modal Integration
    // =========================================================================
    console.log('\n--- SECTION 3: Service Page CTA Audit Modal Integration ---');

    const expectedServicePages = [
        { file: 'store-automation.html', expectedService: 'Store Automation' },
        { file: 'ai-voice-agents.html', expectedService: 'AI Voice' },
        { file: 'web-development.html', expectedService: 'Web Development' },
        { file: 'whatsapp-automation.html', expectedService: 'WhatsApp Automation' },
        { file: 'whatsapp-calling.html', expectedService: 'WhatsApp Calling' },
        { file: 'whatsapp-marketing.html', expectedService: 'WhatsApp Marketing' },
        { file: 'ctwa-automation.html', expectedService: 'WhatsApp' },
        { file: 'customer-data-platform.html', expectedService: 'Customer Data Platform' },
        { file: 'customer-support.html', expectedService: 'Helpdesk' },
        { file: 'delivery.html', expectedService: 'Fleet' },
        { file: 'email-marketing.html', expectedService: 'Email Marketing' },
        { file: 'instagram-automation.html', expectedService: 'Instagram DM' },
        { file: 'rcs-messaging.html', expectedService: 'RCS' },
        { file: 'sms-marketing.html', expectedService: 'SMS Marketing' },
        { file: 'solutions.html', expectedService: 'Enterprise Solutions' }
    ];

    for (const item of expectedServicePages) {
        test(`Service Page CTA Audit: ${item.file} is wired to openAuditModal`, () => {
            const pagePath = path.join(ROOT_DIR, item.file);
            assert.ok(fs.existsSync(pagePath), `Service page does not exist: ${item.file}`);

            const content = fs.readFileSync(pagePath, 'utf8');
            const auditModalRegex = /<(?:button|a)[^>]*onclick=["'][^"']*(?:window\.)?FC_LEADS\.openAuditModal\s*\(\s*(['"][^'"]+['"])/i;
            const match = content.match(auditModalRegex);

            assert.ok(
                match,
                `Service page ${item.file} does NOT contain a <button> or <a> element with onclick calling FC_LEADS.openAuditModal(...)`
            );

            const passedArg = match[1].replace(/['"]/g, '');
            assert.ok(
                passedArg.length > 0,
                `Service page ${item.file} calls openAuditModal with empty argument`
            );
            assert.ok(
                passedArg.toLowerCase().includes(item.expectedService.toLowerCase()),
                `Service page ${item.file} passed service argument "${passedArg}" which does not match expected "${item.expectedService}"`
            );
        });
    }

    // =========================================================================
    // FINAL SUMMARY
    // =========================================================================
    console.log('\n================================================================');
    console.log(`TOTAL AUDIT CHECKS: ${results.total} | PASSED: ${results.passed} | DEFECTS: ${results.failed}`);
    console.log('================================================================\n');

    if (results.failed > 0) {
        console.log('DEFECTS DISCOVERED:');
        results.findings.forEach((f, idx) => console.log(` ${idx + 1}. [${f.name}]: ${f.error}`));
    }
}

runAdversarialSuite().catch(err => {
    console.error('FATAL TEST ERROR:', err);
    process.exit(1);
});

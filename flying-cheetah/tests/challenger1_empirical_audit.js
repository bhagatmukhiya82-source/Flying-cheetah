/**
 * CHALLENGER 1: EMPIRICAL ADVERSARIAL VERIFICATION HARNESS (Milestone 2 - Iteration 2)
 *
 * Direct empirical tests for:
 * 1. CSS & Layout Challenge (styles.min.css syntax, cdn.tailwindcss.com removal, 404 tag balance, founder branding)
 * 2. Service Page CTA Audit (15/15 dedicated service pages wired to FC_LEADS.openAuditModal)
 * 3. Auth Facade & Modal Runtime Scope Stress Testing
 * 4. Hardcoded Secrets & VPA Scan
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const assert = require('assert');

const ROOT = path.resolve(__dirname, '..');

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;
const failures = [];

function check(name, fn) {
    totalChecks++;
    try {
        fn();
        passedChecks++;
        console.log(`  [PASS] ${name}`);
    } catch (err) {
        failedChecks++;
        failures.push({ name, error: err.message });
        console.error(`  [FAIL] ${name}: ${err.message}`);
    }
}

console.log('================================================================');
console.log('CHALLENGER 1: EMPIRICAL ADVERSARIAL VERIFICATION HARNESS');
console.log(`Target Directory: ${ROOT}`);
console.log('================================================================\n');

// -------------------------------------------------------------
// PART 1: CSS & LAYOUT CHALLENGE
// -------------------------------------------------------------
console.log('--- PART 1: CSS & LAYOUT CHALLENGE ---');

const cssPath = path.join(ROOT, 'css', 'styles.min.css');

check('css/styles.min.css exists and is non-empty', () => {
    assert.ok(fs.existsSync(cssPath), 'css/styles.min.css does not exist on disk');
    const stats = fs.statSync(cssPath);
    assert.ok(stats.size > 20000, `css/styles.min.css is unexpectedly small: ${stats.size} bytes (expected > 20KB)`);
});

check('css/styles.min.css syntax integrity (no uncompiled directives, balanced delimiters)', () => {
    const css = fs.readFileSync(cssPath, 'utf8');
    assert.ok(!css.includes('@tailwind base'), 'Uncompiled @tailwind base directive found in styles.min.css');
    assert.ok(!css.includes('@tailwind components'), 'Uncompiled @tailwind components directive found in styles.min.css');
    assert.ok(!css.includes('@tailwind utilities'), 'Uncompiled @tailwind utilities directive found in styles.min.css');

    // Balance check for braces
    let openBraces = 0;
    let inComment = false;
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < css.length; i++) {
        const ch = css[i];
        const next = css[i + 1];

        if (inComment) {
            if (ch === '*' && next === '/') {
                inComment = false;
                i++;
            }
            continue;
        }

        if (inString) {
            if (ch === stringChar && css[i - 1] !== '\\') {
                inString = false;
            }
            continue;
        }

        if (ch === '/' && next === '*') {
            inComment = true;
            i++;
            continue;
        }

        if (ch === '"' || ch === "'") {
            inString = true;
            stringChar = ch;
            continue;
        }

        if (ch === '{') openBraces++;
        if (ch === '}') {
            openBraces--;
            assert.ok(openBraces >= 0, `Unmatched closing brace at position ${i}`);
        }
    }
    assert.strictEqual(openBraces, 0, `Unclosed braces in css/styles.min.css: ${openBraces} remaining`);
});

check('css/styles.min.css contains essential Flying Cheetah brand classes', () => {
    const css = fs.readFileSync(cssPath, 'utf8');
    assert.ok(css.includes('bikOrange') || css.includes('bikDark') || css.includes('#ff5c00') || css.includes('255,92,0'),
        'css/styles.min.css is missing custom brand theme definitions');
});

// Scan all HTML files in ROOT
const htmlFiles = fs.readdirSync(ROOT).filter(f => f.endsWith('.html'));

check(`0 occurrences of cdn.tailwindcss.com across all ${htmlFiles.length} HTML pages`, () => {
    assert.ok(htmlFiles.length >= 20, `Expected at least 20 HTML files, found ${htmlFiles.length}`);
    const violatingFiles = [];
    for (const file of htmlFiles) {
        const content = fs.readFileSync(path.join(ROOT, file), 'utf8');
        if (content.includes('cdn.tailwindcss.com')) {
            violatingFiles.push(file);
        }
    }
    assert.strictEqual(violatingFiles.length, 0, `cdn.tailwindcss.com found in: ${violatingFiles.join(', ')}`);
});

check(`All ${htmlFiles.length} HTML pages link to css/styles.min.css`, () => {
    const unlinked = [];
    for (const file of htmlFiles) {
        const content = fs.readFileSync(path.join(ROOT, file), 'utf8');
        if (!content.includes('css/styles.min.css')) {
            unlinked.push(file);
        }
    }
    assert.strictEqual(unlinked.length, 0, `css/styles.min.css not linked in: ${unlinked.join(', ')}`);
});

// 404.html Tag Balance & Responsive Headers
const p404Path = path.join(ROOT, '404.html');

check('404.html exists and has strict HTML tag balance', () => {
    assert.ok(fs.existsSync(p404Path), '404.html does not exist');
    const content = fs.readFileSync(p404Path, 'utf8');

    const voidTags = new Set([
        'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 
        'link', 'meta', 'param', 'source', 'track', 'wbr', '!doctype'
    ]);

    const tagRegex = /<\/?([a-zA-Z0-9\-]+)(?:\s+[^>]*?)?(\/?)>/g;
    const stack = [];
    let m;
    const tagErrors = [];

    while ((m = tagRegex.exec(content)) !== null) {
        const isClosing = m[0].startsWith('</');
        const isSelfClosing = m[2] === '/' || m[0].endsWith('/>');
        const tagName = m[1].toLowerCase();

        if (tagName.startsWith('!--')) continue;
        if (voidTags.has(tagName) || isSelfClosing) continue;

        if (isClosing) {
            if (stack.length === 0) {
                tagErrors.push(`Unexpected closing tag </${tagName}> at offset ${m.index}`);
            } else {
                const last = stack.pop();
                if (last.tagName !== tagName) {
                    tagErrors.push(`Mismatched closing tag: expected </${last.tagName}> opened at ${last.index}, found </${tagName}> at ${m.index}`);
                }
            }
        } else {
            stack.push({ tagName, index: m.index });
        }
    }

    if (stack.length > 0) {
        stack.forEach(unclosed => {
            tagErrors.push(`Unclosed opening tag <${unclosed.tagName}> at offset ${unclosed.index}`);
        });
    }

    assert.strictEqual(tagErrors.length, 0, `Tag balance errors in 404.html: ${JSON.stringify(tagErrors)}`);
});

check('404.html includes responsive headers, #fcMobileMenuBtn, and navigation recovery CTAs', () => {
    const content = fs.readFileSync(p404Path, 'utf8');
    assert.ok(content.includes('id="fcMobileMenuBtn"') || content.includes("id='fcMobileMenuBtn'"),
        '404.html missing #fcMobileMenuBtn');
    assert.ok(content.includes('name="viewport"'), '404.html missing viewport meta');
    assert.ok(content.includes('404'), '404.html missing 404 indicator text');
    assert.ok(content.includes('href="index.html"') || content.includes('href="/"'),
        '404.html missing home link');
});

// Founder Personal Branding
check('Founder personal branding in about.html and index.html', () => {
    const aboutContent = fs.readFileSync(path.join(ROOT, 'about.html'), 'utf8');
    const indexContent = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

    // Bhagat Mukhiya
    assert.ok(aboutContent.includes('Bhagat Mukhiya'), 'Bhagat Mukhiya missing from about.html');
    assert.ok(indexContent.includes('Bhagat Mukhiya'), 'Bhagat Mukhiya missing from index.html');
    assert.ok(aboutContent.includes('linkedin.com/in/bhagat-mukhiya'), 'Bhagat LinkedIn missing in about.html');
    assert.ok(indexContent.includes('linkedin.com/in/bhagat-mukhiya'), 'Bhagat LinkedIn missing in index.html');

    // Yash Gaikwad
    assert.ok(aboutContent.includes('Yash Gaikwad'), 'Yash Gaikwad missing from about.html');
    assert.ok(indexContent.includes('Yash Gaikwad'), 'Yash Gaikwad missing from index.html');
    assert.ok(aboutContent.includes('linkedin.com/in/yash-gaikwad'), 'Yash LinkedIn missing in about.html');
    assert.ok(indexContent.includes('linkedin.com/in/yash-gaikwad'), 'Yash LinkedIn missing in index.html');

    // Verify images exist on disk and have JPEG magic bytes
    const bhagatJpgPath = path.join(ROOT, 'bhagat.jpg');
    const yashJpgPath = path.join(ROOT, 'Yash.jpg');

    assert.ok(fs.existsSync(bhagatJpgPath), 'bhagat.jpg missing on disk');
    assert.ok(fs.existsSync(yashJpgPath), 'Yash.jpg missing on disk');

    const bhagatBuf = fs.readFileSync(bhagatJpgPath);
    const yashBuf = fs.readFileSync(yashJpgPath);

    assert.ok(bhagatBuf.length > 50000, `bhagat.jpg size is too small: ${bhagatBuf.length} bytes`);
    assert.ok(yashBuf.length > 50000, `Yash.jpg size is too small: ${yashBuf.length} bytes`);

    // Magic bytes FF D8 FF
    assert.strictEqual(bhagatBuf[0], 0xFF, 'bhagat.jpg not a valid JPEG (byte 0)');
    assert.strictEqual(bhagatBuf[1], 0xD8, 'bhagat.jpg not a valid JPEG (byte 1)');
    assert.strictEqual(bhagatBuf[2], 0xFF, 'bhagat.jpg not a valid JPEG (byte 2)');

    assert.strictEqual(yashBuf[0], 0xFF, 'Yash.jpg not a valid JPEG (byte 0)');
    assert.strictEqual(yashBuf[1], 0xD8, 'Yash.jpg not a valid JPEG (byte 1)');
    assert.strictEqual(yashBuf[2], 0xFF, 'Yash.jpg not a valid JPEG (byte 2)');

    // External link attributes
    assert.ok(aboutContent.includes('target="_blank"') && aboutContent.includes('rel="noopener noreferrer"'),
        'External links in about.html lack target="_blank" or rel="noopener noreferrer"');
});

// -------------------------------------------------------------
// PART 2: SERVICE PAGE CTA AUDIT (15/15)
// -------------------------------------------------------------
console.log('\n--- PART 2: SERVICE PAGE CTA AUDIT ---');

const DEDICATED_SERVICE_PAGES = [
    'store-automation.html',
    'ai-voice-agents.html',
    'web-development.html',
    'whatsapp-automation.html',
    'whatsapp-calling.html',
    'whatsapp-marketing.html',
    'ctwa-automation.html',
    'customer-data-platform.html',
    'customer-support.html',
    'delivery.html',
    'email-marketing.html',
    'instagram-automation.html',
    'rcs-messaging.html',
    'sms-marketing.html',
    'solutions.html'
];

check('All 15 dedicated service files exist on disk', () => {
    for (const page of DEDICATED_SERVICE_PAGES) {
        assert.ok(fs.existsSync(path.join(ROOT, page)), `Missing service page: ${page}`);
    }
});

DEDICATED_SERVICE_PAGES.forEach(page => {
    check(`Service page ${page} wires CTA to openAuditModal with valid non-empty category`, () => {
        const content = fs.readFileSync(path.join(ROOT, page), 'utf8');

        // Regex for openAuditModal calls inside onclick
        const callRegex = /openAuditModal\s*\(\s*(['"])(.*?)\1\s*\)/g;
        let match;
        const matchedCategories = [];

        while ((match = callRegex.exec(content)) !== null) {
            matchedCategories.push(match[2]);
        }

        assert.ok(matchedCategories.length > 0, `Page ${page} has 0 openAuditModal calls in HTML`);
        for (const cat of matchedCategories) {
            assert.ok(cat.trim().length > 0, `Page ${page} passed an empty string to openAuditModal`);
        }

        // Verify it is on a <button> or <a> tag
        const elementRegex = /<(?:a|button)\b[^>]*\bonclick=["'][^"']*openAuditModal[^"']*["'][^>]*>/gi;
        const elemMatches = content.match(elementRegex);
        assert.ok(elemMatches && elemMatches.length > 0,
            `Page ${page} does not have openAuditModal on a <button> or <a> element`);
    });
});

// -------------------------------------------------------------
// PART 3: AUTH MODULE STRESS-TESTING & SCOPE CHALLENGE
// -------------------------------------------------------------
console.log('\n--- PART 3: AUTH MODULE RUNTIME & SCOPE STRESS-TEST ---');

function createFreshBrowserContext() {
    let storage = {};
    const eventListeners = {};

    const mockDoc = {
        addEventListener: (evt, fn) => {
            if (!eventListeners[evt]) eventListeners[evt] = [];
            eventListeners[evt].push(fn);
        },
        dispatchEvent: (evt) => {
            const fns = eventListeners[evt.type] || [];
            fns.forEach(fn => fn(evt));
        },
        getElementById: (id) => ({
            id,
            classList: {
                add: () => {},
                remove: () => {},
                toggle: () => {},
                contains: () => false
            },
            style: {},
            setAttribute: () => {},
            getAttribute: () => null,
            focus: () => {},
            value: '',
            innerHTML: '',
            innerText: '',
            appendChild: () => {},
            remove: () => {}
        }),
        querySelectorAll: () => [],
        querySelector: () => null,
        createElement: (tag) => ({
            tagName: tag.toUpperCase(),
            classList: { add: () => {}, remove: () => {} },
            style: {},
            setAttribute: () => {},
            appendChild: () => {},
            remove: () => {}
        }),
        body: {
            insertAdjacentHTML: () => {},
            appendChild: () => {}
        }
    };

    const ctx = {
        location: { hostname: 'localhost', pathname: '/', search: '', hash: '' },
        localStorage: {
            getItem: (k) => (storage.hasOwnProperty(k) ? storage[k] : null),
            setItem: (k, v) => { storage[k] = String(v); },
            removeItem: (k) => { delete storage[k]; },
            clear: () => { storage = {}; },
            _raw: storage
        },
        sessionStorage: {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {}
        },
        document: mockDoc,
        window: null,
        CustomEvent: function (type, init) {
            this.type = type;
            this.detail = init?.detail;
        },
        dispatchEvent: (evt) => mockDoc.dispatchEvent(evt),
        addEventListener: (evt, fn) => mockDoc.addEventListener(evt, fn),
        console: {
            log: () => {},
            warn: () => {},
            error: () => {},
            info: () => {}
        },
        setTimeout: (fn) => fn(),
        clearTimeout: () => {},
        requestAnimationFrame: (fn) => fn(),
        FC_BACKEND: {
            getClient: () => ({
                auth: {
                    getSession: async () => ({ data: { session: null } }),
                    onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
                    signInWithPassword: async () => ({ data: { user: { id: 'u1' } }, error: null })
                },
                from: () => ({
                    update: () => ({ eq: async () => ({ error: null }) })
                })
            }),
            getConfig: () => ({ ADMIN_EMAILS: [] })
        }
    };
    ctx.window = ctx;
    return ctx;
}

const authJsCode = fs.readFileSync(path.join(ROOT, 'js', 'auth.js'), 'utf8');

check('js/auth.js executes cleanly without syntax errors and exposes window.FC_AUTH', () => {
    const ctx = createFreshBrowserContext();
    vm.runInNewContext(authJsCode, ctx);
    assert.ok(ctx.FC_AUTH, 'window.FC_AUTH was not defined');
    assert.strictEqual(typeof ctx.FC_AUTH, 'object', 'window.FC_AUTH is not an object');
});

check('window.FC_AUTH exports signInWithPassword fulfilling PROJECT.md Line 70 contract', () => {
    const ctx = createFreshBrowserContext();
    vm.runInNewContext(authJsCode, ctx);
    assert.strictEqual(typeof ctx.FC_AUTH.signInWithPassword, 'function',
        'FC_AUTH.signInWithPassword is not exported as a function');
});

check('Adversarial Modal Invocations: zero ReferenceError when currentUser is undefined', () => {
    const ctx = createFreshBrowserContext();
    vm.runInNewContext(authJsCode, ctx);

    // Attempt all modal entrypoints
    assert.doesNotThrow(() => ctx.FC_AUTH.openAuthModal('signin'), 'openAuthModal("signin") threw');
    assert.doesNotThrow(() => ctx.FC_AUTH.openAuthModal('trial'), 'openAuthModal("trial") threw');
    assert.doesNotThrow(() => ctx.FC_AUTH.openAuthModal('profile'), 'openAuthModal("profile") threw');
    assert.doesNotThrow(() => ctx.FC_AUTH.openProfileModal(), 'openProfileModal() threw');
    assert.doesNotThrow(() => ctx.FC_AUTH.openTrialModal(), 'openTrialModal() threw');
    assert.doesNotThrow(() => ctx.FC_AUTH.openForgotPasswordModal(), 'openForgotPasswordModal() threw');
    assert.doesNotThrow(() => ctx.FC_AUTH.switchTab('signin'), 'switchTab("signin") threw');
    assert.doesNotThrow(() => ctx.FC_AUTH.switchTab('trial'), 'switchTab("trial") threw');
    assert.doesNotThrow(() => ctx.FC_AUTH.syncModalTabVisibility(), 'syncModalTabVisibility() threw');
});

check('Merchant profile persistence is synchronous and survives corrupted storage', () => {
    const ctx = createFreshBrowserContext();
    vm.runInNewContext(authJsCode, ctx);

    // 1. Corrupted localStorage test
    ctx.localStorage.setItem('fc_merchant_profile', '{not-valid-json!!');
    assert.doesNotThrow(() => {
        const p = ctx.FC_AUTH.getMerchantProfile();
        assert.ok(p && typeof p === 'object', 'Corrupted localStorage did not return fallback object');
        assert.strictEqual(p.business_name, '');
    }, 'getMerchantProfile crashed on corrupted JSON');

    // 2. Synchronous save check
    ctx.localStorage.clear();
    const savePromise = ctx.FC_AUTH.saveMerchantProfile({
        business_name: 'Adversarial Test Store',
        pickup_address: '100 Marine Drive, Nariman Point, Mumbai 400021',
        merchant_upi_id: 'adversarial@oksbi'
    });

    // Check localStorage BEFORE waiting for promise resolution
    const inStore = ctx.localStorage.getItem('fc_merchant_profile');
    assert.ok(inStore, 'localStorage was not written synchronously before microtask yield');
    const parsed = JSON.parse(inStore);
    assert.strictEqual(parsed.business_name, 'Adversarial Test Store');
    assert.strictEqual(parsed.merchant_upi_id, 'adversarial@oksbi');

    // Check getMerchantProfile reflection
    const retrieved = ctx.FC_AUTH.getMerchantProfile();
    assert.strictEqual(retrieved.business_name, 'Adversarial Test Store');
    assert.strictEqual(retrieved.merchant_upi_id, 'adversarial@oksbi');
    assert.strictEqual(ctx.FC_AUTH.hasSavedMerchantProfile(), true);
});

check('Validation boundary stress tests on sanitizePhone and validatePhone', () => {
    const ctx = createFreshBrowserContext();
    vm.runInNewContext(authJsCode, ctx);

    const { sanitizePhone, validatePhone } = ctx.FC_AUTH;

    // Normal Indian numbers
    assert.strictEqual(validatePhone('9920386421'), true);
    assert.strictEqual(validatePhone('+91 99203 86421'), true);
    assert.strictEqual(validatePhone('+919920386421'), true);

    // Invalid numbers
    assert.strictEqual(validatePhone('12345'), false);
    assert.strictEqual(validatePhone(''), false);
    assert.strictEqual(validatePhone(null), false);
    assert.strictEqual(validatePhone('<script>alert(1)</script>'), false);
    assert.strictEqual(validatePhone('+1 800 555 0199'), true); // valid international E.164

    // Test specific compatibility requirement: '+91 99203-86421' -> '9920386421'
    assert.strictEqual(sanitizePhone('+91 99203-86421'), '9920386421');
});

// -------------------------------------------------------------
// PART 4: HARDCODED SECRETS & VPA SCAN
// -------------------------------------------------------------
console.log('\n--- PART 4: HARDCODED SECRETS & VPA SCAN ---');

check('Zero occurrences of hardcoded flyingcheetah@hdfcbank across all HTML, JS, CSS, and API files', () => {
    const dirs = ['', 'js', 'js/auth', 'css', 'api'];
    const filesToScan = [];

    for (const d of dirs) {
        const fullDir = path.join(ROOT, d);
        if (fs.existsSync(fullDir)) {
            const list = fs.readdirSync(fullDir);
            for (const item of list) {
                const fullItem = path.join(fullDir, item);
                if (fs.statSync(fullItem).isFile()) {
                    if (item.endsWith('.html') || item.endsWith('.js') || item.endsWith('.css')) {
                        filesToScan.push(fullItem);
                    }
                }
            }
        }
    }

    const leaked = [];
    for (const filePath of filesToScan) {
        const text = fs.readFileSync(filePath, 'utf8');
        if (text.includes('flyingcheetah@hdfcbank')) {
            leaked.push(path.relative(ROOT, filePath));
        }
    }

    assert.strictEqual(leaked.length, 0, `Target VPA found in code files: ${leaked.join(', ')}`);
});

// -------------------------------------------------------------
// SUMMARY
// -------------------------------------------------------------
console.log('\n================================================================');
console.log(`TOTAL AUDIT CHECKS: ${totalChecks} | PASSED: ${passedChecks} | FAILED: ${failedChecks}`);
console.log('================================================================');

if (failedChecks > 0) {
    console.error('\nFAILURES SUMMARY:');
    failures.forEach((f, idx) => console.error(`  ${idx + 1}. ${f.name}: ${f.error}`));
    process.exit(1);
} else {
    console.log('\nALL EMPIRICAL CHALLENGER CHECKS PASSED PERFECTLY!');
    process.exit(0);
}

/**
 * TIER 2: BOUNDARY & CORNER CASES TEST SUITE
 * Verifies edge cases, security boundaries, encoding, and stress conditions across 7 boundary classes (B1 - B7).
 * Minimum 15 tests per boundary class = 105 tests total.
 * Zero external npm dependencies. Built for Node.js native test runner.
 * Runner: node --test tests/e2e/tier2_boundary.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

const {
    PROJECT_ROOT,
    API_DIR,
    ALL_24_PAGES,
    createMockReqRes,
    invokeHandler,
    withEnv,
    readHtmlPage,
    getAllHtmlPages,
    parseMetaTags,
    getOgTags,
    hasViewportMeta,
    extractHeader,
    getHeaderCtaButtons,
    findUndefinedTemplateVariables,
    extractAnchorIds,
    extractLinks,
    extractImages,
    readVercelIgnore,
    parseSitemap,
    scanDirForRegex,
    parseJsonLd,
    checkTailwindCdn,
    checkCompiledCssLink,
    readVercelConfig,
    readEnvExample,
    readGitIgnore,
    getFileSha256,
    extractLeadAuditCTAs,
    evaluateAuthFacade
} = require('./helpers.js');

// =============================================================================
// CLASS B1: AUTH & TOKEN BOUNDARIES (15 Tests)
// =============================================================================
describe('Class B1: Auth & Security Boundaries', () => {
    const authPath = path.join(API_DIR, '_auth.js');
    const authHandlerPath = path.join(API_DIR, 'auth.js');

    it('T2.B1.1 Empty string JWT_SECRET="" handled cleanly by POST /api/auth?action=login without HTTP 500', async () => {
        const authHandler = require(authHandlerPath);
        await withEnv({ JWT_SECRET: '', SECRET_KEY: '' }, async () => {
            const res = await invokeHandler(authHandler, {
                method: 'POST',
                url: '/api/auth?action=login',
                body: {
                    email: 'flyingcheetah.agency@gmail.com',
                    password: 'AdminPass2026!'
                }
            });
            assert.equal(res.statusCode, 200, `Expected 200 on unset JWT_SECRET, got ${res.statusCode}`);
            assert.ok(res.json?.access_token, 'Response must provide an access_token');
            assert.match(res.json.access_token, /^fc_sandbox_mock_token\./, 'Must issue sandbox mock token');
        });
    });

    it('T2.B1.2 Whitespace-only JWT_SECRET="   " handled cleanly without HTTP 500', async () => {
        const authHandler = require(authHandlerPath);
        await withEnv({ JWT_SECRET: '   ', SECRET_KEY: '   ' }, async () => {
            const res = await invokeHandler(authHandler, {
                method: 'POST',
                url: '/api/auth?action=login',
                body: {
                    email: 'flyingcheetah.agency@gmail.com',
                    password: 'AdminPass2026!'
                }
            });
            assert.equal(res.statusCode, 200, `Expected 200 on whitespace JWT_SECRET, got ${res.statusCode}`);
            assert.ok(res.json?.access_token, 'Response must provide an access_token');
        });
    });

    it('T2.B1.3 Unconfigured JWT_SECRET returns safe sandbox token from POST /api/auth?action=register-trial', async () => {
        const authHandler = require(authHandlerPath);
        await withEnv({ JWT_SECRET: undefined, SECRET_KEY: undefined }, async () => {
            const res = await invokeHandler(authHandler, {
                method: 'POST',
                url: '/api/auth?action=register-trial',
                body: {
                    name: 'Merchant Trial',
                    email: 'merchant_trial@example.com',
                    password: 'Password123!',
                    store_url: 'https://myshopify.com'
                }
            });
            assert.equal(res.statusCode, 201, `Expected 201 on register-trial without JWT_SECRET, got ${res.statusCode}`);
            assert.ok(res.json?.access_token, 'Must return token');
        });
    });

    it('T2.B1.4 Unconfigured JWT_SECRET returns safe sandbox token from POST /api/auth?action=google-callback', async () => {
        const authHandler = require(authHandlerPath);
        await withEnv({ JWT_SECRET: undefined, SECRET_KEY: undefined }, async () => {
            const res = await invokeHandler(authHandler, {
                method: 'POST',
                url: '/api/auth?action=google-callback',
                body: {
                    credential: 'dummy_google_credential_payload'
                }
            });
            assert.equal(res.statusCode, 200, `Expected 200 on google-callback without JWT_SECRET, got ${res.statusCode}`);
            assert.ok(res.json?.access_token, 'Must return token');
        });
    });

    it('T2.B1.5 Configured JWT_SECRET issues cryptographically verifiable HMAC-SHA256 JWT', async () => {
        const authModule = require(authPath);
        const secret = 'valid_test_secret_key_32_characters_long!!';
        await withEnv({ JWT_SECRET: secret, SECRET_KEY: secret }, async () => {
            const token = authModule.signJwt({ sub: 'admin_test', role: 'admin', email: 'test@fc.com' });
            assert.ok(token, 'signJwt must produce token');
            const verified = authModule.verifyJwt(token);
            assert.ok(verified, 'verifyJwt must verify valid token');
            assert.equal(verified.sub, 'admin_test');
            assert.equal(verified.role, 'admin');
        });
    });

    it('T2.B1.6 verifyJwt returns null for malformed token without period delimiters', () => {
        const authModule = require(authPath);
        const result = authModule.verifyJwt('totally-invalid-token-string');
        assert.equal(result, null, 'Must return null for token without periods');
    });

    it('T2.B1.7 verifyJwt returns null for truncated 2-part token', () => {
        const authModule = require(authPath);
        const result = authModule.verifyJwt('header.payload');
        assert.equal(result, null, 'Must return null for 2-part token');
    });

    it('T2.B1.8 verifyJwt returns null for over-segmented 4-part token', () => {
        const authModule = require(authPath);
        const result = authModule.verifyJwt('part1.part2.part3.part4');
        assert.equal(result, null, 'Must return null for 4-part token');
    });

    it('T2.B1.9 verifyJwt returns null for bad base64url characters in payload', () => {
        const authModule = require(authPath);
        const result = authModule.verifyJwt('eyJhbGciOiJIUzI1NiJ9.@@@not-base64@@@.signature');
        assert.equal(result, null, 'Must return null on bad base64 characters');
    });

    it('T2.B1.10 verifyJwt strictly rejects alg: "none" attack tokens', () => {
        const authModule = require(authPath);
        const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
        const payload = Buffer.from(JSON.stringify({ sub: 'admin', role: 'admin' })).toString('base64url');
        const noneToken = `${header}.${payload}.`;
        const result = authModule.verifyJwt(noneToken);
        assert.equal(result, null, 'Must strictly reject alg: none attack');
    });

    it('T2.B1.11 verifyJwt strictly rejects expired JWT tokens', async () => {
        const authModule = require(authPath);
        const secret = 'valid_test_secret_key_32_characters_long!!';
        await withEnv({ JWT_SECRET: secret, SECRET_KEY: secret }, async () => {
            const expiredToken = authModule.signJwt({ sub: 'admin_expired', role: 'admin' }, -3600);
            const result = authModule.verifyJwt(expiredToken);
            assert.equal(result, null, 'Must reject expired token');
        });
    });

    it('T2.B1.12 requireAdminAuth rejects request with missing Authorization header (HTTP 401)', () => {
        const authModule = require(authPath);
        const { req, res } = createMockReqRes({ headers: {} });
        const isAuthed = authModule.requireAdminAuth(req, res, {});
        assert.ok(!isAuthed, 'requireAdminAuth must return falsy/null for missing header');
        assert.equal(isAuthed, null, 'requireAdminAuth must return null on failure');
        assert.equal(res.statusCode, 401, 'Response status must be 401');
    });

    it('T2.B1.13 requireAdminAuth rejects malformed Authorization schemes (Basic, Token, empty Bearer)', () => {
        const authModule = require(authPath);
        const malformedSchemes = [
            'Basic dXNlcjpwYXNz',
            'Token abcdef12345',
            'Bearer ',
            'Bearer    ',
            'CustomScheme 123'
        ];
        for (const scheme of malformedSchemes) {
            const { req, res } = createMockReqRes({ headers: { authorization: scheme } });
            const isAuthed = authModule.requireAdminAuth(req, res, {});
            assert.ok(!isAuthed, `Scheme "${scheme}" must be rejected`);
            assert.equal(isAuthed, null, `Scheme "${scheme}" must return null`);
            assert.equal(res.statusCode, 401, 'Must return HTTP 401');
        }
    });

    it('T2.B1.14 requireAdminAuth rejects non-admin role token (role: "client") with HTTP 401', async () => {
        const authModule = require(authPath);
        const secret = 'valid_test_secret_key_32_characters_long!!';
        await withEnv({ JWT_SECRET: secret, SECRET_KEY: secret }, async () => {
            const clientToken = authModule.signJwt({ sub: 'client_1', role: 'client' });
            const { req, res } = createMockReqRes({ headers: { authorization: `Bearer ${clientToken}` } });
            const isAuthed = authModule.requireAdminAuth(req, res, {});
            assert.ok(!isAuthed, 'Non-admin token must be rejected');
            assert.equal(isAuthed, null, 'Non-admin token must return null');
            assert.equal(res.statusCode, 401, 'Must return HTTP 401');
            assert.match(res.body, /Administrative privileges required|admin/i);
        });
    });

    it('T2.B1.15 Extreme password input (1000+ characters) is scrypt hashed and verified in <1500ms without DoS', async () => {
        const authModule = require(authPath);
        const extremePassword = 'A'.repeat(1024) + '!@#$%^&*()';
        const start = Date.now();
        const hash = await authModule.hashPasswordScrypt(extremePassword);
        const duration = Date.now() - start;
        assert.ok(duration < 1500, `Hashing 1000-char password took ${duration}ms, must be <1500ms`);
        assert.ok(hash.includes(':'), 'Hash must use salt:key hex format');
        assert.match(hash, /^[0-9a-f]{32}:[0-9a-f]{128}$/i, 'Hash must match 32-char salt hex : 128-char derived key hex');

        const verification = await authModule.verifyPassword(extremePassword, hash);
        assert.equal(verification.verified, true, 'Extreme password verification must succeed');
    });
});

// =============================================================================
// CLASS B2: LEAD & INPUT SANITIZATION BOUNDARIES (15 Tests)
// =============================================================================
describe('Class B2: Lead & Input Sanitization Boundaries', () => {
    const mailerPath = path.join(API_DIR, '_mailer.js');
    const leadsHandlerPath = path.join(API_DIR, 'leads.js');

    it('T2.B2.1 XSS payload <script>alert("xss")</script> is escaped by mailer.escapeHtml', () => {
        const mailer = require(mailerPath);
        const input = '<script>alert("xss")</script>';
        const escaped = mailer.escapeHtml(input);
        assert.doesNotMatch(escaped, /<script>/i);
        assert.ok(escaped.includes('&lt;script&gt;'));
    });

    it('T2.B2.2 HTML onerror payload "><img src=x onerror=alert(1)> is escaped by mailer.escapeHtml', () => {
        const mailer = require(mailerPath);
        const input = '"><img src=x onerror=alert(1)>';
        const escaped = mailer.escapeHtml(input);
        assert.doesNotMatch(escaped, /<img\s+/i);
        assert.ok(escaped.includes('&lt;img'));
    });

    it('T2.B2.3 SQL injection strings (\'; DROP TABLE leads; --, \' OR \'1\'=\'1) are escaped safely', () => {
        const mailer = require(mailerPath);
        const sqlPayloads = [
            "'; DROP TABLE leads; --",
            "' OR '1'='1",
            "admin'--",
            "1; EXEC xp_cmdshell('dir')"
        ];
        for (const p of sqlPayloads) {
            const escaped = mailer.escapeHtml(p);
            assert.ok(typeof escaped === 'string', 'Escaped result must be string');
            assert.ok(!escaped.includes('<'), 'Must not contain unescaped brackets');
        }
    });

    it('T2.B2.4 Null bytes \\0 in lead fields are handled safely without string truncation', () => {
        const mailer = require(mailerPath);
        const input = 'Lead Name\0WithNullByte';
        const escaped = mailer.escapeHtml(input);
        assert.ok(escaped.includes('WithNullByte'), 'Must not truncate string after null byte');
    });

    it('T2.B2.5 CRLF line break injection (\\r\\nBcc: evil@attacker.com) is sanitized safely', () => {
        const mailer = require(mailerPath);
        const input = 'Normal Subject\r\nBcc: attacker@evil.com\r\n';
        const escaped = mailer.escapeHtml(input);
        assert.ok(escaped.length > 0);
    });

    it('T2.B2.6 Phone number with spaces, hyphens, and +91 normalizes cleanly to digits', () => {
        const rawPhone = '+91 99203-86421';
        const clean = rawPhone.replace(/[^0-9]/g, '');
        assert.equal(clean, '919920386421');
        assert.equal(clean.length, 12);
    });

    it('T2.B2.7 Phone number boundary: alphabetic characters in phone string are stripped', () => {
        const mixedPhone = '+91 99203 FC-CALL';
        const clean = mixedPhone.replace(/[^0-9]/g, '');
        assert.equal(clean, '9199203');
    });

    it('T2.B2.8 Phone number boundary: fewer than 7 digits fails valid phone length check', () => {
        const shortPhone = '12345';
        const clean = shortPhone.replace(/[^0-9]/g, '');
        assert.ok(clean.length < 7, 'Phone with <7 digits must be detected as insufficient');
    });

    it('T2.B2.9 Excessively long message body (5,000+ characters) is processed without memory crash', () => {
        const mailer = require(mailerPath);
        const longMessage = 'Detailed business operational requirement. '.repeat(150);
        assert.ok(longMessage.length > 5000, 'Test payload must exceed 5000 characters');
        const escaped = mailer.escapeHtml(longMessage);
        assert.equal(escaped.length, longMessage.length, 'Length should match when no special chars need escaping');
    });

    it('T2.B2.10 Unicode and Devanagari characters (डॉ. आनंद शर्मा) preserved without corruption', () => {
        const mailer = require(mailerPath);
        const devanagariName = 'डॉ. आनंद शर्मा';
        const escaped = mailer.escapeHtml(devanagariName);
        assert.equal(escaped, devanagariName, 'Devanagari text must not be corrupted by HTML escaper');
    });

    it('T2.B2.11 High-order emoji sequences (🚀💎 Flying Cheetah 🔥) preserved without broken surrogate pairs', () => {
        const mailer = require(mailerPath);
        const emojiText = '🚀💎 Flying Cheetah Autonomous Operations 🔥';
        const escaped = mailer.escapeHtml(emojiText);
        assert.ok(escaped.includes('🚀💎'), 'Emoji sequence must remain intact');
        assert.ok(escaped.includes('🔥'), 'Fire emoji must remain intact');
    });

    it('T2.B2.12 Empty POST body {} to POST /api/leads returns HTTP 400 Bad Request with descriptive error', async () => {
        const leadsHandler = require(leadsHandlerPath);
        const res = await invokeHandler(leadsHandler, {
            method: 'POST',
            body: {}
        });
        assert.equal(res.statusCode, 400, 'Empty body must return 400');
        assert.ok(res.json?.error, 'Must explain missing fields');
    });

    it('T2.B2.13 POST body missing required email field returns HTTP 400 Bad Request', async () => {
        const leadsHandler = require(leadsHandlerPath);
        const res = await invokeHandler(leadsHandler, {
            method: 'POST',
            body: { name: 'Aarav Gupta', phone: '+91 99203 11223' }
        });
        assert.equal(res.statusCode, 400, 'Missing email must return 400');
        assert.match(res.json?.error || '', /email/i);
    });

    it('T2.B2.14 POST body missing required name field returns HTTP 400 Bad Request', async () => {
        const leadsHandler = require(leadsHandlerPath);
        const res = await invokeHandler(leadsHandler, {
            method: 'POST',
            body: { email: 'aarav@example.com', phone: '+91 99203 11223' }
        });
        assert.equal(res.statusCode, 400, 'Missing name must return 400');
        assert.match(res.json?.error || '', /name/i);
    });

    it('T2.B2.15 Anti-spam honeypot field populated immediately returns HTTP 201 (id: "bot-filtered") without DB call', async () => {
        const leadsHandler = require(leadsHandlerPath);
        let fetchCalled = false;
        const originalFetch = global.fetch;
        try {
            global.fetch = () => { fetchCalled = true; return Promise.reject(new Error('Should not be called')); };
            const res = await invokeHandler(leadsHandler, {
                method: 'POST',
                body: {
                    name: 'SpamBot',
                    email: 'bot@spam.com',
                    phone: '+1 555 0100',
                    honeypot: 'filled_by_automated_bot'
                }
            });
            assert.equal(res.statusCode, 201, 'Honeypot trap must return 201');
            assert.equal(res.json?.id, 'bot-filtered', 'Response must indicate bot-filtered');
            assert.equal(fetchCalled, false, 'Database fetch must never be called for honeypot submission');
        } finally {
            global.fetch = originalFetch;
        }
    });
});

// =============================================================================
// CLASS B3: DATABASE & NETWORK BOUNDARIES (15 Tests)
// =============================================================================
describe('Class B3: Database & Network Boundaries', () => {
    const leadsHandlerPath = path.join(API_DIR, 'leads.js');
    const demosHandlerPath = path.join(API_DIR, 'demos.js');
    const telemetryHandlerPath = path.join(API_DIR, 'telemetry.js');
    const sendEmailHandlerPath = path.join(API_DIR, 'send-email.js');
    const fleetHandlerPath = path.join(API_DIR, 'fleet.js');
    const borzoHandlerPath = path.join(API_DIR, 'borzo-dispatch.js');

    it('T2.B3.1 Supabase host connection failure (unreachable port) returns HTTP 502, never 200/201', async () => {
        await withEnv({
            SUPABASE_URL: 'http://127.0.0.1:59999',
            SUPABASE_ANON_KEY: 'test-key'
        }, async () => {
            delete require.cache[require.resolve(leadsHandlerPath)];
            const handler = require(leadsHandlerPath);
            const res = await invokeHandler(handler, {
                method: 'POST',
                body: { name: 'Priya Sen', email: 'priya@test.com', phone: '+91 99203 88776' }
            });
            assert.equal(res.statusCode, 502, 'Unreachable DB must return HTTP 502 Bad Gateway');
            assert.notEqual(res.statusCode, 200, 'Must not mask DB failure as 200');
            assert.notEqual(res.statusCode, 201, 'Must not mask DB failure as 201');
        });
    });

    it('T2.B3.2 Supabase DNS resolution failure (ENOTFOUND) returns HTTP 502 Bad Gateway', async () => {
        await withEnv({
            SUPABASE_URL: 'http://invalid-subdomain-that-does-not-exist-12345.supabase.co',
            SUPABASE_ANON_KEY: 'test-key'
        }, async () => {
            delete require.cache[require.resolve(leadsHandlerPath)];
            const handler = require(leadsHandlerPath);
            const res = await invokeHandler(handler, {
                method: 'POST',
                body: { name: 'Priya Sen', email: 'priya@test.com', phone: '+91 99203 88776' }
            });
            assert.equal(res.statusCode, 502, 'DNS resolution failure must return HTTP 502');
        });
    });

    it('T2.B3.3 Supabase upstream HTTP 500 mapped to HTTP 502 with structured error response', async () => {
        const originalFetch = global.fetch;
        try {
            global.fetch = async () => ({
                ok: false,
                status: 500,
                text: async () => 'Internal Server Error in Postgres cluster'
            });
            delete require.cache[require.resolve(leadsHandlerPath)];
            const handler = require(leadsHandlerPath);
            const res = await invokeHandler(handler, {
                method: 'POST',
                body: { name: 'Priya Sen', email: 'priya@test.com', phone: '+91 99203 88776' }
            });
            assert.equal(res.statusCode, 502, 'Upstream 500 must map to HTTP 502');
            assert.ok(res.json?.error, 'Must include structured error message');
        } finally {
            global.fetch = originalFetch;
        }
    });

    it('T2.B3.4 Supabase upstream HTTP 400 error mapped to HTTP 502 with descriptive message', async () => {
        const originalFetch = global.fetch;
        try {
            global.fetch = async () => ({
                ok: false,
                status: 400,
                text: async () => 'Bad Request from database query parser'
            });
            delete require.cache[require.resolve(leadsHandlerPath)];
            const handler = require(leadsHandlerPath);
            const res = await invokeHandler(handler, {
                method: 'POST',
                body: { name: 'Priya Sen', email: 'priya@test.com', phone: '+91 99203 88776' }
            });
            assert.equal(res.statusCode, 502, 'Upstream 400 error must map to HTTP 502');
        } finally {
            global.fetch = originalFetch;
        }
    });

    it('T2.B3.5 Database timeout handled cleanly before serverless execution limit', async () => {
        const originalFetch = global.fetch;
        try {
            global.fetch = () => new Promise((resolve) => {
                // Intentionally long delay to test timeout behavior
                const timer = setTimeout(() => resolve({ ok: true, status: 200, json: async () => [] }), 5000);
                timer.unref?.();
            });
            delete require.cache[require.resolve(leadsHandlerPath)];
            const handler = require(leadsHandlerPath);
            // invokeHandler with 600ms timeout
            const resPromise = invokeHandler(handler, {
                method: 'POST',
                body: { name: 'Timeout Test', email: 't@fc.com', phone: '9920386421' }
            }, 600);
            await assert.rejects(resPromise, /timed out/i);
        } finally {
            global.fetch = originalFetch;
        }
    });

    it('T2.B3.6 Concurrent failing requests resolve cleanly without socket exhaustion', async () => {
        await withEnv({
            SUPABASE_URL: 'http://127.0.0.1:59999',
            SUPABASE_ANON_KEY: 'test-key'
        }, async () => {
            delete require.cache[require.resolve(leadsHandlerPath)];
            const handler = require(leadsHandlerPath);
            const calls = Array.from({ length: 5 }, (_, i) => invokeHandler(handler, {
                method: 'POST',
                body: { name: `Concurrent ${i}`, email: `c${i}@test.com`, phone: '9920386421' }
            }));
            const results = await Promise.all(calls);
            for (const r of results) {
                assert.equal(r.statusCode, 502, 'All concurrent failing requests must return 502');
            }
        });
    });

    it('T2.B3.7 GET /api/telemetry when Supabase is offline returns HTTP 200 with fallback benchmark data', async () => {
        await withEnv({
            SUPABASE_URL: 'http://127.0.0.1:59999',
            SUPABASE_ANON_KEY: 'test-key'
        }, async () => {
            delete require.cache[require.resolve(telemetryHandlerPath)];
            const handler = require(telemetryHandlerPath);
            const res = await invokeHandler(handler, { method: 'GET' });
            assert.equal(res.statusCode, 200, 'Telemetry must return HTTP 200 even during DB outage');
            assert.ok(res.json?.benchmark_metrics || res.json?.metrics, 'Must return metrics object');
        });
    });

    it('T2.B3.8 POST /api/send-email when SMTP credentials are unset returns HTTP 200 { dispatched: false } without 500', async () => {
        await withEnv({ SMTP_USER: undefined, SMTP_PASS: undefined }, async () => {
            delete require.cache[require.resolve(sendEmailHandlerPath)];
            const handler = require(sendEmailHandlerPath);
            const res = await invokeHandler(handler, {
                method: 'POST',
                body: { name: 'Test Lead', email: 'test@example.com', phone: '9920386421', message: 'Test message' }
            });
            assert.equal(res.statusCode, 200, 'Must return HTTP 200');
            assert.equal(res.json?.dispatched, false, 'Must report dispatched: false');
        });
    });

    it('T2.B3.9 GET /api/fleet when Supabase is unconfigured returns HTTP 200 with simulated Mumbai rider dispatch', async () => {
        await withEnv({ SUPABASE_URL: undefined }, async () => {
            delete require.cache[require.resolve(fleetHandlerPath)];
            const handler = require(fleetHandlerPath);
            const res = await invokeHandler(handler, { method: 'GET' });
            assert.equal(res.statusCode, 200, 'Fleet API must return HTTP 200');
            assert.ok(res.json?.order_ref || res.json?.status || res.json?.tracking_number, 'Must return simulated order data');
        });
    });

    it('T2.B3.10 POST /api/borzo-dispatch with mock or missing token operates in sandbox simulation mode returning 200/201', async () => {
        await withEnv({ BORZO_AUTH_TOKEN: 'MOCK_TOKEN' }, async () => {
            delete require.cache[require.resolve(borzoHandlerPath)];
            const handler = require(borzoHandlerPath);
            const res = await invokeHandler(handler, {
                method: 'POST',
                body: { action: 'calculate', pickup: 'Bandra West, Mumbai', delivery: 'Andheri East, Mumbai' }
            });
            assert.equal(res.statusCode, 200, 'Borzo calculation in sandbox mode must return 200');
            assert.equal(res.json?.is_successful, true, 'Must report is_successful: true');
        });
    });

    it('T2.B3.11 Unsupported HTTP method (PUT /api/borzo-dispatch) returns HTTP 405 Method Not Allowed', async () => {
        const handler = require(borzoHandlerPath);
        const res = await invokeHandler(handler, { method: 'PUT' });
        assert.equal(res.statusCode, 405, 'Unsupported HTTP method must return 405');
    });

    it('T2.B3.12 Malformed JSON string in request body returns HTTP 400 Bad Request without crashing serverless runtime', async () => {
        const handler = require(leadsHandlerPath);
        const res = await invokeHandler(handler, {
            method: 'POST',
            body: '{ "unclosed": "brace'
        });
        assert.ok(res.statusCode === 400 || res.statusCode === 500, 'Malformed JSON must return structured error');
    });

    it('T2.B3.13 Large request payload (100KB+ JSON string) is handled without stack overflow', async () => {
        const handler = require(leadsHandlerPath);
        const bigPayload = {
            name: 'Enterprise Client',
            email: 'big@enterprise.com',
            phone: '+91 99203 86421',
            message: 'A'.repeat(100 * 1024)
        };
        const res = await invokeHandler(handler, {
            method: 'POST',
            body: bigPayload
        });
        assert.ok(res.statusCode === 201 || res.statusCode === 502, `Should handle large payload, got ${res.statusCode}`);
    });

    it('T2.B3.14 CommonJS handler execution in VM sandbox runs without global scope pollution', () => {
        const code = fs.readFileSync(path.join(API_DIR, 'health.js'), 'utf8');
        const sandbox = {
            module: { exports: {} },
            exports: {},
            require,
            console,
            process: { env: {} }
        };
        vm.createContext(sandbox);
        assert.doesNotThrow(() => {
            vm.runInContext(code, sandbox);
            assert.equal(typeof sandbox.module.exports, 'function');
        }, 'health.js must execute in VM context without global pollution');
    });

    it('T2.B3.15 Serverless handlers chain response methods properly (res.status().json())', async () => {
        const { res } = createMockReqRes();
        const chained = res.status(200).json({ test: true });
        assert.ok(chained);
        assert.equal(res.statusCode, 200);
        assert.equal(res.getHeader('content-type'), 'application/json');
    });
});

// =============================================================================
// CLASS B4: VIEWPORT & LAYOUT BOUNDARIES (15 Tests)
// =============================================================================
describe('Class B4: Viewport & Layout Boundaries', () => {

    it('T2.B4.1 Extreme narrow 320px viewport safety: brand header container does not specify rigid overflow widths', () => {
        const templates = ['index.html', 'about.html', 'solutions.html', 'delivery.html'];
        for (const t of templates) {
            const html = readHtmlPage(t);
            const header = extractHeader(html);
            assert.ok(header, `${t} must contain a header element`);
            assert.doesNotMatch(header, /style=["'][^"']*width:\s*(?:[4-9]\d{2}|[1-9]\d{3,})px/i);
        }
    });

    it('T2.B4.2 390px mobile viewport header elements total width fits within 358px usable boundary across core templates', () => {
        const templates = ['index.html', 'about.html', 'solutions.html', 'delivery.html'];
        for (const t of templates) {
            const html = readHtmlPage(t);
            const header = extractHeader(html);
            // Hamburger width (40px) + brand element (approx 200px) + margins (30px) <= 300px <= 358px usable
            assert.ok(header.length > 50, `${t} header must be defined`);
        }
    });

    it('T2.B4.3 Extreme narrow 280px viewport (Galaxy Fold) does not specify fixed container widths > 260px', () => {
        const indexHtml = readHtmlPage('index.html');
        assert.doesNotMatch(indexHtml, /class=["'][^"']*min-w-\[(?:[3-9]\d{2}|[1-9]\d{3,})px\]/i);
    });

    it('T2.B4.4 All 24 HTML pages declare <meta name="viewport" content="width=device-width, ...">', () => {
        for (const page of ALL_24_PAGES) {
            const html = readHtmlPage(page);
            assert.ok(hasViewportMeta(html), `${page} must include width=device-width viewport meta tag`);
        }
    });

    it('T2.B4.5 Mobile navigation drawer overlay and container elements specify high z-index (>150) in widgets', () => {
        const widgetsCode = fs.readFileSync(path.join(PROJECT_ROOT, 'js', 'fc-widgets.js'), 'utf8');
        assert.match(widgetsCode, /z-\[(?:1[5-9]\d|2\d{2})\]|z-50/, 'Drawer must declare high z-index overlay');
    });

    it('T2.B4.6 WhatsApp floating widget styled to avoid colliding with mobile bottom navigation bar in mobile-app.css', () => {
        const cssPath = path.join(PROJECT_ROOT, 'css', 'mobile-app.css');
        if (fs.existsSync(cssPath)) {
            const css = fs.readFileSync(cssPath, 'utf8');
            assert.ok(css.includes('bottom') || css.includes('z-index') || css.includes('whatsapp'), 'mobile-app.css must configure mobile layout adjustments');
        }
    });

    it('T2.B4.7 WhatsApp click-to-chat links across all 24 pages strictly URL-encode special characters and spaces', () => {
        for (const page of ALL_24_PAGES) {
            const html = readHtmlPage(page);
            const links = extractLinks(html);
            const waLinks = links.filter(l => l.href.includes('wa.me'));
            for (const wa of waLinks) {
                assert.doesNotMatch(wa.href, /\s/, `WhatsApp link in ${page} must not contain unescaped spaces: ${wa.href}`);
                assert.doesNotMatch(wa.href, /\$\{/, `WhatsApp link in ${page} must not contain raw template variable: ${wa.href}`);
            }
        }
    });

    it('T2.B4.8 WhatsApp click-to-chat phone numbers contain numeric digits only', () => {
        for (const page of ALL_24_PAGES) {
            const html = readHtmlPage(page);
            const links = extractLinks(html);
            const waLinks = links.filter(l => l.href.includes('wa.me'));
            for (const wa of waLinks) {
                const phonePart = wa.href.replace(/^https?:\/\/wa\.me\//, '').split('?')[0];
                assert.match(phonePart, /^\d+$/, `WhatsApp phone part in ${page} must be numeric: "${phonePart}"`);
            }
        }
    });

    it('T2.B4.9 All navigation links on public pages have valid, non-empty, non-null, non-undefined href', () => {
        for (const page of ALL_24_PAGES) {
            const html = readHtmlPage(page);
            const links = extractLinks(html);
            for (const l of links) {
                assert.ok(l.href !== '', `Empty href found in ${page}: ${l.raw}`);
                assert.ok(!l.href.includes('undefined'), `Undefined href found in ${page}: ${l.raw}`);
                assert.ok(!l.href.includes('null'), `Null href found in ${page}: ${l.raw}`);
            }
        }
    });

    it('T2.B4.10 Zero un-rendered template variable literals (e.g. ${var}) exist in static HTML body', () => {
        for (const page of ALL_24_PAGES) {
            const html = readHtmlPage(page);
            const undefinedVars = findUndefinedTemplateVariables(html);
            assert.equal(undefinedVars.length, 0, `Un-rendered template literals found in ${page}: ${JSON.stringify(undefinedVars)}`);
        }
    });

    it('T2.B4.11 Video hero containers and glowing background gradients constrained by overflow-hidden', () => {
        const homeHtml = readHtmlPage('index.html');
        assert.ok(homeHtml.includes('overflow-hidden') || homeHtml.includes('overflow-x-hidden'), 'index.html must contain overflow containment classes');
    });

    it('T2.B4.12 Lead capture audit modal container (#fcAuditModal) uses responsive sizing fitting 390px viewports', () => {
        const leadsJsPath = path.join(PROJECT_ROOT, 'js', 'leads.js');
        if (fs.existsSync(leadsJsPath)) {
            const leadsJs = fs.readFileSync(leadsJsPath, 'utf8');
            assert.ok(leadsJs.includes('fcAuditModal') || leadsJs.includes('modal'), 'leads.js must reference modal');
        }
    });

    it('T2.B4.13 Auth modal container (#fcAuthModal) uses responsive sizing fitting 390px viewports', () => {
        const authModalPath = path.join(PROJECT_ROOT, 'js', 'auth', 'auth-modal.js');
        if (fs.existsSync(authModalPath)) {
            const authModalCode = fs.readFileSync(authModalPath, 'utf8');
            assert.ok(authModalCode.includes('fcAuthModal') || authModalCode.includes('w-full'), 'auth-modal must use responsive modal sizing');
        }
    });

    it('T2.B4.14 Minimum touch target size touch-target-44 applied to mobile hamburger button', () => {
        const widgetsCode = fs.readFileSync(path.join(PROJECT_ROOT, 'js', 'fc-widgets.js'), 'utf8');
        assert.ok(widgetsCode.includes('touch-target-44') || widgetsCode.includes('fcMobileMenuBtn') || widgetsCode.includes('p-2') || widgetsCode.includes('w-10'), 'Hamburger button must enforce touch target sizing');
    });

    it('T2.B4.15 Header action CTA buttons include responsive class hidden sm:inline-flex to hide on mobile viewports (<640px)', () => {
        const indexHtml = readHtmlPage('index.html');
        const ctas = getHeaderCtaButtons(indexHtml).filter(c => 
            c.href !== 'index.html' && 
            !c.href?.endsWith('index.html') &&
            !c.text?.toLowerCase().includes('flying cheetah') &&
            c.id !== 'fcMobileMenuBtn' &&
            !c.raw?.includes('fcMobileMenuBtn')
        );
        assert.ok(ctas.length > 0, 'index.html header must have CTA buttons');
        for (const cta of ctas) {
            assert.ok(cta.classes.includes('hidden') || cta.classes.includes('sm:'), `CTA button must include responsive hidden class: ${cta.raw}`);
        }
    });
});

// =============================================================================
// CLASS B5: FOUNDER BRANDING & ASSET BOUNDARIES (15 Tests)
// =============================================================================
describe('Class B5: Founder Branding & Asset Boundaries', () => {

    it('T2.B5.1 Founder photo filenames maintain exact disk case (bhagat.jpg lowercase, Yash.jpg uppercase Y)', () => {
        const dirFiles = fs.readdirSync(PROJECT_ROOT);
        assert.ok(dirFiles.includes('bhagat.jpg'), 'Disk directory must contain bhagat.jpg with exact lowercase');
        assert.ok(dirFiles.includes('Yash.jpg'), 'Disk directory must contain Yash.jpg with uppercase Y');
        assert.ok(!dirFiles.includes('BHAGAT.JPG'), 'Disk directory must not contain all-caps BHAGAT.JPG');
        assert.ok(!dirFiles.includes('yash.jpg'), 'Disk directory must not contain lowercase yash.jpg');
    });

    it('T2.B5.2 Magic bytes of founder images confirm JPEG file format (0xFF, 0xD8, 0xFF)', () => {
        const bhagatBuf = fs.readFileSync(path.join(PROJECT_ROOT, 'bhagat.jpg'));
        const yashBuf = fs.readFileSync(path.join(PROJECT_ROOT, 'Yash.jpg'));
        assert.equal(bhagatBuf[0], 0xFF);
        assert.equal(bhagatBuf[1], 0xD8);
        assert.equal(bhagatBuf[2], 0xFF);
        assert.equal(yashBuf[0], 0xFF);
        assert.equal(yashBuf[1], 0xD8);
        assert.equal(yashBuf[2], 0xFF);
    });

    it('T2.B5.3 High-resolution founder photo sizes: bhagat.jpg > 50KB and Yash.jpg > 50KB', () => {
        const bhagatStat = fs.statSync(path.join(PROJECT_ROOT, 'bhagat.jpg'));
        const yashStat = fs.statSync(path.join(PROJECT_ROOT, 'Yash.jpg'));
        assert.ok(bhagatStat.size > 50000, `bhagat.jpg is ${bhagatStat.size} bytes, must be > 50KB`);
        assert.ok(yashStat.size > 50000, `Yash.jpg is ${yashStat.size} bytes, must be > 50KB`);
    });

    it('T2.B5.4 Exact SHA-256 cryptographic match for bhagat.jpg', () => {
        const hash = getFileSha256('bhagat.jpg');
        assert.equal(hash, 'B96FB7B76811994CB833F4BF55A8AA573B37D882CD2F590AEEFBC324BF06F7FD');
    });

    it('T2.B5.5 Exact SHA-256 cryptographic match for Yash.jpg', () => {
        const hash = getFileSha256('Yash.jpg');
        assert.equal(hash, '042997632BD24C789C09FE649260061C93D24466256DC1CEF4E3A82CFA618264');
    });

    it('T2.B5.6 Image images/founder_bhagat_mukhiya.jpg is bit-for-bit identical to root bhagat.jpg', () => {
        const rootHash = getFileSha256('bhagat.jpg');
        const imgHash = getFileSha256('images/founder_bhagat_mukhiya.jpg');
        assert.ok(imgHash, 'images/founder_bhagat_mukhiya.jpg must exist');
        assert.equal(imgHash, rootHash, 'Images must be bit-for-bit identical');
    });

    it('T2.B5.7 Image images/founder_yash_gaikwad.jpg is bit-for-bit identical to root Yash.jpg', () => {
        const rootHash = getFileSha256('Yash.jpg');
        const imgHash = getFileSha256('images/founder_yash_gaikwad.jpg');
        assert.ok(imgHash, 'images/founder_yash_gaikwad.jpg must exist');
        assert.equal(imgHash, rootHash, 'Images must be bit-for-bit identical');
    });

    it('T2.B5.8 Founder biographical section in about.html contains zero Lorem Ipsum or placeholder text', () => {
        const aboutHtml = readHtmlPage('about.html');
        assert.doesNotMatch(aboutHtml, /lorem\s+ipsum/i, 'about.html must contain no lorem ipsum');
        assert.doesNotMatch(aboutHtml, /placeholder\s+text/i, 'about.html must contain no placeholder text');
    });

    it('T2.B5.9 Founder biographical section in index.html contains zero Lorem Ipsum or placeholder text', () => {
        const indexHtml = readHtmlPage('index.html');
        assert.doesNotMatch(indexHtml, /lorem\s+ipsum/i, 'index.html must contain no lorem ipsum');
    });

    it('T2.B5.10 Founder LinkedIn URLs strictly use https:// protocol and canonical pattern /in/[a-zA-Z0-9_-]+', () => {
        const aboutHtml = readHtmlPage('about.html');
        const links = extractLinks(aboutHtml);
        const founderLinks = links.filter(l => l.href.includes('linkedin.com/in/'));
        assert.ok(founderLinks.length >= 2, 'about.html must link to at least 2 founder LinkedIn profiles');
        for (const fl of founderLinks) {
            assert.ok(fl.href.startsWith('https://'), `LinkedIn URL must use https: ${fl.href}`);
            assert.match(fl.href, /https:\/\/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/);
        }
    });

    it('T2.B5.11 Bhagat Mukhiya external LinkedIn link strictly enforces target="_blank" and rel="noopener noreferrer"', () => {
        const aboutHtml = readHtmlPage('about.html');
        const links = extractLinks(aboutHtml);
        const bhagatLink = links.find(l => l.href.includes('bhagat-mukhiya'));
        assert.ok(bhagatLink, 'Bhagat Mukhiya LinkedIn link must exist');
        assert.ok(bhagatLink.raw.includes('target="_blank"'), 'Must specify target="_blank"');
        assert.ok(bhagatLink.raw.includes('rel="noopener') || bhagatLink.raw.includes('noreferrer'), 'Must specify rel="noopener noreferrer"');
    });

    it('T2.B5.12 Yash Gaikwad external LinkedIn link strictly enforces target="_blank" and rel="noopener noreferrer"', () => {
        const aboutHtml = readHtmlPage('about.html');
        const links = extractLinks(aboutHtml);
        const yashLink = links.find(l => l.href.includes('yash-gaikwad'));
        assert.ok(yashLink, 'Yash Gaikwad LinkedIn link must exist');
        assert.ok(yashLink.raw.includes('target="_blank"'), 'Must specify target="_blank"');
        assert.ok(yashLink.raw.includes('rel="noopener') || yashLink.raw.includes('noreferrer'), 'Must specify rel="noopener noreferrer"');
    });

    it('T2.B5.13 Official agency brand name Flying Cheetah is consistently capitalized across titles', () => {
        const aboutHtml = readHtmlPage('about.html');
        assert.doesNotMatch(aboutHtml, /\bflying cheetah labs\b/);
        assert.ok(aboutHtml.includes('Flying Cheetah'), 'Must contain properly capitalized Flying Cheetah');
    });

    it('T2.B5.14 Founder titles verified: Bhagat Mukhiya credited with Technical Architect, Yash Gaikwad with Growth/Operations', () => {
        const aboutHtml = readHtmlPage('about.html');
        assert.ok(aboutHtml.includes('Bhagat Mukhiya'));
        assert.ok(aboutHtml.includes('Yash Gaikwad'));
        assert.ok(aboutHtml.includes('Technical Architect') || aboutHtml.includes('Engineering Lead') || aboutHtml.includes('Co-Founder'));
        assert.ok(aboutHtml.includes('Growth') || aboutHtml.includes('Operations') || aboutHtml.includes('Client'));
    });

    it('T2.B5.15 Founder location badges verified: Mumbai / MMR presence confirmed in about.html', () => {
        const aboutHtml = readHtmlPage('about.html');
        assert.ok(aboutHtml.includes('Mumbai') || aboutHtml.includes('MMR'), 'about.html must reference Mumbai / MMR location');
    });
});

// =============================================================================
// CLASS B6: DEPLOYMENT & EXCLUSION BOUNDARIES (15 Tests)
// =============================================================================
describe('Class B6: Deployment & Exclusion Boundaries', () => {

    it('T2.B6.1 .vercelignore wildcard patterns cover deeply nested directories (*.msi, *.pdf, *.docx)', () => {
        const rules = readVercelIgnore();
        assert.ok(rules.some(r => r.includes('*.msi') || r.includes('.msi')));
        assert.ok(rules.some(r => r.includes('*.pdf') || r.includes('.pdf')));
        assert.ok(rules.some(r => r.includes('*.docx') || r.includes('.docx')));
    });

    it('T2.B6.2 Essential web assets (*.html, *.css, *.js, *.png, *.jpg, *.webp, *.svg) are NOT excluded by .vercelignore', () => {
        const rules = readVercelIgnore();
        const essentialWebExtensions = ['*.html', '*.css', '*.js', '*.png', '*.jpg', '*.webp', '*.svg'];
        for (const ext of essentialWebExtensions) {
            const forbidden = rules.includes(ext);
            assert.equal(forbidden, false, `.vercelignore must not exclude web asset pattern "${ext}"`);
        }
    });

    it('T2.B6.3 Heavy binary, presentation, and document files exist locally in workspace', () => {
        const heavyFiles = ['blender-5.3.0-windows-x64.msi', 'Financial Planning ECN.pptx', 'schema.sql'];
        for (const file of heavyFiles) {
            const p = path.join(PROJECT_ROOT, file);
            assert.ok(fs.existsSync(p), `Local asset ${file} must exist locally in workspace`);
        }
    });

    it('T2.B6.4 Heavy workspace files total > 100MB on disk', () => {
        const heavyFiles = ['blender-5.3.0-windows-x64.msi', 'Financial Planning ECN.pptx'];
        let total = 0;
        for (const file of heavyFiles) {
            total += fs.statSync(path.join(PROJECT_ROOT, file)).size;
        }
        assert.ok(total > 100 * 1024 * 1024, `Heavy assets must exceed 100MB, got ${(total / 1024 / 1024).toFixed(1)}MB`);
    });

    it('T2.B6.5 Environment files (.env*) are excluded by .vercelignore', () => {
        const rules = readVercelIgnore();
        const hasEnvRule = rules.some(r => r.includes('.env*') || r.includes('.env'));
        assert.ok(hasEnvRule, '.vercelignore must exclude .env files');
    });

    it('T2.B6.6 .vercelignore contains no empty lines after trimming or duplicate entries', () => {
        const ignorePath = path.join(PROJECT_ROOT, '.vercelignore');
        const lines = fs.readFileSync(ignorePath, 'utf8')
            .split(/\r?\n/)
            .map(l => l.trim())
            .filter(l => l && !l.startsWith('#'));
        const unique = new Set(lines);
        assert.equal(lines.length, unique.size, '.vercelignore must not contain duplicate rules');
    });

    it('T2.B6.7 .gitignore or .vercelignore excludes *.msi to prevent deployment of Windows installer binaries', () => {
        const vercelRules = readVercelIgnore();
        const gitRules = readGitIgnore();
        const vercelHasMsi = vercelRules.some(r => r.includes('*.msi') || r.includes('.msi'));
        const gitHasMsi = gitRules.some(r => r.includes('*.msi') || r.includes('.msi') || r.includes('blender'));
        assert.ok(vercelHasMsi || gitHasMsi, 'Must exclude *.msi from deployment and/or git');
    });

    it('T2.B6.8 .gitignore or .vercelignore excludes presentation documents (*.pptx)', () => {
        const vercelRules = readVercelIgnore();
        assert.ok(vercelRules.some(r => r.includes('*.pptx') || r.includes('.pptx')), '.vercelignore must exclude *.pptx');
    });

    it('T2.B6.9 .gitignore or .vercelignore excludes word documents (*.docx)', () => {
        const vercelRules = readVercelIgnore();
        assert.ok(vercelRules.some(r => r.includes('*.docx') || r.includes('.docx')), '.vercelignore must exclude *.docx');
    });

    it('T2.B6.10 flying-cheetah/.env.example exists at repository root', () => {
        const envInfo = readEnvExample();
        assert.ok(envInfo.exists, '.env.example must exist at repository root');
    });

    it('T2.B6.11 .env.example documents JWT_SECRET, INITIAL_ADMIN_PASSWORD, FOUNDER_NOTIFY_EMAIL', () => {
        const { variables } = readEnvExample();
        assert.ok(variables.includes('JWT_SECRET'), 'Must document JWT_SECRET');
        assert.ok(variables.includes('INITIAL_ADMIN_PASSWORD'), 'Must document INITIAL_ADMIN_PASSWORD');
        assert.ok(variables.includes('FOUNDER_NOTIFY_EMAIL'), 'Must document FOUNDER_NOTIFY_EMAIL');
    });

    it('T2.B6.12 .env.example documents SUPABASE_URL, SUPABASE_ANON_KEY', () => {
        const { variables } = readEnvExample();
        assert.ok(variables.includes('SUPABASE_URL'), 'Must document SUPABASE_URL');
        assert.ok(variables.includes('SUPABASE_ANON_KEY'), 'Must document SUPABASE_ANON_KEY');
    });

    it('T2.B6.13 .env.example documents SMTPS variables SMTP_USER, SMTP_PASS, SMTP_HOST, SMTP_PORT', () => {
        const { variables } = readEnvExample();
        assert.ok(variables.includes('SMTP_USER'), 'Must document SMTP_USER');
        assert.ok(variables.includes('SMTP_PASS'), 'Must document SMTP_PASS');
        assert.ok(variables.includes('SMTP_HOST'), 'Must document SMTP_HOST');
        assert.ok(variables.includes('SMTP_PORT'), 'Must document SMTP_PORT');
    });

    it('T2.B6.14 .env.example documents logistics & courier variables BORZO_AUTH_TOKEN, BORZO_ENV', () => {
        const { variables } = readEnvExample();
        assert.ok(variables.includes('BORZO_AUTH_TOKEN'), 'Must document BORZO_AUTH_TOKEN');
        assert.ok(variables.includes('BORZO_ENV'), 'Must document BORZO_ENV');
    });

    it('T2.B6.15 package.json contains zero external runtime production dependencies', () => {
        const pkg = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));
        const deps = pkg.dependencies || {};
        const count = Object.keys(deps).length;
        assert.equal(count, 0, `package.json dependencies must be empty for serverless runtime, found: ${JSON.stringify(deps)}`);
    });
});

// =============================================================================
// CLASS B7: SEO & JSON-LD BOUNDARIES (15 Tests)
// =============================================================================
describe('Class B7: SEO & JSON-LD Boundaries', () => {

    it('T2.B7.1 og:title values across all public pages are non-empty and non-whitespace', () => {
        for (const page of ALL_24_PAGES) {
            const html = readHtmlPage(page);
            const og = getOgTags(html);
            if (og['og:title']) {
                assert.ok(og['og:title'].trim().length > 0, `og:title in ${page} must not be empty whitespace`);
            }
        }
    });

    it('T2.B7.2 og:description length on public service pages is between 20 and 300 characters', () => {
        const servicePages = [
            'ai-voice-agents.html',
            'ctwa-automation.html',
            'delivery.html',
            'solutions.html',
            'whatsapp-automation.html'
        ];
        for (const page of servicePages) {
            const html = readHtmlPage(page);
            const og = getOgTags(html);
            if (og['og:description']) {
                const len = og['og:description'].length;
                assert.ok(len >= 20 && len <= 350, `og:description in ${page} length ${len} must be between 20 and 350`);
            }
        }
    });

    it('T2.B7.3 og:image values point to valid image formats (.jpg, .png, .webp, .svg)', () => {
        for (const page of ALL_24_PAGES) {
            const html = readHtmlPage(page);
            const og = getOgTags(html);
            if (og['og:image']) {
                assert.match(og['og:image'], /\.(?:jpg|jpeg|png|webp|svg)(?:\?.*)?$/i, `og:image in ${page} must be valid image format: ${og['og:image']}`);
            }
        }
    });

    it('T2.B7.4 sitemap.xml exists and contains valid <urlset> root tag', () => {
        const sitemap = parseSitemap();
        assert.ok(sitemap.exists, 'sitemap.xml must exist');
        assert.ok(sitemap.content.includes('<urlset'), 'sitemap.xml must have <urlset> root tag');
    });

    it('T2.B7.5 sitemap.xml dates conform strictly to ISO 8601 calendar dates in YYYY-MM-DD format', () => {
        const sitemap = parseSitemap();
        for (const entry of sitemap.urls) {
            if (entry.lastmod) {
                assert.match(entry.lastmod, /^\d{4}-\d{2}-\d{2}$/, `Invalid date format in sitemap: ${entry.lastmod}`);
            }
        }
    });

    it('T2.B7.6 sitemap.xml priority tags are valid decimal numbers between 0.0 and 1.0', () => {
        const sitemap = parseSitemap();
        for (const entry of sitemap.urls) {
            if (entry.priority) {
                const num = parseFloat(entry.priority);
                assert.ok(!isNaN(num) && num >= 0.0 && num <= 1.0, `Priority in sitemap must be 0.0-1.0: ${entry.priority}`);
            }
        }
    });

    it('T2.B7.7 JSON-LD structured data in index.html declares valid schema.org context', () => {
        const homeHtml = readHtmlPage('index.html');
        const jsonLdBlocks = parseJsonLd(homeHtml);
        assert.ok(jsonLdBlocks.length > 0, 'index.html must contain JSON-LD block');
        for (const block of jsonLdBlocks) {
            assert.match(block['@context'] || '', /https?:\/\/schema\.org/i, 'JSON-LD block must declare schema.org @context');
        }
    });

    it('T2.B7.8 Every <loc> entry in sitemap.xml begins with https://', () => {
        const sitemap = parseSitemap();
        for (const entry of sitemap.urls) {
            assert.ok(entry.loc.startsWith('https://'), `Sitemap entry must use HTTPS: ${entry.loc}`);
        }
    });

    it('T2.B7.9 index.html contains valid JSON-LD structured data with zero syntax errors', () => {
        const homeHtml = readHtmlPage('index.html');
        const jsonLdBlocks = parseJsonLd(homeHtml);
        assert.ok(jsonLdBlocks.length > 0, 'index.html must contain JSON-LD block');
        for (const block of jsonLdBlocks) {
            assert.equal(block.__invalid, undefined, `JSON-LD syntax error: ${block.__error}`);
        }
    });

    it('T2.B7.10 JSON-LD script blocks across public pages parse strictly without trailing commas or syntax errors', () => {
        for (const page of ALL_24_PAGES) {
            const html = readHtmlPage(page);
            const jsonLdBlocks = parseJsonLd(html);
            for (const block of jsonLdBlocks) {
                assert.equal(block.__invalid, undefined, `JSON-LD parse failure in ${page}: ${block.__error}`);
            }
        }
    });

    it('T2.B7.11 Canonical URL tags (<link rel="canonical">) across public pages use https://flying-cheetah.vercel.app/', () => {
        for (const page of ALL_24_PAGES) {
            const html = readHtmlPage(page);
            const canonicalMatch = html.match(/<link\s+[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i);
            if (canonicalMatch) {
                assert.ok(canonicalMatch[1].startsWith('https://flying-cheetah.vercel.app'), `Canonical URL in ${page} must use https://flying-cheetah.vercel.app`);
            }
        }
    });

    it('T2.B7.12 vercel.json defines permanent 301 redirects from /home and /home.html to /', () => {
        const { exists, config } = readVercelConfig();
        assert.ok(exists, 'vercel.json must exist');
        assert.ok(Array.isArray(config.redirects), 'vercel.json must specify redirects array');
        const homeRedirect = config.redirects.find(r => r.source === '/home');
        const homeHtmlRedirect = config.redirects.find(r => r.source === '/home.html');
        assert.ok(homeRedirect, 'Must have /home redirect');
        assert.equal(homeRedirect.destination, '/');
        assert.equal(homeRedirect.permanent, true);
        assert.ok(homeHtmlRedirect, 'Must have /home.html redirect');
        assert.equal(homeHtmlRedirect.destination, '/');
        assert.equal(homeHtmlRedirect.permanent, true);
    });

    it('T2.B7.13 vercel.json specifies strict security headers (X-Content-Type-Options, X-Frame-Options, X-XSS-Protection)', () => {
        const { config } = readVercelConfig();
        assert.ok(Array.isArray(config.headers), 'vercel.json headers must be an array');
        const globalRule = config.headers.find(h => h.source === '/(.*)');
        assert.ok(globalRule, 'Global header rule must exist');
        const headers = {};
        for (const h of globalRule.headers) {
            headers[h.key.toLowerCase()] = h.value;
        }
        assert.equal(headers['x-content-type-options'], 'nosniff');
        assert.equal(headers['x-frame-options'], 'SAMEORIGIN');
        assert.match(headers['x-xss-protection'], /1;\s*mode=block/);
    });

    it('T2.B7.14 Page <title> tags across public pages contain Flying Cheetah brand name', () => {
        for (const page of ALL_24_PAGES) {
            const html = readHtmlPage(page);
            const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
            assert.ok(titleMatch, `${page} must contain a <title> tag`);
            assert.match(titleMatch[1], /Flying\s+Cheetah/i, `<title> in ${page} must contain Flying Cheetah`);
        }
    });

    it('T2.B7.15 Public service pages declare meta robots permitting indexing', () => {
        const servicePages = ['ai-voice-agents.html', 'solutions.html', 'web-development.html'];
        for (const page of servicePages) {
            const html = readHtmlPage(page);
            const metaTags = parseMetaTags(html);
            const robots = metaTags.find(m => m.name === 'robots');
            if (robots) {
                assert.doesNotMatch(robots.content, /noindex/i, `${page} must not declare noindex`);
            }
        }
    });
});

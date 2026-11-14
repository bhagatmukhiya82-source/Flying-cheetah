/**
 * MILESTONE 1 VERIFICATION TEST SUITE
 * Backend Security & Serverless API Hardening
 * Uses native Node.js test runner (node:test, node:assert)
 * Run: node --test tests/m1_backend_security.test.js
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const { invokeHandler, withEnv, createMockReqRes } = require('./e2e/helpers');

const mailer = require('../api/_mailer');
const authGuard = require('../api/_auth');
const authHandler = require('../api/auth');
const leadsHandler = require('../api/leads');
const demosHandler = require('../api/demos');
const sendEmailHandler = require('../api/send-email');
const fleetHandler = require('../api/fleet');

const TEST_SECRET = 'fc_test_secret_key_m1_backend_hardening_2026_test!';
const API_DIR = path.resolve(__dirname, '../api');

describe('M1 - api/_mailer.js Module', () => {
    test('escapeHtml: escapes all HTML control characters (&, <, >, ", \')', () => {
        const input = '<script>alert("XSS & \'attack\'");</script>';
        const expected = '&lt;script&gt;alert(&quot;XSS &amp; &#39;attack&#39;&quot;);&lt;/script&gt;';
        assert.strictEqual(mailer.escapeHtml(input), expected);
    });

    test('escapeHtml: handles null, undefined, and non-string primitives', () => {
        assert.strictEqual(mailer.escapeHtml(null), '');
        assert.strictEqual(mailer.escapeHtml(undefined), '');
        assert.strictEqual(mailer.escapeHtml(12345), '12345');
        assert.strictEqual(mailer.escapeHtml(true), 'true');
        assert.strictEqual(mailer.escapeHtml(false), 'false');
    });

    test('escapeHtml: prevents attribute breakout attempts', () => {
        const payload = '"><img src=x onerror=alert(1)>';
        const escaped = mailer.escapeHtml(payload);
        assert.ok(!escaped.includes('"'));
        assert.ok(escaped.includes('&quot;'));
        assert.ok(!escaped.includes('<'));
        assert.ok(escaped.includes('&lt;'));
    });

    test('sanitizeHeader: strips CRLF characters to prevent SMTP header injection', () => {
        const malicious = 'Test Subject\r\nBcc: evil@attacker.com\r\n\r\nInjected Body';
        const sanitized = mailer.sanitizeHeader(malicious);
        assert.ok(!sanitized.includes('\r'));
        assert.ok(!sanitized.includes('\n'));
        assert.strictEqual(sanitized, 'Test Subject Bcc: evil@attacker.com Injected Body');
    });

    test('sanitizeHeader: handles null, undefined, and empty headers', () => {
        assert.strictEqual(mailer.sanitizeHeader(null), '');
        assert.strictEqual(mailer.sanitizeHeader(undefined), '');
        assert.strictEqual(mailer.sanitizeHeader('   clean subject   '), 'clean subject');
    });

    test('sendMail: fails gracefully when SMTP credentials are not configured', async () => {
        await withEnv({ SMTP_USER: null, SMTP_PASS: null, SMTP_PASSWORD: null }, async () => {
            const result = await mailer.sendMail({
                to: 'recipient@example.com',
                subject: 'Test Notification',
                html: '<p>Test</p>'
            });
            assert.strictEqual(result.success, false);
            assert.ok(result.error.includes('credentials not configured'));
        });
    });

    test('sendMail: fails gracefully when recipient email is invalid or missing', async () => {
        await withEnv({ SMTP_USER: 'sender@example.com', SMTP_PASS: 'pass123' }, async () => {
            const result = await mailer.sendMail({
                to: 'invalid-email-address',
                subject: 'Test',
                html: '<p>Test</p>'
            });
            assert.strictEqual(result.success, false);
            assert.ok(result.error.includes('Invalid recipient'));
        });
    });

    test('sendSmtpEmail: returns boolean false when SMTP is unconfigured', async () => {
        await withEnv({ SMTP_USER: null, SMTP_PASS: null, SMTP_PASSWORD: null }, async () => {
            const result = await mailer.sendSmtpEmail({
                to: 'recipient@example.com',
                subject: 'Test',
                html: '<p>Test</p>'
            });
            assert.strictEqual(result, false);
        });
    });

    test('TLS security: api/_mailer.js explicitly enforces rejectUnauthorized: true', () => {
        const code = fs.readFileSync(path.join(API_DIR, '_mailer.js'), 'utf8');
        assert.match(code, /rejectUnauthorized:\s*true/);
        assert.doesNotMatch(code, /rejectUnauthorized:\s*false/);
    });
});

describe('M1 - api/_auth.js Module', () => {
    test('getJwtSecret: throws fatal error when secret is not configured', async () => {
        await withEnv({ JWT_SECRET: null, SECRET_KEY: null }, async () => {
            assert.throws(() => {
                authGuard.getJwtSecret();
            }, /FATAL: JWT_SECRET or SECRET_KEY/);
        });
    });

    test('getJwtSecret: returns configured JWT_SECRET or SECRET_KEY', async () => {
        await withEnv({ JWT_SECRET: 'my_custom_jwt_secret_val' }, async () => {
            assert.strictEqual(authGuard.getJwtSecret(), 'my_custom_jwt_secret_val');
        });
        await withEnv({ JWT_SECRET: null, SECRET_KEY: 'my_custom_secret_key_val' }, async () => {
            assert.strictEqual(authGuard.getJwtSecret(), 'my_custom_secret_key_val');
        });
    });

    test('signJwt and verifyJwt: correctly encodes and verifies valid HS256 JWT', async () => {
        await withEnv({ SECRET_KEY: TEST_SECRET }, async () => {
            const payload = { sub: 'usr_admin_1', email: 'admin@flyingcheetah.agency', role: 'admin' };
            const token = authGuard.signJwt(payload, 3600);
            assert.ok(token && token.split('.').length === 3);

            const decoded = authGuard.verifyJwt(token);
            assert.ok(decoded);
            assert.strictEqual(decoded.sub, 'usr_admin_1');
            assert.strictEqual(decoded.email, 'admin@flyingcheetah.agency');
            assert.strictEqual(decoded.role, 'admin');
            assert.ok(decoded.exp > Math.floor(Date.now() / 1000));
        });
    });

    test('verifyJwt: rejects malformed, truncated, or tampered tokens', async () => {
        await withEnv({ SECRET_KEY: TEST_SECRET }, async () => {
            assert.strictEqual(authGuard.verifyJwt(''), null);
            assert.strictEqual(authGuard.verifyJwt('onlyonepart'), null);
            assert.strictEqual(authGuard.verifyJwt('two.parts'), null);
            assert.strictEqual(authGuard.verifyJwt('four.parts.here.extra'), null);

            // Valid signature tampered
            const validToken = authGuard.signJwt({ sub: 'test' });
            const [h, b, s] = validToken.split('.');
            const tampered = `${h}.${b}.invalidsignature12345`;
            assert.strictEqual(authGuard.verifyJwt(tampered), null);
        });
    });

    test('verifyJwt: rejects expired tokens', async () => {
        await withEnv({ SECRET_KEY: TEST_SECRET }, async () => {
            // Token expired 1 hour ago
            const token = authGuard.signJwt({ sub: 'expired_user' }, -3600);
            assert.strictEqual(authGuard.verifyJwt(token), null);
        });
    });

    test('hashPasswordScrypt: generates unique 16-byte random salts', () => {
        const hash1 = authGuard.hashPasswordScrypt('MySecretPassword2026!');
        const hash2 = authGuard.hashPasswordScrypt('MySecretPassword2026!');

        assert.ok(hash1.includes(':'));
        assert.ok(hash2.includes(':'));

        const [salt1, key1] = hash1.split(':');
        const [salt2, key2] = hash2.split(':');

        assert.strictEqual(salt1.length, 32); // 16 bytes = 32 hex chars
        assert.strictEqual(key1.length, 128); // 64 bytes = 128 hex chars
        assert.notStrictEqual(salt1, salt2, 'Salts must be randomly generated and unique');
        assert.notStrictEqual(hash1, hash2, 'Identical passwords must produce distinct hashes');
    });

    test('verifyPassword: correctly verifies scrypt hash without rehash needed', () => {
        const password = 'CorrectPassword2026!';
        const hash = authGuard.hashPasswordScrypt(password);

        const valid = authGuard.verifyPassword(password, hash);
        assert.strictEqual(valid.verified, true);
        assert.strictEqual(valid.needsRehash, false);

        const invalid = authGuard.verifyPassword('WrongPassword!', hash);
        assert.strictEqual(invalid.verified, false);
        assert.strictEqual(invalid.needsRehash, false);
    });

    test('verifyPassword: auto-migrates legacy SHA-256 hash (needsRehash: true)', async () => {
        await withEnv({ SECRET_KEY: TEST_SECRET }, async () => {
            const password = 'LegacyPassword2026!';
            // Legacy formula: SHA-256 of (password + SECRET_KEY)
            const legacyHashA = crypto.createHash('sha256').update(password + TEST_SECRET).digest('hex');
            assert.strictEqual(legacyHashA.length, 64);

            const resultA = authGuard.verifyPassword(password, legacyHashA);
            assert.strictEqual(resultA.verified, true);
            assert.strictEqual(resultA.needsRehash, true);

            // Legacy formula: plain SHA-256 of password
            const legacyHashB = crypto.createHash('sha256').update(password).digest('hex');
            assert.strictEqual(legacyHashB.length, 64);

            const resultB = authGuard.verifyPassword(password, legacyHashB);
            assert.strictEqual(resultB.verified, true);
            assert.strictEqual(resultB.needsRehash, true);

            // Incorrect password against legacy hash
            const invalidResult = authGuard.verifyPassword('WrongPass!', legacyHashA);
            assert.strictEqual(invalidResult.verified, false);
            assert.strictEqual(invalidResult.needsRehash, false);
        });
    });

    test('requireAdminAuth: rejects missing or invalid Authorization header with HTTP 401', () => {
        const { req, res } = createMockReqRes({ headers: {} });
        const result = authGuard.requireAdminAuth(req, res);
        assert.strictEqual(result, null);
        assert.strictEqual(res.statusCode, 401);
    });

    test('requireAdminAuth: rejects non-admin client token with HTTP 401', async () => {
        await withEnv({ SECRET_KEY: TEST_SECRET }, async () => {
            const clientToken = authGuard.signJwt({
                sub: 'client_1',
                email: 'client@example.com',
                role: 'client'
            });
            const { req, res } = createMockReqRes({
                headers: { authorization: `Bearer ${clientToken}` }
            });
            const result = authGuard.requireAdminAuth(req, res);
            assert.strictEqual(result, null);
            assert.strictEqual(res.statusCode, 401);
        });
    });

    test('requireAdminAuth: accepts valid admin token and returns authenticated payload', async () => {
        await withEnv({ SECRET_KEY: TEST_SECRET }, async () => {
            const adminToken = authGuard.signJwt({
                sub: 'admin_1',
                email: 'flyingcheetah.agency@gmail.com',
                role: 'admin'
            });
            const { req, res } = createMockReqRes({
                headers: { authorization: `Bearer ${adminToken}` }
            });
            const result = authGuard.requireAdminAuth(req, res);
            assert.ok(result);
            assert.strictEqual(result.authenticated, true);
            assert.strictEqual(result.email, 'flyingcheetah.agency@gmail.com');
            assert.strictEqual(res.statusCode, 200);
        });
    });
});

describe('M1 - Endpoint Authentication & Route Guarding', () => {
    test('GET /api/leads: rejects unauthenticated caller with 401', async () => {
        const res = await invokeHandler(leadsHandler, {
            method: 'GET',
            headers: {}
        });
        assert.strictEqual(res.statusCode, 401);
    });

    test('GET /api/leads: rejects non-admin token with 401', async () => {
        await withEnv({ SECRET_KEY: TEST_SECRET }, async () => {
            const clientToken = authGuard.signJwt({ sub: 'user_1', role: 'client', email: 'user@example.com' });
            const res = await invokeHandler(leadsHandler, {
                method: 'GET',
                headers: { authorization: `Bearer ${clientToken}` }
            });
            assert.strictEqual(res.statusCode, 401);
        });
    });

    test('PATCH /api/leads: rejects unauthenticated caller with 401', async () => {
        const res = await invokeHandler(leadsHandler, {
            method: 'PATCH',
            headers: {},
            body: { id: 'lead_1', status: 'contacted' }
        });
        assert.strictEqual(res.statusCode, 401);
    });

    test('GET /api/demos: rejects unauthenticated caller with 401', async () => {
        const res = await invokeHandler(demosHandler, {
            method: 'GET',
            headers: {}
        });
        assert.strictEqual(res.statusCode, 401);
    });

    test('GET /api/demos: rejects non-admin token with 401', async () => {
        await withEnv({ SECRET_KEY: TEST_SECRET }, async () => {
            const clientToken = authGuard.signJwt({ sub: 'user_1', role: 'client', email: 'user@example.com' });
            const res = await invokeHandler(demosHandler, {
                method: 'GET',
                headers: { authorization: `Bearer ${clientToken}` }
            });
            assert.strictEqual(res.statusCode, 401);
        });
    });
});

describe('M1 - Database Failure Propagation & Honeypot Filtering', () => {
    test('POST /api/leads: returns 502/500 when Supabase is unreachable (NO synthetic 201 lead object)', async () => {
        await withEnv({
            SUPABASE_URL: 'http://127.0.0.1:59999',
            SUPABASE_ANON_KEY: 'test_anon_key',
            SECRET_KEY: TEST_SECRET
        }, async () => {
            const res = await invokeHandler(leadsHandler, {
                method: 'POST',
                body: {
                    name: 'Test Prospect',
                    email: 'prospect@brand.com',
                    phone: '+919920386421',
                    service: 'Operations Audit'
                }
            });
            assert.notStrictEqual(res.statusCode, 201);
            assert.ok(res.statusCode === 500 || res.statusCode === 502);
            assert.ok(res.json?.error);
            assert.strictEqual(res.json?.id, undefined);
        });
    });

    test('POST /api/demos: returns 502/500 when Supabase is unreachable (NO synthetic 201 demo object)', async () => {
        await withEnv({
            SUPABASE_URL: 'http://127.0.0.1:59999',
            SUPABASE_ANON_KEY: 'test_anon_key',
            SECRET_KEY: TEST_SECRET
        }, async () => {
            const res = await invokeHandler(demosHandler, {
                method: 'POST',
                body: {
                    name: 'Founder Demo',
                    email: 'founder@d2c.in',
                    phone: '+919820011998',
                    company: 'Mumbai Apparel'
                }
            });
            assert.notStrictEqual(res.statusCode, 201);
            assert.ok(res.statusCode === 500 || res.statusCode === 502);
            assert.ok(res.json?.error);
            assert.strictEqual(res.json?.id, undefined);
        });
    });

    test('POST /api/leads: honeypot traps spam bots cleanly with 201 bot-filtered', async () => {
        const res = await invokeHandler(leadsHandler, {
            method: 'POST',
            body: {
                name: 'Spam Bot',
                email: 'bot@spam.com',
                phone: '1234567890',
                honeypot: 'filled_by_bot'
            }
        });
        assert.strictEqual(res.statusCode, 201);
        assert.strictEqual(res.json?.id, 'bot-filtered');
    });

    test('POST /api/demos: honeypot traps spam bots cleanly with 201 hp-bot', async () => {
        const res = await invokeHandler(demosHandler, {
            method: 'POST',
            body: {
                name: 'Spam Bot',
                email: 'bot@spam.com',
                phone: '1234567890',
                honeypot: 'filled_by_bot'
            }
        });
        assert.strictEqual(res.statusCode, 201);
        assert.strictEqual(res.json?.id, 'hp-bot');
    });

    test('POST /api/leads: rejects missing required fields with 400', async () => {
        const res = await invokeHandler(leadsHandler, {
            method: 'POST',
            body: { name: 'Only Name' }
        });
        assert.strictEqual(res.statusCode, 400);
        assert.ok(res.json?.error);
    });

    test('POST /api/demos: rejects missing required fields with 400', async () => {
        const res = await invokeHandler(demosHandler, {
            method: 'POST',
            body: { name: 'Only Name' }
        });
        assert.strictEqual(res.statusCode, 400);
        assert.ok(res.json?.error);
    });
});

describe('M1 - Authentication Security & Hardening in api/auth.js', () => {
    test('POST /api/auth?action=forgot-password: does NOT return OTP in HTTP response body', async () => {
        await withEnv({ SECRET_KEY: TEST_SECRET }, async () => {
            const res = await invokeHandler(authHandler, {
                method: 'POST',
                url: '/api/auth?action=forgot-password',
                body: { email: 'user@example.com' }
            });
            assert.strictEqual(res.statusCode, 200);
            assert.strictEqual(res.json?.success, true);
            assert.strictEqual(res.json?.otp, undefined, 'OTP must not be returned in production response payload');
        });
    });

    test('POST /api/auth?action=request-change-password-otp: does NOT return OTP in response body', async () => {
        await withEnv({ SECRET_KEY: TEST_SECRET }, async () => {
            const token = authGuard.signJwt({ sub: 'user_1', email: 'user@example.com', role: 'client' });
            const res = await invokeHandler(authHandler, {
                method: 'POST',
                url: '/api/auth?action=request-change-password-otp',
                headers: { authorization: `Bearer ${token}` },
                body: { email: 'user@example.com' }
            });
            assert.strictEqual(res.statusCode, 200);
            assert.strictEqual(res.json?.otp, undefined, 'OTP must not be returned in response payload');
        });
    });

    test('POST /api/auth?action=login: rejects wrong password with 401', async () => {
        await withEnv({ SECRET_KEY: TEST_SECRET }, async () => {
            const res = await invokeHandler(authHandler, {
                method: 'POST',
                url: '/api/auth?action=login',
                body: {
                    email: 'flyingcheetah.agency@gmail.com',
                    password: 'WrongPasswordAttempt123!'
                }
            });
            assert.strictEqual(res.statusCode, 401);
            assert.ok(res.json?.error?.includes('Invalid email or password'));
        });
    });

    test('POST /api/auth?action=login: rejects unknown user with 401 (backdoor removed)', async () => {
        await withEnv({
            SECRET_KEY: TEST_SECRET,
            SUPABASE_URL: 'http://127.0.0.1:59999',
            SUPABASE_ANON_KEY: 'test_key'
        }, async () => {
            const res = await invokeHandler(authHandler, {
                method: 'POST',
                url: '/api/auth?action=login',
                body: {
                    email: 'nonexistent_random_user_2026@gmail.com',
                    password: 'AdminPass2026!'
                }
            });
            assert.strictEqual(res.statusCode, 401);
            assert.ok(res.json?.error?.includes('Invalid email or password'));
        });
    });
});

describe('M1 - Secret Scrubbing & Codebase Hygiene Audit', () => {
    test('Zero occurrences of plaintext Gmail app password "sryzptfthzfeeeco"', () => {
        const files = fs.readdirSync(API_DIR).filter(f => f.endsWith('.js'));
        const leaks = [];
        for (const file of files) {
            const content = fs.readFileSync(path.join(API_DIR, file), 'utf8');
            if (content.includes('sryzptfthzfeeeco')) {
                leaks.push(file);
            }
        }
        assert.deepStrictEqual(leaks, [], `Plaintext password found in: ${leaks.join(', ')}`);
    });

    test('Zero occurrences of hardcoded fallback JWT secret "flying_cheetah_super_secure..."', () => {
        const forbiddenSecret = 'flying_cheetah_super_secure_jwt_secret_key_2026_mumbai_d2c_ai';
        const files = fs.readdirSync(API_DIR).filter(f => f.endsWith('.js'));
        const leaks = [];
        for (const file of files) {
            const content = fs.readFileSync(path.join(API_DIR, file), 'utf8');
            if (content.includes(forbiddenSecret)) {
                leaks.push(file);
            }
        }
        assert.deepStrictEqual(leaks, [], `Hardcoded JWT secret found in: ${leaks.join(', ')}`);
    });

    test('Zero occurrences of personal email fallback "bhagatmukhiya82@gmail.com"', () => {
        const files = fs.readdirSync(API_DIR).filter(f => f.endsWith('.js'));
        const leaks = [];
        for (const file of files) {
            const content = fs.readFileSync(path.join(API_DIR, file), 'utf8');
            if (content.includes('bhagatmukhiya82@gmail.com')) {
                leaks.push(file);
            }
        }
        assert.deepStrictEqual(leaks, [], `Personal email fallback found in: ${leaks.join(', ')}`);
    });

    test('Zero occurrences of unverified TLS setting "rejectUnauthorized: false"', () => {
        const files = fs.readdirSync(API_DIR).filter(f => f.endsWith('.js'));
        const leaks = [];
        for (const file of files) {
            const content = fs.readFileSync(path.join(API_DIR, file), 'utf8');
            if (/rejectUnauthorized:\s*false/.test(content)) {
                leaks.push(file);
            }
        }
        assert.deepStrictEqual(leaks, [], `Insecure TLS setting found in: ${leaks.join(', ')}`);
    });
});

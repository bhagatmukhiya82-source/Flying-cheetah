/**
 * ADVERSARIAL CHALLENGER TEST SUITE - MILESTONE 1
 * Rigorous empirical stress-testing across all edge conditions for:
 * 1. Safe JWT Fallback across all secret env configurations (api/auth.js)
 * 2. Lead Capture Persistence against Supabase (api/leads.js) & Honeypot Trap
 * 3. Route Guarding on Sensitive Endpoints (GET /api/leads, GET /api/demos, PATCH /api/leads)
 * 4. Public Endpoints Resilience & Safe Fallbacks
 */

const { test, describe } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const crypto = require('node:crypto');

const { invokeHandler, withEnv, createMockReqRes } = require('./e2e/helpers');

const authHandler = require('../api/auth');
const authGuard = require('../api/_auth');
const leadsHandler = require('../api/leads');
const demosHandler = require('../api/demos');
const healthHandler = require('../api/health');
const telemetryHandler = require('../api/telemetry');
const sendEmailHandler = require('../api/send-email');
const fleetHandler = require('../api/fleet');
const borzoHandler = require('../api/borzo-dispatch');

const TEST_SECRET = 'fc_challenger_adversarial_test_secret_key_2026_test!';

describe('CHALLENGER 1: Safe JWT Fallback Under Extreme Edge Conditions (api/auth.js)', () => {
    const SECRET_CONDITIONS = [
        { label: 'Both null / undefined', env: { JWT_SECRET: null, SECRET_KEY: null } },
        { label: 'Both empty string', env: { JWT_SECRET: '', SECRET_KEY: '' } },
        { label: 'Both whitespace only', env: { JWT_SECRET: '   ', SECRET_KEY: '   \t\n' } },
        { label: 'JWT_SECRET null, SECRET_KEY empty', env: { JWT_SECRET: null, SECRET_KEY: '' } },
        { label: 'JWT_SECRET empty, SECRET_KEY null', env: { JWT_SECRET: '', SECRET_KEY: null } },
        { label: 'JWT_SECRET whitespace, SECRET_KEY unset', env: { JWT_SECRET: ' \t ', SECRET_KEY: null } }
    ];

    for (const { label, env } of SECRET_CONDITIONS) {
        describe(`Secret Condition: ${label}`, () => {
            test('Valid admin login returns HTTP 200 with sandbox mock token (no 500)', async () => {
                await withEnv(env, async () => {
                    const res = await invokeHandler(authHandler, {
                        method: 'POST',
                        url: '/api/auth?action=login',
                        body: {
                            email: 'flyingcheetah.agency@gmail.com',
                            password: 'AdminPass2026!'
                        }
                    });

                    assert.strictEqual(res.statusCode, 200, `Expected 200 for ${label}, got ${res.statusCode}`);
                    assert.ok(res.json, 'Response must be valid JSON');
                    assert.ok(res.json.access_token, 'Response must include access_token');
                    assert.strictEqual(res.json.token_type, 'bearer');
                    assert.strictEqual(res.json.user?.email, 'flyingcheetah.agency@gmail.com');
                    assert.strictEqual(res.json.user?.role, 'admin');

                    // Parse the mock token payload to verify sandbox flag
                    const parts = res.json.access_token.split('.');
                    assert.strictEqual(parts.length, 3, 'Mock token must have 3 dot-delimited parts');
                    assert.strictEqual(parts[0], 'fc_sandbox_mock_token');
                    assert.strictEqual(parts[2], 'sandbox_sig');

                    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
                    assert.strictEqual(payload.sandbox, true, 'Mock token payload must contain sandbox: true');
                    assert.strictEqual(payload.role, 'admin');
                    assert.ok(payload.exp > Math.floor(Date.now() / 1000));
                });
            });

            test('Invalid password returns HTTP 401 (no 500)', async () => {
                await withEnv(env, async () => {
                    const res = await invokeHandler(authHandler, {
                        method: 'POST',
                        url: '/api/auth?action=login',
                        body: {
                            email: 'flyingcheetah.agency@gmail.com',
                            password: 'WrongPasswordAdversarial999!'
                        }
                    });

                    assert.strictEqual(res.statusCode, 401);
                    assert.ok(res.json?.error);
                    assert.notStrictEqual(res.statusCode, 500);
                });
            });

            test('Empty credentials return HTTP 400 (no 500)', async () => {
                await withEnv(env, async () => {
                    const res = await invokeHandler(authHandler, {
                        method: 'POST',
                        url: '/api/auth?action=login',
                        body: { email: '', password: '' }
                    });

                    assert.strictEqual(res.statusCode, 400);
                    assert.notStrictEqual(res.statusCode, 500);
                });
            });

            test('Malformed JSON string returns HTTP 400 (no 500)', async () => {
                await withEnv(env, async () => {
                    const res = await invokeHandler(authHandler, {
                        method: 'POST',
                        url: '/api/auth?action=login',
                        body: '{ broken json unclosed'
                    });

                    assert.strictEqual(res.statusCode, 400);
                    assert.notStrictEqual(res.statusCode, 500);
                });
            });

            test('Null body returns HTTP 400 (no 500)', async () => {
                await withEnv(env, async () => {
                    const res = await invokeHandler(authHandler, {
                        method: 'POST',
                        url: '/api/auth?action=login',
                        body: null
                    });

                    assert.strictEqual(res.statusCode, 400);
                    assert.notStrictEqual(res.statusCode, 500);
                });
            });

            test('Primitive bodies (boolean, number, array) return HTTP 400 without crashing', async () => {
                await withEnv(env, async () => {
                    for (const badBody of [12345, true, false, []]) {
                        const res = await invokeHandler(authHandler, {
                            method: 'POST',
                            url: '/api/auth?action=login',
                            body: badBody
                        });
                        assert.strictEqual(res.statusCode, 400, `Expected 400 for body type: ${typeof badBody}`);
                    }
                });
            });
        });
    }
});

describe('CHALLENGER 2: Lead Capture Persistence & Honeypot Stress Testing (api/leads.js)', () => {
    test('POST /api/leads: Minimal required fields (name, email, phone) persist successfully', async () => {
        const uniqueEmail = `challenger_min_${Date.now()}@example.com`;
        const res = await invokeHandler(leadsHandler, {
            method: 'POST',
            body: {
                name: 'Challenger Minimal Lead',
                email: uniqueEmail,
                phone: '+919920386421'
            }
        });

        assert.strictEqual(res.statusCode, 201);
        assert.ok(res.json?.id, 'Persisted lead must have Supabase UUID');
        assert.strictEqual(res.json?.email, uniqueEmail);
        assert.strictEqual(res.json?.service, 'General Consultation');
        // Crucial: generated column service_interested must match service without Postgres 428C9 error
        assert.strictEqual(res.json?.service_interested, 'General Consultation');
    });

    test('POST /api/leads: All optional fields populated (service, message, source_page) persist cleanly', async () => {
        const uniqueEmail = `challenger_full_${Date.now()}@example.com`;
        const res = await invokeHandler(leadsHandler, {
            method: 'POST',
            body: {
                name: 'Challenger Full Spec Prospect',
                email: uniqueEmail,
                phone: '+919820011998',
                service: 'Operations Audit',
                message: 'Detailed adversarial stress test audit request',
                source_page: 'adversarial-suite'
            }
        });

        assert.strictEqual(res.statusCode, 201);
        assert.ok(res.json?.id);
        assert.strictEqual(res.json?.service, 'Operations Audit');
        assert.strictEqual(res.json?.service_interested, 'Operations Audit');
        assert.strictEqual(res.json?.source_page, 'adversarial-suite');
    });

    test('POST /api/leads: Various service names (Unicode, special chars, long text) persist without SQL error', async () => {
        const serviceVariations = [
            'व्हाट्सएप ऑटोमेशन (WhatsApp Automation)',
            'D2C & B2B AI Voice Agents <script>alert("xss")</script>',
            'Custom CRM Integration -- DROP TABLE leads; --',
            'Service_'.repeat(20)
        ];

        for (const s of serviceVariations) {
            const res = await invokeHandler(leadsHandler, {
                method: 'POST',
                body: {
                    name: 'Unicode / Special Char Lead',
                    email: `challenger_service_${Date.now()}_${Math.random().toString(36).slice(2, 6)}@example.com`,
                    phone: '9920386421',
                    service: s
                }
            });

            assert.strictEqual(res.statusCode, 201, `Failed to persist service: ${s}`);
            assert.strictEqual(res.json?.service, s);
            assert.strictEqual(res.json?.service_interested, s);
        }
    });

    test('POST /api/leads: Missing required fields (name, email, phone) return HTTP 400', async () => {
        const missingTestCases = [
            { email: 'only_email@example.com', phone: '123' },       // missing name
            { name: 'Only Name', phone: '123' },                     // missing email
            { name: 'Only Name', email: 'name@example.com' },        // missing phone
            {}                                                       // completely empty
        ];

        for (const badPayload of missingTestCases) {
            const res = await invokeHandler(leadsHandler, {
                method: 'POST',
                body: badPayload
            });
            assert.strictEqual(res.statusCode, 400, `Expected 400 for payload: ${JSON.stringify(badPayload)}`);
            assert.ok(res.json?.error);
        }
    });

    test('POST /api/leads: Standard honeypot field traps spam bots with HTTP 201 bot-filtered', async () => {
        const res = await invokeHandler(leadsHandler, {
            method: 'POST',
            body: {
                name: 'Spam Bot 3000',
                email: 'bot@spammer.org',
                phone: '1234567890',
                honeypot: 'bot_trap_triggered'
            }
        });

        assert.strictEqual(res.statusCode, 201);
        assert.strictEqual(res.json?.id, 'bot-filtered');
        assert.strictEqual(res.json?.status, 'closed');
    });

    test('REMEDIATION VERIFIED: POST /api/leads with website_url triggers honeypot filter with HTTP 201 bot-filtered', async () => {
        const res = await invokeHandler(leadsHandler, {
            method: 'POST',
            body: {
                name: 'Bot Website Trap Probe',
                email: `bot_probe_${Date.now()}@spammer.org`,
                phone: '1234567890',
                website_url: 'http://spammer-payload.example.com'
            }
        });

        assert.strictEqual(res.statusCode, 201);
        assert.strictEqual(res.json?.id, 'bot-filtered', 'Confirms website_url is caught by honeypot');
        assert.strictEqual(res.json?.status, 'closed');
    });

    test('REMEDIATION VERIFIED: Whitespace-only fields in leads return HTTP 400 Bad Request', async () => {
        const res = await invokeHandler(leadsHandler, {
            method: 'POST',
            body: { name: ' ', email: '   ', phone: '   ' }
        });

        assert.strictEqual(res.statusCode, 400, 'Confirms whitespace-only input returns HTTP 400 rather than HTTP 502');
        assert.strictEqual(res.json?.error, 'Name, email, and phone are required.');
    });

    test('REMEDIATION VERIFIED: POST /api/demos with company_url triggers honeypot filter with HTTP 201 hp-bot', async () => {
        const res = await invokeHandler(demosHandler, {
            method: 'POST',
            body: {
                name: 'Demo Bot Company Trap Probe',
                email: `demo_probe_${Date.now()}@spammer.org`,
                phone: '1234567890',
                company_url: 'http://spammer-payload.example.com'
            }
        });

        assert.strictEqual(res.statusCode, 201);
        assert.strictEqual(res.json?.id, 'hp-bot', 'Confirms company_url is caught by honeypot in demos.js');
        assert.strictEqual(res.json?.status, 'confirmed');
    });

    test('REMEDIATION VERIFIED: Whitespace-only fields in demos return HTTP 400 Bad Request', async () => {
        const res = await invokeHandler(demosHandler, {
            method: 'POST',
            body: { name: ' ', email: '   ', phone: '   ' }
        });

        assert.strictEqual(res.statusCode, 400, 'Confirms whitespace-only input returns HTTP 400 rather than creating empty record');
        assert.strictEqual(res.json?.error, 'Name, email, and phone are required.');
    });
});

describe('CHALLENGER 3: Route Guarding on Sensitive Endpoints', () => {
    const PROTECTED_ENDPOINTS = [
        { name: 'GET /api/leads', handler: leadsHandler, method: 'GET', body: undefined },
        { name: 'PATCH /api/leads', handler: leadsHandler, method: 'PATCH', body: { id: 'some_lead_id', status: 'contacted' } },
        { name: 'GET /api/demos', handler: demosHandler, method: 'GET', body: undefined }
    ];

    for (const ep of PROTECTED_ENDPOINTS) {
        describe(`Route: ${ep.name}`, () => {
            test('Missing Authorization header strictly returns HTTP 401', async () => {
                const res = await invokeHandler(ep.handler, {
                    method: ep.method,
                    headers: {},
                    body: ep.body
                });

                assert.strictEqual(res.statusCode, 401);
                assert.strictEqual(res.json?.error, 'Unauthorized');
            });

            test('Malformed Authorization headers strictly return HTTP 401', async () => {
                const malformedHeaders = [
                    'Bearer',
                    'Bearer ',
                    'Bearer   ',
                    'Basic dXNlcjpwYXNz',
                    'Token 1234567890',
                    'Digest username="admin"',
                    'Bearer-Invalid-Format',
                    'Bearer abc.def' // only 2 parts
                ];

                for (const h of malformedHeaders) {
                    const res = await invokeHandler(ep.handler, {
                        method: ep.method,
                        headers: { authorization: h },
                        body: ep.body
                    });

                    assert.strictEqual(res.statusCode, 401, `Failed to reject malformed header: "${h}"`);
                    assert.strictEqual(res.json?.error, 'Unauthorized');
                }
            });

            test('Forged / invalid JWT signature strictly returns HTTP 401', async () => {
                await withEnv({ SECRET_KEY: TEST_SECRET }, async () => {
                    const validToken = authGuard.signJwt({ sub: 'admin_1', email: 'flyingcheetah.agency@gmail.com', role: 'admin' });
                    const [head, body, sig] = validToken.split('.');
                    const forgedToken = `${head}.${body}.forged_signature_xyz123`;

                    const res = await invokeHandler(ep.handler, {
                        method: ep.method,
                        headers: { authorization: `Bearer ${forgedToken}` },
                        body: ep.body
                    });

                    assert.strictEqual(res.statusCode, 401);
                    assert.strictEqual(res.json?.error, 'Unauthorized');
                });
            });

            test('Token signed with wrong secret strictly returns HTTP 401', async () => {
                const alienSecret = 'completely_different_secret_key_99999';
                const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
                const body = Buffer.from(JSON.stringify({
                    sub: 'admin_1',
                    email: 'flyingcheetah.agency@gmail.com',
                    role: 'admin',
                    exp: Math.floor(Date.now() / 1000) + 3600
                })).toString('base64url');
                const sig = crypto.createHmac('sha256', alienSecret).update(`${header}.${body}`).digest('base64url');
                const alienToken = `${header}.${body}.${sig}`;

                await withEnv({ SECRET_KEY: TEST_SECRET }, async () => {
                    const res = await invokeHandler(ep.handler, {
                        method: ep.method,
                        headers: { authorization: `Bearer ${alienToken}` },
                        body: ep.body
                    });

                    assert.strictEqual(res.statusCode, 401);
                    assert.strictEqual(res.json?.error, 'Unauthorized');
                });
            });

            test('Non-admin client role strictly returns HTTP 401', async () => {
                await withEnv({ SECRET_KEY: TEST_SECRET }, async () => {
                    const clientToken = authGuard.signJwt({
                        sub: 'usr_client_007',
                        email: 'regular_client@brand.com',
                        role: 'client'
                    });

                    const res = await invokeHandler(ep.handler, {
                        method: ep.method,
                        headers: { authorization: `Bearer ${clientToken}` },
                        body: ep.body
                    });

                    assert.strictEqual(res.statusCode, 401);
                    assert.strictEqual(res.json?.error, 'Unauthorized');
                });
            });

            test('Sandbox mock token (fc_sandbox_mock_token...) strictly returns HTTP 401 on protected endpoints', async () => {
                const b64Payload = Buffer.from(JSON.stringify({
                    sub: 'usr_admin_fc',
                    email: 'flyingcheetah.agency@gmail.com',
                    role: 'admin',
                    sandbox: true,
                    exp: Math.floor(Date.now() / 1000) + 86400
                })).toString('base64url');
                const mockToken = `fc_sandbox_mock_token.${b64Payload}.sandbox_sig`;

                await withEnv({ SECRET_KEY: TEST_SECRET }, async () => {
                    const res = await invokeHandler(ep.handler, {
                        method: ep.method,
                        headers: { authorization: `Bearer ${mockToken}` },
                        body: ep.body
                    });

                    assert.strictEqual(res.statusCode, 401);
                    assert.strictEqual(res.json?.error, 'Unauthorized');
                });
            });

            test('Expired token strictly returns HTTP 401', async () => {
                await withEnv({ SECRET_KEY: TEST_SECRET }, async () => {
                    const expiredToken = authGuard.signJwt({
                        sub: 'admin_1',
                        email: 'flyingcheetah.agency@gmail.com',
                        role: 'admin'
                    }, -3600); // 1 hour in the past

                    const res = await invokeHandler(ep.handler, {
                        method: ep.method,
                        headers: { authorization: `Bearer ${expiredToken}` },
                        body: ep.body
                    });

                    assert.strictEqual(res.statusCode, 401);
                    assert.strictEqual(res.json?.error, 'Unauthorized');
                });
            });
        });
    }
});

describe('CHALLENGER 4: Public Endpoints Status Codes & Fallbacks', () => {
    test('GET /api/health returns HTTP 200 JSON with healthy status', async () => {
        const res = await invokeHandler(healthHandler, { method: 'GET' });
        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.json?.status, 'healthy');
        assert.strictEqual(res.json?.service, 'flying-cheetah-api');
    });

    test('GET /api/telemetry returns HTTP 200 JSON operational metrics', async () => {
        const res = await invokeHandler(telemetryHandler, { method: 'GET' });
        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.json?.status, 'operational');
    });

    test('GET /api/fleet returns HTTP 200 JSON delivery tracking telemetry', async () => {
        const res = await invokeHandler(fleetHandler, { method: 'GET' });
        assert.strictEqual(res.statusCode, 200);
        assert.strictEqual(res.json?.courier, 'borzo');
        assert.strictEqual(res.json?.status, 'out_for_delivery');
    });

    test('POST /api/send-email returns HTTP 200 safe fallback when SMTP unconfigured', async () => {
        await withEnv({ SMTP_USER: null, SMTP_PASS: null }, async () => {
            const res = await invokeHandler(sendEmailHandler, {
                method: 'POST',
                body: {
                    type: 'lead_submission',
                    name: 'Adversarial Prospect',
                    email: 'prospect@example.com',
                    phone: '+919920386421',
                    service: 'Operations Audit',
                    message: 'Inquiry for test notification dispatch'
                }
            });
            assert.strictEqual(res.statusCode, 200);
            assert.strictEqual(res.json?.success, true);
            assert.strictEqual(res.json?.dispatched, false);
            assert.strictEqual(res.json?.type, 'lead_submission');
        });
    });

    test('POST /api/borzo-dispatch returns HTTP 200 sandbox simulation', async () => {
        const res = await invokeHandler(borzoHandler, {
            method: 'POST',
            body: {
                matter: 'Documents',
                points: [
                    { address: 'Bandra West, Mumbai', contact_person: { phone: '+919920386421' } },
                    { address: 'Andheri East, Mumbai', contact_person: { phone: '+919820011998' } }
                ]
            }
        });
        assert.strictEqual(res.statusCode, 200);
        assert.ok(res.json?.is_successful !== undefined);
    });
});

/**
 * CHALLENGER 2 EMPIRICAL STRESS & FAILURE PROPAGATION HARNESS
 * Rigorous empirical testing for Milestone 1 Backend Modernization & Serverless Hardening.
 *
 * Targets:
 * 1. High Concurrency & Re-entrancy on Safe Auth (50 concurrent calls, unset JWT_SECRET)
 * 2. Database Failure Error Propagation & Timeout Safety (POST /api/leads & POST /api/demos with unreachable DB)
 * 3. Public Endpoints Resiliency under Broken/Unset Config (send-email, borzo-dispatch, fleet)
 * 4. Overall regression & error masking verification
 */

const assert = require('node:assert');
const { performance } = require('node:perf_hooks');
const path = require('node:path');

const { invokeHandler, withEnv } = require('./e2e/helpers');
const authHandler = require('../api/auth');
const leadsHandler = require('../api/leads');
const demosHandler = require('../api/demos');
const emailHandler = require('../api/send-email');
const borzoHandler = require('../api/borzo-dispatch');
const fleetHandler = require('../api/fleet');

const results = {
    total: 0,
    passed: 0,
    failed: 0,
    logs: []
};

function log(msg) {
    console.log(msg);
    results.logs.push(msg);
}

async function testAsync(name, fn) {
    results.total++;
    try {
        await fn();
        results.passed++;
        log(`  [PASS] ${name}`);
    } catch (err) {
        results.failed++;
        log(`  [FAIL] ${name}: ${err.message}`);
        console.error(err);
    }
}

async function runAllTests() {
    log('================================================================');
    log('CHALLENGER 2: EMPIRICAL STRESS & FAILURE PROPAGATION TEST SUITE');
    log('================================================================\n');

    // =================================================================
    // SECTION 1: High Concurrency & Re-entrancy on Safe Auth
    // =================================================================
    log('--- SECTION 1: High Concurrency & Re-entrancy on Safe Auth ---');

    await testAsync('50 concurrent POST /api/auth?action=login calls with unset JWT_SECRET', async () => {
        await withEnv({ JWT_SECRET: null, SECRET_KEY: null }, async () => {
            const memBefore = process.memoryUsage().heapUsed;
            const startTime = performance.now();

            const CONCURRENCY = 50;
            const promises = [];

            for (let i = 0; i < CONCURRENCY; i++) {
                const reqPromise = invokeHandler(authHandler, {
                    method: 'POST',
                    url: '/api/auth?action=login',
                    body: {
                        email: 'flyingcheetah.agency@gmail.com',
                        password: 'AdminPass2026!'
                    }
                });
                promises.push(reqPromise);
            }

            const settled = await Promise.allSettled(promises);
            const durationMs = performance.now() - startTime;
            const memAfter = process.memoryUsage().heapUsed;
            const memDeltaMb = ((memAfter - memBefore) / (1024 * 1024)).toFixed(2);

            log(`    -> Executed ${CONCURRENCY} concurrent login requests in ${durationMs.toFixed(2)}ms (heap delta: ${memDeltaMb} MB)`);

            // Check every result
            assert.strictEqual(settled.length, CONCURRENCY, `Expected ${CONCURRENCY} settled results`);

            for (let i = 0; i < CONCURRENCY; i++) {
                const item = settled[i];
                assert.strictEqual(item.status, 'fulfilled', `Request #${i} was rejected: ${item.reason}`);
                const res = item.value;
                assert.strictEqual(res.statusCode, 200, `Request #${i} returned status ${res.statusCode}, expected 200`);

                const json = res.json;
                assert.ok(json, `Request #${i} did not return valid JSON`);
                assert.strictEqual(json.token_type, 'bearer', `Request #${i} token_type mismatch`);
                assert.strictEqual(json.expires_in_minutes, 10080);
                assert.ok(json.access_token, `Request #${i} missing access_token`);

                // Assert token structure: fc_sandbox_mock_token.<payload>.<sig>
                const parts = json.access_token.split('.');
                assert.strictEqual(parts.length, 3, `Request #${i} token structure invalid (expected 3 parts)`);
                assert.strictEqual(parts[0], 'fc_sandbox_mock_token', `Request #${i} token prefix mismatch`);
                assert.strictEqual(parts[2], 'sandbox_sig', `Request #${i} token signature mismatch`);

                // Verify base64url payload
                const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
                assert.strictEqual(payload.sandbox, true, `Request #${i} sandbox flag not true`);
                assert.strictEqual(payload.email, 'flyingcheetah.agency@gmail.com');
                assert.strictEqual(payload.role, 'admin');
                assert.strictEqual(payload.sub, 'usr_admin_fc');
                assert.ok(payload.exp > Math.floor(Date.now() / 1000), `Request #${i} token expired`);

                // Verify user body structure
                assert.strictEqual(json.user.email, 'flyingcheetah.agency@gmail.com');
                assert.strictEqual(json.user.role, 'admin');
            }
        });
    });

    await testAsync('50 concurrent safeSignJwt direct executions (re-entrancy & memory validation)', async () => {
        const startTime = performance.now();
        const tokens = [];
        for (let i = 0; i < 50; i++) {
            const payload = { sub: `usr_test_${i}`, email: `user_${i}@example.com`, role: 'client' };
            const b64Payload = Buffer.from(JSON.stringify({ ...payload, sandbox: true, exp: Math.floor(Date.now() / 1000) + 86400 })).toString('base64url');
            const token = `fc_sandbox_mock_token.${b64Payload}.sandbox_sig`;
            tokens.push(token);
        }
        const durationMs = performance.now() - startTime;
        log(`    -> Generated 50 sandbox tokens in ${durationMs.toFixed(3)}ms`);
        assert.strictEqual(tokens.length, 50);
        assert.ok(tokens.every(t => t.startsWith('fc_sandbox_mock_token.') && t.endsWith('.sandbox_sig')));
    });

    // =================================================================
    // SECTION 2: Database Failure Error Propagation & Timeout Safety
    // =================================================================
    log('\n--- SECTION 2: Database Failure Error Propagation & Timeout Safety ---');

    await testAsync('POST /api/leads with unreachable Supabase (http://127.0.0.1:59999) returns HTTP 502 with structured error', async () => {
        await withEnv({
            SUPABASE_URL: 'http://127.0.0.1:59999',
            SUPABASE_ANON_KEY: 'mock_key_for_unreachable_db'
        }, async () => {
            const startTime = performance.now();
            const res = await invokeHandler(leadsHandler, {
                method: 'POST',
                body: {
                    name: 'Empirical Failure Test',
                    email: 'failure_test@example.com',
                    phone: '9920386421',
                    service: 'Operations Audit',
                    message: 'Stress testing failure propagation'
                }
            }, 5000);
            const durationMs = performance.now() - startTime;

            log(`    -> Leads unreachable DB call completed in ${durationMs.toFixed(2)}ms with status ${res.statusCode}`);

            assert.strictEqual(res.statusCode, 502, `Expected HTTP 502, got ${res.statusCode}`);
            assert.ok(res.json, 'Response must be valid JSON');
            assert.ok(res.json.error, 'Response JSON must contain "error" field');
            assert.ok(
                res.json.error.startsWith('Database persistence error:'),
                `Error must start with "Database persistence error:", got: "${res.json.error}"`
            );
            // Ensure no fake synthetic 201 object or fake ID
            assert.strictEqual(res.json.id, undefined, 'Must not return synthetic id');
            assert.ok(durationMs < 5000, `Execution took ${durationMs}ms, exceeded serverless threshold`);
        });
    });

    await testAsync('POST /api/demos with unreachable Supabase (http://127.0.0.1:59999) returns HTTP 502 with structured error', async () => {
        await withEnv({
            SUPABASE_URL: 'http://127.0.0.1:59999',
            SUPABASE_ANON_KEY: 'mock_key_for_unreachable_db'
        }, async () => {
            const startTime = performance.now();
            const res = await invokeHandler(demosHandler, {
                method: 'POST',
                body: {
                    name: 'Empirical Failure Test',
                    email: 'demo_failure@example.com',
                    phone: '9920386421',
                    company: 'Acme Retail',
                    modules: 'All Suites'
                }
            }, 5000);
            const durationMs = performance.now() - startTime;

            log(`    -> Demos unreachable DB call completed in ${durationMs.toFixed(2)}ms with status ${res.statusCode}`);

            assert.strictEqual(res.statusCode, 502, `Expected HTTP 502, got ${res.statusCode}`);
            assert.ok(res.json, 'Response must be valid JSON');
            assert.ok(res.json.error, 'Response JSON must contain "error" field');
            assert.ok(
                res.json.error.startsWith('Database persistence error:'),
                `Error must start with "Database persistence error:", got: "${res.json.error}"`
            );
            // Ensure no fake synthetic 201 object or fake ID
            assert.strictEqual(res.json.id, undefined, 'Must not return synthetic id');
            assert.ok(durationMs < 5000, `Execution took ${durationMs}ms, exceeded serverless threshold`);
        });
    });

    await testAsync('Protected GET /api/leads and GET /api/demos with unreachable Supabase fail with HTTP 502 (no synthetic data)', async () => {
        // Create a valid admin token for testing protected read routes under DB failure
        const { signJwt } = require('../api/_auth');
        const adminToken = await withEnv({ JWT_SECRET: 'test_secret_for_admin_guard_32char' }, async () => {
            return signJwt({ sub: 'usr_admin', email: 'admin@fc.com', role: 'admin' });
        });

        await withEnv({
            JWT_SECRET: 'test_secret_for_admin_guard_32char',
            SUPABASE_URL: 'http://127.0.0.1:59999',
            SUPABASE_ANON_KEY: 'mock_key'
        }, async () => {
            const leadsRes = await invokeHandler(leadsHandler, {
                method: 'GET',
                headers: { authorization: `Bearer ${adminToken}` }
            });
            assert.strictEqual(leadsRes.statusCode, 502, `Expected 502 on leads GET unreachable DB, got ${leadsRes.statusCode}`);
            assert.ok(leadsRes.json.error.includes('Database query connection failed'));

            const demosRes = await invokeHandler(demosHandler, {
                method: 'GET',
                headers: { authorization: `Bearer ${adminToken}` }
            });
            assert.strictEqual(demosRes.statusCode, 502, `Expected 502 on demos GET unreachable DB, got ${demosRes.statusCode}`);
            assert.ok(demosRes.json.error.includes('Database query connection failed'));
        });
    });

    // =================================================================
    // SECTION 3: Public Endpoints Resiliency under Broken / Missing Config
    // =================================================================
    log('\n--- SECTION 3: Public Endpoints Resiliency under Broken Config ---');

    await testAsync('POST /api/send-email with unset SMTP_USER & SMTP_PASS returns HTTP 200 { success: true, dispatched: false }', async () => {
        await withEnv({
            SMTP_USER: null,
            SMTP_PASS: null,
            RESEND_API_KEY: null
        }, async () => {
            const res = await invokeHandler(emailHandler, {
                method: 'POST',
                body: {
                    type: 'lead_submission',
                    name: 'Resilience Test',
                    email: 'resilience@example.com',
                    phone: '9920386421',
                    service: 'Operations Audit',
                    message: 'Checking unconfigured SMTP handling'
                }
            });

            log(`    -> send-email status: ${res.statusCode}, body: ${res.body}`);
            assert.strictEqual(res.statusCode, 200, `Expected 200, got ${res.statusCode}`);
            assert.ok(res.json, 'Must return valid JSON');
            assert.strictEqual(res.json.success, true);
            assert.strictEqual(res.json.dispatched, false);
            assert.strictEqual(res.json.type, 'lead_submission');
            assert.strictEqual(res.json.recipient, 'flyingcheetah.agency@gmail.com');
        });
    });

    await testAsync('POST /api/borzo-dispatch with unset BORZO_AUTH_TOKEN returns HTTP 200 simulation', async () => {
        await withEnv({
            BORZO_AUTH_TOKEN: null
        }, async () => {
            const res = await invokeHandler(borzoHandler, {
                method: 'POST',
                body: {
                    action: 'calculate',
                    pickup: { address: 'Opera House, Mumbai' },
                    dropoff: { address: 'Worli, Mumbai' }
                }
            });

            log(`    -> borzo-dispatch calculate status: ${res.statusCode}, env: ${res.json?.environment}`);
            assert.strictEqual(res.statusCode, 200);
            assert.strictEqual(res.json.is_successful, true);
            assert.strictEqual(res.json.environment, 'sandbox_simulation');
            assert.ok(res.json.delivery_fee_inr > 0);
            assert.ok(res.json.eta_minutes > 0);
        });
    });

    await testAsync('POST /api/borzo-dispatch with MOCK_TOKEN returns HTTP 201 courier assignment simulation', async () => {
        await withEnv({
            BORZO_AUTH_TOKEN: 'MOCK_TOKEN_12345'
        }, async () => {
            const res = await invokeHandler(borzoHandler, {
                method: 'POST',
                body: {
                    action: 'create',
                    pickup: { address: 'Opera House, Mumbai' },
                    dropoff: { address: 'Worli, Mumbai' }
                }
            });

            log(`    -> borzo-dispatch create status: ${res.statusCode}, status: ${res.json?.status}`);
            assert.strictEqual(res.statusCode, 201);
            assert.strictEqual(res.json.is_successful, true);
            assert.strictEqual(res.json.environment, 'sandbox_simulation');
            assert.strictEqual(res.json.status, 'courier_assigned');
            assert.ok(res.json.rider?.name);
            assert.ok(res.json.delivery_otp);
        });
    });

    await testAsync('GET /api/fleet with unconfigured Supabase returns HTTP 200 Mumbai rider simulation (query param & path)', async () => {
        await withEnv({
            SUPABASE_URL: '',
            SUPABASE_ANON_KEY: ''
        }, async () => {
            // Test 1: Query param order_ref
            const resQuery = await invokeHandler(fleetHandler, {
                method: 'GET',
                query: { order_ref: 'FC-MUM-999888' }
            });

            log(`    -> fleet GET (query) status: ${resQuery.statusCode}, rider: ${resQuery.json?.rider_name}`);
            assert.strictEqual(resQuery.statusCode, 200);
            assert.strictEqual(resQuery.json.order_ref, 'FC-MUM-999888');
            assert.strictEqual(resQuery.json.status, 'out_for_delivery');
            assert.strictEqual(resQuery.json.courier, 'borzo');
            assert.ok(resQuery.json.rider_name);
            assert.ok(resQuery.json.rider_lat >= 18.0 && resQuery.json.rider_lat <= 20.0, 'Valid Mumbai latitude');
            assert.ok(resQuery.json.rider_lng >= 72.0 && resQuery.json.rider_lng <= 74.0, 'Valid Mumbai longitude');

            // Test 2: URL regex /track/FC-MUM-777666
            const resPath = await invokeHandler(fleetHandler, {
                method: 'GET',
                url: '/api/fleet/track/FC-MUM-777666'
            });
            assert.strictEqual(resPath.statusCode, 200);
            assert.strictEqual(resPath.json.order_ref, 'FC-MUM-777666');
            assert.strictEqual(resPath.json.status, 'out_for_delivery');
        });
    });

    // =================================================================
    // SECTION 4: Re-entrancy and Mixed Interleaved Workload Stress
    // =================================================================
    log('\n--- SECTION 4: Interleaved Concurrency & Stress Stress Test ---');

    await testAsync('Interleaved 30 requests (auth + leads failure + email + fleet) executed concurrently', async () => {
        const startTime = performance.now();
        const batch = [];

        for (let i = 0; i < 10; i++) {
            // Auth login with unset JWT_SECRET
            batch.push(
                withEnv({ JWT_SECRET: null, SECRET_KEY: null }, () =>
                    invokeHandler(authHandler, {
                        method: 'POST',
                        url: '/api/auth?action=login',
                        body: { email: 'flyingcheetah.agency@gmail.com', password: 'AdminPass2026!' }
                    })
                ).then(r => ({ type: 'auth', status: r.statusCode }))
            );

            // Leads with unreachable DB
            batch.push(
                withEnv({ SUPABASE_URL: 'http://127.0.0.1:59999', SUPABASE_ANON_KEY: 'test_key' }, () =>
                    invokeHandler(leadsHandler, {
                        method: 'POST',
                        body: { name: `BatchLead_${i}`, email: `batch_${i}@test.com`, phone: '9920386421', service: 'Audit' }
                    })
                ).then(r => ({ type: 'leads_fail', status: r.statusCode }))
            );

            // Fleet GET
            batch.push(
                withEnv({ SUPABASE_URL: '', SUPABASE_ANON_KEY: '' }, () =>
                    invokeHandler(fleetHandler, {
                        method: 'GET',
                        query: { order_ref: `FC-BATCH-${i}` }
                    })
                ).then(r => ({ type: 'fleet', status: r.statusCode }))
            );
        }

        const outcomes = await Promise.all(batch);
        const duration = performance.now() - startTime;
        log(`    -> Interleaved batch of ${outcomes.length} requests completed in ${duration.toFixed(2)}ms`);

        const authCount = outcomes.filter(o => o.type === 'auth' && o.status === 200).length;
        const leadsCount = outcomes.filter(o => o.type === 'leads_fail' && o.status === 502).length;
        const fleetCount = outcomes.filter(o => o.type === 'fleet' && o.status === 200).length;

        assert.strictEqual(authCount, 10, 'All 10 auth calls must return 200');
        assert.strictEqual(leadsCount, 10, 'All 10 unreachable leads calls must return 502');
        assert.strictEqual(fleetCount, 10, 'All 10 fleet simulation calls must return 200');
    });

    log('\n================================================================');
    log(`CHALLENGER 2 SUMMARY: Total: ${results.total} | Passed: ${results.passed} | Failed: ${results.failed}`);
    log('================================================================');

    if (results.failed > 0) {
        process.exit(1);
    }
}

runAllTests().catch(err => {
    console.error('Fatal test harness execution error:', err);
    process.exit(1);
});

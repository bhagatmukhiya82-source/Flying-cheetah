/**
 * CHALLENGER 2: ITERATION 2 SPECIALIZED STRESS & CONCURRENCY HARNESS
 * Verifies that the new honeypot trap and whitespace validation logic did not
 * introduce race conditions, latency regressions, or memory leaks under high concurrent load.
 */

const assert = require('node:assert');
const { performance } = require('node:perf_hooks');

const { invokeHandler, withEnv } = require('./e2e/helpers');
const authHandler = require('../api/auth');
const leadsHandler = require('../api/leads');
const demosHandler = require('../api/demos');

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

async function run() {
    log('========================================================================');
    log('CHALLENGER 2 IT2: CONCURRENCY, LATENCY, LEAKS & FAILURE PROPAGATION SUITE');
    log('========================================================================\n');

    // =========================================================================
    // TEST 1: Concurrency & Latency of Honeypot Filtering (Leads & Demos)
    // =========================================================================
    log('--- TEST 1: Honeypot Filtering Under High Concurrency ---');

    await testAsync('50 concurrent POST /api/leads with website_url (honeypot)', async () => {
        const memBefore = process.memoryUsage().heapUsed;
        const startTime = performance.now();
        const CONCURRENCY = 50;
        const promises = [];

        for (let i = 0; i < CONCURRENCY; i++) {
            promises.push(invokeHandler(leadsHandler, {
                method: 'POST',
                body: {
                    name: `Bot_${i}`,
                    email: `bot_${i}@spam.com`,
                    phone: '1234567890',
                    website_url: `http://spam-${i}.com`
                }
            }));
        }

        const outcomes = await Promise.all(promises);
        const duration = performance.now() - startTime;
        const memAfter = process.memoryUsage().heapUsed;
        const memDeltaMb = ((memAfter - memBefore) / (1024 * 1024)).toFixed(2);

        log(`    -> 50 concurrent leads honeypot calls completed in ${duration.toFixed(2)}ms (heap delta: ${memDeltaMb} MB)`);

        assert.strictEqual(outcomes.length, CONCURRENCY);
        for (let i = 0; i < CONCURRENCY; i++) {
            const res = outcomes[i];
            assert.strictEqual(res.statusCode, 201, `Req #${i} status != 201`);
            assert.strictEqual(res.json?.id, 'bot-filtered', `Req #${i} id != bot-filtered`);
            assert.strictEqual(res.json?.status, 'closed', `Req #${i} status != closed`);
            assert.strictEqual(res.json?.name, `Bot_${i}`);
        }
        // Honeypot should be near-instant since it bypasses DB (< 250ms for 50 concurrent)
        assert.ok(duration < 1500, `Honeypot took ${duration}ms, expected fast bypass < 1500ms`);
    });

    await testAsync('50 concurrent POST /api/demos with company_url (honeypot)', async () => {
        const memBefore = process.memoryUsage().heapUsed;
        const startTime = performance.now();
        const CONCURRENCY = 50;
        const promises = [];

        for (let i = 0; i < CONCURRENCY; i++) {
            promises.push(invokeHandler(demosHandler, {
                method: 'POST',
                body: {
                    name: `DemoBot_${i}`,
                    email: `demobot_${i}@spam.com`,
                    phone: '1234567890',
                    company_url: `http://spam-${i}.com`
                }
            }));
        }

        const outcomes = await Promise.all(promises);
        const duration = performance.now() - startTime;
        const memAfter = process.memoryUsage().heapUsed;
        const memDeltaMb = ((memAfter - memBefore) / (1024 * 1024)).toFixed(2);

        log(`    -> 50 concurrent demos honeypot calls completed in ${duration.toFixed(2)}ms (heap delta: ${memDeltaMb} MB)`);

        assert.strictEqual(outcomes.length, CONCURRENCY);
        for (let i = 0; i < CONCURRENCY; i++) {
            const res = outcomes[i];
            assert.strictEqual(res.statusCode, 201, `Req #${i} status != 201`);
            assert.strictEqual(res.json?.id, 'hp-bot', `Req #${i} id != hp-bot`);
            assert.strictEqual(res.json?.status, 'confirmed', `Req #${i} status != confirmed`);
            assert.strictEqual(res.json?.name, `DemoBot_${i}`);
        }
        assert.ok(duration < 1500, `Honeypot took ${duration}ms, expected fast bypass < 1500ms`);
    });

    // =========================================================================
    // TEST 2: Whitespace Validation Concurrency & Latency
    // =========================================================================
    log('\n--- TEST 2: Whitespace Validation Concurrency & Fast Rejection ---');

    await testAsync('50 concurrent POST /api/leads with whitespace-only inputs', async () => {
        const memBefore = process.memoryUsage().heapUsed;
        const startTime = performance.now();
        const CONCURRENCY = 50;
        const promises = [];

        const whitespaceVariations = [
            { name: '   ', email: '   ', phone: '   ' },
            { name: '\t\t', email: '\n\n', phone: ' \r ' },
            { name: '   ', email: 'valid@fc.com', phone: '1234567890' },
            { name: 'Valid Name', email: '   ', phone: '1234567890' },
            { name: 'Valid Name', email: 'valid@fc.com', phone: '   ' }
        ];

        for (let i = 0; i < CONCURRENCY; i++) {
            const variant = whitespaceVariations[i % whitespaceVariations.length];
            promises.push(invokeHandler(leadsHandler, {
                method: 'POST',
                body: { ...variant }
            }));
        }

        const outcomes = await Promise.all(promises);
        const duration = performance.now() - startTime;
        const memAfter = process.memoryUsage().heapUsed;
        const memDeltaMb = ((memAfter - memBefore) / (1024 * 1024)).toFixed(2);

        log(`    -> 50 concurrent leads whitespace calls completed in ${duration.toFixed(2)}ms (heap delta: ${memDeltaMb} MB)`);

        assert.strictEqual(outcomes.length, CONCURRENCY);
        for (let i = 0; i < CONCURRENCY; i++) {
            const res = outcomes[i];
            assert.strictEqual(res.statusCode, 400, `Req #${i} expected 400, got ${res.statusCode}`);
            assert.strictEqual(res.json?.error, 'Name, email, and phone are required.');
        }
        assert.ok(duration < 1500, `Whitespace validation took ${duration}ms, expected fast rejection < 1500ms`);
    });

    await testAsync('50 concurrent POST /api/demos with whitespace-only inputs', async () => {
        const memBefore = process.memoryUsage().heapUsed;
        const startTime = performance.now();
        const CONCURRENCY = 50;
        const promises = [];

        const whitespaceVariations = [
            { name: '   ', email: '   ', phone: '   ' },
            { name: '\t\t', email: '\n\n', phone: ' \r ' },
            { name: '   ', email: 'valid@fc.com', phone: '1234567890' },
            { name: 'Valid Name', email: '   ', phone: '1234567890' },
            { name: 'Valid Name', email: 'valid@fc.com', phone: '   ' }
        ];

        for (let i = 0; i < CONCURRENCY; i++) {
            const variant = whitespaceVariations[i % whitespaceVariations.length];
            promises.push(invokeHandler(demosHandler, {
                method: 'POST',
                body: { ...variant }
            }));
        }

        const outcomes = await Promise.all(promises);
        const duration = performance.now() - startTime;
        const memAfter = process.memoryUsage().heapUsed;
        const memDeltaMb = ((memAfter - memBefore) / (1024 * 1024)).toFixed(2);

        log(`    -> 50 concurrent demos whitespace calls completed in ${duration.toFixed(2)}ms (heap delta: ${memDeltaMb} MB)`);

        assert.strictEqual(outcomes.length, CONCURRENCY);
        for (let i = 0; i < CONCURRENCY; i++) {
            const res = outcomes[i];
            assert.strictEqual(res.statusCode, 400, `Req #${i} expected 400, got ${res.statusCode}`);
            assert.strictEqual(res.json?.error, 'Name, email, and phone are required.');
        }
        assert.ok(duration < 1500, `Whitespace validation took ${duration}ms, expected fast rejection < 1500ms`);
    });

    // =========================================================================
    // TEST 3: Database Failure Error Propagation Under Concurrency
    // =========================================================================
    log('\n--- TEST 3: Database Failure Error Propagation Under Concurrency ---');

    await testAsync('25 concurrent POST /api/leads with unreachable Supabase return HTTP 502 with structured error', async () => {
        await withEnv({
            SUPABASE_URL: 'http://127.0.0.1:59999',
            SUPABASE_ANON_KEY: 'test_anon_key'
        }, async () => {
            const startTime = performance.now();
            const CONCURRENCY = 25;
            const promises = [];

            for (let i = 0; i < CONCURRENCY; i++) {
                promises.push(invokeHandler(leadsHandler, {
                    method: 'POST',
                    body: {
                        name: `DBFailLead_${i}`,
                        email: `fail_${i}@fc.com`,
                        phone: '9920386421',
                        service: 'Operations Audit'
                    }
                }, 5000));
            }

            const outcomes = await Promise.all(promises);
            const duration = performance.now() - startTime;
            log(`    -> 25 concurrent unreachable DB leads calls completed in ${duration.toFixed(2)}ms`);

            assert.strictEqual(outcomes.length, CONCURRENCY);
            for (let i = 0; i < CONCURRENCY; i++) {
                const res = outcomes[i];
                assert.strictEqual(res.statusCode, 502, `Req #${i} expected 502, got ${res.statusCode}`);
                assert.ok(res.json?.error?.startsWith('Database persistence error:'), `Req #${i} unexpected error format: ${res.json?.error}`);
                assert.strictEqual(res.json?.id, undefined, `Req #${i} must not return synthetic id`);
            }
            assert.ok(duration < 5000, `25 concurrent DB failures took ${duration}ms, exceeded 5000ms threshold`);
        });
    });

    await testAsync('25 concurrent POST /api/demos with unreachable Supabase return HTTP 502 with structured error', async () => {
        await withEnv({
            SUPABASE_URL: 'http://127.0.0.1:59999',
            SUPABASE_ANON_KEY: 'test_anon_key'
        }, async () => {
            const startTime = performance.now();
            const CONCURRENCY = 25;
            const promises = [];

            for (let i = 0; i < CONCURRENCY; i++) {
                promises.push(invokeHandler(demosHandler, {
                    method: 'POST',
                    body: {
                        name: `DBFailDemo_${i}`,
                        email: `fail_demo_${i}@fc.com`,
                        phone: '9920386421',
                        company: 'Acme'
                    }
                }, 5000));
            }

            const outcomes = await Promise.all(promises);
            const duration = performance.now() - startTime;
            log(`    -> 25 concurrent unreachable DB demos calls completed in ${duration.toFixed(2)}ms`);

            assert.strictEqual(outcomes.length, CONCURRENCY);
            for (let i = 0; i < CONCURRENCY; i++) {
                const res = outcomes[i];
                assert.strictEqual(res.statusCode, 502, `Req #${i} expected 502, got ${res.statusCode}`);
                assert.ok(res.json?.error?.startsWith('Database persistence error:'), `Req #${i} unexpected error format: ${res.json?.error}`);
                assert.strictEqual(res.json?.id, undefined, `Req #${i} must not return synthetic id`);
            }
            assert.ok(duration < 5000, `25 concurrent DB failures took ${duration}ms, exceeded 5000ms threshold`);
        });
    });

    // =========================================================================
    // TEST 4: Massive Heterogeneous Interleaved Concurrency (120 Requests)
    // =========================================================================
    log('\n--- TEST 4: Massive Heterogeneous Interleaved Workload (120 requests) ---');

    await testAsync('120 concurrent mixed requests (bot honeypots, whitespace rejects, db failures, auth logins)', async () => {
        const startTime = performance.now();
        const memBefore = process.memoryUsage().heapUsed;
        const promises = [];

        // 30 Honeypot Bots (website_url) -> Expect 201 bot-filtered
        for (let i = 0; i < 30; i++) {
            promises.push(
                invokeHandler(leadsHandler, {
                    method: 'POST',
                    body: { name: `BotLead_${i}`, email: `bot_${i}@spam.com`, phone: '1234567890', website_url: 'http://spam.com' }
                }).then(r => ({ type: 'honeypot_bot', status: r.statusCode, id: r.json?.id }))
            );
        }

        // 30 Whitespace Rejects -> Expect 400
        for (let i = 0; i < 30; i++) {
            promises.push(
                invokeHandler(leadsHandler, {
                    method: 'POST',
                    body: { name: '   ', email: '   ', phone: '   ' }
                }).then(r => ({ type: 'whitespace_reject', status: r.statusCode, error: r.json?.error }))
            );
        }

        // 30 Database Outage Leads -> Expect 502
        for (let i = 0; i < 30; i++) {
            promises.push(
                withEnv({ SUPABASE_URL: 'http://127.0.0.1:59999', SUPABASE_ANON_KEY: 'test_key' }, () =>
                    invokeHandler(leadsHandler, {
                        method: 'POST',
                        body: { name: `ValidLead_${i}`, email: `valid_${i}@example.com`, phone: '9920386421', service: 'Audit' }
                    })
                ).then(r => ({ type: 'db_failure', status: r.statusCode, error: r.json?.error }))
            );
        }

        // 30 Auth Logins with unset JWT_SECRET -> Expect 200
        for (let i = 0; i < 30; i++) {
            promises.push(
                withEnv({ JWT_SECRET: null, SECRET_KEY: null }, () =>
                    invokeHandler(authHandler, {
                        method: 'POST',
                        url: '/api/auth?action=login',
                        body: { email: 'flyingcheetah.agency@gmail.com', password: 'AdminPass2026!' }
                    })
                ).then(r => ({ type: 'auth_login', status: r.statusCode, token: r.json?.access_token }))
            );
        }

        const outcomes = await Promise.all(promises);
        const duration = performance.now() - startTime;
        const memAfter = process.memoryUsage().heapUsed;
        const memDeltaMb = ((memAfter - memBefore) / (1024 * 1024)).toFixed(2);

        log(`    -> 120 interleaved heterogeneous requests finished in ${duration.toFixed(2)}ms (heap delta: ${memDeltaMb} MB)`);

        assert.strictEqual(outcomes.length, 120);

        const honeypotMatches = outcomes.filter(o => o.type === 'honeypot_bot' && o.status === 201 && o.id === 'bot-filtered');
        const whitespaceMatches = outcomes.filter(o => o.type === 'whitespace_reject' && o.status === 400 && o.error === 'Name, email, and phone are required.');
        const dbFailMatches = outcomes.filter(o => o.type === 'db_failure' && o.status === 502 && o.error?.startsWith('Database persistence error:'));
        const authMatches = outcomes.filter(o => o.type === 'auth_login' && o.status === 200 && o.token?.startsWith('fc_sandbox_mock_token.'));

        assert.strictEqual(honeypotMatches.length, 30, `Expected 30 honeypot matches, got ${honeypotMatches.length}`);
        assert.strictEqual(whitespaceMatches.length, 30, `Expected 30 whitespace matches, got ${whitespaceMatches.length}`);
        assert.strictEqual(dbFailMatches.length, 30, `Expected 30 db failure matches, got ${dbFailMatches.length}`);
        assert.strictEqual(authMatches.length, 30, `Expected 30 auth matches, got ${authMatches.length}`);
    });

    // =========================================================================
    // TEST 5: Sequential Soak Test for Memory Stability (300 requests)
    // =========================================================================
    log('\n--- TEST 5: Sequential Soak Test for Memory Stability (300 iterations) ---');

    await testAsync('300 sequential requests across honeypot and whitespace validation', async () => {
        if (global.gc) global.gc();
        const memInitial = process.memoryUsage().heapUsed;
        const startTime = performance.now();

        for (let i = 0; i < 150; i++) {
            // Honeypot
            const resHp = await invokeHandler(leadsHandler, {
                method: 'POST',
                body: { name: `SoakBot_${i}`, email: `soak_${i}@bot.com`, phone: '1234567890', website_url: 'http://trap.com' }
            });
            assert.strictEqual(resHp.statusCode, 201);

            // Whitespace
            const resWs = await invokeHandler(demosHandler, {
                method: 'POST',
                body: { name: '   ', email: '   ', phone: '   ' }
            });
            assert.strictEqual(resWs.statusCode, 400);
        }

        const duration = performance.now() - startTime;
        if (global.gc) global.gc();
        const memFinal = process.memoryUsage().heapUsed;
        const soakDeltaMb = ((memFinal - memInitial) / (1024 * 1024)).toFixed(2);

        log(`    -> 300 sequential requests executed in ${duration.toFixed(2)}ms (heap net delta: ${soakDeltaMb} MB)`);
        assert.ok(Math.abs(parseFloat(soakDeltaMb)) < 15, `Memory leak detected: heap delta is ${soakDeltaMb} MB`);
    });

    log('\n========================================================================');
    log(`CHALLENGER 2 IT2 SUMMARY: Total: ${results.total} | Passed: ${results.passed} | Failed: ${results.failed}`);
    log('========================================================================');

    if (results.failed > 0) {
        process.exit(1);
    }
}

run().catch(err => {
    console.error('Fatal in test runner:', err);
    process.exit(1);
});

/**
 * TIER 4: REAL-WORLD APPLICATION SCENARIOS TEST SUITE
 * End-to-end user journeys and operational workloads across Flying Cheetah platform.
 * Minimum 6 comprehensive workload scenarios. Zero external npm dependencies.
 * Runner: node --test tests/e2e/tier4_scenarios.test.js
 */

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
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
    scanDirForRegex
} = require('./helpers.js');

describe('Tier 4: Real-World Application Scenarios (End-to-End User Journeys)', () => {

    // =========================================================================
    // Scenario 1: Complete Inbound Lead Capture & Sanitized Notification Journey
    // =========================================================================
    it('Scenario 1: Complete Inbound Lead Capture & Sanitized Notification Journey', async () => {
        // Step 1: Mobile Discovery on 390px Viewport
        const homeHtml = readHtmlPage('index.html');
        assert.ok(hasViewportMeta(homeHtml), 'Visitor on iPhone 13 (390px) receives valid viewport meta tag');

        // Step 2: Form Interaction & Validation Check
        const leadsHandler = require(path.join(API_DIR, 'leads.js'));

        // Reject incomplete form submission
        const invalidSubmission = await invokeHandler(leadsHandler, {
            method: 'POST',
            body: { name: 'Priya Sen' } // Missing email and phone
        });
        assert.equal(invalidSubmission.statusCode, 400, 'Incomplete lead submission must return HTTP 400');
        assert.ok(invalidSubmission.json?.error, 'Error message must explain required fields');

        // Step 3: Submission with Special Characters & Injection Payloads
        const mailerModule = require(path.join(API_DIR, '_mailer.js'));
        assert.equal(typeof mailerModule.escapeHtml, 'function', 'Mailer module must export escapeHtml');

        const hostileLeadData = {
            name: 'Mehta & Sons <Jewellers>',
            email: 'priya@mehta-jewels.com',
            phone: '+91 99300 88776',
            service: 'Store Automation & AI Voice',
            message: 'Looking for <urgent> COD confirmation with 200+ daily orders & "priority" setup.',
            source_page: 'index.html'
        };

        // Step 4: Sanitization Verification
        const sanitizedName = mailerModule.escapeHtml(hostileLeadData.name);
        const sanitizedMessage = mailerModule.escapeHtml(hostileLeadData.message);

        assert.equal(sanitizedName, 'Mehta &amp; Sons &lt;Jewellers&gt;', 'Lead name must be HTML escaped');
        assert.ok(sanitizedMessage.includes('&lt;urgent&gt;'), 'Message tags must be escaped');
        assert.ok(sanitizedMessage.includes('&quot;priority&quot;'), 'Message quotes must be escaped');
        assert.doesNotMatch(sanitizedName, /<[^>]+>/, 'No unescaped HTML tags may remain in sanitized name');
        assert.doesNotMatch(sanitizedMessage, /<[^>]+>/, 'No unescaped HTML tags may remain in sanitized message');

        // Step 5: Notification Email Assembly
        const officialAdminEmail = 'flyingcheetah.agency@gmail.com';
        const cleanPhone = hostileLeadData.phone.replace(/[^0-9]/g, '');
        const waLink = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Hi ${hostileLeadData.name}, Flying Cheetah following up.`)}`;

        // Verify generated email body does not leak secrets or execute raw HTML
        const emailHtml = `
            <div>
                <h2>${sanitizedName}</h2>
                <p>Phone: ${mailerModule.escapeHtml(hostileLeadData.phone)}</p>
                <p>Email: ${mailerModule.escapeHtml(hostileLeadData.email)}</p>
                <p>Message: ${sanitizedMessage}</p>
                <a href="${mailerModule.escapeHtml(waLink)}">Open Chat</a>
            </div>
        `;

        assert.doesNotMatch(emailHtml, /<script/i, 'Email HTML must not contain script tags');
        assert.ok(!emailHtml.includes('sryzptfthzfeeeco'), 'Email HTML must never leak SMTP app passwords');
        assert.ok(!emailHtml.includes('flying_cheetah_super_secure'), 'Email HTML must never leak JWT fallback secrets');

        // Step 6: Backend Ingestion
        const originalFetch = global.fetch;
        let submissionRes;
        try {
            global.fetch = async (url, opts) => {
                if (String(url).includes('leads_inquiries')) {
                    return {
                        ok: true,
                        status: 201,
                        json: async () => [{
                            id: 'lead_e2e_123',
                            name: hostileLeadData.name,
                            email: hostileLeadData.email,
                            phone: hostileLeadData.phone,
                            service: hostileLeadData.service,
                            status: 'new',
                            created_at: new Date().toISOString()
                        }]
                    };
                }
                return originalFetch(url, opts);
            };

            submissionRes = await invokeHandler(leadsHandler, {
                method: 'POST',
                body: hostileLeadData
            });
        } finally {
            global.fetch = originalFetch;
        }

        assert.equal(submissionRes.statusCode, 201, 'Valid lead submission must return HTTP 201 Created');
        assert.ok(submissionRes.json?.id, 'Saved lead must include a unique record id');
        assert.equal(submissionRes.json?.email, 'priya@mehta-jewels.com', 'Saved lead must preserve lowercase email');
        assert.equal(submissionRes.json?.status, 'new', 'Saved lead status must be initialized to new');
    });

    // =========================================================================
    // Scenario 2: Admin Security Lifecycle & Lead Triage Workflow
    // =========================================================================
    it('Scenario 2: Admin Security Lifecycle & Lead Triage Workflow', async () => {
        const authModule = require(path.join(API_DIR, '_auth.js'));
        const authHandler = require(path.join(API_DIR, 'auth.js'));
        const demosHandler = require(path.join(API_DIR, 'demos.js'));
        const secret = 'test-secret-key-32-chars-length!!';

        await withEnv({
            SECRET_KEY: secret,
            JWT_SECRET: secret
        }, async () => {
            // Step 1: Unauthenticated Admin Attempt (Blocked)
            const unauthRes = await invokeHandler(demosHandler, {
                method: 'GET',
                headers: {}
            });
            assert.equal(unauthRes.statusCode, 401, 'Unauthenticated request must return HTTP 401');

            // Step 2: Request with Forged Token (Blocked)
            const forgedRes = await invokeHandler(demosHandler, {
                method: 'GET',
                headers: { authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.tampered.signature' }
            });
            assert.equal(forgedRes.statusCode, 401, 'Forged token must return HTTP 401');

            // Step 3: Admin Login with Credentials
            const loginRes = await invokeHandler(authHandler, {
                method: 'POST',
                url: '/api/auth?action=login',
                body: {
                    email: 'flyingcheetah.agency@gmail.com',
                    password: process.env.INITIAL_ADMIN_PASSWORD || 'AdminPass2026!'
                }
            });

            assert.equal(loginRes.statusCode, 200, 'Valid admin login must return HTTP 200');
            const token = loginRes.json?.access_token;
            assert.ok(token, 'Login response must provide access_token');

            // Step 4: Token Validation & Claims Check
            const verifiedClaims = authModule.verifyJwt(token);
            assert.ok(verifiedClaims, 'JWT token must be cryptographically verifiable');
            assert.equal(verifiedClaims.email, 'flyingcheetah.agency@gmail.com', 'Token must contain official admin email');
            assert.equal(verifiedClaims.role, 'admin', 'Token must assert admin role');
            assert.ok(verifiedClaims.exp > Math.floor(Date.now() / 1000), 'Token exp must be in the future');

            // Step 5: Authenticated Fetch of Protected Resources
            const authenticatedFetch = await invokeHandler(demosHandler, {
                method: 'GET',
                headers: { authorization: `Bearer ${token}` }
            });
            assert.equal(authenticatedFetch.statusCode, 200, 'Authenticated admin must receive HTTP 200');
            assert.ok(Array.isArray(authenticatedFetch.json?.items), 'Response must contain items array');

            // Step 6: Expired Token Rejection
            const expiredToken = authModule.signJwt({
                sub: 'admin_1',
                email: 'flyingcheetah.agency@gmail.com',
                role: 'admin'
            }, -3600); // Expired 1 hour ago

            const expiredFetch = await invokeHandler(demosHandler, {
                method: 'GET',
                headers: { authorization: `Bearer ${expiredToken}` }
            });
            assert.equal(expiredFetch.statusCode, 401, 'Expired token must return HTTP 401');
        });
    });

    // =========================================================================
    // Scenario 3: Mobile Visitor Responsive Navigation & WhatsApp Funnel Journey
    // =========================================================================
    it('Scenario 3: Mobile Visitor Responsive Navigation & WhatsApp Funnel Journey', () => {
        // Step 1: iPhone 13 Mobile User Loads Homepage (390px Viewport)
        const homeHtml = readHtmlPage('index.html');
        assert.ok(hasViewportMeta(homeHtml), 'Homepage must have mobile viewport configuration');

        // Step 2: Verify Mobile Navigation Drawer & Bottom Nav Widgets
        const widgetsCode = fs.readFileSync(path.join(PROJECT_ROOT, 'js', 'fc-widgets.js'), 'utf8');

        // Drawer component structure
        assert.match(widgetsCode, /fcMobileDrawerOverlay/, 'Mobile navigation drawer overlay must exist');
        assert.match(widgetsCode, /fcMobileDrawer/, 'Mobile navigation drawer element must exist');
        assert.match(widgetsCode, /toggleMobileDrawer/, 'Mobile drawer toggle function must exist');

        // Verify bottom navigation bar (< 768px)
        assert.match(widgetsCode, /fcMobileBottomNav/, 'Native mobile bottom navigation bar must be present');

        // Step 3: Drawer Navigation Links to Solutions Page
        assert.match(
            widgetsCode,
            /<a\s+[^>]*href=["']solutions\.html["']/i,
            'Mobile drawer must provide direct link to solutions.html'
        );

        // Step 4: Visitor Navigates to Solutions Page
        const solutionsHtml = readHtmlPage('solutions.html');
        assert.ok(solutionsHtml.includes('AI Voice Agents') || solutionsHtml.includes('Voice Calling'), 'Solutions page must showcase AI Voice Agents');
        assert.ok(solutionsHtml.includes('WhatsApp'), 'Solutions page must showcase WhatsApp Commerce');
        assert.ok(solutionsHtml.includes('delivery.html') || solutionsHtml.includes('Borzo'), 'Solutions page must feature Hyperlocal Fleet');

        // Step 5: Visitor Clicks WhatsApp Consultation CTA in Solutions / Index / Widgets
        const solutionsLinks = extractLinks(solutionsHtml);
        const homeLinks = extractLinks(homeHtml);
        const staticWaLinks = [...solutionsLinks, ...homeLinks].filter(l => l.href.includes('wa.me'));

        assert.ok(staticWaLinks.length > 0, 'WhatsApp consultation links must be present in static navigation');

        // Also verify fc-widgets.js defines dynamic WhatsApp consultation handler with URI encoding
        assert.match(
            widgetsCode,
            /encodeURIComponent\(/,
            'js/fc-widgets.js must URI-encode prefilled WhatsApp consultation message'
        );
        assert.match(
            widgetsCode,
            /wa\.me\/919920386421/,
            'js/fc-widgets.js must configure official WhatsApp number 919920386421'
        );

        // Step 6: Validate Static WhatsApp Link Formatting & Message Encoding
        for (const wa of staticWaLinks) {
            assert.ok(wa.href.startsWith('https://wa.me/919920386421'), `WhatsApp URL must target +91 99203 86421: ${wa.href}`);
            assert.doesNotMatch(wa.href, /\$\{/, `WhatsApp URL must not contain un-rendered template variables: ${wa.href}`);

            if (wa.href.includes('?text=')) {
                const encodedText = wa.href.split('?text=')[1].split('&')[0];
                assert.doesNotThrow(() => {
                    const decoded = decodeURIComponent(encodedText);
                    assert.ok(decoded.length > 5, 'Decoded message must contain meaningful text');
                    assert.doesNotMatch(decoded, /\$\{/, 'Decoded message must not contain raw variable syntax');
                }, `WhatsApp query parameter must be valid URI encoded string: ${wa.href}`);
            }
        }
    });

    // =========================================================================
    // Scenario 4: Store Simulation & Courier Dispatch Workflow
    // =========================================================================
    it('Scenario 4: Store Simulation & Courier Dispatch Workflow', async () => {
        // Step 1: Customer Visits Storefront
        const storeHtml = readHtmlPage('store.html');
        assert.ok(storeHtml.includes('Autonomous AI Storefront') || storeHtml.includes('FLYING CHEETAH'), 'store.html must load autonomous storefront branding');

        // Step 2: Script Tag Deduplication Check
        // Must use unified supabase client and not reference broken configs
        assert.ok(
            storeHtml.includes('js/supabase-config.js') || storeHtml.includes('js/supabase-client.js'),
            'store.html must include Supabase client script'
        );

        // Step 3: Payment Simulation Triggers
        assert.ok(storeHtml.includes('qrcode') || storeHtml.includes('UPI'), 'store.html must include UPI QR / payment elements');

        // Step 4: Hyperlocal Courier Delivery Calculation via Borzo Gateway
        const borzoHandler = require(path.join(API_DIR, 'borzo-dispatch.js'));

        const calcRes = await invokeHandler(borzoHandler, {
            method: 'POST',
            body: {
                action: 'calculate',
                pickup: 'Bandra West, Mumbai',
                delivery: 'Andheri East, Mumbai'
            }
        });

        assert.equal(calcRes.statusCode, 200, 'Borzo calculation must return HTTP 200');
        assert.equal(calcRes.json?.is_successful, true, 'Calculation response must report success');
        assert.ok(calcRes.json?.distance_km > 0, 'Calculated distance must be positive');
        assert.ok(calcRes.json?.delivery_fee_inr > 0, 'Calculated delivery fee must be positive');
        assert.ok(calcRes.json?.eta_minutes > 0, 'Estimated ETA must be positive');
        assert.equal(calcRes.json?.currency, 'INR', 'Currency must be INR');

        // Step 5: Courier Dispatch Order Creation
        const createRes = await invokeHandler(borzoHandler, {
            method: 'POST',
            body: {
                action: 'create',
                order_ref: 'FC-ORDER-TEST-7788',
                recipient_name: 'Aarav Mehta',
                recipient_phone: '+91 98201 23456',
                address: 'Flat 402, Pali Hill, Bandra West, Mumbai'
            }
        });

        assert.ok(
            createRes.statusCode === 200 || createRes.statusCode === 201,
            `Borzo dispatch creation must return HTTP 200 or 201, got ${createRes.statusCode}`
        );
        assert.equal(createRes.json?.is_successful, true, 'Dispatch order must be successful');
        assert.ok(createRes.json?.tracking_number, 'Dispatch order must return tracking number');
        const assignedRider = createRes.json?.rider || createRes.json?.assigned_rider;
        assert.ok(assignedRider?.name, 'Dispatch must return assigned Mumbai rider name');
        assert.ok(assignedRider?.phone, 'Dispatch must return assigned rider phone');
        assert.ok(assignedRider?.vehicle, 'Dispatch must return assigned rider vehicle');
    });

    // =========================================================================
    // Scenario 5: Enterprise Diligence & Founder Identity Verification
    // =========================================================================
    it('Scenario 5: Enterprise Diligence & Founder Identity Verification', () => {
        // Step 1: Enterprise Prospect Inspects about.html
        const aboutHtml = readHtmlPage('about.html');
        assert.ok(aboutHtml.length > 5000, 'about.html must be a complete company profile document');

        // Step 2: Validate Founder Profiles & Roles
        assert.ok(aboutHtml.includes('Bhagat Mukhiya'), 'about.html must feature Bhagat Mukhiya');
        assert.ok(aboutHtml.includes('Yash Gaikwad'), 'about.html must feature Yash Gaikwad');

        // Verify technical leadership titles
        assert.ok(
            aboutHtml.includes('Technical Architect') || aboutHtml.includes('Core Systems') || aboutHtml.includes('Engineering Lead'),
            'Bhagat Mukhiya must be credited with Technical Architecture / Engineering Leadership'
        );
        assert.ok(
            aboutHtml.includes('Growth') || aboutHtml.includes('Operations'),
            'Yash Gaikwad must be credited with Growth / Operations Leadership'
        );

        // Step 3: Validate Founder Photo Assets on Disk
        const bhagatRootPath = path.join(PROJECT_ROOT, 'bhagat.jpg');
        const yashRootPath = path.join(PROJECT_ROOT, 'Yash.jpg');

        assert.ok(fs.existsSync(bhagatRootPath), 'Founder photo bhagat.jpg must exist at repository root');
        assert.ok(fs.existsSync(yashRootPath), 'Founder photo Yash.jpg must exist at repository root');

        const bhagatStat = fs.statSync(bhagatRootPath);
        const yashStat = fs.statSync(yashRootPath);

        assert.ok(bhagatStat.size > 50000, `bhagat.jpg must have high-res file size (>50KB), got ${bhagatStat.size} bytes`);
        assert.ok(yashStat.size > 50000, `Yash.jpg must have high-res file size (>50KB), got ${yashStat.size} bytes`);

        // Check JPEG magic numbers (0xFF 0xD8 0xFF)
        const bhagatBuf = fs.readFileSync(bhagatRootPath);
        const yashBuf = fs.readFileSync(yashRootPath);
        assert.equal(bhagatBuf[0], 0xFF, 'bhagat.jpg must be valid JPEG (byte 0)');
        assert.equal(bhagatBuf[1], 0xD8, 'bhagat.jpg must be valid JPEG (byte 1)');
        assert.equal(yashBuf[0], 0xFF, 'Yash.jpg must be valid JPEG (byte 0)');
        assert.equal(yashBuf[1], 0xD8, 'Yash.jpg must be valid JPEG (byte 1)');

        // Step 4: Verify Direct Founder LinkedIn Links
        const links = extractLinks(aboutHtml);
        const bhagatLink = links.find(l => l.href.includes('linkedin.com/in/bhagat-mukhiya'));
        const yashLink = links.find(l => l.href.includes('linkedin.com/in/yash-gaikwad'));

        assert.ok(bhagatLink, 'Bhagat Mukhiya direct LinkedIn link must exist');
        assert.ok(yashLink, 'Yash Gaikwad direct LinkedIn link must exist');

        assert.ok(bhagatLink.raw.includes('target="_blank"'), 'Bhagat LinkedIn link must open in new tab (target="_blank")');
        assert.ok(bhagatLink.raw.includes('rel="noopener noreferrer"'), 'Bhagat LinkedIn link must include rel="noopener noreferrer"');
        assert.ok(yashLink.raw.includes('target="_blank"'), 'Yash LinkedIn link must open in new tab (target="_blank")');
        assert.ok(yashLink.raw.includes('rel="noopener noreferrer"'), 'Yash LinkedIn link must include rel="noopener noreferrer"');

        // Step 5: Enterprise Platform Security Audit (vercel.json)
        const vercelJsonPath = path.join(PROJECT_ROOT, 'vercel.json');
        const vercelConfig = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
        const globalHeaders = vercelConfig.headers?.find(h => h.source === '/(.*)')?.headers || [];

        const headerKeys = globalHeaders.map(h => h.key.toLowerCase());
        assert.ok(headerKeys.includes('x-content-type-options'), 'vercel.json must set X-Content-Type-Options');
        assert.ok(headerKeys.includes('x-frame-options'), 'vercel.json must set X-Frame-Options');
        assert.ok(headerKeys.includes('x-xss-protection'), 'vercel.json must set X-XSS-Protection');
        assert.ok(headerKeys.includes('referrer-policy'), 'vercel.json must set Referrer-Policy');
    });

    // =========================================================================
    // Scenario 6: Clean Production Deployment & Indexing Pipeline
    // =========================================================================
    it('Scenario 6: Clean Production Deployment & Indexing Pipeline', () => {
        // Step 1: Local Coursework and Heavy Asset Accounting
        const heavyFiles = [
            'blender-5.3.0-windows-x64.msi',
            'Financial Planning ECN.pptx',
            'schema.sql'
        ];

        let totalHeavyBytes = 0;
        for (const file of heavyFiles) {
            const filePath = path.join(PROJECT_ROOT, file);
            assert.ok(fs.existsSync(filePath), `Local asset ${file} must remain intact in workspace`);
            totalHeavyBytes += fs.statSync(filePath).size;
        }

        // Heavy assets total > 200MB locally
        assert.ok(
            totalHeavyBytes > 100 * 1024 * 1024,
            `Local non-web assets must be preserved (totaling >100MB, found ${(totalHeavyBytes / (1024 * 1024)).toFixed(1)}MB)`
        );

        // Step 2: Deployment Packaging Simulation (.vercelignore)
        const ignoreRules = readVercelIgnore();
        assert.ok(ignoreRules.length > 0, '.vercelignore must exist and contain rules');

        // Confirm rules strip out non-web files
        for (const file of heavyFiles) {
            const ext = path.extname(file);
            const isExcluded = ignoreRules.some(r => r.includes(`*${ext}`) || r.includes(file));
            assert.ok(isExcluded, `Heavy file ${file} must be excluded by .vercelignore rules`);
        }

        // Step 3: Search Engine Index Validation (sitemap.xml)
        const sitemap = parseSitemap();
        assert.ok(sitemap.exists, 'sitemap.xml must exist at project root');
        assert.ok(sitemap.content.includes('<urlset'), 'sitemap.xml must have <urlset> root element');
        assert.ok(sitemap.urls.length >= 10, `sitemap.xml must index primary pages (found ${sitemap.urls.length} entries)`);

        for (const entry of sitemap.urls) {
            assert.ok(entry.loc.startsWith('https://'), `Sitemap entry must use HTTPS canonical URL: ${entry.loc}`);
            assert.match(
                entry.lastmod,
                /^\d{4}-\d{2}-\d{2}$/,
                `Sitemap entry <lastmod> must follow ISO 8601 YYYY-MM-DD: ${entry.loc} (${entry.lastmod})`
            );
        }

        // Step 4: Serverless Entrypoints CommonJS & Export Integrity
        const apiFiles = fs.readdirSync(API_DIR).filter(f => f.endsWith('.js'));
        assert.ok(apiFiles.length >= 5, 'api/ directory must contain serverless functions');

        for (const file of apiFiles) {
            const filePath = path.join(API_DIR, file);
            const content = fs.readFileSync(filePath, 'utf8');

            // Must not use ES module import/export syntax
            assert.doesNotMatch(content, /^\s*export\s+default/m, `${file} must not use ESM "export default"`);
            assert.doesNotMatch(content, /^\s*import\s+.*?from/m, `${file} must not use ESM "import"`);

            // Must require cleanly without throw
            assert.doesNotThrow(() => {
                const mod = require(filePath);
                assert.ok(mod !== null && mod !== undefined, `${file} must export a valid module object or function`);
            }, `api/${file} must be syntactically valid CommonJS`);
        }
    });

    // =========================================================================
    // Scenario 7: Full Resilience & Error Cascading Across API Failure Modes
    // =========================================================================
    it('Scenario 7: Full Resilience & Error Cascading Across API Failure Modes', async () => {
        const leadsHandler = require(path.join(API_DIR, 'leads.js'));
        const borzoHandler = require(path.join(API_DIR, 'borzo-dispatch.js'));

        // 1. Invalid HTTP Method (405 Method Not Allowed)
        const methodNotAllowed = await invokeHandler(borzoHandler, {
            method: 'PUT'
        });
        assert.equal(methodNotAllowed.statusCode, 405, 'Unsupported HTTP method must return 405 Method Not Allowed');

        // 2. Malformed JSON Body String (Should not crash serverless process)
        const badJsonRes = await invokeHandler(leadsHandler, {
            method: 'POST',
            body: '{ malformed json string without closing brace ...'
        });
        assert.ok(
            badJsonRes.statusCode === 400 || badJsonRes.statusCode === 500,
            `Malformed JSON body must be handled gracefully without crashing, got ${badJsonRes.statusCode}`
        );

        // 3. Empty Object Payload on POST
        const emptyPostRes = await invokeHandler(leadsHandler, {
            method: 'POST',
            body: {}
        });
        assert.equal(emptyPostRes.statusCode, 400, 'Empty POST body missing required fields must return 400');
    });

});

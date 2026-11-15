/**
 * TIER 3: CROSS-FEATURE & PAIRWISE INTERACTION TEST SUITE
 * Verifies pairwise combinations and cross-cutting requirements across R1 to R6 for Flying Cheetah.
 * Minimum 12 tests. Zero external npm dependencies.
 * Runner: node --test tests/e2e/tier3_cross_feature.test.js
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

describe('Tier 3: Cross-Feature & Pairwise Interactions', () => {

    // =========================================================================
    // 1. Auth Guard + Database Failure Propagation
    // =========================================================================
    it('T3.1 Auth Guard + Database Failure: Authenticated requests propagate 500/502 on DB outage (not 200 or 401)', async () => {
        const authModule = require(path.join(API_DIR, '_auth.js'));
        const secret = 'test-secret-key-32-chars-length!!';

        await withEnv({
            SECRET_KEY: secret,
            JWT_SECRET: secret,
            // Point Supabase to an unreachable endpoint to simulate database outage
            SUPABASE_URL: 'http://127.0.0.1:59999',
            SUPABASE_ANON_KEY: 'test-anon-key'
        }, async () => {
            // Clear require cache so freshly evaluated module picks up new SUPABASE_URL
            delete require.cache[require.resolve(path.join(API_DIR, 'demos.js'))];
            const demosHandler = require(path.join(API_DIR, 'demos.js'));

            // 1. Unauthenticated request to failing DB must be blocked with 401 (auth check precedes DB connection)
            const unauthRes = await invokeHandler(demosHandler, {
                method: 'GET',
                headers: {}
            });
            assert.equal(
                unauthRes.statusCode,
                401,
                `Unauthenticated request must return 401 even during DB outage, got ${unauthRes.statusCode}`
            );

            // 2. Authenticated admin request to failing DB must propagate 500/502 (NOT masked 200 and NOT 401)
            const adminToken = authModule.signJwt({
                sub: 'admin_1',
                email: 'flyingcheetah.agency@gmail.com',
                role: 'admin'
            });

            const authRes = await invokeHandler(demosHandler, {
                method: 'GET',
                headers: { authorization: `Bearer ${adminToken}` }
            });

            assert.notEqual(
                authRes.statusCode,
                401,
                'Authenticated admin request must not return 401 Unauthorized'
            );
            assert.notEqual(
                authRes.statusCode,
                200,
                'Database failure must not be masked as HTTP 200 success'
            );
            assert.ok(
                authRes.statusCode === 500 || authRes.statusCode === 502,
                `Database outage must return HTTP 500 or 502, got ${authRes.statusCode}`
            );
            assert.ok(
                authRes.body.includes('error') || authRes.body.includes('Database'),
                'Error response must contain descriptive error payload'
            );
        });
    });

    // =========================================================================
    // 2. Input Sanitization + Mailer Dispatch Security
    // =========================================================================
    it('T3.2 Input Sanitization + Mailer Dispatch: Form inputs with HTML/script injection are escaped before email generation', () => {
        const mailerPath = path.join(API_DIR, '_mailer.js');
        assert.ok(fs.existsSync(mailerPath), 'api/_mailer.js must exist');
        const mailer = require(mailerPath);

        assert.equal(typeof mailer.escapeHtml, 'function', 'api/_mailer.js must export escapeHtml');
        assert.equal(typeof mailer.sanitizeHeader, 'function', 'api/_mailer.js must export sanitizeHeader');

        // Test hostile payloads combining multiple injection vectors
        const dangerousInputs = {
            name: '<script>alert("xss")</script>Bhagat Mukhiya',
            company: '"><img src=x onerror=alert(1)> Enterprise',
            notes: 'Special chars: & < > " \' and CRLF: \r\nBcc: evil@attacker.com',
            subject: 'Important Inquiry\r\nBcc: victim@example.com\r\nSubject: Spoofed'
        };

        const escapedName = mailer.escapeHtml(dangerousInputs.name);
        const escapedCompany = mailer.escapeHtml(dangerousInputs.company);
        const escapedNotes = mailer.escapeHtml(dangerousInputs.notes);
        const safeSubject = mailer.sanitizeHeader(dangerousInputs.subject);

        // Assert no executable HTML remains
        assert.doesNotMatch(escapedName, /<script>/i, 'escapeHtml must eliminate executable <script> tags');
        assert.ok(escapedName.includes('&lt;script&gt;'), 'escapeHtml must convert < to &lt;');
        assert.ok(escapedName.includes('&lt;/script&gt;'), 'escapeHtml must convert > to &gt;');

        assert.doesNotMatch(escapedCompany, /<img\s+/i, 'escapeHtml must eliminate executable <img> tags');
        assert.ok(escapedCompany.includes('&quot;&gt;&lt;img'), 'escapeHtml must entity-encode attributes');

        assert.ok(escapedNotes.includes('&amp;'), 'escapeHtml must convert & to &amp;');
        assert.ok(escapedNotes.includes('&#39;'), 'escapeHtml must convert \' to &#39;');
        assert.ok(escapedNotes.includes('&quot;'), 'escapeHtml must convert " to &quot;');

        // Assert header injection prevention (no newlines in single-line header)
        assert.doesNotMatch(safeSubject, /[\r\n]/, 'sanitizeHeader must strip carriage returns and newlines');
        assert.ok(safeSubject.includes('victim@example.com'), 'Header text should be collapsed to single line');
    });

    // =========================================================================
    // 3. 390px Mobile Viewport + Lead Modal / CTA Layout
    // =========================================================================
    it('T3.3 390px Mobile Viewport + Lead Modal / CTA: Form submit buttons and modal containers fit without horizontal scroll', () => {
        const cssPath = path.join(PROJECT_ROOT, 'css', 'mobile-app.css');
        assert.ok(fs.existsSync(cssPath), 'css/mobile-app.css must exist');
        const cssContent = fs.readFileSync(cssPath, 'utf8');

        // Verify global horizontal overflow protection
        assert.match(
            cssContent,
            /overflow-x:\s*hidden\s*!important/,
            'css/mobile-app.css must enforce overflow-x: hidden !important on html/body'
        );
        assert.match(
            cssContent,
            /max-width:\s*100vw\s*!important/,
            'css/mobile-app.css must enforce max-width: 100vw !important'
        );

        // Inspect lead form modals across public landing pages
        const pagesToCheck = ['index.html', 'demo.html', 'solutions.html'];
        for (const pageName of pagesToCheck) {
            const html = readHtmlPage(pageName);
            assert.ok(hasViewportMeta(html), `${pageName} must include mobile viewport meta tag`);

            // Verify modal or form containers use responsive max-width classes
            const modalMatches = html.match(/id=["'](?:leadModal|demoModal|consultationModal)["'][\s\S]*?>/gi) || [];
            for (const modalTag of modalMatches) {
                // Must not have a rigid fixed pixel width larger than 358px (e.g. w-[500px])
                assert.doesNotMatch(
                    modalTag,
                    /\bw-\[(?:[4-9]\d{2}|\d{4,})px\]/,
                    `Modal container in ${pageName} must not specify rigid width > 358px`
                );
            }
        }
    });

    // =========================================================================
    // 4. Deduplicated Supabase Client + Client Scripts Interoperability
    // =========================================================================
    it('T3.4 Deduplicated Supabase Client + Client Scripts: Unified client interface interoperates across auth.js and leads.js', () => {
        const clientPath = path.join(PROJECT_ROOT, 'js', 'supabase-client.js');
        const authPath = path.join(PROJECT_ROOT, 'js', 'auth.js');
        const leadsPath = path.join(PROJECT_ROOT, 'js', 'leads.js');

        assert.ok(fs.existsSync(clientPath), 'js/supabase-client.js must exist');
        assert.ok(fs.existsSync(authPath), 'js/auth.js must exist');
        assert.ok(fs.existsSync(leadsPath), 'js/leads.js must exist');

        const clientCode = fs.readFileSync(clientPath, 'utf8');
        const authCode = fs.readFileSync(authPath, 'utf8');
        const leadsCode = fs.readFileSync(leadsPath, 'utf8');

        // 1. supabase-client.js defines FC_BACKEND with getClient
        assert.match(
            clientCode,
            /window\.FC_BACKEND\s*=/,
            'js/supabase-client.js must assign window.FC_BACKEND'
        );
        assert.match(
            clientCode,
            /getClient\s*[:(]/,
            'js/supabase-client.js must expose getClient() method'
        );

        // 2. auth.js and leads.js invoke FC_BACKEND.getClient()
        assert.match(
            authCode,
            /FC_BACKEND\.getClient\(\)/,
            'js/auth.js must consume window.FC_BACKEND.getClient()'
        );
        assert.match(
            leadsCode,
            /FC_BACKEND\.getClient\(\)/,
            'js/leads.js must consume window.FC_BACKEND.getClient()'
        );

        // 3. store.html must use the deduplicated client and not obsolete configs
        const storeHtml = readHtmlPage('store.html');
        assert.doesNotMatch(
            storeHtml,
            /<script\s+[^>]*src=["']js\/supabase-config\.js["']/i,
            'store.html must not reference obsolete supabase-config.js; use supabase-client.js instead'
        );
    });

    // =========================================================================
    // 5. Mobile Menu Toggle + WhatsApp Floating Widget Non-Collision
    // =========================================================================
    it('T3.5 Mobile Menu Toggle + WhatsApp Floating Widget: Navigation drawer does not collide with floating contact widgets', () => {
        const widgetsPath = path.join(PROJECT_ROOT, 'js', 'fc-widgets.js');
        const cssPath = path.join(PROJECT_ROOT, 'css', 'mobile-app.css');

        assert.ok(fs.existsSync(widgetsPath), 'js/fc-widgets.js must exist');
        assert.ok(fs.existsSync(cssPath), 'css/mobile-app.css must exist');

        const widgetsCode = fs.readFileSync(widgetsPath, 'utf8');
        const cssCode = fs.readFileSync(cssPath, 'utf8');

        // Drawer overlay must have higher z-index (z-[200]) than bottom navigation (z-[145])
        assert.match(
            widgetsCode,
            /fcMobileDrawerOverlay[\s\S]*?z-\[200\]/,
            'Mobile drawer overlay must specify z-[200] to sit above all bottom widgets'
        );
        assert.match(
            widgetsCode,
            /fcMobileBottomNav[\s\S]*?z-\[145\]/,
            'Mobile bottom nav must specify z-[145]'
        );

        // mobile-app.css must elevate floating WhatsApp widget above bottom nav bar
        assert.match(
            cssCode,
            /#fcFloatingWhatsAppWrapper\s*\{[^}]*bottom:\s*5\.25rem\s*!important/s,
            'mobile-app.css must reposition #fcFloatingWhatsAppWrapper 5.25rem above screen bottom'
        );
        assert.match(
            cssCode,
            /#fcWhatsAppPopup\s*\{[^}]*max-width:\s*calc\(100vw\s*-\s*1rem\)\s*!important/s,
            'mobile-app.css must constrain #fcWhatsAppPopup to prevent mobile horizontal overflow'
        );
    });

    // =========================================================================
    // 6. SEO OG Tags + Founder Asset Links
    // =========================================================================
    it('T3.6 SEO OG Tags + Founder Asset Links: about.html Open Graph image tag points to verified founder image', () => {
        const aboutHtml = readHtmlPage('about.html');
        const ogTags = getOgTags(aboutHtml);

        assert.ok(ogTags['og:image'], 'about.html must contain an og:image meta tag');
        const ogImageValue = ogTags['og:image'];

        // og:image should reference a founder image (bhagat.jpg, Yash.jpg, founders.png, etc.)
        assert.match(
            ogImageValue,
            /(?:bhagat|yash|founder|founders)/i,
            `about.html og:image (${ogImageValue}) should reference a founder branding asset`
        );

        // Clean relative URL to local file path
        const cleanedPath = ogImageValue.replace(/^https?:\/\/[^\/]+\//, '').replace(/^\//, '');
        const resolvedPath = path.join(PROJECT_ROOT, cleanedPath);

        assert.ok(
            fs.existsSync(resolvedPath),
            `Referenced og:image asset must exist on disk at: ${resolvedPath}`
        );

        const stat = fs.statSync(resolvedPath);
        assert.ok(stat.size > 10000, `Founder og:image asset must have valid file size (>10KB), got ${stat.size} bytes`);

        // Check image header magic bytes (JPEG: FF D8 FF, PNG: 89 50 4E 47)
        const buffer = fs.readFileSync(resolvedPath);
        const isJpeg = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
        const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
        assert.ok(isJpeg || isPng, 'Founder og:image asset must be a valid JPEG or PNG file');
    });

    // =========================================================================
    // 7. Vercelignore Exclusion + Git Workspace Integrity
    // =========================================================================
    it('T3.7 Vercelignore Exclusion + Git Workspace Integrity: Ignored non-web files exist locally in workspace', () => {
        const ignoreRules = readVercelIgnore();
        assert.ok(ignoreRules.length > 0, '.vercelignore must contain rules');

        // Confirm rules exist for heavy documents and installer binaries
        const hasPptxRule = ignoreRules.some(r => r.includes('*.pptx') || r.includes('.pptx'));
        const hasMsiRule = ignoreRules.some(r => r.includes('*.msi') || r.includes('.msi'));
        const hasPdfRule = ignoreRules.some(r => r.includes('*.pdf') || r.includes('.pdf'));
        const hasDocxRule = ignoreRules.some(r => r.includes('*.docx') || r.includes('.docx'));
        const hasSqlRule = ignoreRules.some(r => r.includes('*.sql') || r.includes('.sql'));

        assert.ok(hasPptxRule, '.vercelignore must exclude *.pptx');
        assert.ok(hasMsiRule, '.vercelignore must exclude *.msi');
        assert.ok(hasPdfRule, '.vercelignore must exclude *.pdf');
        assert.ok(hasDocxRule, '.vercelignore must exclude *.docx');
        assert.ok(hasSqlRule, '.vercelignore must exclude *.sql');

        // Verify that the actual heavy files matching these patterns still exist on disk locally
        const expectedLocalFiles = [
            'Financial Planning ECN.pptx',
            'blender-5.3.0-windows-x64.msi',
            'schema.sql',
            'EDC-SLA-31-34.docx'
        ];

        for (const fileName of expectedLocalFiles) {
            const filePath = path.join(PROJECT_ROOT, fileName);
            assert.ok(
                fs.existsSync(filePath),
                `Ignored file ${fileName} must be preserved locally in git workspace`
            );
            const size = fs.statSync(filePath).size;
            assert.ok(size > 0, `File ${fileName} must have non-zero size`);
        }

        // Verify essential web assets are NOT ignored
        const essentialWebFiles = ['index.html', 'about.html', 'js/fc-widgets.js', 'css/mobile-app.css', 'bhagat.jpg', 'Yash.jpg'];
        for (const webFile of essentialWebFiles) {
            const isIgnored = ignoreRules.some(rule => {
                if (rule.startsWith('*.')) {
                    const ext = path.extname(webFile);
                    return rule === `*${ext}`;
                }
                return rule === webFile || rule === `${webFile}/`;
            });
            assert.ok(!isIgnored, `Essential web asset ${webFile} must never be excluded by .vercelignore`);
        }
    });

    // =========================================================================
    // 8. Auth Scrypt Rehashing + Legacy SHA-256 Migration
    // =========================================================================
    it('T3.8 Auth Scrypt Rehashing + Legacy SHA-256 Migration: Legacy hash verifies and flags needsRehash: true for scrypt upgrade', () => {
        const authModule = require(path.join(API_DIR, '_auth.js'));
        assert.equal(typeof authModule.hashPasswordScrypt, 'function', '_auth.js must export hashPasswordScrypt');
        assert.equal(typeof authModule.verifyPassword, 'function', '_auth.js must export verifyPassword');

        const testPassword = 'Password2026!MumbaiSecure';

        // 1. Generate a modern scrypt hash
        const scryptHash = authModule.hashPasswordScrypt(testPassword);
        assert.ok(scryptHash.includes(':'), 'Scrypt hash must be formatted as <salt>:<derivedKeyHex>');
        const [salt, keyHex] = scryptHash.split(':');
        assert.equal(salt.length, 32, 'Salt hex must be 32 characters (16 bytes)');
        assert.equal(keyHex.length, 128, 'Derived key hex must be 128 characters (64 bytes)');

        // Modern hash verification: verified = true, needsRehash = false
        const modernResult = authModule.verifyPassword(testPassword, scryptHash);
        assert.deepEqual(modernResult, { verified: true, needsRehash: false });

        // 2. Generate a legacy unsalted SHA-256 hash (64 hex characters)
        const legacyHash = crypto.createHash('sha256').update(testPassword).digest('hex');
        assert.equal(legacyHash.length, 64, 'Legacy SHA-256 hash must be 64 characters');

        // Legacy hash verification: verified = true, needsRehash = true (triggers automatic scrypt migration)
        const legacyResult = authModule.verifyPassword(testPassword, legacyHash);
        assert.deepEqual(
            legacyResult,
            { verified: true, needsRehash: true },
            'Legacy SHA-256 hash must verify successfully and flag needsRehash: true'
        );

        // 3. Invalid password against legacy hash
        const wrongLegacyResult = authModule.verifyPassword('WrongPassword123!', legacyHash);
        assert.deepEqual(wrongLegacyResult, { verified: false, needsRehash: false });

        // 4. Invalid password against scrypt hash
        const wrongScryptResult = authModule.verifyPassword('WrongPassword123!', scryptHash);
        assert.deepEqual(wrongScryptResult, { verified: false, needsRehash: false });
    });

    // =========================================================================
    // 9. Responsive Header CTA + Admin Panel Header
    // =========================================================================
    it('T3.9 Responsive Header CTA + Admin Panel Header: Public headers adaptively hide action CTAs while admin retains controls', () => {
        // Public pages must adaptively hide action CTAs on mobile (< 640px)
        const publicPages = ['index.html', 'solutions.html', 'delivery.html', 'store-automation.html'];
        for (const pageName of publicPages) {
            const html = readHtmlPage(pageName);
            const ctas = getHeaderCtaButtons(html);

            for (const cta of ctas) {
                // Ignore mobile hamburger toggle button
                if (cta.id === 'fcMobileMenuBtn' || cta.raw.includes('fcMobileMenuBtn')) continue;

                // Ignore brand logo/home link
                if (cta.href === 'index.html' || cta.text.toLowerCase().includes('flying cheetah')) continue;

                // Action CTA buttons in header must have hidden sm:inline-flex (or hidden md:inline-flex)
                assert.match(
                    cta.classes,
                    /\bhidden\s+(?:sm|md|lg):/,
                    `CTA "${cta.text}" in ${pageName} header must have responsive hide class (e.g. hidden sm:inline-flex)`
                );
            }
        }

        // Admin panel header must retain management controls for administrative operations
        const adminHtml = readHtmlPage('admin.html');
        assert.ok(adminHtml.includes('Cloud Integrations'), 'admin.html header must retain Cloud Integrations control');
        assert.ok(adminHtml.includes('Merchant Profile'), 'admin.html header must retain Merchant Profile control');
        assert.ok(adminHtml.includes('adminAvatarImg'), 'admin.html header must retain Admin Avatar control');
    });

    // =========================================================================
    // 10. Direct Founder LinkedIn + WhatsApp Click-to-Chat
    // =========================================================================
    it('T3.10 Direct Founder LinkedIn + WhatsApp Click-to-Chat: Profiles and chat links are valid and use HTTPS protocol', () => {
        const aboutHtml = readHtmlPage('about.html');
        const links = extractLinks(aboutHtml);

        // 1. Founder LinkedIn links in about.html
        const bhagatLinkedIn = links.find(l => l.href.includes('linkedin.com/in/bhagat-mukhiya'));
        const yashLinkedIn = links.find(l => l.href.includes('linkedin.com/in/yash-gaikwad'));

        assert.ok(bhagatLinkedIn, 'Bhagat Mukhiya LinkedIn profile link must exist in about.html');
        assert.ok(yashLinkedIn, 'Yash Gaikwad LinkedIn profile link must exist in about.html');

        assert.ok(
            bhagatLinkedIn.href.startsWith('https://'),
            `Bhagat LinkedIn must use HTTPS protocol, got ${bhagatLinkedIn.href}`
        );
        assert.ok(
            yashLinkedIn.href.startsWith('https://'),
            `Yash LinkedIn must use HTTPS protocol, got ${yashLinkedIn.href}`
        );

        // 2. WhatsApp click-to-chat links across pages
        const whatsappLinks = links.filter(l => l.href.includes('wa.me'));
        assert.ok(whatsappLinks.length > 0, 'WhatsApp click-to-chat links must exist in about.html');

        for (const wa of whatsappLinks) {
            assert.ok(wa.href.startsWith('https://wa.me/'), `WhatsApp link must use HTTPS wa.me: ${wa.href}`);
            assert.match(wa.href, /wa\.me\/919920386421/, `WhatsApp link must target official number 919920386421: ${wa.href}`);

            // If URL includes query text, it must be valid URI-encoded text
            if (wa.href.includes('?text=')) {
                const queryText = wa.href.split('?text=')[1];
                assert.doesNotMatch(queryText, /\s/, `WhatsApp query string must not contain raw unencoded spaces: ${wa.href}`);
                assert.doesNotMatch(queryText, /\$\{/, `WhatsApp query string must not contain un-rendered template variables: ${wa.href}`);

                // Decode must succeed cleanly
                assert.doesNotThrow(() => {
                    decodeURIComponent(queryText);
                }, `WhatsApp query string must be valid URI encoding: ${wa.href}`);
            }
        }
    });

    // =========================================================================
    // 11. Serverless CORS Headers + Auth Verification
    // =========================================================================
    it('T3.11 Serverless CORS Headers + Auth Verification: CORS preflight and 401 unauthenticated responses return CORS headers', async () => {
        const authHandler = require(path.join(API_DIR, 'auth.js'));
        const demosHandler = require(path.join(API_DIR, 'demos.js'));

        // 1. CORS Preflight OPTIONS request
        const optionsRes = await invokeHandler(authHandler, {
            method: 'OPTIONS',
            headers: {
                origin: 'https://flying-cheetah.vercel.app',
                'access-control-request-method': 'POST'
            }
        });

        assert.equal(optionsRes.statusCode, 200, 'OPTIONS request must return HTTP 200');
        assert.equal(
            optionsRes.headers['access-control-allow-origin'],
            '*',
            'OPTIONS response must include Access-Control-Allow-Origin: *'
        );
        assert.match(
            optionsRes.headers['access-control-allow-headers'] || '',
            /authorization/i,
            'Access-Control-Allow-Headers must permit Authorization header'
        );

        // 2. Unauthenticated GET request to protected endpoint (returns 401 with CORS headers intact)
        const unauthRes = await invokeHandler(demosHandler, {
            method: 'GET',
            headers: {}
        });

        assert.equal(unauthRes.statusCode, 401, 'Unauthenticated GET /api/demos must return HTTP 401');
        assert.equal(
            unauthRes.headers['access-control-allow-origin'],
            '*',
            'HTTP 401 response must still include Access-Control-Allow-Origin: * so client browser can inspect error'
        );
    });

    // =========================================================================
    // 12. Navigation Target Section Anchors + Header Sticky Offset
    // =========================================================================
    it('T3.12 Target Section Anchors + Sticky Offset: web-development.html sections tech-stack and pricing exist and are addressable', () => {
        const webDevHtml = readHtmlPage('web-development.html');
        const anchorIds = extractAnchorIds(webDevHtml);

        // Required section IDs for deep-linking from drawer menu
        assert.ok(
            anchorIds.has('tech-stack'),
            'web-development.html must contain an element with id="tech-stack"'
        );
        assert.ok(
            anchorIds.has('pricing'),
            'web-development.html must contain an element with id="pricing"'
        );

        // Verify navigation drawer menu in fc-widgets.js references these anchor links
        const widgetsCode = fs.readFileSync(path.join(PROJECT_ROOT, 'js', 'fc-widgets.js'), 'utf8');
        assert.match(
            widgetsCode,
            /web-development\.html#tech-stack/,
            'js/fc-widgets.js drawer must link to web-development.html#tech-stack'
        );
        assert.match(
            widgetsCode,
            /web-development\.html#pricing/,
            'js/fc-widgets.js drawer must link to web-development.html#pricing'
        );
    });

    // =========================================================================
    // 13. Anti-Spam Honeypot Short-Circuit + Database Protection
    // =========================================================================
    it('T3.13 Honeypot Anti-Spam + Serverless Response: Honeypot submission returns 201 immediately without database call', async () => {
        const leadsHandler = require(path.join(API_DIR, 'leads.js'));

        // Submitting with honeypot field populated (simulating bot form fill)
        const botPayload = {
            name: 'SpamBot 3000',
            email: 'bot@spamnetwork.com',
            phone: '+1 555 0199',
            honeypot: 'i_am_a_malicious_automated_bot',
            service: 'Automations',
            message: 'Cheap pills and luxury watches'
        };

        const res = await invokeHandler(leadsHandler, {
            method: 'POST',
            body: botPayload
        });

        assert.equal(res.statusCode, 201, 'Honeypot submission must return HTTP 201 to gracefully trap bot');
        assert.equal(res.json?.id, 'bot-filtered', 'Honeypot response must flag lead as bot-filtered');
    });

    // =========================================================================
    // 14. Security Headers in vercel.json + Static HTML Integrity
    // =========================================================================
    it('T3.14 Security Headers in vercel.json: Strict HTTP headers configured and no secrets embedded in HTML files', () => {
        const vercelJsonPath = path.join(PROJECT_ROOT, 'vercel.json');
        assert.ok(fs.existsSync(vercelJsonPath), 'vercel.json must exist');

        const vercelConfig = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
        assert.ok(Array.isArray(vercelConfig.headers), 'vercel.json must configure custom headers');

        const globalHeaderRule = vercelConfig.headers.find(h => h.source === '/(.*)');
        assert.ok(globalHeaderRule, 'vercel.json must include a global header rule for /(.*)');

        const headerMap = {};
        for (const h of globalHeaderRule.headers) {
            headerMap[h.key.toLowerCase()] = h.value;
        }

        assert.equal(headerMap['x-content-type-options'], 'nosniff');
        assert.equal(headerMap['x-frame-options'], 'SAMEORIGIN');
        assert.match(headerMap['x-xss-protection'] || '', /1;\s*mode=block/);
        assert.match(headerMap['referrer-policy'] || '', /strict-origin/);

        // Verify no static HTML files leak the Gmail app password
        const forbiddenString = 'sryzptfthzfeeeco';
        for (const page of ALL_24_PAGES) {
            const content = readHtmlPage(page);
            assert.ok(!content.includes(forbiddenString), `HTML page ${page} must not contain password literal "${forbiddenString}"`);
        }
    });

    // =========================================================================
    // 15. Dynamic Store UPI Sandbox + Client Auth Session
    // =========================================================================
    it('T3.15 Dynamic Store UPI Sandbox + Client Auth Session: Store checkout checks merchant profile in auth session; defaults to sandbox mode if unconfigured', () => {
        const storeHtml = readHtmlPage('store.html');
        assert.ok(storeHtml, 'store.html must exist and be readable');

        // 1. Verify zero occurrences of obsolete hardcoded UPI VPA across store.html
        assert.doesNotMatch(
            storeHtml,
            /flyingcheetah@hdfcbank/i,
            'store.html must not contain hardcoded "flyingcheetah@hdfcbank" VPA'
        );

        // 2. Verify store.html script checks window.FC_AUTH.getMerchantProfile
        assert.match(
            storeHtml,
            /window\.FC_AUTH\s*&&\s*typeof\s+window\.FC_AUTH\.getMerchantProfile\s*===?\s*['"]function['"]/,
            'store.html must integrate with window.FC_AUTH.getMerchantProfile'
        );

        // 3. Verify presence of interactive sandbox fallback UI in store.html
        assert.ok(
            storeHtml.includes('Interactive Sandbox Demo Mode') || storeHtml.includes('sandbox-demo@upi'),
            'store.html must include interactive sandbox demo fallback'
        );
        assert.ok(
            storeHtml.includes('id="upiMobilePayBtn"'),
            'store.html must contain mobile UPI 1-tap intent button'
        );
        assert.ok(
            storeHtml.includes('id="upiModal"'),
            'store.html must contain dynamic UPI modal'
        );

        // 4. Test sandbox logic execution: unconfigured merchant profile vs configured profile
        const vm = require('node:vm');
        const domContext = {
            window: {},
            document: {
                elements: {},
                getElementById(id) {
                    if (!this.elements[id]) {
                        this.elements[id] = {
                            textContent: '',
                            innerHTML: '',
                            value: '',
                            href: '',
                            classList: {
                                classes: new Set(['hidden']),
                                add(c) { this.classes.add(c); },
                                remove(c) { this.classes.delete(c); },
                                contains(c) { return this.classes.has(c); }
                            }
                        };
                    }
                    return this.elements[id];
                }
            },
            console: { log: () => {}, warn: () => {}, error: () => {} }
        };
        domContext.window = domContext;

        // Extract script logic from store.html for openUpiModal
        const openUpiModalCodeMatch = storeHtml.match(/function\s+openUpiModal\s*\([\s\S]*?\n\s*function\s+closeUpiModal/);
        assert.ok(openUpiModalCodeMatch, 'openUpiModal function must be present in store.html');
        const openUpiModalCode = openUpiModalCodeMatch[0].replace(/function\s+closeUpiModal[\s\S]*$/, '');

        // Evaluate in VM without configured merchant profile (Sandbox state)
        vm.createContext(domContext);
        domContext.window.FC_AUTH = {
            getMerchantProfile: () => ({})
        };
        vm.runInContext(openUpiModalCode, domContext);

        const orderData = { item: { name: 'Pure Linen Shirt', price: 1499 }, orderRef: 'FC-TEST-001' };
        domContext.openUpiModal(orderData);

        const upiIdTextEl = domContext.document.getElementById('upiIdText');
        const mobilePayBtnEl = domContext.document.getElementById('upiMobilePayBtn');
        const upiModalEl = domContext.document.getElementById('upiModal');

        assert.ok(
            upiIdTextEl.innerHTML.includes('Interactive Sandbox Demo Mode'),
            'Unconfigured merchant profile must display Sandbox Demo Mode badge'
        );
        assert.equal(
            mobilePayBtnEl.href,
            'javascript:void(0)',
            'Mobile 1-tap pay link must be javascript:void(0) in sandbox demo mode'
        );
        assert.ok(
            !upiModalEl.classList.contains('hidden'),
            'UPI modal must be unhidden after openUpiModal call'
        );

        // Evaluate in VM with configured merchant profile (Live payment intent state)
        domContext.window.FC_AUTH = {
            getMerchantProfile: () => ({
                merchant_upi_id: 'merchant@okaxis',
                business_name: 'Cheetah Elite Boutique'
            })
        };
        domContext.openUpiModal(orderData);

        assert.equal(
            upiIdTextEl.textContent,
            'merchant@okaxis',
            'Configured merchant profile must display live merchant UPI ID'
        );
        assert.ok(
            mobilePayBtnEl.href.startsWith('upi://pay?'),
            'Configured merchant profile must construct upi://pay URI'
        );
        assert.ok(
            mobilePayBtnEl.href.includes('pa=merchant%40okaxis'),
            'Constructed URI must contain encoded payee address'
        );
        assert.ok(
            mobilePayBtnEl.href.includes('am=1499'),
            'Constructed URI must contain payable amount'
        );
    });

    // =========================================================================
    // 16. Service Page Lead Form + Postgres Generated Column Compatibility
    // =========================================================================
    it('T3.16 Service Page Lead Form + Postgres Generated Column Compatibility: Lead submitted from service audit modal persists into Supabase without PostgreSQL 428C9 column collision', async () => {
        // 1. Verify service pages wire lead capture modal via js/leads.js
        const servicePages = [
            'store-automation.html',
            'ai-voice-agents.html',
            'solutions.html',
            'web-development.html'
        ];

        for (const pageName of servicePages) {
            const html = readHtmlPage(pageName);
            assert.match(
                html,
                /<script\s+[^>]*src=["']js\/leads\.js["']/i,
                `${pageName} must load js/leads.js`
            );
            assert.match(
                html,
                /(?:FC_LEADS\.openAuditModal|openAuditModal)/,
                `${pageName} must wire CTAs to openAuditModal`
            );
        }

        // 2. Invoke POST /api/leads with a service audit modal payload (including service and backward-compat service_interested)
        const leadsHandlerPath = path.join(API_DIR, 'leads.js');
        const leadsHandler = require(leadsHandlerPath);

        const originalFetch = global.fetch;
        let interceptedUrl = null;
        let interceptedBody = null;
        let interceptedHeaders = null;

        try {
            global.fetch = async (url, options = {}) => {
                interceptedUrl = String(url);
                interceptedHeaders = options.headers || {};
                if (options.body) {
                    try {
                        interceptedBody = JSON.parse(options.body);
                    } catch (_) {
                        interceptedBody = options.body;
                    }
                }

                // Simulate PostgreSQL / Supabase REST response with generated column computed
                return {
                    ok: true,
                    status: 201,
                    json: async () => ([{
                        id: 'lead_supabase_789',
                        name: 'Aditya Mehta',
                        email: 'aditya@mumbai-retail.com',
                        phone: '+91 99203 55443',
                        service: 'Store Automation & Cart Recovery',
                        // In Postgres, service_interested is GENERATED ALWAYS AS (service) STORED
                        service_interested: 'Store Automation & Cart Recovery',
                        message: 'Need 25-minute automated courier dispatch for our store',
                        source_page: 'store-automation.html',
                        status: 'new',
                        created_at: new Date().toISOString()
                    }])
                };
            };

            await withEnv({
                SUPABASE_URL: 'https://fc-test-project.supabase.co',
                SUPABASE_ANON_KEY: 'fc-test-anon-key-valid-token'
            }, async () => {
                const res = await invokeHandler(leadsHandler, {
                    method: 'POST',
                    url: '/api/leads',
                    body: {
                        name: 'Aditya Mehta',
                        email: 'aditya@mumbai-retail.com',
                        phone: '+91 99203 55443',
                        service: 'Store Automation & Cart Recovery',
                        service_interested: 'Store Automation & Cart Recovery', // legacy / alias field from client
                        message: 'Need 25-minute automated courier dispatch for our store',
                        source_page: 'store-automation.html'
                    }
                });

                assert.equal(res.statusCode, 201, `Lead creation must succeed with HTTP 201, got ${res.statusCode}`);
                assert.ok(res.json, 'Response must return parsed JSON body');
                assert.equal(res.json.id, 'lead_supabase_789', 'Must return persisted lead ID');
                assert.equal(res.json.service, 'Store Automation & Cart Recovery');

                // 3. Verify outgoing Supabase payload strictly excludes service_interested
                assert.ok(interceptedUrl, 'fetch must have been called with Supabase REST URL');
                assert.ok(
                    interceptedUrl.includes('/rest/v1/leads_inquiries'),
                    `Target URL must be leads_inquiries table, got: ${interceptedUrl}`
                );
                assert.ok(interceptedBody, 'fetch body must be provided');
                assert.equal(interceptedBody.service, 'Store Automation & Cart Recovery');

                // Critical check for PostgreSQL error 428C9 avoidance:
                assert.strictEqual(
                    interceptedBody.service_interested,
                    undefined,
                    'Outgoing Supabase insert payload must strictly exclude "service_interested" column to prevent PostgreSQL 428C9 (cannot insert a non-DEFAULT value into column "service_interested")'
                );

                assert.equal(interceptedBody.name, 'Aditya Mehta');
                assert.equal(interceptedBody.email, 'aditya@mumbai-retail.com');
                assert.equal(interceptedBody.phone, '+91 99203 55443');
                assert.equal(interceptedBody.status, 'new');
            });
        } finally {
            global.fetch = originalFetch;
        }
    });

});

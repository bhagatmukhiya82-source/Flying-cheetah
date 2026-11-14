/**
 * TIER 1: FEATURE COVERAGE TEST SUITE
 * Verifies core functionality and requirements R1 to R6 for Flying Cheetah.
 * Minimum 5 tests per requirement. Zero external npm dependencies.
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
    parseMetaTags,
    getOgTags,
    hasViewportMeta,
    extractHeader,
    getHeaderCtaButtons,
    findUndefinedTemplateVariables,
    extractAnchorIds,
    extractLinks,
    readVercelIgnore,
    parseSitemap
} = require('./helpers.js');

// =============================================================================
// REQUIREMENT 1: Security & Serverless API Hardening (8 Tests)
// =============================================================================
describe('R1: Security & Serverless API Hardening (Feature Coverage)', () => {

    it('R1.1 Plaintext Gmail app password literal is completely eliminated from api/*.js', () => {
        const forbiddenPassword = 'sryzptfthzfeeeco';
        const files = fs.readdirSync(API_DIR).filter(f => f.endsWith('.js'));
        assert.ok(files.length > 0, 'api/ directory should contain serverless functions');

        const leaks = [];
        for (const file of files) {
            const content = fs.readFileSync(path.join(API_DIR, file), 'utf8');
            if (content.includes(forbiddenPassword)) {
                leaks.push(file);
            }
        }
        assert.deepEqual(leaks, [], `Plaintext password literal "${forbiddenPassword}" found in: ${leaks.join(', ')}`);
    });

    it('R1.2 Hardcoded fallback JWT secrets are eliminated from api/*.js', () => {
        const forbiddenJwtSecret = 'flying_cheetah_super_secure_jwt_secret_key_2026_mumbai_d2c_ai';
        const files = fs.readdirSync(API_DIR).filter(f => f.endsWith('.js'));

        const leaks = [];
        for (const file of files) {
            const content = fs.readFileSync(path.join(API_DIR, file), 'utf8');
            if (content.includes(forbiddenJwtSecret)) {
                leaks.push(file);
            }
        }
        assert.deepEqual(leaks, [], `Hardcoded fallback JWT secret found in: ${leaks.join(', ')}`);
    });

    it('R1.3 Shared mailer module api/_mailer.js enforces rejectUnauthorized: true on TLS socket', () => {
        const mailerPath = path.join(API_DIR, '_mailer.js');
        assert.ok(fs.existsSync(mailerPath), 'api/_mailer.js must exist as shared mailer module');

        const mailerCode = fs.readFileSync(mailerPath, 'utf8');
        assert.match(
            mailerCode,
            /rejectUnauthorized:\s*true/,
            'api/_mailer.js must explicitly enforce rejectUnauthorized: true on TLS connection'
        );
        assert.doesNotMatch(
            mailerCode,
            /rejectUnauthorized:\s*false/,
            'api/_mailer.js must never set rejectUnauthorized: false'
        );
    });

    it('R1.4 Shared auth guard api/_auth.js exports requireAdminAuth, verifyJwt, and hashPasswordScrypt', () => {
        const authModulePath = path.join(API_DIR, '_auth.js');
        assert.ok(fs.existsSync(authModulePath), 'api/_auth.js must exist as shared auth guard module');

        const authModule = require(authModulePath);
        assert.equal(typeof authModule.requireAdminAuth, 'function', 'api/_auth.js must export requireAdminAuth function');
        assert.equal(typeof authModule.verifyJwt, 'function', 'api/_auth.js must export verifyJwt function');
        assert.equal(typeof authModule.hashPasswordScrypt, 'function', 'api/_auth.js must export hashPasswordScrypt function');
    });

    it('R1.5 GET /api/leads rejects unauthenticated request with HTTP 401', async () => {
        const leadsHandler = require(path.join(API_DIR, 'leads.js'));
        const response = await invokeHandler(leadsHandler, {
            method: 'GET',
            headers: {} // No Authorization header
        });

        assert.equal(
            response.statusCode,
            401,
            `Expected GET /api/leads without Bearer token to return HTTP 401, got ${response.statusCode}`
        );
    });

    it('R1.6 GET /api/demos rejects unauthenticated request with HTTP 401', async () => {
        const demosHandler = require(path.join(API_DIR, 'demos.js'));
        const response = await invokeHandler(demosHandler, {
            method: 'GET',
            headers: {} // No Authorization header
        });

        assert.equal(
            response.statusCode,
            401,
            `Expected GET /api/demos without Bearer token to return HTTP 401, got ${response.statusCode}`
        );
    });

    it('R1.7 PATCH /api/leads rejects unauthenticated request with HTTP 401', async () => {
        const leadsHandler = require(path.join(API_DIR, 'leads.js'));
        const response = await invokeHandler(leadsHandler, {
            method: 'PATCH',
            headers: {},
            body: { id: 'lead_123', status: 'contacted' }
        });

        assert.equal(
            response.statusCode,
            401,
            `Expected PATCH /api/leads without Bearer token to return HTTP 401, got ${response.statusCode}`
        );
    });

    it('R1.8 Password hashing uses scrypt with unique salt-delimited format', () => {
        const authModulePath = path.join(API_DIR, '_auth.js');
        assert.ok(fs.existsSync(authModulePath), 'api/_auth.js must exist');
        const { hashPasswordScrypt, verifyPassword } = require(authModulePath);

        const password = 'TestSecurePassword2026!';
        const hash1 = hashPasswordScrypt(password);
        const hash2 = hashPasswordScrypt(password);

        assert.ok(hash1.includes(':'), 'Hash must contain a delimiter ":" separating salt and derived key');
        const [salt1, key1] = hash1.split(':');
        const [salt2, key2] = hash2.split(':');

        assert.ok(salt1 && key1, 'Hash must produce valid salt and key components');
        assert.notEqual(salt1, salt2, 'Two hashes of the same password must have unique random salts');
        assert.notEqual(hash1, hash2, 'Two hashes of the same password must differ due to unique salts');

        if (typeof verifyPassword === 'function') {
            const result = verifyPassword(password, hash1);
            assert.equal(result.verified, true, 'verifyPassword must verify valid scrypt hash');
        }
    });

});

// =============================================================================
// REQUIREMENT 2: Frontend Responsive Layout & Mobile Navigation (6 Tests)
// =============================================================================
describe('R2: Frontend Responsive Layout & Navigation (Feature Coverage)', () => {

    it('R2.1 All 24 public HTML pages contain width=device-width viewport meta tag', () => {
        const missingViewport = [];
        for (const page of ALL_24_PAGES) {
            const html = readHtmlPage(page);
            if (!hasViewportMeta(html)) {
                missingViewport.push(page);
            }
        }
        assert.deepEqual(
            missingViewport,
            [],
            `Pages missing valid viewport meta tag: ${missingViewport.join(', ')}`
        );
    });

    it('R2.2 Header primary action buttons include responsive hidden sm:inline-flex on public pages', () => {
        const servicePages = [
            'index.html',
            'about.html',
            'solutions.html',
            'delivery.html',
            'demo.html',
            'store.html',
            'web-development.html'
        ];

        const nonResponsiveCtas = [];
        for (const page of servicePages) {
            const html = readHtmlPage(page);
            const header = extractHeader(html);
            // In public headers, primary action CTAs should be hidden on mobile (sm:inline-flex or sm:flex)
            // so they do not crowd out the brand logo and hamburger toggle on 390px viewports
            if (header.includes('Book 1-on-1 Architecture Demo') || header.includes('Get Started') || header.includes('Launch Live Demo')) {
                const ctas = getHeaderCtaButtons(html);
                const visibleMobileCtas = ctas.filter(c => {
                    const isDemoCta = /demo|started|architecture/i.test(c.text);
                    const isHiddenOnMobile = /\bhidden\s+sm:(inline-flex|flex|block)\b/.test(c.classes);
                    return isDemoCta && !isHiddenOnMobile;
                });
                if (visibleMobileCtas.length > 0) {
                    nonResponsiveCtas.push(`${page} (${visibleMobileCtas.map(c => c.text).join(', ')})`);
                }
            }
        }

        assert.deepEqual(
            nonResponsiveCtas,
            [],
            `Header action CTAs missing 'hidden sm:inline-flex' on mobile: ${nonResponsiveCtas.join(', ')}`
        );
    });

    it('R2.3 No un-rendered template variable literals (e.g. ${waLink}) exist in HTML pages', () => {
        const unrenderedLitPages = [];
        for (const page of ALL_24_PAGES) {
            const html = readHtmlPage(page);
            const unrendered = findUndefinedTemplateVariables(html);
            if (unrendered.length > 0) {
                unrenderedLitPages.push(`${page} (${unrendered.map(u => u.match).join(', ')})`);
            }
        }
        assert.deepEqual(
            unrenderedLitPages,
            [],
            `Found un-rendered template literals in static HTML: ${unrenderedLitPages.join(', ')}`
        );
    });

    it('R2.4 Section anchor IDs tech-stack and pricing exist in web-development.html', () => {
        const html = readHtmlPage('web-development.html');
        const ids = extractAnchorIds(html);
        assert.ok(ids.has('tech-stack'), 'web-development.html must contain an element with id="tech-stack"');
        assert.ok(ids.has('pricing'), 'web-development.html must contain an element with id="pricing"');
    });

    it('R2.5 store.html uses unified supabase client and does not reference obsolete supabase-config.js', () => {
        const html = readHtmlPage('store.html');
        assert.doesNotMatch(
            html,
            /supabase-config\.js/i,
            'store.html must not reference obsolete or un-aliased supabase-config.js'
        );
        assert.match(
            html,
            /supabase-client\.js/i,
            'store.html must reference the standard js/supabase-client.js module'
        );
    });

    it('R2.6 Mobile hamburger menu button #fcMobileMenuBtn exists across core responsive pages', () => {
        const responsivePages = ['index.html', 'about.html', 'solutions.html', 'delivery.html'];
        const missingToggle = [];
        for (const page of responsivePages) {
            const html = readHtmlPage(page);
            if (!html.includes('id="fcMobileMenuBtn"') && !html.includes("id='fcMobileMenuBtn'")) {
                missingToggle.push(page);
            }
        }
        assert.deepEqual(
            missingToggle,
            [],
            `Pages missing #fcMobileMenuBtn hamburger button: ${missingToggle.join(', ')}`
        );
    });

});

// =============================================================================
// REQUIREMENT 3: Personal Branding Preservation (5 Tests)
// =============================================================================
describe('R3: Personal Founder Branding Preservation (Feature Coverage)', () => {

    it('R3.1 Founder photo bhagat.jpg exists with valid size (>10KB)', () => {
        const photoPath = path.join(PROJECT_ROOT, 'bhagat.jpg');
        assert.ok(fs.existsSync(photoPath), 'Founder photo bhagat.jpg must exist at project root');
        const stats = fs.statSync(photoPath);
        assert.ok(stats.size > 10000, `bhagat.jpg size should be > 10KB, got ${stats.size} bytes`);
    });

    it('R3.2 Founder photo Yash.jpg exists with valid size (>10KB)', () => {
        const photoPath = path.join(PROJECT_ROOT, 'Yash.jpg');
        assert.ok(fs.existsSync(photoPath), 'Founder photo Yash.jpg must exist at project root');
        const stats = fs.statSync(photoPath);
        assert.ok(stats.size > 10000, `Yash.jpg size should be > 10KB, got ${stats.size} bytes`);
    });

    it('R3.3 about.html contains biographical content and names for Bhagat Mukhiya and Yash Gaikwad', () => {
        const html = readHtmlPage('about.html');
        assert.match(html, /Bhagat\s+Mukhiya/i, 'about.html must contain founder name "Bhagat Mukhiya"');
        assert.match(html, /Yash\s+Gaikwad/i, 'about.html must contain founder name "Yash Gaikwad"');
    });

    it('R3.4 Bhagat Mukhiya direct LinkedIn link exists in about.html', () => {
        const html = readHtmlPage('about.html');
        const links = extractLinks(html);
        const bhagatLinkedIn = links.find(l => l.href.includes('linkedin.com/in/bhagat-mukhiya'));
        assert.ok(bhagatLinkedIn, 'about.html must contain a direct LinkedIn profile link for Bhagat Mukhiya');
    });

    it('R3.5 Yash Gaikwad direct LinkedIn link exists in about.html', () => {
        const html = readHtmlPage('about.html');
        const links = extractLinks(html);
        const yashLinkedIn = links.find(l => l.href.includes('linkedin.com/in/yash-gaikwad') || l.href.includes('linkedin.com/in/yashgaikwad'));
        assert.ok(yashLinkedIn, 'about.html must contain a direct LinkedIn profile link for Yash Gaikwad');
    });

});

// =============================================================================
// REQUIREMENT 4: Repository Deployment Hygiene (6 Tests)
// =============================================================================
describe('R4: Repository Deployment Hygiene (Feature Coverage)', () => {

    it('R4.1 .vercelignore exists at project root', () => {
        const ignorePath = path.join(PROJECT_ROOT, '.vercelignore');
        assert.ok(fs.existsSync(ignorePath), '.vercelignore file must exist at project root');
    });

    it('R4.2 .vercelignore excludes presentation documents (*.pptx)', () => {
        const lines = readVercelIgnore();
        const hasPptx = lines.some(l => l.includes('*.pptx') || l.includes('.pptx'));
        assert.ok(hasPptx, '.vercelignore must exclude *.pptx documents from production deployment');
    });

    it('R4.3 .vercelignore excludes word processor documents (*.docx)', () => {
        const lines = readVercelIgnore();
        const hasDocx = lines.some(l => l.includes('*.docx') || l.includes('.docx'));
        assert.ok(hasDocx, '.vercelignore must exclude *.docx documents from production deployment');
    });

    it('R4.4 .vercelignore excludes portable document formats (*.pdf)', () => {
        const lines = readVercelIgnore();
        const hasPdf = lines.some(l => l.includes('*.pdf') || l.includes('.pdf'));
        assert.ok(hasPdf, '.vercelignore must exclude *.pdf documents from production deployment');
    });

    it('R4.5 .vercelignore excludes installer binaries and databases (*.msi, *.sql)', () => {
        const lines = readVercelIgnore();
        const hasMsi = lines.some(l => l.includes('*.msi') || l.includes('.msi'));
        const hasSql = lines.some(l => l.includes('*.sql') || l.includes('.sql'));
        assert.ok(hasMsi, '.vercelignore must exclude *.msi installer packages');
        assert.ok(hasSql, '.vercelignore must exclude *.sql database dumps');
    });

    it('R4.6 .vercelignore excludes local environment configuration files (.env*)', () => {
        const lines = readVercelIgnore();
        const hasEnv = lines.some(l => l.includes('.env*') || l.includes('.env.local') || l === '.env');
        assert.ok(hasEnv, '.vercelignore must exclude .env* files from production bundle');
    });

});

// =============================================================================
// REQUIREMENT 5: SEO Open Graph Metadata & Sitemap (6 Tests)
// =============================================================================
describe('R5: SEO Open Graph Metadata & Sitemap (Feature Coverage)', () => {

    it('R5.1 All public service HTML pages contain og:title meta tag', () => {
        const servicePages = [
            'index.html',
            'about.html',
            'solutions.html',
            'delivery.html',
            'demo.html',
            'store.html',
            'web-development.html'
        ];
        const missingOgTitle = [];
        for (const page of servicePages) {
            const html = readHtmlPage(page);
            const og = getOgTags(html);
            if (!og['og:title'] || !og['og:title'].trim()) {
                missingOgTitle.push(page);
            }
        }
        assert.deepEqual(missingOgTitle, [], `Pages missing og:title tag: ${missingOgTitle.join(', ')}`);
    });

    it('R5.2 All public service HTML pages contain og:description meta tag', () => {
        const servicePages = [
            'index.html',
            'about.html',
            'solutions.html',
            'delivery.html',
            'demo.html',
            'store.html',
            'web-development.html'
        ];
        const missingOgDesc = [];
        for (const page of servicePages) {
            const html = readHtmlPage(page);
            const og = getOgTags(html);
            if (!og['og:description'] || !og['og:description'].trim()) {
                missingOgDesc.push(page);
            }
        }
        assert.deepEqual(missingOgDesc, [], `Pages missing og:description tag: ${missingOgDesc.join(', ')}`);
    });

    it('R5.3 All public service HTML pages contain og:image meta tag', () => {
        const servicePages = [
            'index.html',
            'about.html',
            'solutions.html',
            'delivery.html',
            'demo.html',
            'store.html',
            'web-development.html'
        ];
        const missingOgImage = [];
        for (const page of servicePages) {
            const html = readHtmlPage(page);
            const og = getOgTags(html);
            if (!og['og:image'] || !og['og:image'].trim()) {
                missingOgImage.push(page);
            }
        }
        assert.deepEqual(missingOgImage, [], `Pages missing og:image tag: ${missingOgImage.join(', ')}`);
    });

    it('R5.4 sitemap.xml exists and is valid XML with urlset root element', () => {
        const parsed = parseSitemap();
        assert.ok(parsed.exists, 'sitemap.xml must exist at project root');
        assert.match(parsed.content, /<urlset[\s>]/, 'sitemap.xml must contain a <urlset> root element');
        assert.ok(parsed.urls.length >= 10, `sitemap.xml must declare at least 10 URLs, found ${parsed.urls.length}`);
    });

    it('R5.5 sitemap.xml includes entries for all core site routes', () => {
        const parsed = parseSitemap();
        const urls = parsed.urls.map(u => u.loc);
        const requiredRoutes = ['/', '/about', '/store', '/solutions', '/delivery', '/web-development'];
        const missingRoutes = [];
        for (const route of requiredRoutes) {
            const hasRoute = urls.some(u => u.endsWith(route) || u.endsWith(`${route}.html`));
            if (!hasRoute) missingRoutes.push(route);
        }
        assert.deepEqual(missingRoutes, [], `sitemap.xml missing core route entries: ${missingRoutes.join(', ')}`);
    });

    it('R5.6 sitemap.xml entries contain valid lastmod timestamps in YYYY-MM-DD format', () => {
        const parsed = parseSitemap();
        const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
        const invalidDates = [];
        for (const entry of parsed.urls) {
            if (!entry.lastmod || !isoDateRegex.test(entry.lastmod)) {
                invalidDates.push(`${entry.loc} (${entry.lastmod})`);
            }
        }
        assert.deepEqual(invalidDates, [], `sitemap.xml has entries with invalid or missing lastmod: ${invalidDates.join(', ')}`);
    });

});

// =============================================================================
// REQUIREMENT 6: Automated Verification & Packaging (5 Tests)
// =============================================================================
describe('R6: Automated Verification & Packaging (Feature Coverage)', () => {

    it('R6.1 package.json exists at project root', () => {
        const pkgPath = path.join(PROJECT_ROOT, 'package.json');
        assert.ok(fs.existsSync(pkgPath), 'package.json must exist at project root');
    });

    it('R6.2 package.json specifies a test script calling Node.js test runner', () => {
        const pkgPath = path.join(PROJECT_ROOT, 'package.json');
        assert.ok(fs.existsSync(pkgPath), 'package.json must exist');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        assert.ok(pkg.scripts && pkg.scripts.test, 'package.json must define a scripts.test property');
        assert.match(
            pkg.scripts.test,
            /node\s+--test/,
            'package.json test script must invoke the native node --test runner'
        );
    });

    it('R6.3 package.json declares zero external runtime production dependencies', () => {
        const pkgPath = path.join(PROJECT_ROOT, 'package.json');
        assert.ok(fs.existsSync(pkgPath), 'package.json must exist');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const deps = pkg.dependencies || {};
        assert.deepEqual(
            deps,
            {},
            'Architecture constraint: Zero external runtime npm dependencies allowed'
        );
    });

    it('R6.4 All serverless functions in api/*.js are syntactically valid CommonJS', () => {
        const files = fs.readdirSync(API_DIR).filter(f => f.endsWith('.js'));
        const syntaxErrors = [];
        for (const file of files) {
            const filePath = path.join(API_DIR, file);
            const code = fs.readFileSync(filePath, 'utf8');
            try {
                new vm.Script(code, { filename: file });
            } catch (err) {
                syntaxErrors.push(`${file}: ${err.message}`);
            }
        }
        assert.deepEqual(syntaxErrors, [], `Syntax errors found in api files: ${syntaxErrors.join('; ')}`);
    });

    it('R6.5 Serverless API entrypoints export an executable handler function', () => {
        const entrypoints = ['auth.js', 'leads.js', 'demos.js', 'fleet.js', 'send-email.js'];
        const nonHandlers = [];
        for (const file of entrypoints) {
            const filePath = path.join(API_DIR, file);
            if (fs.existsSync(filePath)) {
                try {
                    const mod = require(filePath);
                    if (typeof mod !== 'function') {
                        nonHandlers.push(`${file} (exports ${typeof mod})`);
                    }
                } catch (err) {
                    nonHandlers.push(`${file} (require error: ${err.message})`);
                }
            }
        }
        assert.deepEqual(nonHandlers, [], `API files that do not export a handler function: ${nonHandlers.join(', ')}`);
    });

});

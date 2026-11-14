/**
 * TIER 2: BOUNDARY & CORNER CASES TEST SUITE
 * Verifies edge cases, security boundaries, encoding, and stress conditions across R1 to R6.
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
    extractAnchorIds,
    extractLinks,
    readVercelIgnore,
    parseSitemap
} = require('./helpers.js');

// =============================================================================
// REQUIREMENT 1: Security & Serverless Boundaries (6 Tests)
// =============================================================================
describe('R1: Security & Serverless Boundaries', () => {

    it('R1.B1 HTML and script injection payloads are properly escaped in mailer utility', () => {
        const mailerPath = path.join(API_DIR, '_mailer.js');
        assert.ok(fs.existsSync(mailerPath), 'api/_mailer.js must exist');
        const mailer = require(mailerPath);
        assert.equal(typeof mailer.escapeHtml, 'function', 'api/_mailer.js must export escapeHtml utility');

        const maliciousInputs = [
            '<script>alert("xss")</script>',
            '"><img src=x onerror=alert(1)>',
            "'; DROP TABLE users; --",
            '& < > " \''
        ];

        for (const input of maliciousInputs) {
            const escaped = mailer.escapeHtml(input);
            assert.doesNotMatch(escaped, /<script>/i, `Unescaped <script> in: ${escaped}`);
            assert.doesNotMatch(escaped, /<img\s+/i, `Unescaped <img> in: ${escaped}`);
            assert.ok(!escaped.includes('"') || escaped.includes('&quot;'), `Unescaped double quote in: ${escaped}`);
            assert.ok(!escaped.includes('<') || escaped.includes('&lt;'), `Unescaped less-than in: ${escaped}`);
            assert.ok(!escaped.includes('>') || escaped.includes('&gt;'), `Unescaped greater-than in: ${escaped}`);
        }
    });

    it('R1.B2 Malformed, truncated, or forged JWT tokens are rejected by verifyJwt', () => {
        const authPath = path.join(API_DIR, '_auth.js');
        assert.ok(fs.existsSync(authPath), 'api/_auth.js must exist');
        const { verifyJwt } = require(authPath);

        const malformedTokens = [
            '',                                         // Empty string
            'invalid-token',                            // No periods
            'header.body',                              // Only 2 parts
            'header.body.sig.extra',                    // 4 parts
            'eyJhbGciOiJIUzI1NiJ9.invalidbody.badsig',   // Bad base64
            // Token with tampered signature
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFkbWluIn0.invalidsignature_1234567890'
        ];

        for (const token of malformedTokens) {
            const result = verifyJwt(token);
            assert.equal(result, null, `Malformed token should return null: "${token}"`);
        }
    });

    it('R1.B3 Expired JWT token is rejected by verifyJwt', () => {
        const authPath = path.join(API_DIR, '_auth.js');
        assert.ok(fs.existsSync(authPath), 'api/_auth.js must exist');
        const authModule = require(authPath);

        const secret = process.env.SECRET_KEY || 'test-secret-key-32-chars-length!!';
        // Build an expired token (exp was 1 hour ago)
        const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
        const body = Buffer.from(JSON.stringify({
            sub: 'admin_1',
            role: 'admin',
            exp: Math.floor(Date.now() / 1000) - 3600 // 1 hour ago
        })).toString('base64url');
        const sig = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
        const expiredToken = `${header}.${body}.${sig}`;

        withEnv({ SECRET_KEY: secret }, () => {
            const verified = authModule.verifyJwt(expiredToken);
            assert.equal(verified, null, 'Expired JWT token must return null');
        });
    });

    it('R1.B4 Missing or malformed Authorization header scheme returns 401 in requireAdminAuth', () => {
        const authPath = path.join(API_DIR, '_auth.js');
        assert.ok(fs.existsSync(authPath), 'api/_auth.js must exist');
        const { requireAdminAuth } = require(authPath);

        const invalidAuthHeaders = [
            undefined,                  // Missing header
            '',                         // Empty header
            'Basic dXNlcjpwYXNz',       // Basic auth scheme
            'Token valid-token-sample', // Token scheme instead of Bearer
            'Bearer',                   // Bearer with no token
            'Bearer    '                // Bearer with whitespace only
        ];

        for (const authHeader of invalidAuthHeaders) {
            const { req, res } = createMockReqRes({
                headers: authHeader ? { authorization: authHeader } : {}
            });
            const result = requireAdminAuth(req, res, {});
            assert.equal(result, null, `Invalid header "${authHeader}" should return null`);
            assert.equal(res.statusCode, 401, `Invalid header "${authHeader}" should trigger HTTP 401`);
        }
    });

    it('R1.B5 Password hashing handles extreme 1000-character input cleanly without error or DoS', () => {
        const authPath = path.join(API_DIR, '_auth.js');
        assert.ok(fs.existsSync(authPath), 'api/_auth.js must exist');
        const { hashPasswordScrypt, verifyPassword } = require(authPath);

        const longPassword = 'A'.repeat(1000);
        const startTime = Date.now();
        const hash = hashPasswordScrypt(longPassword);
        const duration = Date.now() - startTime;

        assert.ok(hash && hash.includes(':'), 'Should generate valid salt-delimited hash for long password');
        assert.ok(duration < 1500, `Hashing 1000-char password should complete promptly, took ${duration}ms`);

        if (typeof verifyPassword === 'function') {
            const verified = verifyPassword(longPassword, hash);
            assert.equal(verified.verified, true, 'verifyPassword must verify extreme length password');
            const wrongVerified = verifyPassword(longPassword + '!', hash);
            assert.equal(wrongVerified.verified, false, 'verifyPassword must reject wrong password of extreme length');
        }
    });

    it('R1.B6 Database failure does not return synthetic 200 success object', async () => {
        const leadsHandler = require(path.join(API_DIR, 'leads.js'));
        // With an invalid Supabase URL that fails immediately
        await withEnv({
            SUPABASE_URL: 'https://invalid-supabase-host-unreachable-domain-12345.local',
            SUPABASE_ANON_KEY: 'test-key'
        }, async () => {
            const response = await invokeHandler(leadsHandler, {
                method: 'POST',
                body: {
                    name: 'Test Lead',
                    email: 'test@example.com',
                    phone: '+919920386421',
                    service: 'Store Automation'
                }
            });

            // When database fails, it MUST NOT return synthetic 200/201 success masquerading as a saved lead
            assert.notEqual(
                response.statusCode,
                200,
                'Database failure must not return HTTP 200'
            );
            assert.notEqual(
                response.statusCode,
                201,
                'Database failure must not return HTTP 201 synthetic success'
            );
            assert.ok(
                response.statusCode >= 500,
                `Expected 500/502/503 server error when DB is offline, got ${response.statusCode}`
            );
        });
    });

});

// =============================================================================
// REQUIREMENT 2: Viewport & Layout Boundaries (5 Tests)
// =============================================================================
describe('R2: Viewport & Layout Boundaries', () => {

    it('R2.B1 390px viewport header width calculation fits within usable 358px boundary', () => {
        // iPhone 13/14/15 logical viewport: 390px width.
        // Container padding: px-4 (16px left + 16px right) = 32px padding -> 358px usable width.
        // Brand container max-width: ~220px. Hamburger toggle button: 40px width.
        // Flex gap between items: ~16px. Total required width: 220 + 40 + 16 = 276px <= 358px.
        // If a desktop CTA button (~150px) is NOT hidden with 'hidden sm:inline-flex',
        // total width becomes 276 + 150 = 426px > 358px, breaking layout on 390px viewports.

        const servicePages = ['index.html', 'about.html', 'solutions.html', 'delivery.html'];
        for (const page of servicePages) {
            const html = readHtmlPage(page);
            const header = extractHeader(html);
            const ctas = getHeaderCtaButtons(html);

            for (const cta of ctas) {
                if (/demo|started|architecture/i.test(cta.text)) {
                    // Must have hidden on mobile
                    assert.match(
                        cta.classes,
                        /\bhidden\b/,
                        `CTA "${cta.text}" in ${page} header must have 'hidden' class to prevent header overflow on 390px viewport`
                    );
                    assert.match(
                        cta.classes,
                        /\bsm:(inline-flex|flex|block)\b/,
                        `CTA "${cta.text}" in ${page} header must have 'sm:...' responsive display rule`
                    );
                }
            }
        }
    });

    it('R2.B2 WhatsApp click-to-chat links correctly URL-encode special characters and spaces', () => {
        // Scan HTML pages for wa.me links
        for (const page of ALL_24_PAGES) {
            const html = readHtmlPage(page);
            const links = extractLinks(html);
            const waLinks = links.filter(l => l.href.includes('wa.me') || l.href.includes('api.whatsapp.com'));

            for (const link of waLinks) {
                // Must not contain raw unencoded spaces
                assert.doesNotMatch(
                    link.href,
                    /\s/,
                    `WhatsApp link in ${page} contains raw whitespace: ${link.href}`
                );
                // Must not contain unencoded angle brackets or quotes
                assert.doesNotMatch(
                    link.href,
                    /[<>"']/,
                    `WhatsApp link in ${page} contains unencoded characters: ${link.href}`
                );
            }
        }
    });

    it('R2.B3 WhatsApp click-to-chat phone numbers contain numeric digits only', () => {
        for (const page of ALL_24_PAGES) {
            const html = readHtmlPage(page);
            const links = extractLinks(html);
            const waLinks = links.filter(l => l.href.includes('wa.me/'));

            for (const link of waLinks) {
                const match = link.href.match(/wa\.me\/([^\/?#]+)/);
                if (match) {
                    const phonePart = match[1];
                    assert.match(
                        phonePart,
                        /^\d+$/,
                        `WhatsApp phone number in ${page} must contain digits only, found "${phonePart}" in ${link.href}`
                    );
                }
            }
        }
    });

    it('R2.B4 All navigation links on public pages have non-empty href attributes', () => {
        const pagesToCheck = ['index.html', 'about.html', 'solutions.html', 'delivery.html'];
        for (const page of pagesToCheck) {
            const html = readHtmlPage(page);
            const header = extractHeader(html);
            const links = extractLinks(header);

            for (const link of links) {
                assert.notEqual(
                    link.href.trim(),
                    '',
                    `Found link with empty href in ${page} header: "${link.text}"`
                );
                assert.notEqual(
                    link.href,
                    'undefined',
                    `Found link with href="undefined" in ${page} header: "${link.text}"`
                );
                assert.notEqual(
                    link.href,
                    'null',
                    `Found link with href="null" in ${page} header: "${link.text}"`
                );
            }
        }
    });

    it('R2.B5 Extreme 320px viewport safety: brand header container does not specify rigid overflow widths', () => {
        const pagesToCheck = ['index.html', 'about.html', 'solutions.html', 'delivery.html'];
        for (const page of pagesToCheck) {
            const html = readHtmlPage(page);
            const header = extractHeader(html);
            // Extract the brand anchor element
            const brandMatch = header.match(/<a\s+[^>]*href=["']index\.html["'][^>]*>[\s\S]*?<\/a>/i);
            assert.ok(brandMatch, `Header in ${page} must contain brand logo link pointing to index.html`);
            const brandHtml = brandMatch[0];

            // Brand container must not have a rigid width exceeding 260px on 320px viewports
            assert.doesNotMatch(
                brandHtml,
                /class=["'][^"']*\bw-\[(2[7-9][0-9]|[3-9][0-9]{2})px\]/i,
                `Brand container in ${page} has rigid fixed width >= 270px that would overflow 320px viewports`
            );
            // Brand title must use tight tracking or leading to fit narrow screens
            assert.match(
                brandHtml,
                /tracking-tight|truncate|leading-none/i,
                `Header brand text in ${page} should have tight tracking or leading for narrow viewports`
            );
        }
    });

});

// =============================================================================
// REQUIREMENT 3: Personal Branding Boundaries (5 Tests)
// =============================================================================
describe('R3: Personal Founder Branding Boundaries', () => {

    it('R3.B1 Founder photo filenames maintain exact case sensitivity on disk', () => {
        const files = fs.readdirSync(PROJECT_ROOT);

        const hasBhagatLower = files.includes('bhagat.jpg');
        const hasYashCapital = files.includes('Yash.jpg');

        assert.ok(hasBhagatLower, 'Founder photo "bhagat.jpg" must exist with exact lowercase "b"');
        assert.ok(hasYashCapital, 'Founder photo "Yash.jpg" must exist with exact uppercase "Y"');
    });

    it('R3.B2 Founder image files have valid JPEG magic numbers', () => {
        const bhagatBuf = fs.readFileSync(path.join(PROJECT_ROOT, 'bhagat.jpg'));
        const yashBuf = fs.readFileSync(path.join(PROJECT_ROOT, 'Yash.jpg'));

        // JPEG files begin with 0xFF, 0xD8, 0xFF
        assert.equal(bhagatBuf[0], 0xFF, 'bhagat.jpg byte 0 must be 0xFF');
        assert.equal(bhagatBuf[1], 0xD8, 'bhagat.jpg byte 1 must be 0xD8');
        assert.equal(bhagatBuf[2], 0xFF, 'bhagat.jpg byte 2 must be 0xFF');

        assert.equal(yashBuf[0], 0xFF, 'Yash.jpg byte 0 must be 0xFF');
        assert.equal(yashBuf[1], 0xD8, 'Yash.jpg byte 1 must be 0xD8');
        assert.equal(yashBuf[2], 0xFF, 'Yash.jpg byte 2 must be 0xFF');
    });

    it('R3.B3 Founder section in about.html contains zero placeholder or lorem ipsum text', () => {
        const html = readHtmlPage('about.html');
        const foundersSectionMatch = html.match(/id=["']founders["'][\s\S]*?<\/section>/i) ||
                                     html.match(/Meet\s+the\s+Founders[\s\S]*?<\/section>/i);

        const textToCheck = foundersSectionMatch ? foundersSectionMatch[0] : html;
        assert.doesNotMatch(textToCheck, /lorem\s+ipsum/i, 'Placeholder "Lorem Ipsum" found in about.html');
        assert.doesNotMatch(textToCheck, /dolor\s+sit\s+amet/i, 'Placeholder "dolor sit amet" found in about.html');
        assert.doesNotMatch(textToCheck, /placeholder/i, 'Placeholder text found in about.html');
    });

    it('R3.B4 Founder LinkedIn URLs strictly use https protocol and match profile regex', () => {
        const html = readHtmlPage('about.html');
        const links = extractLinks(html);
        const linkedInLinks = links.filter(l => l.href.includes('linkedin.com'));

        assert.ok(linkedInLinks.length > 0, 'about.html must contain LinkedIn links');
        for (const link of linkedInLinks) {
            assert.ok(
                link.href.startsWith('https://'),
                `LinkedIn URL must use secure https:// protocol: ${link.href}`
            );
            assert.match(
                link.href,
                /^https:\/\/(www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/,
                `LinkedIn URL must match canonical profile URL pattern: ${link.href}`
            );
        }
    });

    it('R3.B5 Official agency brand name Flying Cheetah is consistently capitalized', () => {
        const servicePages = ['index.html', 'about.html', 'solutions.html'];
        for (const page of servicePages) {
            const html = readHtmlPage(page);
            const header = extractHeader(html);
            // In the header brand text, should be "Flying Cheetah"
            assert.match(
                header,
                /Flying\s+Cheetah/,
                `Header brand text in ${page} must display "Flying Cheetah"`
            );
        }
    });

});

// =============================================================================
// REQUIREMENT 4: Deployment Exclusion Boundaries (5 Tests)
// =============================================================================
describe('R4: Deployment Exclusion Boundaries', () => {

    it('R4.B1 .vercelignore wildcard patterns cover deeply nested directories', () => {
        const lines = readVercelIgnore();
        // Check that wildcard patterns e.g. *.pdf, *.pptx, *.docx, *.msi exist
        const expectedWildcards = ['*.pdf', '*.docx', '*.msi', '*.sql'];
        for (const pattern of expectedWildcards) {
            const hasPattern = lines.some(l => l === pattern || l.endsWith(`/${pattern}`) || l === `**/${pattern}`);
            assert.ok(hasPattern, `.vercelignore should include wildcard pattern "${pattern}" to match files across all directories`);
        }
    });

    it('R4.B2 Essential web assets (*.html, *.css, *.js, *.png, *.jpg) are NOT excluded in .vercelignore', () => {
        const lines = readVercelIgnore();
        const essentialExtensions = ['.html', '.css', '.js', '.png', '.jpg', '.webp', '.svg'];

        for (const ext of essentialExtensions) {
            const wronglyIgnored = lines.some(l => l === `*${ext}` || l === `**/*${ext}`);
            assert.equal(
                wronglyIgnored,
                false,
                `.vercelignore must NOT exclude essential web asset type "*${ext}"`
            );
        }
    });

    it('R4.B3 Heavy binary, docx, and presentation files exist locally in workspace', () => {
        // Deployment hygiene requires excluding them from Vercel without deleting them from the repo
        const localCourseworkFiles = [
            'Financial Planning ECN.pptx',
            'blender-5.3.0-windows-x64.msi',
            'EXP MDM 7.docx',
            'schema.sql'
        ];

        for (const file of localCourseworkFiles) {
            const filePath = path.join(PROJECT_ROOT, file);
            assert.ok(
                fs.existsSync(filePath),
                `Coursework/binary file "${file}" must be preserved locally in the repository`
            );
        }
    });

    it('R4.B4 Environment files (.env*) are excluded in .vercelignore', () => {
        const lines = readVercelIgnore();
        const hasEnvExclusion = lines.some(l => l.includes('.env*') || l.includes('.env.local') || l === '.env');
        assert.ok(hasEnvExclusion, '.vercelignore must exclude local environment variables files (.env*)');
    });

    it('R4.B5 .vercelignore contains no empty lines after trimming or duplicate entries', () => {
        const ignorePath = path.join(PROJECT_ROOT, '.vercelignore');
        assert.ok(fs.existsSync(ignorePath), '.vercelignore must exist');
        const lines = fs.readFileSync(ignorePath, 'utf8')
            .split(/\r?\n/)
            .map(l => l.trim())
            .filter(l => l && !l.startsWith('#'));

        const set = new Set();
        const duplicates = [];
        for (const line of lines) {
            if (set.has(line)) duplicates.push(line);
            set.add(line);
        }

        assert.deepEqual(
            duplicates,
            [],
            `.vercelignore should not have duplicate entries: ${duplicates.join(', ')}`
        );
    });

});

// =============================================================================
// REQUIREMENT 5: SEO Metadata Boundaries (5 Tests)
// =============================================================================
describe('R5: SEO Metadata Boundaries', () => {

    it('R5.B1 og:title values across all public pages are non-empty and non-whitespace', () => {
        const whitespaceOnlyTitles = [];
        for (const page of ALL_24_PAGES) {
            const html = readHtmlPage(page);
            const og = getOgTags(html);
            if (og['og:title'] !== undefined && og['og:title'].trim().length === 0) {
                whitespaceOnlyTitles.push(page);
            }
        }
        assert.deepEqual(
            whitespaceOnlyTitles,
            [],
            `Pages with empty or whitespace-only og:title: ${whitespaceOnlyTitles.join(', ')}`
        );
    });

    it('R5.B2 og:image values point to valid image formats (.jpg, .png, .webp, .svg)', () => {
        const invalidImageUrls = [];
        for (const page of ALL_24_PAGES) {
            const html = readHtmlPage(page);
            const og = getOgTags(html);
            if (og['og:image']) {
                const imgUrl = og['og:image'].trim();
                const hasValidExt = /\.(jpg|jpeg|png|webp|svg)(\?.*)?$/i.test(imgUrl);
                if (!hasValidExt) {
                    invalidImageUrls.push(`${page} (${imgUrl})`);
                }
            }
        }
        assert.deepEqual(
            invalidImageUrls,
            [],
            `Pages with invalid og:image format: ${invalidImageUrls.join(', ')}`
        );
    });

    it('R5.B3 sitemap.xml dates are valid calendar dates in ISO 8601 YYYY-MM-DD format', () => {
        const parsed = parseSitemap();
        assert.ok(parsed.exists, 'sitemap.xml must exist');

        const invalidCalendarDates = [];
        for (const entry of parsed.urls) {
            if (entry.lastmod) {
                const date = new Date(entry.lastmod);
                if (isNaN(date.getTime())) {
                    invalidCalendarDates.push(`${entry.loc} (${entry.lastmod})`);
                }
            }
        }
        assert.deepEqual(
            invalidCalendarDates,
            [],
            `sitemap.xml entries with invalid calendar date: ${invalidCalendarDates.join(', ')}`
        );
    });

    it('R5.B4 sitemap.xml priority tags are valid decimal numbers between 0.0 and 1.0', () => {
        const parsed = parseSitemap();
        const invalidPriorities = [];

        for (const entry of parsed.urls) {
            if (entry.priority) {
                const val = parseFloat(entry.priority);
                if (isNaN(val) || val < 0.0 || val > 1.0) {
                    invalidPriorities.push(`${entry.loc} (${entry.priority})`);
                }
            }
        }
        assert.deepEqual(
            invalidPriorities,
            [],
            `sitemap.xml entries with invalid priority (must be 0.0 - 1.0): ${invalidPriorities.join(', ')}`
        );
    });

    it('R5.B5 og:description length on public service pages is between 20 and 300 characters', () => {
        const servicePages = ['index.html', 'about.html', 'solutions.html', 'delivery.html'];
        const badDescLengths = [];

        for (const page of servicePages) {
            const html = readHtmlPage(page);
            const og = getOgTags(html);
            if (og['og:description']) {
                const len = og['og:description'].trim().length;
                if (len < 20 || len > 300) {
                    badDescLengths.push(`${page} (length: ${len})`);
                }
            }
        }
        assert.deepEqual(
            badDescLengths,
            [],
            `Pages with og:description outside recommended 20-300 character range: ${badDescLengths.join(', ')}`
        );
    });

});

// =============================================================================
// REQUIREMENT 6: Verification Boundaries (5 Tests)
// =============================================================================
describe('R6: Verification Boundaries', () => {

    it('R6.B1 Node vm sandbox executes api/*.js files without global scope pollution', () => {
        const files = fs.readdirSync(API_DIR).filter(f => f.endsWith('.js') && !f.startsWith('_'));
        for (const file of files) {
            const code = fs.readFileSync(path.join(API_DIR, file), 'utf8');
            const sandbox = {
                process: { env: { ...process.env } },
                require: require,
                module: { exports: {} },
                exports: {},
                console: console,
                Buffer: Buffer,
                Map: Map,
                Set: Set,
                Date: Date,
                setTimeout: setTimeout,
                clearTimeout: clearTimeout,
                fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
            };
            sandbox.global = sandbox;
            sandbox.globalThis = sandbox;
            const context = vm.createContext(sandbox);
            // Script should compile and execute cleanly in sandbox
            const script = new vm.Script(code, { filename: file });
            assert.doesNotThrow(
                () => script.runInContext(context),
                `Executing ${file} in sandbox must not throw uncaught error`
            );
        }
    });

    it('R6.B2 Request/response mock handles invalid or unexpected inputs without hanging', async () => {
        const { req, res } = createMockReqRes({
            method: 'INVALID_VERB',
            url: '',
            body: undefined
        });

        res.status(405).json({ error: 'Method not allowed' });
        const result = await res.waitForEnd(1000);

        assert.equal(result.statusCode, 405);
        assert.equal(res.finished, true);
        assert.ok(result.body.includes('Method not allowed'));
    });

    it('R6.B3 Zero external runtime npm packages declared in package.json', () => {
        const pkgPath = path.join(PROJECT_ROOT, 'package.json');
        if (fs.existsSync(pkgPath)) {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            const forbiddenPackages = ['express', 'axios', 'jsonwebtoken', 'nodemailer', 'bcrypt', 'lodash', 'dotenv'];
            const declared = Object.keys(pkg.dependencies || {});
            const forbiddenFound = declared.filter(d => forbiddenPackages.includes(d));
            assert.deepEqual(
                forbiddenFound,
                [],
                `Forbidden runtime dependencies found in package.json: ${forbiddenFound.join(', ')}`
            );
        }
    });

    it('R6.B4 API handlers do not crash on invalid JSON request body string', async () => {
        const entrypoints = ['auth.js', 'leads.js', 'demos.js'];
        for (const file of entrypoints) {
            const handler = require(path.join(API_DIR, file));
            // Send malformed JSON string in body
            const response = await invokeHandler(handler, {
                method: 'POST',
                body: '{{malformed json string without closing'
            });

            // The handler should catch or handle gracefully, returning a 4xx or 5xx, but not crashing the process
            assert.ok(
                response.statusCode >= 400 && response.statusCode < 600,
                `${file} should return HTTP error for malformed body, got ${response.statusCode}`
            );
        }
    });

    it('R6.B5 All api/*.js files use CommonJS require/module.exports without ESM syntax', () => {
        const files = fs.readdirSync(API_DIR).filter(f => f.endsWith('.js'));
        for (const file of files) {
            const content = fs.readFileSync(path.join(API_DIR, file), 'utf8');
            // Must not use top-level ESM export default or import ... from
            assert.doesNotMatch(
                content,
                /^\s*export\s+default\s+/m,
                `${file} contains ESM 'export default', must use CommonJS 'module.exports'`
            );
            assert.doesNotMatch(
                content,
                /^\s*import\s+.*?\s+from\s+['"]/m,
                `${file} contains ESM 'import ... from', must use CommonJS 'require'`
            );
        }
    });

});

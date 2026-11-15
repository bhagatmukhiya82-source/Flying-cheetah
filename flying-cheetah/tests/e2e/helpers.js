/**
 * E2E TEST HARNESS HELPERS
 * Lightweight, zero-dependency testing utilities for Flying Cheetah Platform.
 * Uses native Node.js built-ins (node:fs, node:path, node:crypto).
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');

const PROJECT_ROOT = path.resolve(__dirname, '../..');
const API_DIR = path.join(PROJECT_ROOT, 'api');

// List of all 24 canonical HTML pages in the project
const ALL_24_PAGES = [
    'about.html',
    'admin.html',
    'ai-voice-agents.html',
    'ctwa-automation.html',
    'customer-data-platform.html',
    'customer-support.html',
    'delivery.html',
    'demo.html',
    'email-marketing.html',
    'home.html',
    'index.html',
    'instagram-automation.html',
    'privacy-policy.html',
    'rcs-messaging.html',
    'refund-policy.html',
    'sms-marketing.html',
    'solutions.html',
    'store-automation.html',
    'store.html',
    'terms-of-service.html',
    'web-development.html',
    'whatsapp-automation.html',
    'whatsapp-calling.html',
    'whatsapp-marketing.html'
];

/**
 * Creates a mock Request and Response pair emulating Vercel / CommonJS Serverless HTTP handlers.
 */
function createMockReqRes(options = {}) {
    const rawHeaders = options.headers || {};
    const normalizedHeaders = {};
    for (const [key, val] of Object.entries(rawHeaders)) {
        normalizedHeaders[key.toLowerCase()] = String(val);
    }

    const req = {
        method: (options.method || 'GET').toUpperCase(),
        url: options.url || '/',
        headers: normalizedHeaders,
        query: options.query || {},
        body: options.body !== undefined ? options.body : null
    };

    let finishResolve;
    let finishReject;
    const finishPromise = new Promise((resolve, reject) => {
        finishResolve = resolve;
        finishReject = reject;
    });

    const res = {
        statusCode: 200,
        headers: {},
        body: '',
        finished: false,
        writableEnded: false,

        status(code) {
            this.statusCode = code;
            return this;
        },

        writeHead(code, headers = {}) {
            this.statusCode = code;
            if (headers && typeof headers === 'object') {
                for (const [k, v] of Object.entries(headers)) {
                    this.headers[k.toLowerCase()] = v;
                }
            }
            return this;
        },

        setHeader(name, value) {
            this.headers[name.toLowerCase()] = value;
            return this;
        },

        getHeader(name) {
            return this.headers[name.toLowerCase()];
        },

        json(data) {
            if (!this.getHeader('content-type')) {
                this.setHeader('content-type', 'application/json');
            }
            const payload = typeof data === 'string' ? data : JSON.stringify(data);
            return this.end(payload);
        },

        send(data) {
            const payload = typeof data === 'object' && data !== null ? JSON.stringify(data) : String(data);
            return this.end(payload);
        },

        end(chunk) {
            if (this.finished) return this;
            if (chunk !== undefined && chunk !== null) {
                this.body += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
            }
            this.finished = true;
            this.writableEnded = true;
            finishResolve({
                statusCode: this.statusCode,
                headers: { ...this.headers },
                body: this.body
            });
            return this;
        },

        waitForEnd(timeoutMs = 4000) {
            const timeoutPromise = new Promise((_, reject) => {
                const timer = setTimeout(() => {
                    reject(new Error(`Serverless handler timed out after ${timeoutMs}ms without calling res.end()`));
                }, timeoutMs);
                timer.unref?.();
            });
            return Promise.race([finishPromise, timeoutPromise]);
        }
    };

    return { req, res, finishPromise };
}

/**
 * Invokes a serverless CommonJS handler safely with mock request/response.
 */
async function invokeHandler(handler, options = {}, timeoutMs = 8000) {
    const { req, res } = createMockReqRes(options);
    try {
        const handlerPromise = Promise.resolve(handler(req, res));
        // If the handler directly returned an object with statusCode (micro-style)
        const returnedResult = await Promise.race([
            handlerPromise,
            res.waitForEnd(timeoutMs).catch(() => null)
        ]);

        if (res.finished) {
            let json = null;
            try {
                json = JSON.parse(res.body);
            } catch (_) {}
            return {
                statusCode: res.statusCode,
                headers: res.headers,
                body: res.body,
                json
            };
        }

        if (returnedResult && typeof returnedResult === 'object' && returnedResult.statusCode) {
            let json = null;
            try {
                json = JSON.parse(returnedResult.body);
            } catch (_) {}
            return {
                statusCode: returnedResult.statusCode,
                headers: returnedResult.headers || {},
                body: returnedResult.body || '',
                json
            };
        }

        const endResult = await res.waitForEnd(timeoutMs);
        let json = null;
        try {
            json = JSON.parse(endResult.body);
        } catch (_) {}
        return {
            statusCode: endResult.statusCode,
            headers: endResult.headers,
            body: endResult.body,
            json
        };
    } catch (err) {
        throw new Error(`Handler execution failed: ${err.message}`);
    }
}

/**
 * Sandboxes process.env modifications for the duration of a callback.
 */
async function withEnv(tempEnv, fn) {
    const originalEnv = { ...process.env };
    try {
        for (const [k, v] of Object.entries(tempEnv)) {
            if (v === undefined || v === null) {
                delete process.env[k];
            } else {
                process.env[k] = String(v);
            }
        }
        return await fn();
    } finally {
        process.env = originalEnv;
    }
}

/**
 * Static HTML Parsing & Inspection Utilities
 */
function readHtmlPage(pageName) {
    const fullPath = path.isAbsolute(pageName) ? pageName : path.join(PROJECT_ROOT, pageName);
    return fs.readFileSync(fullPath, 'utf8');
}

function getAllHtmlPages() {
    return ALL_24_PAGES;
}

function parseMetaTags(html) {
    const metaTagRegex = /<meta\s+([^>]*?)>/gi;
    const attrRegex = /([a-zA-Z0-9_\-:]+)=["']([^"']*)["']/gi;
    const tags = [];

    let match;
    while ((match = metaTagRegex.exec(html)) !== null) {
        const rawAttrs = match[1];
        const tag = {};
        let attrMatch;
        while ((attrMatch = attrRegex.exec(rawAttrs)) !== null) {
            tag[attrMatch[1].toLowerCase()] = attrMatch[2];
        }
        tags.push(tag);
    }
    return tags;
}

function getOgTags(html) {
    const tags = parseMetaTags(html);
    const og = {};
    for (const tag of tags) {
        if (tag.property && tag.property.toLowerCase().startsWith('og:')) {
            og[tag.property.toLowerCase()] = tag.content || '';
        }
    }
    return og;
}

function hasViewportMeta(html) {
    const tags = parseMetaTags(html);
    return tags.some((t) => {
        return t.name === 'viewport' && t.content && t.content.includes('width=device-width');
    });
}

function extractHeader(html) {
    const headerMatch = html.match(/<header[\s\S]*?<\/header>/i);
    return headerMatch ? headerMatch[0] : '';
}

function getHeaderCtaButtons(html) {
    const header = extractHeader(html);
    if (!header) return [];
    // Remove desktop <nav>...</nav> container so we only inspect primary action buttons in the header action bar
    const headerWithoutNav = header.replace(/<nav[\s\S]*?<\/nav>/gi, '');
    const btnRegex = /<(a|button)\s+([^>]*?)>([\s\S]*?)<\/\1>/gi;
    const ctas = [];
    let match;
    while ((match = btnRegex.exec(headerWithoutNav)) !== null) {
        const rawAttrs = match[2];
        const text = match[3].replace(/<[^>]+>/g, '').trim();
        const classMatch = rawAttrs.match(/class=["']([^"']*)["']/i);
        const hrefMatch = rawAttrs.match(/href=["']([^"']*)["']/i);
        const idMatch = rawAttrs.match(/id=["']([^"']*)["']/i);
        ctas.push({
            tag: match[1],
            classes: classMatch ? classMatch[1] : '',
            href: hrefMatch ? hrefMatch[1] : '',
            id: idMatch ? idMatch[1] : '',
            text,
            raw: match[0]
        });
    }
    return ctas;
}

function findUndefinedTemplateVariables(html) {
    const staticHtml = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
    const regex = /\$\{([a-zA-Z0-9_]+)\}/g;
    const found = [];
    let match;
    while ((match = regex.exec(staticHtml)) !== null) {
        found.push({ variable: match[1], match: match[0], index: match.index });
    }
    return found;
}

function extractAnchorIds(html) {
    const idRegex = /\bid=["']([^"']+)["']/gi;
    const ids = new Set();
    let match;
    while ((match = idRegex.exec(html)) !== null) {
        ids.add(match[1]);
    }
    return ids;
}

function extractLinks(html) {
    const linkRegex = /<a\s+([^>]*?)href=["']([^"']*)["']([^>]*?)>([\s\S]*?)<\/a>/gi;
    const links = [];
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
        const href = match[2];
        const innerText = match[4].replace(/<[^>]+>/g, '').trim();
        links.push({ href, text: innerText, raw: match[0] });
    }
    return links;
}

function extractImages(html) {
    const imgRegex = /<img\s+([^>]*?)>/gi;
    const images = [];
    let match;
    while ((match = imgRegex.exec(html)) !== null) {
        const rawAttrs = match[1];
        const srcMatch = rawAttrs.match(/src=["']([^"']*)["']/i);
        const altMatch = rawAttrs.match(/alt=["']([^"']*)["']/i);
        images.push({
            src: srcMatch ? srcMatch[1] : '',
            alt: altMatch ? altMatch[1] : '',
            raw: match[0]
        });
    }
    return images;
}

/**
 * .vercelignore Inspection
 */
function readVercelIgnore() {
    const ignorePath = path.join(PROJECT_ROOT, '.vercelignore');
    if (!fs.existsSync(ignorePath)) return [];
    return fs.readFileSync(ignorePath, 'utf8')
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#'));
}

/**
 * sitemap.xml Inspection
 */
function parseSitemap() {
    const sitemapPath = path.join(PROJECT_ROOT, 'sitemap.xml');
    if (!fs.existsSync(sitemapPath)) return { exists: false, urls: [] };
    const content = fs.readFileSync(sitemapPath, 'utf8');

    const urls = [];
    const urlBlockRegex = /<url>([\s\S]*?)<\/url>/gi;
    let blockMatch;
    while ((blockMatch = urlBlockRegex.exec(content)) !== null) {
        const block = blockMatch[1];
        const locMatch = block.match(/<loc>([^<]+)<\/loc>/i);
        const lastmodMatch = block.match(/<lastmod>([^<]+)<\/lastmod>/i);
        const changefreqMatch = block.match(/<changefreq>([^<]+)<\/changefreq>/i);
        const priorityMatch = block.match(/<priority>([^<]+)<\/priority>/i);
        urls.push({
            loc: locMatch ? locMatch[1].trim() : '',
            lastmod: lastmodMatch ? lastmodMatch[1].trim() : '',
            changefreq: changefreqMatch ? changefreqMatch[1].trim() : '',
            priority: priorityMatch ? priorityMatch[1].trim() : ''
        });
    }
    return { exists: true, content, urls };
}

/**
 * Scans files in a directory against a regex
 */
function scanDirForRegex(dirPath, regex, fileFilter = (f) => f.endsWith('.js')) {
    if (!fs.existsSync(dirPath)) return [];
    const results = [];
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
        const fullPath = path.join(dirPath, file);
        const stat = fs.statSync(fullPath);
        if (stat.isFile() && fileFilter(file)) {
            const content = fs.readFileSync(fullPath, 'utf8');
            let m;
            const re = new RegExp(regex.source, regex.flags);
            while ((m = re.exec(content)) !== null) {
                results.push({ file, match: m[0], line: content.slice(0, m.index).split('\n').length });
            }
        }
    }
    return results;
}

/**
 * Parses all Schema.org JSON-LD scripts (<script type="application/ld+json">) in HTML.
 * Returns an array of parsed JSON objects. If JSON is invalid, captures error with __invalid: true.
 */
function parseJsonLd(html) {
    if (!html || typeof html !== 'string') return [];
    const scriptRegex = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    const results = [];
    let match;
    while ((match = scriptRegex.exec(html)) !== null) {
        const raw = match[1].trim();
        if (!raw) continue;
        try {
            const data = JSON.parse(raw);
            results.push(data);
        } catch (err) {
            results.push({
                __invalid: true,
                __error: err.message,
                __raw: raw
            });
        }
    }
    return results;
}

/**
 * Detects whether HTML page includes runtime Tailwind Play CDN script.
 */
function checkTailwindCdn(html) {
    if (!html || typeof html !== 'string') return false;
    return /<script\b[^>]*src=["'][^"']*cdn\.tailwindcss\.com[^"']*["'][^>]*>/i.test(html) ||
           /cdn\.tailwindcss\.com/i.test(html);
}

/**
 * Detects whether HTML page links to compiled production stylesheet (css/styles.min.css).
 */
function checkCompiledCssLink(html) {
    if (!html || typeof html !== 'string') return false;
    return /<link\b[^>]*rel=["']stylesheet["'][^>]*href=["'][^"']*styles\.min\.css["'][^>]*>/i.test(html) ||
           /<link\b[^>]*href=["'][^"']*styles\.min\.css["'][^>]*rel=["']stylesheet["'][^>]*>/i.test(html) ||
           /href=["'][^"']*css\/styles\.min\.css["']/i.test(html);
}

/**
 * Reads and parses vercel.json configuration.
 * Returns { exists, config: { redirects, headers, rewrites, ... }, raw }
 */
function readVercelConfig() {
    const configPath = path.join(PROJECT_ROOT, 'vercel.json');
    if (!fs.existsSync(configPath)) {
        return { exists: false, config: {}, raw: '' };
    }
    try {
        const raw = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(raw);
        return { exists: true, config, raw };
    } catch (err) {
        return { exists: true, config: {}, raw: '', error: err.message };
    }
}

/**
 * Reads and parses .env.example configuration template.
 * Returns { exists, content, variables: string[] }
 */
function readEnvExample() {
    const envPath = path.join(PROJECT_ROOT, '.env.example');
    if (!fs.existsSync(envPath)) {
        return { exists: false, content: '', variables: [] };
    }
    const content = fs.readFileSync(envPath, 'utf8');
    const variables = [];
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
            const varName = trimmed.slice(0, eqIdx).trim();
            if (varName && !variables.includes(varName)) {
                variables.push(varName);
            }
        }
    }
    return { exists: true, content, variables };
}

/**
 * Reads and parses .gitignore rules.
 * Supports customPath or defaults to flying-cheetah/.gitignore.
 * Returns Array of active rules (with .exists, .rules, and .raw attached).
 */
function readGitIgnore(customPath) {
    const targetPath = customPath
        ? (path.isAbsolute(customPath) ? customPath : path.resolve(PROJECT_ROOT, customPath))
        : path.join(PROJECT_ROOT, '.gitignore');
    if (!fs.existsSync(targetPath)) {
        const empty = [];
        empty.exists = false;
        empty.rules = [];
        empty.raw = '';
        return empty;
    }
    const raw = fs.readFileSync(targetPath, 'utf8');
    const rules = raw
        .split(/\r?\n/)
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#'));
    rules.exists = true;
    rules.rules = rules;
    rules.raw = raw;
    return rules;
}

/**
 * Computes uppercase SHA-256 hex digest of file on disk.
 */
function getFileSha256(filePath) {
    const resolved = path.isAbsolute(filePath) ? filePath : path.join(PROJECT_ROOT, filePath);
    if (!fs.existsSync(resolved)) return null;
    const buf = fs.readFileSync(resolved);
    return crypto.createHash('sha256').update(buf).digest('hex').toUpperCase();
}

/**
 * Detects presence of FC_LEADS.openAuditModal calls or modal trigger buttons in HTML.
 */
function extractLeadAuditCTAs(html) {
    if (!html || typeof html !== 'string') {
        const empty = [];
        empty.hasModalCall = false;
        empty.count = 0;
        return empty;
    }
    const regex = /(?:window\.)?FC_LEADS\.openAuditModal\s*\(\s*(['"]([^'"]*)['"])?\s*\)/gi;
    const ctas = [];
    let match;
    while ((match = regex.exec(html)) !== null) {
        ctas.push({
            call: match[0],
            service: match[2] || '',
            index: match.index
        });
    }
    ctas.hasModalCall = ctas.length > 0;
    ctas.count = ctas.length;
    return ctas;
}

/**
 * Executes client auth scripts in a sandboxed Node vm browser context
 * to evaluate window.FC_AUTH facade and its exported public methods.
 */
function evaluateAuthFacade(codeOrPath) {
    let code = '';
    const submodulesToLoad = [];

    if (!codeOrPath) {
        const authDir = path.join(PROJECT_ROOT, 'js/auth');
        if (fs.existsSync(authDir)) {
            const potentialSubmodules = ['auth-validation.js', 'auth-profile.js', 'auth-core.js', 'auth-modal.js'];
            for (const sub of potentialSubmodules) {
                const subPath = path.join(authDir, sub);
                if (fs.existsSync(subPath)) {
                    submodulesToLoad.push(fs.readFileSync(subPath, 'utf8'));
                }
            }
        }
        const defaultPath = path.join(PROJECT_ROOT, 'js/auth.js');
        if (fs.existsSync(defaultPath)) {
            code = fs.readFileSync(defaultPath, 'utf8');
        }
    } else if (typeof codeOrPath === 'string') {
        const potentialPath = path.isAbsolute(codeOrPath) ? codeOrPath : path.join(PROJECT_ROOT, codeOrPath);
        if (fs.existsSync(potentialPath) && fs.statSync(potentialPath).isFile()) {
            code = fs.readFileSync(potentialPath, 'utf8');
        } else {
            code = codeOrPath;
        }
    }

    const storage = {};
    const localStorageMock = {
        getItem: (k) => (Object.prototype.hasOwnProperty.call(storage, k) ? storage[k] : null),
        setItem: (k, v) => { storage[k] = String(v); },
        removeItem: (k) => { delete storage[k]; },
        clear: () => { for (const k of Object.keys(storage)) delete storage[k]; }
    };

    const mockClient = {
        auth: {
            getUser: () => Promise.resolve({ data: { user: null }, error: null }),
            getSession: () => Promise.resolve({ data: { session: null }, error: null }),
            signInWithPassword: () => Promise.resolve({ data: {}, error: null }),
            signUp: () => Promise.resolve({ data: {}, error: null }),
            signOut: () => Promise.resolve({ error: null })
        },
        from: () => ({
            select: () => ({
                eq: () => ({
                    single: () => Promise.resolve({ data: null, error: null }),
                    order: () => Promise.resolve({ data: [], error: null })
                })
            }),
            insert: () => Promise.resolve({ data: null, error: null }),
            update: () => Promise.resolve({ data: null, error: null })
        })
    };

    function CustomEventClass(name, opts) {
        this.name = name;
        this.type = name;
        this.detail = opts ? opts.detail : null;
    }
    function EventClass(name) {
        this.name = name;
        this.type = name;
    }

    const mockWindow = {
        localStorage: localStorageMock,
        sessionStorage: localStorageMock,
        location: { href: 'https://flying-cheetah.vercel.app/', origin: 'https://flying-cheetah.vercel.app', search: '', hostname: 'flying-cheetah.vercel.app', port: '' },
        navigator: { userAgent: 'NodeTest/1.0' },
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
        CustomEvent: CustomEventClass,
        Event: EventClass,
        FC_BACKEND: { getClient: () => mockClient },
        console: { ...console, log: () => {}, warn: () => {}, error: () => {} },
        setTimeout: (fn) => setTimeout(fn, 0),
        clearTimeout: clearTimeout,
        setInterval: (fn) => setInterval(fn, 1000),
        clearInterval: clearInterval,
        requestAnimationFrame: (cb) => setTimeout(cb, 0),
        cancelAnimationFrame: clearTimeout
    };
    mockWindow.window = mockWindow;

    const mockDocument = {
        readyState: 'complete',
        addEventListener: () => {},
        removeEventListener: () => {},
        getElementById: () => null,
        querySelector: () => null,
        querySelectorAll: () => [],
        createElement: () => ({
            setAttribute: () => {},
            appendChild: () => {},
            remove: () => {},
            style: {},
            classList: { add: () => {}, remove: () => {}, contains: () => false }
        }),
        body: { appendChild: () => {}, querySelector: () => null }
    };
    mockWindow.document = mockDocument;

    const sandbox = {
        window: mockWindow,
        document: mockDocument,
        localStorage: localStorageMock,
        sessionStorage: localStorageMock,
        CustomEvent: CustomEventClass,
        Event: EventClass,
        currentUser: null,
        currentProfile: null,
        activeTab: 'trial',
        console: mockWindow.console,
        setTimeout: mockWindow.setTimeout,
        clearTimeout: mockWindow.clearTimeout,
        setInterval: mockWindow.setInterval,
        clearInterval: mockWindow.clearInterval,
        requestAnimationFrame: mockWindow.requestAnimationFrame,
        cancelAnimationFrame: mockWindow.cancelAnimationFrame
    };

    const context = vm.createContext(sandbox);
    try {
        vm.runInContext('var currentUser = null; var currentProfile = null; var activeTab = "trial";', context);
    } catch (_) {}

    for (const subCode of submodulesToLoad) {
        try {
            vm.runInContext(subCode, context, { timeout: 2000 });
        } catch (err) {
            mockWindow.__evalSubError = err;
        }
    }

    if (code) {
        try {
            vm.runInContext(code, context, { timeout: 2000 });
        } catch (err) {
            mockWindow.__evalError = err;
        }
    }

    const facade = mockWindow.FC_AUTH || {};
    facade.window = mockWindow;
    facade.FC_AUTH = mockWindow.FC_AUTH;
    facade.localStorage = localStorageMock;
    return facade;
}

module.exports = {
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
};

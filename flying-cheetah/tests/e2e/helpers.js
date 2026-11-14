/**
 * E2E TEST HARNESS HELPERS
 * Lightweight, zero-dependency testing utilities for Flying Cheetah Platform.
 * Uses native Node.js built-ins (node:fs, node:path, node:crypto).
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

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
async function invokeHandler(handler, options = {}, timeoutMs = 4000) {
    const { req, res } = createMockReqRes(options);
    try {
        const handlerPromise = Promise.resolve(handler(req, res));
        // If the handler directly returned an object with statusCode (micro-style)
        const returnedResult = await Promise.race([
            handlerPromise,
            res.waitForEnd(timeoutMs).catch((err) => {
                return null;
            })
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

        const endResult = await res.waitForEnd(1000);
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
    scanDirForRegex
};

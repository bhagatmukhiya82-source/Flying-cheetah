#!/usr/bin/env node
'use strict';

/**
 * Flying Cheetah Automation Pages — Zero-Dependency Headless Chrome CDP E2E Suite
 *
 * Implements TEST_INFRA.md Tiers 1–4 across all 7 automation pages and 3 viewports
 * (1440x900, 1280x800, 390x844) using Node v24 built-ins + native WebSocket + Chrome CDP.
 *
 * Exit codes:
 *   0 — All executed checks passed (failedChecks === 0)
 *   1 — One or more E2E assertions failed (failedChecks > 0)
 *   2 — Fatal infrastructure or CLI error
 */

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { spawn } = require('node:child_process');

const ROOT_DIR = path.resolve(__dirname, '..');

const TARGET_PAGES = [
  'store-automation.html',
  'whatsapp-automation.html',
  'instagram-automation.html',
  'ctwa-automation.html',
  'ai-voice-agents.html',
  'customer-data-platform.html',
  'delivery.html'
];

const DEFAULT_VIEWPORTS = [
  { name: '1440x900', width: 1440, height: 900, deviceScaleFactor: 1, mobile: false },
  { name: '1280x800', width: 1280, height: 800, deviceScaleFactor: 1, mobile: false },
  { name: '390x844', width: 390, height: 844, deviceScaleFactor: 2, mobile: true }
];

const DEFAULT_TIMEOUT_MS = 15000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.xml': 'application/xml; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8'
};

class CliError extends Error {
  constructor(message) {
    super(message);
    this.name = 'CliError';
  }
}

class InfraError extends Error {
  constructor(message) {
    super(message);
    this.name = 'InfraError';
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function printHelp() {
  const helpText = `
Flying Cheetah Automation Pages — Headless Chrome CDP E2E Suite

Usage:
  node tests/e2e_automation_cdp.js [options]

Options:
  --page=<list>, --pages=<list>         Comma-separated target HTML pages or slugs
                                        (default: all 7 automation pages)
  --viewport=<list>, --viewports=<list> Comma-separated WxH viewports
                                        (default: 1440x900,1280x800,390x844)
  --tier=<list>, --tiers=<list>         Comma-separated tiers (1,2,3,4 or all)
                                        (default: all)
  --json                                Print single structured JSON report to stdout
  --fail-fast                           Abort immediately on first failed check
  --timeout=<ms>                        Navigation & CDP command timeout (default: ${DEFAULT_TIMEOUT_MS})
  --chrome=<path>                       Override Chrome executable path
  --offline-ignore-cdn                  Ignore network errors/4xx+ for non-127.0.0.1 URLs
  --help, -h                            Show this help message and exit 0

Target Pages:
  ${TARGET_PAGES.join(', ')}

Exit Codes:
  0  All executed checks passed
  1  One or more E2E checks failed
  2  Infrastructure or CLI argument error
`.trimStart();
  process.stdout.write(helpText);
}

function parseCliArgs(argv) {
  const opts = {
    pages: [...TARGET_PAGES],
    viewports: DEFAULT_VIEWPORTS.map((v) => ({ ...v })),
    tiers: new Set([1, 2, 3, 4]),
    json: false,
    failFast: false,
    timeoutMs: DEFAULT_TIMEOUT_MS,
    chromePath: null,
    offlineIgnoreCdn: false,
    help: false
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      opts.help = true;
      return opts;
    }
    if (arg === '--json') {
      opts.json = true;
      continue;
    }
    if (arg === '--fail-fast') {
      opts.failFast = true;
      continue;
    }
    if (arg === '--offline-ignore-cdn') {
      opts.offlineIgnoreCdn = true;
      continue;
    }

    let key = null;
    let val = null;
    const eqIdx = arg.indexOf('=');
    if (arg.startsWith('--') && eqIdx !== -1) {
      key = arg.slice(2, eqIdx);
      val = arg.slice(eqIdx + 1);
    } else if (arg.startsWith('--')) {
      key = arg.slice(2);
      if (i + 1 >= argv.length || argv[i + 1].startsWith('--')) {
        throw new CliError(`Flag --${key} requires a value`);
      }
      val = argv[++i];
    } else {
      throw new CliError(`Unknown positional argument: ${arg}`);
    }

    switch (key) {
      case 'page':
      case 'pages': {
        const items = val.split(',').map((s) => s.trim()).filter(Boolean);
        if (items.length === 0) throw new CliError(`--${key} cannot be empty`);
        const resolved = [];
        for (const item of items) {
          const normalized = item.endsWith('.html') ? item : `${item}.html`;
          if (!TARGET_PAGES.includes(normalized)) {
            throw new CliError(`Unknown automation page "${item}". Valid: ${TARGET_PAGES.join(', ')}`);
          }
          if (!resolved.includes(normalized)) resolved.push(normalized);
        }
        opts.pages = resolved;
        break;
      }
      case 'viewport':
      case 'viewports': {
        const items = val.split(',').map((s) => s.trim()).filter(Boolean);
        if (items.length === 0) throw new CliError(`--${key} cannot be empty`);
        const parsed = [];
        for (const item of items) {
          const m = item.match(/^(\d+)x(\d+)$/i);
          if (!m) {
            throw new CliError(`Invalid viewport "${item}". Expected WxH (e.g. 1440x900)`);
          }
          const width = parseInt(m[1], 10);
          const height = parseInt(m[2], 10);
          if (width < 200 || height < 200) {
            throw new CliError(`Viewport "${item}" is too small`);
          }
          const preset = DEFAULT_VIEWPORTS.find((v) => v.width === width && v.height === height);
          const vp = preset
            ? { ...preset }
            : { name: `${width}x${height}`, width, height, deviceScaleFactor: width < 768 ? 2 : 1, mobile: width < 768 };
          if (!parsed.some((p) => p.name === vp.name)) parsed.push(vp);
        }
        opts.viewports = parsed;
        break;
      }
      case 'tier':
      case 'tiers': {
        const items = val.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
        if (items.length === 0) throw new CliError(`--${key} cannot be empty`);
        if (items.includes('all')) {
          opts.tiers = new Set([1, 2, 3, 4]);
        } else {
          const set = new Set();
          for (const item of items) {
            const num = Number(item);
            if (!Number.isInteger(num) || num < 1 || num > 4) {
              throw new CliError(`Invalid tier "${item}". Valid: 1, 2, 3, 4, or all`);
            }
            set.add(num);
          }
          opts.tiers = set;
        }
        break;
      }
      case 'timeout': {
        const ms = Number(val);
        if (!Number.isFinite(ms) || ms < 1000) {
          throw new CliError(`Invalid --timeout value "${val}". Must be >= 1000 ms`);
        }
        opts.timeoutMs = Math.floor(ms);
        break;
      }
      case 'chrome': {
        if (!val.trim()) throw new CliError('--chrome cannot be empty');
        opts.chromePath = val.trim();
        break;
      }
      default:
        throw new CliError(`Unknown flag: --${key}`);
    }
  }

  return opts;
}

function resolveChromeBinary(overridePath) {
  const candidates = [
    overridePath,
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  ].filter(Boolean);

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new InfraError(
    `Chrome binary not found. Checked: ${candidates.join(', ')}. Use --chrome=<path> or CHROME_PATH.`
  );
}

/**
 * Local static HTTP server supporting cleanUrls, /home redirect, full MIME map,
 * HEAD requests, and HTTP 206 Byte Range responses for <video>.
 */
function startStaticServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const method = (req.method || 'GET').toUpperCase();
        if (method !== 'GET' && method !== 'HEAD') {
          res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
          res.end(JSON.stringify({ error: 'Not found' }));
          return;
        }

        const parsedUrl = new URL(req.url || '/', 'http://127.0.0.1');
        let reqPath = decodeURIComponent(parsedUrl.pathname);

        // Redirects matching vercel.json
        if (reqPath === '/home' || reqPath === '/home.html') {
          res.writeHead(301, { Location: '/' });
          res.end();
          return;
        }

        if (reqPath === '/') reqPath = '/index.html';

        const relPath = reqPath.replace(/^\/+/, '');
        let filePath = path.resolve(ROOT_DIR, relPath);

        // Path traversal guard
        if (filePath !== ROOT_DIR && !filePath.startsWith(ROOT_DIR + path.sep)) {
          res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('403 Forbidden');
          return;
        }

        // cleanUrls resolution matching vercel.json
        if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
          if (!path.extname(filePath)) {
            const htmlCandidate = `${filePath}.html`;
            if (fs.existsSync(htmlCandidate) && fs.statSync(htmlCandidate).isFile()) {
              filePath = htmlCandidate;
            } else if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
              const idxCandidate = path.join(filePath, 'index.html');
              if (fs.existsSync(idxCandidate) && fs.statSync(idxCandidate).isFile()) {
                filePath = idxCandidate;
              }
            }
          }
        }

        if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('404 Not Found');
          return;
        }

        const stat = fs.statSync(filePath);
        const totalSize = stat.size;
        const ext = path.extname(filePath).toLowerCase();
        const contentType = MIME_TYPES[ext] || 'application/octet-stream';

        const baseHeaders = {
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'no-store'
        };

        const rangeHeader = req.headers.range;
        if (rangeHeader && /^bytes=/i.test(rangeHeader)) {
          const spec = rangeHeader.replace(/^bytes=/i, '').split(',')[0].trim();
          const [startStr, endStr] = spec.split('-');
          let start = startStr === '' ? NaN : parseInt(startStr, 10);
          let end = endStr === '' ? NaN : parseInt(endStr, 10);

          if (Number.isNaN(start) && !Number.isNaN(end)) {
            start = Math.max(0, totalSize - end);
            end = totalSize - 1;
          } else if (!Number.isNaN(start) && Number.isNaN(end)) {
            end = totalSize - 1;
          }

          if (
            Number.isNaN(start) ||
            Number.isNaN(end) ||
            start < 0 ||
            end >= totalSize ||
            start > end
          ) {
            res.writeHead(416, { 'Content-Range': `bytes */${totalSize}` });
            res.end();
            return;
          }

          const chunkSize = end - start + 1;
          res.writeHead(206, {
            ...baseHeaders,
            'Content-Range': `bytes ${start}-${end}/${totalSize}`,
            'Content-Length': String(chunkSize)
          });

          if (method === 'HEAD') {
            res.end();
            return;
          }
          fs.createReadStream(filePath, { start, end }).pipe(res);
          return;
        }

        res.writeHead(200, {
          ...baseHeaders,
          'Content-Length': String(totalSize)
        });
        if (method === 'HEAD') {
          res.end();
          return;
        }
        fs.createReadStream(filePath).pipe(res);
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end(`500 Internal Server Error: ${err.message}`);
      }
    });

    server.on('error', (err) => reject(new InfraError(`HTTP server error: ${err.message}`)));
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({ server, port: addr.port });
    });
  });
}

class CdpClient {
  constructor(wsUrl, defaultTimeoutMs = DEFAULT_TIMEOUT_MS) {
    this.wsUrl = wsUrl;
    this.defaultTimeoutMs = defaultTimeoutMs;
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = new Map();
    this.closed = false;
    this.ws = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.wsUrl);
      this.ws = ws;
      let settled = false;

      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          try { ws.close(); } catch {}
          reject(new InfraError(`Timed out connecting CDP WebSocket: ${this.wsUrl}`));
        }
      }, this.defaultTimeoutMs);

      ws.addEventListener('open', () => {
        clearTimeout(timer);
        if (!settled) {
          settled = true;
          resolve(this);
        }
      });

      ws.addEventListener('message', (event) => {
        let msg;
        try {
          msg = JSON.parse(String(event.data));
        } catch {
          return;
        }
        if (typeof msg.id === 'number') {
          const entry = this.pending.get(msg.id);
          if (!entry) return;
          this.pending.delete(msg.id);
          clearTimeout(entry.timer);
          if (msg.error) {
            entry.reject(new Error(`CDP ${entry.method} error (${msg.error.code}): ${msg.error.message}`));
          } else {
            entry.resolve(msg.result);
          }
          return;
        }
        if (msg.method) {
          const handlers = this.listeners.get(msg.method);
          if (handlers) {
            for (const fn of [...handlers]) {
              try { fn(msg.params || {}); } catch {}
            }
          }
        }
      });

      const failPending = (reason) => {
        this.closed = true;
        for (const [id, entry] of this.pending.entries()) {
          clearTimeout(entry.timer);
          entry.reject(new InfraError(reason));
          this.pending.delete(id);
        }
      };

      ws.addEventListener('error', (err) => {
        clearTimeout(timer);
        const msg = err?.message || 'CDP WebSocket error';
        if (!settled) {
          settled = true;
          reject(new InfraError(msg));
        }
        failPending(msg);
      });

      ws.addEventListener('close', () => {
        clearTimeout(timer);
        if (!settled) {
          settled = true;
          reject(new InfraError(`CDP WebSocket closed before opening: ${this.wsUrl}`));
        }
        failPending('CDP WebSocket closed unexpectedly');
      });
    });
  }

  on(method, handler) {
    if (!this.listeners.has(method)) this.listeners.set(method, new Set());
    this.listeners.get(method).add(handler);
    return () => this.off(method, handler);
  }

  off(method, handler) {
    const set = this.listeners.get(method);
    if (set) set.delete(handler);
  }

  send(method, params = {}, timeoutMs = this.defaultTimeoutMs) {
    if (this.closed || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new InfraError(`Cannot send CDP ${method}: WebSocket is not open`));
    }
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id);
          reject(new InfraError(`CDP ${method} timed out after ${timeoutMs}ms`));
        }
      }, timeoutMs);

      this.pending.set(id, { resolve, reject, timer, method });
      try {
        this.ws.send(JSON.stringify({ id, method, params }));
      } catch (err) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(new InfraError(`CDP send failed for ${method}: ${err.message}`));
      }
    });
  }

  async evaluate(expression, awaitPromise = false) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise
    });
    if (res && res.exceptionDetails) {
      const txt = res.exceptionDetails.exception?.description || res.exceptionDetails.text || 'Evaluation error';
      throw new Error(`Browser eval exception: ${txt}`);
    }
    return res?.result?.value;
  }

  async close() {
    this.closed = true;
    for (const [id, entry] of this.pending.entries()) {
      clearTimeout(entry.timer);
      entry.reject(new InfraError('CDP client closing'));
      this.pending.delete(id);
    }
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      try { this.ws.close(); } catch {}
    }
  }
}

async function launchChrome(chromePath, timeoutMs) {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fc-e2e-cdp-'));
  const args = [
    '--headless=new',
    '--remote-debugging-port=0',
    '--remote-allow-origins=*',
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--no-first-run',
    '--no-default-browser-check',
    '--mute-audio',
    `--user-data-dir=${userDataDir}`,
    'about:blank'
  ];

  const proc = spawn(chromePath, args, { stdio: ['ignore', 'pipe', 'pipe'] });

  let browserWsUrl = null;
  let stderrBuf = '';

  const exitPromise = new Promise((resolve) => {
    proc.once('close', (code, signal) => resolve({ code, signal }));
  });

  try {
    browserWsUrl = await new Promise((resolve, reject) => {
      let done = false;
      const timer = setTimeout(() => {
        if (done) return;
        // Fallback: check DevToolsActivePort file in userDataDir
        const activePortPath = path.join(userDataDir, 'DevToolsActivePort');
        if (fs.existsSync(activePortPath)) {
          try {
            const lines = fs.readFileSync(activePortPath, 'utf8').trim().split(/\r?\n/);
            if (lines.length >= 2) {
              done = true;
              resolve(`ws://127.0.0.1:${lines[0].trim()}${lines[1].trim()}`);
              return;
            }
          } catch {}
        }
        done = true;
        reject(new InfraError(`Chrome failed to emit DevTools WS URL within ${timeoutMs}ms. stderr:\n${stderrBuf}`));
      }, timeoutMs);

      const onData = (chunk) => {
        stderrBuf += chunk.toString('utf8');
        const m = stderrBuf.match(/DevTools listening on (ws:\/\/[^\s\r\n]+)/);
        if (m && !done) {
          done = true;
          clearTimeout(timer);
          resolve(m[1]);
        }
      };

      proc.stderr.on('data', onData);
      proc.once('error', (err) => {
        if (!done) {
          done = true;
          clearTimeout(timer);
          reject(new InfraError(`Failed to spawn Chrome: ${err.message}`));
        }
      });
      proc.once('exit', (code) => {
        if (!done) {
          done = true;
          clearTimeout(timer);
          reject(new InfraError(`Chrome exited prematurely with code ${code}. stderr:\n${stderrBuf}`));
        }
      });
    });

    const parsedWs = new URL(browserWsUrl);
    const cdpPort = parsedWs.port;

    const targetRes = await fetch(`http://127.0.0.1:${cdpPort}/json/new?about:blank`, { method: 'PUT' });
    if (!targetRes.ok) {
      throw new InfraError(`Failed to create Chrome page target: HTTP ${targetRes.status}`);
    }
    const targetInfo = await targetRes.json();
    if (!targetInfo.webSocketDebuggerUrl) {
      throw new InfraError('Chrome /json/new did not return webSocketDebuggerUrl');
    }

    const pageCdp = await new CdpClient(targetInfo.webSocketDebuggerUrl, timeoutMs).connect();

    return {
      proc,
      userDataDir,
      cdpPort,
      browserWsUrl,
      pageCdp,
      exitPromise
    };
  } catch (err) {
    await cleanupChrome({ proc, userDataDir, browserWsUrl, pageCdp: null, exitPromise });
    throw err;
  }
}

async function cleanupChrome(ctx) {
  if (!ctx) return;
  const { proc, userDataDir, browserWsUrl, pageCdp, exitPromise } = ctx;

  if (pageCdp) {
    try { await pageCdp.close(); } catch {}
  }

  if (browserWsUrl) {
    let browserClient = null;
    try {
      browserClient = await new CdpClient(browserWsUrl, 2000).connect();
      await browserClient.send('Browser.close', {}, 2000);
    } catch {
      // Ignore if Chrome is already closing
    } finally {
      if (browserClient) {
        try { await browserClient.close(); } catch {}
      }
    }
  }

  if (proc && proc.pid && proc.exitCode === null && proc.signalCode === null) {
    const exited = await Promise.race([
      exitPromise || new Promise((r) => proc.once('close', r)),
      sleep(4000).then(() => false)
    ]);

    if (exited === false && proc.exitCode === null) {
      if (process.platform === 'win32') {
        await new Promise((resolve) => {
          const killer = spawn('taskkill', ['/PID', String(proc.pid), '/T', '/F'], { stdio: 'ignore' });
          killer.once('close', resolve);
          killer.once('error', resolve);
        });
      } else {
        try { proc.kill('SIGKILL'); } catch {}
      }
      await Promise.race([
        exitPromise || new Promise((r) => proc.once('close', r)),
        sleep(2000)
      ]);
    }
  }

  // Allow Windows Chrome child processes (utility/crashpad) to finish exiting
  await sleep(250);

  if (userDataDir && fs.existsSync(userDataDir)) {
    try {
      fs.rmSync(userDataDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 150 });
    } catch {
      // Best-effort final attempt
    }
  }
}

// =============================================================================
// Browser-Side Shared Utilities & Audit Algorithms (per Explorers 2 & 3)
// =============================================================================

const BROWSER_DOM_UTILS_SNIPPET = `
const FC_DOM_UTILS = (() => {
  function getEffectiveOpacity(el) {
    let op = 1;
    let cur = el;
    while (cur && cur.nodeType === 1) {
      const s = getComputedStyle(cur);
      if (s.display === 'none') return 0;
      op *= parseFloat(s.opacity || '1');
      if (op <= 0.01) return 0;
      cur = cur.parentElement;
    }
    return op;
  }

  function isVisible(el) {
    if (!el || el.nodeType !== 1) return false;
    const s = getComputedStyle(el);
    if (s.visibility !== 'visible') return false;
    if (getEffectiveOpacity(el) <= 0.01) return false;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return false;
    return true;
  }

  function parseCssColor(str) {
    if (!str || str === 'transparent') return { r: 0, g: 0, b: 0, a: 0 };
    const m = str.match(/rgba?\\(\\s*([\\d.]+)[,\\s]+([\\d.]+)[,\\s]+([\\d.]+)(?:\\s*[,/]\\s*([\\d.]+%?))?\\s*\\)/i);
    if (!m) return null;
    let a = 1;
    if (m[4] !== undefined) {
      a = m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    }
    return { r: parseFloat(m[1]), g: parseFloat(m[2]), b: parseFloat(m[3]), a };
  }

  function extractGradientStops(bgImage) {
    if (!bgImage || bgImage === 'none') return [];
    const cleaned = bgImage.replace(/url\\([^)]*\\)/gi, '');
    if (!/gradient\\(/i.test(cleaned)) return [];
    const matches = cleaned.match(/rgba?\\([^)]+\\)/gi) || [];
    return matches.map(parseCssColor).filter(Boolean);
  }

  function srgbToLinear(c8) {
    const c = Math.max(0, Math.min(255, c8)) / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }

  function relativeLuminance(rgb) {
    return (
      0.2126 * srgbToLinear(rgb.r) +
      0.7152 * srgbToLinear(rgb.g) +
      0.0722 * srgbToLinear(rgb.b)
    );
  }

  function compositeOver(fg, alpha, bg) {
    const a = Math.max(0, Math.min(1, alpha));
    return {
      r: a * fg.r + (1 - a) * bg.r,
      g: a * fg.g + (1 - a) * bg.g,
      b: a * fg.b + (1 - a) * bg.b
    };
  }

  function contrastRatio(c1, c2) {
    const l1 = relativeLuminance(c1);
    const l2 = relativeLuminance(c2);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  }

  function isVividBrandAccent(rgb, lumRaw) {
    const maxC = Math.max(rgb.r, rgb.g, rgb.b);
    const minC = Math.min(rgb.r, rgb.g, rgb.b);
    const chroma = maxC - minC;
    return lumRaw >= 0.08 && chroma >= 60 && maxC >= 135;
  }

  function describeEl(el) {
    const id = el.id ? '#' + el.id : '';
    const cls = typeof el.className === 'string'
      ? el.className.trim().split(/\\s+/).filter(Boolean).slice(0, 4).join('.')
      : '';
    return el.tagName.toLowerCase() + id + (cls ? '.' + cls : '');
  }

  return {
    getEffectiveOpacity, isVisible, parseCssColor, extractGradientStops,
    relativeLuminance, compositeOver, contrastRatio, isVividBrandAccent, describeEl
  };
})();
`;

const EVAL_TIER1_ASSETS_AND_DEPTH = `(() => {
  ${BROWSER_DOM_UTILS_SNIPPET}
  const U = FC_DOM_UTILS;

  // 1. Images loaded check
  const imgs = Array.from(document.querySelectorAll('img'));
  const brokenImages = imgs
    .filter((img) => !img.complete || img.naturalWidth === 0)
    .map((img) => ({ src: img.getAttribute('src') || '', element: U.describeEl(img) }));

  // 2. Tailwind CDN check & styles.min.css check
  const cdnScripts = Array.from(document.querySelectorAll('script')).filter((sc) => {
    const src = sc.getAttribute('src') || '';
    const txt = sc.textContent || '';
    return src.includes('cdn.tailwindcss.com') || txt.includes('cdn.tailwindcss.com');
  });
  const styleLink = document.querySelector('link[rel="stylesheet"][href*="styles.min.css"]');
  const styleSheetLoaded = Array.from(document.styleSheets).some((ss) => {
    if (!ss.href || !ss.href.includes('styles.min.css')) return false;
    try { return ss.cssRules && ss.cssRules.length > 0; } catch { return true; }
  });

  // 3. Inline <svg> data-viz (>= 60x40px)
  const dataVizSvgs = Array.from(document.querySelectorAll('svg')).filter((svg) => {
    if (!U.isVisible(svg) || svg.parentElement?.closest('svg')) return false;
    if (svg.closest('header, footer')) return false;
    const r = svg.getBoundingClientRect();
    return r.width >= 60 && r.height >= 40;
  });

  // 4. Interactive controls inside primary content (tabs, accordions, calculators, simulators, forms)
  const mainOrBody = document.querySelector('main') || document.body;
  const interactiveSelector = [
    '[role="tablist"] [role="tab"]',
    'details > summary',
    'button[aria-expanded][aria-controls]',
    'input[type="range"]',
    'input[type="number"]',
    'select',
    'form'
  ].join(', ');
  const interactiveControls = Array.from(mainOrBody.querySelectorAll(interactiveSelector)).filter((el) => {
    if (el.closest('header, footer, #fcAuditModal, #fcSuccessModal, #fcAuthModal, #fcMobileDrawerOverlay, #fcMobileBottomNav')) return false;
    return U.isVisible(el);
  });

  // 5. openAuditModal CTA wired
  const auditCtas = Array.from(document.querySelectorAll('a[onclick*="openAuditModal"], button[onclick*="openAuditModal"]'))
    .filter((el) => U.isVisible(el));

  // 6. Content depth word count (visible primary body content excluding header/footer/nav/modals)
  const excludeRoot = (el) => !!el.closest('header, footer, nav, #fcAuditModal, #fcSuccessModal, #fcAuthModal, #fcMobileDrawerOverlay, #fcMobileBottomNav, script, style, noscript, template');
  const wordParts = [];
  const walker = document.createTreeWalker(mainOrBody, NodeFilter.SHOW_TEXT);
  let tn;
  while ((tn = walker.nextNode())) {
    if (!tn.nodeValue || !tn.nodeValue.trim()) continue;
    const parent = tn.parentElement;
    if (!parent || excludeRoot(parent)) continue;
    if (!U.isVisible(parent)) continue;
    wordParts.push(tn.nodeValue.trim());
  }
  const wordCount = wordParts.join(' ').trim().split(/\\s+/).filter(Boolean).length;

  return {
    totalImages: imgs.length,
    brokenImages,
    cdnTailwindCount: cdnScripts.length,
    hasStylesMinLink: !!styleLink,
    styleSheetLoaded,
    dataVizSvgCount: dataVizSvgs.length,
    interactiveControlCount: interactiveControls.length,
    auditCtaCount: auditCtas.length,
    wordCount
  };
})()`;

const EVAL_TIER2_OVERFLOW = `(() => {
  ${BROWSER_DOM_UTILS_SNIPPET}
  const U = FC_DOM_UTILS;
  const vw = window.innerWidth;
  const docScrollWidth = document.documentElement.scrollWidth;
  const bodyScrollWidth = document.body ? document.body.scrollWidth : 0;
  const overflowingElements = [];

  const isInsideHorizontalScroller = (el) => {
    let cur = el.parentElement;
    while (cur && cur !== document.body && cur !== document.documentElement) {
      const ox = getComputedStyle(cur).overflowX;
      if (ox === 'auto' || ox === 'scroll') return true;
      cur = cur.parentElement;
    }
    return false;
  };

  const candidates = document.querySelectorAll('header, header .max-w-7xl > *, header a, header button, main, section, footer, table');
  for (const el of candidates) {
    if (!U.isVisible(el)) continue;
    if (el.closest('.mega-menu, .home-menu, #fcMobileDrawerOverlay, #fcAuditModal, #fcSuccessModal, #fcAuthModal')) continue;
    if (isInsideHorizontalScroller(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.right > vw + 1 || r.left < -1) {
      overflowingElements.push({
        element: U.describeEl(el),
        left: Math.round(r.left),
        right: Math.round(r.right),
        viewportWidth: vw
      });
    }
  }

  return {
    passed: docScrollWidth <= vw + 1 && overflowingElements.length === 0,
    viewportWidth: vw,
    docScrollWidth,
    bodyScrollWidth,
    overflowingElements: overflowingElements.slice(0, 20)
  };
})()`;

const EVAL_TIER2_SINGLE_LINE_NAV = `(() => {
  ${BROWSER_DOM_UTILS_SNIPPET}
  const U = FC_DOM_UTILS;
  const header = document.querySelector('header');
  if (!header || !U.isVisible(header)) {
    return { passed: false, issues: [{ element: 'header', issue: 'Visible <header> not found' }] };
  }
  const nav = header.querySelector('nav');
  if (!nav || !U.isVisible(nav)) {
    return { passed: false, issues: [{ element: 'header nav', issue: 'Visible <header> nav not found on desktop viewport' }] };
  }

  const headerRect = header.getBoundingClientRect();
  const navRect = nav.getBoundingClientRect();
  const issues = [];

  const triggers = [];
  for (const child of Array.from(nav.children)) {
    if (child.matches('.mega-menu, .home-menu, [role="menu"]')) continue;
    if (child.matches('a, button')) {
      if (U.isVisible(child)) triggers.push(child);
    } else {
      for (const sub of Array.from(child.querySelectorAll(':scope > a, :scope > button'))) {
        if (!sub.closest('.mega-menu, .home-menu, [role="menu"]') && U.isVisible(sub)) {
          triggers.push(sub);
        }
      }
    }
  }

  if (triggers.length === 0) {
    return { passed: false, issues: [{ element: 'header nav', issue: 'No visible top-level nav triggers found inside <header> nav' }] };
  }

  const centerYs = [];
  let prevRight = -Infinity;

  for (const item of triggers) {
    const r = item.getBoundingClientRect();
    centerYs.push(r.top + r.height / 2);

    if (item.getClientRects().length !== 1) {
      issues.push({ element: U.describeEl(item), issue: 'getClientRects().length=' + item.getClientRects().length + ' (expected 1)' });
    }

    const walker = document.createTreeWalker(item, NodeFilter.SHOW_TEXT);
    const lineBins = new Set();
    let tn;
    while ((tn = walker.nextNode())) {
      if (!tn.nodeValue || !tn.nodeValue.trim()) continue;
      const parentEl = tn.parentElement;
      if (parentEl && parentEl.closest('[aria-hidden="true"]')) continue;
      const range = document.createRange();
      range.selectNodeContents(tn);
      for (const tr of range.getClientRects()) {
        if (tr.width > 0.5 && tr.height > 0.5) {
          lineBins.add(Math.round(tr.top / 4));
        }
      }
    }
    if (lineBins.size > 1) {
      issues.push({ element: U.describeEl(item), issue: 'Text wrapped onto ' + lineBins.size + ' lines' });
    }

    if (r.left < headerRect.left - 1 || r.right > headerRect.right + 1 || r.right > window.innerWidth + 1) {
      issues.push({ element: U.describeEl(item), issue: 'Nav item overflows header or viewport' });
    }
    if (r.left < prevRight - 2) {
      issues.push({ element: U.describeEl(item), issue: 'Nav item overlaps or wrapped below previous item' });
    }
    prevRight = r.right;
  }

  const rowSpread = Math.max(...centerYs) - Math.min(...centerYs);
  if (rowSpread > 8) {
    issues.push({ element: 'header nav', issue: 'Nav triggers wrapped across multiple rows (centerY spread ' + rowSpread.toFixed(1) + 'px > 8px)' });
  }
  if (navRect.height > headerRect.height + 2) {
    issues.push({ element: 'header nav', issue: 'Nav height (' + navRect.height + 'px) exceeds header height (' + headerRect.height + 'px)' });
  }
  if (header.scrollWidth > header.clientWidth + 1) {
    issues.push({ element: 'header', issue: 'Header horizontal overflow (' + header.scrollWidth + ' > ' + header.clientWidth + ')' });
  }

  return { passed: issues.length === 0, triggerCount: triggers.length, rowSpreadPx: Number(rowSpread.toFixed(1)), issues };
})()`;

const EVAL_TIER2_PURE_WHITE = `(() => {
  ${BROWSER_DOM_UTILS_SNIPPET}
  const U = FC_DOM_UTILS;
  const SKIP_TAGS = new Set(['HTML', 'HEAD', 'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'VIDEO', 'AUDIO', 'CANVAS', 'IMG', 'PICTURE', 'SVG']);
  const STRUCTURAL_TAGS = new Set(['BODY', 'MAIN', 'HEADER', 'FOOTER', 'SECTION', 'ARTICLE', 'ASIDE', 'NAV']);
  const WHITE = { r: 255, g: 255, b: 255 };
  const violations = [];

  const nodes = [document.body, ...document.body.querySelectorAll('*')];
  for (const el of nodes) {
    if (!el || SKIP_TAGS.has(el.tagName)) continue;
    if (el.closest('svg, video, audio, picture, template')) continue;
    if (!U.isVisible(el)) continue;

    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();

    if ((r.width <= 16 && r.height <= 16) || Math.min(r.width, r.height) <= 8) continue;

    if (s.position === 'fixed' && r.width >= window.innerWidth * 0.9 && r.height >= window.innerHeight * 0.9) {
      const bg = U.parseCssColor(s.backgroundColor);
      if (bg && bg.a < 0.85) continue;
    }

    const effRootOpacity = U.getEffectiveOpacity(el);
    const brPx = parseFloat(s.borderRadius || '0');
    const isCircularOrbOrAvatar =
      !STRUCTURAL_TAGS.has(el.tagName) &&
      r.width <= 128 &&
      r.height <= 128 &&
      brPx >= Math.min(r.width, r.height) * 0.45;
    const isInteractiveCtaOrSmallBadge =
      el.tagName === 'A' ||
      el.tagName === 'BUTTON' ||
      el.getAttribute('role') === 'button' ||
      isCircularOrbOrAvatar ||
      (r.width <= 56 && r.height <= 56) ||
      (r.height <= 24 && !STRUCTURAL_TAGS.has(el.tagName)) ||
      (r.height <= 36 && r.width <= 260 && !STRUCTURAL_TAGS.has(el.tagName));
    const isLargeStructural = STRUCTURAL_TAGS.has(el.tagName) || (r.width >= 200 && r.height >= 120 && !isInteractiveCtaOrSmallBadge);

    const checkColorStop = (source, rgba) => {
      if (!rgba) return;
      const effAlpha = rgba.a * effRootOpacity;
      if (effAlpha <= 0.3) return;
      const lumRaw = U.relativeLuminance(rgba);
      const compRgb = U.compositeOver(rgba, effAlpha, WHITE);
      const lumComp = U.relativeLuminance(compRgb);

      if (lumRaw < 0.25 || lumComp < 0.25) {
        if (!isLargeStructural && isInteractiveCtaOrSmallBadge && U.isVividBrandAccent(rgba, lumRaw)) {
          return;
        }
        violations.push({
          element: U.describeEl(el),
          source,
          rgba: 'rgba(' + Math.round(rgba.r) + ',' + Math.round(rgba.g) + ',' + Math.round(rgba.b) + ',' + Number(effAlpha.toFixed(2)) + ')',
          lumRaw: Number(lumRaw.toFixed(4)),
          lumCompOverWhite: Number(lumComp.toFixed(4)),
          rect: { w: Math.round(r.width), h: Math.round(r.height) }
        });
      }
    };

    checkColorStop('backgroundColor', U.parseCssColor(s.backgroundColor));

    const bgClip = s.backgroundClip || s.webkitBackgroundClip || '';
    if (bgClip !== 'text') {
      const stops = U.extractGradientStops(s.backgroundImage);
      for (const stop of stops) {
        checkColorStop('backgroundImage', stop);
      }
    }
  }

  return { passed: violations.length === 0, violationCount: violations.length, violations: violations.slice(0, 25) };
})()`;

const EVAL_TIER3_A11Y_CONTRAST = `(() => {
  ${BROWSER_DOM_UTILS_SNIPPET}
  const U = FC_DOM_UTILS;
  const failures = [];
  const contrastFailures = [];
  const WHITE = { r: 255, g: 255, b: 255 };

  // Pause CSS animations/transitions temporarily so pulsing keyframes don't cause transient opacity contrast noise
  const pauseStyle = document.createElement('style');
  pauseStyle.id = '__fc_e2e_anim_pause__';
  pauseStyle.textContent = '*, *::before, *::after { animation: none !important; transition: none !important; }';
  document.head.appendChild(pauseStyle);

  try {
    const isATIgnored = (el) => !U.isVisible(el) || !!el.closest('[aria-hidden="true"], [inert]');

    const getAccessibleName = (el) => {
      const aria = (el.getAttribute('aria-label') || '').trim();
      if (aria) return aria;
      const labelledBy = (el.getAttribute('aria-labelledby') || '').trim();
      if (labelledBy) {
        const txt = labelledBy.split(/\\s+/).map((id) => document.getElementById(id)?.textContent?.trim() || '').join(' ').trim();
        if (txt) return txt;
      }
      const imgAlt = Array.from(el.querySelectorAll('img[alt]')).map((i) => i.alt.trim()).filter(Boolean).join(' ');
      return (el.innerText || el.textContent || '').trim() || imgAlt;
    };

    // 1. <main> landmark
    const visibleMains = Array.from(document.querySelectorAll('main, [role="main"]')).filter((el) => !isATIgnored(el));
    if (visibleMains.length !== 1) {
      failures.push({ rule: 'landmark-main', message: 'Expected 1 visible <main> landmark, found ' + visibleMains.length });
    }

    // 2. Headings: single <h1>, no level skips
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]')).filter((el) => !isATIgnored(el));
    const getLevel = (el) => /^H[1-6]$/.test(el.tagName) ? parseInt(el.tagName[1], 10) : parseInt(el.getAttribute('aria-level') || '2', 10);
    const h1s = headings.filter((h) => getLevel(h) === 1);
    if (h1s.length !== 1) {
      failures.push({ rule: 'single-h1', message: 'Expected 1 visible <h1>, found ' + h1s.length });
    } else if (visibleMains.length === 1 && !visibleMains[0].contains(h1s[0])) {
      failures.push({ rule: 'h1-in-main', message: 'Primary <h1> must be inside <main>' });
    }
    for (let i = 1; i < headings.length; i++) {
      const prev = getLevel(headings[i - 1]);
      const curr = getLevel(headings[i]);
      if (curr > prev + 1) {
        failures.push({ rule: 'heading-order', element: U.describeEl(headings[i]), message: 'Heading skip h' + prev + ' -> h' + curr });
      }
    }

    // 3. <img> alt attributes
    for (const img of document.querySelectorAll('img')) {
      if (!U.isVisible(img)) continue;
      const role = (img.getAttribute('role') || '').toLowerCase();
      if (img.getAttribute('aria-hidden') === 'true' || img.closest('[aria-hidden="true"]') || role === 'presentation' || role === 'none') continue;
      const alt = img.getAttribute('alt');
      if (alt === null || alt.trim().length === 0) {
        failures.push({ rule: 'img-alt', element: U.describeEl(img), message: 'Visible <img> missing non-empty alt' });
      }
    }

    // 4. Data-viz <svg> vs small <= 32px UI icons
    for (const svg of document.querySelectorAll('svg')) {
      if (!U.isVisible(svg) || svg.parentElement?.closest('svg')) continue;
      const r = svg.getBoundingClientRect();
      const isSmallIcon = r.width <= 32 && r.height <= 32;
      const ariaHidden = svg.getAttribute('aria-hidden') === 'true' || !!svg.closest('[aria-hidden="true"]');
      const role = (svg.getAttribute('role') || '').toLowerCase();
      const hasDataPrimitives = svg.querySelectorAll('path, rect, circle, polyline, polygon, line, text').length >= 2;
      const isDataViz = r.width >= 60 && r.height >= 40 && hasDataPrimitives;

      if (isSmallIcon) continue;
      if (ariaHidden && !isDataViz) continue;

      if (ariaHidden && isDataViz) {
        failures.push({ rule: 'svg-chart-hidden', element: U.describeEl(svg), message: 'Data-viz <svg> must not have aria-hidden="true"' });
        continue;
      }
      const hasImgRole = role === 'img' || role === 'graphics-document';
      const hasTitle = (svg.querySelector(':scope > title')?.textContent || '').trim().length > 0;
      const hasLabel = (svg.getAttribute('aria-label') || '').trim().length > 0 || !!(svg.getAttribute('aria-labelledby') || '').trim();
      if (!hasImgRole || (!hasTitle && !hasLabel)) {
        failures.push({ rule: 'svg-dataviz-a11y', element: U.describeEl(svg), message: 'Data-viz <svg> requires role="img" and aria-label or <title>' });
      }
    }

    // 5. Interactive controls (buttons, dropdowns/accordions, tabs, inputs, clickable divs)
    for (const btn of document.querySelectorAll('button')) {
      if (isATIgnored(btn)) continue;
      const t = (btn.getAttribute('type') || '').toLowerCase();
      if (!btn.hasAttribute('type') || !['button', 'submit', 'reset'].includes(t) || ((t === 'submit' || t === 'reset') && !btn.closest('form'))) {
        failures.push({ rule: 'button-type', element: U.describeEl(btn), message: 'Button missing valid explicit type (got "' + btn.getAttribute('type') + '")' });
      }
      if (!getAccessibleName(btn)) {
        failures.push({ rule: 'button-name', element: U.describeEl(btn), message: 'Visible <button> lacks accessible name (innerText or aria-label)' });
      }
    }

    for (const trig of document.querySelectorAll('.dropdown-parent > button, .home-dropdown-parent > button, .products-dropdown-parent > button, [data-accordion] button, button[aria-controls]')) {
      if (isATIgnored(trig) || trig.getAttribute('role') === 'tab') continue;
      const exp = trig.getAttribute('aria-expanded');
      if (exp !== 'true' && exp !== 'false') {
        failures.push({ rule: 'aria-expanded', element: U.describeEl(trig), message: 'Dropdown/accordion trigger missing aria-expanded="true"|"false"' });
      }
    }

    for (const list of document.querySelectorAll('[role="tablist"]')) {
      if (isATIgnored(list)) continue;
      const tabs = Array.from(list.querySelectorAll('[role="tab"]')).filter((t) => !isATIgnored(t));
      if (tabs.length < 2) {
        failures.push({ rule: 'tablist-tabs', element: U.describeEl(list), message: 'Expected >= 2 [role="tab"], found ' + tabs.length });
      }
      const selected = tabs.filter((t) => t.getAttribute('aria-selected') === 'true');
      if (selected.length !== 1) {
        failures.push({ rule: 'tab-selected', element: U.describeEl(list), message: 'Expected 1 tab with aria-selected="true", found ' + selected.length });
      }
      for (const tab of tabs) {
        const sel = tab.getAttribute('aria-selected');
        if (sel !== 'true' && sel !== 'false') {
          failures.push({ rule: 'tab-aria-selected', element: U.describeEl(tab), message: '[role="tab"] missing aria-selected' });
        }
        const ctrl = tab.getAttribute('aria-controls');
        if (ctrl && !document.getElementById(ctrl)) {
          failures.push({ rule: 'tab-aria-controls', element: U.describeEl(tab), message: 'aria-controls="#' + ctrl + '" target missing' });
        }
      }
    }

    for (const inp of document.querySelectorAll('input, select, textarea')) {
      if (isATIgnored(inp)) continue;
      const t = (inp.getAttribute('type') || 'text').toLowerCase();
      if (inp.tagName === 'INPUT' && ['hidden', 'button', 'submit', 'reset', 'image'].includes(t)) continue;
      const hasFor = inp.id && !!document.querySelector('label[for="' + CSS.escape(inp.id) + '"]')?.textContent?.trim();
      const hasWrap = !!inp.closest('label')?.textContent?.trim();
      const hasAria = !!(inp.getAttribute('aria-label') || '').trim();
      const lby = (inp.getAttribute('aria-labelledby') || '').trim();
      const hasLby = lby && lby.split(/\\s+/).some((id) => !!document.getElementById(id)?.textContent?.trim());
      if (!hasFor && !hasWrap && !hasAria && !hasLby) {
        failures.push({ rule: 'input-label', element: U.describeEl(inp), message: 'Form control missing <label> or aria-label' });
      }
    }

    for (const el of document.querySelectorAll('div, span, p, li, section, article, img')) {
      if (isATIgnored(el)) continue;
      if (el.closest('a[href], button, input, select, textarea, label, summary, [role="button"], [role="link"], [role="tab"], [role="menuitem"]')) continue;
      const ownPointer = getComputedStyle(el).cursor === 'pointer' && (!el.parentElement || getComputedStyle(el.parentElement).cursor !== 'pointer');
      if (el.hasAttribute('onclick') || ownPointer) {
        const role = (el.getAttribute('role') || '').toLowerCase();
        const validRole = ['button', 'link', 'tab', 'menuitem', 'switch', 'checkbox', 'radio', 'option'].includes(role);
        const validTab = el.hasAttribute('tabindex') && el.tabIndex >= 0;
        if (!validRole || !validTab) {
          failures.push({ rule: 'clickable-non-semantic', element: U.describeEl(el), message: 'Clickable non-semantic element lacks role="button" and tabindex="0"' });
        }
      }
    }

    // 6. WCAG AA Contrast across visible text nodes
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let tn;
    while ((tn = walker.nextNode())) {
      if (!tn.nodeValue || !tn.nodeValue.trim()) continue;
      const el = tn.parentElement;
      if (!el || el.closest('script, style, noscript, template, svg, title')) continue;
      if (!U.isVisible(el)) continue;

      const s = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      if ((rect.width <= 1 && rect.height <= 1) || s.clip === 'rect(0px, 0px, 0px, 0px)' || s.clipPath === 'inset(50%)') continue;
      if ((s.backgroundClip || s.webkitBackgroundClip) === 'text') continue;

      const fgColor = U.parseCssColor(s.webkitTextFillColor) || U.parseCssColor(s.color);
      if (!fgColor || fgColor.a <= 0.01) continue;

      const chain = [];
      for (let cur = el; cur && cur.nodeType === 1; cur = cur.parentElement) chain.unshift(cur);

      let bgCandidates = [WHITE];
      for (const node of chain) {
        const ns = getComputedStyle(node);
        const nbg = U.parseCssColor(ns.backgroundColor);
        if (nbg && nbg.a > 0) {
          bgCandidates = bgCandidates.map((b) => U.compositeOver(nbg, nbg.a, b));
        }
        if ((ns.backgroundClip || ns.webkitBackgroundClip) !== 'text') {
          const stops = U.extractGradientStops(ns.backgroundImage).filter((st) => st.a > 0.05);
          if (stops.length > 0) {
            const next = [];
            for (const b of bgCandidates) {
              for (const st of stops) next.push(U.compositeOver(st, st.a, b));
            }
            next.sort((a, b) => U.relativeLuminance(a) - U.relativeLuminance(b));
            bgCandidates = next.length > 2 ? [next[0], next[next.length - 1]] : next;
          }
        }
      }

      const elOpacity = U.getEffectiveOpacity(el);
      let minRatio = Infinity;
      for (const bg of bgCandidates) {
        const effFg = U.compositeOver(fgColor, fgColor.a * elOpacity, bg);
        const cr = U.contrastRatio(effFg, bg);
        if (cr < minRatio) minRatio = cr;
      }

      const fontSize = parseFloat(s.fontSize || '16');
      const fw = parseInt(s.fontWeight, 10);
      const isBold = !Number.isNaN(fw) ? fw >= 700 : s.fontWeight === 'bold';
      const isLarge = fontSize >= 24 || (isBold && fontSize >= 18.66);
      const threshold = isLarge ? 3.0 : 4.5;

      if (minRatio < threshold) {
        contrastFailures.push({
          element: U.describeEl(el),
          text: tn.nodeValue.trim().slice(0, 40),
          ratio: Number(minRatio.toFixed(2)),
          required: threshold,
          fontSizePx: fontSize,
          isBold,
          fg: s.color
        });
      }
    }

    return {
      passed: failures.length === 0 && contrastFailures.length === 0,
      a11yIssueCount: failures.length,
      contrastFailureCount: contrastFailures.length,
      failures: failures.slice(0, 30),
      contrastFailures: contrastFailures.slice(0, 30)
    };
  } finally {
    pauseStyle.remove();
  }
})()`;

// =============================================================================
// CDP Interaction Helpers
// =============================================================================

async function dispatchRealClick(cdp, x, y) {
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', clickCount: 0 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
  await cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
}

async function scrollAndClickSelector(cdp, selector) {
  const prep = await cdp.evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return { found: false };
    el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const hit = document.elementFromPoint(cx, cy);
    const hitMatches = !!(hit && (el === hit || el.contains(hit) || hit.contains(el)));
    return {
      found: true,
      width: r.width,
      height: r.height,
      cx,
      cy,
      hitMatches,
      inViewport: cx >= 0 && cy >= 0 && cx <= window.innerWidth && cy <= window.innerHeight
    };
  })()`);

  if (!prep || !prep.found) return { clicked: false, reason: `Element not found: ${selector}` };
  if (prep.width < 1 || prep.height < 1) return { clicked: false, reason: `Element has zero size: ${selector}` };

  if (prep.inViewport && prep.hitMatches) {
    await dispatchRealClick(cdp, prep.cx, prep.cy);
    return { clicked: true, method: 'cdp-mouse' };
  }

  // Fallback if sticky header partially overlaps center or fixed edge position
  await cdp.evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (el) el.click();
  })()`);
  return { clicked: true, method: 'dom-click' };
}

// =============================================================================
// Navigation & Per-Run Network / Console Capture
// =============================================================================

async function navigateAndSettle(cdp, tracker, url, viewport, timeoutMs) {
  // Reset cleanly to about:blank first so previous page listeners/timers stop
  await cdp.send('Page.navigate', { url: 'about:blank' }, timeoutMs);
  await sleep(80);

  tracker.clear();

  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: viewport.deviceScaleFactor,
    mobile: viewport.mobile
  }, timeoutMs);

  let loadFiredResolve = null;
  const loadPromise = new Promise((resolve) => { loadFiredResolve = resolve; });
  const offLoad = cdp.on('Page.loadEventFired', () => {
    if (loadFiredResolve) loadFiredResolve();
  });

  try {
    const navRes = await cdp.send('Page.navigate', { url }, timeoutMs);
    if (navRes && navRes.errorText) {
      throw new InfraError(`Navigation failed for ${url}: ${navRes.errorText}`);
    }
    await Promise.race([
      loadPromise,
      sleep(timeoutMs).then(() => {
        throw new InfraError(`Timed out waiting for Page.loadEventFired on ${url} (${viewport.name})`);
      })
    ]);
  } finally {
    offLoad();
  }

  // Allow DOMContentLoaded async handlers, webfont checks, and image decode to settle
  await sleep(650);
}

async function triggerLazyImagesAndSettle(cdp) {
  await cdp.evaluate(`(async () => {
    const imgs = Array.from(document.querySelectorAll('img'));
    const pending = imgs.filter((img) => !img.complete || img.naturalWidth === 0);
    if (pending.length > 0) {
      for (const img of pending) {
        try {
          img.scrollIntoView({ block: 'center', behavior: 'instant' });
          await new Promise((r) => setTimeout(r, 80));
        } catch {}
      }
      const deadline = Date.now() + 3000;
      while (Date.now() < deadline) {
        if (pending.every((img) => img.complete && img.naturalWidth > 0)) break;
        await new Promise((r) => setTimeout(r, 100));
      }
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    }
  })()`, true);
}

function createNetworkAndRuntimeTracker(cdp, opts) {
  const state = {
    badResponses: [],
    networkFailures: [],
    consoleErrors: [],
    runtimeExceptions: [],
    logErrors: [],
    responsesByUrl: new Map()
  };

  const requestUrls = new Map();

  const isLocalHostUrl = (url) => {
    if (!url) return true;
    if (url.startsWith('data:') || url.startsWith('blob:') || url.startsWith('about:')) return true;
    try {
      const u = new URL(url);
      return u.hostname === '127.0.0.1' || u.hostname === 'localhost';
    } catch {
      return false;
    }
  };

  const shouldIgnoreExternal = (url) => opts.offlineIgnoreCdn && !isLocalHostUrl(url);

  cdp.on('Network.requestWillBeSent', (params) => {
    if (params.requestId && params.request?.url) {
      requestUrls.set(params.requestId, params.request.url);
    }
  });

  cdp.on('Network.responseReceived', (params) => {
    const resp = params.response || {};
    const url = resp.url || requestUrls.get(params.requestId) || '';
    if (url) state.responsesByUrl.set(url, resp.status);
    if (resp.status >= 400 && !shouldIgnoreExternal(url)) {
      state.badResponses.push({
        url,
        status: resp.status,
        type: params.type || 'Unknown'
      });
    }
  });

  cdp.on('Network.loadingFailed', (params) => {
    // Ignore benign media metadata/range preload aborts emitted by Chrome on <video preload="metadata">
    if (params.canceled === true && params.type === 'Media') return;
    const url = requestUrls.get(params.requestId) || '';
    if (shouldIgnoreExternal(url)) return;
    state.networkFailures.push({
      url,
      type: params.type || 'Unknown',
      errorText: params.errorText || 'loadingFailed',
      canceled: !!params.canceled
    });
  });

  cdp.on('Runtime.consoleAPICalled', (params) => {
    if (params.type !== 'error') return;
    const text = (params.args || [])
      .map((a) => a.value !== undefined ? String(a.value) : (a.description || a.type || ''))
      .join(' ')
      .trim();
    state.consoleErrors.push(text || 'console.error');
  });

  cdp.on('Runtime.exceptionThrown', (params) => {
    const det = params.exceptionDetails || {};
    const desc = det.exception?.description || det.text || 'Uncaught exception';
    const loc = det.url ? ` (${det.url}:${(det.lineNumber || 0) + 1})` : '';
    state.runtimeExceptions.push(`${desc.split('\n')[0]}${loc}`);
  });

  cdp.on('Log.entryAdded', (params) => {
    const entry = params.entry || {};
    if (entry.level !== 'error') return;
    if (shouldIgnoreExternal(entry.url || '')) return;
    state.logErrors.push({
      source: entry.source || 'log',
      text: entry.text || '',
      url: entry.url || ''
    });
  });

  return {
    state,
    clear() {
      state.badResponses.length = 0;
      state.networkFailures.length = 0;
      state.consoleErrors.length = 0;
      state.runtimeExceptions.length = 0;
      state.logErrors.length = 0;
      state.responsesByUrl.clear();
      requestUrls.clear();
    },
    snapshotErrors() {
      return {
        badResponses: [...state.badResponses],
        networkFailures: [...state.networkFailures],
        consoleErrors: [...state.consoleErrors],
        runtimeExceptions: [...state.runtimeExceptions],
        logErrors: [...state.logErrors]
      };
    },
    clearRuntimeErrorsOnly() {
      state.consoleErrors.length = 0;
      state.runtimeExceptions.length = 0;
      state.logErrors.length = 0;
    }
  };
}

// =============================================================================
// Tier 3 Interactive Smoke Runner
// =============================================================================

async function runTier3InteractiveSmoke(cdp, tracker, viewport) {
  const details = [];
  const failures = [];

  tracker.clearRuntimeErrorsOnly();

  // 1. Desktop header dropdowns (when width >= 1024)
  if (!viewport.mobile && viewport.width >= 1024) {
    const dropdownInfo = await cdp.evaluate(`(() => {
      const triggers = [];
      document.querySelectorAll('header nav .home-dropdown-parent > button, header nav .products-dropdown-parent > button, header nav .dropdown-parent > button').forEach((btn, idx) => {
        btn.setAttribute('data-e2e-dd-idx', String(idx));
        const parent = btn.parentElement;
        const menu = parent ? parent.querySelector('.mega-menu, .home-menu') : null;
        triggers.push({
          idx,
          label: (btn.innerText || btn.getAttribute('aria-label') || '').trim(),
          hasMenu: !!menu,
          hasAriaExpanded: btn.hasAttribute('aria-expanded')
        });
      });
      return triggers;
    })()`);

    if (!dropdownInfo || dropdownInfo.length === 0) {
      failures.push('No header dropdown triggers found on desktop');
    } else {
      for (const dd of dropdownInfo) {
        const sel = `[data-e2e-dd-idx="${dd.idx}"]`;
        await scrollAndClickSelector(cdp, sel);
        await sleep(120);
        const after = await cdp.evaluate(`(() => {
          const btn = document.querySelector(${JSON.stringify(sel)});
          const parent = btn?.parentElement;
          const menu = parent?.querySelector('.mega-menu, .home-menu');
          const menuDisplay = menu ? getComputedStyle(menu).display : 'none';
          const menuVisible = menuDisplay !== 'none' && getComputedStyle(menu).visibility !== 'hidden';
          const ariaExp = btn?.getAttribute('aria-expanded');
          return { menuVisible, ariaExp };
        })()`);
        if (!after.menuVisible && after.ariaExp !== 'true') {
          failures.push(`Header dropdown "${dd.label}" click did not open .mega-menu or toggle aria-expanded="true"`);
        } else {
          details.push(`Dropdown "${dd.label}" opened cleanly`);
        }
        // Dismiss dropdown (move mouse out to clear :hover as well as click-outside)
        await dispatchRealClick(cdp, 1, 1);
        await cdp.evaluate(`document.body.click();`);
        await sleep(80);
      }
    }
  }

  // 2. ARIA Tabs ([role="tablist"] [role="tab"]) — test every tab in each tablist
  const tabLists = await cdp.evaluate(`(() => {
    const out = [];
    document.querySelectorAll('[role="tablist"]').forEach((list, lIdx) => {
      const tabs = Array.from(list.querySelectorAll('[role="tab"]'));
      const inactiveTabs = tabs.filter((t) => t.getAttribute('aria-selected') !== 'true');
      const active = tabs.find((t) => t.getAttribute('aria-selected') === 'true');
      inactiveTabs.forEach((tab, tIdx) => {
        const key = lIdx + '-' + tIdx;
        tab.setAttribute('data-e2e-tab-target', key);
        if (active) active.setAttribute('data-e2e-tab-prev', String(lIdx));
        out.push({
          lIdx,
          key,
          inactiveText: (tab.innerText || tab.getAttribute('aria-label') || '').trim(),
          targetControls: tab.getAttribute('aria-controls') || null,
          prevControls: active?.getAttribute('aria-controls') || null
        });
      });
    });
    return out;
  })()`);

  for (const tl of tabLists || []) {
    const sel = `[data-e2e-tab-target="${tl.key}"]`;
    await scrollAndClickSelector(cdp, sel);
    await sleep(120);
    const res = await cdp.evaluate(`(() => {
      const clicked = document.querySelector('[data-e2e-tab-target="${tl.key}"]');
      const targetPanel = ${JSON.stringify(tl.targetControls)} ? document.getElementById(${JSON.stringify(tl.targetControls)}) : null;
      return {
        clickedSelected: clicked?.getAttribute('aria-selected'),
        targetPanelHidden: targetPanel ? (targetPanel.hidden || getComputedStyle(targetPanel).display === 'none') : null
      };
    })()`);
    if (res.clickedSelected !== 'true') {
      failures.push(`Tab "${tl.inactiveText}" did not flip aria-selected to "true"`);
    } else if (tl.targetControls && res.targetPanelHidden === true) {
      failures.push(`Controlled panel #${tl.targetControls} remained hidden after clicking tab "${tl.inactiveText}"`);
    } else {
      details.push(`Tab "${tl.inactiveText}" toggled cleanly`);
    }
  }

  // 3. FAQ Accordions (details > summary or button[aria-expanded][aria-controls] outside <header>)
  const accordions = await cdp.evaluate(`(() => {
    const items = [];
    const seen = new Set();
    const candidates = document.querySelectorAll('details > summary, button[aria-expanded][aria-controls]');
    for (const el of candidates) {
      if (el.closest('header, footer, #fcAuditModal, #fcSuccessModal, #fcAuthModal, #fcMobileDrawerOverlay')) continue;
      if (el.getAttribute('role') === 'tab') continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      if (seen.has(el)) continue;
      seen.add(el);
      const idx = items.length;
      el.setAttribute('data-e2e-acc', String(idx));
      const isDetails = el.tagName === 'SUMMARY' && el.parentElement?.tagName === 'DETAILS';
      items.push({
        idx,
        isDetails,
        initialOpen: isDetails ? el.parentElement.open : el.getAttribute('aria-expanded') === 'true',
        label: (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 40)
      });
      if (items.length >= 3) break;
    }
    return items;
  })()`);

  for (const acc of accordions || []) {
    const sel = `[data-e2e-acc="${acc.idx}"]`;
    await scrollAndClickSelector(cdp, sel);
    await sleep(120);
    const afterOpen = await cdp.evaluate(`(() => {
      const el = document.querySelector('[data-e2e-acc="${acc.idx}"]');
      if (!el) return null;
      return ${acc.isDetails} ? el.parentElement.open : el.getAttribute('aria-expanded') === 'true';
    })()`);
    await scrollAndClickSelector(cdp, sel);
    await sleep(120);
    const afterCollapse = await cdp.evaluate(`(() => {
      const el = document.querySelector('[data-e2e-acc="${acc.idx}"]');
      if (!el) return null;
      return ${acc.isDetails} ? el.parentElement.open : el.getAttribute('aria-expanded') === 'true';
    })()`);
    if (afterOpen === acc.initialOpen || afterCollapse !== acc.initialOpen) {
      failures.push(`Accordion "${acc.label}" did not open & collapse cleanly (${acc.initialOpen} -> ${afterOpen} -> ${afterCollapse})`);
    } else {
      details.push(`Accordion "${acc.label}" toggled (${acc.initialOpen} -> ${afterOpen} -> ${afterCollapse})`);
    }
  }

  // 4. Calculators / Range / Number / Select / Simulator Forms (excluding modals)
  const formControls = await cdp.evaluate(`(() => {
    const out = { rangesAndNumbers: [], selects: [], forms: [] };
    const root = document.querySelector('main') || document.body;
    const isExcluded = (el) => !!el.closest('header, footer, [role="dialog"], [id*="Modal"], [id*="modal"], #fcMobileDrawerOverlay, #fcMobileBottomNav');

    root.querySelectorAll('input[type="range"], input[type="number"]').forEach((inp) => {
      if (isExcluded(inp)) return;
      const r = inp.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      const idx = out.rangesAndNumbers.length;
      inp.setAttribute('data-e2e-calc-inp', String(idx));
      const sec = inp.closest('section') || root;
      out.rangesAndNumbers.push({
        idx,
        id: inp.id || '',
        val: inp.value,
        min: inp.min,
        max: inp.max,
        step: inp.step,
        beforeText: sec.innerText
      });
    });

    root.querySelectorAll('select').forEach((sel) => {
      if (isExcluded(sel) || sel.options.length < 2) return;
      const r = sel.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      const idx = out.selects.length;
      sel.setAttribute('data-e2e-sel', String(idx));
      out.selects.push({ idx, id: sel.id || '', initialIndex: sel.selectedIndex });
    });

    root.querySelectorAll('form').forEach((frm) => {
      if (isExcluded(frm)) return;
      const r = frm.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) return;
      const idx = out.forms.length;
      frm.setAttribute('data-e2e-form', String(idx));
      const sec = frm.closest('section') || root;
      out.forms.push({ idx, id: frm.id || '', beforeText: sec.innerText });
    });

    return out;
  })()`);

  for (const rc of formControls.rangesAndNumbers || []) {
    const res = await cdp.evaluate(`(() => {
      const inp = document.querySelector('[data-e2e-calc-inp="${rc.idx}"]');
      if (!inp) return { ok: false };
      const sec = inp.closest('section') || document.querySelector('main') || document.body;
      const before = sec.innerText;
      const min = inp.min !== '' ? Number(inp.min) : 0;
      const max = inp.max !== '' ? Number(inp.max) : 10000;
      const step = inp.step && inp.step !== 'any' ? Number(inp.step) : 1;
      const cur = Number(inp.value) || min;
      let next = cur + step * 2;
      if (next > max) next = Math.max(min, cur - step * 2);
      if (next === cur) next = cur === max ? min : max;
      // Boundary resilience probes ('0', '-1', 'NaN') when input[type=number] or unconstrained range
      for (const edge of ['0', '-1', 'NaN']) {
        inp.value = edge;
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        const edgeText = sec.innerText;
        if (/\\bNaN\\b|Infinity|₹-/i.test(edgeText)) {
          return { ok: true, changed: false, edgeLeak: edge };
        }
      }
      inp.value = String(next);
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.dispatchEvent(new Event('change', { bubbles: true }));
      const after = sec.innerText;
      return { ok: true, changed: before !== after, newVal: inp.value };
    })()`);
    if (res.edgeLeak) {
      failures.push(`Calculator/range input "${rc.id || rc.idx}" leaked NaN/Infinity/negative currency on boundary input "${res.edgeLeak}"`);
    } else if (!res.changed) {
      failures.push(`Calculator/range input "${rc.id || rc.idx}" did not update enclosing section text after mutation`);
    } else {
      details.push(`Calculator input "${rc.id || rc.idx}" mutated to ${res.newVal} & updated DOM (boundary-safe)`);
    }
  }

  for (const sel of formControls.selects || []) {
    await cdp.evaluate(`(() => {
      const s = document.querySelector('[data-e2e-sel="${sel.idx}"]');
      if (s && s.options.length > 1) {
        s.selectedIndex = (s.selectedIndex + 1) % s.options.length;
        s.dispatchEvent(new Event('change', { bubbles: true }));
      }
    })()`);
    details.push(`Select "${sel.id || sel.idx}" changed cleanly`);
  }

  for (const frm of formControls.forms || []) {
    await cdp.evaluate(`(() => {
      const f = document.querySelector('[data-e2e-form="${frm.idx}"]');
      if (!f) return;
      const submitBtn = f.querySelector('button[type="submit"], input[type="submit"]');
      if (submitBtn) submitBtn.click();
      else f.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    })()`);
    await sleep(1050); // Allow async simulation fallbacks (e.g. delivery.html 900ms) to settle
    details.push(`Simulator form "${frm.id || frm.idx}" submitted cleanly`);
  }

  // 5. Safe button click smoke inside <main>/<section> (excluding tabs/accordions/openAuditModal/header/footer/modals)
  const clickableButtons = await cdp.evaluate(`(() => {
    const out = [];
    const root = document.querySelector('main') || document.body;
    const btns = root.querySelectorAll('button');
    for (const b of btns) {
      if (b.closest('header, footer, [role="dialog"], [id*="Modal"], [id*="modal"], #fcMobileDrawerOverlay, #fcMobileBottomNav, form')) continue;
      if (b.getAttribute('role') === 'tab' || b.hasAttribute('data-e2e-acc')) continue;
      if ((b.getAttribute('onclick') || '').includes('openAuditModal')) continue;
      const r = b.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      const idx = out.length;
      b.setAttribute('data-e2e-smoke-btn', String(idx));
      out.push({ idx, label: (b.innerText || b.getAttribute('aria-label') || b.id || 'button').trim().slice(0, 40) });
      if (out.length >= 8) break;
    }
    return out;
  })()`);

  for (const sb of clickableButtons || []) {
    await scrollAndClickSelector(cdp, `[data-e2e-smoke-btn="${sb.idx}"]`);
    await sleep(80);
    details.push(`Clicked button "${sb.label}"`);
  }

  // 6. Anti-regression: zero clickable div/span without role + tabindex
  const nonSemanticCount = await cdp.evaluate(`(() => {
    return Array.from(document.querySelectorAll('div[onclick], span[onclick]')).filter((el) => {
      const role = (el.getAttribute('role') || '').toLowerCase();
      const validRole = ['button', 'link', 'tab', 'menuitem', 'switch', 'checkbox', 'radio', 'option'].includes(role);
      const validTab = el.hasAttribute('tabindex') && el.tabIndex >= 0;
      return !validRole || !validTab;
    }).length;
  })()`);
  if (nonSemanticCount > 0) {
    failures.push(`Found ${nonSemanticCount} clickable div/span[onclick] lacking valid role and tabindex`);
  }

  // Check if any JS exceptions / console errors fired during interactions
  const errs = tracker.snapshotErrors();
  if (errs.runtimeExceptions.length > 0) {
    failures.push(`Interactive smoke triggered uncaught JS exception(s): ${errs.runtimeExceptions.join('; ')}`);
  }
  if (errs.consoleErrors.length > 0) {
    failures.push(`Interactive smoke triggered console.error(s): ${errs.consoleErrors.join('; ')}`);
  }

  return {
    passed: failures.length === 0,
    details,
    failures
  };
}

// =============================================================================
// Tier 4 Client End-to-End Scenarios
// =============================================================================

async function runTier4Scenarios(cdp, tracker, pageName, viewport, httpPort, timeoutMs) {
  const results = [];

  // Scenario S1: Cross-page navigation links resolve HTTP 200 cleanly
  if (!viewport.mobile || viewport.width >= 1024) {
    const linksInfo = await cdp.evaluate(`(() => {
      const links = Array.from(document.querySelectorAll('a[href]')).map((a) => a.getAttribute('href') || '');
      const localHtmlLinks = new Set();
      for (const raw of links) {
        const clean = raw.split('#')[0].split('?')[0].trim();
        if (!clean || clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('mailto:') || clean.startsWith('tel:') || clean.startsWith('javascript:')) continue;
        localHtmlLinks.add(clean);
      }
      return Array.from(localHtmlLinks);
    })()`);

    const brokenLinks = [];
    const targetLinksFound = [];
    for (const href of linksInfo || []) {
      const normalizedPath = href.startsWith('/') ? href : `/${href}`;
      const targetMatch = TARGET_PAGES.find((p) => normalizedPath === `/${p}` || normalizedPath === `/${p.replace('.html', '')}`);
      if (targetMatch) targetLinksFound.push(targetMatch);

      try {
        const res = await fetch(`http://127.0.0.1:${httpPort}${normalizedPath}`);
        if (res.status !== 200) {
          brokenLinks.push({ href, status: res.status });
        }
      } catch (err) {
        brokenLinks.push({ href, status: err.message });
      }
    }

    const s1Failures = [];
    if (brokenLinks.length > 0) {
      s1Failures.push(`Broken internal links: ${JSON.stringify(brokenLinks)}`);
    }
    if (targetLinksFound.length < 3) {
      s1Failures.push(`Expected links to sibling automation pages (>= 3), found ${targetLinksFound.length}`);
    }

    results.push({
      tier: 4,
      name: 'T4.cross_page_nav',
      passed: s1Failures.length === 0,
      summary: `Checked ${(linksInfo || []).length} internal links (${targetLinksFound.length} sibling automation pages linked)`,
      failures: s1Failures
    });
  }

  // Scenario S2: Mobile drawer toggle at mobile viewport (390x844)
  if (viewport.mobile || viewport.width < 768) {
    tracker.clearRuntimeErrorsOnly();
    const s2Failures = [];

    const initial = await cdp.evaluate(`(() => {
      const btn = document.getElementById('fcMobileMenuBtn');
      const bnav = document.getElementById('fcMobileBottomNav');
      const overlay = document.getElementById('fcMobileDrawerOverlay');
      const drawer = document.getElementById('fcMobileDrawer');
      const btnRect = btn ? btn.getBoundingClientRect() : null;
      const bnavRect = bnav ? bnav.getBoundingClientRect() : null;
      return {
        btnVisible: !!(btn && btnRect.width > 0 && btnRect.height > 0 && getComputedStyle(btn).display !== 'none'),
        bnavVisible: !!(bnav && bnavRect.width > 0 && bnavRect.height > 0 && getComputedStyle(bnav).display !== 'none'),
        hasOverlay: !!overlay,
        hasDrawer: !!drawer,
        initialPointerEvents: overlay ? getComputedStyle(overlay).pointerEvents : null
      };
    })()`);

    if (!initial.btnVisible) s2Failures.push('#fcMobileMenuBtn is missing or not visible at mobile viewport');
    if (!initial.bnavVisible) s2Failures.push('#fcMobileBottomNav is missing or not visible at mobile viewport');
    if (!initial.hasOverlay || !initial.hasDrawer) s2Failures.push('#fcMobileDrawerOverlay / #fcMobileDrawer missing');
    if (initial.initialPointerEvents && initial.initialPointerEvents !== 'none') {
      s2Failures.push(`#fcMobileDrawerOverlay expected initial pointerEvents="none", got "${initial.initialPointerEvents}"`);
    }

    if (initial.btnVisible && initial.hasOverlay && initial.hasDrawer) {
      await scrollAndClickSelector(cdp, '#fcMobileMenuBtn');
      let opened = null;
      const openDeadline = Date.now() + 2500;
      while (Date.now() < openDeadline) {
        opened = await cdp.evaluate(`(() => {
          const overlay = document.getElementById('fcMobileDrawerOverlay');
          const drawer = document.getElementById('fcMobileDrawer');
          const oStyle = getComputedStyle(overlay);
          const dRect = drawer.getBoundingClientRect();
          return {
            pointerEvents: oStyle.pointerEvents,
            opacity: parseFloat(oStyle.opacity || '0'),
            drawerLeft: dRect.left,
            viewportWidth: window.innerWidth
          };
        })()`);
        if (opened.pointerEvents !== 'none' && opened.opacity >= 0.9 && opened.drawerLeft < opened.viewportWidth) break;
        await sleep(50);
      }

      if (opened.pointerEvents === 'none' || opened.opacity < 0.5) {
        s2Failures.push(`Drawer overlay did not open cleanly (pointerEvents=${opened.pointerEvents}, opacity=${opened.opacity})`);
      }
      if (opened.drawerLeft >= opened.viewportWidth) {
        s2Failures.push(`#fcMobileDrawer did not slide into viewport (left=${opened.drawerLeft}, innerWidth=${opened.viewportWidth})`);
      }

      // Close drawer cleanly
      const closeClicked = await scrollAndClickSelector(cdp, '#fcMobileDrawer button[aria-label*="Close" i]');
      if (!closeClicked.clicked) {
        s2Failures.push('Could not find close button inside #fcMobileDrawer');
      } else {
        let closed = null;
        const closeDeadline = Date.now() + 2500;
        while (Date.now() < closeDeadline) {
          closed = await cdp.evaluate(`(() => {
            const overlay = document.getElementById('fcMobileDrawerOverlay');
            const drawer = document.getElementById('fcMobileDrawer');
            return {
              pointerEvents: getComputedStyle(overlay).pointerEvents,
              drawerLeft: drawer.getBoundingClientRect().left,
              viewportWidth: window.innerWidth
            };
          })()`);
          if (closed.pointerEvents === 'none' && closed.drawerLeft >= closed.viewportWidth - 2) break;
          await sleep(50);
        }
        if (closed.pointerEvents !== 'none') {
          s2Failures.push(`Drawer overlay did not return to pointerEvents="none" after close (got "${closed.pointerEvents}")`);
        }
        if (closed.drawerLeft < closed.viewportWidth - 2) {
          s2Failures.push(`#fcMobileDrawer did not slide back off-screen after close (left=${closed.drawerLeft})`);
        }
      }
    }

    const errs = tracker.snapshotErrors();
    if (errs.runtimeExceptions.length > 0) {
      s2Failures.push(`Mobile drawer flow threw JS exception(s): ${errs.runtimeExceptions.join('; ')}`);
    }

    results.push({
      tier: 4,
      name: 'T4.mobile_drawer',
      passed: s2Failures.length === 0,
      summary: s2Failures.length === 0 ? 'Mobile menu button, bottom nav, drawer open & close verified' : 'Mobile drawer check failed',
      failures: s2Failures
    });
  }

  // Scenario S3: Lead Audit Modal flow (openAuditModal trigger -> stays on page -> modal open -> valid service -> close)
  {
    tracker.clearRuntimeErrorsOnly();
    const s3Failures = [];

    const triggerInfo = await cdp.evaluate(`(() => {
      const candidates = Array.from(document.querySelectorAll('a[onclick*="openAuditModal"], button[onclick*="openAuditModal"]'));
      const vis = candidates.find((el) => {
        const r = el.getBoundingClientRect();
        const s = getComputedStyle(el);
        return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
      });
      if (!vis) return { found: false };
      vis.setAttribute('data-e2e-audit-trigger', '1');
      return { found: true, pathname: location.pathname };
    })()`);

    if (!triggerInfo || !triggerInfo.found) {
      s3Failures.push('No visible openAuditModal CTA trigger found');
    } else {
      await scrollAndClickSelector(cdp, '[data-e2e-audit-trigger="1"]');
      let afterOpen = null;
      const openDeadline = Date.now() + 2500;
      while (Date.now() < openDeadline) {
        afterOpen = await cdp.evaluate(`(() => {
          const modal = document.getElementById('fcAuditModal');
          const select = document.getElementById('fcAuditServiceSelect');
          const closeBtn = document.getElementById('fcAuditCloseBtn');
          const ms = modal ? getComputedStyle(modal) : null;
          return {
            pathname: location.pathname,
            hasModal: !!modal,
            opacity: ms ? ms.opacity : null,
            pointerEvents: ms ? ms.pointerEvents : null,
            serviceValue: select ? select.value : '',
            hasCloseBtn: !!closeBtn,
            closeBtnType: closeBtn ? closeBtn.getAttribute('type') : null
          };
        })()`);
        if (afterOpen.pathname !== triggerInfo.pathname) break;
        if (afterOpen.hasModal && afterOpen.pointerEvents !== 'none' && parseFloat(afterOpen.opacity || '0') >= 0.95) break;
        await sleep(50);
      }

      if (afterOpen.pathname !== triggerInfo.pathname) {
        s3Failures.push(`Clicking openAuditModal navigated away (${triggerInfo.pathname} -> ${afterOpen.pathname})`);
      } else if (!afterOpen.hasModal) {
        s3Failures.push('#fcAuditModal not present in DOM after clicking trigger');
      } else {
        if (parseFloat(afterOpen.opacity || '0') < 0.9 || afterOpen.pointerEvents === 'none') {
          s3Failures.push(`#fcAuditModal failed to open cleanly (opacity=${afterOpen.opacity}, pointerEvents=${afterOpen.pointerEvents})`);
        }
        if (!afterOpen.serviceValue || !afterOpen.serviceValue.trim()) {
          s3Failures.push('#fcAuditServiceSelect has empty selected value');
        }
        if (!afterOpen.hasCloseBtn) {
          s3Failures.push('#fcAuditCloseBtn missing');
        } else {
          if (afterOpen.closeBtnType !== 'button') {
            s3Failures.push(`#fcAuditCloseBtn missing type="button" (got ${afterOpen.closeBtnType})`);
          }
          await scrollAndClickSelector(cdp, '#fcAuditCloseBtn');
          let afterClose = null;
          const closeDeadline = Date.now() + 2500;
          while (Date.now() < closeDeadline) {
            afterClose = await cdp.evaluate(`(() => {
              const modal = document.getElementById('fcAuditModal');
              const ms = getComputedStyle(modal);
              return { opacity: ms.opacity, pointerEvents: ms.pointerEvents };
            })()`);
            if (afterClose.pointerEvents === 'none' && parseFloat(afterClose.opacity || '1') <= 0.05) break;
            await sleep(50);
          }
          if (afterClose.pointerEvents !== 'none' || parseFloat(afterClose.opacity || '1') > 0.1) {
            s3Failures.push(`#fcAuditModal failed to close cleanly (opacity=${afterClose.opacity}, pointerEvents=${afterClose.pointerEvents})`);
          }
        }
      }
    }

    const errs = tracker.snapshotErrors();
    if (errs.runtimeExceptions.length > 0) {
      s3Failures.push(`Audit modal flow threw JS exception(s): ${errs.runtimeExceptions.join('; ')}`);
    }

    results.push({
      tier: 4,
      name: 'T4.audit_modal_flow',
      passed: s3Failures.length === 0,
      summary: s3Failures.length === 0 ? `Audit modal opened & closed cleanly on ${pageName}` : 'Audit modal flow failed',
      failures: s3Failures
    });
  }

  void timeoutMs;
  return results;
}

// =============================================================================
// Matrix Orchestrator
// =============================================================================

async function runSuite(opts) {
  const chromePath = resolveChromeBinary(opts.chromePath);
  const { server, port: httpPort } = await startStaticServer();
  let chromeCtx = null;

  const logHuman = (line) => {
    if (!opts.json) process.stdout.write(`${line}\n`);
  };

  let signalCleanupRunning = false;
  const handleSignal = async (sig) => {
    if (signalCleanupRunning) return;
    signalCleanupRunning = true;
    await cleanupChrome(chromeCtx);
    try { server.closeAllConnections?.(); server.close(); } catch {}
    process.stderr.write(`\nAborted on ${sig}; cleaned up Chrome and HTTP server.\n`);
    process.exit(2);
  };
  process.once('SIGINT', () => handleSignal('SIGINT'));
  process.once('SIGTERM', () => handleSignal('SIGTERM'));

  try {
    chromeCtx = await launchChrome(chromePath, opts.timeoutMs);
    const { pageCdp } = chromeCtx;

    await pageCdp.send('Page.enable', {}, opts.timeoutMs);
    await pageCdp.send('Network.enable', {}, opts.timeoutMs);
    await pageCdp.send('Runtime.enable', {}, opts.timeoutMs);
    await pageCdp.send('Log.enable', {}, opts.timeoutMs);

    const tracker = createNetworkAndRuntimeTracker(pageCdp, opts);

    const matrixResults = [];
    const allFailures = [];
    let totalChecks = 0;
    let passedChecks = 0;
    let failedChecks = 0;
    let abortedEarly = false;

    const recordCheck = (matrixObj, checkObj) => {
      totalChecks++;
      if (checkObj.passed) {
        passedChecks++;
      } else {
        failedChecks++;
        allFailures.push({
          page: matrixObj.page,
          viewport: matrixObj.viewport,
          tier: checkObj.tier,
          check: checkObj.name,
          summary: checkObj.summary,
          details: checkObj.failures
        });
      }
      matrixObj.checks.push(checkObj);
      if (!opts.json) {
        const badge = checkObj.passed ? 'PASS' : 'FAIL';
        logHuman(`  [${badge}] T${checkObj.tier} ${checkObj.name} — ${checkObj.summary}`);
        if (!checkObj.passed && Array.isArray(checkObj.failures)) {
          for (const f of checkObj.failures.slice(0, 5)) {
            logHuman(`         -> ${typeof f === 'string' ? f : JSON.stringify(f)}`);
          }
          if (checkObj.failures.length > 5) {
            logHuman(`         -> ... (${checkObj.failures.length - 5} more)`);
          }
        }
      }
    };

    const hasDesktopViewport = opts.viewports.some((v) => !v.mobile && v.width >= 1024);

    for (const pageName of opts.pages) {
      if (abortedEarly) break;

      for (const vp of opts.viewports) {
        if (abortedEarly) break;

        const url = `http://127.0.0.1:${httpPort}/${pageName}`;
        logHuman(`\n=== ${pageName} @ ${vp.name} ===`);

        await navigateAndSettle(pageCdp, tracker, url, vp, opts.timeoutMs);

        const matrixObj = {
          page: pageName,
          viewport: vp.name,
          checks: []
        };

        // ---------------------------------------------------------------------
        // TIER 1: Feature & Asset Coverage
        // ---------------------------------------------------------------------
        if (opts.tiers.has(1)) {
          const loadErrs = tracker.snapshotErrors();
          const t1NetFailures = [];
          for (const br of loadErrs.badResponses) {
            t1NetFailures.push(`HTTP ${br.status} (${br.type}): ${br.url}`);
          }
          for (const nf of loadErrs.networkFailures) {
            t1NetFailures.push(`Network failure (${nf.type} ${nf.errorText}): ${nf.url}`);
          }
          for (const ce of loadErrs.consoleErrors) {
            t1NetFailures.push(`console.error: ${ce}`);
          }
          for (const re of loadErrs.runtimeExceptions) {
            t1NetFailures.push(`Runtime.exceptionThrown: ${re}`);
          }
          for (const le of loadErrs.logErrors) {
            t1NetFailures.push(`Log.error (${le.source}): ${le.text}`);
          }

          recordCheck(matrixObj, {
            tier: 1,
            name: 'T1.runtime_and_network',
            passed: t1NetFailures.length === 0,
            summary: t1NetFailures.length === 0 ? '0 HTTP 4xx/5xx, 0 console/runtime errors' : `${t1NetFailures.length} runtime/network error(s)`,
            failures: t1NetFailures
          });
          if (opts.failFast && failedChecks > 0) { abortedEarly = true; matrixResults.push(matrixObj); break; }

          await triggerLazyImagesAndSettle(pageCdp);
          const domT1 = await pageCdp.evaluate(EVAL_TIER1_ASSETS_AND_DEPTH);

          recordCheck(matrixObj, {
            tier: 1,
            name: 'T1.images_loaded',
            passed: domT1.brokenImages.length === 0 && domT1.totalImages > 0,
            summary: domT1.brokenImages.length === 0
              ? `All ${domT1.totalImages} <img> elements loaded (naturalWidth > 0)`
              : `${domT1.brokenImages.length}/${domT1.totalImages} broken images`,
            failures: domT1.totalImages === 0 ? ['Zero <img> elements found'] : domT1.brokenImages
          });
          if (opts.failFast && failedChecks > 0) { abortedEarly = true; matrixResults.push(matrixObj); break; }

          const twFailures = [];
          if (domT1.cdnTailwindCount > 0) twFailures.push(`Found ${domT1.cdnTailwindCount} cdn.tailwindcss.com reference(s)`);
          if (!domT1.hasStylesMinLink) twFailures.push('Missing <link rel="stylesheet" href*="styles.min.css">');
          if (!domT1.styleSheetLoaded) twFailures.push('css/styles.min.css stylesheet did not load/apply cleanly');

          recordCheck(matrixObj, {
            tier: 1,
            name: 'T1.tailwind_compiled',
            passed: twFailures.length === 0,
            summary: twFailures.length === 0 ? 'styles.min.css active, 0 cdn.tailwindcss.com' : twFailures.join('; '),
            failures: twFailures
          });
          if (opts.failFast && failedChecks > 0) { abortedEarly = true; matrixResults.push(matrixObj); break; }

          const depthFailures = [];
          if (domT1.dataVizSvgCount < 1) depthFailures.push(`Expected >= 1 inline <svg> data-viz (>=60x40px), found ${domT1.dataVizSvgCount}`);
          if (domT1.interactiveControlCount < 1) depthFailures.push('Expected >= 1 interactive control (tabs/accordions/calculators/simulators/forms), found 0');
          if (domT1.auditCtaCount < 1) depthFailures.push('Missing visible openAuditModal CTA trigger');
          if (domT1.wordCount < 800) depthFailures.push(`Body content word count ${domT1.wordCount} < 800 minimum`);

          recordCheck(matrixObj, {
            tier: 1,
            name: 'T1.content_and_depth',
            passed: depthFailures.length === 0,
            summary: `words=${domT1.wordCount}, svgs=${domT1.dataVizSvgCount}, controls=${domT1.interactiveControlCount}, auditCTAs=${domT1.auditCtaCount}`,
            failures: depthFailures
          });
          if (opts.failFast && failedChecks > 0) { abortedEarly = true; matrixResults.push(matrixObj); break; }
        }

        // ---------------------------------------------------------------------
        // TIER 2: Boundary, Viewport & Pure-White Compliance
        // ---------------------------------------------------------------------
        if (opts.tiers.has(2)) {
          const overflow = await pageCdp.evaluate(EVAL_TIER2_OVERFLOW);
          const ovFailures = [];
          if (overflow.docScrollWidth > overflow.viewportWidth + 1) {
            ovFailures.push(`documentElement.scrollWidth (${overflow.docScrollWidth}) > innerWidth (${overflow.viewportWidth})`);
          }
          for (const el of overflow.overflowingElements || []) {
            ovFailures.push(el);
          }

          recordCheck(matrixObj, {
            tier: 2,
            name: 'T2.zero_horizontal_overflow',
            passed: overflow.passed,
            summary: `scrollWidth=${overflow.docScrollWidth}/${overflow.viewportWidth}, overflowing=${overflow.overflowingElements.length}`,
            failures: ovFailures
          });
          if (opts.failFast && failedChecks > 0) { abortedEarly = true; matrixResults.push(matrixObj); break; }

          if (!vp.mobile && vp.width >= 1024) {
            const navAudit = await pageCdp.evaluate(EVAL_TIER2_SINGLE_LINE_NAV);
            recordCheck(matrixObj, {
              tier: 2,
              name: 'T2.single_line_desktop_nav',
              passed: navAudit.passed,
              summary: navAudit.passed
                ? `${navAudit.triggerCount} top-level triggers single-line (spread=${navAudit.rowSpreadPx}px)`
                : `${(navAudit.issues || []).length} header nav wrap/overflow issue(s)`,
              failures: navAudit.issues || []
            });
            if (opts.failFast && failedChecks > 0) { abortedEarly = true; matrixResults.push(matrixObj); break; }
          }

          const pwAudit = await pageCdp.evaluate(EVAL_TIER2_PURE_WHITE);
          recordCheck(matrixObj, {
            tier: 2,
            name: 'T2.pure_white_compliance',
            passed: pwAudit.passed,
            summary: pwAudit.passed ? '0 dark backgrounds/overlays/buttons' : `${pwAudit.violationCount} dark surface/gradient violation(s)`,
            failures: pwAudit.violations || []
          });
          if (opts.failFast && failedChecks > 0) { abortedEarly = true; matrixResults.push(matrixObj); break; }
        }

        // ---------------------------------------------------------------------
        // TIER 3: Automated A11y & Contrast + Interactive Smoke
        // ---------------------------------------------------------------------
        if (opts.tiers.has(3)) {
          const a11yAudit = await pageCdp.evaluate(EVAL_TIER3_A11Y_CONTRAST);
          const a11yFailures = [
            ...(a11yAudit.failures || []),
            ...(a11yAudit.contrastFailures || [])
          ];
          recordCheck(matrixObj, {
            tier: 3,
            name: 'T3.a11y_and_contrast',
            passed: a11yAudit.passed,
            summary: `a11yIssues=${a11yAudit.a11yIssueCount}, contrastIssues=${a11yAudit.contrastFailureCount}`,
            failures: a11yFailures
          });
          if (opts.failFast && failedChecks > 0) { abortedEarly = true; matrixResults.push(matrixObj); break; }

          // Run interactive smoke on desktop primary viewport (1440x900, or first desktop, or mobile if only mobile requested)
          const shouldRunInteractiveHere =
            vp.name === '1440x900' ||
            (!opts.viewports.some((v) => v.name === '1440x900') &&
              ((!vp.mobile && vp.width >= 1024 && vp.name === opts.viewports.find((v) => !v.mobile && v.width >= 1024)?.name) ||
                (!hasDesktopViewport && vp.name === opts.viewports[0].name)));

          if (shouldRunInteractiveHere) {
            const smoke = await runTier3InteractiveSmoke(pageCdp, tracker, vp);
            recordCheck(matrixObj, {
              tier: 3,
              name: 'T3.interactive_smoke',
              passed: smoke.passed,
              summary: smoke.passed ? `${smoke.details.length} interactive action(s) verified` : `${smoke.failures.length} interactive failure(s)`,
              failures: smoke.failures
            });
            if (opts.failFast && failedChecks > 0) { abortedEarly = true; matrixResults.push(matrixObj); break; }

            // Re-navigate clean if Tier 4 also runs on this exact matrix so Tier 3 clicks don't pollute Tier 4 initial state
            if (opts.tiers.has(4)) {
              await navigateAndSettle(pageCdp, tracker, url, vp, opts.timeoutMs);
            }
          }
        }

        // ---------------------------------------------------------------------
        // TIER 4: Client End-to-End Scenarios
        // ---------------------------------------------------------------------
        if (opts.tiers.has(4)) {
          const isPrimaryDesktopForT4 =
            vp.name === '1440x900' ||
            (!opts.viewports.some((v) => v.name === '1440x900') && !vp.mobile && vp.width >= 1024 && vp.name === opts.viewports.find((v) => !v.mobile && v.width >= 1024)?.name);
          const isPrimaryMobileForT4 = vp.mobile || vp.width < 768;

          if (isPrimaryDesktopForT4 || isPrimaryMobileForT4) {
            const t4Results = await runTier4Scenarios(pageCdp, tracker, pageName, vp, httpPort, opts.timeoutMs);
            for (const chk of t4Results) {
              recordCheck(matrixObj, chk);
              if (opts.failFast && failedChecks > 0) { abortedEarly = true; break; }
            }
          }
        }

        matrixResults.push(matrixObj);
      }
    }

    const report = {
      summary: {
        totalMatrices: matrixResults.length,
        totalChecks,
        passedChecks,
        failedChecks,
        abortedEarly,
        chromeVersion: 'headless-cdp',
        offlineIgnoreCdn: opts.offlineIgnoreCdn
      },
      targetPages: opts.pages,
      viewports: opts.viewports.map((v) => v.name),
      tiers: Array.from(opts.tiers).sort(),
      results: matrixResults,
      failures: allFailures
    };

    if (opts.json) {
      process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    } else {
      logHuman('\n============================================================');
      logHuman(`E2E CDP Summary: ${passedChecks}/${totalChecks} checks passed, ${failedChecks} failed across ${matrixResults.length} page-viewport matrices.`);
      logHuman('============================================================');
    }

    return failedChecks === 0 ? 0 : 1;
  } finally {
    await cleanupChrome(chromeCtx);
    try {
      server.closeAllConnections?.();
      server.close();
    } catch {}
  }
}

async function main() {
  let opts;
  try {
    opts = parseCliArgs(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`CLI Error: ${err.message}\nRun with --help for usage.\n`);
    process.exit(2);
  }

  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  try {
    const exitCode = await runSuite(opts);
    process.exit(exitCode);
  } catch (err) {
    process.stderr.write(`Infrastructure Error: ${err.message}\n`);
    process.exit(2);
  }
}

main();

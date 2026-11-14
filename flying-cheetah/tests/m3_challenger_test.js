/**
 * Challenger M3-2: Empirical & Adversarial Deployment Hygiene Test Suite
 * Stress-tests .vercelignore pattern matching, file integrity, magic bytes,
 * git boundaries, and web asset non-exclusion.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const assert = require('assert');

const ROOT_DIR = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// 1. Coursework & Non-Web Document Inventory (Exact 19 files)
// ---------------------------------------------------------------------------
const EXPECTED_NON_WEB_FILES = [
  { name: '9505b5e1-f5c2-4201-bd90-c8fc0bfb3afc.pdf', minSize: 1000000, type: 'pdf' },
  { name: 'blender-5.3.0-windows-x64.msi', minSize: 300000000, type: 'msi' },
  { name: 'EDC-SLA-31-34.docx', minSize: 100000, type: 'docx' },
  { name: 'Electronics UNIT-3  COMBINED NOTES_57858615_2025_06_04_18_53.pdf', minSize: 10000000, type: 'pdf' },
  { name: 'EXP MDM 7.docx', minSize: 50000, type: 'docx' },
  { name: 'EXP MDM 7.pdf', minSize: 100000, type: 'pdf' },
  { name: 'Financial Planning ECN.pptx', minSize: 20000000, type: 'pptx' },
  { name: 'Flying_Cheetah_Master_Workflow_and_Establishment_Blueprint.pdf', minSize: 1000000, type: 'pdf' },
  { name: 'generate_assets.py', minSize: 5000, type: 'py' },
  { name: 'generate_minimal_assets.py', minSize: 10000, type: 'py' },
  { name: 'module1 (1).pdf', minSize: 1000000, type: 'pdf' },
  { name: 'module2_DK.pdf', minSize: 1000000, type: 'pdf' },
  { name: 'module3Robot vision [Autosaved].pdf', minSize: 1000000, type: 'pdf' },
  { name: 'module4_Trajectory Planning.pdf', minSize: 1000000, type: 'pdf' },
  { name: 'QP Sem3 Dec 2025.pdf', minSize: 5000000, type: 'pdf' },
  { name: 'schema.sql', minSize: 5000, type: 'sql' },
  { name: 'supabase_schema_expansion.sql', minSize: 10000, type: 'sql' },
  { name: 'Verilog_Notes.pdf', minSize: 1000000, type: 'pdf' },
  { name: '_._.pdf', minSize: 100000, type: 'pdf' }
];

console.log('=== TEST 1: Coursework Preservation & File Integrity (Magic Bytes) ===');
let totalBytes = 0;
const fileHashes = {};

EXPECTED_NON_WEB_FILES.forEach(item => {
  const filePath = path.join(ROOT_DIR, item.name);
  assert.ok(fs.existsSync(filePath), `CRITICAL: File missing from disk: ${item.name}`);

  const stat = fs.statSync(filePath);
  assert.ok(stat.size > 0, `CRITICAL: File is 0-byte: ${item.name}`);
  assert.ok(stat.size >= item.minSize, `CRITICAL: File size suspiciously small: ${item.name} (${stat.size} bytes)`);
  totalBytes += stat.size;

  const buf = Buffer.alloc(16);
  const fd = fs.openSync(filePath, 'r');
  fs.readSync(fd, buf, 0, 16, 0);
  fs.closeSync(fd);

  // Validate magic bytes
  if (item.type === 'pdf') {
    assert.strictEqual(buf.subarray(0, 5).toString(), '%PDF-', `Corrupted PDF header in ${item.name}`);
  } else if (item.type === 'docx' || item.type === 'pptx') {
    assert.ok(buf[0] === 0x50 && buf[1] === 0x4B, `Corrupted OOXML/ZIP header in ${item.name}`);
  } else if (item.type === 'msi') {
    assert.ok(buf[0] === 0xD0 && buf[1] === 0xCF && buf[2] === 0x11 && buf[3] === 0xE0, `Corrupted MSI/OLE header in ${item.name}`);
  } else if (item.type === 'sql') {
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes('TABLE') || content.includes('CREATE') || content.includes('FUNCTION'), `Invalid SQL content in ${item.name}`);
  } else if (item.type === 'py') {
    const content = fs.readFileSync(filePath, 'utf8');
    assert.ok(content.includes('import') || content.includes('def') || content.includes('#!'), `Invalid Python content in ${item.name}`);
  }

  const hash = crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex').toUpperCase();
  fileHashes[item.name] = { size: stat.size, sha256: hash };
  console.log(`  [OK] ${item.name} | Size: ${stat.size} bytes | Magic Verified | SHA256: ${hash.substring(0, 16)}...`);
});

assert.strictEqual(EXPECTED_NON_WEB_FILES.length, 19, 'Mismatch in expected file count');
assert.strictEqual(totalBytes, 446571660, `Aggregate size mismatch: expected 446571660, got ${totalBytes}`);
console.log(`PASS: All 19 non-web files intact, non-empty, valid magic headers, total ${totalBytes} bytes.\n`);

// ---------------------------------------------------------------------------
// 2. Vercelignore Parser & Glob Engine Simulation
// ---------------------------------------------------------------------------
console.log('=== TEST 2: Adversarial .vercelignore Glob Matching Engine ===');

function parseVercelIgnore(content) {
  const lines = content.split(/\r?\n/);
  const rules = [];

  for (let raw of lines) {
    let line = raw.trim();
    if (!line || line.startsWith('#')) continue;

    let negative = false;
    if (line.startsWith('!')) {
      negative = true;
      line = line.slice(1);
    }

    const dirOnly = line.endsWith('/');
    if (dirOnly) {
      line = line.slice(0, -1);
    }

    // Convert gitignore glob pattern to RegExp
    let isRooted = false;
    if (line.startsWith('/')) {
      isRooted = true;
      line = line.slice(1);
    } else if (line.includes('/')) {
      isRooted = true; // gitignore rule: if slash anywhere in pattern (not trailing), relative to root
    }

    // Escape regex characters except glob wildcards * and ?
    let regexStr = '';
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '*') {
        if (line[i + 1] === '*') {
          // **
          if (line[i + 2] === '/') {
            regexStr += '(?:.+/)?';
            i += 2;
          } else {
            regexStr += '.*';
            i++;
          }
        } else {
          // single * matches anything except /
          regexStr += '[^/]*';
        }
      } else if (c === '?') {
        regexStr += '[^/]';
      } else if (c === '.') {
        regexStr += '\\.';
      } else if ('+^$()|{}[]\\'.includes(c)) {
        regexStr += '\\' + c;
      } else {
        regexStr += c;
      }
    }

    let regex;
    if (isRooted) {
      regex = new RegExp('^' + regexStr + (dirOnly ? '(?=/|$)' : '$'), 'i');
    } else {
      regex = new RegExp('(?:^|/)' + regexStr + (dirOnly ? '(?=/|$)' : '$'), 'i');
    }

    rules.push({
      pattern: raw.trim(),
      regex,
      negative,
      dirOnly
    });
  }

  return rules;
}

function isPathIgnored(testPath, rules, isDirectory = false) {
  // Normalize to POSIX slashes and strip leading slash
  let norm = testPath.replace(/\\/g, '/').replace(/^\/+/, '');
  let ignored = false;
  let matchingRule = null;

  for (const rule of rules) {
    if (rule.dirOnly && !isDirectory) {
      // Check if testPath is inside this directory
      // e.g. tests/ matches tests/foo.js
      const dirPrefixRegex = new RegExp('^' + rule.regex.source.replace('\\$', '') + '/');
      if (dirPrefixRegex.test(norm)) {
        ignored = !rule.negative;
        matchingRule = rule.pattern;
      }
      continue;
    }

    if (rule.regex.test(norm)) {
      ignored = !rule.negative;
      matchingRule = rule.pattern;
    }
  }

  return { ignored, matchingRule };
}

const ignoreContent = fs.readFileSync(path.join(ROOT_DIR, '.vercelignore'), 'utf8');
const rules = parseVercelIgnore(ignoreContent);
console.log(`Loaded ${rules.length} active ignore rules from .vercelignore.`);

// Check all 19 real coursework/non-web documents
console.log('\n--- Checking 19 Real Coursework Files against .vercelignore ---');
let caughtCount = 0;
EXPECTED_NON_WEB_FILES.forEach(item => {
  const res = isPathIgnored(item.name, rules, false);
  assert.ok(res.ignored, `FAILED: ${item.name} was NOT ignored! Matching rule was null.`);
  caughtCount++;
  console.log(`  [IGNORED] ${item.name} -> Rule: "${res.matchingRule}"`);
});
assert.strictEqual(caughtCount, 19, 'Not all 19 files were ignored');
console.log(`PASS: 100% of coursework/non-web documents (19/19) are ignored by .vercelignore.\n`);

// ---------------------------------------------------------------------------
// 3. Adversarial Edge Case Filenames Simulation
// ---------------------------------------------------------------------------
console.log('--- Testing Adversarial Edge-Case Filenames ---');
const ADVERSARIAL_TEST_CASES = [
  // Spaces and brackets in coursework filenames
  { path: 'module1 (1).pdf', shouldIgnore: true, desc: 'Parentheses and spaces in PDF' },
  { path: 'module3Robot vision [Autosaved].pdf', shouldIgnore: true, desc: 'Square brackets and spaces in PDF' },
  { path: 'Electronics UNIT-3  COMBINED NOTES_57858615_2025_06_04_18_53.pdf', shouldIgnore: true, desc: 'Multiple consecutive spaces in PDF' },
  { path: '_._.pdf', shouldIgnore: true, desc: 'Multiple dots and underscores' },
  { path: 'EXP MDM 7.docx', shouldIgnore: true, desc: 'Spaces in DOCX' },
  { path: 'Financial Planning ECN.pptx', shouldIgnore: true, desc: 'Spaces in PPTX' },
  { path: 'blender-5.3.0-windows-x64.msi', shouldIgnore: true, desc: 'Dots and dashes in MSI' },
  { path: 'subfolder/deep/module3Robot vision [Autosaved].pdf', shouldIgnore: true, desc: 'Nested brackets PDF' },
  { path: 'coursework/drafts/notes [v1] (final).docx', shouldIgnore: true, desc: 'Nested spaces and brackets DOCX' },
  
  // Security exclusions: SQL, env, keys
  { path: 'schema.sql', shouldIgnore: true, desc: 'Root schema SQL' },
  { path: 'migrations/20261113_add_leads.sql', shouldIgnore: true, desc: 'Nested migration SQL' },
  { path: '.env', shouldIgnore: true, desc: 'Root .env' },
  { path: '.env.local', shouldIgnore: true, desc: 'Root .env.local' },
  { path: '.env.production.local', shouldIgnore: true, desc: 'Root .env.production.local' },
  { path: 'api/.env.secret', shouldIgnore: true, desc: 'Subdir .env' },
  { path: 'certs/server.key', shouldIgnore: true, desc: 'Private key' },
  { path: 'certs/bundle.pem', shouldIgnore: true, desc: 'PEM cert' },
  { path: 'client_secret_xyz123.json', shouldIgnore: true, desc: 'OAuth client secret JSON' },
  { path: 'test_script.py', shouldIgnore: true, desc: 'Root Python script' },
  { path: 'backend/util.pyc', shouldIgnore: true, desc: 'Compiled bytecode' },
  { path: '__pycache__/cache.pyc', shouldIgnore: true, desc: 'Python cache' },
  
  // Binaries & Installers
  { path: 'blender_installer.msi', shouldIgnore: true, desc: 'Blender installer MSI' },
  { path: 'setup.exe', shouldIgnore: true, desc: 'Windows executable' },
  { path: 'backup.zip', shouldIgnore: true, desc: 'ZIP archive' },
  { path: 'archive.tar.gz', shouldIgnore: true, desc: 'TAR GZ archive' },
  { path: 'image.iso', shouldIgnore: true, desc: 'ISO disk image' },
  
  // Test directories & artifacts
  { path: 'tests/auth.test.js', shouldIgnore: true, desc: 'Test suite file in tests/' },
  { path: 'test/mailer.spec.js', shouldIgnore: true, desc: 'Test spec file' },
  { path: 'api/auth.test.js', shouldIgnore: true, desc: 'Co-located test file' },
  
  // System metadata
  { path: '.DS_Store', shouldIgnore: true, desc: 'macOS DS_Store' },
  { path: 'nested/.DS_Store', shouldIgnore: true, desc: 'Nested macOS DS_Store' },
  { path: 'Thumbs.db', shouldIgnore: true, desc: 'Windows Thumbs.db' },
  { path: '.vscode/settings.json', shouldIgnore: true, desc: 'VSCode settings' }
];

ADVERSARIAL_TEST_CASES.forEach(tc => {
  const res = isPathIgnored(tc.path, rules, false);
  assert.strictEqual(
    res.ignored,
    tc.shouldIgnore,
    `ADVERSARIAL FAILURE: Expected ${tc.path} to be ignored (${tc.desc}), but got ignored=${res.ignored}`
  );
  console.log(`  [PASS] ${tc.path.padEnd(50)} -> Ignored: ${res.ignored} (Rule: "${res.matchingRule}")`);
});
console.log(`PASS: All ${ADVERSARIAL_TEST_CASES.length} adversarial edge-case filenames correctly ignored.\n`);

// ---------------------------------------------------------------------------
// 4. Critical Web Assets Protection (False Positives Test)
// ---------------------------------------------------------------------------
console.log('=== TEST 3: Critical Web Assets Non-Exclusion (Zero False Positives) ===');
const CRITICAL_WEB_ASSETS = [
  // HTML pages
  'index.html',
  'about.html',
  'home.html',
  'admin.html',
  'store.html',
  'solutions.html',
  'ai-voice-agents.html',
  'ctwa-automation.html',
  'customer-data-platform.html',
  'customer-support.html',
  'delivery.html',
  'demo.html',
  'email-marketing.html',
  'instagram-automation.html',
  'privacy-policy.html',
  'rcs-messaging.html',
  'refund-policy.html',
  'sms-marketing.html',
  'store-automation.html',
  'terms-of-service.html',
  'web-development.html',
  'whatsapp-automation.html',
  'whatsapp-calling.html',
  'whatsapp-marketing.html',

  // Config & SEO
  'vercel.json',
  'sitemap.xml',
  'robots.txt',
  'favicon.ico',

  // Founder branding photos
  'bhagat.jpg',
  'Yash.jpg',
  'images/founder_bhagat_mukhiya.jpg',
  'images/founder_yash_gaikwad.jpg',
  'output-image.jpeg',
  'Web_Photo_Editor.jpg',
  'WhatsApp Image 2026-11-11 at 5.55.09 PM.jpeg',

  // Serverless APIs
  'api/_auth.js',
  'api/_mailer.js',
  'api/auth.js',
  'api/leads.js',
  'api/demos.js',
  'api/send-email.js',
  'api/fleet.js',

  // Client CSS & JS
  'css/mobile-app.css',
  'js/fc-widgets.js',
  'js/supabase-client.js',
  'js/supabase-config.js',
  'js/auth.js',
  'js/leads.js',

  // Critical videos in /videos/ directory (MUST NOT BE IGNORED by /*.mp4)
  'videos/fly.mp4',
  'videos/instagram_ai_chatbot_demo.mp4',
  'videos/whatsapp_ai_chatbot_demo.mp4'
];

let falsePositives = 0;
CRITICAL_WEB_ASSETS.forEach(assetPath => {
  const res = isPathIgnored(assetPath, rules, false);
  if (res.ignored) {
    console.error(`  [FALSE POSITIVE ERROR] ${assetPath} was ACCIDENTALLY IGNORED by rule "${res.matchingRule}"!`);
    falsePositives++;
  } else {
    console.log(`  [PRESERVED] ${assetPath.padEnd(45)} -> NOT ignored (Correct)`);
  }
});

assert.strictEqual(falsePositives, 0, `CRITICAL: ${falsePositives} essential web assets were ignored!`);
console.log(`PASS: Zero false positives. All ${CRITICAL_WEB_ASSETS.length} web assets preserved for deployment.\n`);

// ---------------------------------------------------------------------------
// 5. Special Focus: Root vs Subdirectory MP4 Behavior
// ---------------------------------------------------------------------------
console.log('=== TEST 4: Root MP4 vs Subdirectory MP4 Specific Behavior ===');
const rootMp4 = isPathIgnored('heavy_raw_video.mp4', rules, false);
const videosMp4 = isPathIgnored('videos/fly.mp4', rules, false);
const nestedMp4 = isPathIgnored('assets/sub/intro.mp4', rules, false);

console.log(`  heavy_raw_video.mp4 (root) -> Ignored: ${rootMp4.ignored} (Rule: "${rootMp4.matchingRule}")`);
console.log(`  videos/fly.mp4 (in videos/) -> Ignored: ${videosMp4.ignored} (Preserved for production)`);
console.log(`  assets/sub/intro.mp4 (nested) -> Ignored: ${nestedMp4.ignored} (Preserved)`);

assert.strictEqual(rootMp4.ignored, true, 'Root MP4 should be ignored by /*.mp4');
assert.strictEqual(videosMp4.ignored, false, 'videos/fly.mp4 MUST NOT be ignored');
assert.strictEqual(nestedMp4.ignored, false, 'nested MP4 MUST NOT be ignored');
console.log('PASS: Leading slash root anchor /*.mp4 functions with 100% precision.\n');

// ---------------------------------------------------------------------------
// 6. Founder Branding Cryptographic Hash Invariant Verification
// ---------------------------------------------------------------------------
console.log('=== TEST 5: Founder Branding Photo Hashes & about.html Parity ===');
const BRANDING_HASHES = [
  { path: 'bhagat.jpg', expected: 'B96FB7B76811994CB833F4BF55A8AA573B37D882CD2F590AEEFBC324BF06F7FD' },
  { path: 'images/founder_bhagat_mukhiya.jpg', expected: 'B96FB7B76811994CB833F4BF55A8AA573B37D882CD2F590AEEFBC324BF06F7FD' },
  { path: 'Yash.jpg', expected: '042997632BD24C789C09FE649260061C93D24466256DC1CEF4E3A82CFA618264' },
  { path: 'images/founder_yash_gaikwad.jpg', expected: '042997632BD24C789C09FE649260061C93D24466256DC1CEF4E3A82CFA618264' }
];

BRANDING_HASHES.forEach(b => {
  const p = path.join(ROOT_DIR, b.path);
  assert.ok(fs.existsSync(p), `Missing founder photo: ${b.path}`);
  const h = crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex').toUpperCase();
  assert.strictEqual(h, b.expected, `Cryptographic hash mismatch on ${b.path}`);
  console.log(`  [HASH MATCH] ${b.path} -> ${h}`);
});

// Inspect about.html
const aboutHtml = fs.readFileSync(path.join(ROOT_DIR, 'about.html'), 'utf8');
assert.ok(aboutHtml.includes('https://www.linkedin.com/in/bhagat-mukhiya-b74683380'), 'Bhagat LinkedIn missing in about.html');
assert.ok(aboutHtml.includes('https://www.linkedin.com/in/yash-gaikwad-1669b0397'), 'Yash LinkedIn missing in about.html');
assert.ok(aboutHtml.includes('images/founder_bhagat_mukhiya.jpg'), 'Bhagat photo ref missing');
assert.ok(aboutHtml.includes('images/founder_yash_gaikwad.jpg'), 'Yash photo ref missing');
assert.ok(aboutHtml.includes('<div class="pt-6 space-y-2.5">'), 'Proper vertical spacing wrapper missing in Yash card');
console.log('PASS: Founder photo hashes invariant and about.html parity confirmed.\n');

console.log('================================================================');
console.log('ALL ADVERSARIAL CHALLENGER VERIFICATION TESTS PASSED SUCCESSFULLY!');
console.log('================================================================');

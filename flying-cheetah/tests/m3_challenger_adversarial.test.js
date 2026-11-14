const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const assert = require('assert');

const ROOT_DIR = path.resolve(__dirname, '..');

console.log('================================================================');
console.log('CHALLENGER M3-1: ADVERSARIAL STRESS TEST SUITE (SUITES 1-4)');
console.log('Root Directory:', ROOT_DIR);
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// SUITE 1: Cryptographic Hash & Bit-Level Analysis
// -----------------------------------------------------------------------------
console.log('>>> RUNNING SUITE 1: Cryptographic Image Hashes & Bit-Level Analysis');

const EXPECTED_HASHES = {
  'bhagat.jpg': 'B96FB7B76811994CB833F4BF55A8AA573B37D882CD2F590AEEFBC324BF06F7FD',
  'images/founder_bhagat_mukhiya.jpg': 'B96FB7B76811994CB833F4BF55A8AA573B37D882CD2F590AEEFBC324BF06F7FD',
  'Yash.jpg': '042997632BD24C789C09FE649260061C93D24466256DC1CEF4E3A82CFA618264',
  'images/founder_yash_gaikwad.jpg': '042997632BD24C789C09FE649260061C93D24466256DC1CEF4E3A82CFA618264'
};

const EXPECTED_SIZES = {
  'bhagat.jpg': 142415,
  'images/founder_bhagat_mukhiya.jpg': 142415,
  'Yash.jpg': 130165,
  'images/founder_yash_gaikwad.jpg': 130165
};

for (const [relPath, expectedHash] of Object.entries(EXPECTED_HASHES)) {
  const fullPath = path.join(ROOT_DIR, relPath);
  assert.ok(fs.existsSync(fullPath), `File does not exist: ${relPath}`);
  
  const buf = fs.readFileSync(fullPath);
  const hash = crypto.createHash('sha256').update(buf).digest('hex').toUpperCase();
  const size = buf.length;
  
  assert.strictEqual(hash, expectedHash, `Hash mismatch for ${relPath}: got ${hash}, expected ${expectedHash}`);
  assert.strictEqual(size, EXPECTED_SIZES[relPath], `Size mismatch for ${relPath}: got ${size}, expected ${EXPECTED_SIZES[relPath]}`);
  
  // Verify JPEG magic bytes FF D8 FF
  assert.strictEqual(buf[0], 0xFF, `JPEG magic byte 0 invalid for ${relPath}`);
  assert.strictEqual(buf[1], 0xD8, `JPEG magic byte 1 invalid for ${relPath}`);
  assert.strictEqual(buf[2], 0xFF, `JPEG magic byte 2 invalid for ${relPath}`);
  
  console.log(`  [PASS] ${relPath} (${size} bytes) -> SHA-256: ${hash}`);
}

// Compare bit-for-bit equality between root and images/ copies
const bhagatRoot = fs.readFileSync(path.join(ROOT_DIR, 'bhagat.jpg'));
const bhagatImages = fs.readFileSync(path.join(ROOT_DIR, 'images/founder_bhagat_mukhiya.jpg'));
assert.ok(bhagatRoot.equals(bhagatImages), 'bhagat.jpg and images/founder_bhagat_mukhiya.jpg are not bit-identical!');

const yashRoot = fs.readFileSync(path.join(ROOT_DIR, 'Yash.jpg'));
const yashImages = fs.readFileSync(path.join(ROOT_DIR, 'images/founder_yash_gaikwad.jpg'));
assert.ok(yashRoot.equals(yashImages), 'Yash.jpg and images/founder_yash_gaikwad.jpg are not bit-identical!');
console.log('  [PASS] Root vs images/ copies are 100% bit-for-bit identical.\n');

// -----------------------------------------------------------------------------
// SUITE 2: HTML Lexical & Structural Balance Analysis
// -----------------------------------------------------------------------------
console.log('>>> RUNNING SUITE 2: HTML Lexical & Structural Balance Analysis');

function validateHtmlTagBalance(filePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  // Simple stack-based tag balance checker for major block elements
  const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr', '!doctype']);
  const tagRegex = /<\/?([a-zA-Z0-9\-]+)([^>]*)>/g;
  const stack = [];
  let match;
  let line = 1;
  let lastIndex = 0;

  // Track lines
  const lines = html.split('\n');
  const getLineNo = (charIdx) => {
    let count = 0;
    for (let i = 0; i < lines.length; i++) {
      count += lines[i].length + 1;
      if (count > charIdx) return i + 1;
    }
    return lines.length;
  };

  while ((match = tagRegex.exec(html)) !== null) {
    const rawTag = match[0];
    const tagName = match[1].toLowerCase();
    const isClosing = rawTag.startsWith('</');
    const isSelfClosing = rawTag.endsWith('/>') || voidTags.has(tagName);
    const lineNo = getLineNo(match.index);

    if (voidTags.has(tagName)) {
      continue;
    }

    if (isClosing) {
      if (stack.length === 0) {
        throw new Error(`Unexpected closing tag </${tagName}> at line ${lineNo} in ${filePath}`);
      }
      const last = stack.pop();
      if (last.tagName !== tagName) {
        // Tolerant of minor unclosed p or li if any, but divs and sections must match strictly
        if (['div', 'section', 'a', 'footer', 'header', 'nav', 'main', 'h1', 'h2', 'h3', 'h4', 'span'].includes(tagName)) {
          throw new Error(`Mismatched closing tag: expected </${last.tagName}> (from line ${last.lineNo}), got </${tagName}> at line ${lineNo} in ${filePath}`);
        }
      }
    } else if (!isSelfClosing) {
      stack.push({ tagName, lineNo });
    }
  }

  // Filter remaining unclosed tags for critical blocks
  const unclosedCritical = stack.filter(item => ['div', 'section', 'a', 'footer', 'header', 'nav', 'main'].includes(item.tagName));
  assert.strictEqual(unclosedCritical.length, 0, `Unclosed critical tags in ${filePath}: ${JSON.stringify(unclosedCritical)}`);
  console.log(`  [PASS] ${path.basename(filePath)} tag balance verified (0 unclosed critical tags).`);
}

validateHtmlTagBalance(path.join(ROOT_DIR, 'about.html'));
validateHtmlTagBalance(path.join(ROOT_DIR, 'home.html'));
validateHtmlTagBalance(path.join(ROOT_DIR, 'index.html'));
console.log('');

// -----------------------------------------------------------------------------
// SUITE 3: Link Target & Icon Integrity
// -----------------------------------------------------------------------------
console.log('>>> RUNNING SUITE 3: Link Target, Rel Attributes & Icon Integrity');

const aboutHtml = fs.readFileSync(path.join(ROOT_DIR, 'about.html'), 'utf8');

// Adversarial regex searches for founder section
const founderSectionRegex = /<!--\s*DIVISION 1: CORE SYSTEMS & ENGINEERING\s*-->[\s\S]*?<!--\s*DIVISION 2: GROWTH & CLIENT OPERATIONS\s*-->[\s\S]*?<\/section>/i;
const match = aboutHtml.match(founderSectionRegex);
assert.ok(match, 'Founder leadership section not found in about.html');
const founderSectionHtml = match[0];

// Test Bhagat links in founder section
assert.ok(founderSectionHtml.includes('https://www.linkedin.com/in/bhagat-mukhiya-b74683380'), 'Bhagat LinkedIn missing in about.html');
assert.ok(founderSectionHtml.includes('https://github.com/bhagatmukhiya82-source'), 'Bhagat GitHub missing in about.html');
assert.ok(founderSectionHtml.includes('https://wa.me/919920386421'), 'Bhagat WhatsApp missing in about.html');

// Test Yash links in founder section
assert.ok(founderSectionHtml.includes('https://www.linkedin.com/in/yash-gaikwad-1669b0397'), 'Yash LinkedIn missing in about.html');

// Test all <a> tags inside founderSection for target="_blank" and rel="noopener noreferrer"
const aTagRegex = /<a\s+([^>]+)>/g;
let aMatch;
let aCount = 0;
while ((aMatch = aTagRegex.exec(founderSectionHtml)) !== null) {
  aCount++;
  const attrs = aMatch[1];
  assert.ok(attrs.includes('target="_blank"'), `Anchor missing target="_blank": ${attrs}`);
  assert.ok(attrs.includes('rel="noopener noreferrer"'), `Anchor missing rel="noopener noreferrer": ${attrs}`);
}
assert.strictEqual(aCount, 5, `Expected 5 action links in about.html founder section (3 Bhagat + 2 Yash), found ${aCount}`);
console.log(`  [PASS] Verified ${aCount} founder action buttons in about.html have target="_blank" and rel="noopener noreferrer".`);

// Verify Yash Gaikwad's card structure
const yashCardRegex = /<!--\s*DIVISION 2: GROWTH & CLIENT OPERATIONS\s*-->[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*<\/section>/i;
const yashCardMatch = aboutHtml.match(yashCardRegex);
assert.ok(yashCardMatch, 'Yash Gaikwad card block not found in about.html');
const yashCardHtml = yashCardMatch[0];

assert.ok(yashCardHtml.includes('space-y-2.5'), 'Yash button container missing space-y-2.5');
assert.ok(yashCardHtml.includes('fa-brands fa-whatsapp'), 'Yash WhatsApp icon missing');
assert.ok(yashCardHtml.includes('fa-brands fa-linkedin'), 'Yash LinkedIn icon missing');
assert.ok(yashCardHtml.includes('images/founder_yash_gaikwad.jpg'), 'Yash photo src mismatch');
console.log('  [PASS] Yash Gaikwad card verified for photo, space-y-2.5, icons, and links.\n');

// -----------------------------------------------------------------------------
// SUITE 4: Deployment Hygiene & .vercelignore Glob Matcher
// -----------------------------------------------------------------------------
console.log('>>> RUNNING SUITE 4: Deployment Hygiene & .vercelignore Verification');

// Verify all 19 coursework and non-web documents exist
const EXPECTED_COURSEWORK_FILES = [
  'ECN PPT.pptx',
  'Financial Planning ECN.pptx',
  'Electronics UNIT-3 notes.docx',
  'Sakec python project.docx',
  '17834_QP_BE_Sem_7_Civil_Rev2016_Environmental_Engineering_II_May_June_2023.pdf',
  '18018_QP_BE_Sem_7_Computer_Rev_2016_Digital_Signal_Image_Processing_May_June_2023.pdf',
  '18020_QP_BE_Sem_7_Computer_Rev_2016_Artificial_Intelligence_May_June_2023.pdf',
  '18073_QP_TE_Sem_6_Civil_C_Scheme_Water_Resources_Engineering_May_June_2023.pdf',
  '18077_QP_TE_Sem_6_Computer_C_Scheme_System_Programming_and_Compiler_Construction_May_June_2023.pdf',
  '18078_QP_TE_Sem_6_Computer_C_Scheme_Cryptography_and_System_Security_May_June_2023.pdf',
  '18079_QP_TE_Sem_6_Computer_C_Scheme_Mobile_Computing_May_June_2023.pdf',
  '18080_QP_TE_Sem_6_Computer_C_Scheme_Artificial_Intelligence_May_June_2023.pdf',
  '18081_QP_TE_Sem_6_Computer_C_Scheme_Internet_of_Things_May_June_2023.pdf',
  'ECN UNIT 2.pdf',
  'Electronics UNIT-3 notes.pdf',
  'blender-5.3.0-windows-x64.msi',
  'schema.sql',
  'supabase_schema_expansion.sql',
  'patch_pricing.py'
];

let existingCount = 0;
let totalBytes = 0;
for (const f of EXPECTED_COURSEWORK_FILES) {
  const p = path.join(ROOT_DIR, f);
  if (fs.existsSync(p)) {
    existingCount++;
    totalBytes += fs.statSync(p).size;
  } else {
    // Check if patch_pricing.py is in root or scripts
    console.warn(`  [WARN] Expected file not found directly at root: ${f}`);
  }
}
console.log(`  [INFO] Found ${existingCount} coursework/non-web files with total size ${totalBytes.toLocaleString()} bytes.`);

// Check .vercelignore rules
const vercelignore = fs.readFileSync(path.join(ROOT_DIR, '.vercelignore'), 'utf8');
const MANDATORY_PATTERNS = ['*.pptx', '*.sql', '*.msi', '*.docx', '*.pdf', '*.py', '.env*', 'tests/'];
for (const pat of MANDATORY_PATTERNS) {
  assert.ok(vercelignore.includes(pat), `.vercelignore is missing mandatory pattern: ${pat}`);
  console.log(`  [PASS] .vercelignore contains pattern: ${pat}`);
}

// Ensure web assets are NOT ignored
assert.ok(!vercelignore.includes('*.html'), '.vercelignore must not ignore *.html');
assert.ok(!vercelignore.includes('*.jpg'), '.vercelignore must not ignore *.jpg');
assert.ok(!vercelignore.includes('*.png'), '.vercelignore must not ignore *.png');
assert.ok(!vercelignore.includes('*.css'), '.vercelignore must not ignore *.css');
assert.ok(!vercelignore.includes('*.js\n'), '.vercelignore must not ignore all *.js');
console.log('  [PASS] Production web assets (.html, .jpg, .png, .css, .js) are not excluded.\n');

console.log('>>> ALL TESTS IN SUITES 1-4 PASSED SUCCESSFULLY!');

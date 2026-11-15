const fs = require('fs');
const path = require('path');

const root = 'c:/AUTOMATION BUSSNIESS/flying-cheetah';
const p404Path = path.join(root, '404.html');

console.log('=== 404 Page Robustness Test ===');

if (!fs.existsSync(p404Path)) {
  console.error('FAIL: 404.html does not exist!');
  process.exit(1);
}

const content = fs.readFileSync(p404Path, 'utf8');
console.log('404.html file size:', content.length, 'bytes');

// 1. Tag balance analysis
const voidTags = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 
  'link', 'meta', 'param', 'source', 'track', 'wbr', '!doctype'
]);

const tagRegex = /<\/?([a-zA-Z0-9\-]+)(?:\s+[^>]*?)?(\/?)>/g;
let stack = [];
let m;
let tagErrors = [];

while ((m = tagRegex.exec(content)) !== null) {
  const isClosing = m[0].startsWith('</');
  const isSelfClosing = m[2] === '/' || m[0].endsWith('/>');
  const tagName = m[1].toLowerCase();

  if (tagName.startsWith('!--')) continue; // comments
  if (voidTags.has(tagName) || isSelfClosing) {
    continue;
  }

  if (isClosing) {
    if (stack.length === 0) {
      tagErrors.push(`Unexpected closing tag </${tagName}> at offset ${m.index}`);
    } else {
      const last = stack.pop();
      if (last.tagName !== tagName) {
        tagErrors.push(`Mismatched closing tag: expected </${last.tagName}> opened at ${last.index}, found </${tagName}> at ${m.index}`);
      }
    }
  } else {
    stack.push({ tagName, index: m.index });
  }
}

if (stack.length > 0) {
  stack.forEach(unclosed => {
    tagErrors.push(`Unclosed opening tag <${unclosed.tagName}> at offset ${unclosed.index}`);
  });
}

console.log('Tag balance errors:', tagErrors.length);
if (tagErrors.length > 0) {
  console.error('Tag errors:', tagErrors);
}

// 2. CSS Imports
const hasCompiledCss = content.includes('href="css/styles.min.css"') || content.includes("href='css/styles.min.css'");
const hasCdnTailwind = content.includes('cdn.tailwindcss.com');
console.log('Imports css/styles.min.css:', hasCompiledCss);
console.log('Has cdn.tailwindcss.com:', hasCdnTailwind);

// 3. Responsive Header & Hamburger
const hasMobileMenuBtn = content.includes('id="fcMobileMenuBtn"') || content.includes("id='fcMobileMenuBtn'");
const hasMobileMenu = content.includes('id="fcMobileMenu"') || content.includes("id='fcMobileMenu'");
const hasViewportMeta = content.includes('name="viewport"') || content.includes("name='viewport'");
console.log('Has viewport meta:', hasViewportMeta);
console.log('Has #fcMobileMenuBtn:', hasMobileMenuBtn);
console.log('Has #fcMobileMenu:', hasMobileMenu);

// 4. Recovery Buttons & Links
const linkRegex = /<a\s+[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gis;
let links = [];
while ((m = linkRegex.exec(content)) !== null) {
  const href = m[1];
  const text = m[2].replace(/<[^>]+>/g, '').trim();
  links.push({ href, text });
}

console.log('Recovery links found in 404.html:');
let missingTargets = 0;
for (const link of links) {
  console.log(`  - [${link.text || 'icon/image'}] -> ${link.href}`);
  if (!link.href.startsWith('http') && !link.href.startsWith('#') && !link.href.startsWith('mailto:') && !link.href.startsWith('tel:') && !link.href.startsWith('wa.me')) {
    const clean = link.href.split('?')[0].split('#')[0];
    if (clean && clean !== '/') {
      const target = path.resolve(root, clean);
      if (!fs.existsSync(target)) {
        console.error(`    FAIL: Target not found on disk: ${target}`);
        missingTargets++;
      }
    }
  }
}
console.log('Missing internal link targets:', missingTargets);

// Check primary recovery CTAs: Home, Live Demo
const hasHomeLink = links.some(l => l.href === 'index.html' || l.href === '/');
const hasDemoLink = links.some(l => l.href.includes('demo'));
console.log('Has Home recovery CTA:', hasHomeLink);
console.log('Has Demo recovery CTA:', hasDemoLink);

if (tagErrors.length > 0 || !hasCompiledCss || hasCdnTailwind || !hasMobileMenuBtn || missingTargets > 0 || !hasHomeLink) {
  console.error('FAIL: 404 Page Robustness test failed!');
  process.exit(1);
} else {
  console.log('404 Page Robustness: ALL CHECKS PASSED!');
}

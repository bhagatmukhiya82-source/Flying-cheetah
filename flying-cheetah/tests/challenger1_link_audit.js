const fs = require('fs');
const path = require('path');

const root = 'c:/AUTOMATION BUSSNIESS/flying-cheetah';
const htmlFiles = fs.readdirSync(root).filter(f => f.endsWith('.html'));

console.log('Total HTML files:', htmlFiles.length);

// 1. Check for home.html references
console.log('=== Checking for home.html references ===');
let homeLinks = [];
for (const file of htmlFiles) {
  const content = fs.readFileSync(path.join(root, file), 'utf8');
  // Check any href="...home.html..."
  const regex = /href=["']([^"']*home\.html[^"']*)["']/g;
  let m;
  let matches = [];
  while ((m = regex.exec(content)) !== null) {
    matches.push(m[1]);
  }
  if (matches.length > 0) {
    homeLinks.push({ file, matches });
  }
}
console.log('Links pointing to home.html in HTML files:', homeLinks);

// 2. Check for store.html references
console.log('=== Checking for store.html references ===');
let storeLinks = [];
for (const file of htmlFiles) {
  const content = fs.readFileSync(path.join(root, file), 'utf8');
  const regex = /href=["']([^"']*store\.html[^"']*)["']/g;
  let m;
  let matches = [];
  while ((m = regex.exec(content)) !== null) {
    matches.push(m[1]);
  }
  if (matches.length > 0) {
    storeLinks.push({ file, matches });
  }
}
console.log('Links pointing to store.html in HTML files:', storeLinks);

// 3. Scan ALL internal relative links across all HTML files to check for broken/dead targets
console.log('=== Checking all relative internal links across all HTML files ===');
let brokenLinks = [];
let totalLinksChecked = 0;

for (const file of htmlFiles) {
  const content = fs.readFileSync(path.join(root, file), 'utf8');
  const regex = /href=["']([^"']+)["']/g;
  let m;
  while ((m = regex.exec(content)) !== null) {
    const href = m[1].trim();
    // Ignore external links, mailto, tel, javascript, hash-only
    if (href.startsWith('http://') || href.startsWith('https://') || 
        href.startsWith('mailto:') || href.startsWith('tel:') || 
        href.startsWith('javascript:') || href.startsWith('#') ||
        href.startsWith('wa.me') || href.startsWith('upi:')) {
      continue;
    }
    
    totalLinksChecked++;
    // Extract pathname before ? or #
    const cleanHref = href.split('?')[0].split('#')[0];
    if (!cleanHref) continue; // href was just "#something" or "?something"
    
    // Check if target exists
    let targetPath = path.resolve(root, cleanHref);
    if (!fs.existsSync(targetPath)) {
      // Check if maybe it's "/" or a clean URL that maps to .html
      if (cleanHref === '/' || cleanHref === '') {
        // Root resolves to index.html
        continue;
      }
      const withHtml = path.resolve(root, cleanHref + '.html');
      if (fs.existsSync(withHtml)) {
        continue;
      }
      brokenLinks.push({ file, href, targetPath });
    }
  }
}

console.log('Total internal links checked:', totalLinksChecked);
console.log('Broken links found:', brokenLinks.length);
if (brokenLinks.length > 0) {
  console.log('Broken link details:', brokenLinks);
}

// 4. UPI Handling in store.html
console.log('=== Checking UPI Handling in store.html ===');
const storeContent = fs.readFileSync(path.join(root, 'store.html'), 'utf8');
const upiMatches = [...storeContent.matchAll(/upi:\/\/[^\s"']+/gi)];
console.log('Static upi:// URIs found in store.html:', upiMatches.length);
if (upiMatches.length > 0) {
  console.log('Matches:', upiMatches.map(m => m[0]));
}

const hasSandboxBadge = storeContent.includes('Interactive Sandbox Demo Mode');
console.log('Has Interactive Sandbox Demo Mode badge in store.html:', hasSandboxBadge);

const hasMerchantProfileCheck = storeContent.includes('merchant_upi_id') || storeContent.includes('getMerchantProfile');
console.log('Uses merchant profile or dynamic UPI:', hasMerchantProfileCheck);

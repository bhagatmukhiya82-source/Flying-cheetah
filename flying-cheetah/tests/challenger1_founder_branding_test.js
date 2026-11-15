const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = 'c:/AUTOMATION BUSSNIESS/flying-cheetah';

console.log('=== Founder Personal Branding Protection Challenge ===');

// 1. Verify Image Files on Disk
const imageFiles = [
  { name: 'bhagat.jpg', relPath: 'bhagat.jpg' },
  { name: 'founder_bhagat_mukhiya.jpg', relPath: 'images/founder_bhagat_mukhiya.jpg' },
  { name: 'Yash.jpg', relPath: 'Yash.jpg' },
  { name: 'founder_yash_gaikwad.jpg', relPath: 'images/founder_yash_gaikwad.jpg' }
];

let imageStats = {};

for (const img of imageFiles) {
  const fullPath = path.join(root, img.relPath);
  if (!fs.existsSync(fullPath)) {
    console.error(`FAIL: Image ${img.relPath} does not exist on disk!`);
    process.exit(1);
  }
  const buf = fs.readFileSync(fullPath);
  const hash = crypto.createHash('sha256').update(buf).digest('hex');
  const size = buf.length;
  // Check JPEG magic bytes: 0xFF 0xD8 0xFF
  const isJpeg = buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  console.log(`Image [${img.relPath}]: size=${size} bytes, isJpeg=${isJpeg}, sha256=${hash}`);
  imageStats[img.name] = { size, hash, isJpeg };
}

// Compare duplicate copies
if (imageStats['bhagat.jpg'].hash !== imageStats['founder_bhagat_mukhiya.jpg'].hash) {
  console.error('FAIL: bhagat.jpg and images/founder_bhagat_mukhiya.jpg hash mismatch!');
  process.exit(1);
} else {
  console.log('MATCH: bhagat.jpg is identical to images/founder_bhagat_mukhiya.jpg');
}

if (imageStats['Yash.jpg'].hash !== imageStats['founder_yash_gaikwad.jpg'].hash) {
  console.error('FAIL: Yash.jpg and images/founder_yash_gaikwad.jpg hash mismatch!');
  process.exit(1);
} else {
  console.log('MATCH: Yash.jpg is identical to images/founder_yash_gaikwad.jpg');
}

// 2. Inspect about.html
console.log('--- Inspecting about.html ---');
const aboutHtml = fs.readFileSync(path.join(root, 'about.html'), 'utf8');

const bhagatInAbout = aboutHtml.includes('Bhagat Mukhiya');
const yashInAbout = aboutHtml.includes('Yash Gaikwad');

// Check photo references
const bhagatPhotoInAbout = aboutHtml.includes('bhagat.jpg') || aboutHtml.includes('founder_bhagat_mukhiya.jpg');
const yashPhotoInAbout = aboutHtml.includes('Yash.jpg') || aboutHtml.includes('founder_yash_gaikwad.jpg');

// Check LinkedIn links
const linkedinBhagatMatch = aboutHtml.match(/href=["'](https?:\/\/(?:www\.)?linkedin\.com\/in\/[^"']+)["']/i);
const allLinkedInsAbout = [...aboutHtml.matchAll(/https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_\-\/]+/gi)].map(m => m[0]);

console.log('Bhagat Mukhiya mentioned in about.html:', bhagatInAbout);
console.log('Yash Gaikwad mentioned in about.html:', yashInAbout);
console.log('Bhagat photo referenced in about.html:', bhagatPhotoInAbout);
console.log('Yash photo referenced in about.html:', yashPhotoInAbout);
console.log('LinkedIn profiles in about.html:', allLinkedInsAbout);

// 3. Inspect index.html
console.log('--- Inspecting index.html ---');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const bhagatInIndex = indexHtml.includes('Bhagat Mukhiya');
const yashInIndex = indexHtml.includes('Yash Gaikwad');
const bhagatPhotoInIndex = indexHtml.includes('bhagat.jpg') || indexHtml.includes('founder_bhagat_mukhiya.jpg');
const yashPhotoInIndex = indexHtml.includes('Yash.jpg') || indexHtml.includes('founder_yash_gaikwad.jpg');
const allLinkedInsIndex = [...indexHtml.matchAll(/https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_\-\/]+/gi)].map(m => m[0]);

console.log('Bhagat Mukhiya mentioned in index.html:', bhagatInIndex);
console.log('Yash Gaikwad mentioned in index.html:', yashInIndex);
console.log('Bhagat photo referenced in index.html:', bhagatPhotoInIndex);
console.log('Yash photo referenced in index.html:', yashPhotoInIndex);
console.log('LinkedIn profiles in index.html:', allLinkedInsIndex);

// Check titles and bios
const bhagatTitleFound = aboutHtml.includes('Technical Architect') || aboutHtml.includes('Co-Founder');
const yashTitleFound = aboutHtml.includes('Growth Operations') || aboutHtml.includes('Co-Founder');
console.log('Bhagat title present in about.html:', bhagatTitleFound);
console.log('Yash title present in about.html:', yashTitleFound);

if (!bhagatInAbout || !yashInAbout || !bhagatPhotoInAbout || !yashPhotoInAbout ||
    !bhagatInIndex || !yashInIndex || !bhagatPhotoInIndex || !yashPhotoInIndex ||
    allLinkedInsAbout.length < 2) {
  console.error('FAIL: Founder personal branding compromised!');
  process.exit(1);
}

console.log('Founder Personal Branding Protection: ALL CHECKS PASSED!');

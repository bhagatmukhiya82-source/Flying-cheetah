const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const os = require('os');
const assert = require('assert');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT_DIR = path.resolve(__dirname, '..');
const PORT = 9560;

const VIEWPORTS = [
  { name: 'iPhone SE (1st gen)', width: 320, height: 568 },
  { name: 'iPhone 8 / SE 2', width: 375, height: 667 },
  { name: 'iPhone 12/13/14 (Target)', width: 390, height: 844 },
  { name: 'iPhone Plus / Max', width: 414, height: 896 },
  { name: 'Galaxy Fold (Edge case)', width: 280, height: 653 }
];

const PAGES = ['about.html', 'home.html', 'index.html'];

async function launchChrome() {
  const tmpDir = path.join(os.tmpdir(), 'chrome_stress_' + Date.now());
  const proc = spawn(CHROME_PATH, [
    '--headless=new',
    '--remote-debugging-port=' + PORT,
    '--remote-allow-origins=*',
    '--no-sandbox',
    '--disable-gpu',
    '--user-data-dir=' + tmpDir
  ]);

  let connected = false;
  for (let i = 0; i < 30; i++) {
    try {
      await new Promise(r => setTimeout(r, 200));
      await new Promise((res, rej) => {
        const req = http.get('http://127.0.0.1:' + PORT + '/json/version', res);
        req.on('error', rej);
      });
      connected = true;
      break;
    } catch (e) {}
  }

  if (!connected) {
    proc.kill();
    throw new Error('Failed to connect to Chrome CDP on port ' + PORT);
  }

  return proc;
}

async function createTarget() {
  return new Promise((resolve, reject) => {
    const req = http.request('http://127.0.0.1:' + PORT + '/json/new', { method: 'PUT' }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    req.end();
  });
}

function createCdpSession(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 1;
  const pending = new Map();

  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
  };

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = id++;
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  return { ws, send };
}

// In-browser inspection script to be executed via CDP Runtime.evaluate
const browserInspectorFn = `
(() => {
  const yashImg = document.querySelector("img[src*='founder_yash_gaikwad']") || document.querySelector("img[src*='Yash']");
  const bhagatImg = document.querySelector("img[src*='founder_bhagat_mukhiya']") || document.querySelector("img[src*='bhagat']");

  function getCardData(imgEl) {
    if (!imgEl) return null;
    const card = imgEl.closest(".group") || imgEl.closest(".rounded-3xl") || imgEl.parentElement;
    if (!card) return null;
    const cardRect = card.getBoundingClientRect();
    const anchors = Array.from(card.querySelectorAll("a"));
    const buttonData = anchors.map(a => {
      const r = a.getBoundingClientRect();
      const style = window.getComputedStyle(a);
      const icon = a.querySelector("i");
      const iconRect = icon ? icon.getBoundingClientRect() : null;
      return {
        text: (a.innerText || "").replace(/\\s+/g, ' ').trim(),
        href: a.href,
        top: Math.round(r.top),
        bottom: Math.round(r.bottom),
        left: Math.round(r.left),
        right: Math.round(r.right),
        width: Math.round(r.width),
        height: Math.round(r.height),
        scrollWidth: a.scrollWidth,
        clientWidth: a.clientWidth,
        isOverflowing: a.scrollWidth > a.clientWidth + 1,
        fontSize: style.fontSize,
        display: style.display,
        flexDirection: style.flexDirection,
        padding: style.padding,
        iconTag: icon ? icon.className : null,
        iconWidth: iconRect ? Math.round(iconRect.width) : 0,
        iconHeight: iconRect ? Math.round(iconRect.height) : 0
      };
    });

    return {
      cardRect: {
        top: Math.round(cardRect.top),
        bottom: Math.round(cardRect.bottom),
        left: Math.round(cardRect.left),
        right: Math.round(cardRect.right),
        width: Math.round(cardRect.width),
        height: Math.round(cardRect.height)
      },
      buttons: buttonData
    };
  }

  return {
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    docScrollWidth: document.documentElement.scrollWidth,
    docClientWidth: document.documentElement.clientWidth,
    bodyScrollWidth: document.body.scrollWidth,
    hasDocHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
    bhagat: getCardData(bhagatImg),
    yash: getCardData(yashImg)
  };
})()
`;

async function main() {
  console.log('================================================================');
  console.log('CHALLENGER M3-1: VIEWPORT GEOMETRY ADVERSARIAL STRESS TEST');
  console.log('================================================================\n');

  const chromeProc = await launchChrome();
  console.log('[INFO] Chrome headless launched and CDP connected on port ' + PORT);

  const results = [];
  let totalAssertions = 0;
  let passedAssertions = 0;

  try {
    const target = await createTarget();
    const { ws, send } = createCdpSession(target.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);
    await send('Page.enable');

    for (const pageName of PAGES) {
      console.log(`\n----------------------------------------------------------------`);
      console.log(`PAGE UNDER STRESS TEST: ${pageName}`);
      console.log(`----------------------------------------------------------------`);

      const fileUrl = 'file:///' + path.join(ROOT_DIR, pageName).replace(/\\/g, '/');

      for (const vp of VIEWPORTS) {
        console.log(`\n  >> Viewport: ${vp.name} (${vp.width}px x ${vp.height}px)`);

        await send('Emulation.setDeviceMetricsOverride', {
          width: vp.width,
          height: vp.height,
          deviceScaleFactor: 2,
          mobile: true
        });

        await send('Page.navigate', { url: fileUrl });
        // Wait for document readyState complete + Tailwind CDN layout pass
        for (let w = 0; w < 20; w++) {
          await new Promise(r => setTimeout(r, 300));
          const ready = await send('Runtime.evaluate', { expression: 'document.readyState', returnByValue: true });
          if (ready?.result?.value === 'complete') break;
        }
        await new Promise(r => setTimeout(r, 1500));

        const evalRes = await send('Runtime.evaluate', {
          expression: browserInspectorFn,
          returnByValue: true
        });

        const data = evalRes.result.value;
        assert.ok(data, `No inspection data returned for ${pageName} at ${vp.width}px`);
        assert.ok(data.bhagat, `Bhagat card not located on ${pageName} at ${vp.width}px`);
        assert.ok(data.yash, `Yash card not located on ${pageName} at ${vp.width}px`);

        // Check 1: Yash card width vs viewport
        totalAssertions++;
        assert.ok(data.yash.cardRect.width <= vp.width, `Yash card width (${data.yash.cardRect.width}px) exceeds viewport (${vp.width}px)`);
        passedAssertions++;
        console.log(`    [PASS] Yash card width: ${data.yash.cardRect.width}px (within ${vp.width}px viewport)`);

        // Check 2: Yash buttons
        const yButtons = data.yash.buttons;
        console.log(`    [INFO] Yash card has ${yButtons.length} action button(s)`);

        for (let i = 0; i < yButtons.length; i++) {
          const btn = yButtons[i];
          totalAssertions++;
          // Button must not overflow its client area horizontally
          assert.strictEqual(btn.isOverflowing, false, `Button [${btn.text}] text overflows container: scrollWidth=${btn.scrollWidth}, clientWidth=${btn.clientWidth}`);
          passedAssertions++;

          totalAssertions++;
          // Button must fit inside the card
          assert.ok(btn.width <= data.yash.cardRect.width, `Button width (${btn.width}px) exceeds card width (${data.yash.cardRect.width}px)`);
          passedAssertions++;

          totalAssertions++;
          // Button height must be >= 36px for touch targets (ideally ~44px)
          assert.ok(btn.height >= 36, `Button height (${btn.height}px) is too small for touch target (<36px)`);
          passedAssertions++;

          console.log(`    [PASS] Button ${i+1}: "${btn.text.substring(0, 30)}..." | Size: ${btn.width}x${btn.height}px | No overflow | Touch height OK`);
        }

        // Check 3: If multiple buttons (like in about.html), verify vertical stacking and gap
        if (yButtons.length >= 2) {
          totalAssertions++;
          const btn1 = yButtons[0];
          const btn2 = yButtons[1];
          const gap = btn2.top - btn1.bottom;

          // No vertical collision or overlap
          assert.ok(btn2.top >= btn1.bottom, `Vertical collision: Button 2 top (${btn2.top}px) overlaps Button 1 bottom (${btn1.bottom}px)`);
          passedAssertions++;

          totalAssertions++;
          // Tailwind space-y-2.5 = 10px (0.625rem)
          // In subpixel rendering, round to integer should be between 8px and 12px
          assert.ok(gap >= 8 && gap <= 14, `Vertical gap between buttons is abnormal: ${gap}px (expected ~10px)`);
          passedAssertions++;

          console.log(`    [PASS] Yash buttons stack cleanly with vertical gap = ${gap}px (expected 10px via space-y-2.5)`);
        }

        // Check 4: Bhagat card buttons
        const bButtons = data.bhagat.buttons;
        console.log(`    [INFO] Bhagat card has ${bButtons.length} action button(s)`);
        for (let i = 0; i < bButtons.length; i++) {
          const btn = bButtons[i];
          totalAssertions++;
          assert.strictEqual(btn.isOverflowing, false, `Bhagat button [${btn.text}] text overflows: scrollWidth=${btn.scrollWidth}, clientWidth=${btn.clientWidth}`);
          passedAssertions++;
        }

        results.push({
          page: pageName,
          viewport: vp.width,
          cardWidth: data.yash.cardRect.width,
          buttonCount: yButtons.length,
          docScrollWidth: data.docScrollWidth
        });
      }
    }

    ws.close();
  } finally {
    chromeProc.kill();
  }

  console.log('\n================================================================');
  console.log(`ADVERSARIAL VIEWPORT STRESS TEST COMPLETE:`);
  console.log(`Total Assertions Checked: ${totalAssertions}`);
  console.log(`Passed: ${passedAssertions} / ${totalAssertions} (100%)`);
  console.log('================================================================\n');

  console.log('SUMMARY TABLE:');
  console.table(results);
}

main().catch(err => {
  console.error('\n[FATAL TEST FAILURE]:', err);
  process.exit(1);
});

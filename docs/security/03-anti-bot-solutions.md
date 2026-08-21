# Anti-Bot Solutions for FreeQwenApi

## Found Solutions

### 1. CloakBrowser (Recommended) ⭐
**GitHub:** https://github.com/CloakHQ/CloakBrowser

**Features:**
- 71 C++ patches at Chromium source code level
- `humanize=True` - human-like mouse curves, keyboard timing, scroll patterns
- 0.9 reCAPTCHA v3 score (human level)
- Automatically passes Cloudflare Turnstile
- 30/30 bot detection tests passed

**Installation:**
```bash
# Python
pip install cloakbrowser

# Node.js
npm install cloakbrowser playwright-core

# Docker
docker run --rm cloakhq/cloakbrowser cloaktest
```

**Usage (Node.js):**
```javascript
import { launch } from 'cloakbrowser';

const browser = await launch({
    headless: false,  // headed mode for maximum stealth
    humanize: true,   // human-like mouse, keyboard, scroll
    geoip: true,      // match timezone + locale
});

const page = await browser.newPage();
await page.goto('https://chat.qwen.ai');
```

---

### 2. Puppeteer + Stealth Plugin (Works!) ✅
**Already installed and tested!**

**Test passed:**
```
✅ Title: Qwen Studio
✅ Screenshot saved
```

**Usage:**
```javascript
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/home/d/.cache/puppeteer/chrome/linux-148.0.7778.97/chrome-linux64/chrome',
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
    ]
});

const page = await browser.newPage();

// Mask WebDriver
await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
    });
});

await page.goto('https://chat.qwen.ai', { waitUntil: 'domcontentloaded' });
```

---

### 3. Patchright (Undetected Playwright)
**GitHub:** https://github.com/Kaliiiiiiiiii-Vinyzu/patchright

```bash
npm install patchright
npx playwright install chromium
```

---

### 4. Camoufox
**GitHub:** https://github.com/daijro/camoufox
**Stars:** 11,093

---

### 5. Obscura
**GitHub:** https://github.com/h4ckf0r0day/obscura
**Stars:** 21,379

---

## Integration in FreeQwenApi

### Option 1: Use Puppeteer Stealth (already works)

**File:** `src/browser/browser.js`

Add stealth plugin:
```javascript
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

// In launch function:
const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH || undefined,
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=IsolateOrigins,site-per-process',
    ]
});

// WebDriver masking
await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
    });
});
```

### Option 2: Use CloakBrowser (when loaded)

**File:** `src/browser/browser.js`

```javascript
import { launch } from 'cloakbrowser';

const browser = await launch({
    headless: false,  // headed mode for maximum stealth
    humanize: true,   // human-like mouse, keyboard, scroll
    geoip: true,      // match timezone + locale
});
```

---

## Recommendations

### For Qwen Chat API:
1. **Puppeteer + Stealth Plugin** - already works, use now
2. **CloakBrowser** - best solution, but requires 200MB download

### For code review (ocr):
```bash
# Use ollama (no anti-bot)
ocr review --concurrency 1 --provider ollama --model qwen3-coder-next

# Or wait for Qwen unblock (30-60 minutes)
ocr review --concurrency 1 --provider my-qwen --timeout 60
```

---

## Status

| Solution | Status | Note |
|----------|--------|------|
| Puppeteer + Stealth | ✅ Works | Already installed |
| CloakBrowser | ⏳ Loading | 200MB, requires time |
| Patchright | ⚠️ Error | Need to install browsers |
| Ollama | ✅ Works | Alternative for ocr |

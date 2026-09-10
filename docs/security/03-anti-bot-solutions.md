# 03. Anti-Bot Solutions

- **Status:** Active
- **Date:** 2026-08-21
- **Deciders:** @Githab-capibara
- **Related:** [ADR 04 — Anti-Bot Implementation](../adr/04-anti-bot-implementation.md), [Full Analysis](01-anti-bot-analysis.md), [Summary](02-anti-bot-summary.md)

## Purpose

Evaluate browser automation solutions for bypassing Qwen anti-bot protection and recommend the best approach for FreeQwenApi.

## Solution Comparison

| Solution | Stealth Level | Install Size | Status in FreeQwenApi |
|----------|--------------|--------------|----------------------|
| Puppeteer + Stealth | Medium | ~0 MB (bundled) | Working — current solution |
| CloakBrowser | High | ~200 MB | Pending — requires download |
| Patchright | Medium | ~50 MB | Error — needs browser install |
| Camoufox | High | ~200 MB | Not evaluated |
| Obscura | High | ~150 MB | Not evaluated |

## Recommended: CloakBrowser

**GitHub:** https://github.com/CloakHQ/CloakBrowser

- 71 C++ patches at Chromium source code level
- `humanize=True` — human-like mouse curves, keyboard timing, scroll patterns
- 0.9 reCAPTCHA v3 score (human level)
- Automatically passes Cloudflare Turnstile
- 30/30 bot detection tests passed

```bash
npm install cloakbrowser playwright-core
```

```javascript
import { launch } from 'cloakbrowser';

const browser = await launch({
    headless: false,
    humanize: true,
    geoip: true,
});

const page = await browser.newPage();
await page.goto('https://chat.qwen.ai');
```

## Current: Puppeteer + Stealth Plugin

Already installed and working in FreeQwenApi.

```bash
npm install puppeteer-extra puppeteer-extra-plugin-stealth
```

```javascript
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled']
});

const page = await browser.newPage();
await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
});
await page.goto('https://chat.qwen.ai', { waitUntil: 'domcontentloaded' });
```

## Alternatives Evaluated

### Patchright (Undetected Playwright)

**GitHub:** https://github.com/Kaliiiiiiiiii-Vinyzu/patchright

```bash
npm install patchright
npx playwright install chromium
```

Status: Requires manual browser install, currently not working in FreeQwenApi.

### Camoufox

**GitHub:** https://github.com/daijro/camoufox (11k stars)

Firefox-based anti-detection browser. Not yet evaluated for FreeQwenApi.

### Obscura

**GitHub:** https://github.com/h4ckf0r0day/obscura (21k stars)

Chrome-based anti-detection browser. Not yet evaluated for FreeQwenApi.

## Recommendations

1. **For Qwen Chat API**: Use Puppeteer + Stealth (already works) as baseline, migrate to CloakBrowser when ready
2. **For code review**: Use an alternative provider (e.g. Ollama) to avoid Qwen anti-bot entirely, or wait 30-60 minutes for the block to expire

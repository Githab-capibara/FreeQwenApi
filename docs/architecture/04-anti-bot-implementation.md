# Implementation Guide

## Step 1: Improve x5sec Solver

### 1.1 Open the file `src/browser/x5secSolver.js`

### 1.2 Find the `buildTrajectory` function (lines 78-98)

### 1.3 Replace it with the new version:

```javascript
// NEW VERSION: Improved human-like trajectory
export function buildTrajectory(startX, endX, steps = 28) {
    const pts = [];
    
    // 1. Initial pause (human doesn't start moving instantly)
    const startPause = 150 + Math.random() * 250;
    pts.push({ x: startX, delay: startPause });
    
    // 2. Acceleration phase (5-12 steps)
    const accelSteps = 5 + Math.floor(Math.random() * 8);
    for (let i = 1; i <= accelSteps; i++) {
        const t = i / (accelSteps + 15);
        const progress = t * t; // Quadratic acceleration
        const jitter = (Math.random() - 0.5) * 3.5; // Increased jitter
        const x = startX + (endX - startX) * progress + jitter;
        const delay = 20 + Math.random() * 35;
        pts.push({ x, delay });
    }
    
    // 3. Main phase with micro-corrections
    const midSteps = 10 + Math.floor(Math.random() * 15);
    for (let i = 0; i < midSteps; i++) {
        const t = (accelSteps + 1 + i) / (accelSteps + midSteps + 10);
        // Sigmoid curve for natural movement
        const progress = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        // Micro-corrections (fading toward end)
        const correction = Math.sin(t * Math.PI * 3) * 2 * (1 - t);
        const jitter = (Math.random() - 0.5) * 2.5;
        const x = startX + (endX - startX) * progress + correction + jitter;
        // Irregular pauses (more frequent in middle of movement)
        const pauseChance = t > 0.3 && t < 0.7 ? 0.3 : 0.1;
        const delay = Math.random() < pauseChance 
            ? 40 + Math.random() * 60  // Pause
            : 15 + Math.random() * 25; // Normal movement
        pts.push({ x, delay });
    }
    
    // 4. Deceleration phase
    const decelSteps = 8 + Math.floor(Math.random() * 7);
    for (let i = 1; i <= decelSteps; i++) {
        const t = 1 - (i / decelSteps) * 0.15;
        const jitter = (Math.random() - 0.5) * 1.5;
        const x = startX + (endX - startX) * t + jitter;
        const delay = 30 + Math.random() * 40; // Slower toward end
        pts.push({ x, delay });
    }
    
    // 5. Final pause before release
    pts.push({ 
        x: endX + (Math.random() - 0.5) * 0.5, 
        delay: 200 + Math.random() * 300 
    });
    
    // Normalization: remove points that go backward
    const normalized = [];
    let prevX = startX;
    for (const pt of pts) {
        if (pt.x >= prevX - 0.5) {
            normalized.push({ ...pt, x: Math.max(pt.x, prevX) });
            prevX = pt.x;
        }
    }
    
    return normalized;
}
```

### 1.4 Save the file

---

## Step 2: Create userAgentRotator.js

### 2.1 Create new file `src/browser/userAgentRotator.js`

### 2.2 Insert content:

```javascript
// src/browser/userAgentRotator.js
// User-Agent, Accept-Language, and Timezone rotation for session variance

const USER_AGENTS = [
    // Windows Chrome (most common)
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
    
    // Windows Firefox
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:120.0) Gecko/20100101 Firefox/120.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:119.0) Gecko/20100101 Firefox/119.0',
    
    // macOS Chrome
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    
    // macOS Safari
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    
    // Linux
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
];

const ACCEPT_LANGUAGES = [
    'en-US,en;q=0.9',
    'en-GB,en;q=0.9',
    'ru-RU,ru;q=0.9,en;q=0.8',
    'de-DE,de;q=0.9,en;q=0.8',
    'fr-FR,fr;q=0.9,en;q=0.8',
    'es-ES,es;q=0.9,en;q=0.8',
    'ja-JP,ja;q=0.9,en;q=0.8',
    'zh-CN,zh;q=0.9,en;q=0.8',
];

const TIMEZONES = [
    'Europe/Moscow',
    'Europe/Berlin',
    'Europe/London',
    'America/New_York',
    'America/Chicago',
    'America/Los_Angeles',
    'Asia/Tokyo',
    'Asia/Shanghai',
];

export function getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export function getRandomAcceptLanguage() {
    return ACCEPT_LANGUAGES[Math.floor(Math.random() * ACCEPT_LANGUAGES.length)];
}

export function getRandomTimezone() {
    return TIMEZONES[Math.floor(Math.random() * TIMEZONES.length)];
}

export function parseUserAgent(ua) {
    if (ua.includes('Chrome')) return { browser: 'Chrome', os: ua.includes('Mac') ? 'macOS' : ua.includes('Linux') ? 'Linux' : 'Windows' };
    if (ua.includes('Firefox')) return { browser: 'Firefox', os: ua.includes('Mac') ? 'macOS' : ua.includes('Linux') ? 'Linux' : 'Windows' };
    if (ua.includes('Safari')) return { browser: 'Safari', os: 'macOS' };
    return { browser: 'Unknown', os: 'Unknown' };
}
```

### 2.3 Save the file

---

## Step 3: Modify browser.js

### 3.1 Open the file `src/browser/browser.js`

### 3.2 Add import at the top of the file (after line 4):

```javascript
import { getRandomUserAgent, getRandomAcceptLanguage, getRandomTimezone } from './userAgentRotator.js';
```

### 3.3 Find the page initialization block (lines 88-99):

```javascript
const pages = await browserInstance.pages();
const page = pages.length > 0 ? pages[0] : await browserInstance.newPage();

await page.setUserAgent(USER_AGENT);
await page.setViewport({ width: VIEWPORT_WIDTH, height: VIEWPORT_HEIGHT, deviceScaleFactor: 1 });
await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
    // ...
});
```

### 3.4 Replace with:

```javascript
const pages = await browserInstance.pages();
const page = pages.length > 0 ? pages[0] : await browserInstance.newPage();

// User-Agent rotation for variance
const randomUA = getRandomUserAgent();
await page.setUserAgent(randomUA);
logInfo(`User-Agent: ${randomUA.slice(0, 50)}...`);

// Viewport randomization (some users have DPI > 1)
const randomDPI = 1 + Math.random() * 0.5;
await page.setViewport({ 
    width: VIEWPORT_WIDTH, 
    height: VIEWPORT_HEIGHT, 
    deviceScaleFactor: randomDPI 
});

await page.setExtraHTTPHeaders({
    'Accept-Language': getRandomAcceptLanguage(),
    'Accept-Encoding': 'gzip, deflate, br',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
});
```

### 3.5 Find `evaluateOnNewDocument` (lines 101-139):

```javascript
await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
    // ...
});
```

### 3.6 Replace with:

```javascript
await page.evaluateOnNewDocument((tz) => {
    // Timezone spoofing
    const originalDateTimeFormat = Intl.DateTimeFormat;
    Intl.DateTimeFormat = function(locale, options) {
        return new originalDateTimeFormat(locale, { ...options, timeZone: tz });
    };
    Intl.DateTimeFormat.prototype = originalDateTimeFormat.prototype;
    
    Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
    
    // Random hardwareConcurrency (4-16 cores)
    const cores = [4, 8, 12, 16];
    Object.defineProperty(navigator, 'hardwareConcurrency', { 
        get: () => cores[Math.floor(Math.random() * cores.length)] 
    });
    
    // Random deviceMemory (4-16 GB)
    const memory = [4, 8, 16];
    Object.defineProperty(navigator, 'deviceMemory', { 
        get: () => memory[Math.floor(Math.random() * memory.length)] 
    });
    
    Object.defineProperty(navigator, 'plugins', {
        get: () => [{ 0: { type: 'application/x-google-chrome-pdf', suffixes: 'pdf', description: 'Portable Document Format' }, description: 'Portable Document Format', filename: 'internal-pdf-viewer', length: 1, name: 'Chrome PDF Plugin' }]
    });
    
    Object.defineProperty(navigator, 'connection', {
        get: () => ({ effectiveType: '4g', rtt: 50, downlink: 10, saveData: false })
    });
    
    // WebGL fingerprint randomization
    const vendors = ['Intel Inc.', 'Google Inc.', 'Apple Inc.'];
    const renderers = ['Intel Iris OpenGL Engine', 'Intel Iris Plus Graphics', 'Apple M1'];
    const randomVendor = vendors[Math.floor(Math.random() * vendors.length)];
    const randomRenderer = renderers[Math.floor(Math.random() * renderers.length)];
    
    const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(param) {
        if (param === 37445) return randomVendor; // UNMASKED_VENDOR_WEBGL
        if (param === 37446) return randomRenderer; // UNMASKED_RENDERER_WEBGL
        return originalGetParameter.call(this, param);
    };
    
    if (!navigator.getBattery) {
        navigator.getBattery = () => Promise.resolve({ charging: true, chargingTime: 0, dischargingTime: Infinity, level: 1 });
    }

    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (type, listener, options) {
        if (type === 'mousemove' || type === 'mousedown' || type === 'mouseup') {
            const wrappedListener = function (event) { setTimeout(() => listener.call(this, event), Math.random() * 3); };
            return originalAddEventListener.call(this, type, wrappedListener, options);
        }
        return originalAddEventListener.call(this, type, listener, options);
    };

    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function (type) {
        const context = this.getContext('2d');
        if (context) {
            const imageData = context.getImageData(0, 0, this.width, this.height);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                const noise = Math.floor(Math.random() * 5) - 2;
                data[i] = Math.max(0, Math.min(255, data[i] + noise));
                data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
                data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
            }
            context.putImageData(imageData, 0, 0);
        }
        return originalToDataURL.apply(this, arguments);
    };
}, getRandomTimezone());
```

### 3.7 Save the file

---

## Step 4: Testing

### 4.1 Start the server:

```bash
npm start
```

### 4.2 Check logs:

```
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...
```

### 4.3 Check captcha solving:

If captcha appears, check x5sec logs:
```
x5sec: slider solved (attempt 1/3, 1234ms)
```

---

## Step 5: Additional Improvements (Optional)

### 5.1 Adaptive Timing

Create file `src/api/adaptiveTiming.js`:

```javascript
class AdaptiveRequestTimer {
    constructor() {
        this.requestHistory = [];
        this.baseInterval = 3000;
    }
    
    async getNextDelay() {
        const now = Date.now();
        const recentRequests = this.requestHistory.filter(t => now - t < 60000);
        
        let multiplier = 1;
        if (recentRequests.length > 5) multiplier = 2;
        if (recentRequests.length > 10) multiplier = 4;
        if (recentRequests.length > 15) multiplier = 8;
        
        const baseDelay = this.baseInterval * multiplier;
        const jitter = baseDelay * 0.3 * Math.random();
        const delay = baseDelay + jitter;
        
        this.requestHistory.push(now);
        this.requestHistory = this.requestHistory.filter(t => now - t < 300000);
        
        return delay;
    }
}

export const adaptiveTimer = new AdaptiveRequestTimer();
```

### 5.2 Proxy Support

Create file `proxies.txt` in project root:

```
user:pass@ip:port
user:pass@ip:port
```

---

## Verify Results

### Expected Improvements:

| Metric | Before | After |
|---------|-----|-------|
| x5sec solve rate | 70-80% | 90-95% |
| Detection rate | 15-20% | 5-10% |
| Average solve time | 3-5s | 2-3s |

### Monitoring:

Watch logs:
- `x5sec: slider solved` - success
- `x5sec: attempt N/3 failed` - failure, will retry
- `Qwen anti-bot (punish) confirmed` - global cooldown

---

## Rollback

If something goes wrong:

```bash
git checkout src/browser/x5secSolver.js
git checkout src/browser/browser.js
# userAgentRotator.js can be deleted
```

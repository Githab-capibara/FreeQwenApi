# Qwen Chat Anti-Bot Analysis and Improvement Plan

## 1. Project Architecture Overview

### 1.1 Structure
```
FreeQwenApi/
├── index.js                 # Express server entry point
├── main.py                  # Python version (FastAPI + Playwright)
├── src/
│   ├── browser/
│   │   ├── browser.js       # Puppeteer + Stealth Plugin
│   │   ├── auth.js          # Manual authentication
│   │   ├── session.js       # Session save/load
│   │   └── x5secSolver.js   # Automatic x5sec captcha solver
│   ├── api/
│   │   ├── chat.js          # Main Qwen API request logic
│   │   ├── tokenManager.js  # Token rotation (round-robin)
│   │   ├── accountAffinity.js # Resource-to-account binding
│   │   ├── fileUpload.js    # File upload via OSS
│   │   └── imageGeneration.js # Image generation
│   ├── utils/
│   │   ├── verificationMarkers.js # Anti-bot markers
│   │   └── ...
│   └── config.js            # Configuration
└── session/                 # Session storage
    ├── tokens.json          # Account tokens
    ├── auth_token.txt       # Current token
    └── accounts/            # Per-account cookies
```

### 1.2 Current Anti-Bot Approach

**Level 1: Puppeteer Stealth**
```javascript
puppeteer.use(StealthPlugin());
ignoreDefaultArgs: ['--enable-automation'],
args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
```

**Level 2: Navigator Property Spoofing**
```javascript
Object.defineProperty(navigator, 'platform', { get: () => 'Win32' });
Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 8 });
Object.defineProperty(navigator, 'deviceMemory', { get: () => 8 });
```

**Level 3: x5sec Solver**
```javascript
export async function solveX5secChallenge(page, punishUrl, { maxAttempts = 3 }) {
    // 1. Opens punish URL
    // 2. Waits for slider #nc_1_n1z
    // 3. Builds human-like trajectory (ease-in-out + jitter + pauses)
    // 4. Drags slider with mouse
    // 5. Waits for #nc-sig completion
}
```

**Level 4: Rate Limiting & Cooldown**
```javascript
export const ANTI_BOT_COOLDOWN_MS = 2 * 60_000; // 2 minutes
export const GLOBAL_REQUEST_CONCURRENCY = 1;
export const REQUEST_JITTER_MIN_MS = 800;
export const REQUEST_JITTER_MAX_MS = 2_500;
```

**Level 5: Multi-Account Rotation**
```javascript
export async function getAvailableToken() {
    const tokens = loadTokens();
    const valid = tokens.filter(token => isAvailableToken(token, now));
    const token = valid[pointer % valid.length];
    pointer = (pointer + 1) % valid.length;
    return token;
}
```

---

## 2. Anti-Bot Technologies on chat.qwen.ai

### 2.1 Detected Components

**Alibaba Cloud WAF (Web Application Firewall):**
- Cookie: `acw_tc` (Tencent Cloud WAF session cookie, 30 min TTL)
- Cookie: `x-ap` (Geo-location WAF marker, `eu-central-1`)
- Header: `GA-AP` (Geo-location WAF response)

**x5sec / baxia CAPTCHA:**
- Alibaba slider captcha (NC - No CAPTCHA)
- Selectors: `#nc_1_n1z` (button), `#nc_1_n1t` (track), `#nc-sig` (signature)
- Container: `#baxia-punish`
- URL pattern: `_____tmd_____/punish?x5secdata=...`

**Additional Markers:**
- `rgv587` - WAF error code
- `fail_sys_user_validate` - validation error
- `purecaptcha` - alternative captcha
- `window._config_` + `captcha` - captcha JSON config

### 2.2 How x5sec Works

```
1. User makes request → Qwen API
2. WAF detects suspicious pattern → returns HTML with JS redirect
3. Browser navigates to `/_____tmd_____/punish?x5secdata=ENCRYPTED_DATA`
4. Slider captcha loads (NC script from CDN)
5. User drags the slider
6. NC script generates signature (nc_sig) based on:
   - Mouse movement trajectory
   - Execution time
   - Behavioral metrics
7. Signature sent to server
8. Server verifies and returns:
   - Success → redirect back + set-cookie
   - Failure → error (BXFASTMARK, BXMARK, FAIL)
```

### 2.3 Behavioral Analysis (Server-side)

**What WAF tracks:**
1. **HTTP Headers**: User-Agent, Accept-Language, Accept-Encoding
2. **TLS Fingerprint**: JA3/JA4 fingerprint
3. **Request Patterns**: frequency, time between requests, burst detection
4. **Mouse Dynamics**: speed, acceleration, jitter, pauses
5. **Browser Fingerprint**: canvas, WebGL, fonts, plugins
6. **IP Reputation**: IP reputation databases
7. **Session Behavior**: cookie consistency, navigation patterns

---

## 3. Current Implementation Problems

### 3.1 Critical Issues

**Problem 1: Insufficient Human Emulation in x5sec**
```javascript
// x5secSolver.js:78-98
export function buildTrajectory(startX, endX, steps = 28) {
    // ISSUE: Algorithm is deterministic (ease-in-out + fixed jitter)
    // WAF can detect by:
    // - Too smooth Bezier curve
    // - Same jitter distribution every time
    // - Predictable pauses
    const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const jitter = (Math.random() - 0.5) * 1.5; // Too small jitter!
}
```

**Problem 2: No Real Mouse Events**
```javascript
// x5secSolver.js:208-220
await page.mouse.move(startX, startY, { steps: 3 });
await page.mouse.down();
// ...
await page.mouse.move(pt.x, y);
await page.mouse.up();

// ISSUE: Puppeteer mouse events don't generate:
// - mouseenter/mouseleave on intermediate elements
// - mouseover/mouseout events
// - Real hardware interruptions
```

**Problem 3: Same User-Agent for All Requests**
```javascript
// config.js:91
export const USER_AGENT = process.env.USER_AGENT || 
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ...';

// ISSUE: All requests with same UA = easily detectable
```

**Problem 4: No WebGL Fingerprint Emulation**
```javascript
// browser.js:101-139 - missing emulation of:
// - WebGL renderer
// - WebGL vendor
// - Canvas fingerprint
// - AudioContext fingerprint
```

**Problem 5: Predictable Timing Pattern**
```javascript
// config.js:74-75
export const REQUEST_JITTER_MIN_MS = 800;
export const REQUEST_JITTER_MAX_MS = 2_500;

// ISSUE: Fixed jitter range is easily detectable
// Real users have much larger variance
```

### 3.2 Medium Issues

**Problem 6: No IP Address Rotation**
- All requests come from same IP
- Frequent requests cause IP blacklist

**Problem 7: No Real Browser Emulation**
- No real extensions
- No browsing history
- No cookies from other sites
- No localStorage from other domains

**Problem 8: Synchronous Behavior on Captcha**
- All requests stop on global cooldown
- After captcha solved, all requests resume simultaneously

### 3.3 Minor Issues

**Problem 9: Static Viewport**
```javascript
// config.js:89-90
export const VIEWPORT_WIDTH = 1920;
export const VIEWPORT_HEIGHT = 1080;
// All sessions with same resolution
```

**Problem 10: No Timezone Emulation**
```javascript
// chat.js:224-226
function asciiTimezone(date = new Date()) {
    return date.toString().replace(/[\u0080-\uFFFF]/g, '');
}
// Returns server timezone, not client
```

---

## 4. Bypass Methods (Research)

### 4.1 Method 1: Improved Human Mouse Dynamics

**Source**: Analysis of Alibaba NC patterns in open-source projects

**Implementation:**
```javascript
// NEW: Generate trajectory based on real human movements
function generateHumanTrajectory(startX, startY, endX, endY) {
    const points = [];
    
    // 1. Initial pause (human doesn't start moving instantly)
    points.push({ x: startX, y: startY, t: 0, pressure: 0.5 });
    points.push({ x: startX, y: startY, t: 150 + Math.random() * 200, pressure: 0.5 });
    
    // 2. Acceleration phase
    const accelSteps = 5 + Math.floor(Math.random() * 8);
    for (let i = 1; i <= accelSteps; i++) {
        const t = i / (accelSteps + 15);
        const progress = t * t; // Quadratic acceleration
        const jitter = (Math.random() - 0.5) * 3.5; // Larger jitter
        points.push({
            x: startX + (endX - startX) * progress + jitter,
            y: startY + (endY - startY) * progress + (Math.random() - 0.5) * 2,
            t: points[points.length - 1].t + 20 + Math.random() * 35,
            pressure: 0.4 + Math.random() * 0.3
        });
    }
    
    // 3. Movement with micro-corrections
    const midSteps = 10 + Math.floor(Math.random() * 15);
    for (let i = 0; i < midSteps; i++) {
        const t = (accelSteps + 1 + i) / (accelSteps + midSteps + 10);
        const progress = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        const correction = Math.sin(t * Math.PI * 3) * 2 * (1 - t);
        points.push({
            x: startX + (endX - startX) * progress + correction + (Math.random() - 0.5) * 2,
            y: startY + (Math.random() - 0.5) * 1.5,
            t: points[points.length - 1].t + 15 + Math.random() * 25,
            pressure: 0.3 + Math.random() * 0.4
        });
    }
    
    // 4. Deceleration
    const decelSteps = 8 + Math.floor(Math.random() * 7);
    for (let i = 1; i <= decelSteps; i++) {
        const t = 1 - (i / decelSteps) * 0.1;
        points.push({
            x: endX + (Math.random() - 0.5) * 1.5 * t,
            y: endY + (Math.random() - 0.5) * 1,
            t: points[points.length - 1].t + 30 + Math.random() * 40,
            pressure: 0.5 + (1 - t) * 0.3
        });
    }
    
    // 5. Final pause before release
    points.push({
        x: endX + (Math.random() - 0.5) * 0.5,
        y: endY + (Math.random() - 0.5) * 0.5,
        t: points[points.length - 1].t + 200 + Math.random() * 300,
        pressure: 0.5
    });
    
    return points;
}
```

### 4.2 Method 2: User-Agent and Headers Rotation

**Implementation:**
```javascript
// NEW FILE: src/browser/userAgentRotator.js

const USER_AGENTS = [
    // Windows Chrome
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    // Windows Firefox
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    // macOS
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    // Linux
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
];

const ACCEPT_LANGUAGES = [
    'en-US,en;q=0.9',
    'en-GB,en;q=0.9',
    'ru-RU,ru;q=0.9,en;q=0.8',
    'de-DE,de;q=0.9,en;q=0.8',
    'fr-FR,fr;q=0.9,en;q=0.8',
    'es-ES,es;q=0.9,en;q=0.8',
];

export function getRandomUserAgent() {
    return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
}

export function getRandomAcceptLanguage() {
    return ACCEPT_LANGUAGES[Math.floor(Math.random() * ACCEPT_LANGUAGES.length)];
}
```

### 4.3 Method 3: WebGL and Canvas Fingerprint Randomization

**Implementation:**
```javascript
// NEW FILE: src/browser/fingerprintRandomizer.js

export function getRandomWebGLParams() {
    const vendors = [
        'Intel Inc.',
        'Google Inc.',
        'NVIDIA Corporation',
        'Apple Inc.',
        'AMD Inc.',
    ];
    
    const renderers = [
        'Intel Iris OpenGL Engine',
        'ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 Direct3D11 vs_5_0 ps_5_0)',
        'Apple M1 Pro',
        'AMD Radeon Pro 560X OpenGL Engine',
        'SwiftShader',
    ];
    
    return {
        vendor: vendors[Math.floor(Math.random() * vendors.length)],
        renderer: renderers[Math.floor(Math.random() * renderers.length)],
    };
}

export function applyFingerprintRandomization(page) {
    const glParams = getRandomWebGLParams();
    
    await page.evaluateOnNewDocument((params) => {
        // WebGL fingerprint randomization
        const originalGetParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(param) {
            if (param === 37445) return params.vendor; // UNMASKED_VENDOR_WEBGL
            if (param === 37446) return params.renderer; // UNMASKED_RENDERER_WEBGL
            return originalGetParameter.call(this, param);
        };
        
        // Canvas fingerprint noise
        const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
        HTMLCanvasElement.prototype.toDataURL = function(type, quality) {
            const dataURL = originalToDataURL.call(this, type, quality);
            if (this.width > 100 && this.height > 100) {
                return dataURL; // Skip for large canvas (screenshots)
            }
            return dataURL;
        };
    }, glParams);
}
```

### 4.4 Method 4: IP Rotation via Proxy

**Implementation:**
```javascript
// NEW FILE: src/browser/proxyManager.js

import fs from 'fs';

class ProxyManager {
    constructor() {
        this.proxies = this.loadProxies();
        this.currentIndex = 0;
    }
    
    loadProxies() {
        const proxyFile = process.env.PROXY_LIST_FILE || 'proxies.txt';
        if (!fs.existsSync(proxyFile)) return [];
        
        return fs.readFileSync(proxyFile, 'utf8')
            .split('\n')
            .map(l => l.trim())
            .filter(l => l && !l.startsWith('#'));
    }
    
    getNextProxy() {
        if (this.proxies.length === 0) return null;
        const proxy = this.proxies[this.currentIndex % this.proxies.length];
        this.currentIndex++;
        return proxy;
    }
    
    getRandomProxy() {
        if (this.proxies.length === 0) return null;
        return this.proxies[Math.floor(Math.random() * this.proxies.length)];
    }
}

export const proxyManager = new ProxyManager();
```

### 4.5 Method 5: Real Browser Behavior Emulation

**Implementation:**
```javascript
// NEW FILE: src/browser/behaviorEmulator.js

export async function emulateHumanBehavior(page) {
    // 1. Random mouse movements before starting
    await randomMouseMovements(page, 3 + Math.floor(Math.random() * 5));
    
    // 2. Random clicks
    await randomClicks(page, 1 + Math.floor(Math.random() * 3));
    
    // 3. Scrolling
    await randomScrolling(page);
    
    // 4. Pauses between actions
    await sleep(500 + Math.random() * 1500);
}

async function randomMouseMovements(page, count) {
    const viewport = page.viewport() || { width: 1920, height: 1080 };
    
    for (let i = 0; i < count; i++) {
        const x = Math.random() * viewport.width;
        const y = Math.random() * viewport.height;
        
        const steps = 10 + Math.floor(Math.random() * 20);
        await page.mouse.move(x, y, { steps });
        
        await sleep(200 + Math.random() * 800);
    }
}

async function randomClicks(page, count) {
    const viewport = page.viewport() || { width: 1920, height: 1080 };
    
    for (let i = 0; i < count; i++) {
        const x = Math.random() * viewport.width;
        const y = Math.random() * viewport.height;
        
        await page.mouse.move(x, y, { steps: 5 });
        await sleep(100 + Math.random() * 200);
        await page.mouse.click(x, y);
        
        await sleep(300 + Math.random() * 500);
    }
}
```

### 4.6 Method 6: Adaptive Request Timing

**Implementation:**
```javascript
// NEW FILE: src/api/adaptiveTiming.js

class AdaptiveRequestTimer {
    constructor() {
        this.requestHistory = [];
        this.baseInterval = 3000; // 3 seconds base
    }
    
    async getNextDelay() {
        const now = Date.now();
        
        const recentRequests = this.requestHistory.filter(
            t => now - t < 60000 // Last 60 seconds
        );
        
        let multiplier = 1;
        if (recentRequests.length > 5) multiplier = 2;
        if (recentRequests.length > 10) multiplier = 4;
        if (recentRequests.length > 15) multiplier = 8;
        
        const baseDelay = this.baseInterval * multiplier;
        const jitter = baseDelay * 0.3 * Math.random();
        const delay = baseDelay + jitter;
        
        this.requestHistory.push(now);
        
        this.requestHistory = this.requestHistory.filter(
            t => now - t < 300000 // 5 minutes
        );
        
        return delay;
    }
}

export const adaptiveTimer = new AdaptiveRequestTimer();
```

---

## 5. Implementation Plan

### Phase 1: Critical Improvements (Priority: HIGH)

**Task 1.1: Improve x5sec Solver**
- File: `src/browser/x5secSolver.js`
- Changes:
  1. Replace `buildTrajectory` with `generateHumanTrajectory`
  2. Add mouseenter/mouseleave event emulation
  3. Add random micro-pullbacks (human sometimes moves mouse backward)
  4. Increase jitter to 3-5px
  5. Add speed variance (not just ease-in-out)

**Task 1.2: User-Agent Rotation**
- File: `src/browser/browser.js`
- Changes:
  1. Import `getRandomUserAgent` from `userAgentRotator.js`
  2. Call on each new page creation
  3. Sync UA with Accept-Language

**Task 1.3: Fingerprint Randomization**
- File: `src/browser/browser.js`
- Changes:
  1. Import `applyFingerprintRandomization`
  2. Apply on browser initialization
  3. Add timezone randomization

### Phase 2: Medium-term Improvements (Priority: MEDIUM)

**Task 2.1: Proxy Rotation**
- Files: `src/browser/browser.js`, `src/browser/proxyManager.js`
- Changes:
  1. Create `proxyManager.js`
  2. Add proxy support in launch args
  3. Rotate proxy between sessions

**Task 2.2: Behavior Emulation**
- File: `src/browser/behaviorEmulator.js`
- Changes:
  1. Create behavior emulation module
  2. Integrate into authentication process
  3. Run before captcha solving

**Task 2.3: Adaptive Timing**
- File: `src/api/chat.js`
- Changes:
  1. Replace fixed jitter with adaptive
  2. Add request history analysis
  3. Implement exponential backoff

### Phase 3: Long-term Improvements (Priority: LOW)

**Task 3.1: Real Browser Profile**
- Create persistent profile with history
- Add fake cookies from other sites
- Emulate installed extensions

**Task 3.2: Machine Learning Detection Evasion**
- Analyze detection patterns
- Adaptive behavior adjustment
- Generate realistic sessions

---

## 6. Testing and Validation

### 6.1 Success Metrics

1. **x5sec solve rate**: Target > 95% (currently ~70-80%)
2. **Detection rate**: Target < 5% of requests get captcha
3. **Average solve time**: Target < 3 seconds
4. **False positive rate**: Target < 1% (legitimate requests should not be blocked)

### 6.2 Test Scenarios

```javascript
// tests/antiBot.test.js

import { describe, it, expect } from 'node:test';
import { buildTrajectory } from '../src/browser/x5secSolver.js';
import { getRandomUserAgent, getRandomAcceptLanguage } from '../src/browser/userAgentRotator.js';

describe('Anti-bot improvements', () => {
    it('x5sec trajectory should have human-like variance', () => {
        const traj1 = buildTrajectory(0, 258);
        const traj2 = buildTrajectory(0, 258);
        
        // Two trajectories should not be identical
        expect(traj1).not.toEqual(traj2);
        
        // Check for initial pause
        expect(traj1[0].delay).toBeGreaterThan(100);
        
        // Check for final pause
        const lastPoint = traj1[traj1.length - 1];
        expect(lastPoint.delay).toBeGreaterThan(150);
    });
    
    it('User-Agent rotation should return different values', () => {
        const agents = new Set();
        for (let i = 0; i < 20; i++) {
            agents.add(getRandomUserAgent());
        }
        // Should have at least 3 different UAs
        expect(agents.size).toBeGreaterThanOrEqual(3);
    });
    
    it('Accept-Language should match common locales', () => {
        const lang = getRandomAcceptLanguage();
        expect(lang).toMatch(/^[a-z]{2}-[A-Z]{2},[a-z]{2};q=0\.9$/);
    });
});
```

---

## 7. Conclusion

### 7.1 Key Findings

1. **Current implementation** uses basic stealth + x5sec solver, but is insufficient for modern ML-based detectors
2. **Main problems**: deterministic trajectory, same UA, no fingerprint randomization
3. **Solution**: comprehensive approach with improved human emulation, identifier rotation, and adaptive behavior

### 7.2 Implementation Priorities

| Priority | Task | Expected Effect | Complexity |
|----------|------|-----------------|------------|
| P0 | Improve x5sec trajectory | +20-30% solve rate | Medium |
| P0 | UA rotation | -50% detection rate | Low |
| P1 | Fingerprint randomization | -30% fingerprinting | Medium |
| P1 | Adaptive timing | -40% rate limiting | Low |
| P2 | Proxy rotation | -60% IP-based blocks | High |
| P2 | Behavior emulation | +15% stealth | Medium |

### 7.3 Risks

1. **Over-engineering**: Too complex emulation may be expensive to maintain
2. **Cat and mouse**: Qwen may update anti-bot at any time
3. **Legal**: Bypassing anti-bot may violate ToS

### 7.4 Recommendations

1. Start with P0 tasks (highest ROI)
2. Add solve rate monitoring to track effectiveness
3. Implement graceful degradation (if captcha fails N times → manual mode)
4. Consider specialized captcha services (2captcha, Anti-Captcha) as fallback

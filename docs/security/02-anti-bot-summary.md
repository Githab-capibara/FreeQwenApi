# Anti-Bot Summary: Qwen Chat Analysis

## What the Project Does Now

FreeQwenApi uses **Puppeteer + Stealth Plugin** to bypass Qwen anti-bot:

1. **Stealth Plugin** - removes Puppeteer automation markers
2. **Navigator spoofing** - platform, hardwareConcurrency, deviceMemory, plugins
3. **x5sec Solver** - automatic Alibaba slider captcha solver
4. **Rate Limiting** - 1 request at a time + jitter 800-2500ms
5. **Multi-account rotation** - round-robin token rotation

## Anti-Bot Technologies on chat.qwen.ai

### Detected Components:

| Component | Purpose | Markers |
|-----------|---------|---------|
| **Alibaba Cloud WAF** | Web Application Firewall | `acw_tc` cookie, `x-ap` cookie, `GA-AP` header |
| **x5sec / baxia** | Slider captcha | `#nc_1_n1z`, `#nc_1_n1t`, `#nc-sig`, `#baxia-punish` |
| **Behavioral Analysis** | Bot detection | Mouse dynamics, request patterns, fingerprinting |
| **IP Reputation** | IP-based blocking | - |

### How x5sec Captcha Works:

```
1. Request → Qwen API
2. WAF sees suspicious pattern → redirect to /_____tmd_____/punish
3. Slider loads (NC script from CDN)
4. User drags the slider
5. Server analyzes trajectory + behavioral metrics
6. Signature generated (nc_sig)
7. Success → redirect back + cookie
   Failure → error (BXFASTMARK, BXMARK, FAIL)
```

## Critical Problems with Current Implementation

### Problem 1: Deterministic Mouse Trajectory
```javascript
// CURRENT (x5secSolver.js:78-98):
const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const jitter = (Math.random() - 0.5) * 1.5; // Too small!

// PROBLEM: WAF detects by:
// - Too smooth Bezier curve
// - Same jitter every time
// - Predictable pauses
```

### Problem 2: Same User-Agent
```javascript
// CURRENT (config.js:91):
export const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ...';

// PROBLEM: All requests with same UA = easily detectable
```

### Problem 3: No Fingerprint Randomization
```javascript
// CURRENT: Missing emulation of:
// - WebGL renderer/vendor
// - Canvas fingerprint  
// - AudioContext fingerprint
// - Timezone (uses server timezone)
```

### Problem 4: Predictable Timing
```javascript
// CURRENT (config.js:74-75):
export const REQUEST_JITTER_MIN_MS = 800;
export const REQUEST_JITTER_MAX_MS = 2_500;

// PROBLEM: Fixed range is easily detectable
// Real users: 0.5s - 30s between requests
```

### Problem 5: No IP Rotation
- All requests from same IP → frequent requests cause IP blacklist

## Bypass Methods (Research)

### Method 1: Improved Human Mouse Dynamics

**Principle**: Real humans move mouse IMPERFECTLY:
- Initial pause 150-400ms before movement
- Non-linear acceleration (quadratic)
- Micro-corrections in trajectory (sin wave)
- Jitter 2-5px (not 1.5px!)
- Random pauses mid-movement
- Final pause 200-500ms before release

**Implementation**: ~80 lines of code in x5secSolver.js

### Method 2: User-Agent + Headers Rotation

**Principle**: Different browsers + OS + languages

```javascript
const USER_AGENTS = [
    // Windows Chrome (4 variants)
    // Windows Firefox (3 variants)
    // macOS Chrome (2 variants)
    // macOS Safari (2 variants)
    // Linux (2 variants)
];

const ACCEPT_LANGUAGES = [
    'en-US,en;q=0.9',
    'ru-RU,ru;q=0.9,en;q=0.8',
    'de-DE,de;q=0.9,en;q=0.8',
    // ...
];
```

**Implementation**: New file userAgentRotator.js (~60 lines)

### Method 3: WebGL + Canvas Fingerprint Randomization

**Principle**: Spoof WebGL renderer/vendor + canvas noise

```javascript
WebGLRenderingContext.prototype.getParameter = function(param) {
    if (param === 37445) return 'Intel Inc.'; // VENDOR
    if (param === 37446) return 'Intel Iris OpenGL Engine'; // RENDERER
    return originalGetParameter.call(this, param);
};
```

**Implementation**: ~40 lines in browser.js

### Method 4: Adaptive Request Timing

**Principle**: Smart jitter based on request history

```javascript
// More recent requests = longer pause
if (recentRequests.length > 10) multiplier = 4;
if (recentRequests.length > 15) multiplier = 8;

const delay = baseInterval * multiplier + randomJitter;
```

**Implementation**: New file adaptiveTiming.js (~50 lines)

### Method 5: Proxy Rotation

**Principle**: Rotate IP between sessions

```javascript
// proxies.txt:
user:pass@ip:port
user:pass@ip:port

// proxyManager.js:
const proxy = proxyManager.getRandomProxy();
args.push(`--proxy-server=${proxy}`);
```

**Implementation**: New file proxyManager.js (~40 lines)

### Method 6: Behavior Emulation

**Principle**: Emulate real behavior before captcha

```javascript
// 1. Random mouse movements (3-8 times)
// 2. Random clicks (1-3 times)
// 3. Page scrolling
// 4. Pauses 500-2000ms between actions
```

**Implementation**: New file behaviorEmulator.js (~80 lines)

## Implementation Plan

### Phase 1: Critical Improvements (1-2 days)

| Task | File | Lines | Effect |
|------|------|-------|--------|
| Improve x5sec trajectory | x5secSolver.js | ~80 | +20-30% solve rate |
| UA rotation | userAgentRotator.js | ~60 | -50% detection |
| Fingerprint randomization | browser.js | ~40 | -30% fingerprinting |

### Phase 2: Medium-term (2-3 days)

| Task | File | Lines | Effect |
|------|------|-------|--------|
| Adaptive timing | adaptiveTiming.js | ~50 | -40% rate limiting |
| Behavior emulation | behaviorEmulator.js | ~80 | +15% stealth |
| Proxy rotation | proxyManager.js | ~40 | -60% IP blocks |

### Phase 3: Long-term (week+)

- Real browser profile with history
- ML-based detection evasion
- Integration with 2captcha/Anti-Captcha as fallback

## Specific Changes

### 1. Modify x5secSolver.js

Replace `buildTrajectory` function (20 lines) with new version (80 lines):
- Initial pause 150-400ms
- Quadratic acceleration (5-12 steps)
- Sigmoid curve with micro-corrections (10-25 steps)
- Deceleration (8-15 steps)
- Final pause 200-500ms
- Jitter 2-5px instead of 1.5px
- Random pauses mid-movement

### 2. Add userAgentRotator.js

New file with arrays:
- 13 User-Agents (Windows/Mac/Linux + Chrome/Firefox/Safari)
- 8 Accept-Languages
- 8 Timezones
- Functions: `getRandomUserAgent()`, `getRandomAcceptLanguage()`, `getRandomTimezone()`

### 3. Modify browser.js

Add:
```javascript
import { getRandomUserAgent, getRandomAcceptLanguage, getRandomTimezone } from './userAgentRotator.js';

// On page creation:
const randomUA = getRandomUserAgent();
await page.setUserAgent(randomUA);

// In evaluateOnNewDocument:
// - Timezone spoofing via Intl.DateTimeFormat
// - WebGL fingerprint randomization
// - Random deviceMemory (4/8/16)
```

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| x5sec solve rate | ~70-80% | >95% |
| Detection rate | ~15-20% | <5% |
| Average solve time | 3-5s | <3s |
| False positive rate | ~5% | <1% |

## Risks

1. **Over-engineering**: Too complex emulation = expensive to maintain
2. **Cat and mouse**: Qwen will update anti-bot → need to adapt
3. **Legal**: Bypassing ToS may be a violation

## Recommendations

1. **Start with P0** (x5sec trajectory + UA rotation) - highest ROI
2. **Add monitoring** for solve rate tracking
3. **Graceful degradation**: If N attempts fail → manual mode
4. **Fallback**: Integrate with 2captcha for difficult cases

---

**Full report**: See `security/01-anti-bot-analysis.md` (30+ pages with code)

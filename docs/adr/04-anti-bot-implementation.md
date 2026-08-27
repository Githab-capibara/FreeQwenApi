# 04. Implement Anti-Bot Evasion Measures

- **Status:** Accepted
- **Date:** 2025-08-09
- **Deciders:** @Githab-capibara
- **Related:** [01-browser-proxy-architecture.md](01-browser-proxy-architecture.md)

## Context

Qwen Chat employs multiple layers of bot detection: Alibaba Cloud WAF, x5sec/baxia slider CAPTCHA, behavioral analysis (mouse dynamics, request patterns), and IP reputation scoring. A naive browser automation setup is quickly detected and blocked. We need active anti-bot evasion to maintain reliable access.

The baseline Puppeteer setup triggers detection within minutes due to:
- Deterministic mouse trajectories (smooth Bezier curves)
- Static user agent across all sessions
- No browser fingerprint randomization (WebGL, canvas, audio)
- Predictable request timing patterns
- No IP rotation

## Decision

We implement a multi-layer anti-bot evasion strategy:

1. **Improved x5sec solver** — human-like mouse trajectory with initial pause, quadratic acceleration, micro-corrections, random pauses, and final pause before release. Jitter increased from 1.5px to 2-5px.
2. **User-Agent rotation** — 13 variants across Windows/Mac/Linux + Chrome/Firefox/Safari, with matching Accept-Language and timezone randomization.
3. **Fingerprint randomization** — WebGL vendor/renderer spoofing, canvas noise injection, random hardwareConcurrency (4-16 cores), random deviceMemory (4-16 GB).
4. **Adaptive timing** — request delay multiplier increases with recent request count to mimic human pacing.
5. **Event listener wrapping** — random micro-delays on mouse events to break deterministic timing.

## Consequences

- **Easier:** Significantly lower detection rate; higher x5sec solve rate (target 90-95%); sessions last longer between CAPTCHA challenges
- **Harder:** More code to maintain; fingerprint randomization must stay consistent within a session; risk of over-engineering detection evasion
- **Given up:** Perfect reproducibility (randomized fingerprints mean each session is unique); simplicity of static configuration
- **Migration:** If Qwen upgrades their anti-bot system, these measures may need revision. The architecture allows swapping evasion modules without changing the core proxy logic.

## Alternatives considered

- **Option A: No anti-bot evasion (naive Puppeteer)** — rejected because Qwen blocks naive automation within minutes; unsustainable for any real usage
- **Option B: Third-party CAPTCHA solving service (2captcha, Anti-Captcha)** — rejected because it adds cost, latency (human solvers take 10-30s), and dependency on external service availability
- **Option C: CloakBrowser (C++ Chromium patches)** — considered as the gold standard (71 patches, 0.9 reCAPTCHA v3 score) but rejected for initial implementation due to 200MB download size and longer setup time; kept as a future upgrade path
- **Option D: Playwright with stealth only** — rejected because Puppeteer has a more mature stealth plugin ecosystem; Playwright's built-in stealth is less tested against Alibaba's WAF
- **Option E: Direct API reverse-engineering (no browser)** — rejected because Qwen's internal API changes frequently and requires complex authentication flows that are easier handled by a real browser

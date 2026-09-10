# 02. Anti-Bot Findings Summary

- **Status:** Active
- **Date:** 2026-08-21
- **Deciders:** @Githab-capibara
- **Related:** [ADR 04 — Anti-Bot Implementation](../adr/04-anti-bot-implementation.md), [Full Analysis](01-anti-bot-analysis.md)

## Purpose

Brief summary of anti-bot findings on chat.qwen.ai and the current FreeQwenApi bypass status.

## Current Implementation

FreeQwenApi uses **Puppeteer + Stealth Plugin** to bypass Qwen anti-bot:

1. **Stealth Plugin** — removes Puppeteer automation markers
2. **Navigator spoofing** — platform, hardwareConcurrency, deviceMemory, plugins
3. **x5sec Solver** — automatic Alibaba slider captcha solver
4. **User-Agent rotation** — 19 User-Agents across Windows/Mac/Linux + Chrome/Firefox/Safari
5. **Rate Limiting** — 1 request at a time + jitter 800-2500ms
6. **Multi-account rotation** — round-robin token rotation

## Detected Anti-Bot Technologies

| Component | Purpose | Markers |
|-----------|---------|---------|
| Alibaba Cloud WAF | Web Application Firewall | `acw_tc` cookie, `x-ap` cookie |
| x5sec / baxia | Slider captcha | `#nc_1_n1z`, `#nc-sig`, `#baxia-punish` |
| Behavioral Analysis | Bot detection | Mouse dynamics, fingerprinting |
| IP Reputation | IP-based blocking | — |

## Known Problems

1. **Deterministic mouse trajectory** — too smooth Bezier curve, predictable pauses
2. **Fixed jitter range** — 800-2500ms is easily detectable (real users: 0.5s–30s)
3. **No fingerprint randomization** — WebGL, Canvas, AudioContext not spoofed
4. **No IP rotation** — all requests from same IP

## Recommendations

1. Start with improved x5sec trajectory + UA rotation (highest ROI)
2. Add monitoring for solve rate tracking
3. Graceful degradation: if N attempts fail, switch to manual mode
4. Fallback: integrate with 2captcha for difficult cases

## Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| x5sec solve rate | ~70-80% | >95% |
| Detection rate | ~15-20% | <5% |

**Full analysis**: See [01-anti-bot-analysis.md](01-anti-bot-analysis.md)

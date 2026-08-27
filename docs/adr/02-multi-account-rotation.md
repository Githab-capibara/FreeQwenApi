# 02. Implement Multi-Account Round-Robin Rotation

- **Status:** Accepted
- **Date:** 2025-08-09
- **Deciders:** @Githab-capibara
- **Related:** [01-browser-proxy-architecture.md](01-browser-proxy-architecture.md)

## Context

Qwen Chat imposes rate limits on individual accounts. For agent workloads and demo scenarios, a single account is insufficient — requests get rate-limited quickly. Users need a way to distribute load across multiple Qwen Chat accounts.

The system needs to:
- Support multiple authenticated Qwen accounts
- Automatically rotate between accounts when one hits rate limits
- Maintain account-to-resource affinity (chats, files, tasks are bound to specific accounts)
- Handle token expiration gracefully across all accounts

## Decision

We implement a **round-robin token rotation** system with account affinity tracking. The `tokenManager.js` module maintains a list of valid tokens and rotates through them in round-robin fashion. The `accountAffinity.js` module tracks which account owns which chat/task/file resources, ensuring subsequent requests for the same resource use the correct account.

## Consequences

- **Easier:** Higher effective rate limits; graceful degradation when individual accounts are limited; support for heavy agent workloads; users can add accounts as needed
- **Harder:** More complex session management; need to track account-resource bindings in memory; token expiration handling across multiple accounts; debugging requires checking multiple account states
- **Given up:** Simplicity of single-account design; ability to persist account-resource bindings across restarts (bindings are in-memory only); deterministic request routing
- **Migration:** If Qwen introduces account-level API keys, the rotation system can be simplified to key rotation rather than session token rotation. The round-robin logic remains useful regardless of auth mechanism.

## Alternatives considered

- **Option A: Single account with cooldown** — rejected because it severely limits throughput for agent workloads; a single account hits rate limits within minutes under heavy use
- **Option B: Random account selection** — rejected because round-robin provides more even distribution and predictable behavior; random selection can lead to uneven load and some accounts being overused
- **Option C: Load-based selection (least-loaded first)** — rejected because it adds complexity (tracking per-account request counts, response times) without significant benefit over round-robin for our use case where all accounts have similar rate limits
- **Option D: Sticky sessions (hash-based routing)** — rejected because it doesn't handle rate limits well; if a hashed account hits its limit, the request fails rather than routing to another account
- **Option E: Queue-based serialization (single account at a time)** — rejected because it serializes all requests through one account, defeating the purpose of multi-account support

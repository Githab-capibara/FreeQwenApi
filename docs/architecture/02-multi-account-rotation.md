# 02. Implement Multi-Account Round-Robin Rotation

- **Status:** Accepted
- **Date:** 2025-08-09
- **Deciders:** @ForgetMeAI
- **Related:** N/A

## Context

Qwen Chat imposes rate limits on individual accounts. For agent workloads and demo scenarios, a single account is insufficient — requests get rate-limited quickly. Users need a way to distribute load across multiple Qwen Chat accounts.

The system needs to:
- Support multiple authenticated Qwen accounts
- Automatically rotate between accounts when one hits rate limits
- Maintain account-to-resource affinity (chats, files, tasks are bound to specific accounts)

## Decision

We implement a **round-robin token rotation** system with account affinity tracking. The `tokenManager.js` module maintains a list of valid tokens and rotates through them in round-robin fashion. The `accountAffinity.js` module tracks which account owns which chat/task/file resources, ensuring subsequent requests for the same resource use the correct account.

## Consequences

- **Easier:** Higher effective rate limits; graceful degradation when individual accounts are limited; support for heavy agent workloads
- **Harder:** More complex session management; need to track account-resource bindings in memory; token expiration handling across multiple accounts
- **Given up:** Simplicity of single-account design; ability to persist account-resource bindings across restarts (bindings are in-memory only)
- **Migration:** If Qwen introduces account-level API keys, the rotation system can be simplified to key rotation rather than session token rotation

## Alternatives Considered

- **Option A: Single account with cooldown** — rejected because it severely limits throughput for agent workloads
- **Option B: Random account selection** — rejected because round-robin provides more even distribution and predictable behavior
- **Option C: Load-based selection (least-loaded first)** — rejected because it adds complexity without significant benefit over round-robin for our use case

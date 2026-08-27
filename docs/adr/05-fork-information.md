# 05. Record fork provenance

- **Status:** Accepted
- **Date:** 2025-08-21
- **Deciders:** @Githab-capibara
- **Related:** N/A

## Context

This repository is a fork of the original FreeQwenApi project. The fork was created to customize the project for a specific account and use case. Future maintainers need to know the fork's origin to understand any divergences from upstream, avoid confusion about which version to base changes on, and correctly attribute the work.

This fork (ForgetMeAI) was created to add features such as image/video generation, improved multi-account rotation, anti-bot evasion enhancements, and integration guides for various AI agents (Hermes, Claude Code, Codex, OpenClaw, LiteLLM).

## Decision

We maintain a fork information record in the architecture documentation and the root README to track the fork's provenance and any customizations made for this specific deployment. The fork lineage is documented:

- **Upstream:** [FreeQwenApi](https://github.com/nicepkg/FreeQwenApi) (original by nicepkg)
- **This fork:** [ForgetMeAI/FreeQwenApi](https://github.com/ForgetMeAI/FreeQwenApi)
- **Fork date:** 2025-08-21
- **Brand attribution:** ForgetMeAI watermark (`t.me/forgetmeai`) in README, CLI output, and health/media metadata

Future maintainers should consult this document when deciding whether to merge upstream changes or maintain fork-specific divergences.

## Consequences

- **Easier:** Clear attribution and fork lineage; easy identification of upstream vs. custom changes; smooth onboarding for new maintainers who may not know the project's history
- **Harder:** Need to maintain fork metadata when merging upstream changes; potential for drift if upstream evolves significantly
- **Given up:** Direct upstream merge compatibility without manual reconciliation
- **Migration:** If the fork is merged back or abandoned, this ADR should be marked as `Superseded`. If upstream changes are merged, this document should be updated to reflect any divergences introduced or resolved.

## Alternatives considered

- **Option A: No fork record** — rejected because future maintainers would have no visibility into the fork's origin; would lead to confusion about which version to base changes on
- **Option B: Fork info in README only** — rejected because README is user-facing and gets rewritten frequently; architecture decisions belong in ADRs for permanence and discoverability
- **Option C: Fork info in CHANGELOG only** — rejected because CHANGELOG records what changed, not why a fork exists; it doesn't serve as a stable reference point

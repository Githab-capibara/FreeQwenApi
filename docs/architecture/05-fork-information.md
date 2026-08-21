# 05. Document Fork Information

- **Status:** Accepted
- **Date:** 2025-08-21
- **Deciders:** @Githab-capibara
- **Related:** N/A

## Context

This repository is a fork of the original FreeQwenApi project. The fork was created to customize the project for a specific account and use case. Future maintainers need to know the fork's origin to understand any divergences from upstream.

## Decision

We maintain a fork information record in the architecture documentation to track the fork's provenance and any customizations made for this specific deployment.

## Consequences

- **Easier:** Clear attribution and fork lineage; easy identification of upstream vs. custom changes
- **Harder:** Need to maintain fork metadata when merging upstream changes
- **Given up:** Direct upstream merge compatibility without manual reconciliation
- **Migration:** If the fork is merged back or abandoned, this ADR should be marked as Superseded

## Alternatives Considered

- **Option A: No fork record** — rejected because future maintainers would have no visibility into the fork's origin
- **Option B: Fork info in README only** — rejected because README is user-facing; architecture decisions belong in ADRs

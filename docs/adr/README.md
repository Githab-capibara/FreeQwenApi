# Architecture Decision Records

This directory contains the **Architecture Decision Records** (ADRs) for FreeQwenApi — short, numbered, append-only documents that capture non-obvious architectural decisions, their context, and their consequences.

## When to write one

Write an ADR when the answer to "why is the code shaped this way?" needs to be available to a future maintainer who was not in the room when the decision was made.

## Index

| # | Title | Date | Status |
|---|-------|--------|--------|
| [01](01-browser-proxy-architecture.md) | Use browser-based proxy architecture | 2025-08-09 | Accepted |
| [02](02-multi-account-rotation.md) | Implement multi-account round-robin rotation | 2025-08-09 | Accepted |
| [03](03-openai-compatible-shim.md) | Provide OpenAI-compatible API shim | 2025-08-09 | Accepted |
| [04](04-anti-bot-implementation.md) | Implement anti-bot evasion measures | 2025-08-09 | Accepted |
| [05](05-fork-information.md) | Record fork provenance | 2025-08-21 | Accepted |
| [06](06-github-actions-security-pipeline.md) | Run the security pipeline on GitHub Actions | 2026-11-05 | Accepted |

Keep this index in sync when you land a new ADR.

## Format

Each ADR follows the [Michael Nygard format](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions):

1. **Title** — short, imperative, present tense.
2. **Status** — `Proposed` / `Accepted` / `Deprecated` / `Superseded by ADR-NN`.
3. **Context** — the forces at play.
4. **Decision** — what we are doing.
5. **Consequences** — what becomes easier/harder.
6. **Alternatives considered** — the designs that lost.

## Template

Use [`template.md`](template.md) as the starting point for new ADRs.

## Lifecycle

- Numbered sequentially, two digits, never renumbered: `01-...`, `02-...`.
- File name kebab-case, a concise noun phrase derived from the title (2–3 words where possible, e.g. `07-c2-framework-selection.md`).
- Append-only. To change a decision, write a new ADR that supersedes the old one.

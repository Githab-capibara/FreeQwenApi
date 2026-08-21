# Architecture

This directory contains Architecture Decision Records (ADRs) for FreeQwenApi.

## When to write one

Write an ADR when the answer to "why is the code shaped this way?" needs to be available to a future maintainer who was not in the room when the decision was made.

## Contents

| File | Description | Status |
|------|-------------|--------|
| [01-browser-proxy-architecture.md](01-browser-proxy-architecture.md) | Use browser-based proxy architecture | Accepted |
| [02-multi-account-rotation.md](02-multi-account-rotation.md) | Implement multi-account round-robin rotation | Accepted |
| [03-openai-compatible-shim.md](03-openai-compatible-shim.md) | Provide OpenAI-compatible API shim | Accepted |
| [04-anti-bot-implementation.md](04-anti-bot-implementation.md) | Implement anti-bot evasion measures | Accepted |
| [05-fork-information.md](05-fork-information.md) | Document fork information | Accepted |

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
- File name kebab-case, derived from the title.
- Append-only. To change a decision, write a new ADR that supersedes the old one.

# NN. Title

- **Status:** Draft | Accepted
- **Date:** YYYY-MM-DD
- **Author:** GitHub handle
- **Related:** links to ADRs, API docs, design docs

## Overview

Brief description of the architectural component or system being documented.

## Goals

- What this architecture aims to achieve
- Key quality attributes (performance, reliability, extensibility)

## Non-Goals

- What is explicitly out of scope for this architecture

## Architecture Diagram

<!-- Insert or link to architecture diagram -->

```
[Diagram description or mermaid/ASCII representation]
```

## Components

### Component 1
- **Purpose:** What it does
- **Technologies:** What it uses
- **Interfaces:** Key APIs or contracts it exposes

### Component 2
- **Purpose:** What it does
- **Technologies:** What it uses
- **Interfaces:** Key APIs or contracts it exposes

## Data Flow

Describe how data moves through the system:
1. Entry point →
2. Processing stage →
3. Output

## Decisions

Reference to relevant ADRs that govern these architectural choices.

| ADR | Decision |
|-----|----------|
| [01](../adr/01-browser-proxy-architecture.md) | Use browser-based proxy |
| [03](../adr/03-openai-compatible-shim.md) | Provide OpenAI-compatible shim |

## Trade-offs

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Performance | Browser proxy | Accepts higher resource cost for anti-bot resilience |
| Compatibility | OpenAI shim | Enables integration with existing tooling |
| Complexity | In-process proxy | Avoids external dependency on LiteLLM |

## References

- [ADR Index](../adr/README.md)
- [API Reference](../api/README.md)
- [Setup Guide](../setup/README.md)

## Status

- **Last updated:** YYYY-MM-DD
- **Owner:** GitHub handle

# 04. Agent Working Principles

- **Status:** Accepted
- **Date:** 2026-08-23
- **Deciders:** @Githab-capibara
- **Related:** docs/README.md

## Context

Project maintenance requires consistent, safe, and documented changes. Previous incidents showed drift when principles were not enforced.

## Decision

We enforce the following working principles for all contributors and agents:

1. Never be lazy. Always work at maximum quality.
2. Always reconnaissance before action. Understand the problem first, then act.
3. If you make changes, update documentation.
4. If you add a feature, update documentation.
5. If you make changes, update existing tests or write new tests.
6. If you add a feature, update existing tests or write new tests.
7. After any work, verify nothing is broken.
8. When working with systems, be maximally careful.
9. When working with GitHub, use the `gh` command, it is already configured.
10. When committing, always set the commit author to:
    - Name: `Githab-capibara`
    - Email: `rrrarrr37r@gmail.com`
11. Documentation style follows the project standard:
    - ADR format Michael Nygard
    - Design documents research note format
    - Subfolder README tables `Guide | Purpose`
    - Main README with badges, hero image/video, benchmark donut chart, architecture diagrams SVG, tables with links to docs
12. If documentation is not in the required style, fix it.

## Consequences

- **Easier:** Consistent documentation, fewer regressions, traceable decisions.
- **Harder:** Higher upfront effort for each change.
- **Given up:** Speed over quality trade-offs.
- **Migration:** Existing docs will be migrated to the standard.

## Alternatives considered

- **Option A: No principles** — rejected because it leads to inconsistency.
- **Option B: Informal guidelines** — rejected because enforcement is weak.

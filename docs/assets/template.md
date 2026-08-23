# Asset Template

A starting point for a new visual asset in this `assets/` directory.

- **Name:** `nn-descriptive-name.svg` (kebab-case, two-digit prefix to match
  the documentation folder's numbering scheme).
- **Format:** SVG (scalable, text-based, diff-friendly).
- **Palette:** match the project's dark theme — background `#0d1117`,
  text `#e6edf3`, muted `#8b949e`, accents `#2ecc71` / `#3498db` /
  `#e67e22` / `#9b59b6`.
- **Size:** include `viewBox` and `width`/`height`; keep under ~4 KB.

Name example: `01-benchmark-donut.svg`. Reference it from a doc using a
markdown image tag whose path points at `assets/your-file.svg`
(replace with your actual file name).

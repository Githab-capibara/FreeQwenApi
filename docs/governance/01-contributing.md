# Contributing

Thanks for wanting to improve FreeQwenApi.

## Getting started

1. Fork and clone the repository.
2. Install dependencies: `npm install`.
3. Copy `.env.example` to `.env` and configure your Qwen Chat token(s).
4. Run the proxy: `npm start`.

## Before you open a pull request

- Run the test suite: `npm test`.
- Keep documentation in sync — if you change behaviour, update the relevant
  file under `docs/` (and its folder `README.md` index).
- New architecture decisions belong in an ADR:
  `docs/adr/` + `template.md`, numbered sequentially, two digits.
- Follow the Michael Nygard ADR format already used in `docs/adr/`.

## Style

- JavaScript: Prettier/ESLint config shipped in the repo is the source of truth.
- Documentation: English, lowercase kebab-case file names, numbered per folder.

## License

By contributing, you agree your contributions are licensed under the MIT
License (see `LICENSE`).

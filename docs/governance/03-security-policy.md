# Security Policy

## Supported Versions

FreeQwenApi is a personal/community proxy project. Security fixes are applied
to the latest `main` branch.

## Reporting a Vulnerability

If you discover a security issue (e.g. credential leakage, an injection in the
request pipeline, or a way to extract another account's conversation state),
please report it privately:

- Open a private security advisory on the repository, **or**
- Contact the maintainer via Telegram: [t.me/forgetmeai](https://t.me/forgetmeai)

Do **not** open a public issue for security vulnerabilities.

## Scope notes

FreeQwenApi mediates access to a third-party service (Qwen Chat) through a
headless browser. Issues that originate in the upstream service or its
anti-bot controls are out of scope; focus reports on the proxy's own code
(paths under `src/`, `index.js`, `main.py`).

#!/usr/bin/env node
/**
 * Minimal reverse proxy that injects a bearer token into every request.
 *
 * The OWASP ZAP API scan cannot add an `Authorization` header to the
 * requests it derives from an OpenAPI document: the header is not present in
 * the request, so the ZAP replacer (which replaces existing headers) never
 * matches it. As a result the protected endpoints answer with `401` and the
 * dynamic scan would never exercise the authenticated surface.
 *
 * This proxy closes that gap. The CI job starts it between ZAP and the API
 * server, so ZAP scans the authenticated surface exactly like a real client
 * would.
 *
 * Environment variables:
 *   AUTH_PROXY_TARGET  base URL of the API server (default http://127.0.0.1:3264)
 *   AUTH_PROXY_TOKEN   the bearer token to inject (required)
 *   AUTH_PROXY_PORT    port to listen on (default 3266)
 *
 * Usage:
 *   node scripts/ci/auth-proxy.js
 */

import http from 'node:http';

const target = new URL(process.env.AUTH_PROXY_TARGET ?? 'http://127.0.0.1:3264');
const token = process.env.AUTH_PROXY_TOKEN;
const port = Number.parseInt(process.env.AUTH_PROXY_PORT ?? '3266', 10);

if (!token) {
    console.error('AUTH_PROXY_TOKEN is required');
    process.exit(1);
}

if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    console.error(`Invalid AUTH_PROXY_PORT: ${process.env.AUTH_PROXY_PORT}`);
    process.exit(1);
}

const server = http.createServer((req, res) => {
    const headers = {
        ...req.headers,
        host: target.host,
        authorization: `Bearer ${token}`,
    };

    const upstream = http.request(
        {
            hostname: target.hostname,
            port: target.port || 80,
            path: req.url,
            method: req.method,
            headers,
        },
        (upstreamRes) => {
            res.writeHead(upstreamRes.statusCode ?? 502, upstreamRes.headers);
            upstreamRes.pipe(res);
        },
    );

    upstream.on('error', (error) => {
        console.error(`auth-proxy: upstream request failed: ${error.message}`);
        res.writeHead(502, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'upstream unavailable' }));
    });

    req.pipe(upstream);
});

server.listen(port, '127.0.0.1', () => {
    console.log(`auth-proxy: 127.0.0.1:${port} -> ${target.origin}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
        server.close(() => process.exit(0));
    });
}

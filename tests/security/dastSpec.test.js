import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import yaml from 'js-yaml';

const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..');
const SCRIPT = path.join(REPO_ROOT, 'scripts', 'ci', 'build-dast-spec.js');

function buildSpec(env = {}) {
  const output = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dast-spec-')), 'openapi.yaml');
  const stdout = execFileSync(process.execPath, [SCRIPT, output], {
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });
  return { output, stdout, document: yaml.load(fs.readFileSync(output, 'utf8')) };
}

test('the DAST scope contains exactly the deterministic endpoints', () => {
  const { document } = buildSpec();
  assert.deepEqual(
    Object.keys(document.paths).sort(),
    ['/', '/health', '/models', '/status', '/v1/models'],
  );
});

test('the DAST scope never contains the upstream-backed endpoints', () => {
  const { document } = buildSpec();
  const upstreamBacked = ['/chat', '/chat/completions', '/v1/chat/completions', '/messages', '/responses'];
  for (const route of upstreamBacked) {
    assert.ok(!(route in document.paths), `${route} must not be part of the DAST scope`);
  }
});

test('the DAST scope keeps the security scheme and the referenced schemas', () => {
  const { document } = buildSpec();
  assert.ok(document.components.securitySchemes.bearerAuth, 'the bearer scheme must survive');
  assert.ok(document.components.schemas.Error, 'the shared schemas must survive');
  assert.ok(
    document.paths['/health'].get.responses['401'],
    'the 401 response must survive',
  );
});

test('the DAST scope can be narrowed through the environment', () => {
  const { document } = buildSpec({ DAST_PATH_REGEX: '^/health$' });
  assert.deepEqual(Object.keys(document.paths), ['/health']);
});

test('the DAST scope refuses to build an empty document', () => {
  const output = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'dast-spec-')), 'openapi.yaml');
  assert.throws(
    () =>
      execFileSync(process.execPath, [SCRIPT, output], {
        env: { ...process.env, DAST_PATH_REGEX: '^/does-not-exist$' },
        stdio: 'pipe',
      }),
    /no path matched/,
  );
});

test('the DAST scope is derived from the canonical contract', () => {
  const canonical = yaml.load(
    fs.readFileSync(path.join(REPO_ROOT, 'openapi', 'openapi.yaml'), 'utf8'),
  );
  const { document } = buildSpec();
  for (const [route, operations] of Object.entries(document.paths)) {
    assert.deepEqual(
      operations,
      canonical.paths[route],
      `${route} must be identical to the canonical contract`,
    );
  }
});

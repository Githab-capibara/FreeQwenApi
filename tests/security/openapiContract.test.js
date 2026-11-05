import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import yaml from 'js-yaml';

const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..');
const CONTRACT_PATH = path.join(REPO_ROOT, 'openapi', 'openapi.yaml');

// Endpoints that the Express router intentionally serves before the
// authentication middleware is installed (src/api/routes.js).
const PUBLIC_OPERATIONS = new Set(['headServiceRoot', 'getServiceRoot']);

function loadContract() {
  const raw = fs.readFileSync(CONTRACT_PATH, 'utf8');
  const contract = yaml.load(raw);
  assert.ok(contract, 'the OpenAPI contract is empty');
  return contract;
}

function operations(contract) {
  const result = [];
  for (const [pathKey, pathItem] of Object.entries(contract.paths ?? {})) {
    for (const [method, operation] of Object.entries(pathItem)) {
      if (!['get', 'post', 'put', 'delete', 'patch', 'head'].includes(method)) continue;
      result.push({ pathKey, method, operation });
    }
  }
  return result;
}

test('the OpenAPI contract is a valid 3.1 document with a security scheme', () => {
  const contract = loadContract();
  assert.match(contract.openapi, /^3\.1\./);
  assert.ok(contract.components?.securitySchemes?.bearerAuth, 'bearerAuth is missing');
  assert.equal(contract.components.securitySchemes.bearerAuth.scheme, 'bearer');
});

test('every operation declares an operationId, description and tags', () => {
  const contract = loadContract();
  for (const { pathKey, method, operation } of operations(contract)) {
    const label = `${method.toUpperCase()} ${pathKey}`;
    assert.ok(operation.operationId, `${label}: operationId is missing`);
    assert.ok(operation.description, `${label}: description is missing`);
    assert.ok(Array.isArray(operation.tags) && operation.tags.length > 0, `${label}: tags are missing`);
  }
});

test('operationIds are unique across the contract', () => {
  const contract = loadContract();
  const ids = operations(contract).map(({ operation }) => operation.operationId);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.deepEqual(duplicates, [], `duplicate operationIds: ${duplicates.join(', ')}`);
});

test('every protected operation documents the 401 response', () => {
  const contract = loadContract();
  for (const { pathKey, method, operation } of operations(contract)) {
    const label = `${method.toUpperCase()} ${pathKey}`;
    if (PUBLIC_OPERATIONS.has(operation.operationId)) continue;
    const responses = operation.responses ?? {};
    assert.ok(
      responses['401'],
      `${label}: a protected operation must document the 401 response`,
    );
    assert.ok(
      responses['401'].description,
      `${label}: the 401 response must carry a description`,
    );
  }
});

test('operations that opt out of authentication are limited to the public root', () => {
  const contract = loadContract();
  for (const { pathKey, method, operation } of operations(contract)) {
    const label = `${method.toUpperCase()} ${pathKey}`;
    const unauthenticated = Array.isArray(operation.security) && operation.security.length === 0;
    if (!unauthenticated) continue;
    assert.ok(
      PUBLIC_OPERATIONS.has(operation.operationId),
      `${label}: only the public root may opt out of authentication`,
    );
  }
});

test('the contract does not advertise example.com as a server', () => {
  const contract = loadContract();
  for (const server of contract.servers ?? []) {
    assert.doesNotMatch(
      server.url ?? '',
      /example\.com/,
      'the contract must not point at example.com',
    );
  }
});

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

const REPO_ROOT = path.resolve(import.meta.dirname, '..', '..');
const MATRIX_FILE = path.join(REPO_ROOT, '.github', 'security-areas.json');

const matrix = JSON.parse(fs.readFileSync(MATRIX_FILE, 'utf8'));
const areas = matrix.areas ?? [];

function readRepositoryFile(relativePath) {
  const file = path.join(REPO_ROOT, relativePath);
  assert.ok(fs.existsSync(file), `missing file referenced by the coverage matrix: ${relativePath}`);
  return fs.readFileSync(file, 'utf8');
}

test('the coverage matrix declares ten security areas', () => {
  assert.equal(areas.length, 10, 'the pipeline must cover exactly ten security areas');
  assert.deepEqual(
    areas.map((area) => area.id),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    'the area identifiers must be numbered 1..10 without gaps',
  );
});

test('every security area is covered by at least three distinct tools', () => {
  const minimum = matrix.minimumToolsPerArea ?? 3;
  for (const area of areas) {
    const names = (area.tools ?? []).map((tool) => tool.name);
    assert.ok(
      names.length >= minimum,
      `area ${area.id} ("${area.title}") is covered by ${names.length} tool(s), ${minimum} are required`,
    );
    assert.equal(
      new Set(names).size,
      names.length,
      `area ${area.id} lists the same tool twice`,
    );
  }
});

test('every tool of every area is really invoked by the pipeline', () => {
  for (const area of areas) {
    const contents = (area.files ?? []).map(readRepositoryFile).join('\n');
    for (const tool of area.tools ?? []) {
      assert.ok(
        contents.includes(tool.match),
        `area ${area.id} claims the tool "${tool.name}" but "${tool.match}" is not invoked by ${area.files.join(', ')}`,
      );
    }
  }
});

test('every area names the files that implement it', () => {
  const allowedPrefixes = ['.github/', 'scripts/ci/'];
  for (const area of areas) {
    assert.ok(Array.isArray(area.files) && area.files.length > 0, `area ${area.id} names no file`);
    for (const file of area.files) {
      assert.ok(
        allowedPrefixes.some((prefix) => file.startsWith(prefix)),
        `area ${area.id} references a file outside the pipeline assets: ${file}`,
      );
    }
  }
});

test('every workflow belongs to at least one security area', () => {
  const workflowDir = path.join(REPO_ROOT, '.github', 'workflows');
  const workflows = fs
    .readdirSync(workflowDir)
    .filter((name) => name.endsWith('.yml') || name.endsWith('.yaml'))
    .map((name) => `.github/workflows/${name}`);

  const covered = new Set(areas.flatMap((area) => area.files ?? []));
  for (const workflow of workflows) {
    assert.ok(covered.has(workflow), `${workflow} is not mapped to any security area`);
  }
});

test('the coverage matrix is referenced by the pipeline policy test', () => {
  const pythonTest = fs.readFileSync(
    path.join(REPO_ROOT, 'tests', 'security', 'test_ci_pipeline_policy.py'),
    'utf8',
  );
  assert.match(pythonTest, /security-areas\.json/);
});

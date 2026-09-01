import assert from 'node:assert/strict';
import { access, readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { PUBLIC_DIRECTORIES } from '../scripts/build-static.mjs';

const root = path.resolve(import.meta.dirname, '..');

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

function relative(file) {
  return path.relative(root, file).split(path.sep).join('/');
}

async function relativeImports(file) {
  const source = await readFile(file, 'utf8');
  const imports = [];
  for (const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*)['"]([^'"]+)['"]/g)) {
    if (match[1].startsWith('.')) imports.push(path.resolve(path.dirname(file), match[1]));
  }
  return imports;
}

test('runtime module graph has no broken imports or unclassified orphan modules', async () => {
  const publicFiles = (await Promise.all(PUBLIC_DIRECTORIES.map((directory) => walk(path.join(root, directory))))).flat();
  const htmlFiles = publicFiles.filter((file) => file.endsWith('.html'));
  const javascriptFiles = publicFiles.filter((file) => file.endsWith('.js'));
  const entries = new Set([path.join(root, 'api', 'v1', '[...path].js')]);

  for (const file of htmlFiles) {
    const source = await readFile(file, 'utf8');
    for (const match of source.matchAll(/<script[^>]+src=['"]([^'"?#]+\.js)['"]/g)) {
      if (match[1].startsWith('/')) entries.add(path.join(root, ...match[1].slice(1).split('/')));
    }
  }

  const reachable = new Set();
  const pending = [...entries];
  while (pending.length) {
    const file = path.normalize(pending.pop());
    if (reachable.has(file)) continue;
    await access(file);
    reachable.add(file);
    for (const imported of await relativeImports(file)) pending.push(imported);
  }

  for (const file of reachable) {
    for (const imported of await relativeImports(file)) {
      await assert.doesNotReject(access(imported), `${relative(file)} imports missing ${relative(imported)}`);
    }
  }

  const unreachable = javascriptFiles
    .filter((file) => !reachable.has(path.normalize(file)))
    .map(relative)
    .sort();
  assert.deepEqual(unreachable, ['services/i18n.js']);
});

test('shared frontend responsibilities have one runtime owner', async () => {
  const publicFiles = (await Promise.all(PUBLIC_DIRECTORIES.map((directory) => walk(path.join(root, directory))))).flat();
  const javascriptFiles = publicFiles.filter((file) => file.endsWith('.js'));
  const sources = new Map(await Promise.all(javascriptFiles.map(async (file) => [relative(file), await readFile(file, 'utf8')])));

  assert.match(sources.get('services/auth-service.js'), /current\(\)[\s\S]*api\.get\('\/me'\)/);
  for (const [file, source] of sources) {
    if (file !== 'services/auth-service.js') assert.doesNotMatch(source, /api\.get\('\/me'\)/, file);
  }

  const docxRuleOwners = [...sources]
    .filter(([, source]) => source.includes('10 * 1024 * 1024'))
    .map(([file]) => file);
  assert.deepEqual(docxRuleOwners, ['validators/resume-file-validator.js']);

  assert.match(sources.get('components/card-live-preview.js'), /fetch\('\/config\/theme-registry\.json'/);
  assert.doesNotMatch(sources.get('pages/app/card-design.js'), /fetch\('\/config\/theme-registry\.json'/);
});

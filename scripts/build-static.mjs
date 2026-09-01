import { copyFile, lstat, mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_ROOT = fileURLToPath(new URL('../', import.meta.url));

export const PUBLIC_DIRECTORIES = Object.freeze([
  'about',
  'admin',
  'app',
  'assets',
  'blog',
  'components',
  'config',
  'contact',
  'cookies',
  'create',
  'faq',
  'forgot-password',
  'locales',
  'login',
  'pages',
  'privacy',
  'public-card',
  'refund',
  'register',
  'reset-password',
  'services',
  'specialist',
  'starter',
  'terms',
  'utils',
  'validators',
  'verify-email',
]);

export const PUBLIC_ROOT_FILES = Object.freeze([
  'index.html',
  'robots.txt',
  'sitemap.xml',
]);

const ALLOWED_STATIC_EXTENSIONS = new Set([
  '.css',
  '.html',
  '.ico',
  '.jpeg',
  '.jpg',
  '.js',
  '.json',
  '.png',
  '.svg',
  '.webp',
  '.woff',
  '.woff2',
  '.xml',
]);

function relativeDisplayPath(sourceRoot, sourcePath) {
  return path.relative(sourceRoot, sourcePath).split(path.sep).join('/');
}

function isIgnoredDocumentationOrPlaceholder(entryName) {
  return entryName.startsWith('.') || entryName.toLowerCase().endsWith('.md');
}

async function copyPublicDirectory(sourceRoot, sourceDirectory, outputDirectory, copiedFiles) {
  const sourceEntries = await readdir(sourceDirectory, { withFileTypes: true });

  for (const entry of sourceEntries) {
    if (isIgnoredDocumentationOrPlaceholder(entry.name)) continue;

    const sourcePath = path.join(sourceDirectory, entry.name);
    const outputPath = path.join(outputDirectory, entry.name);
    const relativePath = relativeDisplayPath(sourceRoot, sourcePath);
    const metadata = await lstat(sourcePath);

    if (metadata.isSymbolicLink()) {
      throw new Error(`Public build refuses symbolic link: ${relativePath}`);
    }

    if (entry.isDirectory()) {
      await mkdir(outputPath, { recursive: true });
      await copyPublicDirectory(sourceRoot, sourcePath, outputPath, copiedFiles);
      continue;
    }

    if (!entry.isFile()) {
      throw new Error(`Unsupported public source entry: ${relativePath}`);
    }

    const extension = path.extname(entry.name).toLowerCase();
    if (!ALLOWED_STATIC_EXTENSIONS.has(extension)) {
      throw new Error(`Unsupported public file extension: ${relativePath}`);
    }

    await mkdir(path.dirname(outputPath), { recursive: true });
    await copyFile(sourcePath, outputPath);
    copiedFiles.push(relativePath);
  }
}

function assertSafeCleanTarget(sourceRoot, outputRoot) {
  const expectedOutputRoot = path.resolve(sourceRoot, 'dist');
  if (path.resolve(outputRoot) !== expectedOutputRoot) {
    throw new Error('Refusing to clean a directory other than the project dist directory.');
  }
}

export async function buildStaticSite({
  sourceRoot = PROJECT_ROOT,
  outputRoot = path.join(sourceRoot, 'dist'),
  clean = true,
} = {}) {
  const resolvedSourceRoot = path.resolve(sourceRoot);
  const resolvedOutputRoot = path.resolve(outputRoot);
  const copiedFiles = [];

  if (clean) {
    assertSafeCleanTarget(resolvedSourceRoot, resolvedOutputRoot);
    await rm(resolvedOutputRoot, { recursive: true, force: true });
  }

  await mkdir(resolvedOutputRoot, { recursive: true });

  for (const file of PUBLIC_ROOT_FILES) {
    const sourcePath = path.join(resolvedSourceRoot, file);
    const metadata = await lstat(sourcePath);
    if (!metadata.isFile() || metadata.isSymbolicLink()) {
      throw new Error(`Invalid public root file: ${file}`);
    }
    await copyFile(sourcePath, path.join(resolvedOutputRoot, file));
    copiedFiles.push(file);
  }

  for (const directory of PUBLIC_DIRECTORIES) {
    const sourcePath = path.join(resolvedSourceRoot, directory);
    const metadata = await lstat(sourcePath);
    if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
      throw new Error(`Invalid public directory: ${directory}`);
    }
    const outputPath = path.join(resolvedOutputRoot, directory);
    await mkdir(outputPath, { recursive: true });
    await copyPublicDirectory(resolvedSourceRoot, sourcePath, outputPath, copiedFiles);
  }

  return copiedFiles.sort();
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  const copiedFiles = await buildStaticSite();
  process.stdout.write(`Static deployment output: ${copiedFiles.length} files in dist/\n`);
}

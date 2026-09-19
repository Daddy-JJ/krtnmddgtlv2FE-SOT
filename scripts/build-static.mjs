import { copyFile, lstat, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
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

export const ANALYTICS_HTML_FILES = Object.freeze([
  'index.html',
  'about/index.html',
  'blog/cv-resume-builder/index.html',
  'blog/satu-link-untuk-identitas-profesional/index.html',
  'contact/index.html',
  'cookies/index.html',
  'faq/index.html',
  'privacy/index.html',
  'refund/index.html',
  'terms/index.html',
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

const RUNTIME_CONFIG_FILE = 'config/runtime-config.js';
const ANALYTICS_HTML_FILE_SET = new Set(ANALYTICS_HTML_FILES);
const VERCEL_ANALYTICS_MARKER = 'data-knd-vercel-analytics';
const VERCEL_ANALYTICS_SNIPPET = `  <script ${VERCEL_ANALYTICS_MARKER}>
    window.va = window.va || function () {
      (window.vaq = window.vaq || []).push(arguments);
    };
    window.va('beforeSend', function (event) {
      try {
        const url = new URL(event.url);
        url.search = '';
        url.hash = '';
        return Object.assign({}, event, { url: url.toString() });
      } catch {
        return null;
      }
    });
  </script>
  <script defer src="/_vercel/insights/script.js" ${VERCEL_ANALYTICS_MARKER}></script>`;

export function renderRuntimeConfig(source, env = process.env) {
  return source
    .replaceAll('__PUBLIC_API_BASE_URL_LOCAL__', String(env.PUBLIC_API_BASE_URL_LOCAL ?? '__PUBLIC_API_BASE_URL_LOCAL__'))
    .replaceAll('__PUBLIC_API_BASE_URL_PRODUCTION__', String(env.PUBLIC_API_BASE_URL_PRODUCTION ?? '__PUBLIC_API_BASE_URL_PRODUCTION__'))
    .replaceAll('__PUBLIC_API_TIMEOUT_MS__', String(env.PUBLIC_API_TIMEOUT_MS ?? '__PUBLIC_API_TIMEOUT_MS__'));
}

export function injectVercelAnalytics(source) {
  if (source.includes(VERCEL_ANALYTICS_MARKER)) return source;

  const closingHead = source.search(/<\/head>/i);
  if (closingHead === -1) {
    throw new Error('Cannot inject Vercel Analytics into HTML without a closing head tag.');
  }

  return `${source.slice(0, closingHead)}${VERCEL_ANALYTICS_SNIPPET}\n${source.slice(closingHead)}`;
}

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
    if (relativePath === RUNTIME_CONFIG_FILE) {
      const source = await readFile(sourcePath, 'utf8');
      await writeFile(outputPath, renderRuntimeConfig(source), 'utf8');
    } else if (ANALYTICS_HTML_FILE_SET.has(relativePath)) {
      const source = await readFile(sourcePath, 'utf8');
      await writeFile(outputPath, injectVercelAnalytics(source), 'utf8');
    } else {
      await copyFile(sourcePath, outputPath);
    }
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
    const outputPath = path.join(resolvedOutputRoot, file);
    if (ANALYTICS_HTML_FILE_SET.has(file)) {
      const source = await readFile(sourcePath, 'utf8');
      await writeFile(outputPath, injectVercelAnalytics(source), 'utf8');
    } else {
      await copyFile(sourcePath, outputPath);
    }
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

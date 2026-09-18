import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import test from 'node:test';

const publicPages = ['about', 'contact', 'faq', 'privacy', 'cookies', 'terms', 'refund'];
const privatePages = [
  'login/index.html',
  'register/index.html',
  'verify-email/index.html',
  'forgot-password/index.html',
  'reset-password/index.html',
  'create/index.html',
  'starter/manage/index.html',
];
const articlePath = 'blog/satu-link-untuk-identitas-profesional';
const resumeArticlePath = 'blog/cv-resume-builder';

test('all sitemap pages have unique keyword-aware metadata and social previews', async () => {
  const sitemap = await readFile(new URL('../sitemap.xml', import.meta.url), 'utf8');
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  assert.equal(new Set(urls).size, 10);
  const titles = new Set(), descriptions = new Set();
  for (const url of urls) {
    const path = new URL(url).pathname;
    const html = await readFile(new URL('..' + path + 'index.html', import.meta.url), 'utf8');
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
    const description = html.match(/<meta name="description" content="([^"]+)">/)?.[1];
    assert.ok(title && description, path);
    assert.match(description, /kartu nama digital/i, path);
    assert.ok(!titles.has(title) && !descriptions.has(description), path);
    titles.add(title); descriptions.add(description);
    assert.equal((html.match(/<link rel="canonical"/g) ?? []).length, 1, path);
    assert.ok(html.includes('href="' + url + '"'), path);
    for (const key of ['og:type', 'og:title', 'og:description', 'og:url', 'og:locale', 'og:site_name']) {
      assert.equal((html.match(new RegExp('property="' + key + '"', 'g')) ?? []).length, 1, path + key);
    }
    for (const key of ['twitter:card', 'twitter:title', 'twitter:description']) {
      assert.equal((html.match(new RegExp('name="' + key + '"', 'g')) ?? []).length, 1, path + key);
    }
    assert.ok(html.includes('property="og:url" content="' + url + '"'), path);
    for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      const schema = JSON.parse(match[1]);
      assert.equal(schema['@context'], 'https://schema.org');
      assert.ok(schema['@type']);
    }
    assert.doesNotMatch(html, /name="keywords"/);
  }
});

test('all private route shells stay noindex, including compatibility redirects', async () => {
  async function inspect(url) {
    for (const entry of await readdir(url, { withFileTypes: true })) {
      const child = new URL(entry.name + (entry.isDirectory() ? '/' : ''), url);
      if (entry.isDirectory()) await inspect(child);
      else if (entry.name === 'index.html') {
        const html = await readFile(child, 'utf8');
        assert.match(html, /<meta name="robots" content="noindex[^"]*">/, child.pathname);
      }
    }
  }
  for (const group of ['app', 'admin', 'specialist']) await inspect(new URL('../' + group + '/', import.meta.url));
});


test('standard public pages expose unique indexable SEO metadata and landmarks', async () => {
  const titles = new Set();
  const descriptions = new Set();

  for (const page of publicPages) {
    const html = await readFile(new URL(`../${page}/index.html`, import.meta.url), 'utf8');
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
    const description = html.match(/<meta name="description" content="([^"]+)">/)?.[1];

    assert.ok(title, `${page} needs a title`);
    assert.ok(description, `${page} needs a meta description`);
    assert.ok(description.length >= 90 && description.length <= 180, `${page} description length`);
    assert.ok(html.includes(`<link rel="canonical" href="https://kartunamadigital.id/${page}/">`));
    assert.match(html, /<meta name="robots" content="index, follow/);
    assert.equal((html.match(/<h1\b/g) ?? []).length, 1, `${page} needs exactly one h1`);
    assert.match(html, /<header\b/);
    assert.match(html, /<main\b[^>]*id="main"/);
    assert.match(html, /<footer\b/);
    assert.match(html, /class="marketing-shell"/);
    assert.match(html, /href="\/assets\/css\/tailwind\.css"/);
    assert.doesNotMatch(html, /cdn\.tailwindcss\.com/);
    titles.add(title);
    descriptions.add(description);
  }

  assert.equal(titles.size, publicPages.length);
  assert.equal(descriptions.size, publicPages.length);
});

test('about page provides parseable Organization structured data', async () => {
  const html = await readFile(new URL('../about/index.html', import.meta.url), 'utf8');
  const json = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
  assert.ok(json);
  const data = JSON.parse(json);
  assert.equal(data['@type'], 'Organization');
  assert.equal(data.url, 'https://kartunamadigital.id/');
  assert.equal(data.email, 'support@kartunamadigital.id');
});

test('blog article exposes indexable metadata, readable landmarks, and BlogPosting data', async () => {
  const html = await readFile(new URL(`../${articlePath}/index.html`, import.meta.url), 'utf8');
  assert.match(html, /<title>[^<]*Satu Link[^<]*KartuNamaDigital\.id<\/title>/);
  assert.match(html, new RegExp(`<link rel="canonical" href="https://kartunamadigital.id/${articlePath}/">`));
  assert.match(html, /<meta name="robots" content="index, follow/);
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.match(html, /<article>/);
  assert.match(html, /"@type"\s*:\s*"BlogPosting"/);
  assert.match(html, /class="mono-article-width/);
  assert.match(html, /href="\/assets\/css\/marketing-monochrome\.css"/);
});

test('Resume Enhancement article exposes locked Pro facts and indexable metadata', async () => {
  const html = await readFile(new URL(`../${resumeArticlePath}/index.html`, import.meta.url), 'utf8');
  assert.match(html, /<title>Resume Enhancement untuk Member Pro \| KartuNamaDigital\.id<\/title>/);
  assert.match(html, new RegExp(`<link rel="canonical" href="https://kartunamadigital.id/${resumeArticlePath}/">`));
  assert.match(html, /<meta name="robots" content="index, follow/);
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.match(html, /"@type"\s*:\s*"BlogPosting"/);
  assert.match(html, /365 hari/);
  assert.match(html, /maksimal tiga kali revisi/i);
  assert.match(html, /2 × 24 jam kerja/);
  assert.match(html, /90 hari/);
  assert.match(html, /\.docx/);
  assert.doesNotMatch(html, /resume-enhancement-pro-reference\.png/);
});

test('robots and sitemap include only intended indexable marketing routes', async () => {
  const robots = await readFile(new URL('../robots.txt', import.meta.url), 'utf8');
  const sitemap = await readFile(new URL('../sitemap.xml', import.meta.url), 'utf8');
  assert.match(robots, /User-agent: \*/);
  assert.match(robots, /Allow: \//);
  assert.match(robots, /Sitemap: https:\/\/kartunamadigital\.id\/sitemap\.xml/);

  for (const page of publicPages) {
    assert.ok(sitemap.includes(`<loc>https://kartunamadigital.id/${page}/</loc>`));
  }
  assert.ok(sitemap.includes(`<loc>https://kartunamadigital.id/${articlePath}/</loc>`));
  assert.ok(sitemap.includes(`<loc>https://kartunamadigital.id/${resumeArticlePath}/</loc>`));
  assert.doesNotMatch(sitemap, /\/(?:login|register|create|app)\//);
});

test('authentication and Starter management pages remain noindex', async () => {
  for (const page of privatePages) {
    const html = await readFile(new URL(`../${page}`, import.meta.url), 'utf8');
    assert.match(html, /<meta name="robots" content="noindex, follow">/);
    assert.match(html, /class="auth-shell/);
    assert.match(html, /href="\/assets\/css\/tailwind\.css"/);
  }
});

test('all frontend HTML uses compiled CSS instead of Tailwind Play CDN', async () => {
  async function collect(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    const results = [];
    for (const entry of entries) {
      const url = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directory);
      if (entry.isDirectory()) results.push(...await collect(url));
      else if (entry.name.endsWith('.html')) results.push(url);
    }
    return results;
  }

  const files = await collect(new URL('../', import.meta.url));
  for (const file of files) {
    const html = await readFile(file, 'utf8');
    assert.doesNotMatch(html, /cdn\.tailwindcss\.com/, file.pathname);
    if (/<!doctype html>/i.test(html) && !/<meta http-equiv="refresh"/i.test(html)) {
      assert.match(html, /href="\/assets\/css\/[^"]+\.css"/, file.pathname);
    }
  }
});

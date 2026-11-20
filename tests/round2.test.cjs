'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = name => {
  const file = path.join(root, name);
  assert.ok(fs.existsSync(file), `${name} must exist`);
  return fs.readFileSync(file, 'utf8');
};
const noJS = html => {
  assert.doesNotMatch(html, /<script\b|\bon\w+\s*=|javascript:/i);
};

test('round 2 has a reachable entry and ten explicit manual observations', () => {
  assert.match(read('index.html'), /href="round2\/"/);
  const page = read('round2/index.html');
  assert.equal((page.match(/data-case="/g) || []).length, 10);
  assert.match(page, /共有UI/);
  assert.match(page, /HTTP 302/);
  assert.doesNotMatch(page, /http-equiv="refresh"/i);
});
test('minimal page has no JavaScript and exactly four fixed comparison links', () => {
  const page = read('round2/minimal.html');
  noJS(page);
  assert.equal((page.match(/data-test="/g) || []).length, 4);
  for (const href of ['https://example.com/', 'x-safari-https://example.com/',
    'https://h4m4chi-ttr.github.io/x-external-browser/',
    'x-safari-https://h4m4chi-ttr.github.io/x-external-browser/']) {
    assert.ok(page.includes(`href="${href}"`));
  }
  assert.doesNotMatch(page, /target="_blank"/);
});
for (const [file, scheme] of [['meta-https.html', 'https'], ['meta-safari.html', 'x-safari-https']]) {
  test(`${file} uses a static one-second refresh, not JavaScript or a claimed HTTP redirect`, () => {
    const page = read('round2/' + file);
    noJS(page);
    assert.equal((page.match(/http-equiv="refresh"/gi) || []).length, 1);
    assert.ok(page.includes(`content="1; url=${scheme}://example.com/"`));
    assert.match(page, /HTTP 302ではありません/);
    assert.match(page, /href="\.\/"/);
  });
}
test('relay links encode a fixed HTTPS destination, with no auto-launch or install request', () => {
  const html = read('round2/index.html');
  for (const scheme of ['instagram', 'barcelona']) {
    assert.ok(html.includes(`href="${scheme}://extbrowser/?url=https%3A%2F%2Fexample.com%2F"`));
  }
  assert.match(html, /非公開スキーム/);
  assert.match(html, /インストール/);
});
test('new scripts do not alter the original record key or auto-navigate', () => {
  const js = read('round2/app.js');
  assert.match(js, /x-external-browser\.round2\.v1/);
  assert.doesNotMatch(js, /x-external-browser\.lab\.v1|localStorage\.clear\(|location\.(assign|replace)|window\.open\(/);
  assert.doesNotMatch(js, /fetch\(|XMLHttpRequest|sendBeacon|innerHTML\s*=/);
});

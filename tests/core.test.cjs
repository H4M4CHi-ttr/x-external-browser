'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Lab = require('../core.js');
const BASE = 'https://h4m4chi-ttr.github.io/x-external-browser/';

test('cleans the source URL without losing the GitHub Pages project path', () => {
  assert.equal(Lab.baseURL(BASE + '?target=https://evil.test&auto=safari#x'), BASE);
});
test('rejects non-web bases and embedded credentials', () => {
  for (const value of ['javascript:alert(1)', 'https://user:pass@example.com/'])
    assert.throws(() => Lab.baseURL(value));
});
test('builds an arrival URL without inherited query parameters', () => {
  const u = new URL(Lab.arrivalURL(BASE + '?auto=safari', 'safari-link', 'r1'));
  assert.equal(u.origin, new URL(BASE).origin);
  assert.equal(u.pathname, '/x-external-browser/');
  assert.equal(u.searchParams.get('arrived'), 'safari-link');
  assert.equal(u.searchParams.get('run'), 'r1');
  assert.equal(u.searchParams.get('route'), 'primary');
  assert.equal(u.searchParams.has('auto'), false);
});
test('Safari and iOS Chrome preserve the complete encoded URL', () => {
  const target = Lab.arrivalURL(BASE, 'safari-link', 'test & 日本語');
  assert.equal(Lab.toScheme(target, 'safari'), target.replace(/^https:/, 'x-safari-https:'));
  assert.equal(Lab.toScheme(target, 'chrome-ios'), target.replace(/^https:/, 'googlechromes:'));
});
test('Safari rejects HTTP while the local baseline may use HTTP', () => {
  assert.equal(Lab.baseURL('http://localhost:8000/?x=1'), 'http://localhost:8000/');
  assert.throws(() => Lab.toScheme('http://localhost:8000/', 'safari'));
});
test('generic Android intent has no fixed package', () => {
  const uri = Lab.toScheme(Lab.arrivalURL(BASE, 'intent', 'r'), 'intent');
  assert.match(uri, /^intent:\/\/h4m4chi-ttr\.github\.io\/x-external-browser\//);
  assert.match(uri, /#Intent;scheme=https;end$/);
  assert.equal(uri.includes('package='), false);
});
test('Chrome Android intent pins only Chrome', () => {
  assert.match(Lab.toScheme(BASE, 'intent-chrome'), /;package=com.android.chrome;end$/);
});
test('intent fallback is encoded and visibly distinguished from primary arrival', () => {
  const uri = Lab.toScheme(Lab.arrivalURL(BASE, 'intent-fallback', 'r'), 'intent-fallback');
  const fallback = new URL(decodeURIComponent(uri.match(/S\.browser_fallback_url=([^;]+);/)[1]));
  assert.equal(fallback.searchParams.get('route'), 'fallback');
  assert.equal(fallback.searchParams.get('run'), 'r');
  assert.equal(fallback.origin, new URL(BASE).origin);
});
test('unknown schemes and destination fragments cannot enter intent syntax', () => {
  assert.throws(() => Lab.toScheme(BASE, 'made-up'));
  assert.throws(() => Lab.toScheme(BASE + '#Intent;package=evil;end', 'intent'));
});
test('the openExternalBrowser parameter is an explicit comparison, not a guarantee', () => {
  const spec = Lab.CASES.find(item => item.id === 'external-param');
  const link = new URL(Lab.linkFor(BASE, spec, 'r'));
  assert.equal(link.searchParams.get('openExternalBrowser'), '1');
  assert.equal(link.searchParams.get('arrived'), 'external-param');
});
test('test IDs are unique; direct, delayed and automatic paths stay distinct', () => {
  assert.equal(new Set(Lab.CASES.map(x => x.id)).size, Lab.CASES.length);
  assert.ok(Lab.CASES.some(x => x.action === 'link' && x.scheme === 'safari'));
  assert.ok(Lab.CASES.some(x => x.action === 'open' && x.scheme === 'safari'));
  assert.ok(Lab.CASES.some(x => x.action === 'delayed' && x.scheme === 'safari'));
  assert.ok(Lab.CASES.some(x => x.action === 'auto'));
});
test('normal, unknown and arrival URLs never request automatic navigation', () => {
  for (const query of ['', '?auto=unknown', '?auto=javascript:alert(1)', '?auto=safari&arrived=x'])
    assert.equal(Lab.autoCase(query), null);
  assert.equal(Lab.autoCase('?auto=safari').id, 'auto-safari');
  assert.equal(Lab.autoCase('?auto=intent').id, 'auto-intent');
});
test('saved data handles empty, corrupt and wrong-schema input without throwing', () => {
  for (const value of [null, '{', 'null', '{"version":999}', '{"version":1,"attempts":{}}'])
    assert.deepEqual(Lab.readState(value).attempts, []);
});
test('saved attempts are bounded and unknown outcomes are not accepted as success', () => {
  const value = JSON.stringify({version:1, profile:{device:'iPhone'}, attempts:Array.from({length:120}, (_,i)=>({id:'r'+i, caseId:'safari-link', outcome:'unrated'}))});
  const state = Lab.readState(value);
  assert.equal(state.attempts.length, 100);
  assert.equal(state.attempts[0].id, 'r20');
  assert.equal(state.profile.device, 'iPhone');
  assert.equal(Lab.readState(JSON.stringify({version:1, attempts:[{id:'x', caseId:'safari-link', outcome:'definitely-success'}]})).attempts[0].outcome, 'unrated');
});

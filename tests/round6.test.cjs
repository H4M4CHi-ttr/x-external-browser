'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const dir = path.resolve(__dirname, '../round6');
const gate=fs.readFileSync(path.join(dir, 'index.html'),'utf8');
const play=fs.readFileSync(path.join(dir, 'play.html'),'utf8');
const gateJs=fs.readFileSync(path.join(dir, 'gate.js'),'utf8');
const gameJs=fs.readFileSync(path.join(dir, 'play.js'),'utf8');
test('CTA is a plain same-site HTTPS anchor with no JS interception', () => {
  assert.match(gate, /id="game-preview-link" class="launch-card" href="https:\/\/h4m4chi-ttr\.github\.io\/x-external-browser\/round6\/play\.html"/);
  assert.doesNotMatch(gateJs, /preventDefault\(\)[\s\S]*game-preview-link|querySelector\([^)]*game-preview-link[^)]*\)/);
  assert.doesNotMatch(gate, /oncontextmenu=|ontouchstart=|ontouchend=/i);
});
test('UA detection and normal browser fallback both exist', () => {
  assert.match(gateJs, /Twitter for iPhone/);
  assert.match(gateJs, /get\('demo'\)/);
  assert.match(gate, /id="normal-play-link"/);
  assert.match(gate, /id="x-ui"/);
});
test('Preview game screen visible without start overlay', () => {
  assert.match(play, /id="game-field"/);
  assert.match(play, /id="star"/);
  assert.match(play, /id="game-end"[^>]*hidden/);
  assert.match(play, /id="score">0/);
});
test('Timer begins on tap, stops on end and pagehide', () => {
  assert.match(gameJs, /star\.addEventListener\('click', catchStar\)/);
  assert.match(gameJs, /window\.addEventListener\('pagehide', stopTimer\)/);
  assert.match(gameJs, /if \(started \|\| ended\) return/);
  assert.match(gameJs, /score >= STAR_COUNT/);
});
test('No outgoing network or external runtime dependencies', () => {
  for(const script of [gateJs, gameJs]) assert.doesNotMatch(script, /\bfetch\s*\(|XMLHttpRequest|sendBeacon|postMessage\s*\(/);
  assert.doesNotMatch(play, /<iframe|https?:\/\//i);
});

test('Android is a separate route and Chrome Intent requires a real tap', () => {
  assert.match(gate, /id="android-ui"/);
  assert.match(gate, /id="android-intent-link"/);
  assert.match(gate, /#Intent;scheme=https;package=com\.android\.chrome;/);
  assert.match(gate, /S\.browser_fallback_url=https%3A%2F%2Fh4m4chi-ttr\.github\.io/);
  assert.match(gateJs, /androidXUA/);
  assert.match(gateJs, /forced === 'android'/);
  assert.match(gate, /Chromeでゲームを開く/);
});

test('fallback is actionable without native intent support', () => {
  assert.match(gate, /ブラウザで開く/);
  assert.match(gate, /id="copy-android"/);
  assert.match(gate, /id="android-copy-url"/);
  assert.match(gateJs, /navigator\.clipboard\?\.writeText/);
});

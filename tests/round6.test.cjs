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
  assert.match(gate, /id="game-preview-link" class="launch-simple" href="https:\/\/h4m4chi-ttr\.github\.io\/x-external-browser\/round6\/play\.html"/);
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

test('Primary game link is a single text node and test controls point to same game', () => {
  assert.match(gate, /<a id="game-preview-link" class="launch-simple" href="https:\/\/h4m4chi-ttr\.github\.io\/x-external-browser\/round6\/play\.html">長押しでゲームプレイ<\/a>/);
  assert.match(gate, /id="game-absolute-link" href="https:\/\/h4m4chi-ttr\.github\.io\/x-external-browser\/round6\/play\.html"/);
  assert.match(gate, /id="game-relative-link" href="\.\/play\.html"/);
  assert.match(gate, /id="old-ornate-card" class="launch-card"/);
});
test('Result form captures which link was tested', () => {
  assert.match(gate, /id="link-variant"/);
  assert.match(gateJs, /\$\('link-variant'\)\.value/);
  assert.match(gateJs, /items\.push\(\{route, result, variant,/);
});

test('Android default prioritizes the manual external-browser route', () => {
  const main = gate.indexOf('class="android-primary-guide"');
  const experimental = gate.indexOf('class="android-experiment"');
  assert.match(gate, /class="android-primary-guide"/);
  assert.match(gate, /このアクションを実行できるアプリはありません/);
  assert.ok(main > 0 && experimental > main);
});

test('Gesture P0-P10: fixed destination, distinct IDs and one-variable cases', () => {
  const links=[...gate.matchAll(/<a id="probe-(p\d+)"[^>]*href="([^"]+)"[^>]*>/g)];
  assert.equal(links.length,11);
  assert.equal(new Set(links.map(x=>x[1])).size,11);
  const url='https://h4m4chi-ttr.github.io/x-external-browser/round6/play.html';
  for(const link of links) assert.equal(link[2],url);
  const tag=id=>links.find(x=>x[1]===id)?.[0]||'';
  assert.doesNotMatch(tag('p0'),/draggable=|probe-nodrag|probe-no-select|probe-manipulation|probe-callout/);
  assert.match(tag('p1'),/draggable="false"/);
  assert.match(tag('p2'),/probe-nodrag/);
  assert.match(tag('p3'),/probe-nodrag.*draggable="false"/);
  assert.match(tag('p4'),/probe-no-select/);
  assert.match(tag('p5'),/probe-manipulation/);
  assert.match(tag('p6'),/probe-callout/);
  assert.match(tag('p7'),/probe-nested/);
  assert.match(tag('p8'),/probe-nested probe-pass/);
  assert.match(tag('p9'),/probe-nested probe-nodrag/);
  assert.match(tag('p10'),/draggable="true"/);
});
test('Gesture P0-P10: outcomes can be recorded without intercepting gestures', () => {
  for(let i=0;i<=10;i++)assert.match(gate,new RegExp('<option value="p'+i+'">'));
  for(const outcome of ['drag','text-selection','context-only']) assert.ok(gate.includes('value="'+outcome+'"'));
  assert.doesNotMatch(gate,/oncontextmenu=|ontouchstart=|ontouchend=|ondragstart=/i);
  assert.doesNotMatch(gateJs,/addEventListener\(['"](?:touchstart|dragstart|contextmenu)/);
});

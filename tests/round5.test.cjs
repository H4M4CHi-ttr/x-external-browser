'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.join(__dirname,'../round5');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const script=fs.readFileSync(path.join(root,'app.js'),'utf8');
const toHref=id=>html.match(new RegExp('id="'+id+'" href="([^"]+)"'))?.[1];
test('H0 is direct custom-scheme control, H1 and H2 use 302 host allowlist target',()=>{
  assert.equal(toHref('h0'),'x-safari-https://example.com/');
  assert.equal(new URL(toHref('h1')).searchParams.get('url'),'https://example.com/');
  assert.equal(new URL(toHref('h2')).searchParams.get('url'),'x-safari-https://example.com/');
  assert.equal(toHref('h2'),html.match(/id="direct-302" readonly value="([^"]+)"/)[1]);
});
test('paired open cases and click synchronous without await',()=>{
  for(const k of ['o1','o2','o3','o4'])assert.match(html,new RegExp('data-open="'+k+'"'));
  assert.match(script,/window\.open\(spec\.url,'_blank','noopener'\)/);
  assert.match(script,/window\.open\(spec\.url,'_blank'\)/);
});
test('data-detector tests are bare text except D1 control',()=>{
  assert.match(html,/<a href="https:\/\/example\.com\/" id="d1">/);
  for(const k of ['d2','d3','d4']) assert.match(html,new RegExp('<p id="'+k+'">'));
});
test('no automatic redirect or native messaging, bounded local recording',()=>{
  assert.doesNotMatch(script,/location\.assign|location\.replace|postMessage\s*\(|\bfetch\s*\(/);
  assert.match(script,/localStorage\.setItem/);
  assert.match(script,/attempts=attempts\.slice\(-100\)/);
  assert.match(script,/row\.textContent=/);
});

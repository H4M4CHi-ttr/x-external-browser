'use strict';
const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');
const html=fs.readFileSync(path.join(__dirname,'../round3/index.html'),'utf8');
const js=fs.readFileSync(path.join(__dirname,'../round3/app.js'),'utf8');
const landing='https://h4m4chi-ttr.github.io/x-external-browser/round3/landing.html';
test('302 URLs point to fixed control and Safari targets',()=>{
 for(const [id,expected] of [['h1',landing+'?via=302-https'],['h2',landing.replace(/^https:/,'x-safari-https:')+'?via=302-safari']]){
  const match=html.match(new RegExp('id="'+id+'" href="([^"]+)"'));assert.ok(match);
  const url=new URL(match[1]);assert.equal(url.host,'httpbingo.org');assert.equal(url.pathname,'/redirect-to');assert.equal(url.searchParams.get('url'),expected);
 }
});
test('H3 uses same URL as H2 and page does not redirect on load',()=>{
 const a=html.match(/id="h2" href="([^"]+)"/)[1];const b=html.match(/id="post-url" readonly value="([^"]+)"/)[1];
 assert.equal(a,b);assert.doesNotMatch(html,/http-equiv\s*=\s*["']refresh["']/i);
});
test('QR images are genuine standalone images and are not link-wrapped',()=>{
 assert.match(html,/<img src="\.\/qr-https.png"/);assert.match(html,/<img src="\.\/qr-safari.png"/);
 assert.equal((html.match(/class="case qr"/g)||[]).length,2);
});
test('passive diagnosis makes no network requests or native invocations',()=>{
 assert.match(js,/Object\.getOwnPropertyNames\(handlers\)/);
 assert.doesNotMatch(js,/\.postMessage\s*\(|\bfetch\s*\(|XMLHttpRequest\s*\(|sendBeacon\s*\(/);
});
test('local results can be exported without transmission',()=>{
 assert.match(js,/localStorage\.setItem/);assert.match(js,/rows = rows\.slice\(-100\)/);assert.match(js,/JSON\.stringify/);
});

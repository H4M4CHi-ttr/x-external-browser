"""Offline Chromium UI test. Navigation and storage use explicit test adapters.
No external pages or native apps are opened. This is NOT an X/iOS integration test.
Run: python tests/browser_smoke.py (Python Playwright + Chromium required).
"""
from pathlib import Path
import json
import os
import re
import shutil
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
BASE = 'https://lab.invalid/x-external-browser/'
assert (ROOT / 'index.html').exists(), 'index.html must exist'
html = (ROOT / 'index.html').read_text()
html = re.sub(r'<script[^>]*src="[^"]+"[^>]*></script>', '', html)
html = html.replace('<link rel="stylesheet" href="styles.css">', '<style>' + (ROOT / 'styles.css').read_text() + '</style>')
core = (ROOT / 'core.js').read_text()
app = (ROOT / 'app.js').read_text()
KEY = 'x-external-browser.lab.v1'

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=os.environ.get('CHROMIUM_PATH') or shutil.which('chromium'), args=['--no-sandbox'])
    context = browser.new_context(viewport={'width':390,'height':844}, device_scale_factor=1)
    errors, network = [], []
    context.on('request', lambda request: network.append(request.url))
    def boot(url=BASE, store=None, blocked=False):
        page = context.new_page()
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.set_content(html)
        page.evaluate('(cfg)=>{window.__test=cfg}', {'href':url, 'store':store or {}, 'blocked':blocked, 'calls':[]})
        page.add_script_tag(content=core)
        page.add_script_tag(content="""
          window.open=(...args)=>{window.__test.calls.push({action:'open',args,active:navigator.userActivation?.isActive});return null;};
          document.addEventListener('click',event=>{
            const a=event.target.closest('a');
            if(a){event.preventDefault();window.__test.calls.push({action:'anchor',url:a.href,target:a.target});}
          });
        """)
        page.add_script_tag(content="""
          (function(location, history, localStorage){
        """ + app + """
          })(
            {get href(){return window.__test.href}, get search(){return new URL(window.__test.href).search},
             assign(url){window.__test.calls.push({action:'assign',url,active:navigator.userActivation?.isActive})}},
            {replaceState(_state,_title,url){window.__test.href=url}},
            {getItem(key){if(window.__test.blocked)throw new Error('Storage blocked');return window.__test.store[key]||null},
             setItem(key,value){if(window.__test.blocked)throw new Error('Storage blocked');window.__test.store[key]=value}}
          );
        """)
        page.wait_for_selector('#case-safari-link .launch')
        return page
    def store_of(page):
        return page.evaluate('window.__test.store')
    def saved(page):
        return json.loads(store_of(page)[KEY])
    def reboot(page, url=BASE):
        store = store_of(page)
        page.close()
        return boot(url, store)

    page = boot()
    assert page.locator('.case-card').count() == 13
    assert page.locator('.auto-card').count() == 2
    page.wait_for_timeout(1200)
    assert page.evaluate('window.__test.calls.length') == 0, 'normal landing must not redirect'
    assert page.locator('#case-safari-link .launch').get_attribute('href').startswith('x-safari-https:')
    assert page.locator('#case-safari-blank .launch').get_attribute('target') == '_blank'
    assert page.locator('#case-intent-fallback .launch').get_attribute('href').count('S.browser_fallback_url=') == 1
    page.fill('#device', 'iPhone / iOS — simulated environment')
    page.fill('#xVersion', 'manual version')
    page.select_option('#source', 'Xアプリ')
    page.click('#case-https-self .launch')
    target = page.evaluate('window.__test.calls.at(-1).url')
    assert '?arrived=https-self&run=' in target
    assert len(saved(page)['attempts']) == 1
    page = reboot(page, target)
    assert '証明' in page.locator('#arrival').inner_text()
    assert saved(page)['attempts'][0]['events'][-1]['type'] == 'arrival'
    page = reboot(page)
    page.select_option('#outcome', 'inapp')
    page.fill('#note', '<img src=x onerror=alert(1)> テスト')
    page.click('#save-result')
    page = reboot(page)
    page.click('#export')
    report = json.loads(page.locator('#report-text').input_value())
    assert report['attempts'][0]['outcome'] == 'inapp'
    assert report['attempts'][0]['profile']['device'].startswith('iPhone')
    assert '<img' in report['attempts'][0]['note']
    assert page.locator('#history img').count() == 0
    page.click('#case-safari-open .launch')
    opened = page.evaluate("window.__test.calls.filter(x=>x.action==='open')")
    assert len(opened) == 1 and opened[0]['active'] is True
    assert opened[0]['args'][0].startswith('x-safari-https:')
    assert saved(page)['attempts'][-1]['outcome'] == 'unrated'
    page.click('#case-safari-delayed .launch')
    page.click('#cancel-pending')
    page.wait_for_timeout(1650)
    assert page.evaluate("window.__test.calls.filter(x=>x.action==='assign').length") == 0
    assert saved(page)['attempts'][-1]['events'][-1]['type'] == 'cancelled'
    page.click('#case-safari-delayed .launch')
    page.evaluate("dispatchEvent(new PageTransitionEvent('pagehide'))")
    page.wait_for_timeout(1650)
    assert page.evaluate("window.__test.calls.filter(x=>x.action==='assign').length") == 0, 'leaving the page must cancel pending launch'

    for width,height in [(320,640),(390,844),(1365,900)]:
        page.set_viewport_size({'width':width,'height':height})
        assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'Overflow at {width}'
    shots = ROOT.parent / 'x-external-browser-work'
    shots.mkdir(exist_ok=True)
    page.set_viewport_size({'width':390,'height':844})
    page.screenshot(path=str(shots / 'mobile.png'), full_page=True)
    page.set_viewport_size({'width':1365,'height':900})
    page.screenshot(path=str(shots / 'desktop.png'), full_page=True)
    page.close()

    page = boot(BASE + '?auto=safari')
    page.click('#cancel-pending')
    assert 'auto=' not in page.evaluate('window.__test.href')
    page.wait_for_timeout(1100)
    assert page.evaluate('window.__test.calls.length') == 0
    page = reboot(page)
    assert page.locator('#pending').is_hidden()
    page.close()
    page = boot(BASE + '?auto=intent')
    page.wait_for_timeout(1200)
    calls = page.evaluate('window.__test.calls')
    assert len(calls) == 1 and calls[0]['url'].startswith('intent:')
    assert saved(page)['attempts'][-1]['outcome'] == 'unrated'
    page.close()
    page = boot(BASE + '?auto=javascript:alert(1)&target=https://evil.test')
    page.wait_for_timeout(1100)
    assert page.evaluate('window.__test.calls.length') == 0
    page.close()
    page = boot(BASE + '?arrived=intent-fallback&route=fallback&run=r')
    assert 'fallback' in page.locator('#arrival').inner_text()
    page.close()
    page = boot(BASE + '?arrived=safari-link&auto=safari&run=r')
    assert page.locator('#pending').is_hidden()
    page.close()

    page = boot(store={'unrelated':'keep'})
    page.click('#case-safari-link .record-only')
    page.on('dialog', lambda dialog: dialog.accept())
    page.click('#clear-results')
    assert store_of(page)['unrelated'] == 'keep'
    assert len(saved(page)['attempts']) == 0
    page.close()
    page = boot(blocked=True)
    assert page.locator('.case-card').count() == 13
    assert not page.locator('#storage-warning').is_hidden()
    page.click('#case-safari-link .record-only')
    page.select_option('#outcome', 'unknown')
    page.click('#save-result')
    page.click('#export')
    assert len(json.loads(page.locator('#report-text').input_value())['attempts']) == 1
    assert errors == [], f'JavaScript errors: {errors}'
    assert network == [], f'Unexpected network requests: {network}'
    browser.close()
    print('PASS: 15 cases; anchor/JS dispatch requests; arrival; manual results; export; escaping; cancellation; one-shot auto; storage failure; 3 widths; no JS errors; zero network requests.')
    print('LIMIT: offline DOM with explicit navigation/storage adapters, not HTTP delivery, actual persistent storage, X, iOS, Android or native app launch.')

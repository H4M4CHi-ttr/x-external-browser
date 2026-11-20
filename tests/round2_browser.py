"""Offline browser checks. Native sharing/app launches are NOT tested.

Run: python3 tests/round2_browser.py
Requires Python Playwright and Chromium; optionally set CHROMIUM_PATH.
No navigation or network requests. Storage, secure-context flag and sharing APIs
are explicit test doubles. The real markup, CSS, handlers and exports are exercised.
"""
import json
import os
from pathlib import Path
import unittest
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ORIGIN = 'https://h4m4chi-ttr.github.io'
PREFIX = '/x-external-browser/'
URL = ORIGIN + PREFIX + 'round2/'
KEY = 'x-external-browser.round2.v1'


class Round2Browser(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.pw = sync_playwright().start()
        cls.browser = cls.pw.chromium.launch(
            executable_path=os.environ.get('CHROMIUM_PATH', '/usr/bin/chromium'),
            args=['--no-sandbox'])

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.pw.stop()

    def setUp(self):
        self.contexts = []
        self.errors = []

    def tearDown(self):
        for ctx in self.contexts:
            ctx.close()
        self.assertEqual(self.errors, [], 'Uncaught page errors')

    def page(self, init=None, js=True, storage=None):
        ctx = self.browser.new_context(viewport={'width': 390, 'height': 844})
        self.contexts.append(ctx)
        p = ctx.new_page()
        p.set_default_timeout(5000)
        p.on('pageerror', lambda e: self.errors.append(str(e)))
        html = (ROOT / 'round2/index.html').read_text()
        html = html.replace('<script src="app.js" defer></script>', '')
        html = html.replace('<link rel="stylesheet" href="styles.css">',
                            '<style>' + (ROOT / 'round2/styles.css').read_text() + '</style>')
        p.set_content(html)
        p.evaluate("""(initial) => {
          const data = new Map(Object.entries(initial || {}));
          Object.defineProperty(window, 'localStorage', {configurable:true,value:{
            getItem:k=>data.has(k)?data.get(k):null,
            setItem:(k,v)=>data.set(k,String(v)),
            removeItem:k=>data.delete(k)
          }});
          Object.defineProperty(window, 'isSecureContext', {configurable:true,value:true});
          Object.defineProperty(navigator,'share',{configurable:true,value:undefined});
          Object.defineProperty(navigator,'canShare',{configurable:true,value:undefined});
        }""", storage)
        if init:
            p.evaluate('() => {' + init + '}')
        if js:
            p.add_script_tag(content=(ROOT / 'round2/app.js').read_text())
        return p

    def test_01_initial_state_and_responsive_layout(self):
        p = self.page("Object.defineProperty(navigator,'share',{value:undefined});")
        self.assertEqual(p.locator('[data-case]').count(), 10)
        self.assertIn('利用できません', p.locator('#share-capability').inner_text())
        self.assertTrue(p.locator('[data-share-url]').first.is_disabled())
        for width in [320, 390, 1365]:
            p.set_viewport_size({'width': width, 'height': 900})
            self.assertLessEqual(p.evaluate('document.documentElement.scrollWidth'), width)
            self.assertTrue(p.locator('h1').is_visible())
            folder = os.environ.get('SCREENSHOT_DIR')
            if folder:
                Path(folder).mkdir(parents=True, exist_ok=True)
                p.screenshot(path=str(Path(folder) / f'round2-{width}.png'), full_page=True)
        self.assertEqual(p.url, 'about:blank')
        self.assertEqual(p.locator('#result-count').inner_text(), '0件')

    def test_02_minimal_page_has_static_links_without_executing_scripts(self):
        p = self.page(js=False)
        p.set_content((ROOT / 'round2/minimal.html').read_text())
        self.assertEqual(p.locator('script').count(), 0)
        self.assertEqual(p.locator('[data-test]').count(), 4)
        self.assertEqual(p.locator('[data-test="plain-safari-cross"]').get_attribute('href'), 'x-safari-https://example.com/')
        self.assertEqual(p.locator('[data-test="plain-https-cross"]').get_attribute('href'), 'https://example.com/')

    def test_03_meta_refresh_markup_is_static_not_a_javascript_redirect(self):
        # Native navigation cannot be validated in this offline test.
        html = (ROOT / 'round2/meta-https.html').read_text()
        self.assertIn('content="1; url=https://example.com/"', html)
        self.assertNotIn('<script', html)

    def test_04_share_resolve_keeps_original_gesture_and_never_marks_success(self):
        p = self.page("""window.shareCalls=[];
Object.defineProperty(navigator,'canShare',{value:()=>true});
Object.defineProperty(navigator,'share',{value:data=>{shareCalls.push({data, active:navigator.userActivation.isActive});return Promise.resolve();}});""")
        p.locator('[data-share-url]').first.click()
        p.wait_for_function("document.querySelector('#share-status').textContent.includes('処理が終了')")
        self.assertEqual(p.evaluate('shareCalls'), [{'data': {'url': ORIGIN + PREFIX}, 'active': True}])
        self.assertIn('成功判定ではありません', p.locator('#share-status').inner_text())
        self.assertEqual(p.locator('#outcome').input_value(), 'unrated')
        self.assertEqual(p.locator('#result-count').inner_text(), '0件')
        p.locator('[data-share-url]').last.click()
        self.assertEqual(p.evaluate('shareCalls[1].data.url'), 'https://example.com/')

    def test_05_share_abort_is_not_success(self):
        p = self.page("""Object.defineProperty(navigator,'share',{value:()=>Promise.reject(new DOMException('cancel','AbortError'))});""")
        p.locator('[data-share-url]').first.click()
        p.wait_for_function("document.querySelector('#share-status').textContent.includes('キャンセル')")
        self.assertFalse(p.locator('[data-share-url]').first.is_disabled())
        self.assertEqual(p.locator('#result-count').inner_text(), '0件')

    def test_06_share_synchronous_denial_and_can_share_false(self):
        p = self.page("""Object.defineProperty(navigator,'share',{value:()=>{throw new DOMException('blocked','NotAllowedError');}});""")
        p.locator('[data-share-url]').first.click()
        self.assertIn('許可されませんでした', p.locator('#share-status').inner_text())
        self.assertFalse(p.locator('[data-share-url]').first.is_disabled())
        q = self.page("""window.calls=0;Object.defineProperty(navigator,'canShare',{value:()=>false});Object.defineProperty(navigator,'share',{value:()=>{calls++;return Promise.resolve();}});""")
        q.locator('[data-share-url]').first.click()
        self.assertEqual(q.evaluate('calls'), 0)
        self.assertIn('対応していません', q.locator('#share-status').inner_text())

    def test_07_pending_share_cannot_be_launched_twice(self):
        p = self.page("""window.calls=0;Object.defineProperty(navigator,'share',{value:()=>{calls++;return new Promise(resolve=>{window.finishShare=resolve;});}});""")
        p.locator('[data-share-url]').first.click()
        self.assertTrue(p.locator('[data-share-url]').last.is_disabled())
        self.assertEqual(p.evaluate('calls'), 1)
        p.evaluate('finishShare()')
        p.wait_for_function("!document.querySelector('[data-share-url]').disabled")

    def test_08_manual_records_persist_export_and_preserve_first_round(self):
        p = self.page()
        p.evaluate("localStorage.setItem('x-external-browser.lab.v1','original-round-one')")
        p.locator('#device').fill('Test iPhone')
        p.locator('#source').select_option(label='Xアプリ')
        p.locator('#route').select_option(label='第2弾の一覧から')
        p.locator('#case-id').select_option('relay-instagram')
        p.locator('#outcome').select_option('intermediary')
        p.locator('#note').fill('<img src=x onerror=alert(1)> 中継アプリのみ')
        p.locator('#save-result').click()
        self.assertEqual(p.locator('#result-count').inner_text(), '1件')
        saved = p.evaluate("localStorage.getItem('x-external-browser.round2.v1')")
        p = self.page(storage={KEY:saved, 'x-external-browser.lab.v1':'original-round-one'})
        self.assertEqual(p.locator('#result-count').inner_text(), '1件')
        self.assertEqual(p.locator('#device').input_value(), 'Test iPhone')
        self.assertEqual(p.locator('#history img').count(), 0)
        p.locator('#export').click()
        report = json.loads(p.locator('#report-text').input_value())
        self.assertEqual(report['attempts'][0]['outcome'], 'intermediary')
        self.assertEqual(report['attempts'][0]['profile']['source'], 'Xアプリ')
        self.assertEqual(report['experiment'], 'round2')
        p.on('dialog', lambda dialog: dialog.accept())
        p.locator('#clear-results').click()
        self.assertEqual(p.locator('#result-count').inner_text(), '0件')
        self.assertEqual(p.evaluate("localStorage.getItem('x-external-browser.lab.v1')"), 'original-round-one')

    def test_09_storage_denial_still_allows_memory_record_and_export(self):
        p = self.page("""localStorage.getItem=()=>{throw new DOMException('blocked','SecurityError')};localStorage.setItem=()=>{throw new DOMException('blocked','QuotaExceededError')};""")
        self.assertTrue(p.locator('#storage-warning').is_visible())
        p.locator('#outcome').select_option('blocked')
        p.locator('#save-result').click()
        p.locator('#export').click()
        self.assertEqual(len(json.loads(p.locator('#report-text').input_value())['attempts']), 1)

    def test_10_corrupt_or_overlong_saved_state_is_safely_bounded(self):
        p = self.page(f"localStorage.setItem('{KEY}', '{{');")
        self.assertEqual(p.locator('#result-count').inner_text(), '0件')
        q = self.page("""localStorage.setItem('x-external-browser.round2.v1',JSON.stringify({version:1,profile:{device:'a'.repeat(300)},attempts:Array.from({length:120},()=>({caseId:'meta-safari',outcome:'made-up-success',note:'b'.repeat(1500)}))}));""")
        q.locator('#export').click()
        attempts = json.loads(q.locator('#report-text').input_value())['attempts']
        self.assertEqual(len(attempts), 100)
        self.assertEqual(attempts[0]['outcome'], 'unknown')
        self.assertEqual(len(attempts[0]['note']), 1000)
        self.assertEqual(len(q.locator('#device').input_value()), 200)

    def test_11_clipboard_denial_keeps_text_selected(self):
        p = self.page("""Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>Promise.reject(new DOMException('blocked','NotAllowedError'))}});""")
        p.locator('[data-copy="page-url"]').click()
        p.wait_for_function("document.querySelector('#status').textContent.includes('自動コピーできません')")
        self.assertEqual(p.locator('#page-url').evaluate('(e)=>e.selectionEnd-e.selectionStart'), len(URL))

    def test_12_unrated_cannot_be_saved(self):
        p = self.page()
        p.locator('#save-result').click()
        self.assertEqual(p.locator('#result-count').inner_text(), '0件')
        self.assertIn('結果を選択', p.locator('#status').inner_text())


if __name__ == '__main__':
    unittest.main(verbosity=2)

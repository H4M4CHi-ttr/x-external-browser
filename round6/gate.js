(() => {
'use strict';
const $ = id => document.getElementById(id);
const ua = navigator.userAgent || '';
const rawQuery = new URLSearchParams(location.search).get('demo');
const forced = ['x', 'ios', 'android', 'normal'].includes(rawQuery) ? rawQuery : '';
const isAndroid = /Android/i.test(ua);
const iosXUA = /Twitter for iPhone|Twitter for iPad|X for iPhone/i.test(ua);
const androidXUA = isAndroid && /TwitterAndroid|Twitter for Android|X for Android/i.test(ua);
const xUA = iosXUA || androidXUA;
const mode = forced === 'normal' ? 'normal' :
  forced === 'android' ? 'android' :
  forced === 'x' || forced === 'ios' ? 'ios' :
  androidXUA ? 'android' : iosXUA ? 'ios' : 'normal';
$('x-ui').hidden = mode !== 'ios';
$('android-ui').hidden = mode !== 'android';
$('normal-ui').hidden = mode !== 'normal';
$('android-entry-help').hidden = !isAndroid || mode === 'android';
const KEY = 'x-external-browser.round6.preview.v1';
const info = {
  detectedByUA: xUA,
  forcedMode: forced || null,
  ua: ua.slice(0, 250)
};
$('environment').textContent = 'XのUA判定: ' + (xUA ? '該当' : '非該当') +
  ' / 表示モード: ' + (mode === 'ios' ? 'iPhone長押し案内' : mode === 'android' ? 'Android向け案内' : '通常プレイ') +
  ' / UA: ' + info.ua;
let items = [];
let storageOK = true;
try {
  const saved = JSON.parse(localStorage.getItem(KEY) || '[]');
  if (Array.isArray(saved)) {
    items = saved.filter(x => x && typeof x.route === 'string' && typeof x.result === 'string').slice(-30);
  }
} catch (error) {
  if (!(error instanceof SyntaxError)) storageOK = false;
}
function render() {
  $('history').textContent = items.length ?
    '端末内の記録 ' + items.length + '件 / 最新: ' + (items[items.length - 1].variant || '旧記録') + ' · ' + items[items.length - 1].route +
    ' → ' + items[items.length - 1].result + '（' + items[items.length - 1].at + '）' :
    'まだ記録はありません。';
}
$('copy-android').addEventListener('click', async () => {
  const input = $('android-copy-url');
  input.focus(); input.select();
  try {
    if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable');
    await navigator.clipboard.writeText(input.value);
    $('copy-android-status').textContent = 'ゲームURLをコピーしました。';
  } catch (_) {
    $('copy-android-status').textContent = '自動コピー不可。選択済みのURLを長押ししてコピーしてください。';
  }
});
$('result-form').addEventListener('submit', event => {
  event.preventDefault();
  const route = $('route').value, result = $('result').value, variant = $('link-variant').value;
  if (!route || !result || !variant) {
    $('record-status').textContent = '操作と結果を選んでください。';
    return;
  }
  items.push({route, result, variant, at: new Date().toISOString(), detectedByUA: xUA});
  items = items.slice(-30);
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (_) { storageOK = false; }
  render();
  $('record-status').textContent = storageOK ?
    'このブラウザ内に記録しました。外部ブラウザ起動は目視結果です。' :
    'この画面内で記録しましたが、保存はできませんでした。';
});
render();
})();
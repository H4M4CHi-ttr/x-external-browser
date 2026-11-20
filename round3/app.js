(() => {
'use strict';
const $ = id => document.getElementById(id);
const key = 'x-external-browser.round3.v1';
let rows = [];
let storageOK = true;
try {
  const saved = JSON.parse(localStorage.getItem(key) || '[]');
  if (Array.isArray(saved)) rows = saved.filter(x => x && typeof x.caseId === 'string').slice(-100);
} catch (error) { if (!(error instanceof SyntaxError)) storageOK = false; }
const say = text => { $('status').textContent = text; };
function save() {
  rows = rows.slice(-100);
  try { localStorage.setItem(key, JSON.stringify(rows)); }
  catch (_) { storageOK = false; }
  $('storage-warning').hidden = storageOK;
}
function render() {
  $('count').textContent = rows.length + '件';
  $('history').replaceChildren();
  for (const r of [...rows].reverse()) {
    const p = document.createElement('p');
    p.textContent = r.at + ' · ' + r.caseId + ' · ' + r.source + '\n' + r.outcome + '\n' + r.note;
    $('history').append(p);
  }
}
async function copy(id) {
  const input = $(id); input.focus(); input.select();
  try {
    if (!navigator.clipboard?.writeText) throw Error('clipboard unavailable');
    await navigator.clipboard.writeText(input.value);
    say('コピーしました。');
  } catch (_) { say('自動コピーできませんでした。選択済みテキストを長押ししてコピーしてください。'); }
}
document.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', () => copy(b.dataset.copy)));
$('inspect').addEventListener('click', () => {
  const out = {at:new Date().toISOString(), userAgent:navigator.userAgent, isSecureContext:window.isSecureContext};
  try {
    const wk = window.webkit;
    out.webkitVisible = typeof wk !== 'undefined';
    const handlers = wk?.messageHandlers;
    out.messageHandlersVisible = !!handlers;
    out.visibleHandlerNames = handlers ? Object.getOwnPropertyNames(handlers).slice(0,30) : [];
    out.explanation = '公開された名前を読むだけ。呼出し／送信なし。空欄は不存在の証明ではありません。';
  } catch (error) { out.error = String(error?.name || error); }
  $('bridge-output').textContent = JSON.stringify(out,null,2);
  say('読み取り専用で表示しました。');
});
$('form').addEventListener('submit', e => {
  e.preventDefault();
  const form = e.currentTarget; const v = new FormData(form);
  const outcome = String(v.get('outcome') || '');
  if (!outcome) { say('見えた結果を選択してください。'); return; }
  rows.push({at:new Date().toISOString(), device:String(v.get('device') || '').slice(0,160),source:String(v.get('source')||''),caseId:String(v.get('case')||''),outcome,note:String(v.get('note')||'').slice(0,800)});
  save(); render(); say(storageOK?'端末内に保存しました。':'画面内に記録しました。離れる前にJSONをコピーしてください。');
  form.elements.outcome.value = ''; form.elements.note.value = '';
});
$('export').addEventListener('click', () => {
  $('export-text').value = JSON.stringify({schemaVersion:1,round:3,exportedAt:new Date().toISOString(),note:'結果は手動記録。Safari起動の自動判定なし。',rows},null,2);
  $('export-box').hidden = false; say('JSONを表示しました。');
});
$('clear').addEventListener('click', () => {
  if (!confirm('第3弾の記録を消去しますか？')) return;
  rows=[]; save(); render(); $('export-box').hidden=true; say('消去しました。');
});
$('storage-warning').hidden = storageOK; render();
})();

(function () {
  'use strict';
  const KEY = 'x-external-browser.round2.v1';
  const $ = id => document.getElementById(id);
  const profiles = ['device', 'xVersion', 'source', 'route'];
  const cases = Object.fromEntries(Array.from($('case-id').options, o => [o.value, o.text]));
  const outcomes = Object.fromEntries(Array.from($('outcome').options, o => [o.value, o.text]));
  const text = (value, max) => typeof value === 'string' ? value.slice(0, max) : '';
  const cleanProfile = raw => Object.fromEntries(profiles.map(k => [k, text(raw?.[k], 200)]));
  let state = {version: 1, profile: cleanProfile(null), attempts: []};
  let storageOK = true;
  let toast;
  try {
    const saved = JSON.parse(localStorage.getItem(KEY));
    if (saved?.version === 1 && Array.isArray(saved.attempts)) {
      state.profile = cleanProfile(saved.profile);
      state.attempts = saved.attempts.filter(a => a && Object.hasOwn(cases, a.caseId)).slice(-100).map(a => ({
        caseId: a.caseId, label: cases[a.caseId], recordedAt: text(a.recordedAt, 50),
        profile: cleanProfile(a.profile), outcome: Object.hasOwn(outcomes, a.outcome) ? a.outcome : 'unknown',
        note: text(a.note, 1000), userAgent: text(a.userAgent, 1000)
      }));
    }
  } catch (error) {
    // Corrupt JSON is recoverable; a storage access failure means persistence is unavailable.
    if (!(error instanceof SyntaxError)) storageOK = false;
  }
  function persist() {
    state.attempts = state.attempts.slice(-100);
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (_) { storageOK = false; }
    $('storage-warning').hidden = storageOK;
  }
  function notify(message) {
    clearTimeout(toast);
    $('status').textContent = message;
    $('status').hidden = false;
    toast = setTimeout(() => { $('status').hidden = true; }, 6000);
  }
  function render() {
    $('result-count').textContent = state.attempts.length + '件';
    $('history').replaceChildren();
    for (const a of [...state.attempts].reverse()) {
      const p = document.createElement('p');
      p.textContent = `${a.label}\n${outcomes[a.outcome]}\n${a.profile.source || '試行元未記入'} · ${a.recordedAt}\n${a.note}`;
      $('history').append(p);
    }
    $('export-report').hidden = true;
    $('report-text').value = '';
  }
  function exportReport() {
    $('report-text').value = JSON.stringify({
      schemaVersion: 1, experiment: 'round2', revision: 1, exportedAt: new Date().toISOString(),
      note: '全件、利用者による手動記録。リンク操作や外部ブラウザ起動の自動検証はしていません。',
      attempts: state.attempts
    }, null, 2);
    $('export-report').hidden = false;
  }
  $('storage-warning').hidden = storageOK;
  for (const k of profiles) {
    $(k).value = state.profile[k];
    $(k).addEventListener('input', () => { state.profile[k] = $(k).value; persist(); });
  }
  $('result-form').addEventListener('submit', event => {
    event.preventDefault();
    if ($('outcome').value === 'unrated') { notify('目視した結果を選択してください。'); return; }
    const caseId = $('case-id').value;
    state.attempts.push({caseId, label: cases[caseId], recordedAt: new Date().toISOString(),
      profile: cleanProfile(Object.fromEntries(profiles.map(k => [k, $(k).value]))),
      outcome: $('outcome').value, note: $('note').value.slice(0, 1000), userAgent: navigator.userAgent.slice(0, 1000)});
    persist(); render();
    $('outcome').value = 'unrated'; $('note').value = '';
    notify(storageOK ? '目視結果を保存しました。' : 'この画面内だけに記録しました。離れる前にJSONをコピーしてください。');
  });
  $('case-id').addEventListener('change', () => { $('outcome').value = 'unrated'; $('note').value = ''; });
  $('export').addEventListener('click', exportReport);
  $('clear-results').addEventListener('click', () => {
    if (!confirm('第2弾の記録だけを消去しますか？ 第1弾と環境入力は残ります。')) return;
    state.attempts = []; persist(); render(); notify('第2弾の結果を消去しました。');
  });
  document.querySelectorAll('[data-copy]').forEach(button => {
    button.disabled = false;
    button.addEventListener('click', async () => {
      if (button.dataset.copy === 'report-text') exportReport();
      const input = $(button.dataset.copy);
      input.focus(); input.select();
      try {
        if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
        await navigator.clipboard.writeText(input.value);
        notify('コピーしました。');
      } catch (_) { notify('自動コピーできませんでした。選択済みの文字列を長押ししてコピーしてください。'); }
    });
  });
  for (const id of ['save-result', 'export', 'clear-results']) $(id).disabled = false;
  render();

  const shareButtons = Array.from(document.querySelectorAll('[data-share-url]'));
  const shareAvailable = isSecureContext && typeof navigator.share === 'function';
  let sharing = false;
  $('share-capability').textContent = shareAvailable
    ? 'この環境は navigator.share を公開しています。利用許可と共有先はボタンを押して確認します。'
    : 'この環境では共有APIを利用できません。API非対応として手動記録できます。';
  function unlock() {
    sharing = false;
    shareButtons.forEach(b => { b.disabled = !shareAvailable; });
  }
  function shareError(error) {
    unlock();
    const message = error?.name === 'AbortError'
      ? '共有をキャンセルしたか、利用できる共有先がありません。'
      : error?.name === 'NotAllowedError'
        ? '共有が許可されませんでした。ブラウザの制限・権限・ユーザー操作の条件が考えられます。'
        : '共有APIでエラーになりました：' + text(error?.name || error?.message, 200);
    $('share-status').textContent = message + ' 外部ブラウザの成功判定はしていません。';
  }
  unlock();
  shareButtons.forEach(button => button.addEventListener('click', () => {
    if (!shareAvailable || sharing) return;
    const data = {url: button.dataset.shareUrl};
    try {
      if (typeof navigator.canShare === 'function' && !navigator.canShare(data)) {
        $('share-status').textContent = 'このURLの共有はAPIで対応していません。外部ブラウザの成功判定はしていません。';
        return;
      }
      sharing = true;
      shareButtons.forEach(b => { b.disabled = true; });
      // No await/timer before this call: preserve the original button gesture.
      const result = navigator.share(data);
      $('share-status').textContent = '共有APIを呼び出しました。表示された共有先と、その後のアプリ切替を確認してください。';
      Promise.resolve(result).then(() => {
        unlock();
        $('share-status').textContent = '共有APIの処理が終了しました。外部ブラウザの成功判定ではありません。実際に見えた結果を手動記録してください。';
      }, shareError);
    } catch (error) { shareError(error); }
  }));
})();

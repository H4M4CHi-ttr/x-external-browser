(function (root) {
  'use strict';
  const VERSION = '1.0.0';
  const STORAGE_KEY = 'x-external-browser.lab.v1';
  const OUTCOMES = {
    unrated: '未判定', safari: 'Safariが別アプリで開いた', chrome: 'Chromeが別アプリで開いた',
    external: 'その他の外部ブラウザが開いた', inapp: 'Xなどのアプリ内のまま',
    prompt: '確認ダイアログだけ出た', blocked: '反応なし・エラー', unknown: '判断できない'
  };
  const CASES = [
    {id:'https-self', group:'control', label:'通常のHTTPSリンク', detail:'基準となる同じタブへのリンク。まずこれで到達画面を確認。', action:'link', scheme:'https'},
    {id:'https-blank', group:'control', label:'HTTPS + target="_blank"', detail:'新しいタブの指定と、外部アプリへの移動は別。実際の画面で判定。', action:'link', scheme:'https', blank:true},
    {id:'https-open', group:'control', label:'HTTPS + window.open()', detail:'タップの処理中に同期呼び出し。noopener付き。', action:'open', scheme:'https'},
    {id:'safari-link', group:'ios', label:'Safariスキーム：通常リンク', detail:'x-safari-https: をhrefに指定。Safari起動を試す実験で、動作保証はありません。', action:'link', scheme:'safari'},
    {id:'safari-blank', group:'ios', label:'Safariスキーム：別タブ指定', detail:'同じスキームに target="_blank" を追加。', action:'link', scheme:'safari', blank:true},
    {id:'safari-assign', group:'ios', label:'Safariスキーム：location.assign()', detail:'タップの処理中に同期でlocation.assign()を呼ぶ。', action:'assign', scheme:'safari'},
    {id:'safari-open', group:'ios', label:'Safariスキーム：window.open()', detail:'タップの処理中に同期でwindow.open()を呼ぶ。noopener付き。', action:'open', scheme:'safari'},
    {id:'safari-delayed', group:'ios', label:'Safariスキーム：1.5秒後', detail:'タップ直後の呼び出しとの差を比較。実行時のuserActivationも記録。', action:'delayed', scheme:'safari'},
    {id:'chrome-ios', group:'ios', label:'iOS Chromeスキーム', detail:'googlechromes: を使う比較用。Chromeのインストールが必要。', action:'link', scheme:'chrome-ios'},
    {id:'intent', group:'android', label:'Android Intent：アプリ指定なし', detail:'intent: をOSへ渡す試験。既定ブラウザへの移動を保証するものではありません。', action:'link', scheme:'intent'},
    {id:'intent-chrome', group:'android', label:'Android Intent：Chrome指定', detail:'package=com.android.chrome。既定ブラウザではなくChromeを指定。', action:'link', scheme:'intent-chrome'},
    {id:'intent-fallback', group:'android', label:'Android Intent：fallback付き', detail:'起動できない場合のHTTPS到達先を別表示。fallback到達を成功とは数えません。', action:'link', scheme:'intent-fallback'},
    {id:'external-param', group:'control', label:'openExternalBrowser=1 を追加', detail:'LINE用パラメーターがXでも作用するかの比較用。X対応の根拠はありません。', action:'link', scheme:'https', externalParam:true},
    {id:'auto-safari', group:'auto', label:'読込後にSafariスキーム', detail:'専用HTTPSリンクを開くと、1秒後に1回だけSafari起動を試行。', action:'auto', scheme:'safari', auto:'safari'},
    {id:'auto-intent', group:'auto', label:'読込後にAndroid Intent', detail:'専用HTTPSリンクを開くと、1秒後に1回だけIntentを試行。', action:'auto', scheme:'intent', auto:'intent'}
  ];
  function baseURL(value) {
    const u = new URL(value);
    if (!['https:', 'http:'].includes(u.protocol) || u.username || u.password)
      throw new TypeError('HTTP(S)の認証情報を含まないURLが必要です。');
    u.search = ''; u.hash = '';
    return u.href;
  }
  function arrivalURL(base, id, run, route = 'primary') {
    const u = new URL(baseURL(base));
    u.searchParams.set('arrived', id);
    u.searchParams.set('run', run);
    u.searchParams.set('route', route);
    return u.href;
  }
  function toScheme(target, scheme) {
    const u = new URL(target);
    if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password || u.hash)
      throw new TypeError('遷移先URLが不正です。');
    if (scheme === 'https') return u.href;
    if (u.protocol !== 'https:') throw new TypeError('スキーム実験にはHTTPSでアクセスしてください。');
    if (scheme === 'safari') return u.href.replace(/^https:/, 'x-safari-https:');
    if (scheme === 'chrome-ios') return u.href.replace(/^https:/, 'googlechromes:');
    if (!['intent', 'intent-chrome', 'intent-fallback'].includes(scheme))
      throw new TypeError('未知のスキームです。');
    let extra = scheme === 'intent-chrome' ? 'package=com.android.chrome;' : '';
    if (scheme === 'intent-fallback') {
      const fallback = new URL(u.href);
      fallback.searchParams.set('route', 'fallback');
      extra = 'S.browser_fallback_url=' + encodeURIComponent(fallback.href) + ';';
    }
    return 'intent://' + u.host + u.pathname + u.search + '#Intent;scheme=https;' + extra + 'end';
  }
  function linkFor(base, spec, run) {
    const u = new URL(arrivalURL(base, spec.id, run));
    if (spec.externalParam) u.searchParams.set('openExternalBrowser', '1');
    return toScheme(u.href, spec.scheme);
  }
  function autoCase(search) {
    const p = new URLSearchParams(search);
    if (p.has('arrived')) return null;
    return CASES.find(x => x.action === 'auto' && x.auto === p.get('auto')) || null;
  }
  function emptyState() {
    return {version:1, profile:{device:'', xVersion:'', defaultBrowser:'', source:''}, attempts:[]};
  }
  function readState(raw) {
    const empty = emptyState();
    try {
      if (!raw) return empty;
      const parsed = JSON.parse(raw);
      if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.attempts)) return empty;
      for (const key of Object.keys(empty.profile)) {
        if (typeof parsed.profile?.[key] === 'string') empty.profile[key] = parsed.profile[key].slice(0, 200);
      }
      empty.attempts = parsed.attempts.filter(x => x && typeof x.id === 'string' &&
        CASES.some(c => c.id === x.caseId)).slice(-100).map(x => ({
          ...x, id:x.id.slice(0,96), outcome:Object.hasOwn(OUTCOMES,x.outcome) ? x.outcome : 'unrated',
          note:typeof x.note === 'string' ? x.note.slice(0,1000) : ''
        }));
      return empty;
    } catch (_) { return empty; }
  }
  const api = {VERSION, STORAGE_KEY, OUTCOMES, CASES, baseURL, arrivalURL, toScheme, linkFor, autoCase, emptyState, readState};
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BrowserLab = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);

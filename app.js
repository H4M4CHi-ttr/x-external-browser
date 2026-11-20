(function () {
  'use strict';
  const Lab = window.BrowserLab;
  const $ = id => document.getElementById(id);
  const base = Lab.baseURL(location.href);
  const incoming = new URLSearchParams(location.search);
  let storageAvailable = true;
  let state = loadState();
  let activeId = state.attempts.length ? state.attempts[state.attempts.length - 1].id : '';
  let pending = null;
  let toastTimer = null;

  function loadState() {
    try { return Lab.readState(localStorage.getItem(Lab.STORAGE_KEY)); }
    catch (_) { storageAvailable = false; return Lab.emptyState(); }
  }
  function persist() {
    state.attempts = state.attempts.slice(-100);
    try { localStorage.setItem(Lab.STORAGE_KEY, JSON.stringify(state)); }
    catch (_) { storageAvailable = false; }
    $('storage-warning').hidden = storageAvailable;
  }
  function notify(message) {
    clearTimeout(toastTimer);
    $('status').textContent = message;
    $('status').hidden = false;
    toastTimer = setTimeout(() => { $('status').hidden = true; }, 5500);
  }
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function newId() {
    return typeof crypto.randomUUID === 'function' ? crypto.randomUUID() :
      Date.now().toString(36) + '-' + Math.random().toString(36).slice(2,10);
  }
  function activation() {
    return navigator.userActivation ? {
      isActive:navigator.userActivation.isActive,
      hasBeenActive:navigator.userActivation.hasBeenActive
    } : null;
  }
  function environment() {
    const v = window.visualViewport;
    let referrerOrigin = '';
    try { referrerOrigin = document.referrer ? new URL(document.referrer).origin : ''; } catch (_) {}
    return {
      userAgent:navigator.userAgent, platform:navigator.platform, language:navigator.language,
      page:base, referrerOrigin, screen:{width:screen.width,height:screen.height},
      viewport:{width:innerWidth,height:innerHeight,devicePixelRatio:devicePixelRatio},
      visualViewport:v ? {width:v.width,height:v.height,scale:v.scale,offsetTop:v.offsetTop} : null,
      css:{dvh:CSS.supports('height','100dvh'),svh:CSS.supports('height','100svh')},
      standalone:navigator.standalone === true || matchMedia('(display-mode: standalone)').matches
    };
  }
  function activeAttempt() { return state.attempts.find(x => x.id === activeId); }
  function addEvent(attempt, type, extra) {
    if (!attempt) return;
    if (!Array.isArray(attempt.events)) attempt.events = [];
    attempt.events.push({type,at:new Date().toISOString(),visibility:document.visibilityState,userActivation:activation(),...(extra || {})});
    attempt.events = attempt.events.slice(-50);
    persist();
  }
  function startAttempt(spec, manual = false) {
    cancelPending();
    const attempt = {
      id:newId(), caseId:spec.id, label:spec.label, recordedAt:new Date().toISOString(),
      recordMode:manual ? 'manual-entry-no-launch' : spec.action,
      profile:{...state.profile}, environment:environment(), outcome:'unrated', note:'', events:[]
    };
    state.attempts.push(attempt);
    activeId = attempt.id;
    addEvent(attempt, manual ? 'manual-entry' : 'attempt-start');
    renderResults();
    return attempt;
  }
  function dispatch(spec, url, attempt) {
    addEvent(attempt, 'dispatch', {mechanism:spec.action,url});
    try {
      if (spec.action === 'open') {
        // A null return can also mean noopener was used. Never infer success/failure from it.
        window.open(url, '_blank', 'noopener');
      } else {
        location.assign(url);
      }
    } catch (error) {
      addEvent(attempt, 'dispatch-error', {message:String(error.message || error)});
      notify('起動処理でエラーになりました。見えた結果を記録してください。');
    }
  }
  function cancelPending() {
    if (!pending) return;
    clearTimeout(pending.timer);
    addEvent(pending.attempt, 'cancelled');
    pending = null;
    $('pending').hidden = true;
  }
  function schedule(spec, url, attempt, delay) {
    $('pending-message').textContent = spec.label + '：' + delay / 1000 + '秒後に1回だけ試します。';
    $('pending').hidden = false;
    pending = {attempt, timer:setTimeout(() => {
      pending = null;
      $('pending').hidden = true;
      dispatch(spec, url, attempt);
    }, delay)};
  }
  function fillResult() {
    const attempt = activeAttempt();
    $('outcome').value = attempt ? attempt.outcome : 'unrated';
    $('note').value = attempt ? attempt.note : '';
    $('save-result').disabled = !attempt;
  }
  function renderResults() {
    const select = $('attempt-select');
    select.replaceChildren();
    if (!state.attempts.length) {
      select.append(new Option('まだ試行がありません', ''));
      activeId = '';
    } else {
      [...state.attempts].reverse().forEach(attempt => {
        const spec = Lab.CASES.find(x => x.id === attempt.caseId);
        const stamp = attempt.recordedAt ? new Date(attempt.recordedAt).toLocaleTimeString() : '時刻不明';
        select.append(new Option(stamp + ' · ' + spec.label, attempt.id));
      });
      if (!activeAttempt()) activeId = state.attempts[state.attempts.length - 1].id;
      select.value = activeId;
    }
    fillResult();
    $('result-count').textContent = state.attempts.length + '件';
    const history = $('history');
    history.replaceChildren();
    if (!state.attempts.length) history.append(element('p','muted','まだ記録はありません。'));
    [...state.attempts].reverse().forEach(attempt => {
      const row = element('div','history-item');
      row.append(element('strong','',Lab.CASES.find(x => x.id === attempt.caseId).label));
      row.append(element('p','',Lab.OUTCOMES[attempt.outcome]));
      if (attempt.recordMode === 'manual-entry-no-launch') row.append(element('p','muted small','手動入力。このページからの起動履歴はありません。'));
      if (attempt.note) row.append(element('p','',attempt.note));
      history.append(row);
    });
  }
  function selectForRecording(spec) {
    const previous = [...state.attempts].reverse().find(x => x.caseId === spec.id);
    if (previous) { activeId = previous.id; renderResults(); }
    else { startAttempt(spec,true); notify('起動せずに手動記録を作成しました。実際に試した結果を入力してください。'); }
    $('result-panel').scrollIntoView({block:'start'});
    $('outcome').focus({preventScroll:true});
  }
  function renderCase(spec, number) {
    const card = element('article','case-card');
    card.id = 'case-' + spec.id;
    card.append(element('div','case-number',String(number).padStart(2,'0') + ' / ' + spec.id));
    card.append(element('h4','',spec.label));
    card.append(element('p','',spec.detail));
    const actions = element('div','actions');
    const launch = element(spec.action === 'link' ? 'a' : 'button', 'button primary launch', '試す ↗');
    launch.setAttribute('aria-label',spec.label + 'を試す');
    if (launch.tagName === 'BUTTON') launch.type = 'button';
    if (spec.blank) { launch.target = '_blank'; launch.rel = 'noopener'; }
    const details = element('details');
    details.append(element('summary','','実際のURIを見る'));
    const code = element('code');
    try {
      const preview = Lab.linkFor(base,spec,'preview');
      if (spec.action === 'link') launch.href = preview;
      code.textContent = preview;
    } catch (error) {
      code.textContent = error.message;
      launch.setAttribute('aria-disabled','true');
    }
    launch.addEventListener('click', event => {
      if (launch.getAttribute('aria-disabled') === 'true') { event.preventDefault(); notify('この試験はHTTPSで開いてください。'); return; }
      const attempt = startAttempt(spec);
      const url = Lab.linkFor(base,spec,attempt.id);
      code.textContent = url;
      if (spec.action === 'link') {
        // Keep genuine anchor navigation and the original user gesture; do not await anything here.
        launch.href = url;
        addEvent(attempt,'dispatch',{mechanism:'anchor',url,target:spec.blank ? '_blank' : '_self'});
      } else {
        event.preventDefault();
        if (spec.action === 'delayed') {
          schedule(spec,url,attempt,1500);
          $('pending').scrollIntoView({block:'start'});
        } else dispatch(spec,url,attempt);
      }
    });
    const record = element('button','record-only text-button','結果を記録');
    record.type = 'button'; record.addEventListener('click',() => selectForRecording(spec));
    actions.append(launch,record); details.append(code); card.append(actions,details);
    $(spec.group + '-cases').append(card);
  }
  function renderAuto(spec, number) {
    const url = new URL(base); url.searchParams.set('auto',spec.auto);
    const card = element('article','auto-card');
    card.append(element('div','case-number',String(number).padStart(2,'0') + ' / ' + spec.id));
    card.append(element('h4','',spec.label)); card.append(element('p','',spec.detail));
    const input = element('input'); input.readOnly = true; input.value = url.href;
    input.setAttribute('aria-label',spec.label + 'のX貼り付け用URL');
    const actions = element('div','actions');
    const copy = element('button','','専用URLをコピー'); copy.type = 'button';
    copy.addEventListener('click',() => copyText(input));
    const link = element('a','button','ここから開いて試す'); link.href = url.href;
    const record = element('button','text-button','結果を記録'); record.type = 'button';
    record.addEventListener('click',() => selectForRecording(spec));
    actions.append(copy,link,record); card.append(input,actions); $('auto-cases').append(card);
  }
  async function copyText(input) {
    input.focus(); input.select();
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(input.value);
      notify('コピーしました。');
    } catch (_) { notify('自動コピーできませんでした。選択済みのテキストを長押ししてコピーしてください。'); }
  }
  function report() {
    return {
      schemaVersion:1, labVersion:Lab.VERSION, exportedAt:new Date().toISOString(),
      note:'outcomeは利用者の手動申告。到達・visibility・blurは外部ブラウザ起動の証明ではありません。',
      exportEnvironment:environment(), profile:state.profile, attempts:state.attempts
    };
  }
  function refreshDiagnostics() {
    const data = environment();
    data.measuredHeight = {vh30:$('vh-probe').getBoundingClientRect().height,dvh30:$('dvh-probe').getBoundingClientRect().height};
    $('diagnostics').textContent = JSON.stringify(data,null,2);
  }

  $('version').textContent = 'v' + Lab.VERSION;
  $('share-url').value = base;
  $('back-to-lab').href = base;
  $('storage-warning').hidden = storageAvailable;
  Object.entries(Lab.OUTCOMES).forEach(([value,label]) => $('outcome').append(new Option(label,value)));
  Object.keys(state.profile).forEach(key => {
    $(key).value = state.profile[key];
    $(key).addEventListener('input',() => { state.profile[key] = $(key).value; persist(); });
  });
  Lab.CASES.forEach((spec,index) => spec.action === 'auto' ? renderAuto(spec,index+1) : renderCase(spec,index+1));
  renderResults();
  refreshDiagnostics();
  $('attempt-select').addEventListener('change',() => { activeId = $('attempt-select').value; fillResult(); });
  $('save-result').addEventListener('click',() => {
    const attempt = activeAttempt(); if (!attempt) return;
    attempt.outcome = $('outcome').value; attempt.note = $('note').value;
    attempt.ratedAt = new Date().toISOString(); persist(); renderResults(); notify('結果を保存しました。');
  });
  $('cancel-pending').addEventListener('click',() => { cancelPending(); notify('予約した起動を中止しました。'); });
  $('copy-main').addEventListener('click',() => copyText($('share-url')));
  $('export').addEventListener('click',() => {
    $('report-text').value = JSON.stringify(report(),null,2); $('export-report').hidden = false;
  });
  $('copy-report').addEventListener('click',() => copyText($('report-text')));
  $('download-report').addEventListener('click',() => {
    const blob = new Blob([$('report-text').value],{type:'application/json'});
    const url = URL.createObjectURL(blob); const a = element('a');
    a.href = url; a.download = 'x-browser-lab-' + new Date().toISOString().slice(0,10) + '.json';
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url),1500);
    notify('ダウンロードを要求しました。保存されない場合はJSONをコピーしてください。');
  });
  $('clear-results').addEventListener('click',() => {
    if (!confirm('このブラウザの実験結果を消去しますか？ 環境の入力は残します。')) return;
    cancelPending(); state.attempts = []; activeId = ''; persist(); renderResults();
    $('report-text').value = ''; $('export-report').hidden = true; notify('実験結果を消去しました。');
  });
  ['blur','focus'].forEach(type => window.addEventListener(type,() => addEvent(activeAttempt(),type)));
  window.addEventListener('pagehide',() => { cancelPending(); addEvent(activeAttempt(),'pagehide'); });
  document.addEventListener('visibilitychange',() => addEvent(activeAttempt(),'visibilitychange'));
  window.addEventListener('pageshow',event => {
    if (event.persisted && storageAvailable) { state = loadState(); renderResults(); }
    addEvent(activeAttempt(),'pageshow',{persisted:event.persisted});
  });
  window.addEventListener('resize',refreshDiagnostics);
  if (window.visualViewport) visualViewport.addEventListener('resize',refreshDiagnostics);
  $('diagnostics').parentElement.addEventListener('toggle',refreshDiagnostics);

  if (incoming.has('arrived')) {
    const spec = Lab.CASES.find(x => x.id === incoming.get('arrived'));
    const route = incoming.get('route') === 'fallback' ? 'fallback（代替HTTPSページ）' : 'primary（通常の到達先）';
    $('arrival').hidden = false;
    $('arrival-info').textContent = (spec ? spec.label : '不明な方式') + ' / ' + route + ' / 試行ID: ' + (incoming.get('run') || 'なし').slice(0,96);
    const attempt = state.attempts.find(x => x.id === incoming.get('run') && x.caseId === spec?.id);
    if (attempt) { activeId = attempt.id; addEvent(attempt,'arrival',{route}); renderResults(); }
  }
  const automatic = Lab.autoCase(location.search);
  if (automatic) {
    // Consume the flag before launch; reloading or returning from bfcache must not relaunch.
    try {
      history.replaceState(null,'',base);
      const attempt = startAttempt(automatic);
      schedule(automatic,Lab.linkFor(base,automatic,attempt.id),attempt,1000);
    } catch (error) { notify('自動試行を中止しました：' + error.message); }
  }
})();

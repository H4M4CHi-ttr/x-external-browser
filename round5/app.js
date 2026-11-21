(() => {
'use strict';
const $=id=>document.getElementById(id);
const KEY='x-external-browser.round5.v1';
const SAMESITE='https://h4m4chi-ttr.github.io/x-external-browser/round3/landing.html?case=window';
const SAFARI='x-safari-https://h4m4chi-ttr.github.io/x-external-browser/round3/landing.html?case=window';
const cases=new Set([...$('case').options].map(x=>x.value).filter(Boolean));
const outcomes=new Set([...$('outcome').options].map(x=>x.value).filter(Boolean));
const max=(x,n)=>typeof x==='string'?x.slice(0,n):'';
let attempts=[],storageOK=true;
try{
  const parsed=JSON.parse(localStorage.getItem(KEY)||'[]');
  if(Array.isArray(parsed))attempts=parsed.filter(x=>x&&cases.has(x.caseId)&&outcomes.has(x.outcome)).slice(-100).map(x=>({
    at:max(x.at,50),caseId:x.caseId,source:max(x.source,20),outcome:x.outcome,
    detected:max(x.detected,10),steps:Number.isInteger(x.steps)&&x.steps>=0&&x.steps<=30?x.steps:null,
    device:max(x.device,160),xVersion:max(x.xVersion,100),note:max(x.note,800)
  }));
}catch(e){if(!(e instanceof SyntaxError))storageOK=false;}
const feedback=s=>{$('status').textContent=s;};
function persist(){
  attempts=attempts.slice(-100);
  try{localStorage.setItem(KEY,JSON.stringify(attempts));}
  catch(_){storageOK=false;}
  $('storage-warning').hidden=storageOK;
}
function render(){
  $('count').textContent=attempts.length+'件';$('history').replaceChildren();
  for(const record of [...attempts].reverse()){
    const row=document.createElement('p');
    row.textContent=record.at+' · '+record.caseId+' · '+record.source+'\n'+record.outcome+
      ' · 自動認識 '+(record.detected||'対象外')+' · 操作数 '+(record.steps??'未記入')+'\n'+record.note;
    $('history').append(row);
  }
}
// window.open is synchronous in the user gesture; no await/timer/promise before the call.
const opens={
  o1:{url:SAMESITE,noopener:true},o2:{url:SAMESITE,noopener:false},
  o3:{url:SAFARI,noopener:true},o4:{url:SAFARI,noopener:false}
};
document.querySelectorAll('[data-open]').forEach(button=>button.addEventListener('click',()=>{
  const spec=opens[button.dataset.open];if(!spec)return;
  try{
    if(spec.noopener)window.open(spec.url,'_blank','noopener');
    else window.open(spec.url,'_blank');
    $('open-status').textContent='呼び出し要求を実行しました。別アプリが開いたか目視し、結果を記録してください。';
  }catch(error){
    $('open-status').textContent='呼び出し時の例外: '+max(String(error?.name||error),120)+'。外部ブラウザ起動は未確認です。';
  }
}));
$('copy-direct').addEventListener('click',async()=>{
  const input=$('direct-302');input.focus();input.select();
  try{
    if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');
    await navigator.clipboard.writeText(input.value);feedback('URLをコピーしました。');
  }catch(_){feedback('自動コピーできませんでした。選択済みのURLを長押ししてコピーしてください。');}
});
$('result-form').addEventListener('submit',event=>{
  event.preventDefault();const form=event.currentTarget;const v=new FormData(form);
  const caseId=String(v.get('case')||''),source=String(v.get('source')||''),outcome=String(v.get('outcome')||'');
  const raw=String(v.get('steps')||'');const steps=raw===''?null:Number(raw);
  if(!cases.has(caseId)||!source||!outcomes.has(outcome)){feedback('ケース・試行元・結果を選択してください。');return;}
  if(steps!==null&&(!Number.isInteger(steps)||steps<0||steps>30)){feedback('操作回数は0〜30の整数で入力してください。');return;}
  attempts.push({at:new Date().toISOString(),caseId,source,outcome,
    detected:max(String(v.get('detected')||''),10),steps,
    device:max(String(v.get('device')||''),160),xVersion:max(String(v.get('xVersion')||''),100),
    note:max(String(v.get('note')||''),800)});
  persist();render();
  form.elements.outcome.value='';form.elements.note.value='';
  feedback(storageOK?'記録を端末内に保存しました。':'この画面内に記録しました。閉じる前にJSONをコピーしてください。');
});
$('export').addEventListener('click',()=>{
  $('json').value=JSON.stringify({schemaVersion:1,experiment:'round5',exportedAt:new Date().toISOString(),
    note:'外部ブラウザ起動は目視で手動判定。呼び出しやリンク到達だけでは成功としません。',attempts},null,2);
  $('export-box').hidden=false;feedback('JSONを表示しました。');
});
$('copy-json').addEventListener('click',async()=>{
  const el=$('json');el.focus();el.select();
  try{
    if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');
    await navigator.clipboard.writeText(el.value);feedback('JSONをコピーしました。');
  }catch(_){feedback('自動コピー不可。テキストを長押ししてコピーしてください。');}
});
$('clear').addEventListener('click',()=>{
  if(!confirm('第5弾の記録だけ消去しますか？'))return;
  attempts=[];persist();render();$('export-box').hidden=true;feedback('第5弾の記録を消去しました。');
});
$('storage-warning').hidden=storageOK;render();
})();
(() => {
'use strict';
const $=id=>document.getElementById(id);
const key='x-external-browser.round4.v1';
const cases=new Set([...$('case').options].map(x=>x.value));
const outcomes=new Set([...$('outcome').options].map(x=>x.value));
let records=[],storageOK=true;
const str=(value,n)=>typeof value==='string'?value.slice(0,n):'';
try{
  const saved=JSON.parse(localStorage.getItem(key)||'[]');
  if(Array.isArray(saved))records=saved.filter(x=>x&&cases.has(x.caseId)&&outcomes.has(x.outcome)).slice(-100).map(x=>({
    at:str(x.at,50),caseId:x.caseId,surface:str(x.surface,24),outcome:x.outcome,steps:Number.isInteger(x.steps)&&x.steps>=0&&x.steps<=30?x.steps:null,
    device:str(x.device,120),xVersion:str(x.xVersion,80),note:str(x.note,800)
  }));
}catch(error){if(!(error instanceof SyntaxError))storageOK=false;}
function save(){records=records.slice(-100);try{localStorage.setItem(key,JSON.stringify(records));}catch(_){storageOK=false;}$('storage-warning').hidden=storageOK;}
function msg(text){$('status').textContent=text;}
function render(){
  $('count').textContent=records.length+'件';$('history').replaceChildren();
  for(const item of [...records].reverse()){const p=document.createElement('p');p.textContent=item.at+' · '+item.caseId+' · '+item.surface+'\n'+item.outcome+' · 操作数 '+(item.steps??'未記入')+'\n'+item.note;$('history').append(p);}
}
document.querySelectorAll('[data-case]').forEach(b=>b.addEventListener('click',()=>{
  $('case').value=b.dataset.case;$('record').scrollIntoView({block:'start'});$('surface').focus({preventScroll:true});msg('ケースを選択しました。実際の結果を記録してください。');
}));
$('form').addEventListener('submit',e=>{
  e.preventDefault();const form=e.currentTarget,v=new FormData(form);
  const caseId=String(v.get('case')||''),surface=String(v.get('surface')||''),outcome=String(v.get('outcome')||'');
  const raw=String(v.get('steps')||''),steps=raw===''?null:Number(raw);
  if(!cases.has(caseId)||!surface||!outcome||!outcomes.has(outcome)){msg('ケース・場所・結果を選択してください。');return;}
  if(steps!==null&&(!Number.isInteger(steps)||steps<0||steps>30)){msg('操作回数は0〜30の整数で入力してください。');return;}
  records.push({at:new Date().toISOString(),caseId,surface,outcome,steps,device:str(String(v.get('device')||''),120),xVersion:str(String(v.get('xVersion')||''),80),note:str(String(v.get('note')||''),800)});
  save();render();form.elements.outcome.value='';form.elements.note.value='';
  msg(storageOK?'結果を端末内へ保存しました。':'保存できませんでした。ページを離れる前にJSONをコピーしてください。');
});
$('export').addEventListener('click',()=>{
  $('json').value=JSON.stringify({schemaVersion:1,experiment:'round4',exportedAt:new Date().toISOString(),note:'利用者の目視結果。外部ブラウザ起動を自動判定していません。',records},null,2);
  $('export-box').hidden=false;msg('JSONを表示しました。');
});
$('copy-json').addEventListener('click',async()=>{
  const field=$('json');field.focus();field.select();try{await navigator.clipboard.writeText(field.value);msg('コピーしました。');}catch(_){msg('自動コピー不可。選択した文字列を長押ししてください。');}
});
$('clear').addEventListener('click',()=>{if(!confirm('第4弾の記録だけ消去しますか？'))return;records=[];save();render();$('export-box').hidden=true;msg('記録を消去しました。');});
$('storage-warning').hidden=storageOK;render();
})();
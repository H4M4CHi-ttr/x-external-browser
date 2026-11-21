(() => {
'use strict';
const $ = id => document.getElementById(id);
const STAR_COUNT = 10;
const LIMIT = 25;
const positions = [
  [50,50],[25,34],[73,66],[34,73],[76,25],[48,31],
  [19,60],[67,48],[53,78],[81,72],[26,23]
];
let score = 0, remaining = LIMIT, timer = null, started = false, ended = false;
const star = $('star');
function draw() {
  $('score').textContent = String(score);
  $('time').textContent = String(remaining);
  const pos = positions[score % positions.length];
  star.style.left = pos[0] + '%';
  star.style.top = pos[1] + '%';
}
function stopTimer() {
  if (timer !== null) clearInterval(timer);
  timer = null;
}
function finish(won) {
  if (ended) return;
  ended = true;
  stopTimer();
  star.hidden = true;
  $('game-end').hidden = false;
  $('end-title').textContent = won ? 'CLEAR!' : 'TIME UP';
  $('end-icon').textContent = won ? '✨' : '🌙';
  $('end-detail').textContent = won ? '10個の星をキャッチ！ おめでとう。' :
    '星は ' + score + ' / 10 個。もう一度挑戦しよう。';
  $('game-message').textContent = won ? 'おめでとう！' : '時間切れ！';
}
function begin() {
  if (started || ended) return;
  started = true;
  $('game-message').textContent = '光る星を追いかけよう！';
  timer = setInterval(() => {
    if (ended) return;
    remaining = Math.max(0, remaining - 1);
    draw();
    if (remaining === 0) finish(false);
  }, 1000);
}
function catchStar() {
  if (ended) return;
  begin();
  score++;
  draw();
  if (score >= STAR_COUNT) finish(true);
}
function reset() {
  stopTimer();
  score=0;remaining=LIMIT;started=false;ended=false;
  star.hidden=false;$('game-end').hidden=true;
  $('game-message').textContent='★をタップするとスタート！';
  draw();
}
star.addEventListener('click', catchStar);
$('again').addEventListener('click', reset);
window.addEventListener('pagehide', stopTimer);
if (/Twitter for iPhone|Twitter for iPad|TwitterAndroid|Twitter for Android|X for iPhone/i.test(navigator.userAgent)) {
  $('x-warning').hidden = false;
}
draw();
})();
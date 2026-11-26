'use strict';
const $ = id => document.getElementById(id);
const KEY = 'mina-spelling-bee-grade4-v1';
let history = {};
try { const saved = JSON.parse(localStorage.getItem(KEY) || '{}'); if(saved && typeof saved === 'object' && !Array.isArray(saved)) history = saved; } catch { $('storage-note').textContent = 'Saved progress could not be read. You can still play.'; }
let mode = 'study', queue = [], index = 0, answered = false, revealed = false, score = 0, missed = [], voices = [];
const normalize = value => value.trim().toLowerCase();
const current = () => queue[index];
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(history)); } catch { $('storage-note').textContent = 'Progress cannot be saved here. You can still play this round.'; }
  stats();
}
function stats() {
  const correct = SPELLING_WORDS.filter(w => history[w.word]?.correct > 0).length;
  const review = SPELLING_WORDS.filter(w => history[w.word]?.missed).length;
  $('stats').textContent = `${correct} / 50 words spelled correctly · ${review} to revisit`;
  $('mastery').value = correct;
}
function selected() {
  const group = $('group').value;
  return SPELLING_WORDS.filter((w,i) => (group === 'all' || Math.floor(i / 10) === Number(group)) && (mode !== 'review' || history[w.word]?.missed));
}
function shuffle(words) {
  const result = [...words];
  for(let i=result.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [result[i],result[j]]=[result[j],result[i]]; }
  return result;
}
function speak(text, rate = .8) {
  if(!('speechSynthesis' in window)) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US'; utterance.rate = rate;
  const voice = voices.find(v => v.voiceURI === $('voice').value);
  if(voice) utterance.voice = voice;
  speechSynthesis.speak(utterance);
}
function stopSpeech() { if('speechSynthesis' in window) speechSynthesis.cancel(); }
function maskedSentence(w) { return w.sentence.replace(new RegExp(`\\b${w.word}\\b`, 'gi'), '_____'); }
function round(custom) {
  stopSpeech();
  queue = custom || (mode === 'study' ? selected() : shuffle(selected()));
  if(mode === 'challenge') queue = queue.slice(0,Number($('length').value));
  index=0; score=0; missed=[];
  document.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed',String(b.dataset.mode === mode)));
  render();
}
function render() {
  const explore = mode === 'explore';
  $('play-panel').hidden = explore;
  $('explore-panel').hidden = !explore;
  if (explore) return;
  answered=false; revealed=false;
  const w = current(), study = mode === 'study';
  $('mode-label').textContent = {study:'STUDY GARDEN',practice:'LISTEN & SPELL',challenge:'BEE CHALLENGE',review:'ANOTHER CHANCE TO BLOOM'}[mode];
  $('feedback').textContent=''; $('answer').value=''; $('answer').disabled=false; $('check').disabled=false;
  $('retry').hidden=true;
  for(const id of ['part','definition','sentence','listen','hear-sentence','reveal','answer-form','previous','next']) $(id).hidden=!w;
  if(!w) {
    $('activity-title').textContent='Your review garden is clear!';
    $('prompt').textContent='No missed words in this set. Try spelling practice or choose another set.';
    $('position').textContent=''; return;
  }
  $('position').textContent=`${index+1} / ${queue.length}${mode === 'challenge' ? ` · ${score} correct` : ''}`;
  $('activity-title').textContent=study ? w.word : 'Which word do you hear?';
  $('prompt').textContent=study ? 'Look, listen, and read. Then try spelling it from memory.' : 'Tap Hear word, then type its spelling below.';
  $('part').textContent=w.part;
  $('definition').textContent=w.definition;
  $('sentence').textContent=study ? w.sentence : maskedSentence(w);
  $('reveal').hidden=study;
  $('answer-form').hidden=study;
  $('previous').hidden=!study;
  $('previous').disabled=index===0;
  $('next').disabled=study ? index===queue.length-1 : false;
  $('next').textContent=study ? 'Next word' : 'Skip word';
}
function record(correct) {
  const w=current(), old=history[w.word] || {};
  history[w.word]={correct:(Number(old.correct)||0)+(correct?1:0),missed:!correct};
  if(!correct) missed.push(w);
  save();
}
function finishAnswer(correct, message) {
  answered=true; record(correct); if(correct) score++;
  $('answer').disabled=true; $('check').disabled=true;
  $('activity-title').textContent=current().word;
  $('sentence').textContent=current().sentence;
  $('feedback').textContent=message;
  $('next').textContent=index === queue.length-1 ? 'See results' : 'Next word';
}
$('answer-form').addEventListener('submit', event => {
  event.preventDefault(); if(answered || !current()) return;
  if(!$('answer').value.trim()) { $('feedback').textContent='Type your spelling first, or use Skip word.'; return; }
  const correct=normalize($('answer').value) === normalize(current().word);
  finishAnswer(correct && !revealed, correct ? 'Lovely spelling! You got it.' : `Keep growing! The spelling is ${current().word}. Read it, then try it again in review.`);
});
$('reveal').onclick=()=> {
  if(answered || !current()) return;
  revealed=true;
  finishAnswer(false, `The spelling is ${current().word}. This word is saved for another try.`);
};
$('next').onclick=()=> {
  if(mode==='study') { if(index<queue.length-1) {index++;stopSpeech();render();} return; }
  if(!answered) {finishAnswer(false, `Skipped: ${current().word}. Saved for review.`); return;}
  stopSpeech();
  if(index<queue.length-1) {index++;render();$('answer').focus();return;}
  $('activity-title').textContent='Your round is complete!';
  $('prompt').textContent=`You spelled ${score} of ${queue.length} words correctly. ${missed.length ? 'Every mistake is a word to grow with.' : 'Wonderful work in the word garden!'}`;
  $('position').textContent=`${queue.length} / ${queue.length}`;
  for(const id of ['part','definition','sentence','listen','hear-sentence','reveal','answer-form','next','previous']) $(id).hidden=true;
  $('feedback').textContent=missed.length ? `Words to revisit: ${missed.map(w=>w.word).join(', ')}.` : 'Try another set or start a fresh round.';
  $('retry').hidden=!missed.length;
};
$('previous').onclick=()=>{if(index>0){index--;stopSpeech();render();}};
$('retry').onclick=()=>{const retry=[...missed];mode='review';round(shuffle(retry));};
$('listen').onclick=()=>{if(current()) speak(current().word);};
$('hear-sentence').onclick=()=>{if(current()) speak(current().sentence);};
$('restart').onclick=()=>round();
$('group').onchange=()=>round();
$('length').onchange=()=>{if(mode==='challenge')round();};
document.querySelectorAll('[data-mode]').forEach(button=>button.onclick=()=>{mode=button.dataset.mode;round();});
function wordList() {
  const search=$('search').value.trim().toLowerCase();
  $('words').replaceChildren();
  const matches=SPELLING_WORDS.filter(w=>`${w.word} ${w.definition}`.toLowerCase().includes(search));
  if(!matches.length) { $('words').textContent='No matching words. Try another search.';return; }
  for(const w of matches) {
    const card=document.createElement('article');card.className='word';
    const title=document.createElement('h3');title.textContent=`${w.id}. ${w.word}`;
    const part=document.createElement('p');part.textContent=w.part;
    const meaning=document.createElement('p');meaning.textContent=w.definition;
    const sentence=document.createElement('p');sentence.textContent=w.sentence;
    const button=document.createElement('button');button.type='button';button.textContent='Hear '+w.word;button.onclick=()=>speak(w.word);
    card.append(title,part,meaning,sentence,button);$('words').append(card);
  }
}
$('search').oninput=wordList;
function loadVoices() {
  const prior=$('voice').value;
  voices=speechSynthesis.getVoices().filter(v=>/^en(?:-|_)/i.test(v.lang));
  $('voice').replaceChildren(new Option('Device default English',''));
  voices.forEach(v=>$('voice').add(new Option(`${v.name} (${v.lang})`,v.voiceURI)));
  if(voices.some(v=>v.voiceURI===prior)) $('voice').value=prior;
}
if('speechSynthesis' in window) {loadVoices();speechSynthesis.addEventListener('voiceschanged',loadVoices);}
else {
  $('audio-note').textContent='Speech is unavailable in this browser. Ask a grown-up to read from Explore all 50 words, or use Study garden.';
  $('voice').disabled=true;
  for(const id of ['listen','hear-sentence']) $(id).disabled=true;
}
window.addEventListener('pagehide',stopSpeech);
stats();wordList();round();

(() => {
  'use strict';
  const sentences = [
    ['intermission', 'intermission', 'The girl quickly ate her popcorn during the play’s ___ because she could not take it back into the theater.'],
    ['mission', 'mission', 'He needed to complete the ___ before next year.'],
    ['admit', 'admitted', 'We purchased our tickets early so we could be ___ into the haunted house before anyone else.'],
    ['remit', 'remit', 'Before you ___ money to an online seller, make sure you have copies of everything you send.'],
    ['dismiss', 'dismissed', 'On Tuesdays and Thursdays we are ___ early.'],
    ['missile', 'missile', 'The purpose of the video game was to stop the ___ from hitting the Earth.'],
    ['omit', 'omitted', 'Our teacher ___ the last page of the test because we didn’t have enough time to finish.'],
    ['submit', 'submit', 'At home, you should ___ to your parents’ rules and expectations.'],
    ['transmit', 'transmit', 'A fast way to ___ important information to many people is by sending an email.'],
    ['emit', 'emitted', 'The rotten piece of fruit ___ a strange smell throughout the kitchen.']
  ];
  sentences.push(
    ['respect', 'respect', 'Students should always ___ their parents and teachers.'],
    ['spectator', 'spectator', 'It was my first time being a ___ at a college football game.'],
    ['perspective', 'perspectives', 'Listen to other people’s ___ before you make a decision.'],
    ['inspect', 'inspect', 'Before entering the theme park, they must ___ your bags.'],
    ['spectacles', 'spectacles', 'His grandpa used his ___ to read the newspaper to his grandchildren.'],
    ['retrospective', 'retrospect', 'In ___, I should have started my SURF project earlier.'],
    ['circumspect', 'circumspect', 'It is important that jurors remain ___ during all trials.'],
    ['spectacle', 'spectacle', 'The show was a great ___ so it received many positive reviews.'],
    ['speculate', 'speculate', 'Without any evidence or leads, the detectives can only ___ about what occurred.'],
    ['introspection', 'introspection', 'Maybe you will find some quiet ___ extremely valuable at this time.']
  );
  const worksheets = window.WordQuestWorksheets;
  sentences.push(...worksheets.sentences);
  const specLayout = [
    ['spectacle', 1, 0, 3, 'Down'], ['speculate', 2, 1, 2, 'Across'],
    ['retrospective', 3, 3, 8, 'Down'], ['introspection', 4, 4, 1, 'Across'],
    ['spectator', 5, 6, 0, 'Across'], ['inspect', 6, 7, 16, 'Down'],
    ['spectacles', 7, 9, 7, 'Across'], ['respect', 8, 10, 0, 'Down'],
    ['perspective', 9, 13, 0, 'Across'], ['circumspect', 10, 15, 0, 'Across']
  ];
  const layout = [
    ['missile', 1, 0, 0, 'Down'], ['remit', 2, 0, 2, 'Down'],
    ['transmit', 3, 0, 8, 'Down'], ['submit', 4, 1, 5, 'Down'],
    ['admit', 5, 2, 8, 'Across'], ['intermission', 6, 4, 0, 'Across'],
    ['emit', 7, 4, 3, 'Down'], ['dismiss', 8, 6, 7, 'Across'],
    ['mission', 9, 6, 10, 'Down'], ['omit', 10, 10, 8, 'Across']
  ];
  const style = document.createElement('style');
  style.textContent = `
    #practiceScreen {padding:24px;color:#334155} .practice-toolbar {display:flex;gap:10px;flex-wrap:wrap;margin:16px 0}
    #practiceScreen button {padding:9px 14px;border:2px solid #99d9ca;border-radius:12px;background:#e9fbf4;color:#115e59;font-weight:bold}
    #practiceScreen button:focus-visible, #practiceScreen input:focus-visible {outline:3px solid #0d9488;outline-offset:2px}
    .sentence-row {padding:16px 0;border-bottom:1px solid #e2e8f0;line-height:2.2}
    .sentence-row input {width:170px;max-width:100%;border:2px solid #94a3b8;border-radius:8px;padding:0 8px;font:inherit}
    .sentence-feedback {font-size:14px;line-height:1.5} .practice-good {background:#d1fae5!important;border-color:#059669!important}
    .practice-wrong {background:#fff1f2!important;border-color:#e11d48!important}
    .cross-scroll {overflow:auto;padding:5px;margin:16px 0} .cross-grid {display:grid;gap:2px;width:max-content;background:#cbd5e1;border:3px solid #cbd5e1}
    .cross-cell {position:relative;width:32px;height:36px;background:white} .cross-cell input {width:100%;height:100%;padding:8px 0 0;text-align:center;font:700 19px sans-serif;text-transform:uppercase;border:0;border-radius:0;color:#134e4a}
    .cross-cell small {position:absolute;left:2px;top:0;font:10px sans-serif;pointer-events:none;color:#334155}
    .cross-empty {background:#475569} .cross-clues {display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:20px}
    .cross-clues h3 {font-size:20px;font-weight:bold} .cross-clues button {display:block;text-align:left;width:100%;margin:7px 0;font-size:14px}
    .practice-bank {background:#fffbeb;padding:12px;border-radius:12px;margin-top:12px} #practiceStatus {margin:12px 0;font-weight:bold}
  `;
  document.head.appendChild(style);
  const panel = document.createElement('section');
  panel.id = 'practiceScreen'; panel.className = 'wood-card rounded-3xl'; panel.hidden = true;
  document.getElementById('rootStudyPanel').after(panel);
  panel.setAttribute('role','tabpanel');
  let rows = [], active = null, completed = false, currentWords = [], currentMode;
  const make = (tag, text, cls) => { const e = document.createElement(tag); if(text) e.textContent = text; if(cls) e.className = cls; return e; };
  function button(text, fn, parent) { const b = make('button',text); b.type='button'; b.onclick=fn; parent.appendChild(b);return b; }
  function status(text) { document.getElementById('practiceStatus').textContent=text; }
  function finish(correct, total) {
    status(correct===total ? `🎉 All ${total} correct! Great work!` : `${correct} of ${total} correct. Check the highlighted answers and try again.`);
    if(correct===total && !completed) {
      completed=true;
      fetch('/api/analytics/event',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({gameId:'root-word-quest',action:currentMode+'_complete'})}).catch(()=>{});
    }
  }
  function start(mode, words, chosen) {
    panel.setAttribute('aria-labelledby',mode==='worksheet'?'tabWorksheet':mode==='review'?'tabReview':'tabRootStudy');
    currentMode=mode; currentWords=words; completed=false; active=null; rows=[];panel.replaceChildren();panel.hidden=false;
    button('← Root Study',()=>{document.getElementById('tabRootStudy').click();},panel);
    panel.appendChild(make('h2',mode==='sentences'?'✏️ Complete the Sentences':mode==='review'?'📖 Review Test':mode==='worksheet'?'📝 Worksheet Quiz':'🧩 Crossword','text-2xl font-black mt-4'));
    const msg=make('p');msg.id='practiceStatus';msg.setAttribute('role','status');panel.appendChild(msg);
    const available=new Map(words.map(w=>[w.word.toLowerCase().replace(/\s*\([^)]*\)\s*$/, '').trim(),w]));
    if(mode==='sentences') renderSentences(available); else if(mode==='worksheet'||mode==='review') renderWorksheet(available, chosen); else renderCrossword(available, chosen);
  }
  function renderSentences(available) {
    const selected=sentences.filter(s=>available.has(s[0]));
    if(!selected.length) {status('There is no sentence worksheet for this root yet. Choose a root with sentence exercises, or All Roots Mixed.');return;}
    panel.appendChild(make('p','Fill each blank. Change the word ending when the sentence needs it. These sentences come from your word study worksheets.'));
    const bank=make('div',[...new Set(selected.map(s=>s[0]))].sort().join(' · '),'practice-bank');bank.hidden=true;
    button('Show / hide word bank',()=>{bank.hidden=!bank.hidden;},panel);panel.appendChild(bank);
    let page=0;
    const sentenceNodes=[];
    const navigation=make('div',null,'practice-toolbar');panel.appendChild(navigation);
    const previous=button('← Previous',()=>{page--;showPage();},navigation);
    const pageLabel=make('span');pageLabel.setAttribute('aria-live','polite');navigation.appendChild(pageLabel);
    const next=button('Next →',()=>{page++;showPage();},navigation);
    button('🎲 Random order',()=>{for(let i=sentenceNodes.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[sentenceNodes[i],sentenceNodes[j]]=[sentenceNodes[j],sentenceNodes[i]];}sentenceNodes.forEach(n=>questionList.appendChild(n));page=0;showPage();},navigation);
    const questionList=make('div');panel.appendChild(questionList);
    function showPage(){sentenceNodes.forEach((n,i)=>{n.hidden=i<page*5||i>=page*5+5;});previous.disabled=page===0;next.disabled=(page+1)*5>=sentenceNodes.length;pageLabel.textContent=`Page ${page+1} / ${Math.ceil(sentenceNodes.length/5)} · ${sentenceNodes.length} questions`;status('');}
    selected.forEach((s,i)=>{
      const row=make('div',null,'sentence-row');
      const parts=s[2].split('___'), answers=Array.isArray(s[1])?s[1]:[s[1]];
      row.appendChild(document.createTextNode(`${i+1}. ${parts[0]}`));
      answers.forEach((answer,j)=>{
        const input=make('input'),feedback=make('p',null,'sentence-feedback');
        input.type='text';input.autocomplete='off';input.spellcheck=false;input.setAttribute('autocapitalize','none');
        input.setAttribute('aria-label',`Sentence ${i+1}, blank ${j+1}: ${s[2]}`);
        row.append(input,document.createTextNode(parts[j+1]||''));
        rows.push({input,answer,feedback,row});
        input.oninput=()=>{input.classList.remove('practice-good','practice-wrong');feedback.textContent='';};
        row.appendChild(feedback);
      });
      button('Hint',()=>{status(`${available.get(s[0]).definition}. Answers start with: ${answers.map(a=>a[0]+' ('+a.length+' letters)').join(', ')}.`);},row);
      questionList.appendChild(row);sentenceNodes.push(row);
    });
    showPage();
    const toolbar=make('div',null,'practice-toolbar');panel.appendChild(toolbar);
    button('Check this page',()=>{let correct=0;const visible=rows.filter(r=>!r.row.hidden);visible.forEach(r=>{const ok=r.input.value.trim().toLowerCase()===r.answer;correct+=Number(ok);r.input.classList.toggle('practice-good',ok);r.input.classList.toggle('practice-wrong',!ok);r.feedback.textContent=ok?'✓ Correct!':'Try again — check the meaning, spelling, and word ending.';});status(`${correct} of ${visible.length} blanks correct on this page.`);if(rows.every(r=>r.input.value.trim().toLowerCase()===r.answer))finish(rows.length,rows.length);},toolbar);
    button('Show page answers',()=>{completed=true;rows.filter(r=>!r.row.hidden).forEach(r=>{r.feedback.textContent='Answer: '+r.answer;});status('Read the answers, then try filling in the blanks yourself.');},toolbar);
    button('Try again',()=>start(currentMode,currentWords),toolbar);
  }
  function renderWorksheet(available, chosen) {
    const banks=currentMode==='review' ? (worksheets.reviews||[]) : worksheets.quizzes;
    const bankMode=currentMode;
    if(!banks.length){status('No photographed quiz for this root yet. Try the regular Quiz or Memory Match mode.');return;}
    const bank=banks.find(b=>b.name===chosen)||banks[0];
    const label=make('label',currentMode==='review'?'Choose a review test: ':'Choose a worksheet quiz: '),select=make('select');
    banks.forEach(b=>{const option=make('option',b.name);option.value=b.name;select.appendChild(option);});
    select.value=bank.name;select.onchange=()=>start(bankMode,currentWords,select.value);label.appendChild(select);panel.appendChild(label);
    panel.appendChild(make('p',currentMode==='review'?'Choose a review test above. Each test covers the roots named in its title.':'Choose an answer or type the missing word.'));
    const items=[];
    bank.questions.forEach((q,i)=>{
      const field=make('fieldset',null,'sentence-row'),legend=make('legend',`${i+1}. ${q.prompt}`),feedback=make('p',null,'sentence-feedback');
      field.appendChild(legend);const inputs=[];
      if(!q.options){
        const input=make('input');input.type='text';input.autocomplete='off';input.spellcheck=false;input.setAttribute('aria-label',q.prompt);field.appendChild(input);inputs.push(input);
        input.oninput=()=>{field.classList.remove('practice-good','practice-wrong');feedback.textContent='';};
      }
      (q.options||[]).forEach((option,j)=>{
        const line=make('label'),input=make('input');input.type='radio';input.name='worksheet-'+i;input.value=j;input.style.width='auto';
        line.style.display='block';line.append(input,document.createTextNode(' '+String.fromCharCode(65+j)+') '+option));field.appendChild(line);inputs.push(input);
        input.onchange=()=>{field.classList.remove('practice-good','practice-wrong');feedback.textContent='';};
      });field.appendChild(feedback);panel.appendChild(field);items.push({q,inputs,field,feedback});
    });
    const toolbar=make('div',null,'practice-toolbar');panel.appendChild(toolbar);
    button('Check answers',()=>{let correct=0;items.forEach(({q,inputs,field,feedback})=>{const ok=q.options?inputs[q.answer].checked:inputs[0].value.trim().toLowerCase()===q.answer;correct+=Number(ok);field.classList.toggle('practice-good',ok);field.classList.toggle('practice-wrong',!ok);feedback.textContent=ok?'✓ Correct!':'Try again — think about the root and the sentence.';});finish(correct,items.length);},toolbar);
    button('Show answers',()=>{completed=true;items.forEach(({q,feedback})=>{feedback.textContent='Answer: '+(q.options?q.options[q.answer]:q.answer);});status('Answers revealed. Try again to practice from memory.');},toolbar);
    button('Try again',()=>start(bankMode,currentWords,bank.name),toolbar);
  }
  function renderCrossword(available, chosen) {
    const puzzles = [{name:'miss, mit (send)', grid:layout}, {name:'spec (see, look)', grid:specLayout}, ...worksheets.puzzles].filter(p=>p.grid.every(w=>available.has(w[0])));
    if(!puzzles.length) {status('Choose a root with a crossword.');return;}
    const puzzle = puzzles.find(p=>p.name===chosen) || puzzles[0];
    if(puzzles.length>1) {
      const label=make('label','Choose a crossword: '), select=make('select');
      puzzles.forEach(p=>{const option=make('option',p.name);option.value=p.name;select.appendChild(option);});
      select.value=puzzle.name;
      select.onchange=()=>start('crossword',currentWords,select.value);
      label.appendChild(select);panel.appendChild(label);
    }
    const puzzleLayout=puzzle.grid;
    panel.appendChild(make('h3',puzzle.name,'font-bold mt-3'));
    const height=Math.max(...puzzleLayout.map(([w,n,r,c,d])=>r+(d==='Down'?w.length:1)));
    const width=Math.max(...puzzleLayout.map(([w,n,r,c,d])=>c+(d==='Across'?w.length:1)));

    panel.appendChild(make('p','Use the definitions to fill the crossword. Tap a clue to select a word. Type to move forward; use arrow keys or Backspace to move between squares.'));
    const cells=new Map(), entries=[];
    puzzleLayout.forEach(([word,number,r,c,direction])=>{
      const entry={word,number,direction,keys:[],letters:word.replaceAll(' ', '')};
      [...word].forEach((letter,i)=>{
        if(letter===' ')return;
        const rr=r+(direction==='Down'?i:0),cc=c+(direction==='Across'?i:0),key=rr+','+cc;
        if(!cells.has(key))cells.set(key,{r:rr,c:cc,letter,entries:[]});
        const cell=cells.get(key);cell.entries.push(entry);if(i===0)cell.number=number;entry.keys.push(key);
      });entries.push(entry);
    });
    const scroll=make('div',null,'cross-scroll'),grid=make('div',null,'cross-grid');grid.style.gridTemplateColumns=`repeat(${width},32px)`;scroll.appendChild(grid);panel.appendChild(scroll);
    function focusEntry(entry) {active=entry;cells.get(entry.keys[0]).input.focus();status(`${entry.number} ${entry.direction}: ${available.get(entry.word).definition}`);}
    for(let r=0;r<height;r++)for(let c=0;c<width;c++){
      const key=r+','+c,cell=cells.get(key),box=make('div',null,'cross-cell'+(cell?'':' cross-empty'));grid.appendChild(box);if(!cell)continue;
      const input=make('input');cell.input=input;input.maxLength=1;input.autocomplete='off';input.spellcheck=false;input.setAttribute('aria-label',`Row ${r+1}, column ${c+1}; ${cell.entries.map(e=>e.number+' '+e.direction).join(', ')}`);box.appendChild(input);
      if(cell.number)box.appendChild(make('small',String(cell.number)));
      input.onfocus=()=>{if(!active||!cell.entries.includes(active))active=cell.entries[0];input.select();};
      input.onclick=()=>{if(cell.entries.length>1){active=cell.entries[(cell.entries.indexOf(active)+1)%cell.entries.length];}status(`${active.number} ${active.direction}: ${available.get(active.word).definition}`);};
      input.oninput=()=>{input.value=input.value.replace(/[^a-z]/gi,'').toUpperCase();input.classList.remove('practice-good','practice-wrong');const i=active.keys.indexOf(key);if(input.value&&i<active.keys.length-1)cells.get(active.keys[i+1]).input.focus();};
      input.onkeydown=e=>{
        const directions={ArrowRight:[0,1],ArrowLeft:[0,-1],ArrowDown:[1,0],ArrowUp:[-1,0]};
        if(directions[e.key]){e.preventDefault();const [dr,dc]=directions[e.key],next=cells.get((r+dr)+','+(c+dc));if(next)next.input.focus();}
        if(e.key==='Backspace'&&!input.value){const i=active.keys.indexOf(key);if(i>0){e.preventDefault();cells.get(active.keys[i-1]).input.focus();}}
      };
    }
    const toolbar=make('div',null,'practice-toolbar');panel.appendChild(toolbar);
    button('Check answers',()=>{cells.forEach(cell=>{const ok=cell.input.value.toLowerCase()===cell.letter;cell.input.classList.toggle('practice-good',ok);cell.input.classList.toggle('practice-wrong',!ok);});const count=entries.filter(e=>e.keys.map(k=>cells.get(k).input.value.toLowerCase()).join('')===e.letters).length;finish(count,entries.length);},toolbar);
    button('Hint: one letter',()=>{const entry=active||entries[0],key=entry.keys.find(k=>cells.get(k).input.value.toLowerCase()!==cells.get(k).letter);if(key){const cell=cells.get(key);cell.input.value=cell.letter.toUpperCase();cell.input.classList.remove('practice-wrong');}status('One letter revealed for '+entry.number+' '+entry.direction+'.');},toolbar);
    button('Show answers',()=>{cells.forEach(c=>{c.input.value=c.letter.toUpperCase();c.input.classList.remove('practice-wrong');});status('Answers revealed. Choose Try again to practice from memory.');completed=true;},toolbar);
    button('Try again',()=>start(currentMode,currentWords,puzzle.name),toolbar);
    const clues=make('div',null,'cross-clues');panel.appendChild(clues);
    ['Across','Down'].forEach(dir=>{const col=make('div');col.appendChild(make('h3',dir));entries.filter(e=>e.direction===dir).sort((a,b)=>a.number-b.number).forEach(e=>button(`${e.number}. ${available.get(e.word).definition}`,()=>focusEntry(e),col));clues.appendChild(col);});
  }
  function hasCrossword(words){const names=new Set(words.map(w=>w.word.toLowerCase().replace(/\s*\([^)]*\)\s*$/, '').trim()));return [layout,specLayout,...worksheets.puzzles.map(p=>p.grid)].some(grid=>grid.every(w=>names.has(w[0])));}
  window.RootWordPractice={start,hasCrossword};
})();



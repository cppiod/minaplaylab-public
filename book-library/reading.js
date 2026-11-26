'use strict';
(() => {
  const entryView=document.body.dataset.readingView||'list';
  let activeBookId=null;
  const state={books:[],records:new Map(),selected:new Set(),query:'',status:'',grade:'',lexile:'',page:1,size:20,sort:'title',direction:1};
  const statuses={not_started:'Not started',reading:'Reading',finished:'Finished'};
  const $=id=>document.getElementById(id);
  const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
  function link(text,url,cls='reading-link'){const a=node('a',text,cls);a.href=url;return a;}
  function button(text,action,cls){const b=node('button',text,cls);b.type='button';b.addEventListener('click',()=>Promise.resolve().then(()=>action(b)).catch(error));return b;}
  function message(text,bad=false){const target=document.querySelector('dialog[open] .modal-notice')||$('notice');target.textContent=text;target.hidden=!text;target.className='notice modal-notice'+(bad?' error':'');}
  function error(err){message(err.message||String(err),true);(document.querySelector('dialog[open] .modal-notice')||$('notice')).scrollIntoView({block:'nearest'});}
  async function busy(b,fn){b.disabled=true;try{return await fn();}finally{b.disabled=false;}}
  async function api(path,options={}){
    const r=await fetch(path,{...options,headers:{'Content-Type':'application/json',...options.headers}});
    let d;try{d=await r.json();}catch{throw new Error('Unable to read the server response. Please retry.');}
    if(!r.ok||d.ok===false)throw new Error(d.error||'Request failed.');return d;
  }
  const personal=b=>state.records.get(b.id);
  const split=s=>s.split(/[,;\n]/).map(t=>t.trim()).filter(Boolean);
  function grades(b){return b.gradeLevel||(b.tags||[]).filter(t=>/^G\d{1,2}$|^adult$/i.test(t)).join(', ');}
  function gradeNumbers(b){return [...grades(b).matchAll(/(?:G(?:rade)?\s*)?(\d{1,2})(?:\s*[-–]\s*(?:G(?:rade)?\s*)?(\d{1,2}))?/gi)].flatMap(m=>{const lo=+m[1],hi=m[2]?+m[2]:lo;return hi>=lo&&hi<=12?Array.from({length:hi-lo+1},(_,i)=>lo+i):[];});}
  function cover(b,large=false){
    if(!/^https?:\/\//i.test(b.thumbnail||'')&&!/^data:image\/(png|jpeg|jpg|gif|webp);base64,/i.test(b.thumbnail||''))return node('span','▤','cover-placeholder');
    const img=node('img');img.src=b.thumbnail;img.alt=b.title+' cover';img.className=large?'detail-cover':'cover';img.loading='lazy';img.addEventListener('error',()=>img.replaceWith(node('span','▤','cover-placeholder')),{once:true});return img;
  }
  function shell(){
    $('app').innerHTML=`<header><a href="../index.html">Mina Play Lab <span class="muted">/ Books</span></a><nav aria-label="Books navigation"><a href="bookLibrary.html">Book Library</a><a href="myReading.html" aria-current="page">My Reading</a></nav></header><main><div id="notice" role="status" aria-live="polite" hidden></div><div id="content"></div></main>`;
  }
  function heading(title,subtitle){const h=node('div',undefined,'heading');const text=node('div');text.append(node('div','Your personal collection','eyebrow'),node('h1',title),node('p',subtitle,'muted'));h.append(text);$('content').append(h);return h;}
  async function load(){const [books,reading]=await Promise.all([api('/api/books'),api('/api/reading')]);state.books=books.books;state.records=new Map(reading.records.map(r=>[r.bookId,r]));}
  const picker={query:'',page:1,size:10,selected:new Set(),saving:false};
  function makeModal(id,title){
    const d=node('dialog');d.id=id;d.className='reading-modal';d.setAttribute('aria-labelledby',id+'Title');
    const top=node('div',undefined,'reading-modal-header'),h=node('h2',title);h.id=id+'Title';
    const close=button('Close ×',()=>d.close(),'quiet');close.setAttribute('aria-label','Close '+title);top.append(h,close);
    const notice=node('div',undefined,'notice modal-notice');notice.hidden=true;notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
    d.append(top,notice);document.body.append(d);return d;
  }
  function showModal(d){const notice=d.querySelector('.modal-notice');notice.hidden=true;notice.textContent='';if(!d.open)d.showModal();}
  function ask(title,text){
    const d=$('readingConfirm');$('readingConfirmTitle').textContent=title;$('confirmText').textContent=text;d.returnValue='cancel';
    return new Promise(resolve=>{d.addEventListener('close',()=>resolve(d.returnValue==='confirm'),{once:true});showModal(d);});
  }
  function buildModals(){
    const add=makeModal('addReadingDialog','Add reading');add.classList.add('reading-picker');
    add.append(node('p','Search the library and select the books you want to add to My Reading.','muted'));
    const form=node('form');form.autocomplete='off';form.setAttribute('role','search');form.addEventListener('submit',e=>e.preventDefault());
    const label=node('label','Search books');const input=node('input');input.id='addBookSearch';input.type='search';input.name='add-reading-book-search';input.autocomplete='off';input.setAttribute('data-lpignore','true');input.setAttribute('data-1p-ignore','true');input.placeholder='Book name, author, genre, or tags…';
    input.addEventListener('input',()=>{picker.query=input.value.trim().toLowerCase();picker.page=1;renderPicker();});label.append(input);form.append(label);add.append(form);
    const selected=node('div');selected.id='pickerSelected';selected.className='reading-selected';add.append(selected);
    const wrap=node('div',undefined,'table-wrap');wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label','Book search results');
    wrap.innerHTML='<table><caption>Select one or more books. Existing readings are marked Already added.</caption><thead><tr><th scope="col">Select</th><th scope="col">Cover</th><th scope="col">Book name</th><th scope="col">Author</th><th scope="col">Genre</th><th scope="col">Grade level</th><th scope="col">My Reading</th></tr></thead><tbody id="pickerRows"></tbody></table>';add.append(wrap);
    const pages=node('div',undefined,'pagination');const count=node('span');count.id='pickerCount';const paging=node('div',undefined,'actions');const prev=button('Previous',()=>{picker.page--;renderPicker();});prev.id='pickerPrev';const next=button('Next',()=>{picker.page++;renderPicker();});next.id='pickerNext';paging.append(prev,next);pages.append(count,paging);add.append(pages);
    const footer=node('div',undefined,'reading-modal-footer');const total=node('span');total.id='pickerSelectionCount';const create=button('Add selected books',createSelected,'primary');create.id='pickerAdd';footer.append(total,create);add.append(footer);
    add.addEventListener('cancel',event=>{if(picker.saving)event.preventDefault();});
    const reading=makeModal('readingDialog','My reading');const body=node('div');body.id='journalBody';reading.append(body);reading.addEventListener('close',()=>{activeBookId=null;});
    const confirmDialog=makeModal('readingConfirm','Delete reading');confirmDialog.append(Object.assign(node('p'),{id:'confirmText'}));
    const buttons=node('div',undefined,'form-actions');buttons.append(button('Cancel',()=>confirmDialog.close('cancel')),button('Delete',()=>confirmDialog.close('confirm'),'danger'));confirmDialog.append(buttons);
  }
  function openAddModal(id){
    picker.query='';picker.page=1;picker.selected.clear();if(id&&!state.records.has(id))picker.selected.add(id);
    $('addBookSearch').value='';renderPicker();showModal($('addReadingDialog'));$('addBookSearch').focus();
  }
  function renderPicker(){
    const books=state.books.filter(b=>!picker.query||[b.title,b.author,b.category,grades(b),...(b.tags||[])].join(' ').toLowerCase().includes(picker.query)).sort((a,b)=>a.title.localeCompare(b.title,undefined,{numeric:true}));
    const pages=Math.max(1,Math.ceil(books.length/picker.size));picker.page=Math.max(1,Math.min(picker.page,pages));const start=(picker.page-1)*picker.size;$('pickerRows').replaceChildren();
    if(!books.length){const row=node('tr'),td=node('td','No books found. Try another title or author.','empty');td.colSpan=7;row.append(td);$('pickerRows').append(row);}
    books.slice(start,start+picker.size).forEach(b=>{const row=node('tr');const cell=value=>{const td=node('td');td.append(value);row.append(td);};
      const cb=node('input');cb.type='checkbox';cb.className='reading-check';cb.setAttribute('aria-label','Select '+b.title);cb.disabled=state.records.has(b.id)||picker.saving;cb.checked=picker.selected.has(b.id);cb.addEventListener('change',()=>{cb.checked?picker.selected.add(b.id):picker.selected.delete(b.id);renderPickerSelection();});cell(cb);cell(cover(b));cell(node('span',b.title,'book-title'));cell(node('span',b.author||'—'));cell(node('span',b.category||'—'));cell(node('span',grades(b)||'—'));
      cell(state.records.has(b.id)?button('Already added · Open',()=>{if(picker.saving)return;$('addReadingDialog').close();return detailPage(b);},'text-button'):node('span','Not added','muted'));$('pickerRows').append(row);
    });
    $('pickerCount').textContent=books.length?`${start+1}–${Math.min(start+picker.size,books.length)} of ${books.length} books`:'0 books';$('pickerPrev').disabled=picker.page===1;$('pickerNext').disabled=picker.page===pages;renderPickerSelection();
  }
  function renderPickerSelection(){
    $('pickerSelectionCount').textContent=picker.selected.size+' selected';$('pickerAdd').disabled=picker.saving||!picker.selected.size||picker.selected.size>200;
    $('pickerSelected').replaceChildren();state.books.filter(b=>picker.selected.has(b.id)).forEach(b=>{const remove=button(b.title+' ×',()=>{picker.selected.delete(b.id);renderPicker();});remove.disabled=picker.saving;$('pickerSelected').append(remove);});
  }
  async function createSelected(){
    if(picker.saving||!picker.selected.size)return;const ids=[...picker.selected];picker.saving=true;renderPicker();
    const d=$('addReadingDialog');d.querySelector('.reading-modal-header button').disabled=true;
    try{
      const result=await api('/api/reading',{method:'POST',body:JSON.stringify({bookIds:ids})});
      // Refresh only the readings, preserving the list's current search and page.
      const latest=await api('/api/reading');state.records=new Map(latest.records.map(r=>[r.bookId,r]));picker.selected.clear();d.close();renderRows();
      message(`Added ${result.added} reading${result.added===1?'':'s'}. ${result.skipped?result.skipped+' already existed.':''}`);
      if(ids.length===1){const book=state.books.find(b=>b.id===ids[0]);if(book)await detailPage(book,true);}
    }finally{picker.saving=false;d.querySelector('.reading-modal-header button').disabled=false;renderPicker();}
  }
  async function deleteReading(book,b){
    if(!await ask('Delete reading', 'Delete your reading for “'+book.title+'”? This removes your rating, status, personal tags, comments and attachments. The library book and other people’s readings will remain.'))return;
    await busy(b,async()=>{
      await api('/api/reading/'+book.id,{method:'DELETE'});state.records.delete(book.id);
      if($('readingDialog').open&&activeBookId===book.id)$('readingDialog').close();renderRows();message('Reading deleted. The book remains in the library.');
    });
  }
  function searchBox(){
    const form=node('form');form.setAttribute('role','search');form.autocomplete='off';form.addEventListener('submit',e=>e.preventDefault());
    const label=node('label','Search my readings');const input=node('input');input.id='readingSearch';input.type='search';input.name='reading-book-search';input.autocomplete='off';input.setAttribute('data-lpignore','true');input.setAttribute('data-1p-ignore','true');input.placeholder='Book name, author, genre, or tags…';
    input.addEventListener('input',()=>{state.query=input.value.trim().toLowerCase();state.page=1;renderRows();});label.append(input);form.append(label);return form;
  }
  function listPage(){
    $('content').replaceChildren();
    const h=heading('My Reading','Open a book to manage your progress, ratings and multimedia notes in a pop-up.');
    h.append(button('+ Add reading',()=>openAddModal(),'primary'));
    const toolbar=node('div',undefined,'reading-toolbar');toolbar.append(searchBox());
    const filters=[['grade','Grade',[['','All grades'],...Array.from({length:12},(_,i)=>[String(i+1),'Grade '+(i+1)]),['adult','Adult'],['none','Unspecified']]],['lexile','Lexile',[['','All Lexile levels'],...Array.from({length:10},(_,i)=>[String(i*200),`${i*200}–${i*200+199}L`]),['none','No numeric Lexile']]]];
    filters.forEach(([key,title,options])=>{const label=node('label',title),select=node('select');options.forEach(([value,text])=>select.append(new Option(text,value)));select.addEventListener('change',()=>{state[key]=select.value;state.page=1;renderRows();});label.append(select);toolbar.append(label);});
    {const label=node('label','Reading status');const select=node('select');select.id='statusFilter';select.append(new Option('All statuses',''));Object.entries(statuses).forEach(([k,v])=>select.append(new Option(v,k)));select.addEventListener('change',()=>{state.status=select.value;state.page=1;renderRows();});label.append(select);toolbar.append(label);}
    $('content').append(toolbar);
    const wrap=node('div',undefined,'table-wrap');wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label','My readings');
    const table=node('table');const caption=node('caption','Your readings are saved only in this browser.');table.append(caption);
    const columns=[['Cover',null],['Name','title'],['Author','author'],['My status','readingStatus'],['My rating','rating'],['Personal tags',null],['Actions',null]];
    const thead=node('thead'),tr=node('tr');columns.forEach(([label,key])=>{const th=node('th');th.scope='col';if(key){th.dataset.sort=key;th.append(button(label,()=>{state.direction=state.sort===key?-state.direction:1;state.sort=key;state.page=1;renderRows();}),node('span'));}else th.textContent=label;tr.append(th);});thead.append(tr);table.append(thead,Object.assign(node('tbody'),{id:'readingRows'}));wrap.append(table);$('content').append(wrap);
    const pages=node('div',undefined,'pagination');pages.innerHTML='<span id="readingCount"></span><label>Rows per page<select id="readingPageSize"><option>10</option><option selected>20</option><option>50</option><option>100</option></select></label><div class="actions"><button id="previousPage" type="button">Previous</button><span id="pageLabel"></span><button id="nextPage" type="button">Next</button></div>';
    $('content').append(pages);$('readingPageSize').addEventListener('change',()=>{state.size=+$('readingPageSize').value;state.page=1;renderRows();});$('previousPage').onclick=()=>{state.page--;renderRows();};$('nextPage').onclick=()=>{state.page++;renderRows();};renderRows();
  }
  function matches(){return state.books.filter(b=>{
    const r=personal(b);if(!r)return false;
    if(state.status&&r?.readingStatus!==state.status)return false;
    if(state.grade==='adult'&&!/adult/i.test(grades(b)))return false;
    if(state.grade==='none'&&grades(b))return false;
    if(/^\d+$/.test(state.grade)&&!gradeNumbers(b).includes(+state.grade))return false;
    const values=[...(b.readingLevel||'').matchAll(/(\d{2,4})\s*L\b/gi)].map(m=>+m[1]),lexile=values.length?Math.min(...values):null;
    if(state.lexile==='none'&&lexile!==null)return false;
    if(/^\d+$/.test(state.lexile)&&(lexile===null||lexile<+state.lexile||lexile>=+state.lexile+200))return false;
    return !state.query||[b.title,b.author,b.category,grades(b),...(b.tags||[]),...(r?.personalTags||[])].join(' ').toLowerCase().includes(state.query);
  }).sort((a,b)=>{const val=x=>state.sort==='rating'?(personal(x)?.rating||0):state.sort==='readingStatus'?(personal(x)?.readingStatus||'not_started'):x[state.sort]||'';const x=val(a),y=val(b);return (typeof x==='number'?x-y:String(x).localeCompare(String(y),undefined,{numeric:true,sensitivity:'base'}))*state.direction||a.id-b.id;});}
  function renderRows(){
    const list=matches(),pages=Math.max(1,Math.ceil(list.length/state.size));state.page=Math.min(state.page,pages);const start=(state.page-1)*state.size;$('readingRows').replaceChildren();
    if(!list.length){const row=node('tr'),td=node('td',state.query||state.status?'No matches. Try another search or status.':'No readings yet. Choose Add reading to select your first book.','empty');td.colSpan=7;row.append(td);$('readingRows').append(row);}
    list.slice(start,start+state.size).forEach(b=>{
      const row=node('tr');const cell=n=>{const td=node('td');td.append(typeof n==='string'?document.createTextNode(n):n);row.append(td);};const r=personal(b);

        cell(cover(b));cell(button(b.title,()=>detailPage(b),'text-button book-title'));cell(b.author||'—');cell(statuses[r.readingStatus]);cell(r.rating?'★'.repeat(r.rating)+' ('+r.rating+'/5)':'Unrated');cell(r.personalTags.join(', ')||'—');
        const actions=node('div',undefined,'actions');actions.append(button('Open',()=>detailPage(b)),button('Edit',()=>detailPage(b,true)),button('Delete',n=>deleteReading(b,n),'danger'));cell(actions);
      $('readingRows').append(row);
    });
    $('readingCount').textContent=list.length?`${start+1}–${Math.min(start+state.size,list.length)} of ${list.length} readings`:'0 readings';$('pageLabel').textContent=`Page ${state.page} of ${pages}`;$('previousPage').disabled=state.page<=1;$('nextPage').disabled=state.page>=pages;
    document.querySelectorAll('th[data-sort]').forEach(th=>{const active=th.dataset.sort===state.sort;th.setAttribute('aria-sort',active?(state.direction===1?'ascending':'descending'):'none');th.querySelector('span').textContent=active?(state.direction===1?' ↑':' ↓'):' ↕';});
  }
  function fields(r){$('readingStatus').value=r.readingStatus;$('readingRating').value=String(r.rating);$('readingTags').value=r.personalTags.join(', ');}
  function summary(book){const r=personal(book);$('readingSummary').replaceChildren();[['Status',statuses[r.readingStatus]],['Rating',r.rating?r.rating+' / 5':'Unrated'],['Personal tags',r.personalTags.join(', ')||'—']].forEach(([label,value])=>{const d=node('div');d.append(node('dt',label),node('dd',value));$('readingSummary').append(d);});}
  function editReading(book,on){$('readingEditForm').hidden=!on;$('editReadingButton').hidden=on;if(on){fields(personal(book));$('readingStatus').focus();}else $('editReadingButton').focus();}
  async function detailPage(book,editing=false){
    if(!book)return;
    if(!personal(book)){openAddModal(book.id);return;}
    const id=book.id;activeBookId=id;
    $('journalBody').replaceChildren();
    showModal($('readingDialog'));
    const hero=node('div',undefined,'reading-book'),text=node('div');text.append(node('div','My reading journal','eyebrow'),node('h1',book.title),node('p',book.author||'Unknown author','muted'),link('View library book','bookLibrary.html?book='+id,'text-button'));hero.append(cover(book,true),text);$('journalBody').append(hero);
    const card=node('section',undefined,'reading-card');const actions=node('div',undefined,'actions');const edit=button('Edit reading',()=>editReading(book,true));edit.id='editReadingButton';actions.append(edit,button('Delete reading',b=>deleteReading(book,b),'danger'));card.append(actions,Object.assign(node('dl',undefined,'reading-summary'),{id:'readingSummary'}));
    const form=node('form');form.id='readingEditForm';form.autocomplete='off';form.hidden=true;form.innerHTML=`<div class="form-grid"><label>Reading status<select id="readingStatus">${Object.entries(statuses).map(([k,v])=>`<option value="${k}">${v}</option>`).join('')}</select></label><label>My rating<select id="readingRating"><option value="0">Unrated</option>${[1,2,3,4,5].map(n=>`<option value="${n}">${n} / 5</option>`).join('')}</select></label><label class="wide">Personal tags<input id="readingTags" name="personal-reading-tags" autocomplete="off" placeholder="Comma separated"></label></div><div class="form-actions"><button type="submit" class="primary">Save changes</button><button type="button" id="cancelReadingEdit">Cancel</button></div>`;
    form.addEventListener('submit',e=>{e.preventDefault();busy(form.querySelector('[type=submit]'),async()=>{
      const result=await api('/api/reading/'+id,{method:'PUT',body:JSON.stringify({rating:+$('readingRating').value,readingStatus:$('readingStatus').value,personalTags:split($('readingTags').value)})});state.records.set(id,result.record);renderRows();if(activeBookId===id&&$('readingDialog').open){summary(book);editReading(book,false);message('Reading updated.');}
    }).catch(error);});card.append(form);$('journalBody').append(card);$('cancelReadingEdit').onclick=()=>editReading(book,false);summary(book);
    const journal=node('section',undefined,'reading-card reading-comments');journal.append(node('h2','Multimedia comments'));const commentForm=node('form');commentForm.autocomplete='off';commentForm.innerHTML='<label>Comment<textarea id="readingComment" rows="4" maxlength="20000" placeholder="Your thoughts, questions, or reading notes…"></textarea></label><label>Attach image, audio, or video (up to 3 MB)<input id="readingMedia" type="file" accept="image/jpeg,image/png,image/gif,image/webp,audio/mpeg,audio/mp4,audio/wav,audio/ogg,audio/webm,video/mp4,video/webm,video/ogg"></label><button class="primary" type="submit">Add comment</button>';
    commentForm.addEventListener('submit',e=>{e.preventDefault();busy(commentForm.querySelector('button'),async()=>{
      const body=$('readingComment').value,file=$('readingMedia').files[0];let media=null;if(file){if(file.size>3*1024*1024)throw new Error('Choose a file up to 3 MB.');const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(new Error('Unable to read the file.'));r.readAsDataURL(file);});media={type:file.type,name:file.name,data:data.split(',')[1]};}
      await api('/api/reading/'+id+'/comments',{method:'POST',body:JSON.stringify({body,media})});commentForm.reset();await loadComments(id);message('Comment added.');
    }).catch(error);});journal.append(commentForm,Object.assign(node('div'),{id:'readingComments'}));$('journalBody').append(journal);await loadComments(id);
    if(editing&&activeBookId===id&&$('readingDialog').open)editReading(book,true);
  }
  async function loadComments(id){
    const data=await api('/api/reading/'+id+'/comments');if(activeBookId!==id||!$('readingDialog').open)return;$('readingComments').replaceChildren();if(!data.comments.length)$('readingComments').append(node('p','No comments yet. Add a note or attach a media file.','muted'));
    data.comments.forEach(c=>{const article=node('article',undefined,'comment');article.append(node('small',new Date(c.createdAt).toLocaleString()));if(c.body)article.append(node('p',c.body));if(c.mediaUrl){const type=c.mediaType.startsWith('image/')?'img':c.mediaType.startsWith('audio/')?'audio':'video';const m=node(type);m.src=c.mediaUrl;if(type==='img')m.alt=c.filename||'Comment image';else{m.controls=true;m.preload='metadata';}article.append(m,node('p',c.filename,'muted'));}
      article.append(button('Delete comment',async b=>{if(!await ask('Delete comment','Delete this comment and its attachment?'))return;await busy(b,async()=>{await api('/api/reading/'+id+'/comments/'+c.id,{method:'DELETE'});await loadComments(id);});},'quiet danger'));$('readingComments').append(article);
    });
  }
  async function init(){shell();buildModals();await api('/api/auth/me');await load();listPage();
    const params=new URLSearchParams(location.search),id=Number(params.get('book'));
    const book=state.books.find(b=>b.id===id);
    if(entryView==='add'||params.get('add')==='1')openAddModal(book?.id);
    else if(book)await detailPage(book,params.get('edit')==='1');
  }
  init().catch(error);
})();

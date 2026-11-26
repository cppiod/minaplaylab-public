/* GitHub Pages edition: API-shaped operations are handled entirely in IndexedDB.
 * No requests to a family server and no account authentication are involved. */
(()=>{'use strict';
const pageBase=document.baseURI||location.href, pageOrigin=new URL(pageBase).origin;
const nativeFetch=window.fetch.bind(window),seed=window.MINA_PUBLIC_SEED||[];
const fresh=()=>({version:1,next:10000,books:[],records:[],comments:[],roots:structuredClone(seed)});
const dbReady=new Promise((resolve,reject)=>{const r=indexedDB.open('mina-playlab-public-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('data');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status})};
const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
function transact(mutating,fn){return dbReady.then(db=>new Promise((resolve,reject)=>{const tx=db.transaction('data',mutating?'readwrite':'readonly'),store=tx.objectStore('data'),req=store.get('state');let result;req.onsuccess=()=>{try{const state=req.result||fresh();result=fn(state);if(mutating)store.put(state,'state')}catch(e){tx.abort();reject(e)}};tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Browser storage could not be updated.'))}))}
const bookFields=['title','author','year','category','gradeLevel','readingLevel','award','description','thumbnail','coverSearchLink','catalogNotes'];
function book(data){if(!data||typeof data.title!=='string'||!data.title.trim())fail('Enter a book title.');const b={tags:Array.isArray(data.tags)?data.tags.map(String):[]};for(const k of bookFields)b[k]=String(data[k]??'');return b}
const blankRecord=id=>({bookId:id,rating:0,readingStatus:'not_started',personalTags:[]});
function handle(s,p,method,b){
 const now=Date.now(),next=()=>++s.next;
 if(p==='/api/auth/me')return {ok:true,user:{id:'browser',role:'admin',displayName:'Local Player',avatarDataUrl:null}};
 if(p==='/api/auth/logout'||p==='/api/analytics/event')return {ok:true};
 if(p==='/api/books/legacy-export')return {ok:true,records:[]};
 if(p==='/api/books/export')return {format:'mina-book-catalog-v2',books:s.books};
 if(p==='/api/books/import'&&method==='POST'){
  if(!Array.isArray(b.books)||b.books.length>2000)fail('Import up to 2,000 books.');const books=b.books.map(book);let added=0,skipped=0;
  for(const x of books){if(s.books.some(y=>y.title.trim().toLowerCase()===x.title.trim().toLowerCase()&&y.author.trim().toLowerCase()===x.author.trim().toLowerCase()))skipped++;else{s.books.push({...x,id:next(),dateAdded:now});added++}}return {ok:true,added,skipped};
 }
 if(p==='/api/books'){
  if(method==='GET')return {ok:true,books:s.books};if(method==='POST'){const x={...book(b),id:next(),dateAdded:now};s.books.push(x);return {ok:true,book:x}}
 }
 let m=p.match(/^\/api\/books\/(\d+)$/);if(m){const id=+m[1],x=s.books.find(x=>x.id===id);if(!x)fail('Book not found.',404);if(method==='PUT'){Object.assign(x,book({...x,...b}));return {ok:true,book:x}}if(method==='DELETE'){s.books=s.books.filter(x=>x.id!==id);s.records=s.records.filter(x=>x.bookId!==id);s.comments=s.comments.filter(x=>x.bookId!==id);return {ok:true}}}
 if(p==='/api/reading'){
  if(method==='GET')return {ok:true,records:s.records};if(method==='POST'){if(!Array.isArray(b.bookIds)||!b.bookIds.length||b.bookIds.some(id=>!s.books.some(x=>x.id===id)))fail('Select books in your library.');const records=[];for(const id of new Set(b.bookIds))if(!s.records.some(x=>x.bookId===id)){const r=blankRecord(id);s.records.push(r);records.push(r)}return {ok:true,added:records.length,skipped:b.bookIds.length-records.length,records}}
 }
 m=p.match(/^\/api\/reading\/(\d+)(?:\/comments(?:\/(\d+))?)?$/);if(m){const id=+m[1],cid=+m[2];if(!s.books.some(x=>x.id===id))fail('Book not found.',404);const comments=p.includes('/comments');
  if(comments){if(method==='GET')return {ok:true,comments:s.comments.filter(x=>x.bookId===id).toReversed()};if(method==='POST'){if(!s.records.some(x=>x.bookId===id))fail('Add this book to My Reading first.');const text=String(b.body||'').trim();if(!text&&!b.media)fail('Add text or an attachment.');let mediaUrl=null;if(b.media){if(!/^(image\/(jpeg|png|gif|webp)|audio\/(mpeg|mp4|wav|ogg|webm)|video\/(mp4|webm|ogg))$/.test(b.media.type)||typeof b.media.data!=='string'||b.media.data.length>4194304)fail('Choose a supported media file up to 3 MB.');mediaUrl=`data:${b.media.type};base64,${b.media.data}`}const c={id:next(),bookId:id,body:text,mediaType:b.media?.type||'',filename:b.media?.name||'',mediaUrl,createdAt:new Date().toISOString()};s.comments.push(c);return {ok:true,id:c.id}}if(method==='DELETE'){s.comments=s.comments.filter(x=>!(x.bookId===id&&x.id===cid));return {ok:true}}}
  else{let r=s.records.find(x=>x.bookId===id);if(method==='GET'){if(!r)fail('Reading not found.',404);return {ok:true,record:r}}if(method==='PUT'){if(!Number.isInteger(b.rating)||b.rating<0||b.rating>5||!['not_started','reading','finished'].includes(b.readingStatus)||!Array.isArray(b.personalTags))fail('Invalid reading details.');if(!r){r=blankRecord(id);s.records.push(r)}Object.assign(r,{rating:b.rating,readingStatus:b.readingStatus,personalTags:b.personalTags.map(String)});return {ok:true,record:r}}if(method==='DELETE'){s.records=s.records.filter(x=>x.bookId!==id);s.comments=s.comments.filter(x=>x.bookId!==id);return {ok:true}}}
 }
 if(p==='/api/vocab/roots'&&method==='GET')return {ok:true,roots:s.roots.map(({id,name})=>({id,name})),data:Object.fromEntries(s.roots.map(r=>[r.name,r.words]))};
 if(p==='/api/vocab/roots'&&method==='POST'){const name=String(b.name||'').trim();if(!name)fail('Enter a root name.');if(s.roots.some(r=>r.name.toLowerCase()===name.toLowerCase()))fail('Root already exists.');const root={id:next(),name,words:[]};s.roots.push(root);return {ok:true,root}}
 m=p.match(/^\/api\/vocab\/roots\/(\d+)(?:\/words(\/import)?)?$/);if(m){const root=s.roots.find(r=>r.id===+m[1]);if(!root)fail('Root not found.',404);if(p.includes('/words')){if(method==='POST'){const list=m[2]?b.words:[b];if(!Array.isArray(list))fail('Invalid word list.');let imported=0;let word;for(const x of list){if(!x.word?.trim()||!x.definition?.trim())fail('Enter a word and meaning.');if(root.words.some(w=>w.word.toLowerCase()===x.word.toLowerCase()))continue;word={id:next(),word:x.word.trim(),definition:x.definition.trim()};root.words.push(word);imported++}return {ok:true,word,imported}}}else if(method==='PUT'){const name=String(b.name||'').trim();if(!name)fail('Enter a root name.');if(s.roots.some(r=>r.id!==root.id&&r.name.toLowerCase()===name.toLowerCase()))fail('Root already exists.');root.name=name;return {ok:true,root}}else if(method==='DELETE'){s.roots=s.roots.filter(r=>r.id!==root.id);return {ok:true}}}
 m=p.match(/^\/api\/vocab\/words\/(\d+)$/);if(m){const root=s.roots.find(r=>r.words.some(w=>w.id===+m[1]));if(!root)fail('Word not found.',404);if(method==='DELETE'){root.words=root.words.filter(w=>w.id!==+m[1]);return {ok:true}}if(method==='PUT'){if(!b.word?.trim()||!b.definition?.trim())fail('Enter a word and meaning.');const word=root.words.find(w=>w.id===+m[1]);Object.assign(word,{word:b.word.trim(),definition:b.definition.trim()});return {ok:true,word}}}
 fail('This feature is not available in the browser edition.',404);
}
window.fetch=async(input,options={})=>{const url=new URL(typeof input==='string'?input:input.url,pageBase);if(url.origin!==pageOrigin||!url.pathname.startsWith('/api/'))return nativeFetch(input,options);try{const method=(options.method||'GET').toUpperCase(),body=options.body?JSON.parse(options.body):{};return response(await transact(method!=='GET',s=>handle(s,url.pathname,method,body)))}catch(e){return response({ok:false,error:e.message||'Browser storage unavailable.'},e.status||507)}};
window.minaAuth={user:{id:'browser',role:'admin',displayName:'Local Player'},isAdmin:true,logout:()=>{location.href=new URL('../index.html',document.currentScript?.src||location.href).href}};
window.MinaBrowserStore={export:()=>transact(false,s=>structuredClone(s)),import:data=>{if(!data||data.version!==1||!Array.isArray(data.books)||!Array.isArray(data.roots)||!Array.isArray(data.records)||!Array.isArray(data.comments)||!Number.isSafeInteger(data.next))return Promise.reject(new Error('Invalid backup.'));return transact(true,s=>{Object.assign(s,structuredClone(data))})}};
})();

/* GitHub Pages edition: API-shaped operations are handled entirely in IndexedDB.
 * No requests to a family server and no account authentication are involved. */
(()=>{'use strict';
const pageBase=document.baseURI||location.href, pageOrigin=new URL(pageBase).origin;
const nativeFetch=window.fetch.bind(window),seed=window.MINA_PUBLIC_SEED||[];
const fresh=()=>({version:1,next:10000,roots:structuredClone(seed)});
const dbReady=new Promise((resolve,reject)=>{const r=indexedDB.open('mina-playlab-public-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('data');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status})};
const response=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
function transact(mutating,fn){return dbReady.then(db=>new Promise((resolve,reject)=>{const tx=db.transaction('data',mutating?'readwrite':'readonly'),store=tx.objectStore('data'),req=store.get('state');let result;req.onsuccess=()=>{try{const state=req.result||fresh();result=fn(state);if(mutating)store.put(state,'state')}catch(e){tx.abort();reject(e)}};tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Browser storage could not be updated.'))}))}
function handle(s,p,method,b){
 const now=Date.now(),next=()=>++s.next;
 if(p==='/api/auth/me')return {ok:true,user:{id:'browser',role:'admin',displayName:'Local Player',avatarDataUrl:null}};
 if(p==='/api/auth/logout'||p==='/api/analytics/event')return {ok:true};
 let m;
 if(p==='/api/vocab/roots'&&method==='GET')return {ok:true,roots:s.roots.map(({id,name})=>({id,name})),data:Object.fromEntries(s.roots.map(r=>[r.name,r.words]))};
 if(p==='/api/vocab/roots'&&method==='POST'){const name=String(b.name||'').trim();if(!name)fail('Enter a root name.');if(s.roots.some(r=>r.name.toLowerCase()===name.toLowerCase()))fail('Root already exists.');const root={id:next(),name,words:[]};s.roots.push(root);return {ok:true,root}}
 m=p.match(/^\/api\/vocab\/roots\/(\d+)(?:\/words(\/import)?)?$/);if(m){const root=s.roots.find(r=>r.id===+m[1]);if(!root)fail('Root not found.',404);if(p.includes('/words')){if(method==='POST'){const list=m[2]?b.words:[b];if(!Array.isArray(list))fail('Invalid word list.');let imported=0;let word;for(const x of list){if(!x.word?.trim()||!x.definition?.trim())fail('Enter a word and meaning.');if(root.words.some(w=>w.word.toLowerCase()===x.word.toLowerCase()))continue;word={id:next(),word:x.word.trim(),definition:x.definition.trim()};root.words.push(word);imported++}return {ok:true,word,imported}}}else if(method==='PUT'){const name=String(b.name||'').trim();if(!name)fail('Enter a root name.');if(s.roots.some(r=>r.id!==root.id&&r.name.toLowerCase()===name.toLowerCase()))fail('Root already exists.');root.name=name;return {ok:true,root}}else if(method==='DELETE'){s.roots=s.roots.filter(r=>r.id!==root.id);return {ok:true}}}
 m=p.match(/^\/api\/vocab\/words\/(\d+)$/);if(m){const root=s.roots.find(r=>r.words.some(w=>w.id===+m[1]));if(!root)fail('Word not found.',404);if(method==='DELETE'){root.words=root.words.filter(w=>w.id!==+m[1]);return {ok:true}}if(method==='PUT'){if(!b.word?.trim()||!b.definition?.trim())fail('Enter a word and meaning.');const word=root.words.find(w=>w.id===+m[1]);Object.assign(word,{word:b.word.trim(),definition:b.definition.trim()});return {ok:true,word}}}
 fail('This feature is not available in the browser edition.',404);
}
window.fetch=async(input,options={})=>{const url=new URL(typeof input==='string'?input:input.url,pageBase);if(url.origin!==pageOrigin||!url.pathname.startsWith('/api/'))return nativeFetch(input,options);try{const method=(options.method||'GET').toUpperCase(),body=options.body?JSON.parse(options.body):{};return response(await transact(method!=='GET',s=>handle(s,url.pathname,method,body)))}catch(e){return response({ok:false,error:e.message||'Browser storage unavailable.'},e.status||507)}};
window.minaAuth={user:{id:'browser',role:'admin',displayName:'Local Player'},isAdmin:true,logout:()=>{location.href=new URL('../index.html',document.currentScript?.src||location.href).href}};
window.MinaBrowserStore={export:()=>transact(false,s=>({version:s.version,next:s.next,roots:structuredClone(s.roots)})),import:data=>{if(!data||data.version!==1||!Array.isArray(data.roots)||!Number.isSafeInteger(data.next))return Promise.reject(new Error('Invalid backup.'));return transact(true,s=>{s.roots=structuredClone(data.roots);s.next=data.next})}};
})();

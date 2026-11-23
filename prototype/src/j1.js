
/* ---------- v3: данные, очередь плана ---------- */
const clone=o=>JSON.parse(JSON.stringify(o));
const copyItems=items=>clone(items).map(i=>({...i,id:uid()}));
/* в тетради нет времени каждого подхода: для примера раскладываем подходы равномерно внутри упражнения */
function fillTimes(s){s.items.forEach(it=>{if(!it.start||!it.end)return;const n=it.sets.length,span=it.end-it.start;it.sets.forEach((x,k)=>{x.t=it.start+Math.round(span*(k+.85)/n)})})}
function seed3(){
 const d=seed();d.v=3;d.perWeek=3;
 d.sessions.forEach(s=>{fillTimes(s);s.feel={before:0,after:0};
  const f=Math.min(...s.items.map(i=>i.start||Infinity));if(s.warm.start)s.warm.end=Math.min(s.warm.start+12*6e4,f);s.warm.skipped=false});
 d.plans=['p3','p1','p2','p3','p1','p2'].map((pid,i)=>{const p=d.programs.find(x=>x.id===pid);return {id:uid(),ord:i+1,programId:pid,title:p.title,desc:p.desc,warmup:p.warmup,items:copyItems(p.items),upd:d.syncedAt,sessionId:null}});
 const q=d.plans[1],it=q.items.find(i=>i.name==='Жим лёжа');
 it.mode='each';it.each=[{w:'60',r:'5'},{w:'70',r:'5'},{w:'80',r:'5'}];it.note='Лёгкая неделя: болят руки';q.desc='Облегчённая неделя: жим 60/70/80, остальное как обычно.';
 return d;
}
let db;
try{db=JSON.parse(localStorage.getItem(KEY))}catch(e){}
if(!db||db.v!==3)db=seed3();
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(db))}catch(e){}};
const mark=r=>{if(r)r.upd=Date.now()};
let style='notebook';try{style=localStorage.getItem(SKEY)||'notebook'}catch(e){}
const ui={prog:db.programs[0]?.id,hist:null,open:new Set(),notes:new Set(),confirm:null,openItem:null,planEdit:null,finishing:false,series:{progs:live(db.programs).map(p=>p.id),n:6}};
const active=()=>db.sessions.find(s=>s.id===db.activeId&&!s.deleted);
const st=it=>it.end?'done':it.start?'run':'idle';
const exBy=n=>live(db.exercises).find(e=>e.name.trim().toLowerCase()===String(n||'').trim().toLowerCase());
const isBase=n=>!!exBy(n)?.base;
function ensureEx(n){n=String(n||'').trim();if(!n)return null;let e=exBy(n);if(!e){e={id:uid(),name:n,base:false,max:'',upd:Date.now()};db.exercises.push(e);toast(`«${n}» добавлено в справочник`)}return e}
const gymBy=id=>db.gyms.find(g=>g.id===id);
function ensureGym(n){n=String(n||'').trim();if(!n)return null;let g=live(db.gyms).find(x=>x.name.toLowerCase()===n.toLowerCase());if(!g){g={id:uid(),name:n,upd:Date.now()};db.gyms.push(g);toast(`Зал «${n}» сохранён`)}return g}
function toast(t){const el=document.getElementById('toast');el.textContent=t;el.classList.add('on');clearTimeout(toast.h);toast.h=setTimeout(()=>el.classList.remove('on'),2600)}
function confirm2(key,run){if(ui.confirm===key){ui.confirm=null;run()}else{ui.confirm=key;setTimeout(()=>{if(ui.confirm===key){ui.confirm=null;render()}},3500)}render()}
const cf=(key,a,b)=>ui.confirm===key?b:a;
const done=()=>live(db.sessions).filter(s=>s.end);
const queue=()=>live(db.plans).filter(q=>!q.sessionId).sort((a,b)=>a.ord-b.ord);
const progBy=id=>live(db.programs).find(p=>p.id===id);
const norm=items=>JSON.stringify((items||[]).map(({id,...r})=>r));
const modified=q=>{const p=progBy(q.programId);return !!p&&norm(q.items)!==norm(p.items)};

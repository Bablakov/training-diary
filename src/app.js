import { syncData } from "./core/sync";
import { checkAccess } from "./core/github";
import { loadLocal, loadBackup, persist, requestPersist } from "./core/store.js";
const SKEY='trn-style',CFGKEY='trn-sync',STATEKEY='trn-sync-state';
const main=document.getElementById('main');
const uid=()=>Math.random().toString(36).slice(2,9);
const WD=['Воскресенье','Понедельник','Вторник','Среда','Четверг','Пятница','Суббота'];
const WDs=['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
const MON=['января','февраля','марта','апреля','мая','июня','июля','августа','сентября','октября','ноября','декабря'];
const MONs=['янв','фев','мар','апр','мая','июн','июл','авг','сен','окт','ноя','дек'];
const MONN=['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'];
const MOOD=['','Легко','Нормально','Тяжело'];
const STYLES=[['notebook','Тетрадь','Клетка, шариковая ручка, рукописные цифры'],['gym','Зал','Тёмный, Oswald, оранжевый акцент'],['clean','Минимал','Manrope, белый фон, без декора'],['sport','Спорт','Unbounded + Onest, зелёный и лайм']];
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=v=>String(v??'').replace('.',',');
const fw=v=>v===''||v==null?'—':fmt(v);
const num=v=>parseFloat(String(v??'').replace(',','.'));
const first=v=>{const m=String(v??'').match(/\d+(?:[.,]\d+)?/);return m?m[0].replace(',','.'):''};
const r25=v=>Math.round(v/2.5)*2.5;
const at=(d,t)=>{const [h,m]=t.split(':');const x=new Date(d+'T00:00:00');x.setHours(+h,+m);return x.getTime()};
const hm=t=>t?new Date(t).toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'}):'—';
const mins=(a,b)=>Math.max(0,Math.round((b-a)/60000));
const dur=(a,b)=>{const m=mins(a,b);return m>=60?`${Math.floor(m/60)} ч ${m%60} мин`:`${m} мин`};
const dLong=t=>{const d=new Date(t);return `${d.getDate()} ${MON[d.getMonth()]}`};
const dShort=t=>{const d=new Date(t);return `${d.getDate()} ${MONs[d.getMonth()]}`};
const face=m=>`<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="12" r="9.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="9" cy="10" r="1.3" fill="currentColor"/><circle cx="15" cy="10" r="1.3" fill="currentColor"/><path d="${['','M8 14.5q4 3.5 8 0','M8.5 15.5h7','M8 16.8q4-3.5 8 0'][m]}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>`;
const live=a=>a.filter(x=>!x.deleted);

/* ---------- пример данных: записи из тетради ---------- */
const LIB=[['Жим лёжа',1,110],['Становая тяга',1,160],['Присед',1,153],['Жим стоя'],['Жим гантелей на наклонной'],['Жим гантелей сидя'],['Тяга Т-грифа'],['Тяга горизонтального блока'],['Тяга верхнего блока'],['Тяга штанги в наклоне'],['Тяга гантели в наклоне'],['Подтягивания'],['Подтягивания с весом'],['Шраги с гантелями'],['Бабочка'],['Разводки в стороны'],['Махи на передние дельты'],['Подтяжка'],['Подъём штанги на бицепс'],['Молотки'],['Обратный бицепс прямым хватом'],['Трицепс на кроссовере'],['Трицепс из-за головы'],['Экстензия с весом'],['Жим ногами'],['Выпады'],['Прогулка фермера']];
const PI=(name,o={})=>({id:uid(),kind:o.names?'combo':'ex',name,names:o.names||[],mode:o.mode||'same',weight:o.w??'',reps:o.r??'',sets:o.s??4,each:(o.each||[]).map(([w,r])=>({w:String(w),r:String(r)})),pct:o.pct||'65, 75, 85',lastMax:o.lastMax??true,drops:o.drops||'',note:o.n||''});
const S=(w,r,m,n,dr)=>({pw:'',pr:'',pl:'',w:w===''?'':String(w),r:String(r),m,n:n||'',done:true,t:null,drops:(dr||[]).map(([a,b])=>({pw:'',w:a===''?'':String(a),r:String(b)}))});
const same=(w,r,n=4)=>Array.from({length:n},()=>({w:String(w),r:String(r)}));
const list=(...a)=>a.map(([w,r,l])=>({w:String(w),r:String(r),l:l||''}));
function H(date,title,pid,bw,a,b,warm,note,items){
 return {id:uid(),programId:pid,title,gymId:'g1',start:at(date,a),end:at(date,b),bodyWeight:bw,note,upd:at(date,b),
  warm:{n:3,done:warm?3:0,start:warm?at(date,warm):null,end:null},
  items:items.map(([name,plan,s,e,sets,n,names])=>({id:uid(),kind:names?'combo':'ex',name,names:names||[],base:['Жим лёжа','Становая тяга','Присед'].includes(name),plan,pnote:'',note:n||'',start:at(date,s),end:at(date,e),sets:sets.map(x=>S(...x))}))};
}
function seed(){
 const t=Date.now();
 return {v:2,syncedAt:t,activeId:null,lastGym:'g1',
 exercises:LIB.map(([name,base,max])=>({id:uid(),name,base:!!base,max:max?String(max):'',upd:t})),
 gyms:[{id:'g1',name:'Основной зал',upd:t}],
 programs:[
  {id:'p1',title:'Грудь + Спина',desc:'Жим лесенкой 65/75/85% от ПМ, последний на максимум. Дальше спина и грудь, 4 подхода.',warmup:3,upd:t,items:[
   PI('Жим лёжа',{mode:'pct',r:'5'}),PI('Тяга Т-грифа',{w:'30-35',r:'8-12'}),PI('Жим гантелей на наклонной',{w:'25',r:'6-8'}),
   PI('Тяга горизонтального блока',{w:'110',r:'8'}),PI('Бабочка',{w:'65-80',r:'8-12',n:'Лёгкий вес, сжимать в конце'})]},
  {id:'p2',title:'Становая + Спина + Предплечья',desc:'Тяжёлая становая, потом верх спины и хват.',warmup:3,upd:t,items:[
   PI('Становая тяга',{mode:'pct',r:'5'}),PI('Подтягивания с весом',{w:'15',r:'5'}),PI('Экстензия с весом',{w:'30',r:'10',s:3,drops:'15, 0'}),
   PI('Шраги с гантелями',{w:'27.5',r:'8'}),PI('Обратный бицепс прямым хватом',{mode:'each',each:[[10,15],[20,8],[15,10]]}),PI('Прогулка фермера',{w:'15',r:'',s:3})]},
  {id:'p3',title:'Присед + Плечи + Руки',desc:'Присед не обязательно первым: если шея или спина не готовы, сначала жим сидя.',warmup:3,upd:t,items:[
   PI('Жим гантелей сидя',{w:'22.5',r:'8'}),PI('Присед',{mode:'pct',r:'5'}),PI('Молотки',{w:'15',r:'8'}),PI('Трицепс на кроссовере',{w:'65-75',r:'8'}),
   PI('Дроп-сет на плечи',{names:['Махи на передние дельты','Жим стоя','Подтяжка'],w:'12.5',r:'12',s:3})]}],
 sessions:[
  H('2026-10-07','Грудь + Плечи + Руки',null,'78.8','10:24','12:24','10:30','',[
   ['Жим гантелей на наклонной',{sets:same(25,'6-8')},'11:00','11:20',[[20,8,1],[25,8,1],[25,8,1],[25,8,1]]],
   ['Подтягивания',{sets:same('','max')},'11:00','11:22',[['',15,1],['',15,1],['',11,1],['',15,1]]],
   ['Жим гантелей сидя',{sets:same(22.5,'8-10')},'11:25','11:40',[[20,8,1],[22.5,8,1],[22.5,8,1],[22.5,8,1]]],
   ['Шраги с гантелями',{sets:same(25,'8-12')},'11:42','11:55',[[25,8,1],[25,8,1],[27.5,8,1],[27.5,8,1]]],
   ['Трицепс из-за головы',{sets:same('70-80','8-12')},'11:58','12:15',[[80,12,1],[80,12,1],[80,10,1],[80,6,3]]]]),
  H('2026-10-09','Грудь + Спина','p1','79.2','13:16','14:25','13:20','Перед этим монитор 3 т, выспался',[
   ['Жим лёжа',{sets:list([72.5,5,'65%'],[82.5,5,'75%'],[92.5,'max','85%'])},'13:40','13:58',[[72.5,5,1],[82.5,5,1],[95,2,1]]],
   ['Жим гантелей на наклонной',{sets:same(25,8)},'14:00','14:15',[[20,8,1],[25,8,1],[25,7,1],[25,8,1]]]]),
  H('2026-10-12','Становая + Спина + Предплечья','p2','79.8','11:54','13:40','11:59','Палец и мениск, выспался',[
   ['Становая тяга',{sets:list([105,5,'65%'],[120,5,'75%'],[135,'max','85%'],[150,1])},'12:31','13:10',[[105,5,2,'нужно больше усилий назад'],[120,5,1],[135,6,1],[150,1,1]]],
   ['Подтягивания с весом',{sets:same(15,5)},'13:14','13:30',[[15,5,2,'отлично, но тяжело'],[15,5,2],[15,4,1],[15,5,1]]],
   ['Экстензия с весом',{sets:same(30,10,3)},'13:11','13:30',[[30,10,1,'',[[15,10],['',10]]],[30,10,1,'',[[15,10],['',10]]],[30,10,2,'',[[15,10],['',10]]]]],
   ['Прогулка фермера',{sets:same(15,'',3)},'13:36','13:40',[[15,'',1],[15,'',2],[15,'',2]]]]),
  H('2026-10-15','Присед + Плечи + Руки','p3','80','12:38','13:44','12:40','Без приседа: заболела шея',[
   ['Жим гантелей сидя',{sets:same(22.5,8)},'12:55','13:10',[[22.5,8,1],[22.5,8,2],[22.5,8,1],[22.5,8,1]]],
   ['Молотки',{sets:same(15,8)},'13:12','13:28',[[15,8,1],[17.5,8,1],[17.5,8,1],[17.5,8,1]]],
   ['Трицепс на кроссовере',{sets:same('65-75',8)},'13:30','13:38',[[40,12,1],[80,12,2],[80,12,1],[80,12,1]]],
   ['Дроп-сет на плечи',{sets:same(12.5,12,3)},'13:38','13:44',[[12.5,12,1],[12.5,12,2],[12.5,12,2]],'',['Махи на передние дельты','Жим стоя','Подтяжка']]]),
  H('2026-10-21','Грудь + Спина','p1','81.1','12:32','13:47','12:44','',[
   ['Жим лёжа',{sets:list([72.5,5,'65%'],[82.5,5,'75%'],[92.5,'max','85%'])},'13:08','13:14',[[72.5,5,1],[82.5,5,1],[92.5,2,1]]],
   ['Тяга Т-грифа',{sets:same('30-35','8-12')},'13:15','13:26',[[30,12,1],[35,12,3],[35,10,1]]],
   ['Жим гантелей на наклонной',{sets:same(25,'6-8')},'13:27','13:35',[[25,8,2],[25,8,1],[25,6,1],[25,8,1]]],
   ['Тяга горизонтального блока',{sets:same('?',8)},'13:33','13:42',[[80,12,1],[110,10,2],[110,10,1],[110,10,1]]],
   ['Бабочка',{sets:same('?','8-12')},'13:40','13:47',[[65,12,2],[65,10,1],[65,10,1,'плечо правое'],[65,10,1]]]]),
  H('2026-11-05','Грудь + Спина','p1','79.3','11:55','12:59','12:00','',[
   ['Жим лёжа',{sets:list([60,5],[70,5],[80,5])},'12:14','12:38',[[60,5,1,'только руки на турник'],[70,5,1,'болят'],[80,3,2,'нога болит']]],
   ['Тяга Т-грифа',{sets:same('30-35','8-12')},'12:40','12:52',[[30,12,1],[35,12,2],[35,12,1],[35,10,1]]],
   ['Жим гантелей на наклонной',{sets:same(25,'6-8')},'12:41','12:53',[[25,8,1],[25,8,1],[25,8,1],[25,8,1,'техника поплыла']]],
   ['Тяга горизонтального блока',{sets:same(110,8)},'12:47','12:56',[[95,12,1,'110 тяжело, по амплитуде хуже'],[95,12,1],[95,12,1],[95,12,1]]],
   ['Бабочка',{sets:same('65-80','8-12')},'12:53','12:59',[[65,10,1],[65,10,1],[65,10,3],[65,10,1,'нужно сжимать']]]]),
  H('2026-11-07','Становая + Спина + Предплечья','p2','78.6','10:57','12:30','11:05','После монитора 3 т',[
   ['Становая тяга',{sets:list([105,5,'65%'],[120,5,'75%'],[135,'max','85%'])},'11:29','11:52',[[105,5,1],[120,5,1,'нужно делать как в 8: назад'],[135,4,1,'не тяну назад, сразу не идёт']]],
   ['Подтягивания с весом',{sets:same(15,5)},'11:55','12:10',[[15,5,1],[15,5,1],[15,5,1],[15,5,1]],'С лямками делал'],
   ['Шраги с гантелями',{sets:same(27.5,8)},'12:07','12:22',[[25,8,1],[27.5,8,1],[27.5,8,1],[27.5,8,1]]],
   ['Обратный бицепс прямым хватом',{sets:list([10,15],[20,8],[15,10])},'12:08','12:24',[[10,15,1],[20,8,2],[15,10,1]]],
   ['Прогулка фермера',{sets:same(15,'',3)},'12:24','12:30',[[15,'',1],[15,'',1],[15,'',1]]]])
 ]};
}

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
/* Чистый старт: справочник упражнений и три программы из тетради, без тренировок и плана.
   id постоянные, upd = 0: на новом устройстве первая синхронизация примет данные с GitHub, а не затрёт их. */
function freshDb(){const d=seed();return {v:3,perWeek:3,activeId:null,lastGym:null,syncedAt:0,
 exercises:d.exercises.map((e,i)=>({...e,id:'lib-'+i,upd:0})),gyms:[],
 programs:d.programs.map(p=>({...p,upd:0,items:p.items.map((it,k)=>({...it,id:p.id+'-i'+k}))})),plans:[],sessions:[]}}
const stored=loadLocal();
let db=stored||freshDb();
const save=()=>{persist(db);scheduleSync()};
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
function lastTime(name,except){
 const n=name.trim().toLowerCase();
 for(const s of done().filter(s=>s.id!==except).sort((a,b)=>b.start-a.start)){
  const it=s.items.find(i=>i.name.trim().toLowerCase()===n&&i.sets.some(x=>x.done));
  if(it)return {date:s.start,sets:it.sets.filter(x=>x.done)};
 }
 return null;
}
function est1rm(name){
 let best=0;const n=name.trim().toLowerCase();
 done().forEach(s=>s.items.forEach(i=>{if(i.name.trim().toLowerCase()!==n)return;i.sets.forEach(x=>{const w=num(x.w),r=num(x.r);if(x.done&&w>0&&r>0&&r<=12)best=Math.max(best,w*(1+r/30))})}));
 return best?r25(best):0;
}
/* план упражнения → список подходов {w,r,l,d} */
function planSets(it){
 const drops=String(it.drops||'').split(/[,;→>]+/).map(s=>s.trim()).filter(Boolean).map(s=>({pw:first(s)==='0'?'':first(s)}));
 let out;
 if(it.kind==='combo'||it.mode==='same')out=Array.from({length:Math.max(1,+it.sets||1)},()=>({w:it.weight,r:it.reps}));
 else if(it.mode==='each')out=it.each.map(x=>({w:x.w,r:x.r}));
 else{const mx=num(exBy(it.name)?.max),ps=String(it.pct||'').split(/[^\d.]+/).filter(Boolean).map(Number);
  out=ps.map((p,i)=>({w:mx?String(r25(mx*p/100)):'',r:(i===ps.length-1&&it.lastMax)?'max':(it.reps||'5'),l:p+'%'}));}
 if(it.kind!=='combo'&&drops.length)out.forEach(x=>x.d=drops);
 return out;
}
function planLine(sets){
 sets=sets||[];if(!sets.length)return '';
 const uni=sets.every(x=>x.w===sets[0].w&&x.r===sets[0].r&&!x.l);
 const one=x=>`${x.l?`<span class="pl">${esc(x.l)}</span>`:''}<span class="ring">${esc(fw(x.w==='?'?'':x.w)).replace('—','?')}</span>${x.r?`<span class="rp">${esc(x.r)}</span>`:''}`;
 return uni?one(sets[0]):sets.map(one).join('');
}
const setTxt=(x,k)=>`<span class="hset">${k+1}. ${fw(x.w)}–${x.r||'—'}${(x.drops||[]).map(d=>` → ${fw(d.w)}–${d.r||'—'}`).join('')}${x.m?` <i class="mf m${x.m}">${face(x.m)}</i>`:''}</span>${x.n?` <em>(${esc(x.n)})</em>`:''}`;
/* ---------- подсказки по весу на основе прошлой тренировки ---------- */
const topOf=r=>{const n=String(r||'').match(/\d+/g);return n?+n[n.length-1]:0};
const lowOf=r=>{const n=String(r||'').match(/\d+/g);return n?+n[0]:0};
function suggest(name,reps){
 const L=lastTime(name);if(!L)return null;
 const ws=L.sets.filter(x=>num(x.w)>0);if(!ws.length)return null;
 const w=Math.max(...ws.map(x=>num(x.w))),work=ws.filter(x=>num(x.w)===w);
 const top=topOf(reps),low=lowOf(reps),hard=work.filter(x=>x.m===3).length,easy=work.every(x=>x.m===1);
 const hitTop=top?work.every(x=>num(x.r)>=top):true,miss=low?work.filter(x=>num(x.r)&&num(x.r)<low).length:0,step=w>=80?5:2.5;
 const lt=`${dShort(L.date)}: ${work.length}×${fmt(w)} кг`;
 if(easy&&hitTop)return {w:w+step,dir:1,why:`${lt}, всё легко${top?`, все по ${top}`:''} → +${fmt(step)} кг`};
 if(hard>=2||miss>=2)return {w:Math.max(0,w-step),dir:-1,why:`${lt}, ${hard>=2?'было тяжело':'повторы не добраны'} → −${fmt(step)} кг`};
 return {w,dir:0,why:`${lt}, ${hard||miss?'были тяжёлые подходы':'нормально'} → оставить${top&&!hitTop?`, добирай до ${top}`:''}`};
}
function lastEst(name){const L=lastTime(name);if(!L)return 0;let b=0;L.sets.forEach(x=>{const w=num(x.w),r=num(x.r);if(w>0&&r>0&&r<=10)b=Math.max(b,w*(1+r/30))});return b?r25(b):0}
/* подсказка для пункта программы: {text, apply()} или null, если менять нечего */
function itemSugg(it){
 if(it.kind!=='ex'||!it.name)return null;
 if(it.mode==='pct'){const ex=exBy(it.name),e=lastEst(it.name),mx=num(ex?.max);
  if(e&&(!mx||e>=mx+2.5))return {short:`ПМ ${fmt(e)}`,text:`По прошлой тренировке ПМ ≈ ${fmt(e)} кг (сейчас ${mx?fmt(mx):'не указан'})`,apply:()=>{ex.max=String(e);mark(ex)}};return null}
 const reps=it.mode==='each'?(it.each[0]?.r||''):it.reps,s=suggest(it.name,reps);if(!s)return null;
 const cur=it.mode==='each'?Math.max(0,...it.each.map(x=>num(x.w)||0)):num(first(it.weight));
 if(cur===s.w)return null;
 return {short:`${s.w>cur?'↑':'↓'} ${fmt(s.w)}`,text:`${fmt(s.w)} кг: ${s.why}`,apply:()=>{if(it.mode==='each'){const d=s.w-cur;it.each.forEach(x=>x.w=String(Math.max(0,(num(x.w)||0)+d)))}else it.weight=String(s.w)}};
}
const suggCount=t=>t.items.filter(itemSugg).length;

function mkItem(pi){
 const name=pi.kind==='combo'?(pi.name||pi.names.join(' + ')):pi.name;
 const last=lastTime(name),plan=planSets(pi);
 const sets=plan.map((p,k)=>{const pw=(!p.w||p.w==='?'||/[-–]/.test(p.w))?(last?.sets[k]?.w||first(p.w)):first(p.w),pr=p.r,pv=last?.sets[k];
  return {pw,pr,pl:p.l||'',w:pw,r:/^\d+$/.test(pr)?pr:'',m:0,n:'',done:false,t:null,prev:pv?{w:pv.w,r:pv.r,m:pv.m}:null,drops:(p.d||[]).map(d=>({pw:d.pw,w:d.pw,r:''}))}});
 return {id:uid(),kind:pi.kind||'ex',name,names:[...(pi.names||[])],base:pi.kind!=='combo'&&isBase(name),plan:{sets:plan,reps:pi.reps||'',mode:pi.mode},pnote:pi.note||'',note:'',start:null,end:null,sets};
}
function summaryText(it){
 const dr=it.kind==='ex'&&it.drops?` · дроп ${esc(it.drops)}`:'';
 if(it.kind==='combo')return `${esc(it.names.filter(Boolean).join(' → ')||'упражнения не выбраны')} · <b>${it.sets}×${fw(it.weight)} кг×${esc(it.reps||'—')}</b>`;
 if(it.mode==='pct'){const mx=exBy(it.name)?.max;return `ПМ ${mx?fmt(mx)+' кг':'не указан'} → <b>${planSets(it).map(x=>`${fw(x.w)}×${esc(x.r)}`).join(' · ')}</b>${dr}`}
 if(it.mode==='each')return `<b>${it.each.map(x=>`${fw(x.w)}×${esc(x.r||'—')}`).join(' · ')||'подходы не заданы'}</b>${dr}`;
 return `<b>${it.sets} × ${fw(it.weight==='?'?'':it.weight)} кг × ${esc(it.reps||'—')}</b>${dr}`;
}

/* ---------- выпадающие списки и подбор упражнения ---------- */
const pop=document.getElementById('pop');let popCtx=null;
const opt=(v,l,d,badge,cls)=>`<button type="button" class="opt ${cls||''}" data-v="${esc(v)}"><b>${esc(l)}</b>${badge?`<em>${esc(badge)}</em>`:''}${d?`<small>${esc(d)}</small>`:''}</button>`;
function place(){if(!popCtx)return;if(!document.body.contains(popCtx.anchor)){closePop();return}
 const a=popCtx.anchor.getBoundingClientRect(),w=Math.max(a.width,260);pop.style.width=w+'px';pop.style.left=Math.max(8,Math.min(a.left,innerWidth-w-8))+'px';
 const h=pop.offsetHeight,below=a.bottom+6;pop.style.top=(below+h>innerHeight-8&&a.top-h-6>8?a.top-h-6:below)+'px'}
function openPop(anchor,html,ctx){popCtx={anchor,...ctx};pop.innerHTML=html;pop.className='pop on'+(ctx.sheet?' sheet':'');place();pop.querySelector('.sel')?.scrollIntoView({block:'nearest'})}
function closePop(){popCtx=null;pop.className='pop';pop.innerHTML=''}
pop.addEventListener('mousedown',e=>e.preventDefault());
pop.addEventListener('click',e=>{const o=e.target.closest('.opt');if(o&&popCtx)popCtx.pick(o.dataset.v)});
document.addEventListener('pointerdown',e=>{if(popCtx&&!pop.contains(e.target)&&!popCtx.anchor.contains(e.target))closePop()});
addEventListener('scroll',e=>{if(popCtx&&!pop.contains(e.target))place()},true);
addEventListener('resize',place);
document.addEventListener('keydown',e=>{if(!popCtx)return;const os=[...pop.querySelectorAll('.opt')];let i=os.findIndex(o=>o.classList.contains('act'));
 if(e.key==='Escape'){closePop();return}
 if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();os[i]?.classList.remove('act');i=e.key==='ArrowDown'?Math.min(os.length-1,i+1):Math.max(0,i-1);os[i]?.classList.add('act');os[i]?.scrollIntoView({block:'nearest'})}
 if(e.key==='Enter'&&i>=0){e.preventDefault();popCtx.pick(os[i].dataset.v)}});
function lastInfo(n){const L=lastTime(n);return L?`прошлый раз ${dShort(L.date)}: ${L.sets.slice(0,4).map(x=>`${fw(x.w)}×${x.r||'—'}`).join(', ')}`:''}
function openCombo(inp){
 const kind=inp.dataset.combo,val=inp.value.trim(),q=inp.dataset.typed?val.toLowerCase():'';let html='';
 if(kind==='ex'){
  const all=live(db.exercises).filter(e=>!q||e.name.toLowerCase().includes(q)),exact=!!exBy(val);
  if(val&&!exact)html+=opt(val,`+ Новое упражнение «${val}»`,'Сохранится в справочник','','new');
  const b=all.filter(e=>e.base),o=all.filter(e=>!e.base).sort((x,y)=>x.name.localeCompare(y.name,'ru'));
  if(b.length)html+='<div class="popgrp">Базовые</div>'+b.map(e=>opt(e.name,e.name,e.max?`ПМ ${fmt(e.max)} кг`:'','база',e.name===val?'sel':'')).join('');
  if(o.length)html+='<div class="popgrp">Все упражнения</div>'+o.map(e=>opt(e.name,e.name,lastInfo(e.name),'',e.name===val?'sel':'')).join('');
 }else{
  const all=live(db.gyms).filter(g=>!q||g.name.toLowerCase().includes(q));
  if(val&&!all.some(g=>g.name.toLowerCase()===val.toLowerCase()))html+=opt(val,`+ Новый зал «${val}»`,'Сохранится в список','','new');
  html+=all.map(g=>opt(g.name,g.name,`${done().filter(s=>s.gymId===g.id).length} тренировок`,'',g.name===val?'sel':'')).join('');
 }
 if(!html)html='<div class="popgrp">Ничего не найдено: впиши название</div>';
 openPop(inp,html,{pick:v=>{inp.value=v;delete inp.dataset.typed;closePop();if(inp.id==='newEx'){act({dataset:{act:'addEx'}});return}inp.dispatchEvent(new Event('change',{bubbles:true}))}});
}
const DD={kind:[['ex','Упражнение','Одно упражнение'],['combo','Связка (дроп-сет)','Несколько упражнений подряд с одним весом и повторами']],
 mode:[['same','Одинаковые подходы','Вес × повторы × количество подходов'],['each','Вес на каждый подход','Свой вес и повторы у каждого подхода'],['pct','% от ПМ','Веса считаются от одноповторного максимума']]};
const ddLabel=(k,v)=>(DD[k].find(x=>x[0]===v)||DD[k][0])[1];
function openDD(btn){
 const key=btn.dataset.dd;let html,pick;
 if(DD[key]){html=DD[key].map(([v,l,d])=>opt(v,l,d,'',btn.dataset.cur===v?'sel':'')).join('');pick=v=>{closePop();act({dataset:{act:'piSet',k:btn.dataset.k,f:key,v}})}}
 else{html='<div class="popt">Добавить в план</div>'+live(db.programs).map(p=>opt(p.id,p.title,`${p.items.length} упр.${p.desc?' · '+p.desc:''}`)).join('')+opt('__empty','Пустая тренировка','Упражнения добавишь сам');pick=v=>{closePop();addPlan(v==='__empty'?'':v);save();render()}}
 openPop(btn,html,{pick,sheet:true});
}
function addPlan(pid,silent){
 const p=progBy(pid),ord=Math.max(0,...live(db.plans).map(q=>q.ord))+1;
 db.plans.push({id:uid(),ord,programId:p?.id||null,title:p?.title||'Своя тренировка',desc:p?.desc||'',warmup:p?.warmup??3,items:p?copyItems(p.items):[],upd:Date.now(),sessionId:null});
 if(!silent)toast(`«${p?.title||'Своя тренировка'}» добавлена в план`);
}
const target=()=>route()==='queue'&&ui.planEdit?db.plans.find(q=>q.id===ui.planEdit):(live(db.programs).find(x=>x.id===ui.prog)||live(db.programs)[0]);
const stepper=(f,v,k)=>`<span class="stepper"><button data-act="step" data-f="${f}" ${k!=null?`data-k="${k}"`:''} data-d="-1" aria-label="Меньше">−</button><span>${v}</span><button data-act="step" data-f="${f}" ${k!=null?`data-k="${k}"`:''} data-d="1" aria-label="Больше">+</button></span>`;
const rate=(f,v,lo,hi)=>`<span class="chips">${[1,2,3,4,5].map(n=>`<button class="tchip ${v===n?'on':''}" data-act="feel" data-f="${f}" data-v="${n}" aria-label="${n} из 5">${n}</button>`).join('')}</span><span class="hint" style="width:100%">1 — ${lo}, 5 — ${hi}</span>`;

/* ---------- Тренировка: выбор ---------- */
function exList(t){return `<ol class="exlist">${t.items.map(it=>{const s=itemSugg(it);return `<li class="${it.kind==='ex'&&isBase(it.name)?'base':''}"><b>${esc(it.name||'без названия')}</b><span>${summaryText(it).replace(/<\/?b>/g,'')}${s?` <span class="up">${esc(s.short)}</span>`:''}</span></li>`}).join('')}</ol>`}
function vStart(){
 const now=new Date(),q=queue(),last=done().sort((a,b)=>b.start-a.start)[0];
 const ask=last&&!last.next&&Date.now()-last.end>6*36e5&&Date.now()-last.end<4*864e5;
 return `<div class="wrap"><p class="kicker">${WD[now.getDay()]}, ${dLong(now)}</p><h1>Тренировка</h1>
 <p class="lead">Дата, день недели и время начала запишутся сами, когда нажмёшь «Начать».</p>
 ${ask?`<div class="panel" style="margin-bottom:18px"><b>Как ты после тренировки «${esc(last.title)}» (${dShort(last.start)})?</b>${rate('next',0,'всё болит','как новый')}<input data-c="next" data-id="${last.id}" placeholder="Заметка: что болит, как спал" aria-label="Заметка на следующий день"></div>`:''}
 <label class="fl" style="margin-bottom:18px">Зал<span class="cbw"><input id="gymIn" data-combo="gym" value="${esc(gymBy(db.lastGym)?.name||'')}" placeholder="Выбери или впиши новый" autocomplete="off"></span></label>
 ${q[0]?`<article class="hero"><div class="kick">Следующая по плану · 1 из ${q.length}</div><h2>${esc(q[0].title)}</h2>
  <div class="ctags" style="margin-bottom:8px">${modified(q[0])?'<span class="tag">Изменена под этот раз</span>':''}${suggCount(q[0])?`<span class="tag">Подсказки по весу: ${suggCount(q[0])}</span>`:''}</div>
  ${q[0].desc?`<p class="desc">${esc(q[0].desc)}</p>`:''}${exList(q[0])}
  <div class="row" style="margin-top:0"><button class="btn pri" data-act="start" data-plan="${q[0].id}">Начать</button><button class="btn" data-act="qEdit" data-id="${q[0].id}">Изменить</button></div></article>
  ${q.length>1?`<div class="secth"><h2>Дальше в плане</h2><span>можно взять любую</span></div>${q.slice(1).map((x,i)=>`<div class="prow2"><div><b>${i+2}. ${esc(x.title)}</b><p>${x.items.length} упр.${modified(x)?' · изменена':''}</p></div><button class="btn sm" data-act="start" data-plan="${x.id}">Начать</button></div>`).join('')}`:''}`
 :`<div class="empty-box">План пуст. Набери тренировки наперёд на вкладке «План» или начни по программе ниже.<div class="row"><a class="btn" href="#queue" style="display:inline-flex;align-items:center;text-decoration:none">Открыть план</a></div></div>`}
 <div class="secth"><h2>Другая тренировка</h2><span>вне плана</span></div>
 ${live(db.programs).map(p=>`<div class="prow2"><div><b>${esc(p.title)}</b><p>${p.items.length} упр.${p.desc?' · '+esc(p.desc):''}</p></div><button class="btn sm" data-act="start" data-prog="${p.id}">Начать</button></div>`).join('')}
 <div class="prow2"><div><b>Свободная тренировка</b><p>Без программы: упражнения добавишь по ходу</p></div><button class="btn sm" data-act="start" data-prog="">Начать</button></div></div>`;
}

/* ---------- Тренировка: в процессе ---------- */
function vSession(s){
 const d=new Date(s.start),run=s.items.filter(i=>st(i)==='run'),dn=s.items.filter(i=>st(i)==='done').length;
 const src=s.planId?'по плану':s.programId?'по программе':'свободная';
 return `<div class="wrap"><p class="kicker">${WD[d.getDay()]}, ${dLong(s.start)} · ${src}</p>
 <input class="title-in" data-c="s" data-f="title" value="${esc(s.title)}" aria-label="Название тренировки">
 <div class="sk"><div><small>Начало</small><b>${hm(s.start)}</b></div><div><small>Идёт</small><b data-clock="${s.start}">${dur(s.start,Date.now())}</b></div><div><small>Упражнений</small><b>${dn} из ${s.items.length}</b></div></div>
 <div class="progress" aria-hidden="true"><i style="width:${s.items.length?dn/s.items.length*100:0}%"></i></div>
 <div class="panel" style="margin-bottom:14px"><div class="ftitle">Самочувствие перед тренировкой</div>${rate('before',s.feel?.before,'еле живой','полон сил')}
 <div class="sdet"><label class="fl">Зал<span class="cbw"><input data-combo="gym" data-c="s" data-f="gym" value="${esc(gymBy(s.gymId)?.name||'')}" placeholder="зал" autocomplete="off"></span></label>
 <label class="fl">Вес тела, кг<input data-c="s" data-f="bodyWeight" inputmode="decimal" value="${esc(fmt(s.bodyWeight))}" placeholder="кг"></label></div>
 <textarea data-c="s" data-f="note" placeholder="Заметка: сон, что болит…" aria-label="Заметка к тренировке">${esc(s.note)}</textarea></div>
 ${run.length?`<div class="running" aria-label="Упражнения в работе">${run.map(i=>`<button class="chip" data-act="jump" data-id="${i.id}"><span class="live"></span>${esc(i.name)} · ${i.sets.filter(x=>x.done).length}/${i.sets.length}</button>`).join('')}</div>`:''}
 <div class="secth"><h2>Упражнения</h2><span>${s.items.reduce((a,i)=>a+i.sets.filter(x=>x.done).length,0)} подходов сделано</span></div>
 ${warmCard(s)}
 ${s.items.map((it,i)=>card(s,it,i)).join('')}
 <div class="add"><span class="cbw" style="flex:1"><input id="newEx" data-combo="ex" placeholder="Добавить упражнение" aria-label="Добавить упражнение" autocomplete="off"></span><button class="btn" data-act="addEx">Добавить</button></div>
 ${ui.finishing?`<div class="panel" style="margin-top:18px"><b>Как настроение после тренировки?</b>${rate('after',s.feel?.after,'выжат','отлично')}
  <div class="row" style="margin-top:0"><button class="btn pri" data-act="finishOk">Записать тренировку</button><button class="btn" data-act="finishNo">Ещё не закончил</button></div></div>`
 :`<div class="row"><button class="btn danger wide" data-act="finish">Закончить тренировку</button></div>`}</div>`;
}
function warmCard(s){
 const w=s.warm;if(!w||!w.n)return '';
 const status=w.skipped?'done':w.end?'done':w.start?'run':'idle';
 const pill=w.skipped?'Пропущена':w.end?`${hm(w.start)}–${hm(w.end)} · ${mins(w.start,w.end)} мин`:w.start?`с ${hm(w.start)}`:'Не начата';
 return `<section class="card ${status}"><div class="chead"><span class="idx">${status==='done'?'✓':'Р'}</span><div><div class="cname">Разминка</div><div class="hint">${w.n} подхода · время не идёт в рабочее</div></div><span class="pill ${status}">${pill}</span></div>
 <div class="cbody">${w.skipped?`<div class="cfoot"><button class="btn sm" data-act="wUnskip">Вернуть разминку</button></div>`
 :`<div class="wdots">${Array.from({length:w.n},(_,i)=>`<button class="wdot ${i<w.done?'on':''}" data-act="warm" data-k="${i}" aria-label="Разминочный подход ${i+1}"></button>`).join('')}</div>
 <div class="cfoot">${status==='idle'?`<button class="btn pri" data-act="wStart">Начать разминку</button><button class="btn sm" data-act="wSkip">Пропустить</button>`:''}
 ${status==='run'?`<button class="btn pri" data-act="wEnd">Закончить разминку</button><span class="hint">отметит все ${w.n} подхода сразу</span>`:''}
 ${status==='done'?`<button class="btn sm" data-act="wResume">Изменить</button>`:''}</div>`}</div></section>`;
}
const prevTxt=p=>p?`<span class="mf2 m${p.m}">${fw(p.w)} × ${p.r||'—'}</span>`:'';
function card(s,it,i){
 const status=st(it),last=lastTime(it.name,s.id),open=status==='run'||(status==='done'&&ui.open.has(it.id));
 const doneN=it.sets.filter(x=>x.done).length,lastT=Math.max(0,...it.sets.map(x=>x.t||0));
 const pill=status==='idle'?'Не начато':status==='run'?(lastT?`отдых <span data-since="${lastT}">${rest(lastT)}</span>`:`с ${hm(it.start)}`):`${hm(it.start)}–${hm(it.end)}`;
 const tags=[it.base?'Базовое':'',it.kind==='combo'?'Связка':'',it.sets.some(x=>x.drops?.length)?'Дроп-сет':''].filter(Boolean);
 const sg=status==='idle'&&it.kind==='ex'?suggest(it.name,it.plan.reps||it.sets[0]?.pr):null,cur=num(it.sets[0]?.w);
 const range=it.sets.find(x=>/[-–]/.test(x.pr))?.pr;
 return `<section class="card ${it.base?'base':''} ${status}" id="c-${it.id}"><div class="chead"><span class="idx">${status==='done'?'✓':i+1}</span>
 <div><div class="cname">${esc(it.name)}</div>${tags.length?`<div class="ctags">${tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div>`:''}</div><span class="pill ${status}">${pill}</span></div>
 <div class="cbody">
 ${it.kind==='combo'?`<ol class="combo">${it.names.map(n=>`<li>${esc(n)}</li>`).join('')}</ol>`:''}
 <div class="planline">${planLine(it.plan.sets)}<span class="dots" aria-label="Сделано ${doneN} из ${it.sets.length}">${it.sets.map(x=>`<i class="dot ${x.done?'on':''}"></i>`).join('')}</span></div>
 ${it.pnote?`<p class="hint">План: ${esc(it.pnote)}</p>`:''}
 ${last&&!open?`<p class="last">Прошлый раз, ${dShort(last.date)}: ${last.sets.map(prevTxt).join(', ')}</p>`:''}
 ${sg&&sg.w!==cur&&cur?`<div class="sugg">Подсказка: <b>${fmt(sg.w)} кг</b> <span>${esc(sg.why)}</span><button class="btn sm" data-act="useSugg" data-i="${it.id}" data-w="${sg.w}">Применить</button></div>`:''}
 ${open?`<div class="shdr"><span></span><span>Вес, кг</span><span></span><span>Повторы${range?` (${esc(range)})`:''}</span><span></span></div><div class="sets">${it.sets.map((x,k)=>setRow(it,x,k)).join('')}</div>`
  :status==='done'?`<p class="summary">${it.sets.filter(x=>x.done).map(setTxt).join('; ')||'Подходов нет'}</p>`:''}
 <div class="cfoot">
 ${open?`<textarea data-c="i" data-i="${it.id}" data-f="note" placeholder="Заметка к упражнению" aria-label="Заметка к упражнению">${esc(it.note)}</textarea>`:''}
 ${status==='idle'?`<button class="btn pri" data-act="exStart" data-i="${it.id}">Начать упражнение</button><button class="btn sm" data-act="rmEx" data-i="${it.id}">${cf('rm'+it.id,'Убрать','Точно убрать?')}</button>`:''}
 ${status==='run'?`<button class="btn" data-act="addSet" data-i="${it.id}">+ подход</button><button class="btn pri" data-act="exEnd" data-i="${it.id}">Завершить упражнение</button>`:''}
 ${status==='done'?`<button class="btn sm" data-act="toggle" data-i="${it.id}">${open?'Свернуть':'Изменить'}</button><button class="btn sm" data-act="exResume" data-i="${it.id}">Продолжить</button>`:''}
 </div></div></section>`;
}
const rest=t=>{const s=Math.max(0,Math.round((Date.now()-t)/1000));return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`};
function setRow(it,x,k){
 const a=`data-i="${it.id}" data-k="${k}"`,showNote=x.n||ui.notes.has(it.id+':'+k);
 const lab=[x.pl?`${esc(x.pl)} от ПМ`:'',x.prev?`было ${prevTxt(x.prev)}`:''].filter(Boolean).join(' · ');
 return `<div class="set ${x.done?'ok':''}">${lab?`<span class="lab">${lab}</span>`:''}<span class="n">${k+1}</span>
 <input data-c="ss" ${a} data-f="w" inputmode="decimal" value="${esc(fmt(x.w))}" placeholder="кг" aria-label="Вес, подход ${k+1}">
 <span class="x">×</span>
 <input data-c="ss" ${a} data-f="r" inputmode="numeric" value="${esc(x.r)}" placeholder="${esc(x.pr)||'повт.'}" aria-label="Повторы, подход ${k+1}">
 <button class="chk" data-act="tick" ${a} aria-label="${x.done?'Отменить подход':'Подход сделан'}">${x.done?'✓':''}</button>
 ${(x.drops||[]).map((d,j)=>`<div class="drop"><span>↘</span><input data-c="ss" ${a} data-d="${j}" data-f="w" inputmode="decimal" value="${esc(fmt(d.w))}" placeholder="свой вес" aria-label="Дроп ${j+1}, вес"><span class="x">×</span><input data-c="ss" ${a} data-d="${j}" data-f="r" inputmode="numeric" value="${esc(d.r)}" placeholder="${esc(x.r||x.pr)||'повт.'}" aria-label="Дроп ${j+1}, повторы"><button class="x-btn" data-act="rmDrop" ${a} data-d="${j}" aria-label="Убрать дроп">×</button></div>`).join('')}
 ${x.done?`<div class="extra">${[1,2,3].map(m=>`<button class="mood m${m} ${x.m===m?'sel':''}" data-act="mood" ${a} data-m="${m}" aria-label="${MOOD[m]}" title="${MOOD[m]}">${face(m)}</button>`).join('')}
 ${showNote?`<input data-c="ss" ${a} data-f="n" value="${esc(x.n)}" placeholder="заметка к подходу" aria-label="Заметка к подходу">`:`<button class="btn sm" data-act="note" ${a}>заметка</button>`}
 ${it.kind!=='combo'?`<button class="btn sm" data-act="addDrop" ${a}>+ дроп</button>`:''}<span class="note-s">${x.t?hm(x.t):''}</span></div>`:''}</div>`;
}

/* ---------- План: очередь без дат ---------- */
function lastPid(){const q=queue();if(q.length)return q[q.length-1].programId;return done().sort((a,b)=>b.start-a.start)[0]?.programId}
function seriesIds(){const ids=ui.series.progs.filter(progBy);if(!ids.length)return [];const st0=(ids.indexOf(lastPid())+1)%ids.length;return Array.from({length:ui.series.n},(_,i)=>ids[(st0+i)%ids.length])}
function vQueue(){
 if(ui.planEdit){const q=db.plans.find(x=>x.id===ui.planEdit);if(q&&!q.deleted)return planEditor(q);ui.planEdit=null}
 const q=queue(),pw=db.perWeek||3,wk=q.length/pw,seq=seriesIds();
 return `<div class="wrap"><h1>План</h1><p class="lead">Очередь тренировок наперёд, без дат. В зале берёшь следующую или любую другую. Каждая — копия программы, её можно изменить под конкретный раз.</p>
 <div class="panel" style="grid-template-columns:minmax(0,1fr) auto;align-items:center;margin-bottom:16px"><div><b>В плане ${q.length} ${q.length===1?'тренировка':q.length<5&&q.length?'тренировки':'тренировок'}</b><p class="hint">при ${pw} в неделю этого хватит примерно на ${fmt((Math.round(wk*2)/2).toString())} ${wk>=1&&wk<1.5?'неделю':'недели'}</p></div>
 <label class="fl" style="justify-items:end">В неделю${stepper('perWeek',pw)}</label></div>
 ${q.length?q.map((x,i)=>`<div class="qrow ${i===0?'first':''}"><span class="qn">${i+1}</span><div><h3>${esc(x.title)}</h3><div class="ctags">${i===0?'<span class="tag">Следующая</span>':''}${!x.programId?'<span class="tag">Своя</span>':modified(x)?'<span class="tag">Изменена</span>':''}${suggCount(x)?`<span class="tag">↑ подсказок: ${suggCount(x)}</span>`:''}</div>
  <p>${x.items.length} упр.${x.items.filter(it=>it.kind==='ex'&&isBase(it.name)).map(it=>' · '+esc(it.name)).join('')}</p></div>
  <div class="qact"><button class="ibtn" data-act="qUp" data-id="${x.id}" aria-label="Выше">↑</button><button class="ibtn" data-act="qDown" data-id="${x.id}" aria-label="Ниже">↓</button><button class="btn sm" data-act="qEdit" data-id="${x.id}">Открыть</button><button class="ibtn" data-act="qDel" data-id="${x.id}" aria-label="Убрать из плана">${cf('qd'+x.id,'×','?')}</button></div></div>`).join('')
 :'<div class="empty-box">План пуст. Добавь тренировки по одной или набери серию ниже.</div>'}
 <div class="secth"><h2>Добавить</h2></div>
 <div class="panel"><div class="row" style="margin:0"><button class="btn pri" data-dd="addPlan">+ Тренировка из программы</button></div>
 <div class="ftitle">Набрать серию по кругу</div><p class="hint" style="margin-top:-8px">Отметь программы в нужном порядке. Серия продолжит круг с того места, где он остановился.</p>
 <div class="chips">${live(db.programs).map(p=>{const i=ui.series.progs.indexOf(p.id);return `<button class="tchip ${i>=0?'on':''}" data-act="serTog" data-id="${p.id}">${i>=0?(i+1)+'. ':''}${esc(p.title)}</button>`}).join('')}</div>
 <label class="fl">Сколько тренировок${stepper('seriesN',ui.series.n)}</label>
 ${seq.length?`<p class="seq">Добавится: ${seq.map(id=>`<b>${esc(progBy(id).title)}</b>`).join(' → ')}</p>`:''}
 <div><button class="btn" data-act="serAdd" ${seq.length?'':'disabled'}>Добавить ${seq.length} в план</button></div></div></div>`;
}
function planEditor(q){
 const p=progBy(q.programId),mod=modified(q),n=suggCount(q);
 return `<div class="wrap"><button class="back" data-act="qBack">← План</button>
 <div class="ehead"><div class="ctags">${p?`<span class="tag">${mod?'Изменена относительно':'Как в программе'} «${esc(p.title)}»</span>`:'<span class="tag">Своя тренировка</span>'}</div>
 <input class="title-in" data-c="t" data-f="title" value="${esc(q.title)}" aria-label="Название">
 <textarea data-c="t" data-f="desc" placeholder="Описание: на что упор в этот раз">${esc(q.desc)}</textarea>
 <div class="row2"><span class="fl">Разминка, подходов ${stepper('warmup',q.warmup)}</span></div>
 <div class="row" style="margin:0"><button class="btn pri" data-act="start" data-plan="${q.id}">Начать сейчас</button>${n?`<button class="btn" data-act="allSugg">Применить подсказки (${n})</button>`:''}${mod?`<button class="btn" data-act="qReset">Вернуть как в программе</button>`:''}</div></div>
 ${itemsEditor(q)}
 <div class="row"><button class="btn danger" data-act="qDel" data-id="${q.id}">${cf('qd'+q.id,'Убрать из плана','Точно убрать?')}</button></div></div>`;
}

/* ---------- Программы ---------- */
function vPlan(){
 const progs=live(db.programs),p=progs.find(x=>x.id===ui.prog)||progs[0];
 return `<h1>Программы</h1><p class="lead">Шаблоны тренировок. Из них набирается план, и по ним можно начать тренировку сразу.</p>
 <div class="planner"><div class="plnav">${progs.map(x=>`<button class="${p&&x.id===p.id?'on':''}" data-act="selProg" data-id="${x.id}"><b>${esc(x.title)}</b><small>${x.items.length} упр.${x.desc?' · '+esc(x.desc.slice(0,48))+(x.desc.length>48?'…':''):''}</small></button>`).join('')}
 <button data-act="newProg"><b>+ Новая программа</b></button></div>
 ${p?`<div><div class="ehead"><input class="title-in" data-c="t" data-f="title" value="${esc(p.title)}" aria-label="Название программы">
 <textarea data-c="t" data-f="desc" placeholder="Описание: на что упор, что учесть">${esc(p.desc)}</textarea>
 <div class="row2"><span class="fl">Разминка, подходов ${stepper('warmup',p.warmup)}</span>${suggCount(p)?`<button class="btn sm" data-act="allSugg">Применить подсказки (${suggCount(p)})</button>`:''}</div></div>
 ${itemsEditor(p)}
 <div class="row"><button class="btn pri" data-act="toPlan">Добавить в план</button><button class="btn" data-act="start" data-prog="${p.id}">Начать сейчас</button><button class="btn danger" data-act="delProg">${cf('dp'+p.id,'Удалить программу','Точно удалить?')}</button></div></div>`:'<p>Программ пока нет.</p>'}</div>`;
}
function itemsEditor(t){
 return `<div class="secth"><h2>Упражнения</h2><span>${t.items.length} · нажми, чтобы изменить</span></div>
 ${t.items.map((it,k)=>{const o=ui.openItem===it.id,s=itemSugg(it),b=it.kind==='ex'&&isBase(it.name);
  return `<div class="pitem ${b?'base':''} ${o?'open':''}"><div class="pisum"><span class="idx">${k+1}</span>
  <div role="button" tabindex="0" data-act="openItem" data-id="${it.id}" style="cursor:pointer"><div class="nm">${esc(it.name||'Новое упражнение')} ${b?'<span class="tag">База</span>':''}${it.kind==='combo'?' <span class="tag">Связка</span>':''}</div><div class="sub">${summaryText(it)}${s?` <span class="up">${esc(s.short)}</span>`:''}</div></div>
  <div class="qact"><button class="ibtn" data-act="piUp" data-k="${k}" aria-label="Выше">↑</button><button class="ibtn" data-act="piDown" data-k="${k}" aria-label="Ниже">↓</button></div></div>
  ${o?itemForm(it,k,s):''}</div>`}).join('')}
 <div class="add"><button class="btn" data-act="piAdd">+ Упражнение</button><button class="btn" data-act="piAddCombo">+ Связка</button></div>`;
}
function itemForm(it,k,s){
 const a=`data-c="pi" data-k="${k}"`,ex=exBy(it.name),est=it.name?est1rm(it.name):0;
 const inp=(f,l,v,ph,im)=>`<label class="fl">${l}<input ${a} data-f="${f}" value="${esc(v)}" placeholder="${ph||''}" ${im?'inputmode="decimal"':''}></label>`;
 let body='';
 if(it.kind==='combo'){
  body=`<div class="frow"><div class="fl">Тип<button class="dd" data-dd="kind" data-k="${k}" data-cur="combo">${ddLabel('kind','combo')}</button></div>${inp('name','Название связки',it.name,'Дроп-сет на плечи')}</div>
  <div><div class="ftitle" style="margin-bottom:8px">Упражнения подряд</div><div class="tops">${it.names.map((n,j)=>`<span class="top"><span class="cbw"><input data-combo="ex" data-c="pn" data-k="${k}" data-j="${j}" value="${esc(n)}" style="width:220px;text-align:left" aria-label="Упражнение ${j+1}" autocomplete="off"></span><button data-act="pnDel" data-k="${k}" data-j="${j}" aria-label="Убрать">×</button></span>`).join('')}<button class="btn sm" data-act="pnAdd" data-k="${k}">+ упражнение</button></div></div>
  <div class="frow">${inp('weight','Вес, кг',fmt(it.weight),'кг',1)}${inp('reps','Повторы',it.reps,'12')}<div class="fl">Подходов${stepper('sets',it.sets,k)}</div></div>`;
 }else{
  body=`<div class="frow"><div class="fl">Тип<button class="dd" data-dd="kind" data-k="${k}" data-cur="ex">${ddLabel('kind','ex')}</button></div>
  <label class="fl" style="grid-column:span 2">Упражнение<span class="cbw"><input data-combo="ex" ${a} data-f="name" value="${esc(it.name)}" placeholder="Выбери или впиши новое" autocomplete="off"></span></label></div>
  <div class="frow"><label class="toggle"><input type="checkbox" ${a} data-f="base" ${isBase(it.name)?'checked':''}>Базовое (выделение и статистика)</label></div>
  ${isBase(it.name)||it.mode==='pct'?`<div class="frow"><label class="fl">Одноповторный максимум (ПМ), кг<input data-c="max" data-k="${k}" inputmode="decimal" value="${esc(fmt(ex?.max))}" placeholder="кг"></label><p class="hint">${est?`По истории ≈ ${fmt(est)} кг`:'Истории пока нет'}</p></div>`:''}
  <div class="frow"><div class="fl">Как заданы подходы<button class="dd" data-dd="mode" data-k="${k}" data-cur="${it.mode}">${ddLabel('mode',it.mode)}</button></div></div>
  ${it.mode==='same'?`<div class="frow">${inp('weight','Вес, кг',fmt(it.weight),'30-35 или ?')}${inp('reps','Повторы',it.reps,'8-12')}<div class="fl">Подходов${stepper('sets',it.sets,k)}</div></div>`:''}
  ${it.mode==='each'?`<div class="tops">${it.each.map((t,j)=>`<span class="top"><input data-c="pt" data-k="${k}" data-j="${j}" data-f="w" inputmode="decimal" value="${esc(fmt(t.w))}" placeholder="кг" aria-label="Вес"><span>×</span><input data-c="pt" data-k="${k}" data-j="${j}" data-f="r" value="${esc(t.r)}" placeholder="повт." aria-label="Повторы"><button data-act="ptDel" data-k="${k}" data-j="${j}" aria-label="Убрать подход">×</button></span>`).join('')}<button class="btn sm" data-act="ptAdd" data-k="${k}">+ подход</button></div>`:''}
  ${it.mode==='pct'?`<div class="frow">${inp('pct','Проценты от ПМ',it.pct,'65, 75, 85')}${inp('reps','Повторы',it.reps,'5')}</div>
   <label class="toggle"><input type="checkbox" ${a} data-f="lastMax" ${it.lastMax?'checked':''}>Последний подход на максимум</label>
   <p class="preview">${ex?.max?planSets(it).map(x=>`${esc(x.l)} → <b>${fmt(x.w)}</b>×${esc(x.r)}`).join(' · '):'Укажи ПМ, и веса посчитаются сами с шагом 2,5 кг'}</p>`:''}`;
 }
 return `<div class="piform">${body}
 ${s?`<div class="sugg">Подсказка: <span>${esc(s.text)}</span><button class="btn sm" data-act="piSugg" data-k="${k}">Применить</button></div>`:''}
 <div class="frow">${it.kind==='ex'?inp('drops','Дроп после каждого подхода',it.drops,'веса через запятую, 0 = свой вес'):''}${inp('note','Пометка',it.note,'например «сжимать в конце»')}</div>
 <div class="pfoot"><button class="btn sm danger" data-act="piDel" data-k="${k}">${cf('pi'+k+it.id,'Удалить упражнение','Точно удалить?')}</button><button class="btn sm pri" data-act="openItem" data-id="${it.id}">Готово</button></div></div>`;
}

/* ---------- История и статистика ---------- */
const hseg=r=>`<div class="hseg"><a href="#history" class="${r==='history'?'on':''}">Тренировки</a><a href="#stats" class="${r==='stats'?'on':''}">Статистика</a></div>`;
function vHistory(){
 const list=done().sort((a,b)=>b.start-a.start),s=list.find(x=>x.id===ui.hist);
 if(s)return vDetail(s)+nextDay(s);
 let last='';
 const rows=list.map(s=>{const d=new Date(s.start),g=MONN[d.getMonth()]+' '+d.getFullYear();const head=g!==last?`<p class="hgroup">${g}</p>`:'';last=g;
  return head+`<button class="hrow" data-act="hist" data-id="${s.id}"><span class="hday"><b>${d.getDate()}</b><small>${WDs[d.getDay()]}</small></span>
  <span><h3>${esc(s.title)}</h3><p>Н ${hm(s.start)} · К ${hm(s.end)}${s.bodyWeight?' · В '+fmt(s.bodyWeight):''} · тоннаж ${fmt(tonnage(s))} кг${s.next?.rate?' · назавтра '+s.next.rate+'/5':''}</p></span><span class="hdur">${dur(s.start,s.end)}</span></button>`}).join('');
 return `<div class="wrap">${hseg('history')}<h1>История</h1><p class="lead">${list.length?`${list.length} тренировок. Нажми на любую, чтобы открыть как страницу тетради.`:'Пока пусто: закончи первую тренировку.'}</p>${rows}</div>`;
}
function nextDay(s){
 return `<div class="wrap"><div class="panel" style="margin-top:16px"><div class="ftitle">Самочувствие</div>
 <p class="hint">Перед тренировкой: ${s.feel?.before||'—'}/5 · после: ${s.feel?.after||'—'}/5</p>
 <div class="ftitle">На следующий день</div>${rate('next',s.next?.rate||0,'всё болит','как новый')}
 <input data-c="next" data-id="${s.id}" value="${esc(s.next?.note||'')}" placeholder="Что болит, как спал, что учесть в следующий раз" aria-label="Заметка на следующий день"></div></div>`;
}
const tonnage=s=>Math.round(s.items.reduce((a,i)=>a+i.sets.filter(x=>x.done).reduce((b,x)=>b+(num(x.w)||0)*(num(x.r)||0)*(i.kind==='combo'?i.names.length:1)+(x.drops||[]).reduce((c,d)=>c+(num(d.w)||0)*(num(d.r)||0),0),0),0));
const SETSEC=40;/* подход ≈ 40 с: приложение отмечает только конец подхода */
function timing(s){
 const w=s.warm&&!s.warm.skipped&&s.warm.start&&s.warm.end?mins(s.warm.start,s.warm.end):0;
 const ticks=s.items.flatMap(i=>i.sets.filter(x=>x.done&&x.t).map(x=>x.t)).sort((a,b)=>a-b);
 const total=mins(s.start,s.end),work=Math.round(ticks.length*SETSEC/60);
 const span=ticks.length>1?(ticks[ticks.length-1]-ticks[0])/6e4:0,restM=Math.max(0,Math.round(span-(ticks.length-1)*SETSEC/60));
 const gaps=[],mid=s.start+(s.end-s.start)/2;
 s.items.forEach(i=>{const t=i.sets.filter(x=>x.done&&x.t).map(x=>x.t).sort((a,b)=>a-b);for(let k=1;k<t.length;k++)gaps.push({sec:Math.max(0,(t[k]-t[k-1])/1000-SETSEC),early:t[k]<mid})});
 return {total,warm:w,work,rest:Math.min(restM,Math.max(0,total-w-work)),other:Math.max(0,total-w-work-Math.min(restM,Math.max(0,total-w-work))),gaps,sets:ticks.length};
}
const mmss=s=>`${Math.floor(s/60)}:${String(Math.round(s%60)).padStart(2,'0')}`;
const avg=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:0;
function vMore(){
 const list=done().sort((a,b)=>a.start-b.start);if(!list.length)return '';
 const T=list.map(timing),G=T.flatMap(t=>t.gaps),ton=list.map(tonnage);
 const fb=list.map(s=>s.feel?.before).filter(Boolean),fa=list.map(s=>s.feel?.after).filter(Boolean),fn=list.map(s=>s.next?.rate).filter(Boolean);
 const k=(l,v,sub)=>`<div class="kpi"><small>${l}</small><b>${v}</b>${sub?`<span>${sub}</span>`:''}</div>`;
 charts.push({pts:list.map((s,i)=>({d:s.start,v:ton[i],t:fmt(ton[i])+' кг'}))});const ci=charts.length-1;
 charts.push({pts:list.map((s,i)=>({d:s.start,v:Math.round(avg(T[i].gaps.map(g=>g.sec))/6)/10,t:mmss(avg(T[i].gaps.map(g=>g.sec)))})).filter(p=>p.v)});const cr=charts.length-1;
 const mx=Math.max(...T.map(t=>t.total)),seg=[['warm','Разминка','var(--muted)'],['work','Подходы','var(--chart)'],['rest','Отдых','color-mix(in srgb,var(--chart) 40%,var(--card))'],['other','Прочее','var(--line)']];
 return `<div class="secth"><h2>Средние значения</h2><span>по всем тренировкам</span></div>
 <div class="kpis">${k('Тоннаж за тренировку',fmt(Math.round(avg(ton)))+' кг',`максимум ${fmt(Math.max(...ton))} кг`)}
 ${k('Подходов за тренировку',fmt(avg(T.map(t=>t.sets)).toFixed(1)),`упражнений ≈ ${fmt(avg(list.map(s=>s.items.length)).toFixed(1))}`)}
 ${k('Чистое время',dur(0,avg(T.map(t=>t.total-t.warm))*6e4),'без разминки')}
 ${k('Разминка',Math.round(avg(T.map(t=>t.warm).filter(Boolean)))+' мин','')}
 ${k('Отдых между подходами',mmss(avg(G.map(g=>g.sec))),'в среднем')}
 ${k('Отдых в начале',mmss(avg(G.filter(g=>g.early).map(g=>g.sec))),'первая половина тренировки')}
 ${k('Отдых в конце',mmss(avg(G.filter(g=>!g.early).map(g=>g.sec))),'вторая половина')}
 ${k('Самочувствие',fb.length?`${fmt(avg(fb).toFixed(1))} → ${fa.length?fmt(avg(fa).toFixed(1)):'—'}`:'—','до → после, из 5')}
 ${k('На следующий день',fn.length?fmt(avg(fn).toFixed(1))+' / 5':'—','')}</div>
 <div class="charts">
 <div class="chcard"><h3>Тоннаж</h3><p>Сумма вес × повторы за тренировку, кг</p><div class="fig" data-ch="${ci}"><svg role="img" aria-label="Тоннаж"></svg><div class="tip"></div></div></div>
 <div class="chcard"><h3>Средний отдых между подходами</h3><p>Минуты, по тренировкам</p><div class="fig" data-ch="${cr}"><svg role="img" aria-label="Отдых"></svg><div class="tip"></div></div></div>
 <div class="chcard" style="grid-column:1/-1"><h3>Из чего состоит тренировка</h3><p>Минуты по каждому дню. Подход считаем ≈ ${SETSEC} с, остальное между подходами — отдых.</p>
 <div class="chips" style="margin:6px 0 10px">${seg.map(([,l,c])=>`<span class="hint" style="display:inline-flex;align-items:center;gap:6px"><i style="width:12px;height:12px;border-radius:3px;background:${c};display:inline-block"></i>${l}</span>`).join('')}</div>
 ${list.map((s,i)=>{const t=T[i];return `<div class="gbar" title="${seg.map(([f,l])=>l+': '+t[f]+' мин').join(', ')}"><span>${dShort(s.start)} · ${esc(s.title.split(' + ')[0])}</span><span class="bar" style="display:flex;gap:2px;background:none;width:${(t.total/mx*100).toFixed(1)}%">${seg.map(([f,,c])=>t[f]?`<i style="flex:${t[f]} 0 0;background:${c};border-radius:3px"></i>`:'').join('')}</span><span>${t.total} мин · отдых ${t.rest}</span></div>`}).join('')}
 <p class="hint">В примере время подходов достроено равномерно: в тетради записано только начало упражнений.</p></div></div>`;
}
function vDetail(s){
 const d=new Date(s.start),w=s.warm;
 return `<div class="wrap"><button class="back" data-act="back">← История</button><article class="page">
 <h2 class="hand">${esc(s.title)} (${d.toLocaleDateString('ru-RU')})</h2>
 <p class="hmeta">${WD[d.getDay()]} · В — ${fmt(s.bodyWeight)||'—'} · Н — ${hm(s.start)} · К — ${hm(s.end)} · ${dur(s.start,s.end)}${gymBy(s.gymId)?' · '+esc(gymBy(s.gymId).name):''}</p>
 ${w&&w.n?`<p class="inote">Разминка: ${w.done} из ${w.n}${w.start?' ('+hm(w.start)+')':''}</p>`:''}${s.note?`<p class="inote">${esc(s.note)}</p>`:''}
 ${s.items.map(it=>`<div class="hl ${it.base?'base':''}"><div class="hn"><b>${esc(it.name)}</b><small>${it.start?hm(it.start)+'–'+hm(it.end):'не делал'}</small></div>
 ${it.kind==='combo'?`<p class="inote">Связка: ${it.names.map(esc).join(' → ')}</p>`:''}
 <div class="planline">${planLine(it.plan.sets)}<span class="dots">${it.sets.map(x=>`<i class="dot ${x.done?'on':''}"></i>`).join('')}</span></div>
 <div class="hs">${it.sets.filter(x=>x.done).map(setTxt).join('; ')}</div>
 ${it.note?`<p class="inote">${esc(it.note)}</p>`:''}</div>`).join('')}
 </article><div class="row"><button class="btn" data-act="toProg" data-id="${s.id}">Сделать программу из этой тренировки</button><button class="btn danger" data-act="delS" data-id="${s.id}">${cf('ds'+s.id,'Удалить','Точно удалить?')}</button></div></div>`;
}

/* ---------- Статистика ---------- */
let charts=[];
function vStats(){
 const list=done().sort((a,b)=>a.start-b.start);
 if(!list.length)return `<div class="wrap"><h1>Статистика</h1><p class="lead">Появится после первой тренировки.</p></div>`;
 const durs=list.map(s=>mins(s.start,s.end)),avg=Math.round(durs.reduce((a,b)=>a+b,0)/durs.length);
 const weeks=Math.max(1,(list[list.length-1].start-list[0].start)/6048e5);
 const bw=list.filter(s=>num(s.bodyWeight)).map(s=>({d:s.start,v:num(s.bodyWeight)}));
 const bases=live(db.exercises).filter(e=>e.base);
 charts=[];
 const series=bases.map(e=>{const pts=[];list.forEach(s=>s.items.filter(i=>i.name===e.name).forEach(i=>{const b=i.sets.filter(x=>x.done&&num(x.w)).sort((a,c)=>num(c.w)-num(a.w))[0];if(b)pts.push({d:s.start,v:num(b.w),t:`${fw(b.w)} кг × ${b.r||'—'}`})}));return {e,pts}});
 const best=series.map(({e,pts})=>{const b=[...pts].sort((a,c)=>c.v-a.v)[0];return `<div class="kpi"><small>${esc(e.name)}: максимум</small><b>${b?fmt(b.v)+' кг':'—'}</b><span>${b?dShort(b.d)+', '+b.t.split('× ')[1]+' повт.':'ещё не делал'}</span></div>`}).join('');
 const ch=(title,sub,pts,unit)=>{charts.push({pts,unit});return `<div class="chcard"><h3>${title}</h3><p>${sub}</p><div class="fig" data-ch="${charts.length-1}"><svg role="img" aria-label="${esc(title)}"></svg><div class="tip"></div></div></div>`};
 const gyms={};list.forEach(s=>{const n=gymBy(s.gymId)?.name||'Без зала';(gyms[n]=gyms[n]||[]).push(mins(s.start,s.end))});
 const gmax=Math.max(...Object.values(gyms).map(a=>a.length));
 const bwd=bw.length>1?bw[bw.length-1].v-bw[0].v:0;
 return `<h1>Статистика</h1><p class="lead">По ${list.length} тренировкам, ${dShort(list[0].start)} — ${dShort(list[list.length-1].start)}. Пример: записи из тетради.</p>
 <div class="kpis"><div class="kpi"><small>Тренировок</small><b>${list.length}</b><span>≈ ${fmt((list.length/weeks).toFixed(1))} в неделю</span></div>
 <div class="kpi"><small>Средняя длительность</small><b>${dur(0,avg*60000)}</b><span>от ${Math.min(...durs)} до ${Math.max(...durs)} мин</span></div>
 <div class="kpi"><small>Вес тела</small><b>${bw.length?fmt(bw[bw.length-1].v)+' кг':'—'}</b><span>${bw.length>1?(bwd>0?'+':'')+fmt(bwd.toFixed(1))+' кг с '+dShort(bw[0].d):''}</span></div>
 ${best}</div>
 <div class="charts">${series.map(({e,pts})=>ch(esc(e.name),'Самый тяжёлый подход за тренировку, кг',pts,'кг')).join('')}
 ${ch('Вес тела','По дням тренировок, кг',bw.map(p=>({...p,t:fmt(p.v)+' кг'})),'кг')}
 ${ch('Длительность','Минут на тренировку',list.map(s=>({d:s.start,v:mins(s.start,s.end),t:dur(s.start,s.end)})),'мин')}
 <div class="chcard"><h3>Залы</h3><p>Тренировок и средняя длительность</p>${Object.entries(gyms).map(([n,a])=>`<div class="gbar"><span>${esc(n)}</span><span class="bar"><i style="width:${(a.length/gmax*100).toFixed(0)}%"></i></span><span>${a.length} · ${Math.round(a.reduce((x,y)=>x+y,0)/a.length)} мин</span></div>`).join('')}</div></div>
 <details><summary>Таблица по тренировкам</summary><div class="scroll"><table><thead><tr><th>Дата</th><th>Тренировка</th><th>Зал</th><th class="r">Вес тела</th><th class="r">Минут</th>${bases.map(e=>`<th class="r">${esc(e.name)}</th>`).join('')}</tr></thead><tbody>
 ${list.map(s=>`<tr><td>${dShort(s.start)}</td><td>${esc(s.title)}</td><td>${esc(gymBy(s.gymId)?.name||'')}</td><td class="r">${fmt(s.bodyWeight)}</td><td class="r">${mins(s.start,s.end)}</td>${series.map(({pts})=>`<td class="r">${pts.find(p=>p.d===s.start)?.t||''}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details>`;
}
/* монотонная кубическая кривая: плавно и без выбросов выше/ниже точек */
function smooth(P){
 const n=P.length;if(n<2)return '';if(n===2)return `M${P[0][0]},${P[0][1]}L${P[1][0]},${P[1][1]}`;
 const dx=[],m=[],t=[];
 for(let i=0;i<n-1;i++){dx[i]=(P[i+1][0]-P[i][0])||1;m[i]=(P[i+1][1]-P[i][1])/dx[i]}
 t[0]=m[0];t[n-1]=m[n-2];
 for(let i=1;i<n-1;i++)t[i]=m[i-1]*m[i]<=0?0:3*(dx[i-1]+dx[i])/((2*dx[i]+dx[i-1])/m[i-1]+(dx[i]+2*dx[i-1])/m[i]);
 let d=`M${P[0][0]},${P[0][1]}`;
 for(let i=0;i<n-1;i++){const h=dx[i]/3;d+=`C${P[i][0]+h},${P[i][1]+t[i]*h} ${P[i+1][0]-h},${P[i+1][1]-t[i+1]*h} ${P[i+1][0]},${P[i+1][1]}`}
 return d;
}
function drawChart(fig){
 const c=charts[+fig.dataset.ch],svg=fig.querySelector('svg'),tip=fig.querySelector('.tip'),W=fig.clientWidth,Hh=fig.clientHeight;
 if(!c||!W)return;
 if(!c.pts.length){svg.innerHTML='';if(!fig.querySelector('.empty'))fig.insertAdjacentHTML('beforeend','<div class="empty">Ещё нет записей</div>');return}
 const pad={l:42,r:16,t:16,b:26},xs=c.pts.map(p=>p.d),ys=c.pts.map(p=>p.v);
 let x0=Math.min(...xs),x1=Math.max(...xs);if(x0===x1){x0-=3*864e5;x1+=3*864e5}
 let y0=Math.min(...ys),y1=Math.max(...ys);const sp=(y1-y0)||Math.max(2,y1*.06);y0=ys.every(v=>v>=0)?Math.max(0,y0-sp*.3):y0-sp*.3;y1+=sp*.3;
 const X=d=>pad.l+(d-x0)/(x1-x0)*(W-pad.l-pad.r),Y=v=>pad.t+(1-(v-y0)/(y1-y0))*(Hh-pad.t-pad.b);
 const ticks=[0,.5,1].map(f=>y0+(y1-y0)*f),P=c.pts.map(p=>[X(p.d),Y(p.v)]);
 const xl=W<520?[c.pts[0],c.pts[c.pts.length-1]]:c.pts.filter((p,i,a)=>i===0||i===a.length-1||i===Math.floor(a.length/2));
 svg.innerHTML=ticks.map(v=>`<line x1="${pad.l}" x2="${W-pad.r}" y1="${Y(v)}" y2="${Y(v)}" stroke="var(--line)" stroke-width="1"/><text class="ax" x="${pad.l-6}" y="${Y(v)+4}" text-anchor="end">${fmt(Math.round(v*2)/2)}</text>`).join('')
 +[...new Set(xl)].map(p=>`<text class="ax" x="${Math.min(Math.max(X(p.d),pad.l+16),W-pad.r-16)}" y="${Hh-6}" text-anchor="middle">${dShort(p.d)}</text>`).join('')
 +`<path d="${smooth(P)}" fill="none" stroke="var(--chart)" stroke-width="2" stroke-linecap="round"/>`
 +P.map(([x,y])=>`<circle cx="${x}" cy="${y}" r="4.5" fill="var(--chart)" stroke="var(--card)" stroke-width="2"/>`).join('')
 +`<line class="cross" y1="${pad.t}" y2="${Hh-pad.b}" stroke="var(--muted)" stroke-dasharray="3 3" opacity="0"/><rect x="${pad.l}" y="0" width="${W-pad.l-pad.r}" height="${Hh}" fill="transparent"/>`;
 const cross=svg.querySelector('.cross');
 svg.onpointermove=e=>{const r=svg.getBoundingClientRect(),mx=e.clientX-r.left;let bi=0;P.forEach((p,i)=>{if(Math.abs(p[0]-mx)<Math.abs(P[bi][0]-mx))bi=i});
  const [x,y]=P[bi],p=c.pts[bi];cross.setAttribute('x1',x);cross.setAttribute('x2',x);cross.setAttribute('opacity','1');
  tip.innerHTML=`${dShort(p.d)}: <b>${esc(p.t||fmt(p.v))}</b>`;tip.style.left=Math.min(Math.max(x,60),W-60)+'px';tip.style.top=y+'px';tip.style.opacity=1};
 svg.onpointerleave=()=>{tip.style.opacity=0;cross.setAttribute('opacity','0')};
}
const chartRO=new ResizeObserver(es=>es.forEach(e=>drawChart(e.target)));

/* ---------- Справочник ---------- */
function vLibrary(){
 const exs=live(db.exercises).sort((a,b)=>(b.base-a.base)||a.name.localeCompare(b.name,'ru'));
 const unsynced=['programs','sessions','exercises','gyms'].reduce((n,k)=>n+db[k].filter(r=>(r.upd||0)>db.syncedAt).length,0);
 return `<div class="wrap"><h1>Справочник</h1><p class="lead">Упражнения, залы, оформление и синхронизация.</p>
 <section><h2>Оформление</h2><p class="hint" style="margin-bottom:10px">Один и тот же интерфейс в четырёх стилях: выбери, какой нравится.</p>
 <div class="styles">${STYLES.map(([k,n,d])=>`<button class="stl ${style===k?'on':''}" data-style="${k}" data-act="style" data-v="${k}"><span class="ring">72,5</span> <span class="rp">5</span><b>${n}</b><small>${d}</small></button>`).join('')}</div></section>
 <section class="sec"><h2>Упражнения</h2><p class="hint" style="margin-bottom:10px">«Базовое» нужно только для выделения и статистики. ПМ — повторный максимум: от него считаются проценты в программах.</p>
 <div class="add" style="margin-bottom:10px"><input id="newLib" placeholder="Новое упражнение" aria-label="Новое упражнение"><button class="btn" data-act="libAdd">Добавить</button></div>
 <div class="lib">${exs.map(e=>{const est=est1rm(e.name);return `<div class="lrow"><input data-c="ex" data-id="${e.id}" data-f="name" value="${esc(e.name)}" aria-label="Название">
 <label class="toggle"><input type="checkbox" data-c="ex" data-id="${e.id}" data-f="base" ${e.base?'checked':''}>Базовое</label>
 <input data-c="ex" data-id="${e.id}" data-f="max" inputmode="decimal" value="${esc(fmt(e.max))}" placeholder="ПМ, кг" aria-label="ПМ" title="${est?'По истории ≈ '+fmt(est)+' кг':''}">
 <button class="x-btn" data-act="libDel" data-id="${e.id}" aria-label="Удалить">${cf('le'+e.id,'×','?')}</button>${est?`<small style="grid-column:1/-1;margin-top:-4px">по истории ПМ ≈ ${fmt(est)} кг (оценка по формуле Эпли)</small>`:''}</div>`}).join('')}</div></section>
 <section class="sec"><h2>Залы</h2>${live(db.gyms).map(g=>`<div class="grow"><input data-c="gym" data-id="${g.id}" value="${esc(g.name)}" aria-label="Название зала"><button class="btn sm danger" data-act="gymDel" data-id="${g.id}">${cf('g'+g.id,'Удалить','Точно?')}</button></div>`).join('')}
 <div class="add"><input id="newGym" placeholder="Новый зал" aria-label="Новый зал"><button class="btn" data-act="gymAdd">Добавить</button></div></section>
 ${vSync()}</div>`;
}

/* ---------- Перенос данных: экспорт и импорт ---------- */
const COLS=['exercises','gyms','programs','plans','sessions'];
let dl=null;try{window.claude?.use?.('downloads').then(d=>{dl=d},()=>{})}catch(e){}
function exportJSON(){return JSON.stringify({app:'training-diary',v:3,exported:new Date().toISOString(),perWeek:db.perWeek,data:Object.fromEntries(COLS.map(k=>[k,db[k]]))})}
/* то же правило, что и у синхронизации: по каждой записи побеждает более свежая правка */
function mergeData(inc){let n=0;COLS.forEach(k=>{(inc[k]||[]).forEach(r=>{const i=db[k].findIndex(x=>x.id===r.id);if(i<0){db[k].push(r);n++}else if((r.upd||0)>(db[k][i].upd||0)){db[k][i]=r;n++}})});return n}
function vTransfer(){
 return `<div class="wrap"><section class="sec sync"><h2>Перенос данных</h2>
 <p>Один файл со всем: программы, план, тренировки, справочник, залы. Отправь его себе в Telegram и открой на другом телефоне — без GitHub.</p>
 <div class="row" style="margin-top:0"><button class="btn pri" data-act="expFile">Поделиться файлом</button><button class="btn" data-act="expCopy">Скопировать как текст</button></div>
 <div class="ftitle" style="margin-top:16px">Загрузить</div>
 <div class="row" style="margin-top:8px"><label class="btn" style="display:inline-flex;align-items:center">Выбрать файл<input type="file" id="impFile" accept=".json,application/json" hidden></label></div>
 <textarea id="impText" placeholder="…или вставь сюда текст экспорта" style="margin-top:10px"></textarea>
 <div class="row"><button class="btn" data-act="impMerge">Объединить с текущими</button><button class="btn danger" data-act="impReplace">${cf('imp','Заменить всё','Точно заменить все данные?')}</button></div>
 <p class="hint">«Объединить» добавит новое и обновит записи, которые в файле свежее. Ничего не удалится.</p></section></div>`;
}
function readImport(){try{const o=JSON.parse(document.getElementById('impText').value);if(o?.app!=='training-diary'||!o.data)throw 0;return o}catch(e){toast('Это не файл дневника тренировок');return null}}

/* ---------- рендер ---------- */
const ROUTES=['workout','queue','plan','history','stats','library'];
function route(){const r=location.hash.slice(1);return ROUTES.includes(r)?r:'workout'}
function render(){
 const r=route(),y=scrollY;closePop();
 document.documentElement.dataset.style=style;
 document.querySelectorAll('.nav a').forEach(a=>a.classList.toggle('on',a.dataset.r===r||(r==='stats'&&a.dataset.r==='history')));
 document.getElementById('minis').innerHTML=STYLES.map(([k,n])=>`<button class="mini ${style===k?'on':''}" data-style="${k}" data-act="style" data-v="${k}" aria-label="Стиль «${n}»" title="${n}"><i></i></button>`).join('');
 chartRO.disconnect();
 main.innerHTML=r==='queue'?vQueue():r==='plan'?vPlan():r==='history'?vHistory():r==='stats'?hseg('stats')+vStats()+vMore():r==='library'?vLibrary()+vTransfer():(active()?vSession(active()):vStart());
 main.querySelectorAll('.fig').forEach(f=>chartRO.observe(f));
 scrollTo(0,y);
}
const go=h=>{if(location.hash==='#'+h)render();else location.hash=h};
addEventListener('hashchange',()=>{ui.hist=null;ui.planEdit=null;ui.openItem=null;render();scrollTo(0,0)});

/* ---------- ввод ---------- */
main.addEventListener('focusin',e=>{if(e.target.dataset?.combo)openCombo(e.target)});
main.addEventListener('input',e=>{if(e.target.dataset?.combo){e.target.dataset.typed=1;openCombo(e.target)}});
main.addEventListener('focusout',e=>{if(e.target.dataset?.combo&&popCtx?.anchor===e.target)setTimeout(()=>{if(popCtx?.anchor===e.target&&document.activeElement!==e.target)closePop()},120)});
main.addEventListener('change',e=>{
 const el=e.target;
 if(el.id==='impFile'){const f=el.files[0];if(!f)return;f.text().then(t=>{document.getElementById('impText').value=t;toast('Файл прочитан: выбери, объединить или заменить')});return}
 if(el.id==='gymIn'){const g=ensureGym(el.value);if(g)db.lastGym=g.id;save();return}
 if(el.id==='newEx'||el.id==='impText')return;
 const c=el.dataset.c,f=el.dataset.f;if(!c)return;
 const v=el.type==='checkbox'?el.checked:el.value.trim(),k=+el.dataset.k,s=active(),t=target();let re=false;
 if(c==='s'){if(f==='gym'){const g=ensureGym(v);s.gymId=g?.id||null;if(g)db.lastGym=g.id}else s[f]=f==='bodyWeight'?v.replace(',','.'):v;mark(s)}
 else if(c==='i'){s.items.find(i=>i.id===el.dataset.i)[f]=v;mark(s)}
 else if(c==='ss'){const x=s.items.find(i=>i.id===el.dataset.i).sets[k],o=el.dataset.d!=null?x.drops[+el.dataset.d]:x;o[f]=f==='w'?v.replace(',','.'):v;mark(s)}
 else if(c==='next'){const x=db.sessions.find(q=>q.id===el.dataset.id);x.next={...(x.next||{}),note:v,at:Date.now()};mark(x)}
 else if(c==='t'){t[f]=v;mark(t);re=f==='title'}
 else if(c==='pi'){const it=t.items[k];
  if(f==='base'){const ex=ensureEx(it.name);if(ex){ex.base=v;mark(ex)}re=true}
  else if(f==='lastMax'){it.lastMax=v;re=true}
  else{it[f]=f==='weight'?v.replace(',','.'):v;if(f==='name'&&it.kind==='ex')ensureEx(v);re=true}
  mark(t)}
 else if(c==='pt'){t.items[k].each[+el.dataset.j][f]=f==='w'?v.replace(',','.'):v;mark(t);re=true}
 else if(c==='pn'){t.items[k].names[+el.dataset.j]=v;ensureEx(v);mark(t);re=true}
 else if(c==='max'){const ex=ensureEx(t.items[k].name);if(ex){ex.max=v.replace(',','.');mark(ex)}re=true}
 else if(c==='ex'){const ex=db.exercises.find(x=>x.id===el.dataset.id);ex[f]=f==='max'?v.replace(',','.'):v;mark(ex);re=f!=='max'}
 else if(c==='cfg'){const cfg=syncCfg();cfg[f]=el.type==='checkbox'?el.checked:el.value.trim();setCfg(cfg);showSync(syncLine());return}
 else if(c==='gym'){const g=db.gyms.find(x=>x.id===el.dataset.id);if(v){g.name=v;mark(g)}}
 save();if(re)render();
});
main.addEventListener('click',e=>{const d=e.target.closest('[data-dd]');if(d){openDD(d);return}const b=e.target.closest('[data-act]');if(b)act(b)});
main.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.matches('[role=button][data-act]'))act(e.target)});
document.getElementById('minis').addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(b)act(b)});

function startSession(src,planId){
 const now=Date.now();
 const ns={id:uid(),planId:planId||null,programId:src?.programId??src?.id??null,title:src?.title||'Свободная тренировка',gymId:db.lastGym||null,start:now,end:null,bodyWeight:'',note:'',upd:now,feel:{before:0,after:0},
  warm:{n:src?(+src.warmup||0):3,done:0,start:null,end:null,skipped:false},items:(src?.items||[]).filter(i=>i.name||i.names?.length).map(mkItem)};
 if(planId){const q=db.plans.find(x=>x.id===planId);q.sessionId=ns.id;mark(q);ns.programId=q.programId}
 db.sessions.push(ns);db.activeId=ns.id;ui.finishing=false;save();toast(`Старт ${hm(now)}, ${WD[new Date(now).getDay()].toLowerCase()}`);go('workout');
}
function act(b){
 const a=b.dataset.act,s=active(),k=+b.dataset.k,t=target();
 const it=s&&b.dataset.i?s.items.find(i=>i.id===b.dataset.i):null;
 const now=Date.now();
 switch(a){
 case'style':style=b.dataset.v;try{localStorage.setItem(SKEY,style)}catch(e){}render();return;
 case'start':{if(s){toast('Сначала закончи текущую тренировку');go('workout');return}
  if(b.dataset.plan)return startSession(db.plans.find(x=>x.id===b.dataset.plan),b.dataset.plan);
  return startSession(progBy(b.dataset.prog))}
 case'finish':ui.finishing=true;render();main.querySelector('[data-act=finishOk]')?.scrollIntoView({block:'center',behavior:'smooth'});return;
 case'finishNo':ui.finishing=false;break;
 case'finishOk':{setTimeout(()=>runSync(false),800);s.end=now;s.items.forEach(i=>{if(i.start&&!i.end)i.end=now});if(s.warm.start&&!s.warm.end)s.warm.end=now;mark(s);db.activeId=null;ui.finishing=false;ui.hist=s.id;save();toast(`Тренировка записана: ${dur(s.start,s.end)}`);go('history');return}
 case'feel':{const v=+b.dataset.v,f=b.dataset.f;
  if(f==='next'){const x=b.closest('.panel').querySelector('[data-c=next]'),sx=db.sessions.find(q=>q.id===x.dataset.id);sx.next={...(sx.next||{}),rate:v,at:now};mark(sx);save();toast('Записал ощущения на следующий день');render();return}
  s.feel=s.feel||{};s.feel[f]=v;break}
 case'jump':document.getElementById('c-'+b.dataset.id)?.scrollIntoView({behavior:'smooth',block:'start'});return;
 case'wStart':s.warm.start=now;break;
 case'wEnd':s.warm.done=s.warm.n;s.warm.end=now;break;
 case'wSkip':s.warm.skipped=true;break;
 case'wUnskip':s.warm.skipped=false;break;
 case'wResume':s.warm.end=null;break;
 case'warm':{const w=s.warm;w.done=k<w.done?k:k+1;if(!w.start)w.start=now;w.end=w.done>=w.n?now:null;break}
 case'exStart':it.start=now;break;
 case'exEnd':it.end=now;ui.open.delete(it.id);toast(`${it.name}: ${hm(it.start)}–${hm(now)}`);break;
 case'exResume':it.end=null;break;
 case'toggle':ui.open.has(it.id)?ui.open.delete(it.id):ui.open.add(it.id);render();return;
 case'rmEx':return confirm2('rm'+it.id,()=>{s.items=s.items.filter(i=>i!==it);mark(s);save()});
 case'useSugg':it.sets.forEach(x=>{if(!x.done)x.w=String(b.dataset.w)});toast(`Вес ${fmt(b.dataset.w)} кг подставлен`);break;
 case'addSet':{const l=it.sets[it.sets.length-1];it.sets.push({pw:l?.w||'',pr:l?.pr||'',pl:'',w:l?.w||'',r:l?.r||'',m:0,n:'',done:false,t:null,prev:null,drops:(l?.drops||[]).map(d=>({pw:d.w,w:d.w,r:''}))});if(!it.start)it.start=now;break}
 case'tick':{const x=it.sets[k];
  if(x.done){x.done=false;x.t=null}
  else{if(!x.r)x.r=first(x.pr)||'';x.drops.forEach(d=>{if(!d.r)d.r=x.r});x.done=true;x.t=now;if(!it.start)it.start=now;
   if(it.sets.every(y=>y.done))toast('Все подходы сделаны: можно завершить упражнение')}
  break}
 case'mood':it.sets[k].m=+b.dataset.m;break;
 case'addDrop':{const x=it.sets[k],l=x.drops[x.drops.length-1],w=String(r25(num(l?l.w:x.w)/2)||'');x.drops.push({pw:w,w,r:''});break}
 case'rmDrop':it.sets[k].drops.splice(+b.dataset.d,1);break;
 case'note':ui.notes.add(it.id+':'+k);render();main.querySelector(`input[data-i="${it.id}"][data-k="${k}"][data-f="n"]`)?.focus();return;
 case'addEx':{const inp=document.getElementById('newEx'),n=inp.value.trim();if(!n){inp.focus();return}
  const tpl=live(db.programs).flatMap(x=>x.items).find(i=>i.name.toLowerCase()===n.toLowerCase());
  if(!tpl)ensureEx(n);s.items.push(mkItem(tpl||PI(n,{s:3})));break}
 /* план */
 case'qEdit':ui.planEdit=b.dataset.id;ui.openItem=null;if(route()!=='queue'){location.hash='queue';setTimeout(()=>{ui.planEdit=b.dataset.id;render()},0)}else{render();scrollTo(0,0)}return;
 case'qBack':ui.planEdit=null;ui.openItem=null;render();return;
 case'qUp':case'qDown':{const q=queue(),i=q.findIndex(x=>x.id===b.dataset.id),j=a==='qUp'?i-1:i+1;if(j<0||j>=q.length)return;[q[i].ord,q[j].ord]=[q[j].ord,q[i].ord];mark(q[i]);mark(q[j]);break}
 case'qDel':return confirm2('qd'+b.dataset.id,()=>{const q=db.plans.find(x=>x.id===b.dataset.id);q.deleted=true;mark(q);ui.planEdit=null;save()});
 case'qReset':{const p=progBy(t.programId);t.items=copyItems(p.items);t.desc=p.desc;mark(t);toast('Как в программе');break}
 case'serTog':{const ids=ui.series.progs,i=ids.indexOf(b.dataset.id);i>=0?ids.splice(i,1):ids.push(b.dataset.id);render();return}
 case'serAdd':{const seq=seriesIds();seq.forEach(id=>addPlan(id,true));toast(`Добавлено в план: ${seq.length}`);break}
 case'step':{const f=b.dataset.f,d=+b.dataset.d;
  if(f==='warmup'){t.warmup=Math.max(0,Math.min(6,(+t.warmup||0)+d));mark(t)}
  else if(f==='sets'){const x=t.items[k];x.sets=Math.max(1,Math.min(12,(+x.sets||1)+d));mark(t)}
  else if(f==='perWeek')db.perWeek=Math.max(1,Math.min(7,(db.perWeek||3)+d));
  else if(f==='seriesN'){ui.series.n=Math.max(1,Math.min(30,ui.series.n+d));render();return}
  break}
 /* программы и редактор пунктов (программа или тренировка из плана) */
 case'selProg':ui.prog=b.dataset.id;ui.openItem=null;render();return;
 case'newProg':{const np={id:uid(),title:'Новая программа',desc:'',warmup:3,upd:now,items:[PI('')]};db.programs.push(np);ui.prog=np.id;ui.openItem=np.items[0].id;ui.series.progs.push(np.id);save();render();return}
 case'delProg':return confirm2('dp'+t.id,()=>{t.deleted=true;mark(t);ui.prog=live(db.programs)[0]?.id;save()});
 case'toPlan':addPlan(t.id);break;
 case'openItem':ui.openItem=ui.openItem===b.dataset.id?null:b.dataset.id;render();return;
 case'piUp':case'piDown':{const j=a==='piUp'?k-1:k+1;if(j<0||j>=t.items.length)return;[t.items[k],t.items[j]]=[t.items[j],t.items[k]];mark(t);break}
 case'piDel':{const x=t.items[k];return confirm2('pi'+k+x.id,()=>{t.items.splice(k,1);mark(t);save()})}
 case'piAdd':{const x=PI('');t.items.push(x);ui.openItem=x.id;mark(t);break}
 case'piAddCombo':{const x=PI('Связка',{names:['',''],w:'',r:'12',s:3});t.items.push(x);ui.openItem=x.id;mark(t);break}
 case'piSet':{const x=t.items[k],f=b.dataset.f,v=b.dataset.v;x[f]=v;
  if(f==='kind'&&v==='combo'&&!x.names.length)x.names=[x.name||'',''];
  if(f==='kind'&&v==='ex'&&!x.name)x.name=x.names[0]||'';
  if(f==='mode'&&v==='each'&&!x.each.length)x.each=planSets({...x,mode:'same'}).map(p=>({w:first(p.w),r:p.r}));
  mark(t);break}
 case'piSugg':itemSugg(t.items[k])?.apply();mark(t);toast('Подсказка применена');break;
 case'allSugg':{let n=0;t.items.forEach(x=>{const sg=itemSugg(x);if(sg){sg.apply();n++}});mark(t);toast(`Применено подсказок: ${n}`);break}
 case'ptAdd':{const e=t.items[k].each,l=e[e.length-1];e.push({w:l?String(num(l.w)+(num(l.w)>=40?10:2.5)):'',r:l?.r||'8'});mark(t);break}
 case'ptDel':t.items[k].each.splice(+b.dataset.j,1);mark(t);break;
 case'pnAdd':t.items[k].names.push('');mark(t);break;
 case'pnDel':t.items[k].names.splice(+b.dataset.j,1);mark(t);break;
 /* история */
 case'hist':ui.hist=b.dataset.id;render();scrollTo(0,0);return;
 case'back':ui.hist=null;render();return;
 case'delS':return confirm2('ds'+b.dataset.id,()=>{const x=db.sessions.find(q=>q.id===b.dataset.id);x.deleted=true;mark(x);ui.hist=null;save()});
 case'toProg':{const src=db.sessions.find(x=>x.id===b.dataset.id);
  const np={id:uid(),title:src.title+' (копия)',desc:'',warmup:src.warm?.n??3,upd:now,items:src.items.map(i=>{const dn=i.sets.filter(x=>x.done);
   if(i.kind==='combo')return PI(i.name,{names:i.names,w:dn[0]?.w||'',r:dn[0]?.r||'',s:dn.length||3});
   return PI(i.name,{mode:'each',each:dn.map(x=>[x.w,x.r])})})};
  db.programs.push(np);ui.prog=np.id;save();toast('Программа создана');go('plan');return}
 /* справочник и перенос */
 case'libAdd':{const inp=document.getElementById('newLib');if(!inp.value.trim()){inp.focus();return}ensureEx(inp.value);break}
 case'libDel':return confirm2('le'+b.dataset.id,()=>{const x=db.exercises.find(q=>q.id===b.dataset.id);x.deleted=true;mark(x);save()});
 case'gymAdd':{const inp=document.getElementById('newGym');if(!inp.value.trim()){inp.focus();return}ensureGym(inp.value);break}
 case'gymDel':return confirm2('g'+b.dataset.id,()=>{const x=db.gyms.find(q=>q.id===b.dataset.id);x.deleted=true;mark(x);save()});
 case'sync':runSync(true);return;
 case'updCheck':checkUpdate(true);return;
 case'syncCheck':{const ref=repoRef(syncCfg());if(!ref){toast('Укажи репозиторий и токен');return}showSync('Проверяю доступ…');checkAccess(ref).then(r=>{showSync(r.message);toast(r.message)});return}
 case'expCopy':if(window.AndroidBridge){window.AndroidBridge.copyText(exportJSON());toast('Скопировано: вставь в Telegram или заметку');return}
  navigator.clipboard?.writeText(exportJSON()).then(()=>toast('Скопировано: вставь в Telegram или заметку'),()=>{document.getElementById('impText').value=exportJSON();toast('Буфер недоступен: текст положен в поле ниже')});return;
 case'expFile':{const name=`trenirovki-${new Date().toISOString().slice(0,10)}.json`,data=exportJSON();
  if(window.AndroidBridge){window.AndroidBridge.shareFile(name,data);return}
  try{const f=new File([data],name,{type:'application/json'});if(navigator.canShare?.({files:[f]})){navigator.share({files:[f],title:'Дневник тренировок'}).then(()=>toast('Готово'),e=>{if(e?.name!=='AbortError')toast('Не получилось поделиться')});return}}catch(e){}
  if(dl){dl.save({filename:name,data}).then(()=>toast('Файл сохранён'),()=>toast('Сохранение отменено'));return}
  if(window.claude){toast('Здесь файлы не сохраняются: используй «Скопировать как текст»');return}
  const u=URL.createObjectURL(new Blob([data],{type:'application/json'})),l=document.createElement('a');l.href=u;l.download=name;document.body.appendChild(l);l.click();l.remove();setTimeout(()=>URL.revokeObjectURL(u),2000);toast('Файл отправлен на скачивание');return}
 case'impMerge':{const o=readImport();if(!o)return;const n=mergeData(o.data);save();toast(`Объединено, обновлено записей: ${n}`);break}
 case'impReplace':{const o=readImport();if(!o)return;return confirm2('imp',()=>{COLS.forEach(k=>db[k]=o.data[k]||[]);db.perWeek=o.perWeek||3;db.activeId=null;save();toast('Данные заменены')})}
 }
 if(s)mark(s);save();render();
}
setInterval(()=>{document.querySelectorAll('[data-clock]').forEach(el=>el.textContent=dur(+el.dataset.clock,Date.now()));document.querySelectorAll('[data-since]').forEach(el=>el.textContent=rest(+el.dataset.since))},1000);
render();

/* ---------- синхронизация с GitHub ---------- */
function syncCfg(){const d={repo:'Bablakov/training-data',token:'',auto:true};try{return {...d,...JSON.parse(localStorage.getItem(CFGKEY)||'{}')}}catch(e){return d}}
function setCfg(c){try{localStorage.setItem(CFGKEY,JSON.stringify(c))}catch(e){}}
function syncState(){try{return JSON.parse(localStorage.getItem(STATEKEY)||'{}')}catch(e){return {}}}
function setState(x){try{localStorage.setItem(STATEKEY,JSON.stringify(x))}catch(e){}}
function repoRef(c){const [owner,repo]=String(c.repo||'').trim().split('/');return owner&&repo&&c.token?{owner,repo,branch:'main',token:String(c.token).trim()}:null}
var syncing=false,syncTimer=null,pendingRender=false;
function pendingCount(){const last=syncState().last||0;return ['exercises','gyms','programs','plans','sessions'].reduce((n,k)=>n+db[k].filter(r=>(r.upd||0)>last).length,0)}
function syncLine(){const st=syncState(),n=pendingCount();if(syncing)return 'Синхронизирую…';if(!repoRef(syncCfg()))return 'Синхронизация не настроена: данные только на этом устройстве';
 return `${st.last?`Последняя синхронизация ${dShort(st.last)} в ${hm(st.last)}: ${st.msg}`:st.msg||'Ещё не синхронизировалось'}${n?` · не отправлено: ${n}`:''}`}
function showSync(msg){const a=document.getElementById('syncMsg');if(a)a.textContent=msg;const b=document.getElementById('syncNav');if(b)b.textContent=msg}
function scheduleSync(){const c=syncCfg();if(!c.auto||!repoRef(c))return;clearTimeout(syncTimer);syncTimer=setTimeout(()=>runSync(false),30000)}
async function runSync(manual){
 const c=syncCfg(),ref=repoRef(c);
 if(!ref){if(manual)toast('Укажи репозиторий и токен в Справочнике');return}
 if(syncing)return;
 if(!navigator.onLine){if(manual)toast('Нет сети: синхронизирую, когда появится');return}
 syncing=true;clearTimeout(syncTimer);const started=Date.now();showSync('Синхронизирую…');
 try{
  const r=await syncData(ref,db,m=>showSync(m));persist(db);
  const msg=r.pulled||r.pushed?`получено ${r.pulled}, отправлено ${r.pushed}`:'всё совпадает';
  setState({last:started,msg,ok:true});if(manual)toast(`Синхронизировано: ${msg}`);
  if(r.pulled){
   if(!live(db.programs).some(p=>p.id===ui.prog))ui.prog=live(db.programs)[0]?.id;
   const f=document.activeElement;if(f&&main.contains(f)&&f.matches('input,textarea'))pendingRender=true;else render();
  }
 }catch(e){setState({...syncState(),msg:'ошибка: '+(e?.message||e),ok:false});if(manual)toast(e?.message||'Не получилось синхронизировать')}
 finally{syncing=false;showSync(syncLine())}
}
function vSync(){const c=syncCfg();
 return `${update?`<div class="sugg" style="margin-top:28px">Доступна новая версия <b>${esc(update.v)}</b> (у тебя ${__APP_VERSION__}).<a class="btn sm pri" href="${esc(update.url)}" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;text-decoration:none">Скачать</a><a href="${esc(update.notes)}" target="_blank" rel="noopener">Что нового</a></div>`:''}<section class="sec sync"><h2>Синхронизация через GitHub</h2>
 <p>Всё хранится на этом устройстве и работает без интернета. Синхронизация сводит данные с другими устройствами через твой приватный репозиторий: каждая запись лежит отдельным файлом, а если одну и ту же правили в двух местах, остаётся более свежая правка.</p>
 <div class="frow"><label class="fl">Репозиторий<input data-c="cfg" data-f="repo" value="${esc(c.repo)}" placeholder="владелец/репозиторий" autocomplete="off" autocapitalize="off" spellcheck="false"></label>
 <label class="fl">Токен<input type="password" data-c="cfg" data-f="token" value="${esc(c.token)}" placeholder="github_pat_…" autocomplete="off" autocapitalize="off" spellcheck="false"></label></div>
 <p class="hint">Fine-grained токен с доступом только к этому репозиторию и правом Contents: Read and write. Хранится только на этом устройстве и в экспорт не попадает.</p>
 <label class="toggle" style="margin-top:10px;white-space:normal"><input type="checkbox" data-c="cfg" data-f="auto" ${c.auto?'checked':''}>Синхронизировать автоматически: при открытии, после тренировки и через полминуты после правок</label>
 <div class="row"><button class="btn pri" data-act="sync">Синхронизировать сейчас</button><button class="btn" data-act="syncCheck">Проверить доступ</button></div>
 <p class="hint" id="syncMsg" style="margin-top:10px">${esc(syncLine())}</p><p class="hint">Версия ${__APP_VERSION__} · ${{web:'сайт',android:'Android',desktop:'Windows'}[__PLATFORM__]}</p>${__PLATFORM__==='web'?'':`<div class="row"><button class="btn sm" data-act="updCheck">Проверить обновления</button></div>`}</section>`}
main.addEventListener('focusout',()=>setTimeout(()=>{const f=document.activeElement;if(pendingRender&&!(f&&main.contains(f)&&f.matches('input,textarea'))){pendingRender=false;render()}},150));
requestPersist();
showSync(syncLine());
const autoSync=()=>{if(syncCfg().auto)runSync(false)};
if(!stored)loadBackup().then(b=>{if(b){db=b;ui.prog=live(db.programs)[0]?.id;ui.series.progs=live(db.programs).map(p=>p.id);render();toast('Данные восстановлены из резервной копии')}}).finally(()=>setTimeout(autoSync,800));
else setTimeout(autoSync,1500);
addEventListener('online',autoSync);
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&Date.now()-(syncState().last||0)>120000)autoSync()});

/* ---------- обновления: Windows и Android сообщают о новой версии сами (сайт обновляется без этого) ---------- */
const RELEASES='Bablakov/training-diary-app';
var update=null;
function verNewer(a,b){const x=String(a).replace(/^v/,'').split('.').map(n=>+n||0),y=String(b).split('.').map(n=>+n||0);for(let i=0;i<3;i++){if((x[i]||0)!==(y[i]||0))return (x[i]||0)>(y[i]||0)}return false}
async function checkUpdate(manual){
 if(__PLATFORM__==='web')return;
 if(!navigator.onLine){if(manual)toast('Нет сети');return}
 try{
  const r=await fetch(`https://api.github.com/repos/${RELEASES}/releases/latest`,{headers:{Accept:'application/vnd.github+json'}});
  if(!r.ok)throw new Error('GitHub ответил '+r.status);
  const j=await r.json(),ext=__PLATFORM__==='android'?'.apk':'.exe',a=(j.assets||[]).find(x=>x.name.endsWith(ext));
  if(!verNewer(j.tag_name,__APP_VERSION__)){update=null;if(manual)toast(`У тебя последняя версия ${__APP_VERSION__}`);return}
  update={v:String(j.tag_name).replace(/^v/,''),url:a?.browser_download_url||j.html_url,notes:j.html_url};
  toast(`Доступна версия ${update.v}: Справочник → Скачать`);
  if(route()==='library'&&!main.contains(document.activeElement))render();
 }catch(e){if(manual)toast('Не удалось проверить обновления')}
}
setTimeout(()=>checkUpdate(false),4000);

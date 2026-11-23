
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

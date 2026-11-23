
/* ---------- Перенос данных: экспорт и импорт ---------- */
const COLS=['exercises','gyms','programs','plans','sessions'];
let dl=null;try{window.claude?.use?.('downloads').then(d=>{dl=d},()=>{})}catch(e){}
function exportJSON(){return JSON.stringify({app:'training-diary',v:3,exported:new Date().toISOString(),perWeek:db.perWeek,data:Object.fromEntries(COLS.map(k=>[k,db[k]]))})}
/* то же правило, что и у синхронизации: по каждой записи побеждает более свежая правка */
function mergeData(inc){let n=0;COLS.forEach(k=>{(inc[k]||[]).forEach(r=>{const i=db[k].findIndex(x=>x.id===r.id);if(i<0){db[k].push(r);n++}else if((r.upd||0)>(db[k][i].upd||0)){db[k][i]=r;n++}})});return n}
function vTransfer(){
 return `<div class="wrap"><section class="sec sync"><h2>Перенос данных</h2>
 <p>Один файл со всем: программы, план, тренировки, справочник, залы. Отправь его себе в Telegram и открой на другом телефоне — без GitHub.</p>
 <div class="row" style="margin-top:0"><button class="btn pri" data-act="expFile">Сохранить файл</button><button class="btn" data-act="expCopy">Скопировать как текст</button></div>
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
 case'finishOk':{s.end=now;s.items.forEach(i=>{if(i.start&&!i.end)i.end=now});if(s.warm.start&&!s.warm.end)s.warm.end=now;mark(s);db.activeId=null;ui.finishing=false;ui.hist=s.id;save();toast(`Тренировка записана: ${dur(s.start,s.end)}`);go('history');return}
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
 case'sync':toast('В прототипе синхронизация выключена: в приложении изменения уйдут на GitHub');return;
 case'expCopy':navigator.clipboard?.writeText(exportJSON()).then(()=>toast('Скопировано: вставь в Telegram или заметку'),()=>{document.getElementById('impText').value=exportJSON();toast('Буфер недоступен: текст положен в поле ниже')});return;
 case'expFile':{const name=`trenirovki-${new Date().toISOString().slice(0,10)}.json`,data=exportJSON();
  if(dl){dl.save({filename:name,data}).then(()=>toast('Файл сохранён'),()=>toast('Сохранение отменено'));return}
  if(window.claude){toast('Здесь файлы не сохраняются: используй «Скопировать как текст»');return}
  const u=URL.createObjectURL(new Blob([data],{type:'application/json'})),l=document.createElement('a');l.href=u;l.download=name;document.body.appendChild(l);l.click();l.remove();setTimeout(()=>URL.revokeObjectURL(u),2000);toast('Файл отправлен на скачивание');return}
 case'impMerge':{const o=readImport();if(!o)return;const n=mergeData(o.data);save();toast(`Объединено, обновлено записей: ${n}`);break}
 case'impReplace':{const o=readImport();if(!o)return;return confirm2('imp',()=>{COLS.forEach(k=>db[k]=o.data[k]||[]);db.perWeek=o.perWeek||3;db.activeId=null;save();toast('Данные заменены')})}
 case'reset':return confirm2('reset',()=>{db=seed3();ui.prog=db.programs[0].id;ui.hist=null;ui.planEdit=null;ui.series.progs=live(db.programs).map(p=>p.id);save()});
 }
 if(s)mark(s);save();render();
}
setInterval(()=>{document.querySelectorAll('[data-clock]').forEach(el=>el.textContent=dur(+el.dataset.clock,Date.now()));document.querySelectorAll('[data-since]').forEach(el=>el.textContent=rest(+el.dataset.since))},1000);
render();
}
</script>
</body>
</html>

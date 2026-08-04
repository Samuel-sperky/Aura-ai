/* ══════════════════════════════════════════════════════════════
   AURA SUITE KIT — časť 2/2: interaktívna vrstva
   Shop API konektor · import wizard · report builder ·
   AuraAI panel · samostatná chatová appka.
   ══════════════════════════════════════════════════════════════ */

/* ── Shop API konektor ─────────────────────────────────────── */
const CT0=[9,41];
function connTime(){const m=(CT0[1]+state.conn.tick*3)%60,h=(CT0[0]+Math.floor((CT0[1]+state.conn.tick*3)/60))%24;
  return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');}
function connPill(){
  if(!APP.api)return '<div class="gspace"></div>';
  const out=state.conn.out;
  const tone=out?'no':(APP.api.tone||'ok');
  const txt=out?(state.lang==='sk'?'API nedostupné · z cache':'API down · from cache')
    :(state.lang==='sk'?'LIVE · sync '+connTime():'LIVE · sync '+connTime());
  return `<button class="cn-pill ${tone}" onclick="openConn()" title="${state.lang==='sk'?'Stav Shop API':'Shop API status'}">
    <span class="cn-dot"></span>${esc(txt)}</button>`;
}
function openConn(){
  closeOverlay();scrim();state.overlay='modal';
  const eps=(APP.api.endpoints||[]);
  const el=document.createElement('div');el.className='modal';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');
  el.innerHTML=`<div class="mh"><h3>Shop API</h3><button class="x" onclick="closeOverlay()" aria-label="${state.lang==='sk'?'Zavrieť':'Close'}">${svg('x',16)}</button></div>
    <div class="mb">
      <div class="glist">${eps.map(e=>`<div class="gi"><div class="gx"><b>${esc(e.k)}</b><small>${esc(tr(e.l))}</small></div>
        <span class="badge ${state.conn.out?'no':'ok'}">${state.conn.out?(state.lang==='sk'?'nedostupné':'down'):(state.lang==='sk'?'live':'live')}</span>
        <span class="gm">${state.conn.out?'—':(e.ms||120)+' ms'}</span></div>`).join('')}</div>
      <div class="hm-note">${state.lang==='sk'?'Posledný sync':'Last sync'}: ${connTime()} · ${state.lang==='sk'?'keš 30 s · timeout 4 s':'30 s cache · 4 s timeout'}</div>
      <div class="grow" style="border:0;padding-top:6px"><div class="gfl"><b>${state.lang==='sk'?'Simulovať výpadok':'Simulate outage'}</b>
        <small>${state.lang==='sk'?'appka musí zobraziť dôvod, nie staré číslo':'the app must show the reason, never a stale number'}</small></div>
        <button class="sw" role="switch" aria-checked="${state.conn.out}" onclick="connOut()"></button></div>
    </div>
    <div class="mf"><button class="btn" onclick="closeOverlay()">${state.lang==='sk'?'Zavrieť':'Close'}</button>
      <button class="btn pri" onclick="connSync()">${svg('refresh',14)} ${state.lang==='sk'?'Synchronizovať teraz':'Sync now'}</button></div>`;
  document.body.appendChild(el);
}
function connSync(){
  state.conn.tick++;
  const r=mulberry32(hashStr(APP.key+state.conn.tick))();
  const j=((r*4)-2).toFixed(1);
  audit(L('Sync Shop API','Shop API sync'),(state.lang==='sk'?'odchýlka ':'delta ')+j+' %');
  closeOverlay();route();
  toast((state.lang==='sk'?'Synchronizované · odchýlka ':'Synced · delta ')+j+' %');
}
function connOut(){state.conn.out=!state.conn.out;closeOverlay();route();
  toast(state.conn.out?(state.lang==='sk'?'Simulujem výpadok API':'Simulating API outage'):(state.lang==='sk'?'API opäť live':'API live again'));}

/* ── Import wizard ─────────────────────────────────────────── */
let IW=null;
function openImport(){
  if(!APP.imp){toast(state.lang==='sk'?'Táto appka import nemá':'This app has no import');return;}
  closeOverlay();scrim();state.overlay='modal';
  IW={step:1,file:'',rows:null,head:null,map:null,errs:[]};
  const el=document.createElement('div');el.className='modal iw-modal';el.id='iwm';
  el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');
  document.body.appendChild(el);iwDraw();
}
function iwSteps(){
  const S=[L('Súbor','File'),L('Mapovanie','Mapping'),L('Validácia','Validation'),L('Súhrn','Summary')];
  return `<div class="iw-steps">${S.map((s,i)=>`<div class="iw-step ${IW.step===i+1?'on':''} ${IW.step>i+1?'done':''}">
    <b>${i+1}</b><span>${esc(tr(s))}</span></div>`).join('')}</div>`;
}
function iwParse(text){
  const lines=text.replace(/^﻿/,'').split(/\r?\n/).filter(l=>l.trim());
  const d=(lines[0].split(';').length>=lines[0].split(',').length)?';':',';
  const head=lines[0].split(d).map(h=>h.trim());
  const rows=lines.slice(1).map(l=>l.split(d).map(c=>c.trim()));
  return {head,rows,d};
}
function iwDraw(){
  const el=document.getElementById('iwm');if(!el)return;
  const cols=APP.imp.cols||[];
  let body='';
  if(IW.step===1){
    body=`<div class="iw-drop" onclick="document.getElementById('iwf').click()">
        ${svg('dl',22)}<b>${state.lang==='sk'?'Vyber CSV súbor':'Choose a CSV file'}</b>
        <small>${state.lang==='sk'?'oddelovač ; alebo , · BOM sa odstráni · nič sa nikam neposiela':'delimiter ; or , · BOM stripped · nothing leaves your machine'}</small></div>
      <input type="file" id="iwf" accept=".csv,text/csv" style="display:none" onchange="iwFile(this)">
      <button class="btn" onclick="iwSample()">${svg('doc',14)} ${state.lang==='sk'?'Použiť vzorový súbor':'Use the sample file'}</button>
      <div class="hm-note">${state.lang==='sk'?'Očekávané stĺpce':'Expected columns'}: ${cols.map(c=>esc(c.k)).join(' · ')}</div>`;
  }else if(IW.step===2){
    body=`<div class="iw-map">${cols.map((c,i)=>{const auto=IW.map[i];
      return `<div class="iw-item"><span>${esc(tr(c.l))} <i>${esc(c.k)}</i></span><span class="iw-arr">→</span>
        <b class="${auto!=null?'iw-auto':'iw-skip'}">${auto!=null?esc(IW.head[auto]):(state.lang==='sk'?'nenájdené':'not found')}</b></div>`;}).join('')}</div>
      <div class="hm-note">${state.lang==='sk'?'Automatické priradenie podľa hlavičky súboru. Nenájdené stĺpce sa preskočia.':'Auto-matched from the file header. Missing columns are skipped.'}</div>`;
  }else if(IW.step===3){
    const ok=IW.rows.length-IW.errs.length;
    body=`<div class="kpis" style="grid-template-columns:repeat(3,1fr);margin:0 0 12px">
        ${kpiCard({l:L('Riadkov v súbore','Rows in file'),v:String(IW.rows.length)})}
        ${kpiCard({l:L('Bez chyby','Valid'),v:String(ok),tone:'ok'})}
        ${kpiCard({l:L('S chybou','With errors'),v:String(IW.errs.length),tone:IW.errs.length?'no':null})}</div>
      ${IW.errs.length?`<div class="tbl-wrap"><table class="t"><thead><tr>
        <th>${state.lang==='sk'?'Riadok':'Row'}</th><th>${state.lang==='sk'?'Stĺpec':'Column'}</th><th>${state.lang==='sk'?'Hodnota':'Value'}</th><th>${state.lang==='sk'?'Problém':'Problem'}</th></tr></thead>
        <tbody>${IW.errs.slice(0,8).map(e=>`<tr style="cursor:default"><td class="n">${e.r}</td><td>${esc(e.c)}</td><td>${esc(e.v)}</td>
          <td><span class="badge no">${esc(tr(e.m))}</span></td></tr>`).join('')}</tbody></table></div>`
        :`<div class="banner ok" style="margin:0">${svg('check')}<span>${state.lang==='sk'?'Všetky riadky prešli typovou kontrolou.':'All rows passed the type check.'}</span></div>`}
      <div class="hm-note">${state.lang==='sk'?'Riadky s chybou sa nezapíšu — zvyšok sa upsertne.':'Rows with errors are skipped — the rest is upserted.'}</div>`;
  }else{
    const ok=IW.rows.length-IW.errs.length;
    body=`<div class="banner ok" style="margin:0 0 12px">${svg('check')}<span>${state.lang==='sk'?'Pripravené na zápis':'Ready to apply'}: ${ok} ${state.lang==='sk'?'riadkov':'rows'}</span></div>
      <div class="glist">${(APP.imp.key||[]).map(k=>`<div class="gi"><div class="gx"><b>${esc(tr(k))}</b>
        <small>${state.lang==='sk'?'existujúci záznam sa prepíše, nový sa pridá':'existing records are overwritten, new ones added'}</small></div></div>`).join('')}</div>
      <div class="hm-note">${state.lang==='sk'?'Po zápise sa zobrazí pás s možnosťou Vrátiť. História importov je v Nastaveniach.':'After applying you get an Undo bar. Import history lives in Settings.'}</div>`;
  }
  el.innerHTML=`<div class="mh"><h3>${state.lang==='sk'?'Import dát':'Data import'}</h3>
      <span class="badge q mono">${esc(APP.name)}</span>
      <button class="x" onclick="closeOverlay()" aria-label="${state.lang==='sk'?'Zavrieť':'Close'}">${svg('x',16)}</button></div>
    <div class="mb">${iwSteps()}${body}</div>
    <div class="mf">
      ${IW.step>1?`<button class="btn" onclick="iwStep(-1)">${state.lang==='sk'?'Späť':'Back'}</button>`:''}
      <button class="btn" onclick="closeOverlay()">${state.lang==='sk'?'Zrušiť':'Cancel'}</button>
      ${IW.step<4?`<button class="btn pri" ${IW.rows?'':'disabled'} onclick="iwStep(1)">${state.lang==='sk'?'Ďalej':'Next'}</button>`
        :`<button class="btn pri" onclick="iwApply()">${svg('check',14)} ${state.lang==='sk'?'Zapísať':'Apply'}</button>`}</div>`;
}
function iwSample(){const p=iwParse(APP.imp.csv||'');iwLoad(p,state.lang==='sk'?'vzor.csv':'sample.csv');}
function iwFile(inp){const f=inp.files&&inp.files[0];if(!f)return;
  const r=new FileReader();r.onload=()=>{iwLoad(iwParse(String(r.result)),f.name);};r.readAsText(f,'utf-8');}
function iwLoad(p,name){
  IW.head=p.head;IW.rows=p.rows;IW.file=name;
  const cols=APP.imp.cols||[];
  IW.map=cols.map(c=>{const i=p.head.findIndex(h=>h.toLowerCase().replace(/[^a-z0-9]/g,'')===c.k.toLowerCase().replace(/[^a-z0-9]/g,''));return i<0?null:i;});
  IW.errs=[];
  IW.rows.forEach((row,ri)=>cols.forEach((c,ci)=>{const mi=IW.map[ci];if(mi==null)return;
    const v=row[mi]==null?'':row[mi];
    if(c.t==='num'&&v!==''&&isNaN(Number(v.replace(',','.'))))IW.errs.push({r:ri+2,c:c.k,v,m:L('nie je číslo','not a number')});
    if(v===''&&c.req)IW.errs.push({r:ri+2,c:c.k,v:'—',m:L('povinné pole','required')});}));
  IW.step=2;iwDraw();
}
function iwStep(d){IW.step=Math.max(1,Math.min(4,IW.step+d));iwDraw();}
function iwApply(){
  const cols=APP.imp.cols||[];
  const good=IW.rows.filter((_,ri)=>!IW.errs.some(e=>e.r===ri+2));
  const target=APP.imp.target||screensOf()[1]||screensOf()[0];
  const s=scr(target);const bi=(s.blocks||[]).findIndex(b=>b.t==='table');
  if(bi>=0){const id=target+'-'+bi;const b=s.blocks[bi];
    const rows=good.slice(0,8).map(r=>({c:b.cols.map((_,ci)=>{const mi=IW.map[ci];
      const v=mi!=null&&r[mi]!=null?r[mi]:'—';
      return ci===b.cols.length-1?['q',L('z importu','imported')]:v;})}));
    state.extra[id]=(state.extra[id]||[]).concat(rows);}
  state.imp.last={s:target,n:good.length,f:IW.file};
  state.imp.hist.unshift({f:IW.file,n:good.length,t:connTime(),e:IW.errs.length});
  audit(L('Import','Import'),IW.file+' · '+good.length+(state.lang==='sk'?' riadkov':' rows'));
  closeOverlay();go('#'+target);route();
  toast((state.lang==='sk'?'Zapísané: ':'Applied: ')+good.length+(state.lang==='sk'?' riadkov':' rows'));
}
function impUndo(){
  const l=state.imp.last;if(!l)return;
  const s=scr(l.s);const bi=(s.blocks||[]).findIndex(b=>b.t==='table');
  if(bi>=0)state.extra[l.s+'-'+bi]=[];
  state.imp.last=null;audit(L('Import vrátený','Import undone'),l.f);route();
  toast(state.lang==='sk'?'Import vrátený':'Import undone');
}

/* ── Report builder ────────────────────────────────────────── */
let RB=null;
function openReport(){
  if(!APP.rep){toast(state.lang==='sk'?'Táto appka reporty nemá':'This app has no reports');return;}
  closeOverlay();scrim();state.overlay='modal';
  RB={t:0,per:state.lang==='sk'?'júl 2026':'July 2026',sec:{kpi:true,chart:true,table:true,find:true}};
  const el=document.createElement('div');el.className='modal';el.id='rbm';el.style.width='760px';
  el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');
  document.body.appendChild(el);rbDraw();
}
function rbDraw(){
  const el=document.getElementById('rbm');if(!el)return;
  const T=APP.rep.templates||[];const t=T[RB.t]||T[0];
  const s=scr(screensOf()[0]);
  const kpi=(s.blocks||[]).find(b=>b.t==='kpis');
  const ch=(s.blocks||[]).find(b=>['bars','lines','stack','donut'].includes(b.t));
  const tb=(s.blocks||[]).find(b=>b.t==='table');
  const prev=`<div class="rb-prev" id="rbPrev">
    <div class="rb-head"><b>${esc(tr(t.l))}</b><span>${esc(APP.name)} · ${esc(RB.per)}</span></div>
    ${RB.sec.kpi&&kpi?`<div class="rb-kpis">${kpi.items.slice(0,4).map(k=>`<div class="rb-kpi"><span>${esc(tr(k.l))}</span><b>${esc((k.v&&k.v.t)?fmtCell(k.v):tr(k.v))}</b></div>`).join('')}</div>`:''}
    ${RB.sec.chart&&ch?`<div style="margin:10px 0">${ch.t==='bars'?bars(ch.data):ch.t==='lines'?lines(ch):ch.t==='stack'?stackChart(ch):donut(ch.pct,ch.label)}</div>`:''}
    ${RB.sec.table&&tb?`<div class="rb-tblw"><table class="t"><thead><tr>${tb.cols.map(c=>`<th>${esc(tr(c))}</th>`).join('')}</tr></thead>
      <tbody>${tb.rows.slice(0,6).map(r=>`<tr style="cursor:default">${r.c.map(cellHTML).join('')}</tr>`).join('')}</tbody></table></div>`:''}
    ${RB.sec.find?`<div class="rb-ai"><b>${state.lang==='sk'?'Zistenia (šablónované z čísel obrazovky)':'Findings (templated from screen figures)'}</b>
      <ul>${(s.ai||[]).slice(0,2).map(q=>`<li>${esc(tr(q.a))}</li>`).join('')||`<li>${state.lang==='sk'?'Bez zistení pre toto obdobie.':'No findings for this period.'}</li>`}</ul></div>`:''}
  </div>`;
  el.innerHTML=`<div class="mh"><h3>${state.lang==='sk'?'Report builder':'Report builder'}</h3>
      <button class="x" onclick="closeOverlay()" aria-label="close">${svg('x',16)}</button></div>
    <div class="mb rb-grid">
      <div>
        <div class="fgroup"><label>${state.lang==='sk'?'Šablóna':'Template'}</label>
          <div class="chips">${T.map((x,i)=>`<button class="chip ${i===RB.t?'on':''}" onclick="RB.t=${i};rbDraw()">${esc(tr(x.l))}</button>`).join('')}</div></div>
        <div class="fgroup"><label>${state.lang==='sk'?'Obdobie':'Period'}</label>
          <div class="chips">${[state.lang==='sk'?'júl 2026':'July 2026',state.lang==='sk'?'jún 2026':'June 2026','Q3 2026',state.lang==='sk'?'rok 2026':'2026'].map(p=>`<button class="chip ${RB.per===p?'on':''}" onclick="RB.per='${p}';rbDraw()">${p}</button>`).join('')}</div></div>
        <div class="fgroup"><label>${state.lang==='sk'?'Sekcie':'Sections'}</label>
          <div class="rb-secs">${[['kpi',L('KPI karty','KPI cards')],['chart',L('Graf','Chart')],['table',L('Tabuľka','Table')],['find',L('Zistenia','Findings')]].map(([k,l])=>`
            <label class="rb-chk"><input type="checkbox" ${RB.sec[k]?'checked':''} onchange="RB.sec['${k}']=this.checked;rbDraw()"> ${esc(tr(l))}</label>`).join('')}</div></div>
        <div class="hm-note">${esc(tr(t.s||''))}</div>
      </div>
      <div>${prev}</div>
    </div>
    <div class="mf">
      <button class="btn" onclick="rbCsv()">${svg('dl',14)} CSV</button>
      <button class="btn" onclick="window.print()">${svg('doc',14)} ${state.lang==='sk'?'Tlač / PDF':'Print / PDF'}</button>
      <button class="btn" onclick="rbShare()">${svg('share',14)} ${state.lang==='sk'?'Odkaz':'Link'}</button>
      <button class="btn pri" onclick="rbPlan()">${svg('cal',14)} ${state.lang==='sk'?'Naplánovať':'Schedule'}</button></div>`;
}
function rbCsv(){
  const s=scr(screensOf()[0]);const tb=(s.blocks||[]).find(b=>b.t==='table');
  if(!tb){toast(state.lang==='sk'?'Report nemá tabuľku':'Report has no table');return;}
  audit(L('Export CSV','CSV export'),tr(tb.title||s.title));
  toast(state.lang==='sk'?'CSV pripravené (BOM + ; pre Excel SK)':'CSV ready (BOM + ; for Excel)');
}
function rbShare(){audit(L('Zdieľaný odkaz','Share link'),APP.key);toast(state.lang==='sk'?'Odkaz skopírovaný (demo)':'Link copied (demo)');}
function rbPlan(){audit(L('Report naplánovaný','Report scheduled'),RB.per);closeOverlay();toast(state.lang==='sk'?'Report naplánovaný na 1. dňa mesiaca':'Report scheduled for the 1st of the month');}

/* ── AuraAI panel ──────────────────────────────────────────── */
const CITE={'appka':L('appka · API','app · API'),'import':L('import','import'),'pamäť':L('pamäť Aura AI','Aura AI mind'),'ukážka':L('ukážka','sample')};
function aiToggle(){
  if(typeof CHATAPP!=='undefined'&&CHATAPP)return; /* chatová appka má vlastné vlákno, panel netreba */
  state.chat.open=!state.chat.open;document.body.classList.toggle('ai-open',state.chat.open);aiRender();}
function aiSync(){if(state.chat.open)aiRender();}
function aiRender(){
  let p=document.getElementById('aip');
  if(!state.chat.open){if(p)p.remove();return;}
  if(!p){p=document.createElement('aside');p.id='aip';p.className='ai-panel';document.body.appendChild(p);}
  const s=scr(location.hash.replace(/^#/,'')||screensOf()[0])||{ai:[],title:''};
  const sugg=(s.ai||[]).map((q,i)=>`<button class="ai-chip" onclick="aiAsk(${i})">${esc(tr(q.q))}</button>`).join('');
  const msgs=state.chat.msgs.map(m=>m.r==='u'
    ?`<div class="ai-msg ai-u">${esc(tr(m.t))}</div>`
    :`<div class="ai-msg ai-a"><span class="ai-tag">AuraAI</span>${mdLite(tr(m.t))}
       ${m.cite?`<div class="ai-cite"><i></i>${esc(tr(CITE[m.cite]||m.cite))}</div>`:''}
       ${m.act?`<div class="ai-act"><button class="act" onclick="aiDo('${esc(m.act.k)}','${esc(tr(m.act.l)).replace(/'/g,'')}')">${svg(m.act.k==='open'?'ext':m.act.k==='filter'?'sliders':m.act.k==='export'?'dl':'plus',12)} ${esc(tr(m.act.l))}</button></div>`:''}</div>`).join('');
  p.innerHTML=`<div class="ai-head"><span class="ai-crown-ic">${svg('<path d="M3 8l4 4 5-7 5 7 4-4-2 12H5L3 8z"/>',19)}</span>
      <div class="ai-ht"><b>AuraAI</b><small>${state.lang==='sk'?'vidí':'sees'}: ${esc(APP.name)} / ${esc(tr(s.title))}</small></div>
      <button class="ai-x" onclick="aiToggle()" aria-label="${state.lang==='sk'?'Zavrieť':'Close'}">${svg('x',14)}</button></div>
    <div class="ai-body" id="aib" aria-live="polite">
      ${msgs||`<div class="ai-msg ai-a"><span class="ai-tag">AuraAI</span>${state.lang==='sk'
        ?'Vidím dáta tejto obrazovky. Vyber otázku alebo napíš vlastnú — každé číslo dostane zdroj.'
        :'I can see this screen’s data. Pick a question or type your own — every figure comes with a source.'}</div>`}
      <div class="ai-fbchips">${sugg}</div></div>
    <div class="ai-inrow"><input id="aiIn" placeholder="${state.lang==='sk'?'Napíš otázku…':'Type a question…'}"
        onkeydown="if(event.key==='Enter')aiFree()"><button class="ai-send" onclick="aiFree()" aria-label="${state.lang==='sk'?'Poslať':'Send'}">${svg('send',16)}</button></div>`;
  const b=document.getElementById('aib');if(b)b.scrollTop=b.scrollHeight;
}
function aiAsk(i){
  const s=scr(location.hash.replace(/^#/,'')||screensOf()[0])||{ai:[]};
  const q=(s.ai||[])[i];if(!q)return;
  state.chat.msgs.push({r:'u',t:q.q},{r:'a',t:q.a,cite:q.cite||'ukážka',act:q.act||null});
  aiRender();
}
function aiFree(){
  const inp=document.getElementById('aiIn');const v=inp&&inp.value.trim();if(!v)return;
  const s=scr(location.hash.replace(/^#/,'')||screensOf()[0])||{ai:[]};
  const hit=(s.ai||[]).find(q=>tr(q.q).toLowerCase().split(/\s+/).some(w=>w.length>4&&v.toLowerCase().includes(w)));
  state.chat.msgs.push({r:'u',t:v});
  state.chat.msgs.push(hit?{r:'a',t:hit.a,cite:hit.cite||'ukážka',act:hit.act||null}
    :{r:'a',cite:'ukážka',t:L('Na túto otázku nemám podklad na tejto obrazovke. Skús navrhované otázky — tie sú opreté o čísla, ktoré tu naozaj sú.',
        'I have no basis for that on this screen. Try the suggested questions — those are backed by figures actually shown here.')});
  inp.value='';aiRender();
}
function aiDo(k,label){
  if(k==='export'){audit(L('Export z chatu','Export from chat'),label);toast(state.lang==='sk'?'Export pripravený (demo)':'Export ready (demo)');return;}
  if(k==='create'){audit(L('Založené z chatu','Created from chat'),label);toast(state.lang==='sk'?'Záznam založený (demo)':'Record created (demo)');return;}
  toast(label+' — demo');
}

/* ── samostatná chatová appka ──────────────────────────────── */
const CHATAPP=(typeof APP!=='undefined'&&APP&&APP.key==='chat')?APP:null;
function chatNav(){return (CHATAPP.nav||[]).map(n=>n.k);}
function threadOf(id){
  const T=CHATAPP.threads||{};if(T[id])return T[id];
  const c=(CHATAPP.convos||[]).find(x=>x.id===id);if(!c)return [];
  return [{r:'u',t:c.title},{r:'a',t:c.snippet,fb:true,cite:[{k:'ukážka',l:L('náhľad — plné vlákno nie je súčasťou ukážky','preview — full thread not included')}]}];
}
function renderChatApp(k){
  setAcc(APP.acc);
  const conv=(CHATAPP.convos||[]).find(c=>c.id===k);
  const G=[L('Pripnuté','Pinned'),L('Dnes','Today'),L('Včera','Yesterday'),L('Skôr','Earlier')];
  const bk=[[],[],[],[]];
  (CHATAPP.convos||[]).forEach(c=>{const w=(tr(c.when)||'').toLowerCase();
    c.pinned?bk[0].push(c):bk[/dnes|today/.test(w)?1:/včera|yesterday/.test(w)?2:3].push(c);});
  const list=bk.map((b,i)=>b.length?`<div class="cgrp">${esc(tr(G[i]))}</div>`+b.map(c=>`<button class="citem ${c.id===k?'on':''}" onclick="go('#${c.id}')">
    <div class="ct">${c.pinned?`<span class="pin">${svg('pin',11)}</span>`:''}<b>${esc(tr(c.title))}</b></div>
    <small>${esc(tr(c.snippet))}</small><div class="cmeta"><span>${esc(tr(c.when))}</span><span>· ${c.msgs||''}</span></div></button>`).join(''):'').join('');
  const nav=(CHATAPP.nav||[]).filter(n=>n.k!=='chat').map(n=>`<a onclick="go('#${n.k}')" class="${k===n.k?'on':''}">${svg(n.icon||'doc',15)}<span>${esc(tr(n.l))}</span></a>`).join('');
  const side=`<aside class="cside">
    <div class="csh"><button class="cnew" onclick="go('#new')">${svg('plus',15)} ${state.lang==='sk'?'Nová konverzácia':'New conversation'}</button>
      <button class="cfind" onclick="openCmdk()">${svg('search',14)}<span>${state.lang==='sk'?'Hľadať':'Search'}</span><span class="kbd">⌘K</span></button></div>
    <div class="clist">${list}</div>
    <div class="csf">${nav}<a href="../index.html">${svg('home',15)}<span>${state.lang==='sk'?'Rozcestník':'Hub'}</span></a></div></aside>`;
  let main;
  if(conv)main=chatThreadView(conv,k);
  else if(k==='projekty')main=chatSimple(L('Projekty','Projects'),chatProjectsHTML());
  else if(k==='historia')main=chatSimple(L('História','History'),chatHistoryHTML());
  else if(k==='sablony')main=chatSimple(L('Šablóny promptov','Prompt templates'),chatPromptsHTML());
  else if(k==='subory')main=chatSimple(L('Súbory','Files'),chatFilesHTML());
  else if(k==='spotreba')main=chatSimple(L('Spotreba','Usage'),chatUsageHTML());
  else if(k==='stavy')main=chatSimple(L('Stavy rozhrania','UI states'),chatStatesHTML());
  else if(k==='nastroje')main=chatSimple(L('Nástroje a povolenia','Tools & permissions'),chatToolsHTML());
  else if(k==='nastavenia')main=chatSimple(L('Nastavenia','Settings'),chatSettingsHTML());
  else main=chatEmptyView();
  view.innerHTML=`<div class="chat">${side}${main}</div>`;
  const th=document.getElementById('cthread');if(th)th.scrollTop=th.scrollHeight;
}
function chatBarHTML(title,sub){
  const m=(CHATAPP.models||[])[0]||{k:'qwen3:4b'};
  return `<div class="cbar2"><button class="icon-btn cmob" onclick="toggleDrawer()" aria-label="menu">${svg('list')}</button>
    <div class="ctitle"><b>${esc(tr(title))}</b><small>${esc(tr(sub||''))}</small></div>
    <div class="csp"><button class="mpick" onclick="toast('${state.lang==='sk'?'Výber modelu (demo)':'Model picker (demo)'}')">
      <span class="dot"></span><b>${esc(m.k)}</b><small>${esc(tr(m.l||''))}</small> ${svg('chev',12)}</button></div></div>`;
}
function chatThreadView(c,k){
  const msgs=threadOf(k);
  const body=msgs.map((m,i)=>{
    const A=m.r==='a';
    const tool=A&&m.tool?`<div class="tool open"><div class="th">${svg('term',14)}<b>${esc(m.tool.name)}</b><span class="ms">${m.tool.ms||''} ms</span></div>
      <div class="tb"><div class="tr2"><span>${state.lang==='sk'?'vstup':'input'}</span>${esc(tr(m.tool.args))}</div>
      <div class="tr2"><span>${state.lang==='sk'?'výstup':'output'}</span>${esc(tr(m.tool.out))}</div></div></div>`:'';
    const cite=A&&m.cite?`<div class="cite"><span class="cl">${state.lang==='sk'?'zdroj':'source'}</span>
      ${m.cite.map(x=>`<span class="cv"><i></i>${esc(x.k)} · ${esc(tr(x.l))}</span>`).join('')}</div>`:'';
    const art=m.art?`<div class="acts"><button class="act" onclick="toast('${state.lang==='sk'?'Artefakt (demo)':'Artifact (demo)'}')">${svg('doc',12)} ${esc(tr(m.art.title))}</button></div>`:'';
    const acts=(m.acts||[]).length?`<div class="acts">${m.acts.map(a=>`<button class="act" onclick="toast('${esc(tr(a.l)).replace(/'/g,'')} — demo')">${svg('ext',12)} ${esc(tr(a.l))}</button>`).join('')}</div>`:'';
    return `<div class="msg ${A?'a':'u'}"><span class="av2">${A?'AI':'SP'}</span><div class="body">${tool}
      <div class="bub">${mdLite(tr(m.t))}</div>${cite}${art}${acts}</div></div>`;}).join('');
  return `<div class="cmain">${chatBarHTML(c.title,c.when)}
    <div class="cthread" id="cthread" aria-live="polite"><div class="cwrap">${body}</div></div>
    ${chatComposer()}</div>`;
}
function chatComposer(){
  return `<div class="comp"><div class="compw"><div class="cbox">
    <div class="cin" contenteditable="true" role="textbox" data-ph="${state.lang==='sk'?'Napíš otázku — AuraAI vidí pamäť firmy aj appky…':'Type a question…'}"></div>
    <div class="crow"><button class="cchip" onclick="toast('demo')">${svg('clip',13)} ${state.lang==='sk'?'Priložiť':'Attach'}</button>
      <button class="cchip" onclick="go('#sablony')">${svg('book',13)} ${state.lang==='sk'?'Šablóna':'Template'}</button>
      <button class="cchip" onclick="go('#nastroje')">${svg('term',13)} ${state.lang==='sk'?'Nástroje':'Tools'}</button>
      <div class="sp2"><button class="csend" onclick="toast('${state.lang==='sk'?'Náhľad — odpoveď sa negeneruje':'Preview — no reply is generated'}')">${svg('send',16)}</button></div></div></div>
    <div class="chint"><span>Enter ${state.lang==='sk'?'odoslať':'send'}</span><span>⌘J overlay</span><span>Esc ${state.lang==='sk'?'zastaviť':'stop'}</span></div></div></div>`;
}
function chatEmptyView(){
  const map=(CHATAPP.convos||[]).slice(0,6).map(c=>c.id);
  return `<div class="cmain">${chatBarHTML(L('Nová konverzácia','New conversation'),CHATAPP.meta&&CHATAPP.meta.tag)}
    <div class="cempty2"><div class="cein"><div class="cw">${svg('<path d="M3 8l4 4 5-7 5 7 4-4-2 12H5L3 8z"/>',24)}</div>
      <h1>${state.lang==='sk'?'Na čom pracujeme?':'What are we working on?'}</h1>
      <p>${state.lang==='sk'?'Model qwen3:4b beží lokálne. AuraAI vidí pamäť firmy aj dáta appiek — každé číslo nesie zdroj.'
        :'qwen3:4b runs locally. AuraAI sees the company mind and app data — every figure carries its source.'}</p>
      <div class="sugg">${(CHATAPP.sugg||[]).map((s,i)=>`<button class="sug" onclick="go('#${map[i]||map[0]}')"><b>${esc(tr(s.t))}</b><small>${esc(tr(s.s))}</small></button>`).join('')}</div>
    </div></div>${chatComposer()}</div>`;
}
function chatSimple(title,inner){
  return `<div class="cmain">${chatBarHTML(title,'')}
    <div class="cthread" style="padding:20px 18px"><div class="cwrap" style="max-width:900px;gap:16px">${inner}</div></div></div>`;
}
function chatProjectsHTML(){return `<div class="b2">${(CHATAPP.projects||[]).map(p=>`<div class="gcard">
  <div class="gh"><div class="gt"><b>${esc(tr(p.name))}</b><small>${esc(tr(p.sub))}</small></div>
    <span class="badge info">${p.convos||0} ${state.lang==='sk'?'konverzácií':'chats'}</span></div>
  <div class="gl"><div class="gr"><span>${state.lang==='sk'?'Instrukcia':'Instruction'}</span><b>${esc(tr(p.instr))}</b></div></div>
  <div class="gc">${(p.files||[]).map(f=>`<i>${esc(f.n)} · ${esc(f.size)}</i>`).join('')}</div></div>`).join('')}</div>`;}
function chatHistoryHTML(){return `<div class="card"><div class="ch"><h3>${state.lang==='sk'?'Konverzácie':'Conversations'}</h3><span class="sp">${(CHATAPP.convos||[]).length}</span></div>
  <div class="glist">${(CHATAPP.convos||[]).map(c=>`<div class="gi" onclick="go('#${c.id}')" style="cursor:pointer">
    <div class="gx"><b>${esc(tr(c.title))}</b><small>${esc(tr(c.snippet))}</small></div><span class="gm">${esc(tr(c.when))}</span></div>`).join('')}</div></div>`;}
function chatPromptsHTML(){return `<div class="b3">${(CHATAPP.prompts||[]).map(p=>`<div class="gcard">
  <div class="gh"><div class="gt"><b>${esc(tr(p.t))}</b><small>${esc(tr(p.s))}</small></div></div>
  <div class="gc"><i>${esc(tr(p.tag))}</i></div></div>`).join('')}</div>`;}
function chatFilesHTML(){return `<div class="card"><div class="ch"><h3>${state.lang==='sk'?'Prílohy':'Attachments'}</h3><span class="sp">${(CHATAPP.files||[]).length}</span></div>
  <div class="glist">${(CHATAPP.files||[]).map(f=>`<div class="gi"><div class="gx"><b>${esc(f.n)}</b><small>${esc(f.kind)} · ${esc(f.size)}</small></div>
    ${f.st?`<span class="badge ${esc(f.st[0])}">${esc(tr(f.st[1]))}</span>`:''}</div>`).join('')}</div></div>`;}
function chatUsageHTML(){const u=CHATAPP.usage||{today:{},rows:[]};
  return `<div class="kpis" style="margin-bottom:0">
    ${kpiCard({l:L('Tokeny dnes','Tokens today'),v:(u.today&&u.today.tokens)||'—'})}
    ${kpiCard({l:L('Cena dnes','Cost today'),v:(u.today&&u.today.cost)||'—'})}
    ${kpiCard({l:L('Dopytov','Requests'),v:String((u.today&&u.today.reqs)||'—')})}
    ${kpiCard({l:L('Strop','Cap'),v:u.cap||'—'})}</div>
  <div class="card"><div class="ch"><h3>${state.lang==='sk'?'Posledné dni':'Recent days'}</h3></div>
    <div class="tbl-wrap" style="border:0;background:none"><table class="t"><tbody>
      ${(u.rows||[]).map(r=>`<tr style="cursor:default">${r.c.map(cellHTML).join('')}</tr>`).join('')}</tbody></table></div></div>`;}
function chatStatesHTML(){return `<div class="b2">${(CHATAPP.states||[]).map(s=>`<div class="gcard">
  <div class="gh"><div class="gt"><b>${esc(tr(s.l))}</b><small style="font-family:var(--mono)">${esc(s.k)}</small></div></div>
  <div class="gl"><div class="gr" style="display:block"><b style="font-weight:500">${esc(tr(s.d))}</b></div></div></div>`).join('')}</div>`;}
function chatToolsHTML(){return `<div class="card"><div class="ch"><h3>${state.lang==='sk'?'Nástroje, ktoré model smie volať':'Tools the model may call'}</h3></div>
  <div class="tbl-wrap" style="border:0;background:none"><table class="t"><thead><tr>
    <th>${state.lang==='sk'?'Nástroj':'Tool'}</th><th>${state.lang==='sk'?'Čo robí':'What it does'}</th><th>${state.lang==='sk'?'Zdroj':'Source'}</th>
    <th class="n">${state.lang==='sk'?'Volaní':'Calls'}</th><th class="n">ms</th><th>${state.lang==='sk'?'Povolené':'Allowed'}</th></tr></thead>
    <tbody>${(CHATAPP.tools||[]).map(t=>`<tr style="cursor:default"><td><b>${esc(t.n)}</b></td><td>${esc(tr(t.s))}</td><td>${esc(t.src||'')}</td>
      <td class="n">${grp(t.calls||0)}</td><td class="n">${t.ms||''}</td>
      <td><span class="badge ${t.allow?'ok':'q'}">${t.allow?(state.lang==='sk'?'áno':'yes'):(state.lang==='sk'?'nie':'no')}</span></td></tr>`).join('')}</tbody></table></div></div>`;}
function chatSettingsHTML(){
  return (CHATAPP.settings||[]).map((g,gi)=>block({t:'form',title:g.g,fields:(g.rows||[]).map(r=>({l:r.l,s:r.s,type:r.type,v:r.v,on:r.on}))},100+gi)).join('')+
    `<div class="card"><div class="ch"><h3>${state.lang==='sk'?'Klávesové skratky':'Keyboard shortcuts'}</h3></div>
      <div class="glist">${((CHATAPP.meta&&CHATAPP.meta.shortcuts)||[]).map(([k,l])=>`<div class="gi"><div class="gx"><b>${esc(tr(l))}</b></div>
        <span class="gm" style="border:1px solid var(--line);border-radius:6px;padding:2px 7px">${esc(k)}</span></div>`).join('')}</div></div>`;
}

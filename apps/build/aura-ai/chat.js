/* ══════════════════════════════════════════════════════════════
   AuraAI Chat — samostatná appka (rozhranie ako Claude / ChatGPT)
   Rúty: #chat · #chat/<convoId> · #chat/<convoId>/<stav>
         #chat/projekty · #chat/projekt/<id> · #chat/historia
         #chat/sablony · #chat/subory · #chat/spotreba
         #chat/stavy · #chat/nastavenia · #chat/zdielane/<convoId>
   Stavy vlákna: stream · nastroj · artefakt · chyba · limit · long
   ══════════════════════════════════════════════════════════════ */
const CHAT=(typeof W2_CHAT!=='undefined')?W2_CHAT:{convos:[],threads:{},projects:[],prompts:[],models:[],states:[],files:[],settings:[],sugg:[],usage:{today:{},rows:[]},meta:{}};
const CSIDE=[['projekty','folder',L('Projekty','Projects')],['historia','clock',L('História','History')],
  ['sablony','book',L('Šablóny promptov','Prompt templates')],['subory','clip',L('Súbory','Files')],
  ['spotreba','bolt',L('Spotreba','Usage')],['stavy','eye',L('Stavy rozhrania','UI states')],['nastavenia','gear',L('Nastavenia','Settings')]];
const CTONE=t=>t==='ok'?'ok':t==='no'?'no':'cond';
const convoById=id=>(CHAT.convos||[]).find(c=>c.id===id);
function threadOf(id){
  if(CHAT.threads&&CHAT.threads[id])return CHAT.threads[id];
  const c=convoById(id);if(!c)return [];
  return [{r:'u',t:c.title},{r:'a',t:c.snippet,fb:true,
    cite:[{k:'ukážka',l:L('náhľad — plné vlákno nie je súčasťou ukážky','preview — the full thread is not part of the sample')}]}];
}
function grpOf(c){const w=(tr(c.when)||'').toLowerCase();
  return /dnes|today/.test(w)?0:/včera|yesterday/.test(w)?1:2;}

/* ── bočný panel ───────────────────────────────────────────── */
function chatSide(active,sub){
  const G=[L('Pripnuté','Pinned'),L('Dnes','Today'),L('Včera','Yesterday'),L('Skôr','Earlier')];
  const buckets=[[],[],[],[]];
  (CHAT.convos||[]).forEach(c=>{c.pinned?buckets[0].push(c):buckets[grpOf(c)+1].push(c);});
  const list=buckets.map((b,i)=>b.length?`<div class="cgrp">${esc(tr(G[i]))}</div>`+b.map(c=>{
    const pr=c.project?(CHAT.projects||[]).find(p=>p.id===c.project):null;
    return `<button class="citem ${c.id===active?'on':''}" onclick="go('#chat/${c.id}')" ${c.id===active?'aria-current="true"':''}>
      <div class="ct">${c.pinned?`<span class="pin">${svg('pin',11)}</span>`:''}<b>${esc(tr(c.title))}</b></div>
      <small>${esc(tr(c.snippet))}</small>
      <div class="cmeta"><span>${esc(tr(c.when))}</span>${pr?`<span>· ${esc(tr(pr.name))}</span>`:''}<span>· ${c.msgs||threadOf(c.id).length}</span></div></button>`;}).join(''):'').join('');
  const foot=CSIDE.map(([k,ic,l])=>`<a onclick="go('#chat/${k}')" class="${sub===k?'on':''}">${svg(ic,15)}<span>${esc(tr(l))}</span></a>`).join('');
  return `<aside class="cside">
    <div class="csh">
      <button class="cnew" onclick="go('#chat')">${svg('plus',15)} ${state.lang==='sk'?'Nová konverzácia':'New conversation'}</button>
      <button class="cfind" onclick="openCmdk()">${svg('search',14)}<span>${state.lang==='sk'?'Hľadať v konverzáciách':'Search conversations'}</span><span class="kbd">⌘K</span></button>
    </div>
    <div class="clist">${list}</div>
    <div class="csf">${foot}<a onclick="go('#hub')">${svg('home',15)}<span>${state.lang==='sk'?'Späť na rozcestník':'Back to hub'}</span></a></div>
  </aside>`;
}

/* ── hlavička vlákna ───────────────────────────────────────── */
function modelPill(){
  const m=(CHAT.models||[])[0]||{k:'qwen3:4b',l:L('lokálny','local')};
  if(state.offline)return `<button class="mpick" onclick="toast('${state.lang==='sk'?'Prepnuté na cloud fallback (demo)':'Switched to cloud fallback (demo)'}')" style="border-color:color-mix(in srgb,var(--red) 45%,var(--line))">
    <span class="dot" style="background:var(--red)"></span><b>${state.lang==='sk'?'lokálny model nebeží':'local model is down'}</b> ${svg('chev',12)}</button>`;
  return `<button class="mpick" onclick="toast('${state.lang==='sk'?'Výber modelu (demo)':'Model picker (demo)'}')">
    <span class="dot"></span><b>${esc(m.k)}</b><small>${esc(tr(m.l))}</small> ${svg('chev',12)}</button>`;
}
function chatBar(c,extra){
  const pr=c&&c.project?(CHAT.projects||[]).find(p=>p.id===c.project):null;
  return `<div class="cbar2">
    <button class="icon-btn cmob" onclick="toggleDrawer()" aria-label="${state.lang==='sk'?'Konverzácie':'Conversations'}">${svg('list')}</button>
    <div class="ctitle"><b>${esc(c?tr(c.title):(state.lang==='sk'?'Nová konverzácia':'New conversation'))}</b>
      <small>${c?esc(tr(c.when)):''}${pr?' · '+esc(tr(pr.name)):''}${extra?' · '+esc(extra):''}</small></div>
    <div class="csp">${modelPill()}
      ${c?`<button class="btn" onclick="go('#chat/zdielane/${c.id}')">${svg('share',14)} ${state.lang==='sk'?'Zdieľať':'Share'}</button>`:''}
      <button class="btn" onclick="toast('${state.lang==='sk'?'Nová vetva konverzácie (demo)':'New branch (demo)'}')">${svg('refresh',14)} ${state.lang==='sk'?'Vetviť':'Branch'}</button></div></div>`;
}

/* ── správa ────────────────────────────────────────────────── */
function toolBlock(t,i,open){
  return `<div class="tool ${open?'open':''}" id="tool${i}">
    <div class="th" onclick="document.getElementById('tool${i}').classList.toggle('open')" role="button" tabindex="0">
      ${svg('term',14)}<b>${esc(t.name)}</b><span class="ms">${t.ms?t.ms+' ms':''}</span><span class="cv2">${svg('chev',13)}</span></div>
    <div class="tb">
      <div class="tr2"><span>${state.lang==='sk'?'vstup':'input'}</span>${esc(tr(t.args))}</div>
      <div class="tr2"><span>${state.lang==='sk'?'výstup':'output'}</span>${esc(tr(t.out))}</div></div></div>`;
}
function citeRow(cite){
  if(!cite||!cite.length)return '';
  const cls=k=>({'pamäť':'pamat','memory':'pamat','appka':'appka','app':'appka','súbor':'subor','file':'subor','web':'web','ukážka':'ukazka','sample':'ukazka'})[k]||'ukazka';
  return `<div class="cite"><span class="cl">${state.lang==='sk'?'zdroj':'source'}</span>
    ${cite.map(c=>`<span class="cv ${cls(c.k)}"><i></i>${esc(c.k)} · ${esc(tr(c.l))}</span>`).join('')}</div>`;
}
function msgHTML(m,i,opt){
  const A=m.r==='a';
  const art=m.art?`<button class="act" onclick="openArt(${i})">${svg('doc',12)} ${esc(tr(m.art.title))}</button>`:'';
  const acts=(m.acts&&m.acts.length)||m.art?`<div class="acts">${art}${(m.acts||[]).map(a=>`<button class="act" onclick="toast('${esc(tr(a.l)).replace(/'/g,'')} — demo')">
      ${svg(a.k==='open'?'ext':a.k==='filter'?'sliders':a.k==='export'?'dl':'plus',12)} ${esc(tr(a.l))}</button>`).join('')}</div>`:'';
  const foot=A&&m.fb?`<div class="mfoot"><span class="mt">${(CHAT.meta&&CHAT.meta.model)||'qwen3:4b'} · ${opt.t||'0,4 s'}</span>
    <button class="iact" onclick="toast('${state.lang==='sk'?'Skopírované':'Copied'}')" aria-label="${state.lang==='sk'?'Kopírovať':'Copy'}">${svg('copy',14)}</button>
    <button class="iact" onclick="toast('${state.lang==='sk'?'Regenerujem (demo)':'Regenerating (demo)'}')" aria-label="${state.lang==='sk'?'Regenerovať':'Regenerate'}">${svg('refresh',14)}</button>
    <button class="iact" onclick="toast('${state.lang==='sk'?'Hodnotenie zapísané':'Feedback saved'}')" aria-label="${state.lang==='sk'?'Dobré':'Good'}">${svg('up',14)}</button>
    <button class="iact" onclick="toast('${state.lang==='sk'?'Hodnotenie zapísané':'Feedback saved'}')" aria-label="${state.lang==='sk'?'Slabé':'Poor'}">${svg('down',14)}</button></div>`:'';
  const cur=opt.cursor?'<span class="cursorb"></span>':'';
  return `<div class="msg ${A?'a':'u'}">
    <span class="av2">${A?'AI':'SP'}</span>
    <div class="body">
      ${A&&m.tool?toolBlock(m.tool,i,!!opt.toolOpen):''}
      <div class="bub">${mdLite(tr(m.t))}${cur}</div>
      ${A?citeRow(m.cite):''}${acts}${foot}</div></div>`;
}

/* ── kompozér ──────────────────────────────────────────────── */
function composer(cid,st){
  if(st==='limit')return `<div class="comp"><div class="compw">
    <div class="banner cond" style="margin:0">${svg('warn')}<span>${state.lang==='sk'
      ?'Denný strop cloud fallbacku je vyčerpaný (0,06 € z 300 € mesačne). Lokálny model qwen3:4b odpovedá ďalej — cloud sa uvolní zajtra.'
      :'The cloud fallback daily cap is used up (€0.06 of €300 monthly). The local qwen3:4b keeps answering — cloud resets tomorrow.'}</span></div></div></div>`;
  const stop=st==='stream';
  return `<div class="comp"><div class="compw">
    ${st==='chyba'?`<div class="banner no" style="margin:0 0 10px">${svg('warn')}<span>${state.lang==='sk'
      ?'Odpoveď sa nedokončila — Ollama na localhost:8082 spadla po 12 s. Konverzácia je uložená, skús to znova.'
      :'The reply did not finish — Ollama on localhost:8082 dropped after 12 s. The conversation is saved, try again.'}</span>
      <button class="bx" onclick="go('#chat/${cid||'c1'}')">${state.lang==='sk'?'Skúsiť znova':'Retry'}</button></div>`:''}
    ${state.offline?`<div class="banner cond" style="margin:0 0 10px">${svg('warn')}<span>${state.lang==='sk'
      ?'Lokálny model nebeží (kontajner auraai-app). Zapnuté je cloud fallback — odpovede sa účtujú proti stropu 300 €/mes.'
      :'The local model is down (container auraai-app). Cloud fallback is on — replies bill against the €300/mo cap.'}</span></div>`:''}
    <div class="cbox">
      <div class="cin" id="cin" contenteditable="true" role="textbox" aria-multiline="true"
        data-ph="${state.lang==='sk'?'Napíš otázku — AuraAI vidí pamäť firmy aj appky…':'Type a question — AuraAI sees the company mind and the apps…'}"></div>
      <div class="crow">
        <button class="cchip" onclick="toast('${state.lang==='sk'?'Priloženie súboru (demo)':'Attach file (demo)'}')">${svg('clip',13)} ${state.lang==='sk'?'Priložiť':'Attach'}</button>
        <button class="cchip" onclick="go('#chat/sablony')">${svg('book',13)} ${state.lang==='sk'?'Šablóna':'Template'}</button>
        <button class="cchip" onclick="toast('${state.lang==='sk'?'Nástroje: mind_recall, kpi_summary, logistika_shipments, banner_render, web_search':'Tools: mind_recall, kpi_summary, logistika_shipments, banner_render, web_search'}')">${svg('term',13)} ${state.lang==='sk'?'Nástroje':'Tools'}</button>
        <div class="sp2">
          ${stop?`<button class="stopgen" onclick="go('#chat/${cid||'c1'}')"><span class="sq"></span> ${state.lang==='sk'?'Zastaviť':'Stop'}</button>`
                :`<button class="csend" onclick="chatSend('${cid||''}')" aria-label="${state.lang==='sk'?'Odoslať':'Send'}">${svg('send',16)}</button>`}
        </div></div></div>
    <div class="chint"><span>Enter ${state.lang==='sk'?'odoslať':'send'}</span><span>Shift+Enter ${state.lang==='sk'?'nový riadok':'new line'}</span>
      <span>⌘J ${state.lang==='sk'?'overlay':'overlay'}</span><span>Esc ${state.lang==='sk'?'zastaviť':'stop'}</span></div>
  </div></div>`;
}
const EXTRA={};
function chatSend(cid){
  const el=document.getElementById('cin');const v=el?el.innerText.trim():'';
  if(!v){toast(state.lang==='sk'?'Napíš najprv otázku':'Type a question first');return;}
  (EXTRA[cid||'new']=EXTRA[cid||'new']||[]).push(
    {r:'u',t:v},
    {r:'a',fb:true,t:L('Toto je náhľad rozhrania — odpoveď sa negeneruje. V reálnej appke by dopyt išiel na qwen3:4b s nástrojmi nad pamäťou a appkami rodiny, a odpoveď by nesla citáciu zdroja.',
      'This is an interface preview — no reply is generated. In the real app the prompt would go to qwen3:4b with tools over the mind and the family apps, and the answer would carry a source citation.'),
      cite:[{k:'ukážka',l:L('náhľad rozhrania','interface preview')}]});
  route();
}

/* ── vlákno ────────────────────────────────────────────────── */
function chatThread(cid,st){
  const c=convoById(cid);if(!c)return chatEmpty();
  const msgs=threadOf(cid).concat(EXTRA[cid]||[]);
  const long=st==='long';
  const art=state.art!=null?msgs[state.art]&&msgs[state.art].art:null;
  const body=msgs.map((m,i)=>{
    const last=i===msgs.length-1;
    return msgHTML(m,i,{cursor:st==='stream'&&last&&m.r==='a',toolOpen:st==='nastroj'||(st==='artefakt'&&!!m.art),t:['0,4 s','0,6 s','1,1 s'][i%3]});
  }).join('');
  const cut=long?`<div class="hm-note" style="text-align:center;border-top:1px dashed var(--line);border-bottom:1px dashed var(--line);padding:10px 0;margin:0">
    ${state.lang==='sk'?'Staršia časť konverzácie (14 správ) je zhrnutá do 380 tokenov — kontext qwen3:4b je 32k.'
      :'The earlier part of the conversation (14 messages) is summarized into 380 tokens — qwen3:4b context is 32k.'}</div>`:'';
  return `<div class="cmain">${chatBar(c,st?({stream:L('generuje…','generating…'),nastroj:L('nástroj','tool'),artefakt:L('artefakt','artifact'),
      chyba:L('chyba','error'),limit:L('limit','limit'),long:L('dlhý kontext','long context')}[st]?tr({stream:L('generuje…','generating…'),nastroj:L('nástroj','tool'),
      artefakt:L('artefakt','artifact'),chyba:L('chyba','error'),limit:L('limit','limit'),long:L('dlhý kontext','long context')}[st]):''):'')}
    <div class="cthread" id="cthread" aria-live="polite"><div class="cwrap">${cut}${body}</div></div>
    ${composer(cid,st)}</div>
    ${art?artPanel(art):''}`;
}
function artPanel(a){
  return `<aside class="cart">
    <div class="ah"><b>${esc(tr(a.title))}</b><span class="k">${esc(a.kind)}${a.lang?' · '+esc(a.lang):''}</span>
      <button class="iact" onclick="closeArt()" aria-label="${state.lang==='sk'?'Zavrieť':'Close'}">${svg('x',14)}</button></div>
    <div class="ab"><pre style="margin:0;font:500 11.5px/1.6 var(--mono);color:var(--ink-2);white-space:pre-wrap">${esc(a.text||'')}</pre></div>
    <div class="af"><button class="btn" onclick="toast('${state.lang==='sk'?'Skopírované':'Copied'}')">${svg('copy',14)} ${state.lang==='sk'?'Kopírovať':'Copy'}</button>
      <button class="btn" onclick="toast('${state.lang==='sk'?'Stiahnuté (demo)':'Downloaded (demo)'}')">${svg('dl',14)} ${state.lang==='sk'?'Stiahnuť':'Download'}</button></div></aside>`;
}
function openArt(i){state.art=i;route();}
function closeArt(){state.art=null;route();}

/* ── prázdna obrazovka ─────────────────────────────────────── */
function chatEmpty(){
  const map=['c1','c2','c3','c5','c7','c6'];
  const sg=(CHAT.sugg||[]).map((s,i)=>`<button class="sug" onclick="go('#chat/${map[i]||'c1'}')"><b>${esc(tr(s.t))}</b><small>${esc(tr(s.s))}</small></button>`).join('');
  return `<div class="cmain">${chatBar(null)}
    <div class="cempty2"><div class="cein">
      <div class="cw">${svg('<path d="M3 8l4 4 5-7 5 7 4-4-2 12H5L3 8z"/>',24)}</div>
      <h1>${state.lang==='sk'?'Na čom pracujeme?':'What are we working on?'}</h1>
      <p>${state.lang==='sk'
        ?'Model qwen3:4b beží lokálne na tvojom PC. AuraAI vidí pamäť firmy a dáta appiek rodiny — každé číslo v odpovedi nesie zdroj.'
        :'The qwen3:4b model runs locally on your PC. AuraAI sees the company mind and the family app data — every figure in an answer carries its source.'}</p>
      <div class="sugg">${sg}</div>
    </div></div>${composer('')}</div>`;
}

/* ── vedľajšie plochy ──────────────────────────────────────── */
function pageWrap(title,sub,inner,sub2){
  return `<div class="cmain"><div class="cbar2">
      <button class="icon-btn cmob" onclick="toggleDrawer()" aria-label="menu">${svg('list')}</button>
      <div class="ctitle"><b>${esc(tr(title))}</b><small>${esc(tr(sub))}</small></div>
      <div class="csp">${modelPill()}</div></div>
    <div class="cthread" style="padding:20px 18px"><div class="cwrap" style="max-width:900px;gap:16px">${inner}</div></div></div>`;
}
function chatProjects(){
  const items=(CHAT.projects||[]).map(p=>`<div class="gcard">
    <div class="gh"><div class="gt"><b>${esc(tr(p.name))}</b><small>${esc(tr(p.sub))}</small></div>
      <span class="badge info">${p.convos} ${state.lang==='sk'?'konverzácií':'chats'}</span></div>
    <div class="gl"><div class="gr"><span>${state.lang==='sk'?'Instrukcia':'Instruction'}</span><b>${esc(tr(p.instr))}</b></div></div>
    <div class="gc">${(p.files||[]).map(f=>`<i>${esc(f.n)} · ${esc(f.size)}</i>`).join('')}</div>
    <div style="display:flex;gap:8px"><button class="btn" onclick="go('#chat/projekt/${p.id}')">${svg('folder',14)} ${state.lang==='sk'?'Otvoriť projekt':'Open project'}</button></div></div>`).join('');
  return pageWrap(L('Projekty','Projects'),L('Konverzácie zoskupené podľa témy — s vlastnou instrukciou a súbormi','Conversations grouped by topic — each with its own instruction and files'),
    `<div class="b2">${items}</div>
     <div class="hm-note" style="margin:0">${state.lang==='sk'
       ?'Súbory projektu sa prikladajú ku každej konverzácii v projekte. Instrukcia platí pre celý projekt a je viditeľná — nie skrytá pred používateľom.'
       :'Project files are attached to every conversation in the project. The instruction applies to the whole project and stays visible — never hidden from the user.'}</div>`);
}
function chatProject(id){
  const p=(CHAT.projects||[]).find(x=>x.id===id);if(!p)return chatProjects();
  const cs=(CHAT.convos||[]).filter(c=>c.project===id);
  return pageWrap(p.name,p.sub,`
    <div class="card"><div class="ch"><h3>${state.lang==='sk'?'Instrukcia projektu':'Project instruction'}</h3>
      <span class="sp">${state.lang==='sk'?'platí pre všetky konverzácie':'applies to all conversations'}</span></div>
      <div class="gin ta" style="max-width:none">${esc(tr(p.instr))}</div></div>
    <div class="card"><div class="ch"><h3>${state.lang==='sk'?'Súbory (knowledge)':'Files (knowledge)'}</h3><span class="sp">${(p.files||[]).length}</span></div>
      <div class="glist">${(p.files||[]).map(f=>`<div class="gi"><div class="gx"><b>${esc(f.n)}</b><small>${esc(f.kind)} · ${esc(f.size)}</small></div>
        <span class="badge ok">${state.lang==='sk'?'spracované':'processed'}</span></div>`).join('')}</div></div>
    <div class="card"><div class="ch"><h3>${state.lang==='sk'?'Konverzácie projektu':'Project conversations'}</h3><span class="sp">${cs.length}</span></div>
      <div class="glist">${cs.map(c=>`<div class="gi" onclick="go('#chat/${c.id}')" style="cursor:pointer">
        <div class="gx"><b>${esc(tr(c.title))}</b><small>${esc(tr(c.snippet))}</small></div><span class="gm">${esc(tr(c.when))}</span></div>`).join('')}</div></div>`);
}
function chatHistory(){
  const rows=(CHAT.convos||[]).map(c=>{const pr=c.project?(CHAT.projects||[]).find(p=>p.id===c.project):null;
    return `<div class="gi" onclick="go('#chat/${c.id}')" style="cursor:pointer">
      <div class="gx"><b>${esc(tr(c.title))}</b><small>${esc(tr(c.snippet))}</small></div>
      ${pr?`<span class="badge info">${esc(tr(pr.name))}</span>`:''}
      <span class="gm">${esc(tr(c.when))} · ${c.msgs||''}</span></div>`;}).join('');
  return pageWrap(L('História','History'),L('Všetky konverzácie · hľadanie cez ⌘K','All conversations · search with ⌘K'),
    `<div class="card"><div class="ch"><h3>${state.lang==='sk'?'Konverzácie':'Conversations'}</h3>
       <span class="sp">${(CHAT.convos||[]).length}</span></div><div class="glist">${rows}</div></div>`);
}
function chatPrompts(){
  return pageWrap(L('Šablóny promptov','Prompt templates'),L('Opakované dopyty pripravené na jeden klik','Recurring prompts ready in one click'),
    `<div class="b3">${(CHAT.prompts||[]).map(p=>`<div class="gcard"><div class="gh"><div class="gt"><b>${esc(tr(p.t))}</b><small>${esc(tr(p.s))}</small></div></div>
      <div class="gc"><i>${esc(tr(p.tag))}</i></div>
      <button class="btn" onclick="go('#chat')">${svg('play',14)} ${state.lang==='sk'?'Použiť':'Use'}</button></div>`).join('')}</div>`);
}
function chatFiles(){
  return pageWrap(L('Súbory','Files'),L('Prílohy dostupné modelu — s obmedzeniami a stavom spracovania','Attachments available to the model — with limits and processing state'),
    `<div class="card"><div class="ch"><h3>${state.lang==='sk'?'Prílohy':'Attachments'}</h3><span class="sp">${(CHAT.files||[]).length}</span></div>
      <div class="glist">${(CHAT.files||[]).map(f=>`<div class="gi"><div class="gx"><b>${esc(f.n)}</b><small>${esc(f.kind)} · ${esc(f.size)}</small></div>
        ${f.st?`<span class="badge ${esc(f.st[0])}">${esc(tr(f.st[1]))}</span>`:''}</div>`).join('')}</div>
      <div class="hm-note">${state.lang==='sk'
        ?'Súbory sa spracúvajú lokálne (bge-m3), nikam sa neposielajú. Obrázky vidí len cloud fallback — lokálny qwen3:4b je textový.'
        :'Files are processed locally (bge-m3) and never leave the machine. Images are visible only to the cloud fallback — the local qwen3:4b is text-only.'}</div></div>`);
}
function chatUsage(){
  const u=CHAT.usage||{today:{},rows:[]};
  return pageWrap(L('Spotreba','Usage'),L('Lokálny beh je bez ceny — účtuje sa len cloud fallback','Local runs are free — only the cloud fallback bills'),
    `<div class="kpis" style="margin-bottom:0">
      ${kpiCard({l:L('Tokeny dnes','Tokens today'),v:(u.today&&u.today.tokens)||'—',sub:L('lokálne + cloud','local + cloud')})}
      ${kpiCard({l:L('Cena dnes','Cost today'),v:(u.today&&u.today.cost)||'—',sub:L('cloud fallback','cloud fallback')})}
      ${kpiCard({l:L('Dopytov','Requests'),v:String((u.today&&u.today.reqs)||'—'),sub:L('vrátane volaní nástrojov','including tool calls')})}
      ${kpiCard({l:L('Strop','Cap'),v:u.cap||'—',sub:L('mesačne','monthly')})}</div>
    <div class="card"><div class="ch"><h3>${state.lang==='sk'?'Posledné dni':'Recent days'}</h3></div>
      <div class="meter"><i style="width:8%"></i></div>
      <div class="hm-note" style="margin-top:0">${state.lang==='sk'?'čerpanie stropu · hodnoty ukážkové':'cap usage · illustrative values'}</div>
      <div class="tbl-wrap" style="border:0;background:none;margin-top:12px"><table class="t"><thead><tr>
        ${[L('Deň','Day'),L('Model','Model'),L('Tokeny','Tokens'),L('Latencia','Latency'),L('Cena','Cost')].map(c=>`<th scope="col">${esc(tr(c))}</th>`).join('')}</tr></thead>
        <tbody>${(u.rows||[]).map(r=>`<tr style="cursor:default">${r.c.map(cellHTML).join('')}</tr>`).join('')}</tbody></table></div></div>`);
}
function chatStates(){
  return pageWrap(L('Stavy rozhrania','UI states'),L('Čo používateľ vidí a čo môže urobiť v každom stave','What the user sees and can do in each state'),
    `<div class="b2">${(CHAT.states||[]).map(s=>`<div class="gcard"><div class="gh"><div class="gt"><b>${esc(tr(s.l))}</b>
      <small style="font-family:var(--mono);font-size:10.5px">${esc(s.k)}</small></div></div>
      <div class="gl"><div class="gr" style="display:block"><b style="font-weight:500">${esc(tr(s.d))}</b></div></div>
      ${['streaming','tool-call','error','rate-limit','offline','long-context'].includes(s.k)
        ?`<button class="btn" onclick="go('#chat/${s.k==='error'?'c1/chyba':s.k==='rate-limit'?'c1/limit':s.k==='offline'?'c2/offline':s.k==='long-context'?'c3/long':s.k==='tool-call'?'c1/nastroj':'c1/stream'}')">${svg('eye',14)} ${state.lang==='sk'?'Ukázať':'Show'}</button>`:''}</div>`).join('')}</div>`);
}
function chatSettings(){
  const g=(CHAT.settings||[]).map(s=>({t:'form',title:s.g,fields:(s.rows||[]).map(r=>({l:r.l,s:r.s,type:r.type,v:r.v,on:r.on}))}));
  return pageWrap(L('Nastavenia','Settings'),L('Model, pamäť, súkromie a klávesové skratky','Model, memory, privacy and keyboard shortcuts'),
    g.map(block).join('')+`
    <div class="card"><div class="ch"><h3>${state.lang==='sk'?'Klávesové skratky':'Keyboard shortcuts'}</h3></div>
      <div class="glist">${((CHAT.meta&&CHAT.meta.shortcuts)||[]).map(([k,l])=>`<div class="gi"><div class="gx"><b>${esc(tr(l))}</b></div>
        <span class="gm" style="border:1px solid var(--line);border-radius:6px;padding:2px 7px">${esc(k)}</span></div>`).join('')}</div></div>`);
}
function chatShared(cid){
  const c=convoById(cid)||{title:L('Konverzácia','Conversation'),when:''};
  const msgs=threadOf(cid);
  return `<div class="cmain">
    <div class="sharebar">${svg('share')}<span>${state.lang==='sk'
      ?'Zdieľané zobrazenie · len na čítanie · bez prístupu k pamäti a nástrojom'
      :'Shared view · read-only · no access to the mind or tools'}</span>
      <span class="lnk">auraai.local/s/8f3c-2a91</span></div>
    <div class="cbar2"><div class="ctitle"><b>${esc(tr(c.title))}</b><small>${esc(tr(c.when))} · ${state.lang==='sk'?'zdieľal Samuel':'shared by Samuel'}</small></div>
      <div class="csp"><button class="btn" onclick="toast('${state.lang==='sk'?'Odkaz zrušený (demo)':'Link revoked (demo)'}')">${svg('x',14)} ${state.lang==='sk'?'Zrušiť odkaz':'Revoke link'}</button></div></div>
    <div class="cthread"><div class="cwrap">${msgs.map((m,i)=>msgHTML(m,i,{t:'0,4 s'})).join('')}
      <div class="hm-note" style="text-align:center">${state.lang==='sk'
        ?'V zdieľanom zobrazení nie je kompozér ani prepínač modelu. Citácie zostávajú — bez nich by čísla nemali zdroj.'
        :'The shared view has no composer and no model switcher. Citations stay — without them the figures would have no source.'}</div></div></div></div>`;
}

/* ── router chatu ──────────────────────────────────────────── */
function renderChat(seg){
  setAcc('var(--b-chat)');
  const a=seg[0]||'';
  let sub='',inner='';
  if(a==='zdielane'){view.innerHTML=`<div class="chat">${chatSide(seg[1],'')}${chatShared(seg[1])}</div>`;return;}
  if(a==='projekt'){sub='projekty';inner=chatProject(seg[1]);}
  else if(a==='projekty'){sub=a;inner=chatProjects();}
  else if(a==='historia'){sub=a;inner=chatHistory();}
  else if(a==='sablony'){sub=a;inner=chatPrompts();}
  else if(a==='subory'){sub=a;inner=chatFiles();}
  else if(a==='spotreba'){sub=a;inner=chatUsage();}
  else if(a==='stavy'){sub=a;inner=chatStates();}
  else if(a==='nastavenia'){sub=a;inner=chatSettings();}
  else if(a&&convoById(a)){
    state.offline=(seg[1]==='offline');
    if(seg[1]==='artefakt'){const t=threadOf(a);const i=t.findIndex(m=>m.art);if(i>=0)state.art=i;}
    else if(state.art!=null&&!(threadOf(a)[state.art]||{}).art)state.art=null;
    inner=chatThread(a,seg[1]||'');
  }else{state.offline=false;state.art=null;inner=chatEmpty();}
  const artOpen=/class="cart"/.test(inner);
  view.innerHTML=`<div class="chat${artOpen?' art':''}">${chatSide(convoById(a)?a:'',sub)}${inner}</div>`;
  const th=document.getElementById('cthread');if(th)th.scrollTop=th.scrollHeight;
}

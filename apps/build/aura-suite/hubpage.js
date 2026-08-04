/* rozcestník balíka aura-suite — 12 appiek rodiny v dvoch skupinách */
const L=(sk,en)=>({sk,en});
const state={lang:'sk',theme:'dark'};
const tr=o=>(o&&typeof o==='object'&&'sk'in o)?o[state.lang]:o;
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const svg=(p,w=18)=>`<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${IC[p]||p}</svg>`;
function spark(vals,tone){
  if(!vals||!vals.length)return '';
  const w=64,h=22,mx=Math.max(...vals),mn=Math.min(...vals),rng=(mx-mn)||1;
  const pts=vals.map((v,i)=>`${(i*(w-2)/(vals.length-1)+1).toFixed(1)},${(h-3-((v-mn)/rng)*(h-6)).toFixed(1)}`).join(' ');
  const c=tone==='no'?'var(--red)':tone==='cond'?'var(--amber)':'var(--good)';
  return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="${c}" stroke-width="1.6"/></svg>`;
}
function card(a,i){
  return `<a class="mcard" style="--ac:${a.acc}" href="${a.key}/index.html">
    <span class="num">${String(i+1).padStart(2,'0')}</span>
    <div class="ico">${svg(a.icon,22)}</div>
    <h3>${esc(a.name)}</h3><p>${esc(tr(a.tag))}</p>
    ${a.live?`<div class="livebar"><span class="sdot ${a.live.tone||'ok'}"></span><span>${esc(tr(a.live.v))}</span>${spark(a.live.spark,a.live.tone)}</div>`:''}
    <div class="meta"><span>${a.n} ${state.lang==='sk'?'obrazoviek':'screens'}${a.port?' · :'+a.port:''}</span>
      <span class="go">${state.lang==='sk'?'Otvoriť':'Open'} ${svg('arrow')}</span></div></a>`;
}
function render(){
  const prov=APPS_META.filter(a=>a.grp==='prov'),ai=APPS_META.filter(a=>a.grp!=='prov');
  document.getElementById('view').innerHTML=`<div class="hub an">
    <div class="eb">${state.lang==='sk'?'Aura Suite · kompletný náhľad':'Aura Suite · complete preview'}</div>
    <h1>${state.lang==='sk'?'Dvanásť aplikácií, <em>jeden systém</em>.':'Twelve applications, <em>one system</em>.'}</h1>
    <p class="lead">${state.lang==='sk'
      ?'Každá appka rodiny Aura má vlastný priečinok, vlastné obrazovky a vlastný ZIP — s tabuľkami, KPI kartami, grafmi, importom, reportmi a chatom AuraAI.'
      :'Every Aura family app has its own folder, screens and ZIP — with tables, KPI cards, charts, import, reports and the AuraAI chat.'}</p>
    <p class="note">${state.lang==='sk'
      ?'Náhľad rozhraní, nie funkčný backend. Overené čísla z pamäte Aura AI sú prenesené 1:1 a označené; ostatné hodnoty sú ukážkové v reálnom objeme (tabuľky 20–40 riadkov, grafy 12 mesiacov).'
      :'An interface preview, not a working backend. Verified figures from the Aura AI mind are carried over 1:1 and labelled; the rest is illustrative at realistic volume (20–40 row tables, 12-month charts).'}</p>
    <div class="hubgrp">${state.lang==='sk'?'Prevádzka firmy':'Company operations'}</div>
    <div class="grid12">${prov.map(card).join('')}</div>
    <div class="hubgrp">${state.lang==='sk'?'AI, štúdiá a infrastruktúra':'AI, studios and infrastructure'}</div>
    <div class="grid12">${ai.map((a,i)=>card(a,i+prov.length)).join('')}</div>
    <div class="hm-note" style="margin-top:26px">${state.lang==='sk'
      ?'Klávesnica: ⌘K hľadanie v appke · ⌘J chat AuraAI · ←/→ obrazovky · Esc zavrie prekrytie. Každá appka funguje aj samostatne zo svojho ZIPu (odkazy na ostatné appky fungujú len v plnom balíku).'
      :'Keyboard: ⌘K in-app search · ⌘J AuraAI chat · ←/→ screens · Esc closes overlays. Each app also works standalone from its ZIP (cross-app links only work in the full package).'}</div>
  </div>`;
}
function applyStatic(){
  document.documentElement.lang=state.lang;
  document.title=state.lang==='sk'?'Aura Suite · 12 aplikácií':'Aura Suite · 12 applications';
  const d=document.querySelector('.demo-tag');if(d)d.textContent=state.lang==='sk'?'Demo · ukážkové dáta':'Demo · sample data';
}
document.getElementById('langseg').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
  state.lang=b.dataset.lang;
  document.querySelectorAll('#langseg button').forEach(x=>{const on=x===b;x.classList.toggle('on',on);x.setAttribute('aria-pressed',String(on));});
  applyStatic();render();});
document.getElementById('themebtn').addEventListener('click',function(){
  state.theme=state.theme==='dark'?'light':'dark';
  document.documentElement.dataset.theme=state.theme;
  this.setAttribute('aria-pressed',String(state.theme==='light'));});
applyStatic();render();

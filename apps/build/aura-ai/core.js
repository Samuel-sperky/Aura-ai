/* ══════════════════════════════════════════════════════════════
   aura-ai.html — jadro: formátovanie, ikony, grafy, generický
   renderer blokov, shell appky, rozcestník, router, chróm.
   Dáta obrazoviek dodávajú súbory data-*.js (W1–W4).
   Bez CDN, bez localStorage, grafy sú ručné SVG/CSS.
   ══════════════════════════════════════════════════════════════ */
const L=(sk,en)=>({sk,en});
const state={lang:'sk',theme:'dark',overlay:null,chat:{},tool:{},art:null,share:false,stream:false,offline:false};
const tr=o=>(o&&typeof o==='object'&&'sk'in o)?o[state.lang]:o;
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const NBSP=' ';
function grp(n){const neg=n<0;n=Math.abs(Math.round(n));const sep=state.lang==='sk'?NBSP:',';
  return (neg?'−':'')+String(n).replace(/\B(?=(\d{3})+(?!\d))/g,sep);}
function decs(n){const neg=n<0;n=Math.abs(n);const p=String(n).split('.');const d=state.lang==='sk'?',':'.';
  return (neg?'−':'')+(p[1]?`${grp(Number(p[0]))}${d}${p[1]}`:grp(Number(p[0])));}
function money(n){const s=decs(n);return state.lang==='sk'?`${s}${NBSP}€`:`€${s}`;}
function pct(n){return `${decs(n)}${state.lang==='sk'?NBSP+'%':'%'}`;}
const cur=v=>({t:'cur',v}), int=v=>({t:'int',v}), pc=v=>({t:'pct',v});
function fmtCell(c){if(c&&c.t==='cur')return money(c.v);if(c&&c.t==='int')return grp(c.v);if(c&&c.t==='pct')return pct(c.v);return tr(c);}
function isNum(c){return c&&(c.t==='cur'||c.t==='int'||c.t==='pct');}

/* ── ikony ─────────────────────────────────────────────────── */
const I={
  brain:'<path d="M12 5a3 3 0 00-6 0 3 3 0 00-2 5 3 3 0 001 5 3 3 0 006 1zM12 5a3 3 0 016 0 3 3 0 012 5 3 3 0 01-1 5 3 3 0 01-6 1z"/>',
  chat:'<path d="M21 12a8 8 0 01-8 8H8l-5 3 1.5-5A8 8 0 1121 12z"/>',
  tag:'<path d="M3 3h8l10 10-8 8L3 11z"/><circle cx="7.5" cy="7.5" r="1.3"/>',
  image:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8.5" cy="9.5" r="1.8"/><path d="M4 18l5-5 3 3 3-3 5 5"/>',
  coins:'<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6"/><path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6"/>',
  grid:'<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  list:'<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
  doc:'<path d="M6 2h8l4 4v16H6z"/><path d="M14 2v4h4M9 13h6M9 17h6"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>',
  search:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/>',
  home:'<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  arrow:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  bell:'<path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9z"/><path d="M13.7 21a2 2 0 01-3.4 0"/>',
  warn:'<path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17h.01"/>',
  check:'<path d="M20 6L9 17l-5-5"/>',
  x:'<path d="M18 6L6 18M6 6l12 12"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/>',
  cal:'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
  trend:'<path d="M4 18l6-6 3 3 7-7"/><path d="M17 8h4v4"/>',
  people:'<circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0112 0"/><path d="M16 6a3 3 0 010 6"/><path d="M15 20a6 6 0 013-5"/>',
  server:'<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/>',
  truck:'<rect x="1.5" y="6.5" width="12.5" height="9" rx="1.2"/><path d="M14 10h4l3.5 3.5V15.5h-3"/><circle cx="6" cy="17.5" r="1.8"/><circle cx="16.5" cy="17.5" r="1.8"/>',
  flag:'<path d="M6 21V4"/><path d="M6 4h11l-2.6 3.8L17 11.5H6"/>',
  pin:'<path d="M12 17v5M8 4h8l-1 7 3 3H6l3-3z"/>',
  copy:'<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M15 5H5v10"/>',
  up:'<path d="M7 11l5-6 5 6"/><path d="M12 5v14"/>',
  down:'<path d="M17 13l-5 6-5-6"/><path d="M12 19V5"/>',
  refresh:'<path d="M20 11a8 8 0 10-2.3 5.7"/><path d="M20 5v6h-6"/>',
  send:'<path d="M4 12l16-8-6 16-3-6z"/>',
  clip:'<path d="M20 11l-8.5 8.5a4.5 4.5 0 01-6.4-6.4L13 5a3 3 0 014.2 4.2l-8 8a1.5 1.5 0 01-2.1-2.1L14 8"/>',
  share:'<path d="M15 8a3 3 0 100-6 3 3 0 000 6zM6 15a3 3 0 100-6 3 3 0 000 6zM15 22a3 3 0 100-6 3 3 0 000 6z"/><path d="M8.6 13.5l5.8 3M14.4 7.5l-5.8 3"/>',
  chev:'<path d="M6 9l6 6 6-6"/>',
  book:'<path d="M4 4h7a3 3 0 013 3v13a2.5 2.5 0 00-2.5-2.5H4z"/><path d="M20 4h-3a3 3 0 00-3 3v13a2.5 2.5 0 012.5-2.5H20z"/>',
  db:'<ellipse cx="12" cy="5.5" rx="8" ry="3"/><path d="M4 5.5v13c0 1.7 3.6 3 8 3s8-1.3 8-3v-13"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  term:'<rect x="2.5" y="4" width="19" height="16" rx="2"/><path d="M6.5 9l3 3-3 3M12 15h5"/>',
  folder:'<path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>',
  dl:'<path d="M12 3v12M7 11l5 5 5-5"/><path d="M4 21h16"/>',
  play:'<path d="M7 4l12 8-12 8z"/>',
  ext:'<path d="M14 4h6v6"/><path d="M20 4l-9 9"/><path d="M18 14v5a1 1 0 01-1 1H5a1 1 0 01-1-1V7a1 1 0 011-1h5"/>',
  sliders:'<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
  bolt:'<path d="M13 2L5 14h6l-1 8 8-12h-6z"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
  stop:'<rect x="6" y="6" width="12" height="12" rx="2"/>',
  inbox:'<path d="M3 12h5l2 3h4l2-3h5"/><path d="M3 12l3-8h12l3 8v6H3z"/>',
  gauge:'<path d="M4 15a8 8 0 1116 0"/><path d="M12 15l4-5"/><path d="M4 19h16"/><circle cx="12" cy="15" r="1.4"/>',
  swap:'<path d="M7 4l-4 4 4 4M3 8h13M17 20l4-4-4-4M21 16H8"/>',
  shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
  megaphone:'<path d="M3 11v2a1 1 0 001 1h1l3 4V6L5 10H4a1 1 0 00-1 1z"/><path d="M8 6l9-3v14l-9-3"/><path d="M17 8a3 3 0 010 6"/>',
  bag:'<path d="M6 8h12l-1.2 12H7.2z"/><path d="M9 8V6a3 3 0 016 0v2"/>'
};
const svg=(p,w=18)=>`<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${I[p]||p}</svg>`;

/* ── grafy (ručné SVG/CSS) ─────────────────────────────────── */
function bars(data){
  const max=Math.max(...data.map(d=>d.v||0),1);
  const grid=[75,50,25].map(p=>`<i style="top:${100-p}%"><b>${decs(Math.round(max*p/100*10)/10)}</b></i>`).join('');
  return `<div class="chartw"><div class="grid">${grid}</div><div class="bars">${data.map((d,i)=>`<div class="bar${d.v===max?' mx':''}">
    <span class="bv">${grp(d.v)}</span><div class="col" style="height:${Math.max(6,d.v/max*100)}%;--i:${i}"></div>
    <span class="bl">${tr(d.l)}</span></div>`).join('')}</div></div>`;
}
let _ag=0;
function lines(pg){
  const W=560,H=170,pad=8,n=pg.labels.length;
  const all=pg.series.flatMap(s=>s.v),mx=Math.max(...all),mn=Math.min(...all),rng=(mx-mn)||1;
  const X=i=>pad+i*(W-2*pad)/Math.max(1,n-1), Y=v=>H-18-((v-mn)/rng)*(H-40);
  const path=vs=>vs.map((v,i)=>(i?'L':'M')+X(i).toFixed(1)+' '+Y(v).toFixed(1)).join(' ');
  const mavg=vs=>vs.map((_,i)=>{const a=vs.slice(Math.max(0,i-2),i+1);return a.reduce((s,x)=>s+x,0)/a.length;});
  const p=pg.series.map(s=>`<path d="${path(s.v)}" fill="none" stroke="${s.color||'var(--acc)'}" stroke-width="2" stroke-linejoin="round"/>`).join('');
  const av=pg.avg?`<path d="${path(mavg(pg.series[0].v))}" fill="none" stroke="var(--ink-3)" stroke-width="1.6" stroke-dasharray="5 4"/>`:'';
  const lb=pg.labels.map((l,i)=>`<text x="${X(i).toFixed(1)}" y="${H-4}" text-anchor="middle" font-size="9" fill="var(--ink-3)" font-family="var(--mono)">${esc(tr(l))}</text>`).join('');
  const lg=`<div class="lgd" style="flex-direction:row;flex-wrap:wrap;gap:14px">${pg.series.map(s=>`<div class="lr" style="gap:6px"><i style="background:${s.color||'var(--acc)'}"></i><span>${esc(tr(s.l))}</span></div>`).join('')}${pg.avg?`<div class="lr" style="gap:6px"><i style="background:var(--ink-3)"></i><span>${state.lang==='sk'?'kĺzavý priemer':'moving average'}</span></div>`:''}</div>`;
  return `<svg class="area" style="height:${H}px" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${p}${av}${lb}</svg>${lg}`;
}
function donut(v,label){
  const r=42,c=2*Math.PI*r,off=c*(1-Math.max(0,Math.min(100,v))/100);
  return `<div class="donut"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="${r}" fill="none" stroke="var(--card-2)" stroke-width="9"/>
    <circle cx="50" cy="50" r="${r}" fill="none" stroke="var(--acc)" stroke-width="9" stroke-linecap="round"
      stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 50 50)"/></svg>
    <div><div style="font:700 26px var(--body);font-feature-settings:var(--tnum)">${decs(v)}${state.lang==='sk'?NBSP+'%':'%'}</div>
    <div class="dl">${esc(tr(label))}</div></div></div>`;
}

/* ── generický renderer blokov ─────────────────────────────── */
function cellHTML(c,i){
  if(c&&c.pln!==undefined){const v=c.pln,tok=v>=100?'var(--good)':v>=60?'var(--amber)':'var(--red)';
    return `<td><span class="plnw"><span class="plnbar"><i style="width:${Math.min(v,100)}%;background:${tok}"></i></span>
      <span class="n" style="font-family:var(--mono)">${decs(v)}${NBSP}%</span></span></td>`;}
  if(Array.isArray(c))return `<td><span class="badge ${esc(c[0])}">${esc(tr(c[1]))}</span></td>`;
  const s=fmtCell(c);
  const num=isNum(c)||(typeof s==='string'&&/^[~≈−+€—-]?[\d\s.,:%€/hms -]+$/.test(s)&&/\d/.test(s));
  return `<td class="${num?'n':''}">${i===0?`<b>${esc(s)}</b>`:esc(s)}</td>`;
}
function kpiCard(k){
  const v=(k.v&&k.v.t)?fmtCell(k.v):tr(k.v);
  const tone=k.tone?`<div class="d ${k.tone==='ok'?'up':k.tone==='no'?'down':'flat'}">${k.tone==='ok'?'OK':k.tone==='no'?(state.lang==='sk'?'pozor':'alert'):(state.lang==='sk'?'sleduj':'watch')}</div>`:'';
  return `<div class="kpi"><div class="l">${esc(tr(k.l))}</div><div class="v">${esc(v)}</div>
    ${k.sub?`<div class="d flat">${esc(tr(k.sub))}</div>`:tone}</div>`;
}
function mdLite(s){
  return esc(s).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/`([^`]+)`/g,'<code>$1</code>')
    .split('\n\n').map(par=>{
      const ls=par.split('\n');
      if(ls.every(l=>/^[-•]\s/.test(l)))return '<ul>'+ls.map(l=>`<li>${l.replace(/^[-•]\s/,'')}</li>`).join('')+'</ul>';
      return `<p>${ls.join('<br>')}</p>`;
    }).join('');
}
function block(b){
  switch(b.t){
    case 'kpis':return `<div class="kpis" style="margin-bottom:0">${b.items.map(kpiCard).join('')}</div>`;
    case 'bars':return `<div class="card"><div class="ch"><h3>${esc(tr(b.title))}</h3></div>${bars(b.data)}${b.note?`<div class="hm-note">${esc(tr(b.note))}</div>`:''}</div>`;
    case 'lines':return `<div class="card"><div class="ch"><h3>${esc(tr(b.title))}</h3></div>${lines(b)}${b.note?`<div class="hm-note">${esc(tr(b.note))}</div>`:''}</div>`;
    case 'donut':return `<div class="card"><div class="ch"><h3>${esc(tr(b.title))}</h3></div>${donut(b.pct,b.label)}${b.note?`<div class="hm-note">${esc(tr(b.note))}</div>`:''}</div>`;
    case 'table':return `${b.title?`<div class="card"><div class="ch"><h3>${esc(tr(b.title))}</h3></div>`:''}
      <div class="tbl-wrap"${b.title?' style="border:0;background:none"':''}><table class="t"><thead><tr>${b.cols.map(c=>`<th scope="col">${esc(tr(c))}</th>`).join('')}</tr></thead>
      <tbody>${b.rows.map(r=>`<tr style="cursor:default">${r.c.map(cellHTML).join('')}</tr>`).join('')}</tbody></table></div>
      ${b.note?`<div class="hm-note">${esc(tr(b.note))}</div>`:''}${b.title?'</div>':''}`;
    case 'cards':return `<div class="b${b.n===2?'2':'3'}">${b.items.map(it=>`<div class="gcard">
      <div class="gh"><div class="gt"><b>${esc(tr(it.title))}</b>${it.sub?`<small>${esc(tr(it.sub))}</small>`:''}</div>
        ${it.badge?`<span class="badge ${esc(it.badge[0])}">${esc(tr(it.badge[1]))}</span>`:''}</div>
      ${it.lines&&it.lines.length?`<div class="gl">${it.lines.map(l=>`<div class="gr"><span>${esc(tr(l[0]))}</span><b>${esc(tr(l[1]))}</b></div>`).join('')}</div>`:''}
      ${it.chips&&it.chips.length?`<div class="gc">${it.chips.map(c=>`<i>${esc(tr(c))}</i>`).join('')}</div>`:''}</div>`).join('')}</div>`;
    case 'list':return `<div class="card"><div class="ch"><h3>${esc(tr(b.title))}</h3></div><div class="glist">${b.items.map(it=>`<div class="gi">
      <div class="gx"><b>${esc(tr(it.title))}</b>${it.sub?`<small>${esc(tr(it.sub))}</small>`:''}</div>
      ${it.badge?`<span class="badge ${esc(it.badge[0])}">${esc(tr(it.badge[1]))}</span>`:''}
      ${it.meta?`<span class="gm">${esc(tr(it.meta))}</span>`:''}</div>`).join('')}</div>${b.note?`<div class="hm-note">${esc(tr(b.note))}</div>`:''}</div>`;
    case 'kanban':return `<div class="kb">${b.columns.map(col=>`<div class="kbcol"><div class="kh">${esc(tr(col.l))}<i>${col.items.length}</i></div>
      ${col.items.map(it=>`<div class="kbi"><b>${esc(tr(it.title))}</b>${it.sub?`<small>${esc(tr(it.sub))}</small>`:''}
        ${it.badge?`<span class="badge ${esc(it.badge[0])}">${esc(tr(it.badge[1]))}</span>`:''}</div>`).join('')}</div>`).join('')}</div>`;
    case 'form':return `<div class="card"><div class="ch"><h3>${esc(tr(b.title))}</h3></div><div class="gform">${b.fields.map(f=>{
        const ctl=f.type==='switch'?`<button class="sw" role="switch" aria-checked="${!!f.on}" aria-label="${esc(tr(f.l))}" onclick="swTog(this)"></button>`
          :f.type==='select'?`<button class="gsel" onclick="toast('${state.lang==='sk'?'Prepnuté (demo)':'Switched (demo)'}')">${esc(tr(f.v))} ${svg('chev',13)}</button>`
          :f.type==='textarea'?`<div class="gin ta">${esc(tr(f.v))}</div>`
          :`<div class="gin">${esc(tr(f.v))}</div>`;
        return `<div class="grow"${f.type==='textarea'?' style="grid-template-columns:1fr"':''}><div class="gfl"><b>${esc(tr(f.l))}</b>${f.s?`<small>${esc(tr(f.s))}</small>`:''}</div>${ctl}</div>`;
      }).join('')}</div>${b.note?`<div class="hm-note">${esc(tr(b.note))}</div>`:''}</div>`;
    case 'timeline':return `<div class="card"><div class="ch"><h3>${esc(tr(b.title))}</h3></div>
      <div class="time">${b.items.map(t=>`<div class="ti"><div class="mk"></div><div class="tt">${esc(tr(t[1]))}<small>${esc(tr(t[0]))}</small></div></div>`).join('')}</div></div>`;
    case 'gallery':return `<div class="card"><div class="ch"><h3>${esc(tr(b.title))}</h3></div>
      <div class="kpis" style="grid-template-columns:repeat(${Math.min(5,b.items.length)},1fr);margin-bottom:0">${b.items.map(c=>`<div class="kpi">
        <div class="l">${esc(tr(c.t))}</div><div class="v">${grp(c.n)}</div>${c.qa!==undefined?`<div class="d ${c.qa>=90?'up':'down'}">QA ${decs(c.qa)}${NBSP}%</div>`:''}</div>`).join('')}</div>
      ${b.note?`<div class="hm-note">${esc(tr(b.note))}</div>`:''}</div>`;
    case 'graph':return graphBlock(b);
    case 'banner':return `<div class="banner ${esc(b.tone)}">${svg(b.tone==='no'?'warn':b.tone==='ok'?'check':'warn')}<span>${esc(tr(b.text))}</span></div>`;
    case 'note':return `<div class="hm-note" style="margin:0">${esc(tr(b.text))}</div>`;
    case 'code':return `<div class="codew"><div class="cbar"><b>${esc(tr(b.title))}</b><span class="lg">${esc(b.lang||'text')}</span>
      <button class="cp" onclick="toast('${state.lang==='sk'?'Skopírované (demo)':'Copied (demo)'}')">${state.lang==='sk'?'Kopírovať':'Copy'}</button></div><pre>${esc(b.text)}</pre></div>`;
    default:return '';
  }
}
function graphBlock(b){
  const K={core:L('jadro','core'),project:L('projekt','project'),skill:L('skill','skill'),memory:L('spomienka','memory')};
  /* držíme nody v ploche — pri x nad ~94 % by dlhý štítok vytiekol z karty */
  b.nodes.forEach(n=>{n.x=Math.max(7,Math.min(93,n.x));n.y=Math.max(8,Math.min(92,n.y));});
  const ed=(b.edges||[]).map(([a,c])=>{const A=b.nodes[a],B=b.nodes[c];if(!A||!B)return '';
    return `<line x1="${A.x}%" y1="${A.y}%" x2="${B.x}%" y2="${B.y}%" stroke="var(--line)" stroke-width="1"/>`;}).join('');
  const nd=b.nodes.map(n=>`<div class="gnode ${n.k==='core'?'core':''} ${(n.s||1)>=5?'big':''}" style="left:${n.x}%;top:${n.y}%">
    <i class="k-${n.k}"></i>${esc(tr(n.l))}${n.s?`<span style="font:500 9.5px var(--mono);color:var(--ink-3)">${n.s}</span>`:''}</div>`).join('');
  const lg=Object.entries(K).map(([k,l])=>`<div class="lr" style="gap:6px"><i class="k-${k}" style="width:9px;height:9px;border-radius:50%"></i><span>${esc(tr(l))}</span></div>`).join('');
  return `<div class="card"><div class="ch"><h3>${esc(tr(b.title))}</h3><span class="sp">${b.nodes.length} ${state.lang==='sk'?'nodov':'nodes'} · ${(b.edges||[]).length} ${state.lang==='sk'?'spojení':'edges'}</span></div>
    <div class="gmap"><svg aria-hidden="true">${ed}</svg>${nd}</div>
    <div class="lgd" style="flex-direction:row;flex-wrap:wrap;gap:14px">${lg}</div>
    ${b.note?`<div class="hm-note">${esc(tr(b.note))}</div>`:''}</div>`;
}

/* ── register appiek ───────────────────────────────────────── */
const ACC={mind:'var(--b-mind)',chat:'var(--b-chat)',banner:'var(--b-ban)',retus:'var(--b-ret)',shop:'var(--b-shop)',auhub:'var(--b-hub)'};
const CHAT_META={key:'chat',name:'AuraAI Chat',port:'8082',icon:'chat',
  tag:L('Chatové okno rodiny Aura nad lokálnym modelom a pamäťou — s povinnou citáciou zdroja.',
        'The Aura family chat window over the local model and the mind — every claim carries its source.'),
  feat:[L('Konverzácie, projekty so súbormi a šablóny promptov','Conversations, projects with files and prompt templates'),
        L('Volania nástrojov (mind_recall, appky) so vstupom, výstupom a trvaním','Tool calls (mind_recall, apps) with input, output and duration'),
        L('Artefakty v bočnom paneli, spotreba proti stropu, zdieľanie read-only','Artifacts in a side panel, usage against the cap, read-only sharing')],
  screens:[]};
const APPS=[];
function reg(a){if(!a)return;const key=a.key==='hub'?'auhub':a.key;APPS.push(Object.assign({},a,{key,acc:ACC[key]||'var(--teal)'}));}
function appByKey(k){return APPS.find(a=>a.key===k);}
function screensOf(a){return (a.screens||[]).map(s=>s.key);}

/* ── rozcestník ────────────────────────────────────────────── */
const view=document.getElementById('view');
const setAcc=v=>document.documentElement.style.setProperty('--acc',v);
function renderHub(){
  setAcc('var(--teal)');
  const cards=APPS.map((a,i)=>`<button class="mcard" style="--ac:${a.acc}" onclick="go('#${a.key}${a.key==='chat'?'':'/'+screensOf(a)[0]}')">
    <span class="num">0${i+1}</span><div class="ico">${svg(a.icon,22)}</div>
    <h3>${esc(a.name)}</h3><p>${esc(tr(a.tag))}</p>
    <div class="meta"><span>${a.key==='chat'?(state.lang==='sk'?'chat + 8 plôch':'chat + 8 surfaces'):(screensOf(a).length+(state.lang==='sk'?' obrazoviek':' screens'))}</span>
      <span class="go">${state.lang==='sk'?'Otvoriť':'Open'} ${svg('arrow')}</span></div>
    <div class="livebar" style="margin-top:12px;margin-bottom:0"><span class="sdot ok"></span><span style="font:500 11px var(--mono);color:var(--ink-3)">:${a.port}</span></div>
  </button>`).join('');
  view.innerHTML=`<div class="hub an">
    <div class="eb">${state.lang==='sk'?'Aura AI a zvyšné aplikácie':'Aura AI and the remaining apps'}</div>
    <h1>${state.lang==='sk'?'Mysli, píš, <em>a appky poslúchajú</em>.':'Think, type, <em>and the apps follow</em>.'}</h1>
    <p class="lead">${state.lang==='sk'
      ?'Aura AI ako pamäť firmy, chatové okno nad ňou a štyri appky rodiny, ktoré v prvom náhľade chýbali.'
      :'Aura AI as the company memory, a chat window over it and the four family apps missing from the first preview.'}</p>
    <p class="note">${state.lang==='sk'
      ?'Náhľad rozhraní, nie funkčný backend. Overené čísla z pamäte Aura AI sú prenesené 1:1 a označené, ostatné hodnoty sú ukážkové. Klik na appku → obrazovky v ľavej navigácii.'
      :'An interface preview, not a working backend. Verified figures from the Aura AI mind are carried over 1:1 and labelled; the rest is illustrative. Click an app → screens in the left nav.'}</p>
    <div class="att"><span class="atl">${state.lang==='sk'?'Otvorené body':'Open items'}</span>
      <button class="ach no" onclick="go('#auhub/prevadzka')">${svg('warn',13)} ${state.lang==='sk'?'Tunel bez rotácie hesla':'Tunnel password not rotated'}</button>
      <button class="ach cond" onclick="go('#auhub/pripojenia')">${svg('server',13)} ${state.lang==='sk'?'3 appky bez /api/summary':'3 apps without /api/summary'}</button>
      <button class="ach cond" onclick="go('#mind/model')">${svg('bolt',13)} ${state.lang==='sk'?'Recall p50 4,2 s':'Recall p50 4.2 s'}</button>
    </div>
    <div class="grid6">${cards}</div></div>`;
}

/* ── shell appky ───────────────────────────────────────────── */
function shell(a,skey,inner,crumbExtra){
  setAcc(a.acc);
  const nav=(a.screens||[]).map(s=>`<a onclick="go('#${a.key}/${s.key}')" class="${s.key===skey?'on':''}" ${s.key===skey?'aria-current="page"':''}>${svg(s.icon||'doc')}<span>${esc(tr(s.title))}</span></a>`).join('');
  const rail=APPS.map(x=>`<a onclick="go('#${x.key}${x.key==='chat'?'':'/'+screensOf(x)[0]}')" class="${x.key===a.key?'on':''}" style="--ac:${x.acc}" title="${esc(x.name)}" aria-label="${esc(x.name)}">${svg(x.icon)}</a>`).join('');
  const cur=(a.screens||[]).find(s=>s.key===skey);
  return `<div class="shell an">
    <aside class="side" id="side">
      <div class="mrail">${rail}</div>
      <div class="mname">${esc(a.name)}<small>:${a.port}</small></div>
      <nav class="nav" aria-label="${esc(a.name)}">${nav}</nav>
      <a class="hubl" onclick="go('#hub')">${svg('home',15)}<span>${state.lang==='sk'?'Späť na rozcestník':'Back to hub'}</span></a>
    </aside>
    <div class="drawer-scrim" onclick="closeDrawer()"></div>
    <main class="main">
      <div class="topb">
        <nav class="crumb" aria-label="breadcrumb"><a onclick="go('#hub')">Aura</a> ⁄ <a onclick="go('#${a.key}/${screensOf(a)[0]}')">${esc(a.name)}</a> ⁄ <b>${esc(tr(cur?cur.title:''))}${crumbExtra?' · '+esc(crumbExtra):''}</b></nav>
        <button class="search" onclick="openCmdk()" aria-label="${state.lang==='sk'?'Hľadať':'Search'}">${svg('search',15)}<span>${state.lang==='sk'?'Hľadať…':'Search…'}</span><span class="kbd">⌘K</span></button>
        <button class="icon-btn" onclick="go('#chat')" aria-label="AuraAI">${svg('chat')}</button>
        <button class="avatar" onclick="toast('${state.lang==='sk'?'Profil (demo)':'Profile (demo)'}')">SP</button>
      </div>
      <div class="content" id="content">${inner}</div>
    </main></div>`;
}
function renderScreen(a,s){
  const blocks=(s.blocks||[]).map(block).join('');
  const html=`<div class="phead"><h1>${esc(tr(s.title))}</h1><span class="sub">${esc(tr(s.sub||a.tag))}</span>
    <div class="actions"><button class="btn" onclick="toast('${state.lang==='sk'?'Export pripravený (demo)':'Export ready (demo)'}')">${svg('dl',14)} Export</button>
      <button class="btn pri" onclick="go('#chat')">${svg('chat',14)} ${state.lang==='sk'?'Spýtať sa AuraAI':'Ask AuraAI'}</button></div></div>
    <div class="blocks">${blocks}</div>`;
  view.innerHTML=shell(a,s.key,html);
}

/* ── chróm: toasty, ⌘K, drawer ─────────────────────────────── */
function toast(msg){
  const w=document.getElementById('toasts');const el=document.createElement('div');
  el.className='toast';el.setAttribute('role','status');el.innerHTML=`${svg('check',15)}<span>${esc(msg)}</span>`;
  w.appendChild(el);setTimeout(()=>{el.style.opacity='0';el.style.transform='translateY(6px)';setTimeout(()=>el.remove(),260);},2100);
}
function swTog(el){const on=el.getAttribute('aria-checked')==='true';el.setAttribute('aria-checked',String(!on));
  toast((state.lang==='sk'?'Prepnuté: ':'Toggled: ')+(on?(state.lang==='sk'?'vypnuté':'off'):(state.lang==='sk'?'zapnuté':'on')));}
function closeOverlay(){document.querySelectorAll('.scrim,.cmdk,.modal,.dropdown').forEach(e=>e.remove());state.overlay=null;}
function scrim(){const s=document.createElement('div');s.className='scrim';s.onclick=closeOverlay;document.body.appendChild(s);return s;}
function cmdkIndex(){
  const out=[{cc:'var(--b-chat)',ic:'chat',t:L('Nová konverzácia s AuraAI','New AuraAI conversation'),s:L('chat nad pamäťou a appkami','chat over the mind and the apps'),kind:'AI',go:'#chat'}];
  APPS.forEach(a=>{
    out.push({cc:a.acc,ic:a.icon,t:a.name,s:tr(a.tag),kind:L('Aplikácia','App'),go:'#'+a.key+(a.key==='chat'?'':'/'+screensOf(a)[0])});
    (a.screens||[]).forEach(s=>out.push({cc:a.acc,ic:s.icon||'doc',t:tr(s.title)+' — '+a.name,s:tr(s.sub||''),kind:L('Obrazovka','Screen'),go:`#${a.key}/${s.key}`}));
  });
  (CHAT.convos||[]).slice(0,6).forEach(c=>out.push({cc:'var(--b-chat)',ic:'chat',t:tr(c.title),s:tr(c.snippet||''),kind:L('Konverzácia','Chat'),go:'#chat/'+c.id}));
  return out;
}
function openCmdk(){
  closeOverlay();scrim();state.overlay='cmdk';
  const idx=cmdkIndex();const el=document.createElement('div');el.className='cmdk';
  el.innerHTML=`<div class="ci">${svg('search')}<input id="cmdkIn" placeholder="${state.lang==='sk'?'Hľadať appky, obrazovky, konverzácie…':'Search apps, screens, conversations…'}" aria-label="search"></div><div class="cres" id="cmdkRes"></div>`;
  document.body.appendChild(el);
  const draw=q=>{q=(q||'').toLowerCase().trim();
    const res=idx.filter(x=>!q||(tr(x.t)+' '+tr(x.s)).toLowerCase().includes(q)).slice(0,8);
    document.getElementById('cmdkRes').innerHTML=res.length
      ?res.map(x=>`<div class="cr" style="--cc:${x.cc}" onclick="closeOverlay();go('${x.go}')"><span class="ic">${svg(x.ic,16)}</span>
        <div class="ct"><b>${esc(tr(x.t))}</b><small>${esc(tr(x.s))}</small></div><span class="kind">${esc(tr(x.kind))}</span></div>`).join('')
      :`<div class="cempty">${state.lang==='sk'?'Nič sa nenašlo.':'Nothing found.'}</div>`;};
  draw('');const inp=document.getElementById('cmdkIn');inp.oninput=e=>draw(e.target.value);inp.focus();
}
function toggleDrawer(){document.body.classList.toggle('drawer');document.body.classList.toggle('csider');}
function closeDrawer(){document.body.classList.remove('drawer');document.body.classList.remove('csider');}

/* ── router ────────────────────────────────────────────────── */
function go(h){location.hash=h;}
function route(){
  closeOverlay();closeDrawer();
  const seg=(location.hash.replace(/^#/,'')||'hub').split('/');
  window.scrollTo(0,0);
  if(seg[0]==='chat')return renderChat(seg.slice(1));
  const a=appByKey(seg[0]);
  if(!a)return renderHub();
  const s=(a.screens||[]).find(x=>x.key===seg[1])||(a.screens||[])[0];
  if(!s)return renderHub();
  renderScreen(a,s);
}
window.addEventListener('hashchange',route);

/* jazyk a téma */
function applyStatic(){
  document.documentElement.lang=state.lang;
  document.title=state.lang==='sk'?'Aura AI · chat a zvyšné aplikácie':'Aura AI · chat and the remaining apps';
  const d=document.querySelector('.demo-tag');if(d)d.textContent=state.lang==='sk'?'Demo · ukážkové dáta':'Demo · sample data';
}
document.getElementById('langseg').addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;state.lang=b.dataset.lang;
  document.querySelectorAll('#langseg button').forEach(x=>{const on=x===b;x.classList.toggle('on',on);x.setAttribute('aria-pressed',String(on));});
  applyStatic();route();
});
document.getElementById('themebtn').addEventListener('click',function(){
  state.theme=state.theme==='dark'?'light':'dark';
  document.documentElement.dataset.theme=state.theme;
  this.setAttribute('aria-pressed',String(state.theme==='light'));
});
document.getElementById('hambBtn').addEventListener('click',toggleDrawer);
document.addEventListener('keydown',e=>{
  const tag=(e.target.tagName||'').toLowerCase();
  if((e.metaKey||e.ctrlKey)&&(e.key||'').toLowerCase()==='k'){e.preventDefault();openCmdk();return;}
  if(e.key==='Escape'){if(state.overlay){closeOverlay();return;}if(state.art){state.art=null;route();return;}
    if(location.hash&&location.hash!=='#hub'){go('#hub');}return;}
  if(tag==='input'||tag==='textarea'||e.metaKey||e.ctrlKey||e.altKey)return;
  if(/^[1-6]$/.test(e.key)){const a=APPS[Number(e.key)-1];if(a)go('#'+a.key+(a.key==='chat'?'':'/'+screensOf(a)[0]));return;}
  const seg=(location.hash.replace(/^#/,'')||'hub').split('/');const a=appByKey(seg[0]);
  if(a&&(e.key==='ArrowLeft'||e.key==='ArrowRight')){
    const ks=screensOf(a);const i=ks.indexOf(seg[1]);if(i<0)return;
    const n=e.key==='ArrowRight'?Math.min(ks.length-1,i+1):Math.max(0,i-1);go(`#${a.key}/${ks[n]}`);
  }
});

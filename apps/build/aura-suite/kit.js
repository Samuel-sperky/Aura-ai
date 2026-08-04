/* ══════════════════════════════════════════════════════════════
   AURA SUITE KIT — jadro (časť 1/2)
   Formátovanie · ikony · grafy · renderer blokov · shell · router.
   Jedna appka na stránku: dáta prichádzajú v globále APP,
   meta všetkých appiek rodiny v APPS_META (vkladá assemble.mjs).
   Bez CDN, bez localStorage. Grafy sú ručné SVG/CSS.
   ══════════════════════════════════════════════════════════════ */
const L=(sk,en)=>({sk,en});
const state={lang:'sk',theme:'dark',overlay:null,sort:{},page:{},tab:{},extra:{},toggles:{},
  conn:{out:false,tick:0},audit:[],imp:{hist:[],last:null},chat:{open:false,msgs:[]}};
const tr=o=>(o&&typeof o==='object'&&'sk'in o)?o[state.lang]:o;
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const NBSP=' ';
function grp(n){const neg=n<0;n=Math.abs(Math.round(n));const sep=state.lang==='sk'?NBSP:',';
  return (neg?'−':'')+String(n).replace(/\B(?=(\d{3})+(?!\d))/g,sep);}
function decs(n){const neg=n<0;n=Math.abs(n);const p=String(n).split('.');const d=state.lang==='sk'?',':'.';
  return (neg?'−':'')+(p[1]?`${grp(Number(p[0]))}${d}${p[1]}`:grp(Number(p[0])));}
function money(n){const s=decs(n);return state.lang==='sk'?`${s}${NBSP}€`:`€${s}`;}
function pct(n){return `${decs(n)}${state.lang==='sk'?NBSP+'%':'%'}`;}
const cur=v=>({t:'cur',v}), int=v=>({t:'int',v}), pc=v=>({t:'pct',v});
function fmtCell(c){if(c&&c.t==='cur')return money(c.v);if(c&&c.t==='int')return grp(c.v);if(c&&c.t==='pct')return pct(c.v);return tr(c);}
function isNum(c){return c&&(c.t==='cur'||c.t==='int'||c.t==='pct');}
/* hodnota môže byť aj bunka cur()/int()/pc() — nikdy nie surové tr() */
const val=x=>(x&&x.t)?fmtCell(x):tr(x);
/* deterministický PRNG — žiadny Math.random, aby bol náhľad opakovateľný */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);
  t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function hashStr(s){let h=0;for(let i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return h>>>0;}

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
sliders:'<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/>',
bolt:'<path d="M13 2L5 14h6l-1 8 8-12h-6z"/>',
clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
stop:'<rect x="6" y="6" width="12" height="12" rx="2"/>',
inbox:'<path d="M3 12h5l2 3h4l2-3h5"/><path d="M3 12l3-8h12l3 8v6H3z"/>',
gauge:'<path d="M4 15a8 8 0 1116 0"/><path d="M12 15l4-5"/><path d="M4 19h16"/><circle cx="12" cy="15" r="1.4"/>',
swap:'<path d="M7 4l-4 4 4 4M3 8h13M17 20l4-4-4-4M21 16H8"/>',
shield:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>',
megaphone:'<path d="M3 11v2a1 1 0 001 1h1l3 4V6L5 10H4a1 1 0 00-1 1z"/><path d="M8 6l9-3v14l-9-3"/><path d="M17 8a3 3 0 010 6"/>',
bag:'<path d="M6 8h12l-1.2 12H7.2z"/><path d="M9 8V6a3 3 0 016 0v2"/>',
filter:'<path d="M3 5h18l-7 8v6l-4-2v-4z"/>',
lock:'<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 018 0v3"/>'
};
const svg=(p,w=18)=>`<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${I[p]||p}</svg>`;

/* ── grafy ─────────────────────────────────────────────────── */
function bars(data){
  const max=Math.max(...data.map(d=>d.v||0),1);
  const grid=[75,50,25].map(p=>`<i style="top:${100-p}%"><b>${decs(Math.round(max*p/100*10)/10)}</b></i>`).join('');
  return `<div class="chartw"><div class="grid">${grid}</div><div class="bars">${data.map((d,i)=>`<div class="bar${d.v===max?' mx':''}">
    <span class="bv">${grp(d.v)}</span><div class="col" style="height:${Math.max(5,d.v/max*100)}%;--i:${i}"></div>
    <span class="bl">${esc(tr(d.l))}</span></div>`).join('')}</div></div>`;
}
function lines(pg){
  const W=560,H=170,pad=8,n=(pg.labels||[]).length;
  const all=pg.series.flatMap(s=>s.v),mx=Math.max(...all),mn=Math.min(...all),rng=(mx-mn)||1;
  const X=i=>pad+i*(W-2*pad)/Math.max(1,n-1), Y=v=>H-18-((v-mn)/rng)*(H-40);
  const path=vs=>vs.map((v,i)=>(i?'L':'M')+X(i).toFixed(1)+' '+Y(v).toFixed(1)).join(' ');
  const mavg=vs=>vs.map((_,i)=>{const a=vs.slice(Math.max(0,i-2),i+1);return a.reduce((s,x)=>s+x,0)/a.length;});
  const p=pg.series.map(s=>`<path d="${path(s.v)}" fill="none" stroke="${s.color||'var(--acc)'}" stroke-width="2" stroke-linejoin="round"/>`).join('');
  const av=pg.avg?`<path d="${path(mavg(pg.series[0].v))}" fill="none" stroke="var(--ink-3)" stroke-width="1.6" stroke-dasharray="5 4"/>`:'';
  const lb=(pg.labels||[]).map((l,i)=>`<text x="${X(i).toFixed(1)}" y="${H-4}" text-anchor="middle" font-size="9" fill="var(--ink-3)" font-family="var(--mono)">${esc(tr(l))}</text>`).join('');
  const lg=`<div class="lgd" style="flex-direction:row;flex-wrap:wrap;gap:14px">${pg.series.map(s=>`<div class="lr" style="gap:6px"><i style="background:${s.color||'var(--acc)'}"></i><span>${esc(tr(s.l))}</span></div>`).join('')}${pg.avg?`<div class="lr" style="gap:6px"><i style="background:var(--ink-3)"></i><span>${state.lang==='sk'?'kĺzavý priemer':'moving average'}</span></div>`:''}</div>`;
  return `<svg class="area" style="height:${H}px" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${p}${av}${lb}</svg>${lg}`;
}
function stackChart(b){
  const totals=b.labels.map((_,i)=>b.series.reduce((s,sr)=>s+(sr.v[i]||0),0));const mx=Math.max(...totals,1);
  return `<div class="bars" style="height:190px">${b.labels.map((l,i)=>`<div class="bar"><span class="bv">${grp(totals[i])}</span>
    <div class="col" style="height:${Math.max(8,totals[i]/mx*100)}%;--i:${i};background:none;display:flex;flex-direction:column-reverse;gap:1px">
      ${b.series.map(sr=>`<div title="${esc(tr(sr.l))}: ${grp(sr.v[i]||0)}" style="height:${totals[i]?(sr.v[i]||0)/totals[i]*100:0}%;background:color-mix(in srgb,${sr.tone||'var(--acc)'} 72%,var(--card));border-radius:2px"></div>`).join('')}
    </div><span class="bl">${esc(tr(l))}</span></div>`).join('')}</div>
  <div class="lgd" style="flex-direction:row;flex-wrap:wrap;gap:14px;margin-top:12px">${b.series.map(sr=>`<div class="lr" style="gap:6px"><i style="background:${sr.tone||'var(--acc)'}"></i><span>${esc(tr(sr.l))}</span></div>`).join('')}</div>`;
}
function donut(v,label){
  const r=42,c=2*Math.PI*r,off=c*(1-Math.max(0,Math.min(100,v))/100);
  return `<div class="donut"><svg viewBox="0 0 100 100" aria-hidden="true"><circle cx="50" cy="50" r="${r}" fill="none" stroke="var(--card-2)" stroke-width="9"/>
    <circle cx="50" cy="50" r="${r}" fill="none" stroke="var(--acc)" stroke-width="9" stroke-linecap="round"
      stroke-dasharray="${c.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}" transform="rotate(-90 50 50)"/></svg>
    <div><div style="font:700 26px var(--body);font-feature-settings:var(--tnum)">${decs(v)}${state.lang==='sk'?NBSP+'%':'%'}</div>
    <div class="dl">${esc(tr(label))}</div></div></div>`;
}
function heat(b){
  const cell=v=>{if(v==null)return `<div class="cell" style="background:color-mix(in srgb,var(--ink-3) 14%,var(--card-2));color:var(--ink-3)">—</div>`;
    const tok=v>=100?'var(--good)':v>=60?'var(--amber)':'var(--red)';
    return `<div class="cell" style="background:color-mix(in srgb,${tok} ${v>=100?42:v>=60?30:26}%,var(--card-2))" title="${decs(v)} %">${decs(v)}</div>`;};
  const cols=b.cols.length;
  return `<div class="hm" style="--hc:${cols}"><div class="hrow" style="grid-template-columns:118px repeat(${cols},1fr)"><span></span>${b.cols.map(c=>`<span class="mh">${esc(tr(c))}</span>`).join('')}</div>
    ${b.rows.map(r=>`<div class="hrow" style="grid-template-columns:118px repeat(${cols},1fr)"><span class="hl">${esc(tr(r.l))}</span>${r.v.map(cell).join('')}</div>`).join('')}</div>`;
}
function gantt(b){
  const today=b.today!=null?`<div style="position:absolute;left:calc(64px + (100% - 172px)*${b.today/100});top:-6px;bottom:-6px;width:1px;background:var(--gold);opacity:.7"></div>`:'';
  return `<div class="gantt" style="position:relative">${today}
    ${b.rows.map(r=>`<div class="grow"><span class="gl">${esc(tr(r.l))}</span>
      <div class="gtrack"><div class="gfill" style="margin-left:${r.s||0}%;width:${r.w||10}%"></div></div>
      <span class="gst">${r.b?`<span class="badge ${esc(r.b[0])} mono" style="font-size:10px">${esc(tr(r.b[1]))}</span>`:''}</span></div>`).join('')}</div>`;
}
function matrix(b){
  const ST=[L('chýba','missing'),L('koncept','draft'),L('hotový','done')];
  const cnt=[0,0,0];Object.values(b.st).forEach(a=>a.forEach(v=>cnt[v]++));
  const head=`<div class="mfr" style="grid-template-columns:76px repeat(${b.cols.length},1fr)"><span></span>${b.cols.map(c=>`<span class="mfh">${esc(tr(c))}</span>`).join('')}</div>`;
  const body=b.rows.map((r,ri)=>{const key=typeof r==='string'?r:(r.k||tr(r));const st=b.st[key]||[];
    return `<div class="mfr" style="grid-template-columns:76px repeat(${b.cols.length},1fr)"><span class="mfl">${esc(typeof r==='string'?r:tr(r.l||r))}</span>
      ${b.cols.map((_,ci)=>{const v=st[ci]==null?0:st[ci];
        return `<span class="mfc s${v}" title="${esc(tr(ST[v]))}">${v===2?'✓':v===1?'~':'—'}</span>`;}).join('')}</div>`;}).join('');
  return `<div class="mfx">${head}${body}</div>
    <div class="lgd" style="flex-direction:row;gap:14px;margin-top:12px">
      ${[2,1,0].map(i=>`<div class="lr" style="gap:6px"><i style="background:${i===2?'color-mix(in srgb,var(--good) 60%,transparent)':i===1?'color-mix(in srgb,var(--amber) 60%,transparent)':'var(--ink-3)'}"></i><span>${esc(tr(ST[i]))} · ${cnt[i]}</span></div>`).join('')}</div>`;
}
function graphBlock(b){
  const K={core:L('jadro','core'),project:L('projekt','project'),skill:L('skill','skill'),memory:L('spomienka','memory')};
  b.nodes.forEach(n=>{n.x=Math.max(7,Math.min(93,n.x));n.y=Math.max(8,Math.min(92,n.y));});
  const ed=(b.edges||[]).map(([a,c])=>{const A=b.nodes[a],B=b.nodes[c];if(!A||!B)return '';
    return `<line x1="${A.x}%" y1="${A.y}%" x2="${B.x}%" y2="${B.y}%" stroke="var(--line)" stroke-width="1"/>`;}).join('');
  const nd=b.nodes.map(n=>`<div class="gnode ${n.k==='core'?'core':''} ${(n.s||1)>=5?'big':''}" style="left:${n.x}%;top:${n.y}%">
    <i class="k-${n.k}"></i>${esc(tr(n.l))}${n.s?`<span style="font:500 9.5px var(--mono);color:var(--ink-3)">${n.s}</span>`:''}</div>`).join('');
  return `<div class="gmap"><svg aria-hidden="true">${ed}</svg>${nd}</div>
    <div class="lgd" style="flex-direction:row;flex-wrap:wrap;gap:14px">${Object.entries(K).map(([k,l])=>`<div class="lr" style="gap:6px"><i class="k-${k}" style="width:9px;height:9px;border-radius:50%"></i><span>${esc(tr(l))}</span></div>`).join('')}</div>`;
}

/* ── tabuľka s triedením a stránkovaním ────────────────────── */
const PAGE=12;
function cellTxt(c){if(c&&c.pln!==undefined)return String(c.pln);if(Array.isArray(c))return tr(c[1]);return String(fmtCell(c));}
function cellHTML(c,i){
  if(c&&c.pln!==undefined){const v=c.pln,tok=v>=100?'var(--good)':v>=60?'var(--amber)':'var(--red)';
    return `<td><span class="plnw"><span class="plnbar"><i style="width:${Math.min(v,100)}%;background:${tok}"></i></span>
      <span class="n" style="font-family:var(--mono)">${decs(v)}${NBSP}%</span></span></td>`;}
  if(Array.isArray(c))return `<td><span class="badge ${esc(c[0])}">${esc(tr(c[1]))}</span></td>`;
  if(typeof c==='string'&&/^[↑↓→—]$/.test(c)){const cl=c==='↑'?'tr-up':c==='↓'?'tr-dn':'tr-fl';return `<td class="${cl}" style="font-size:15px">${c}</td>`;}
  const s=fmtCell(c);
  const num=isNum(c)||(typeof s==='string'&&/^[~≈−+€—-]?[\d\s.,:%€/hms -]+$/.test(s)&&/\d/.test(s));
  return `<td class="${num?'n':''}">${i===0?`<b>${esc(s)}</b>`:esc(s)}</td>`;
}
function tableBlock(b,bi){
  const id=(CURSCR||'')+'-'+bi;
  const rows0=(state.extra[id]||[]).concat(b.rows);
  const so=state.sort[id];
  let rows=rows0.slice();
  if(so){const{i,dir}=so;rows.sort((a,x)=>{const A=cellTxt(a.c[i]),X=cellTxt(x.c[i]);
    const na=parseFloat(String(A).replace(/[^\d.,-]/g,'').replace(/\s/g,'').replace(',','.'));
    const nx=parseFloat(String(X).replace(/[^\d.,-]/g,'').replace(/\s/g,'').replace(',','.'));
    const r=(!isNaN(na)&&!isNaN(nx))?na-nx:String(A).localeCompare(String(X),'sk');
    return dir==='asc'?r:-r;});}
  const paged=b.page!==false&&rows.length>PAGE;
  const pg=Math.min(state.page[id]||0,paged?Math.ceil(rows.length/PAGE)-1:0);
  const view=paged?rows.slice(pg*PAGE,(pg+1)*PAGE):rows;
  const th=b.cols.map((c,i)=>{const a=so&&so.i===i?(so.dir==='asc'?'ascending':'descending'):'none';
    return `<th scope="col" aria-sort="${a}" onclick="sortBy('${id}',${i})" style="cursor:pointer">${esc(tr(c))}${so&&so.i===i?(so.dir==='asc'?' ↑':' ↓'):''}</th>`;}).join('');
  const pager=paged?`<div class="pgr"><span>${state.lang==='sk'?'Riadky':'Rows'} ${pg*PAGE+1}–${Math.min(rows.length,(pg+1)*PAGE)} ${state.lang==='sk'?'z':'of'} ${rows.length}</span>
    <button class="btn" ${pg===0?'disabled':''} onclick="pageBy('${id}',-1)">←</button>
    <button class="btn" ${(pg+1)*PAGE>=rows.length?'disabled':''} onclick="pageBy('${id}',1)">→</button></div>`:'';
  const body=view.length?view.map(r=>`<tr${r.go?` onclick="go('#${r.go}')" style="cursor:pointer"`:' style="cursor:default"'}>${r.c.map(cellHTML).join('')}</tr>`).join('')
    :`<tr><td colspan="${b.cols.length}" style="text-align:center;color:var(--ink-3);padding:26px">${state.lang==='sk'?'Žiadne riadky':'No rows'}</td></tr>`;
  const inner=`<div class="tbl-wrap"${b.title?' style="border:0;background:none"':''}><table class="t"><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table></div>${pager}
    ${b.note?`<div class="hm-note">${esc(tr(b.note))}</div>`:''}`;
  return b.title?`<div class="card"><div class="ch"><h3>${esc(tr(b.title))}</h3><span class="sp">${rows.length} ${state.lang==='sk'?'riadkov':'rows'}</span></div>${inner}</div>`:inner;
}
function sortBy(id,i){const s=state.sort[id];state.sort[id]=(s&&s.i===i&&s.dir==='asc')?{i,dir:'desc'}:{i,dir:'asc'};route();}
function pageBy(id,d){state.page[id]=Math.max(0,(state.page[id]||0)+d);route();}

/* ── karty a bloky ─────────────────────────────────────────── */
function kpiCard(k){
  const v=(k.v&&k.v.t)?fmtCell(k.v):tr(k.v);
  const live=k.live&&APP.api?`<span class="cn-glyph">● live ${connTime()}</span>`:'';
  const tone=k.tone?`<div class="d ${k.tone==='ok'?'up':k.tone==='no'?'down':'flat'}">${k.tone==='ok'?'OK':k.tone==='no'?(state.lang==='sk'?'pozor':'alert'):(state.lang==='sk'?'sleduj':'watch')}</div>`:'';
  return `<div class="kpi"><div class="l">${esc(tr(k.l))}${live}</div><div class="v">${esc(v)}</div>
    ${k.sub?`<div class="d flat">${esc(val(k.sub))}</div>`:tone}</div>`;
}
function mdLite(s){
  return esc(s).replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>').replace(/`([^`]+)`/g,'<code>$1</code>')
    .split('\n\n').map(par=>{const ls=par.split('\n');
      if(ls.every(l=>/^[-•]\s/.test(l)))return '<ul>'+ls.map(l=>`<li>${l.replace(/^[-•]\s/,'')}</li>`).join('')+'</ul>';
      return `<p>${ls.join('<br>')}</p>`;}).join('');
}
let CURSCR=null;
function block(b,bi){
  const wrap=(t,inner,note)=>`<div class="card"><div class="ch"><h3>${esc(tr(t))}</h3></div>${inner}${note?`<div class="hm-note">${esc(tr(note))}</div>`:''}</div>`;
  switch(b.t){
    case 'kpis':return `<div class="kpis" style="margin-bottom:0">${b.items.map(kpiCard).join('')}</div>`;
    case 'bars':return wrap(b.title,bars(b.data),b.note);
    case 'lines':return wrap(b.title,lines(b),b.note);
    case 'stack':return wrap(b.title,stackChart(b),b.note);
    case 'donut':return wrap(b.title,donut(b.pct,b.label),b.note);
    case 'heat':return wrap(b.title,heat(b),b.note);
    case 'gantt':return wrap(b.title,gantt(b),b.note);
    case 'matrix':return wrap(b.title,matrix(b),b.note);
    case 'graph':return wrap(b.title,graphBlock(b),b.note);
    case 'table':return tableBlock(b,bi);
    case 'cards':return `<div class="b${b.n===2?'2':'3'}">${b.items.map(it=>`<div class="gcard">
      <div class="gh"><div class="gt"><b>${esc(val(it.title))}</b>${it.sub?`<small>${esc(val(it.sub))}</small>`:''}</div>
        ${it.badge?`<span class="badge ${esc(it.badge[0])}">${esc(tr(it.badge[1]))}</span>`:''}</div>
      ${it.lines&&it.lines.length?`<div class="gl">${it.lines.map(l=>`<div class="gr"><span>${esc(tr(l[0]))}</span><b>${esc(val(l[1]))}</b></div>`).join('')}</div>`:''}
      ${it.chips&&it.chips.length?`<div class="gc">${it.chips.map(c=>`<i>${esc(val(c))}</i>`).join('')}</div>`:''}</div>`).join('')}</div>`;
    case 'list':return wrap(b.title,`<div class="glist">${b.items.map(it=>`<div class="gi">
      <div class="gx"><b>${esc(val(it.title))}</b>${it.sub?`<small>${esc(val(it.sub))}</small>`:''}</div>
      ${it.badge?`<span class="badge ${esc(it.badge[0])}">${esc(tr(it.badge[1]))}</span>`:''}
      ${it.meta?`<span class="gm">${esc(val(it.meta))}</span>`:''}</div>`).join('')}</div>`,b.note);
    case 'kanban':return `<div class="kb">${b.columns.map(col=>`<div class="kbcol"><div class="kh">${esc(tr(col.l))}<i>${col.items.length}</i></div>
      ${col.items.map(it=>`<div class="kbi"><b>${esc(val(it.title))}</b>${it.sub?`<small>${esc(val(it.sub))}</small>`:''}
        ${it.badge?`<span class="badge ${esc(it.badge[0])}">${esc(tr(it.badge[1]))}</span>`:''}</div>`).join('')}</div>`).join('')}</div>`;
    case 'form':return wrap(b.title,`<div class="gform">${b.fields.map((f,fi)=>{
        const key=(CURSCR||'')+'.'+bi+'.'+fi;
        const on=state.toggles[key]!==undefined?state.toggles[key]:!!f.on;
        const ctl=f.type==='switch'?`<button class="sw" role="switch" aria-checked="${on}" aria-label="${esc(tr(f.l))}" onclick="swTog(this,'${key}','${esc(tr(f.l)).replace(/'/g,'')}')"></button>`
          :f.type==='select'?`<button class="gsel" onclick="toast('${state.lang==='sk'?'Prepnuté (demo)':'Switched (demo)'}')">${esc(val(f.v))} ${svg('chev',13)}</button>`
          :f.type==='textarea'?`<div class="gin ta">${esc(val(f.v))}</div>`
          :`<div class="gin">${esc(val(f.v))}</div>`;
        return `<div class="grow"${f.type==='textarea'?' style="grid-template-columns:1fr"':''}><div class="gfl"><b>${esc(tr(f.l))}</b>${f.s?`<small>${esc(tr(f.s))}</small>`:''}</div>${ctl}</div>`;
      }).join('')}</div>`,b.note);
    case 'timeline':return wrap(b.title,`<div class="time">${b.items.map(t=>`<div class="ti"><div class="mk"></div><div class="tt">${esc(val(t[1]))}<small>${esc(val(t[0]))}</small></div></div>`).join('')}</div>`,b.note);
    case 'gallery':return wrap(b.title,`<div class="kpis" style="grid-template-columns:repeat(${Math.min(5,b.items.length)},1fr);margin-bottom:0">
      ${b.items.map(c=>`<div class="kpi"><div class="l">${esc(val(c.t))}</div><div class="v">${grp(c.n)}</div>
        ${c.qa!==undefined?`<div class="d ${c.qa>=90?'up':'down'}">QA ${decs(c.qa)}${NBSP}%</div>`:''}</div>`).join('')}</div>`,b.note);
    case 'banner':return `<div class="banner ${esc(b.tone)}">${svg(b.tone==='ok'?'check':'warn')}<span>${esc(tr(b.text))}</span></div>`;
    case 'note':return `<div class="hm-note" style="margin:0">${esc(tr(b.text))}</div>`;
    case 'code':return `<div class="codew"><div class="cbar"><b>${esc(tr(b.title))}</b><span class="lg">${esc(b.lang||'text')}</span>
      <button class="cp" onclick="toast('${state.lang==='sk'?'Skopírované (demo)':'Copied (demo)'}')">${state.lang==='sk'?'Kopírovať':'Copy'}</button></div><pre>${esc(b.text)}</pre></div>`;
    default:return '';
  }
}

/* ── shell ─────────────────────────────────────────────────── */
const view=document.getElementById('view');
const setAcc=v=>document.documentElement.style.setProperty('--acc',v);
const screensOf=()=>(APP.screens||[]).map(s=>s.key);
function scr(k){return (APP.screens||[]).find(s=>s.key===k)||(APP.screens||[])[0];}
function shell(s,inner){
  setAcc(APP.acc||'var(--teal)');
  const nav=(APP.screens||[]).map(x=>`<a onclick="go('#${x.key}')" class="${x.key===s.key?'on':''}" ${x.key===s.key?'aria-current="page"':''}>${svg(x.icon||'doc')}<span>${esc(tr(x.title))}</span></a>`).join('');
  const rail=(typeof APPS_META!=='undefined'?APPS_META:[]).map(a=>`<a href="../${a.key}/index.html" class="${a.key===APP.key?'on':''}" style="--ac:${a.acc}" title="${esc(a.name)}" aria-label="${esc(a.name)}">${svg(a.icon)}</a>`).join('');
  return `<div class="shell an">
    <aside class="side" id="side">
      <div class="mrail">${rail}</div>
      <div class="mname">${esc(APP.name)}<small>${APP.port?':'+esc(APP.port):(state.lang==='sk'?'interná evidencia':'internal registry')}</small></div>
      <nav class="nav" aria-label="${esc(APP.name)}">${nav}</nav>
      <a class="hubl" href="../index.html">${svg('home',15)}<span>${state.lang==='sk'?'Späť na rozcestník':'Back to hub'}</span></a>
    </aside>
    <div class="drawer-scrim" onclick="closeDrawer()"></div>
    <main class="main">
      <div class="topb">
        <button class="hamb2" onclick="toggleDrawer()" aria-label="menu">${svg('list',16)}</button>
        <nav class="crumb" aria-label="breadcrumb"><a href="../index.html">Aura</a> ⁄ <a onclick="go('#${screensOf()[0]}')">${esc(APP.name)}</a> ⁄ <b>${esc(tr(s.title))}</b></nav>
        ${connPill()}
        <button class="search" onclick="openCmdk()" aria-label="${state.lang==='sk'?'Hľadať':'Search'}">${svg('search',15)}<span>${state.lang==='sk'?'Hľadať…':'Search…'}</span><span class="kbd">⌘K</span></button>
        <button class="icon-btn" onclick="aiToggle()" aria-label="AuraAI">${svg('chat')}</button>
        <button class="avatar" onclick="toast('${state.lang==='sk'?'Profil (demo)':'Profile (demo)'}')">SP</button>
      </div>
      <div class="content" id="content">${inner}</div>
    </main></div>`;
}
function renderScreen(s){
  CURSCR=s.key;
  const acts=[];
  if(APP.imp)acts.push(`<button class="btn" onclick="openImport()">${svg('dl',14)} ${state.lang==='sk'?'Import':'Import'}</button>`);
  if(APP.rep)acts.push(`<button class="btn" onclick="openReport()">${svg('doc',14)} ${state.lang==='sk'?'Report':'Report'}</button>`);
  acts.push(`<button class="btn pri" onclick="aiToggle()">${svg('chat',14)} ${state.lang==='sk'?'Spýtať sa AuraAI':'Ask AuraAI'}</button>`);
  const impRow=state.imp.last&&state.imp.last.s===s.key?`<div class="banner ok" style="margin-bottom:14px">${svg('check')}
    <span>${state.lang==='sk'?'Import zapísaný':'Import applied'}: ${state.imp.last.n} ${state.lang==='sk'?'riadkov':'rows'} · ${esc(state.imp.last.f)}</span>
    <button class="bx" onclick="impUndo()">${state.lang==='sk'?'Vrátiť':'Undo'}</button></div>`:'';
  const html=`<div class="phead"><h1>${esc(tr(s.title))}</h1><span class="sub">${esc(tr(s.sub||APP.tag))}</span>
    <div class="actions">${acts.join('')}</div></div>${impRow}
    <div class="blocks">${(s.blocks||[]).map((b,i)=>block(b,i)).join('')}</div>`;
  view.innerHTML=shell(s,html);
  aiSync();
}

/* ── chróm ─────────────────────────────────────────────────── */
function toast(msg){
  const w=document.getElementById('toasts');const el=document.createElement('div');
  el.className='toast';el.setAttribute('role','status');el.innerHTML=`${svg('check',15)}<span>${esc(msg)}</span>`;
  w.appendChild(el);setTimeout(()=>{el.style.opacity='0';el.style.transform='translateY(6px)';setTimeout(()=>el.remove(),260);},2100);
}
function swTog(el,key,label){const on=el.getAttribute('aria-checked')==='true';
  el.setAttribute('aria-checked',String(!on));state.toggles[key]=!on;
  audit(L('Nastavenie prepnuté','Setting toggled'),label+' → '+(!on?(state.lang==='sk'?'zap':'on'):(state.lang==='sk'?'vyp':'off')));
  toast((state.lang==='sk'?'Uložené: ':'Saved: ')+label);}
function closeOverlay(){document.querySelectorAll('.scrim,.cmdk,.modal,.dropdown').forEach(e=>e.remove());state.overlay=null;}
function scrim(){const s=document.createElement('div');s.className='scrim';s.onclick=closeOverlay;document.body.appendChild(s);return s;}
function audit(what,detail){state.audit.unshift({t:connTime(),w:tr(what),d:detail});}
function openCmdk(){
  closeOverlay();scrim();state.overlay='cmdk';
  const idx=[];
  (APP.screens||[]).forEach(s=>idx.push({cc:APP.acc,ic:s.icon||'doc',t:tr(s.title),s:tr(s.sub||''),kind:L('Obrazovka','Screen'),go:'#'+s.key}));
  (typeof APPS_META!=='undefined'?APPS_META:[]).filter(a=>a.key!==APP.key).forEach(a=>idx.push({cc:a.acc,ic:a.icon,t:a.name,s:tr(a.tag),kind:L('Aplikácia','App'),href:`../${a.key}/index.html`}));
  const el=document.createElement('div');el.className='cmdk';
  el.innerHTML=`<div class="ci">${svg('search')}<input id="cmdkIn" placeholder="${state.lang==='sk'?'Hľadať obrazovky a aplikácie…':'Search screens and apps…'}" aria-label="search"></div><div class="cres" id="cmdkRes"></div>`;
  document.body.appendChild(el);
  const draw=q=>{q=(q||'').toLowerCase().trim();
    const res=idx.filter(x=>!q||(tr(x.t)+' '+tr(x.s)).toLowerCase().includes(q)).slice(0,8);
    document.getElementById('cmdkRes').innerHTML=res.length?res.map(x=>`<div class="cr" style="--cc:${x.cc}" onclick="${x.href?`location.href='${x.href}'`:`closeOverlay();go('${x.go}')`}">
      <span class="ic">${svg(x.ic,16)}</span><div class="ct"><b>${esc(tr(x.t))}</b><small>${esc(tr(x.s))}</small></div><span class="kind">${esc(tr(x.kind))}</span></div>`).join('')
      :`<div class="cempty">${state.lang==='sk'?'Nič sa nenašlo.':'Nothing found.'}</div>`;};
  draw('');const inp=document.getElementById('cmdkIn');inp.oninput=e=>draw(e.target.value);inp.focus();
}
function toggleDrawer(){document.body.classList.toggle('drawer');}
function closeDrawer(){document.body.classList.remove('drawer');}
function go(h){location.hash=h;}
function route(){
  closeOverlay();closeDrawer();
  const k=(location.hash.replace(/^#/,'')||screensOf()[0]);
  if(typeof CHATAPP!=='undefined'&&CHATAPP)return renderChatApp(k);
  renderScreen(scr(k));
}
window.addEventListener('hashchange',route);
function applyStatic(){
  document.documentElement.lang=state.lang;
  document.title=APP.name+' · '+(state.lang==='sk'?'náhľad obrazoviek':'screen preview');
  const d=document.querySelector('.demo-tag');if(d)d.textContent=state.lang==='sk'?'Demo · ukážkové dáta':'Demo · sample data';
  const b=document.querySelector('.brand .w');if(b)b.innerHTML=`<b>${esc(APP.name.split(' ')[0])}</b> ${esc(APP.name.split(' ').slice(1).join(' ')||'')}`;
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
  if((e.metaKey||e.ctrlKey)&&(e.key||'').toLowerCase()==='j'){e.preventDefault();aiToggle();return;}
  if(e.key==='Escape'){if(state.overlay){closeOverlay();return;}if(state.chat.open){aiToggle();return;}return;}
  if(tag==='input'||tag==='textarea'||e.metaKey||e.ctrlKey||e.altKey)return;
  const ks=screensOf(),i=ks.indexOf(location.hash.replace(/^#/,'')||ks[0]);
  if(e.key==='ArrowRight'&&i<ks.length-1)go('#'+ks[i+1]);
  if(e.key==='ArrowLeft'&&i>0)go('#'+ks[i-1]);
});

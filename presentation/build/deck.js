/* ==========================================================================
   AURA AI · deck.js
   Vlastník: A2. Jedno IIFE = navigácia + téma + animácie + počítadlá +
   tooltipy + slovníček + interaktívny nákres (s04) + konfigurátor (s10).
   Exportuje window.DECK podľa CONTRACT.md §5.

   Poradie skriptov: tooltips.js -> deck.js -> mode.js
   Glosár sa NEDEFINUJE tu — číta sa z window.AURA_GLOSSARY (A1).
   Žiadny localStorage / sessionStorage. Čísla vo formáte sk-SK.
   ========================================================================== */
(function(){
'use strict';

/* ------------------------------------------------------------------
   0 · pomocníci
   ------------------------------------------------------------------ */
var NBSP='\u00a0';
function q(sel,root){return (root||document).querySelector(sel)}
function qa(sel,root){return [].slice.call((root||document).querySelectorAll(sel))}
function gid(id){return document.getElementById(id)}
function esc(t){return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
/* sk-SK: desatinná čiarka, nedeliteľná medzera v tisícoch */
function fmt(n){return Math.round(n).toLocaleString('sk-SK')}
function eur(n){return fmt(n)+NBSP+'€'}
function num(n){return fmt(n)}
function dec2(n){return n.toFixed(2).replace('.',',')}

/* prefers-reduced-motion — sleduje sa aj za behu */
var mqRM=(window.matchMedia?window.matchMedia('(prefers-reduced-motion: reduce)'):null);
var RM=!!(mqRM&&mqRM.matches);
if(mqRM){
  if(mqRM.addEventListener){mqRM.addEventListener('change',function(e){RM=!!e.matches})}
  else if(mqRM.addListener){mqRM.addListener(function(e){RM=!!e.matches})}
}

/* režim — default 'deck' (CONTRACT §5). Prepína ho A3 cez DECK.onMode(). */
var mode=(document.documentElement.getAttribute('data-mode')==='doc')?'doc':'deck';

/* ------------------------------------------------------------------
   1 · NAVIGÁCIA — slajdy, dots, rail, counter, klávesy, swipe, téma
   ------------------------------------------------------------------ */
var S=[],N=0,i=0,D=[];
var dotsEl=null,railI=null,ctB=null;

function paintChrome(){
  if(mode!=='deck'||!N){return}
  D.forEach(function(d,k){
    d.classList.toggle('on',k===i);
    d.setAttribute('aria-current',k===i?'true':'false');
  });
  if(railI){railI.style.width=((i+1)/N*100)+'%'}
  if(ctB){ctB.textContent=('0'+(i+1)).slice(-2)}
}

function showSlide(n,force){
  if(!N){return}
  n=Math.max(0,Math.min(N-1,n));
  if(mode!=='deck'){i=n;return}          /* v doc režime .s.on neriadime */
  var same=(n===i);
  if(same&&!force){return}
  var old=S[i];
  if(!same&&old){
    old.classList.remove('on');
    if(!RM){
      old.classList.add('leave');
      (function(o){setTimeout(function(){o.classList.remove('leave')},430)})(old);
    }
  }
  S.forEach(function(sl,k){if(k!==n){sl.classList.remove('on')}});
  var cur=S[n];
  cur.classList.remove('on');
  void cur.offsetHeight;                 /* restart CSS animácií slajdu */
  cur.classList.add('on');
  cur.scrollTop=0;
  i=n;
  counters(cur);
  tipHide();
  paintChrome();
}

/* --- word-stagger nadpisov --- */
function stagger(){
  qa('.s h1,.s h2').forEach(function(h){
    if(h.getAttribute('data-wm')==='1'){return}
    h.setAttribute('data-wm','1');
    var d=0,nodes=[].slice.call(h.childNodes);
    nodes.forEach(function(nd){
      if(nd.nodeType===3){
        var frag=document.createDocumentFragment();
        nd.textContent.split(/(\s+)/).forEach(function(w){
          if(!w){return}
          if(/^\s+$/.test(w)){frag.appendChild(document.createTextNode(w));return}
          var sp=document.createElement('span');
          sp.className='wm';
          sp.style.setProperty('--wd',(d++*46)+'ms');
          sp.textContent=w;
          frag.appendChild(sp);
        });
        h.replaceChild(frag,nd);
      }else if(nd.nodeType===1&&nd.tagName!=='BR'){
        nd.classList.add('wm');
        nd.style.setProperty('--wd',(d++*46)+'ms');
      }
    });
    h.classList.remove('an');
    h.style.animationDelay='';
  });
}

/* --- počítadlá [data-cnt] na .kpi b --- */
function markCounters(){
  qa('.s .kpi b').forEach(function(b){
    if(b.hasAttribute('data-cnt')){return}
    var t=b.textContent.trim();
    if(/^[\d\s\u00a0\u202f]+$/.test(t)&&t.replace(/\D/g,'').length){
      b.setAttribute('data-cnt',t.replace(/\D/g,''));
    }
  });
}
function counters(sl){
  if(!sl){return}
  qa('[data-cnt]',sl).forEach(function(b){
    var orig=b.getAttribute('data-orig');
    if(orig===null){orig=b.textContent;b.setAttribute('data-orig',orig)}
    var end=+b.getAttribute('data-cnt');
    if(!isFinite(end)||RM){b.textContent=orig;return}
    var t0=(window.performance&&performance.now?performance.now():Date.now()),dur=950;
    function step(t){
      var k=Math.min(1,(t-t0)/dur);
      k=1-Math.pow(1-k,3);
      if(k<1){b.textContent=fmt(end*k);requestAnimationFrame(step)}
      else{b.textContent=orig}          /* finálny text = presne text zo zdroja */
    }
    requestAnimationFrame(step);
  });
}

/* --- klávesy --- */
function navBlocked(e){
  if(mode!=='deck'){return true}
  if(gvOpen()){return true}
  var t=e.target||{};
  var tag=(t.tagName||'').toUpperCase();
  if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT'||t.isContentEditable){return true}
  return false;
}
document.addEventListener('keydown',function(e){
  if(navBlocked(e)){return}
  var t=e.target||{};
  var tag=(t.tagName||'').toUpperCase();
  var role=(t.getAttribute?t.getAttribute('role'):null);
  if((tag==='BUTTON'||role==='button')&&(e.key==='Enter'||e.key===' ')){return}
  if(e.key==='ArrowRight'||e.key===' '||e.key==='PageDown'){e.preventDefault();showSlide(i+1)}
  else if(e.key==='ArrowLeft'||e.key==='PageUp'){e.preventDefault();showSlide(i-1)}
  else if(e.key==='Home'){e.preventDefault();showSlide(0)}
  else if(e.key==='End'){e.preventDefault();showSlide(N-1)}
});

/* --- touch swipe --- */
var x0=null,y0=null;
document.addEventListener('touchstart',function(e){
  if(mode!=='deck'||!e.touches||!e.touches.length){x0=null;y0=null;return}
  x0=e.touches[0].clientX;y0=e.touches[0].clientY;
},{passive:true});
document.addEventListener('touchend',function(e){
  if(mode!=='deck'||x0===null||!e.changedTouches||!e.changedTouches.length){x0=null;y0=null;return}
  var dx=e.changedTouches[0].clientX-x0,dy=e.changedTouches[0].clientY-y0;
  if(Math.abs(dx)>55&&Math.abs(dx)>Math.abs(dy)){showSlide(i+(dx<0?1:-1))}
  x0=null;y0=null;
},{passive:true});

/* ------------------------------------------------------------------
   2 · TOOLTIPY + SLOVNÍČEK (glosár z window.AURA_GLOSSARY)
   ------------------------------------------------------------------ */
var tip=null,tipB=null,tipP=null,tipCur=null;
var gv=null,gg=null,gx=null,gl=null;

function GL(){
  var g=window.AURA_GLOSSARY;
  return (g&&typeof g==='object')?g:{};
}
/* Tolerantné čítanie zápisu pojmu: ['Titul','Text'] | 'Text' | {t,d} */
function entry(k){
  var d=GL()[k];
  if(d===undefined||d===null){return null}
  if(Object.prototype.toString.call(d)==='[object Array]'){
    return {t:String(d[0]!==undefined?d[0]:k),d:String(d[1]!==undefined?d[1]:'')};
  }
  if(typeof d==='string'){return {t:k,d:d}}
  if(typeof d==='object'){
    var t=d.t||d.title||d.term||d.h||k;
    var x=d.d||d.desc||d.text||d.def||d.p||'';
    return {t:String(t),d:String(x)};
  }
  return null;
}
function gvOpen(){return !!(gv&&gv.classList.contains('on'))}
function tipHide(){if(tip){tip.classList.remove('on')}tipCur=null}
function tipShow(el){
  if(!tip||!el){return}
  var e=entry(el.getAttribute('data-t'));
  if(!e){return}                              /* kľúč bez záznamu v glosári — ticho */
  tipB.textContent=e.t;tipP.textContent=e.d;
  tip.classList.add('on');tipCur=el;
  var r=el.getBoundingClientRect(),w=tip.offsetWidth,h=tip.offsetHeight;
  var l=r.left+r.width/2-w/2;
  l=Math.max(10,Math.min(l,window.innerWidth-w-10));
  var t=r.bottom+9;
  if(t+h>window.innerHeight-10){t=r.top-h-9}
  t=Math.min(t,window.innerHeight-h-10);   /* aj keď je cieľ pod ohybom slajdu */
  if(t<10){t=10}
  tip.style.left=l+'px';tip.style.top=t+'px';
}
function closest(node,sel){
  return (node&&node.closest)?node.closest(sel):null;
}
document.addEventListener('mouseover',function(e){
  var el=closest(e.target,'[data-t]');
  if(el){tipShow(el)}
  else if(tipCur&&tip&&!tip.contains(e.target)){tipHide()}
});
document.addEventListener('focusin',function(e){
  var el=closest(e.target,'[data-t]');
  if(el){tipShow(el)}
});
document.addEventListener('focusout',tipHide);
document.addEventListener('click',function(e){
  var el=closest(e.target,'[data-t]');
  if(el){e.preventDefault();if(tipCur===el){tipHide()}else{tipShow(el)}}
});
window.addEventListener('resize',tipHide);
window.addEventListener('scroll',tipHide,{passive:true});

function gopen(){
  if(!gv){return}
  tipHide();
  gv.classList.add('on');
  if(gx){gx.style.display='block'}
  gv.scrollTop=0;
  if(gx&&gx.focus){try{gx.focus()}catch(err){}}
}
function gclose(){
  if(!gv){return}
  gv.classList.remove('on');
  if(gx){gx.style.display='none'}
  if(gl&&gl.focus){try{gl.focus()}catch(err){}}
}
function fillGlossary(){
  if(!gg){return}
  var G=GL();
  var inl=Object.prototype.toString.call(window.AURA_TT_INLINE)==='[object Array]'
    ? window.AURA_TT_INLINE : [];
  var keys=Object.keys(G).filter(function(k){
    return k!=='help'&&!!entry(k);
  }).sort(function(a,b){
    return entry(a).t.localeCompare(entry(b).t,'sk');
  });
  gg.innerHTML=keys.map(function(k){
    var e=entry(k);
    /* data-inline je len značka pre verifikáciu (A4) — bez vizuálneho dopadu.
       Pojmy bez inline .tt výskytu v body sú úplne v poriadku. */
    return '<div class="gi" data-k="'+esc(k)+'"'+(inl.indexOf(k)>-1?' data-inline="1"':'')+'>'
      +'<b>'+esc(e.t)+'</b><p>'+esc(e.d)+'</p></div>';
  }).join('');
}
/* Esc / klik mimo / klávesy pri otvorenom modále */
document.addEventListener('keydown',function(e){
  if(e.key==='Escape'){gclose();tipHide();return}
  if(gvOpen()&&(e.key==='ArrowLeft'||e.key==='ArrowRight'||e.key===' '||e.key==='PageUp'||e.key==='PageDown')){
    e.stopPropagation();
  }
},true);

/* ------------------------------------------------------------------
   3 · INTERAKTÍVNY NÁKRES — s04 (#ixd / #ixseg / #ixdp)
   ------------------------------------------------------------------ */
var K={
 tim:['Tím a jeho nástroje',
  'Ľudia spúšťajú workflowy z tých istých nástrojov, na ktoré sú zvyknutí — chat, MCP klienti, Aura appky.',
  'Každý prompt s citlivým obsahom ide k cudziemu modelu. Nikto nevie presne povedať, čo všetko už odišlo.',
  'Rovnaké nástroje, ale požiadavka sa najprv posúdi podľa triedy dát a až potom sa rozhodne, kam pôjde.','REQ-001'],
 dat:['Osobné a účtovné dáta',
  'Najcitlivejšia trieda: údaje o ľuďoch, účtovníctvo a ostatné obmedzené informácie.',
  'Prechádzajú hranicu pri každom použití. Retencia a výmaz sú v rukách dodávateľa, nie našich.',
  'Neopustia lokálnu zónu. Umiestnenie, retencia, mazanie a pôvod sú určené pre každú triedu zvlášť.','DATA-001 · REQ-003'],
 mem:['Pamäť Hades',
  'Vlastný MCP server so 675 uzlami a 2 049 spojeniami — skills, projekty, rozhodnutia.',
  'Beží lokálne, ale jeho chat endpoint volá cudzí model a von je vystavený cez verejný tunel.',
  'Presúva sa na Aura Core, inferencia ide na lokálny 70B a prístup zvonku len cez VPN. Uzly dostanú triedu dát.','HADES-001 až 007'],
 eng:['Výpočtové jadro',
  'Miesto, kde skutočne beží model — toto je jediný prvok, ktorý sa medzi stavmi celý presúva.',
  'Cudzí cloud, cudzie GPU, cudzie kvóty. Rýchlosť aj cena sú mimo našej kontroly a bez lokálnej alternatívy.',
  'Main PC s 96 GB VRAM, 70B model lokálne, tri izolovaní workeri, fronta schválení a nemazateľný audit.','ARC-001 · TEST-LLM-001'],
 bnd:['Hranica spracovania',
  'Čiara, za ktorú sa obmedzené dáta nesmú dostať. Vpravo je vonkajší svet.',
  'Existuje len ako dohoda a dobrá vôľa. Nie je čím ju technicky vynútiť ani ako dokázať, že bola dodržaná.',
  'Technické opatrenie: segmentácia, tokeny s minimálnym rozsahom, fail-closed pri výpadku a audit každého prechodu.','SEC-001 · NET-001'],
 saas:['Asana, Drive, Calendar',
  'Služby, ktoré zostávajú aj po projekte — tu vedieme prácu a ukladáme dôkazy.',
  'Zápisy vznikajú ad hoc. Čo sa zapísalo a kto to schválil, sa dohľadáva ťažko.',
  'Každý zápis s vedľajším účinkom prejde frontou schválení a nechá stopu. Pri výpadku čaká a prehrá sa bez duplikátov.','INT-GOV-001'],
 cld:['Cloud AI API po zmene',
  'Cloud nezmizne — dostane jasne ohraničenú úlohu.',
  'Dnes je to hlavný a jediný výpočtový zdroj.',
  'Doplnok pre dáta bez obmedzenia. Dá sa vypnúť bez toho, aby spadlo jadro — a to sa testuje.','REQ-004 · TEST-OFFLINE-001']
};

function initDiagram(){
  var d=gid('ixd'),seg=gid('ixseg'),dp=gid('ixdp');
  if(!d||!dp){return}
  var EMPTY=dp.innerHTML;          /* pôvodný „nič nevybrané" obsah z body.html */
  var sel=null;
  dp.setAttribute('data-empty','true');

  function clear(){
    sel=null;
    dp.innerHTML=EMPTY;
    dp.setAttribute('data-empty','true');
    qa('.hot',d).forEach(function(n){n.setAttribute('aria-current','false')});
  }
  /* prvok je viditeľný len ak jeho stavová skupina zodpovedá data-st */
  function visible(el){
    var st=d.getAttribute('data-st');
    if(closest(el,'.s-now')){return st==='now'}
    if(closest(el,'.s-tg')){return st==='tg'}
    return true;
  }
  function render(){
    if(!sel||!K[sel]){clear();return}
    var k=K[sel],st=d.getAttribute('data-st');
    dp.removeAttribute('data-empty');
    dp.innerHTML='<h4>'+esc(k[0])+'</h4>'
      +'<div class="dr"><span>Čo to je</span><span>'+esc(k[1])+'</span></div>'
      +'<div class="dr"><span>Dnes</span><span class="'+(st==='now'?'nowv':'')+'">'+esc(k[2])+'</span></div>'
      +'<div class="dr"><span>Cieľ</span><span class="'+(st==='tg'?'tgv':'')+'">'+esc(k[3])+'</span></div>'
      +'<div class="dr"><span>Dôkaz</span><span class="ev">'+esc(k[4])+'</span></div>';
  }
  function pick(el){
    var k=el.getAttribute('data-k');
    if(!k||!K[k]){return}
    qa('.hot',d).forEach(function(n){
      n.setAttribute('aria-current',n.getAttribute('data-k')===k?'true':'false');
    });
    sel=k;
    render();
  }
  d.addEventListener('click',function(e){
    var el=closest(e.target,'.hot');
    if(el){pick(el)}
  });
  d.addEventListener('keydown',function(e){
    if(e.key!=='Enter'&&e.key!==' '){return}
    var el=closest(e.target,'.hot');
    if(el){e.preventDefault();e.stopPropagation();pick(el)}
  });
  if(seg){
    seg.addEventListener('click',function(e){
      var b=closest(e.target,'button');
      if(!b){return}
      d.setAttribute('data-st',b.getAttribute('data-st'));
      qa('button',seg).forEach(function(n){
        n.setAttribute('aria-pressed',String(n===b));
        n.setAttribute('aria-current',String(n===b));
      });
      /* vybraný prvok v novom stave nemusí existovať → prázdny stav .dp,
         nie visiaci starý detail */
      var still=sel?qa('.hot[data-k="'+sel+'"]',d).filter(visible):[];
      if(sel&&!still.length){clear()}else{render()}
    });
  }
}

/* ------------------------------------------------------------------
   4 · KONFIGURÁTOR ZOSTAVY — s10
   Ceny a TCO vzorce sú prenesené 1:1 zo zdroja a nesmú sa meniť.
   ------------------------------------------------------------------ */
function initConfig(){
  var root=gid('oLines');
  if(!root){return}
  var P={
   gpu:{basic:[6269,'RTX PRO 5000 48 GB','Alza.sk'],std:[14849,'RTX PRO 6000 96 GB','Alza.sk · nedostupné'],prem:[29698,'2× RTX PRO 6000 96 GB','Alza.sk · budgetary'],g5090:[3999,'RTX 5090 32 GB','Amazon EU'],srv2:[8421,'Server Edition 96 GB · sek. trh','eBay.de'],mac:[7500,'Mac Studio M3 Ultra 256 GB','odhad, vrátane platformy']},
   plat:{lean:[3500,'Platforma úsporná'],solid:[4500,'Platforma solidná'],max:[6000,'Platforma pre 2 karty']},
   mini:{basic:[1150,'Mini Basic 32 GB','EU listing'],std:[3530,'Mini Standard 128 GB','HP Store PL'],prem:[4700,'Mini Premium DGX Spark','buyzero.de'],evo:[3794,'GMKtec EVO-X2 128 GB','Geizhals DE']},
   infra:{ups:[900,'UPS'],net:[700,'10GbE sieť'],nas:[2700,'NAS a disky'],offs:[540,'Off-site kópia 3 roky']}
  };
  var W={gpu:{basic:300,std:450,prem:700,g5090:400,srv2:420,mac:180},plat:{lean:90,solid:110,max:140},mini:{basic:35,std:80,prem:110,evo:85}};
  var SUP={basic:800,std:1200,prem:1600,evo:1200};
  var st={gpu:'std',plat:'solid',mini:'std',cnt:3,infra:{ups:1,net:1,nas:1,offs:1}};
  var DEF={rE:20,rH:2500,rC:150,rL:80,rI:12000,rR:10};

  function rv(id){var e=gid(id);var v=e?+e.value:DEF[id];return isFinite(v)?v:DEF[id]}
  function set(id,txt){var e=gid(id);if(e){e.textContent=txt}}

  function calc(){
    var kwh=rv('rE')/100,hrs=rv('rH'),cld=rv('rC'),lic=rv('rL'),
        impl=rv('rI'),rez=rv('rR')/100;
    set('vE',dec2(kwh));set('vH',num(hrs));set('vC',num(cld));
    set('vL',num(lic));set('vI',num(impl));set('vR',String(Math.round(rez*100)));

    var L=[],cap=0;
    function add(lab,val,note){L.push([lab,val,note||'']);cap+=val}
    add(P.gpu[st.gpu][1],P.gpu[st.gpu][0],P.gpu[st.gpu][2]);
    if(st.gpu!=='mac'){add(P.plat[st.plat][1],P.plat[st.plat][0],'budgetary')}
    if(st.cnt>0){add(st.cnt+'× '+P.mini[st.mini][1],P.mini[st.mini][0]*st.cnt,P.mini[st.mini][2])}
    var inf=0,infn=[];
    Object.keys(st.infra).forEach(function(k){
      if(st.infra[k]){inf+=P.infra[k][0];infn.push(P.infra[k][1])}
    });
    if(inf){add('Infraštruktúra',inf,infn.join(' · '))}
    var watts=W.gpu[st.gpu]+(st.gpu==='mac'?0:W.plat[st.plat])+W.mini[st.mini]*st.cnt+(inf?50:0);
    var en=watts/1000*hrs*3*kwh;
    var sub=cap+en+cld*36+lic*36+impl+1500+SUP[st.mini]*3;
    var tco=sub*(1+rez);

    root.innerHTML=L.map(function(r){
      return '<div class="lin"><span>'+esc(r[0])
        +(r[2]?' <span class="nt">'+esc(r[2])+'</span>':'')
        +'</span><span>'+eur(r[1])+'</span></div>';
    }).join('')
     +'<div class="lin tot"><span>CapEx celkom</span><span>'+eur(cap)+'</span></div>'
     +'<div class="lin" style="margin-top:8px"><span>Energia 3 roky <span class="nt">'+num(watts)+NBSP+'W priemer</span></span><span>'+eur(en)+'</span></div>'
     +'<div class="lin"><span>Cloud a licencie 3 roky</span><span>'+eur((cld+lic)*36)+'</span></div>'
     +'<div class="lin"><span>Implementácia a školenie</span><span>'+eur(impl+1500)+'</span></div>'
     +'<div class="lin"><span>Podpora 3 roky</span><span>'+eur(SUP[st.mini]*3)+'</span></div>'
     +'<div class="lin"><span>Rezerva '+Math.round(rez*100)+NBSP+'%</span><span>'+eur(sub*rez)+'</span></div>'
     +'<div class="lin tot"><span>TCO 3 roky</span><span>'+eur(tco)+'</span></div>';

    set('oCap',eur(cap));set('oTco',eur(tco));set('oMon',eur(tco/36));

    var F=[];
    if(st.gpu==='basic')F.push(['f-w','CONDITIONAL','48 GB nie je overených na 70B. Variant sa nesmie odporučiť pred úspešným TEST-LLM-001.']);
    if(st.gpu==='std')F.push(['f-w','Dostupnosť','96 GB karta je dnes na Alze nedostupná. Dodacia lehota patrí do rozhodnutia PROC-001, nie do poznámky.']);
    if(st.gpu==='prem')F.push(['f-b','Chýba ponuka','Premium je zložená katalógová cena. Pred G5 treba formálnu kompatibilnú EU B2B ponuku na presnú konfiguráciu.']);
    if(st.gpu==='g5090')F.push(['f-b','NON-COMPLIANT na 70B','32 GB nestačí — model sa v Q8 nezmestí ani pri najvyššej priepustnosti. Karta je legitímna do worker poolu na obraz a video, nie ako jadro.']);
    if(st.gpu==='srv2')F.push(['f-w','Sekundárny trh','Nová karta od DE predajcu s VAT ID, −42 % oproti katalógu. Záruka predajcu namiesto výrobcu, bez vrátenia — a pasívne chladenie vyžaduje šasi s núteným prúdením. Rozhodnutie patrí do G3.']);
    if(st.gpu==='mac')F.push(['f-w','Mimo charteru','Iná platforma (macOS) a cena 256 GB konfigurácie je odhad — Apple 512 GB verziu stiahol. 819 GB/s je výborných, ale zaradenie vyžaduje change control a novú ponuku.']);
    if(st.mini==='evo')F.push(['f-w','Drahší než HP','EVO-X2 stojí po zdražení pamätí viac než HP Z2 Mini G1a s biznis zárukou a rovnakým čipom. Neodporúča sa — je tu pre úplnosť porovnania.']);
    if(st.gpu==='prem'&&st.plat!=='max')F.push(['f-b','Nekompatibilné','Dve karty potrebujú platformu pre 2 karty — napájanie, sloty a chladenie. Prepnite platformu.']);
    if(st.mini==='basic')F.push(['f-b','NON-COMPLIANT','Mini Basic má 32 GB a nízku priepustnosť. Ako nositeľ modelu nevyhovuje, do 70B testov nevstupuje.']);
    if(st.cnt<3)F.push(['f-w','Mimo charteru','Charter hovorí 1× Main a 3× Mini. Menší počet je zmena rozsahu cez RAID-CHANGE-001.']);
    if(st.cnt>3)F.push(['f-w','Nad charter','Štvrtý worker je rozšírenie rozsahu — potrebuje change control a nové schválenie investície.']);
    if(!st.infra.nas)F.push(['f-b','Bez záloh','Bez NAS a diskov nie je čo zálohovať ani z čoho obnoviť. TEST-SEC-DR-001 v tejto konfigurácii neprejde.']);
    if(!st.infra.offs&&st.infra.nas)F.push(['f-w','Bez off-site','Jedna kópia v jednej budove nie je záloha. RES-001 vyžaduje kópiu mimo miesta.']);
    if(!st.infra.ups)F.push(['f-w','Bez UPS','Výpadok prúdu pri behu modelu môže poškodiť dáta aj hardware.']);
    if(!st.infra.net)F.push(['f-w','Bez 10GbE','Workeri a NAS sa budú deliť o pomalú sieť — kapacitný test 10 workflowov je potom ohrozený.']);
    if(!F.length)F.push(['f-o','Bez otvorených nálezov','Táto zostava zodpovedá charteru a nemá blokujúce nálezy. Stále platí, že benchmark musí prejsť pred nákupom.']);
    var flags=gid('oFlags');
    if(flags){
      flags.innerHTML=F.map(function(f){
        return '<div class="'+f[0]+'"><b>'+esc(f[1])+'</b> — '+esc(f[2])+'</div>';
      }).join('');
    }
  }

  qa('.opts').forEach(function(grp){
    grp.addEventListener('click',function(e){
      var b=closest(e.target,'button');
      if(!b){return}
      var k=grp.getAttribute('data-grp'),v=b.getAttribute('data-v');
      if(!k||v===null){return}
      if(k==='infra'){
        var on=b.getAttribute('aria-pressed')!=='true';
        st.infra[v]=on?1:0;
        b.setAttribute('aria-pressed',String(on));
        b.setAttribute('aria-current',String(on));
      }else{
        if(k==='cnt'){st.cnt=+v}else{st[k]=v}
        qa('button',grp).forEach(function(n){
          n.setAttribute('aria-pressed',String(n===b));
          n.setAttribute('aria-current',String(n===b));
        });
      }
      if(k==='gpu'&&v==='prem'){
        var mx=q('[data-grp="plat"] [data-v="max"]');
        if(mx){
          st.plat='max';
          qa('[data-grp="plat"] button').forEach(function(n){
            n.setAttribute('aria-pressed',String(n===mx));
            n.setAttribute('aria-current',String(n===mx));
          });
        }
      }
      calc();
    });
  });
  ['rE','rH','rC','rL','rI','rR'].forEach(function(id){
    var e=gid(id);
    if(e){e.addEventListener('input',calc)}
  });
  calc();
}

/* ------------------------------------------------------------------
   5 · REŽIM (CONTRACT §5) — A3 nastaví data-mode a potom volá onMode()
   ------------------------------------------------------------------ */
function setMode(m){
  m=(m==='doc')?'doc':'deck';
  if(m===mode){return mode}
  mode=m;
  /* v oboch smeroch: žiadne prechodové animácie navyše */
  S.forEach(function(sl){sl.classList.remove('leave')});
  if(mode==='doc'){
    /* .s.on od tejto chvíle neriadime, do #dots/#nav/#ct/#rail nezapisujeme,
       klávesy a swipe sa ignorujú (pozri navBlocked / touch handlery).
       Viditeľnosť sekcií a reveal preberá report.css + mode.js (A3). */
    tipHide();
  }else{
    showSlide(i,true);            /* späť na aktuálny slajd + obnovené chrome */
  }
  try{
    document.dispatchEvent(new CustomEvent('aura:mode',{detail:{mode:mode}}));
  }catch(err){
    try{
      var ev=document.createEvent('CustomEvent');
      ev.initCustomEvent('aura:mode',true,false,{mode:mode});
      document.dispatchEvent(ev);
    }catch(err2){}
  }
  return mode;
}
/* ak režim ohlási niekto iný, zosynchronizujeme sa (bez zacyklenia) */
document.addEventListener('aura:mode',function(e){
  if(e&&e.detail&&e.detail.mode){setMode(e.detail.mode)}
});

/* ------------------------------------------------------------------
   6 · EXPORT — window.DECK
   ------------------------------------------------------------------ */
window.DECK={
  go:function(n){showSlide(Math.round(+n)||0);return i},
  current:function(){return i},
  count:function(){return N},
  slides:function(){return S.slice()},
  onMode:setMode,
  reduced:function(){return RM}
};

/* ------------------------------------------------------------------
   7 · INIT
   ------------------------------------------------------------------ */
function init(){
  S=qa('.s');
  N=S.length;

  /* chrome */
  dotsEl=gid('dots');
  railI=q('#rail i');
  var ctEl=gid('ct');
  if(ctEl){
    ctEl.innerHTML='<b>01</b> / '+N;
    ctB=ctEl.querySelector('b');
  }
  if(dotsEl){
    dotsEl.innerHTML='';
    S.forEach(function(_,k){
      var d=document.createElement('span');
      d.setAttribute('role','button');
      d.setAttribute('tabindex','0');
      d.setAttribute('aria-label','Slajd '+(k+1));
      d.setAttribute('aria-current','false');
      d.addEventListener('click',function(){showSlide(k)});
      d.addEventListener('keydown',function(e){
        if(e.key==='Enter'||e.key===' '){e.preventDefault();showSlide(k)}
      });
      dotsEl.appendChild(d);
    });
    D=[].slice.call(dotsEl.children);
  }

  /* navigačné tlačidlá */
  var nx=gid('nx'),pv=gid('pv');
  if(nx){nx.addEventListener('click',function(){showSlide(i+1)})}
  if(pv){pv.addEventListener('click',function(){showSlide(i-1)})}

  /* Dark / Light */
  var th=gid('th');
  if(th){
    th.addEventListener('click',function(){
      var isLight=document.documentElement.getAttribute('data-theme')==='light';
      document.documentElement.setAttribute('data-theme',isLight?'dark':'light');
      th.textContent=isLight?'Light':'Dark';
    });
  }

  /* tooltipy + slovníček */
  tip=gid('tip');
  if(tip){tipB=tip.querySelector('b');tipP=tip.querySelector('p')}
  gv=gid('gv');gg=gid('gg');gx=gid('gx');gl=gid('gl');
  fillGlossary();
  if(gl){gl.addEventListener('click',function(e){e.stopPropagation();if(gvOpen()){gclose()}else{gopen()}})}
  if(gx){gx.addEventListener('click',gclose)}
  if(gv){gv.addEventListener('click',function(e){if(e.target===gv){gclose()}})}

  /* animácie a počítadlá */
  stagger();
  markCounters();
  S.forEach(function(sl){sl.addEventListener('scroll',tipHide,{passive:true})});

  /* štartovací slajd = ten, ktorý má .on v body.html (inak prvý) */
  i=0;
  for(var k=0;k<N;k++){if(S[k].classList.contains('on')){i=k;break}}
  if(mode==='deck'&&N){
    showSlide(i,true);
  }else{
    paintChrome();
  }

  initDiagram();
  initConfig();
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',init);
}else{
  init();
}
})();

/* 레포 liquid.html 의 무니코틴 13종.
   n=제품명 b=브랜드 f=맛 nm=노멘솔여부 cat=계열 p=가격(임시) sw=맛 색 */
var P=[
 {n:"제로닉 거봉",b:"무무",f:"포도",nm:0,cat:"과일",p:"14,000원",sw:"#9333EA"},
 {n:"제로닉 샤인머스캣",b:"무무",f:"샤인머스캣",nm:0,cat:"과일",p:"14,000원",sw:"#84CC16"},
 {n:"제로닉 석류",b:"무무",f:"석류",nm:0,cat:"과일",p:"14,000원",sw:"#BE123C"},
 {n:"제로닉 노멘솔 자몽",b:"무무",f:"자몽",nm:1,cat:"과일",p:"14,000원",sw:"#F43F5E"},
 {n:"제로닉 노멘솔 체리",b:"무무",f:"체리",nm:1,cat:"과일",p:"14,000원",sw:"#DC2626"},
 {n:"제로닉 노멘솔 포도",b:"무무",f:"포도",nm:1,cat:"과일",p:"14,000원",sw:"#7E22CE"},
 {n:"제로닉 노멘솔 알로에",b:"무무",f:"알로에",nm:1,cat:"과일",p:"14,000원",sw:"#10B981"},
 {n:"제로닉 아이스스노우",b:"무무",f:"아이스스노우",nm:0,cat:"청량",p:"14,000원",sw:"#0891B2"},
 {n:"제로닉 민트",b:"무무",f:"민트",nm:0,cat:"청량",p:"14,000원",sw:"#059669"},
 {n:"제로닉 콜라",b:"무무",f:"콜라",nm:0,cat:"청량",p:"14,000원",sw:"#7C2D12"},
 {n:"무 블랙멘솔",b:"무",f:"블랙멘솔",nm:0,cat:"청량",p:"14,000원",sw:"#164E63"},
 {n:"제로닉 노멘솔 시가",b:"무무",f:"시가",nm:1,cat:"타바코",p:"14,000원",sw:"#78350F"},
 {n:"무 마일드토바코",b:"무",f:"마일드토바코",nm:1,cat:"타바코",p:"14,000원",sw:"#92400E"}
];

function match(x,f){
  if(f==='ALL')return true;
  if(f==='NM')return !!x.nm;
  if(f==='M')return !x.nm;
  return x.cat===f;
}
function render(f){
  var L=P.filter(function(x){return match(x,f)});
  document.getElementById('cnt').textContent=L.length;
  document.getElementById('grid').innerHTML=L.map(function(x){
    return '<a class="pc" href="#">'+
      '<div class="pc-vis"><span class="swatch" style="background:'+x.sw+'"></span><span class="ph">제품 이미지</span></div>'+
      '<span class="brand">'+x.b+'</span>'+
      '<h3>'+x.n+'</h3><p class="taste">'+x.f+'</p>'+
      '<div class="pc-bot"><span class="men'+(x.nm?' no':'')+'">'+(x.nm?'노멘솔':'멘솔')+'</span>'+
      '<span class="pcprice num">'+x.p+'</span></div></a>';
  }).join('');
}
render('ALL');

/* 노멘솔 섹션 — 6종 미리보기 */
document.getElementById('nmr').innerHTML=P.filter(function(x){return x.nm}).map(function(x){
  return '<div class="nmi"><i style="background:'+x.sw+'"></i><b>'+x.f+'</b><span>'+x.b+'</span></div>';
}).join('');

function setF(f){
  document.querySelectorAll('.chip').forEach(function(c){c.setAttribute('aria-pressed',String(c.dataset.f===f))});
  render(f);
}
document.querySelectorAll('.chip').forEach(function(c){c.addEventListener('click',function(){setF(c.dataset.f)})});
document.querySelectorAll('[data-jump]').forEach(function(g){g.addEventListener('click',function(){setF(g.dataset.jump)})});

var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
var els=document.querySelectorAll('.rev');
if(reduce||!('IntersectionObserver' in window)){els.forEach(function(e){e.classList.add('on')})}
else{
  var io=new IntersectionObserver(function(en){
    en.forEach(function(x,i){if(x.isIntersecting){setTimeout(function(){x.target.classList.add('on')},Math.min(i*60,280));io.unobserve(x.target)}});
  },{rootMargin:'0px 0px -6% 0px',threshold:.05});
  els.forEach(function(e){io.observe(e)});
}

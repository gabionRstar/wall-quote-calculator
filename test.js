const {calcQuote}=require('./calc.js');const orig=require('/workspace/limestone-calculator/limestone.js');let bad=0;
const eq=(n,a,b,t=0.005)=>{const ok=Math.abs(a-b)<t;if(!ok){bad++;console.log('FAIL',n,a,b)}};
let a=calcQuote(40,1.5,'limestone');eq('40x1.5 wall',a.quoteEx,39600);eq('40x1.5 PM on top',a.pm.ex,3960);eq('40x1.5 josh',a.josh.wallOnly,5637);eq('40x1.5 josh+site',a.josh.total,8137);eq('40x1.5 total ex',a.totalEx,39600+3960+2500+3000);eq('40x1.5 total inc',a.totalInc,49060*1.1);
let b=calcQuote(10,0.9,'limestone');eq('10x0.9 wall',b.quoteEx,4500);eq('10x0.9 josh',b.josh.wallOnly,615);
for(const[L,H]of[[10,0.9],[40,1.5],[43,3],[20,2.2],[7,0.4]])for(const t of['galvanised','galfan']){const g=calcQuote(L,H,t);eq(`${L}x${H} ${t} same %`,g.josh.matchPct,calcQuote(L,H,'limestone').josh.matchPct,1e-9);eq(`${L}x${H} ${t} pm`,g.pm.ex,0.1*g.quoteEx,1e-6)}
eq('16% option',calcQuote(40,1.5,'limestone',{extraPct:0.16}).josh.wallOnly,8013);
eq('site off',calcQuote(40,1.5,'limestone',{siteFeeEnabled:false}).totalEx,46560);eq('16% total',calcQuote(40,1.5,'limestone',{extraPct:0.16}).totalEx,39600*1.16+5500);eq('pm off total',calcQuote(40,1.5,'limestone',{pmEnabled:false}).totalEx,45100);eq('gabion wall indep of fee',calcQuote(40,1.5,'galvanised',{extraPct:0.2}).quoteEx,calcQuote(40,1.5,'galvanised').quoteEx,1e-6);
eq('earth TBC',calcQuote(83,1,'limestone').earthworksEx,0);
const p=calcQuote(40,1.5,'galvanised',{pmEnabled:false});eq('pm off same %',p.josh.matchPct,calcQuote(40,1.5,'limestone',{pmEnabled:false}).josh.matchPct,1e-9);
let pf=0;for(let h=4;h<=30;h++)for(const L of[1,10,43,83]){const o=orig.calc(L,h*100,90),n=calcQuote(L,h/10,'limestone');if(n.limestone.blocks!==o.blocks||Math.abs(n.quoteEx-o.cost)>.005)pf++}
console.log('limestone parity fails',pf);bad+=pf;
for(const[L,H]of[[10,0.9],[40,1.5],[43,3]])for(const t of['limestone','galvanised','galfan']){const q=calcQuote(L,H,t);console.log(`${L}x${H} ${t}: inc $${q.totalInc.toFixed(2)} | wall ex $${q.quoteEx.toFixed(0)} | Josh $${q.josh.total.toFixed(0)} ${(q.josh.pct*100).toFixed(1)}% (wall only $${q.josh.wallOnly.toFixed(0)} ${(q.josh.wallOnlyPct*100).toFixed(1)}%)`)}
console.log(bad?'FAILURES '+bad:'ALL PASS');process.exit(bad?1:0);

(function(){
var KEY="wqc-simple-v2";
var FIELDS=[["dayRate","Day rate $"],["mgmtPct","Management fee %"],["earthworksFee","Earthworks $"],["gabionM2PerDay","Gabion m²/day"],["limestoneM2PerDay","Limestone m²/day"],["blockMaterial","Limestone block $"],["sheetPrice","Galv sheet $"],["panel1x05","Galfan 1×0.5 panel $"],["panel05x05","Galfan 0.5×0.5 panel $"],["braceHook","Brace hook $"],["clipsPerLayerPerM","Clips /layer/m"],["rockLoadPrice","Rock $/load"],["rockLoadTonnes","Rock t/load"],["geoRollPrice","Geotextile $/roll"],["box05x05","Box 2.0×0.5×0.5 $"],["box05x10","Box 2.0×0.5×1.0 $"],["box10x05","Box 2.0×1.0×0.5 $"],["box10x10","Box 2.0×1.0×1.0 $"]];
function defaults(){return {dayRate:DEFAULT_RATES.dayRate,mgmtPct:20,earthworksFee:3000,gabionM2PerDay:DEFAULT_RATES.gabionM2PerDay,limestoneM2PerDay:DEFAULT_RATES.limestoneM2PerDay,blockMaterial:DEFAULT_RATES.blockMaterial,sheetPrice:DEFAULT_RATES.sheetPrice,panel1x05:DEFAULT_RATES.panel1x05,panel05x05:DEFAULT_RATES.panel05x05,braceHook:DEFAULT_RATES.braceHook,clipsPerLayerPerM:DEFAULT_RATES.clipsPerLayerPerM,rockLoadPrice:DEFAULT_RATES.rockLoadPrice,rockLoadTonnes:DEFAULT_RATES.rockLoadTonnes,geoRollPrice:DEFAULT_RATES.geoRollPrice,box05x05:107.83,box05x10:172.05,box10x05:168.15,box10x10:253.85,depth:"0.5",ew:false,len:10,hgt:"1.5",type:"galfan"};}
var S=defaults();try{Object.assign(S,JSON.parse(localStorage.getItem(KEY)||"{}"));}catch(e){}
function save(){try{localStorage.setItem(KEY,JSON.stringify(S));}catch(e){}}
var $=function(i){return document.getElementById(i);};
var money=function(v){return "$"+v.toLocaleString("en-AU",{minimumFractionDigits:2,maximumFractionDigits:2});};
var num=function(v,d){return (+v).toLocaleString("en-AU",{maximumFractionDigits:d==null?2:d});};
var hs=[];for(var h=0.5;h<=3.001;h+=0.5)hs.push(+h.toFixed(1));
$("hgt").innerHTML=hs.map(function(h){return '<option value="'+h+'">'+h.toFixed(1)+' m</option>';}).join("");
$("rates").innerHTML=FIELDS.map(function(f){return '<div><label for="r_'+f[0]+'">'+f[1]+'</label><input id="r_'+f[0]+'" type="number" step="any" inputmode="decimal"></div>';}).join("")+'<div><label for="r_depth">Galfan box depth</label><select id="r_depth"><option value="0.5">0.5 m</option><option value="1">1.0 m</option></select></div>';
function galfanBoxes(L,pricedH){var cols=Math.ceil(L/2-1e-9),n10=Math.floor(pricedH+1e-9),n05=(pricedH-n10)>0.25?1:0,d=S.depth==="1"?"10":"05",dl=S.depth==="1"?"1.0":"0.5";
 var p10=+S["box"+d+"x10"]||0,p05=+S["box"+d+"x05"]||0,c10=cols*n10,c05=cols*n05,parts=[];
 if(c10)parts.push(c10+" × 2.0×"+dl+"×1.0 @ "+money(p10));if(c05)parts.push(c05+" × 2.0×"+dl+"×0.5 @ "+money(p05));
 return {cols:cols,c10:c10,c05:c05,cost:c10*p10+c05*p05,label:parts.join(" + ")};}
function fill(){$("len").value=S.len;$("hgt").value=S.hgt;$("ew").checked=!!S.ew;$("ewAmt").value=S.earthworksFee;$("r_depth").value=S.depth;
 FIELDS.forEach(function(f){$("r_"+f[0]).value=S[f[0]];});
 [].forEach.call(document.querySelectorAll("#type button"),function(b){b.classList.toggle("on",b.dataset.v===S.type);});}
function row(a,b,c){return '<tr'+(c?' class="'+c+'"':'')+'><td>'+a+'</td><td>'+(b==null?'':b)+'</td></tr>';}
function render(){
 var L=+S.len||0,H=+S.hgt,t=S.type,out="";
 var rates={dayRate:+S.dayRate,gabionM2PerDay:+S.gabionM2PerDay,limestoneM2PerDay:+S.limestoneM2PerDay,blockMaterial:+S.blockMaterial,sheetPrice:+S.sheetPrice,panel1x05:+S.panel1x05,panel05x05:+S.panel05x05,braceHook:+S.braceHook,clipsPerLayerPerM:+S.clipsPerLayerPerM,rockLoadPrice:+S.rockLoadPrice,rockLoadTonnes:+S.rockLoadTonnes,geoRollPrice:+S.geoRollPrice};
 var q;try{q=calcQuote(L,H,t,rates);}catch(e){$("tot").textContent="—";$("bd").innerHTML=row(e.message);return;}
 var gb=null;if(t==="galfan"){gb=galfanBoxes(L,q.pricedHeight);var dlt=gb.cost-q.mesh.cost;q.materialsCost+=dlt;q.contractorCost+=dlt;}
 var cost=q.contractorCost,pct=(+S.mgmtPct||0)/100,fee=cost*pct,ew=S.ew?(+S.earthworksFee||0):0,ex=cost+fee+ew,gst=ex*0.1,inc=ex+gst;
 out+=row("Wall",null,"h")+row("Length",num(L)+" m")+row("Height",num(H)+" m");
 if(t==="limestone")out+=row("Face area",num(q.faceArea)+" m²")+row("Blocks per metre",num(q.limestone.blocksPerMetre));
 else out+=row("Layers (0.5 m)",num(q.layers))+row("Face area",num(q.faceArea)+" m²");
 out+=row("Contractor cost",null,"h");
 if(t==="limestone")out+=row("Limestone blocks: "+q.limestone.blocks+" × "+money(rates.blockMaterial),money(q.materialsCost));
 else{
  if(t==="galfan")out+=row("Galfan boxes: "+gb.label,money(gb.cost));
  else out+=row("Galvanised sheets: "+q.mesh.sheets+" × 2.4×4.5 ("+num(q.mesh.areaM2,1)+" m²)",money(q.mesh.cost));
  out+=row("Clips: "+num(q.clips,0)+" @ $1",money(q.clips))+row("Coffee rock: "+num(q.rock.tonnes,1)+" t ("+q.rock.loads+" load"+(q.rock.loads==1?"":"s")+")",money(q.rock.cost))+row("Geotextile: "+q.geotextile.rolls+" roll"+(q.geotextile.rolls==1?"":"s"),money(q.geotextile.cost));
 }
 out+=row("Materials subtotal",money(q.materialsCost),"b")+row("Labour: "+num(q.labour.days)+" days @ "+num(q.labour.m2PerDay)+" m²/day × "+money(rates.dayRate).replace(".00",""),money(q.labour.cost))+row("Contractor cost",money(cost),"b");
 out+=row("Build time",null,"h")+row("Days on site",num(q.labour.days)+" days","b");
 out+=row("Fees",null,"h")+row("Management fee ("+num(pct*100)+"%)",money(fee))+row("Earthworks",S.ew?money(ew):"not charged");
 out+=row("Total",null,"h")+row("Total ex GST",money(ex))+row("GST (10%)",money(gst))+row("Total inc GST",money(inc),"b");
 $("bd").innerHTML=out;$("tot").textContent=money(inc);$("tots").textContent=money(ex)+" ex GST + "+money(gst)+" GST · "+num(q.labour.days)+" days build";
 $("hnote").textContent="";
}
$("len").oninput=function(){S.len=this.value;save();render();};
$("hgt").onchange=function(){S.hgt=this.value;save();render();};
$("ew").onchange=function(){S.ew=this.checked;save();render();};
$("ewAmt").oninput=function(){S.earthworksFee=this.value;$("r_earthworksFee").value=this.value;save();render();};
[].forEach.call(document.querySelectorAll("#type button"),function(b){b.onclick=function(){S.type=b.dataset.v;save();fill();render();};});
FIELDS.forEach(function(f){$("r_"+f[0]).oninput=function(){S[f[0]]=this.value;if(f[0]==="earthworksFee")$("ewAmt").value=this.value;save();render();};});
$("r_depth").onchange=function(){S.depth=this.value;save();render();};
$("reset").onclick=function(){var k={len:S.len,hgt:S.hgt,type:S.type,ew:S.ew};S=Object.assign(defaults(),k);save();fill();render();};
fill();render();
})();

const vm=require('vm'),fs=require('fs'),assert=require('assert');
const root=require('path').resolve(__dirname,'..')+'/';
function environment(name,width=375){
 let time=100,serial=0,timers=new Map(),els=new Map(),calls=0;
 const noop=()=>{};
 const gfx=new Proxy({measureText:s=>({width:String(s).length*7}),createLinearGradient:()=>({addColorStop:noop}),createRadialGradient:()=>({addColorStop:noop})},{get:(o,k)=>k in o?o[k]:(...args)=>{calls++;for(const a of args)if(typeof a==='number')assert(Number.isFinite(a),k+' nonfinite');}});
 function el(id){if(els.has(id))return els.get(id);let cl=new Set(),e={id,value:'audit',dataset:{},style:{setProperty:noop},classList:{add:(...a)=>a.forEach(x=>cl.add(x)),remove:(...a)=>a.forEach(x=>cl.delete(x)),toggle:noop,contains:x=>cl.has(x)},textContent:'',innerHTML:'',addEventListener:noop,setAttribute:noop,getAttribute:()=>'',focus:noop,appendChild:noop,querySelectorAll:()=>[],querySelector:()=>null,getContext:()=>gfx,getBoundingClientRect:()=>({width,height:812,left:0,top:0}),width,height:812,clientWidth:width,clientHeight:812};els.set(id,e);return e;}
 let store=new Map();const c={console,Math,Date,JSON,Number,String,Array,Object,Map,Set,Promise,Uint8Array,Float32Array,performance:{now:()=>time},innerWidth:width,innerHeight:812,devicePixelRatio:1,location:{protocol:'http:',hostname:'localhost',href:'http://localhost/',hash:''},navigator:{vibrate:noop},document:{getElementById:el,querySelectorAll:()=>[],querySelector:()=>null,documentElement:el('root'),body:el('body'),addEventListener:noop,createElement:()=>el('new'),activeElement:null},localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)},addEventListener:noop,removeEventListener:noop,requestAnimationFrame:()=>1,cancelAnimationFrame:noop,setTimeout:(fn,ms)=>{timers.set(++serial,{fn,at:time+(ms||0)});return serial;},clearTimeout:id=>timers.delete(id),setInterval:()=>1,clearInterval:noop,fetch:()=>Promise.reject(Error('Audit network disabled')),getComputedStyle:()=>({getPropertyValue:()=> '0'}),matchMedia:()=>({matches:false,addEventListener:noop}),URL,URLSearchParams};c.window=c;c.open=noop;c.scrollTo=noop;vm.createContext(c);
 vm.runInContext(fs.readFileSync(root+'swimmer-v2.js','utf8'),c);
 const html=fs.readFileSync(root+name+'/index.html','utf8');
 for(let m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)){
  let s=m[1];
  if(name==='breaststroke')s=s.replace('window.__breaststrokeTimeAttack = {','window.__auditPhysics=updatePhysics;window.__auditDraw=drawSwimmer;window.__breaststrokeTimeAttack = {');
  if(name==='butterfly')s=s.replace('window.__flyDebug = {',`window.__audit={g:game,update,draw,dive,kick:dolphinKick,surface,breathe,pair:pairedHands,turn,finish,under:inUnderwater,dist:distInLeg,done:()=>state===STATE.FINISH,fail:()=>state!==STATE.SWIM,start:d=>{raceDistance=d;resetRace();state=STATE.SWIM;game.signalAt=performance.now();game.startAt=performance.now();dive();}};window.__flyDebug = {`);
  vm.runInContext(s,c);
 }
 c.__rank=c.SWIMRANK; c.SWIMRANK={submit:noop};
 if(name!=='butterfly'&&name!=='breaststroke')c.__audit=vm.runInContext(`({g:G,update,draw,dive,kick:doKick,surface,breathe:doBreath,tap:onTap,turn:doTurn,finish:finishRace,dist:distInLeg,done:()=>state===S.FINISH,fail:()=>state!==S.SWIM,stroke:()=>${name==='im'?'currentStroke().id':JSON.stringify(name)},start:d=>{RACE_DIST=d;resetRace();state=S.SWIM;G.raceStart=performance.now();G.beepAt=performance.now();dive();}})`,c);
 return {c,el,gfx,step(){time+=1000/60;for(const[id,t]of [...timers])if(t.at<=time){timers.delete(id);t.fn();}return time;},time:()=>time,calls:()=>calls};
}
function race(name,gap,distance,width=375){
 const env=environment(name,width),c=env.c;let a=c.__audit;
 if(name==='breaststroke'){a=c.__breaststrokeTimeAttack;a.setDistance(distance);a.forceStart();}else a.start(distance);
 let last=-1000,side='L',seen=[],uw=0,wall=0;
 for(let i=0;i<24000;i++){
  const t=env.step();
  if(name==='breaststroke'){
   c.__auditPhysics(1/60);if(i%30===0)c.__auditDraw(t);
   const r=a.getState();if(r.mode==='result')return {time:+r.finalTime.toFixed(2),result:r.disqualified?r.disqReason:'FINISH'};
   if(r.nextWall!==wall){uw=0;wall=r.nextWall;}if(t-last<180)continue;
   const pair=()=>{a.left();a.right();last=t;};
   if(r.nearWall){pair();continue;}
   if(r.phase==='underwater'){
    if(uw===0){a.action();uw=1;last=t;}else if(uw===1){pair();uw=2;}else if(uw===2){a.action();uw=3;last=t;}else if(r.underwaterDist>=9){a.action();last=t;}
   }else if(r.cycle==='kick'){a.action();last=t;}else if(t-last>=gap)pair();continue;
  }
  a.update(t);if(i%30===0)a.draw(t);
  if(a.done())return {time:+(a.g.finalTime||a.g.final).toFixed(2),result:'FINISH',strokes:seen};
  if(a.fail())return {result:'DSQ',dist:a.g.dist};
  const under=name==='butterfly'?a.under():a.g.underwater,d=a.dist(),st=name==='butterfly'?'fly':a.stroke();
  if(!seen.includes(st))seen.push(st);
  if(under){if(d>=9){a.surface();last=t;}else if(t-last>=260){a.kick(name==='butterfly'?false:t);last=t;}continue;}
  if(name==='butterfly'){
   if(d>=24.5&&a.g.leg<distance/25){a.turn(0);last=t;continue;}
   if(a.g.dist>=distance-.1){a.finish(0);continue;}
   if(a.g.oxygen<65&&t-a.g.breathAt>=1400)a.breathe();if(t-last>=gap){a.pair(0);last=t;}
  }else{
   if(a.g.oxygen<65&&!a.g.isBreathing)a.breathe();
   if(d>=24.5&&a.g.leg<distance/25){a.tap('L');if(name==='im')a.tap('R');last=t;continue;}
   if(t-last>=gap){if(name==='im'&&(st==='fly'||st==='breast')){a.tap('L');a.tap('R');}else{a.tap(side);side=side==='L'?'R':'L';}last=t;}
  }
 }
 return {result:'TIMEOUT',dist:name==='breaststroke'?a.getState().x:a.g.dist};
}
for(const name of ['freestyle','backstroke','butterfly','breaststroke','im']){
 const d=name==='im'?100:50,g=name==='butterfly'?700:name==='breaststroke'?720:name==='im'?580:name==='freestyle'?400:420;
 const rhythm=race(name,g,d),fast=race(name,180,d),long=race(name,g,d*2,320);
 console.log(JSON.stringify({name,rhythm,fast,long}));
 for(const r of [rhythm,fast,long])assert.equal(r.result,'FINISH',name+' must finish');
 if(name==='im')assert.deepEqual(long.strokes,['fly','back','breast','free']);
}
// Wall input must not teleport the swimmer, even at a generous early input window.
for(const name of ['freestyle','backstroke','im','butterfly']){
 const env=environment(name),a=env.c.__audit;a.start(name==='im'?100:50);a.g.dist=24;a.g.underwater=false;a.g.surfaced=true;
 a.turn(name==='im'?true:0);assert.equal(a.g.dist,24,name+' early turn teleported');assert.equal(a.g.leg,1);
}
console.log('PASS: all five finish, long races finish, IM sequence, early turns do not teleport, finite renderer coordinates');
async function transmissionTests(){
 for(const name of ['freestyle','backstroke','butterfly','breaststroke','im']){
  let e=environment(name);e.c.fetch=()=>Promise.reject(Error('offline'));e.c.__rank.submit('監査',name==='im'?100:50,40);
  await new Promise(resolve=>setImmediate(resolve));
  assert(e.el('srBar').innerHTML.includes('送信できません'),name+' offline must not show success');
  e=environment(name);let n=0;e.c.fetch=()=>++n===1?Promise.resolve({ok:true}):Promise.reject(Error('read unavailable'));e.c.__rank.submit('監査',name==='im'?100:50,40);
  await new Promise(resolve=>setImmediate(resolve));
  assert(e.el('srBar').innerHTML.includes('保存済み'),name+' successful POST survives failed ranking GET');
 }
 console.log('PASS: all five distinguish failed save from saved score with unavailable ranking');
}
transmissionTests().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={environment,race};

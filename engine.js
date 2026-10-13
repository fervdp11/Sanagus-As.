import {MAP,LOBBY,FLOORS,STATIONS,REPAIRS,VENTS,DOORS,SABOTAGES,taskStation,mapFor,appearanceOf,COLORS,HATS,SKINS,PANTS,GLASSES,BAGS,ACCESSORIES,SPEED,USE_RANGE,KILL_RANGE,REPORT_RANGE,GRACE_MS,RECONNECT_MS,TILE,roomAt,move,canStand,distance,lineOfSight,visionLineOfSight,insideStairs} from '../public/content.js';

import {challenge,minDuration,solution} from './tasks.js';

export class GameError extends Error {constructor(message,status=400){super(message);this.status=status;}}
const assert=(ok,message,status=400)=>{if(!ok)throw new GameError(message,status);};
const uid=()=>crypto.randomUUID();
export const DEFAULTS={impostors:1,tasks:10,killCooldown:30,discussion:20,voting:40,confirmEject:true};
const VENT_COOLDOWN=20000,VENT_LIMIT=10000;
const SPECIAL_ROLES=['nerd','delegate','engineer','plug','believer'];
const TEACHER_NAMES=['Chuchi','Iván de la Horra','Marcos','Luis Ángel'];
const GHOST_EMOJIS=['👻','💀','😱','🤫','👀','❤️','🔥','❄️','🧠','🤔','😈','😭','✅','❌','⚠️','🫡','🔎','🤝','🙈','🎯'];
const TEACHER_SPEED=SPEED/2;
const inCorridor=p=>FLOORS[p.floor??0]?.corridors.some(r=>p.x>=r.x*TILE&&p.x<(r.x+r.w)*TILE&&p.y>=r.y*TILE&&p.y<(r.y+r.h)*TILE);
const classroom=(p)=>FLOORS[p.floor??0]?.rooms.some(r=>r.type==='classroom'&&p.x>=r.x*TILE&&p.x<(r.x+r.w)*TILE&&p.y>=r.y*TILE&&p.y<(r.y+r.h)*TILE);
const freeCells=floor=>{const map=FLOORS[floor],cells=[];for(let y=1;y<map.height-1;y++)for(let x=1;x<map.width-1;x++)if(canStand(map,(x+.5)*TILE,(y+.5)*TILE))cells.push({x,y});return cells;};
const teacherCells=FLOORS.map((_,i)=>freeCells(i));
function teacherPath(floor,from,to){const map=FLOORS[floor],start=[Math.floor(from.x/TILE),Math.floor(from.y/TILE)],end=[Math.floor(to.x/TILE),Math.floor(to.y/TILE)],key=(x,y)=>y*map.width+x,goal=key(...end),root=key(...start);const parents=new Map([[root,null]]),queue=[root];
 for(let k=0;k<queue.length&&k<5000;k++){const id=queue[k];if(id===goal)break;const x=id%map.width,y=Math.floor(id/map.width);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const xx=x+dx,yy=y+dy,n=key(xx,yy);if(!parents.has(n)&&canStand(map,(xx+.5)*TILE,(yy+.5)*TILE)){parents.set(n,id);queue.push(n);}}}
 if(!parents.has(goal))return [];const path=[];for(let node=goal;node!==root&&node!==null;node=parents.get(node))path.push({x:((node%map.width)+.5)*TILE,y:(Math.floor(node/map.width)+.5)*TILE});return path.reverse();}
function randomTeacher(floor,name,now){const cells=teacherCells[floor],cell=cells[randomInt(cells.length)];return {id:uid(),name,floor,x:(cell.x+.5)*TILE,y:(cell.y+.5)*TILE,facing:1,input:{x:0,y:0},path:[],target:null,nextPath:now,lastMove:now,turnFloor:now+15000+randomInt(18000)};}
function updateTeachers(room,now){for(const npc of room.teachers||[]){const dt=Math.max(0,Math.min(.35,(now-(npc.lastMove||now))/1000));npc.lastMove=now;
 const candidates=alive(room).filter(q=>!q.detainedUntil&&!classroom(q)&&inCorridor(q)&&q.floor===npc.floor&&distance(npc,q)<440);
 const prey=candidates.sort((a,b)=>distance(npc,a)-distance(npc,b))[0];npc.chasing=prey?.id||null;if(prey)npc.goal=null;
 if(npc.goal!=='stairs'&&(now>=npc.nextPath||!npc.path?.length||npc.target!==npc.chasing)){npc.target=npc.chasing;npc.nextPath=now+(prey?500:2800);const cells=teacherCells[npc.floor];const dest=prey||(()=>{const next=cells[randomInt(cells.length)];return {x:(next.x+.5)*TILE,y:(next.y+.5)*TILE};})();npc.path=teacherPath(npc.floor,npc,dest);}
 let left=TEACHER_SPEED*dt;while(left>0&&npc.path.length){const to=npc.path[0],d=distance(npc,to);if(d<2){npc.path.shift();continue;}const step=Math.min(left,d),ax=(to.x-npc.x)/d,ay=(to.y-npc.y)/d;move(FLOORS[npc.floor],npc,ax,ay,step/SPEED);npc.input={x:ax,y:ay};left-=step;if(step>=d-1)npc.path.shift();else break;}
 if(prey&&inCorridor(prey)&&!classroom(prey)&&distance(npc,prey)<=32){const roomExpelled=FLOORS[1].rooms.find(r=>r.id==='expelled');prey.floor=1;prey.x=(roomExpelled.x+3)*TILE;prey.y=(roomExpelled.y+roomExpelled.h-2)*TILE;prey.input={x:0,y:0};prey.moveAt=now;prey.motionAnchor=now;prey.motionSpent=0;prey.detainedUntil=now+30000;prey.puzzle=null;prey.repair=null;prey.transition={kind:'detained',at:now,until:now+650};event(room,'detained',`${npc.name} ha llevado a ${prey.name} a expulsados durante 30 segundos.`,now,{victim:prey.id});}
 if(!npc.chasing&&now>=npc.turnFloor){const stair=FLOORS[npc.floor].stairs[0];if(distance(npc,stair)<TILE*1.4){const floor=1-npc.floor,dest=FLOORS[floor].stairs[0];npc.floor=floor;npc.x=dest.x;npc.y=dest.y;npc.path=[];npc.goal=null;npc.turnFloor=now+20000+randomInt(20000);}else if(npc.goal!=='stairs'||!npc.path.length){npc.path=teacherPath(npc.floor,npc,stair);npc.goal='stairs';npc.nextPath=now+4000;}}}}

const randomInt=n=>crypto.getRandomValues(new Uint32Array(1))[0]%n;
export function shuffle(items){const a=[...items];for(let i=a.length-1;i>0;i--){const j=randomInt(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
export function roomCode(){return Array.from({length:6},()=> 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[randomInt(32)]).join('');}
export function profile(raw={}) {
  assert(raw&&typeof raw==='object'&&!Array.isArray(raw),'Identidad no válida.');
  const name=String(raw.name||'').normalize('NFKC').replace(/[\u0000-\u001f\u007f<>\u202a-\u202e\u2066-\u2069]/g,'').trim().slice(0,18);
  assert(name.length>=2,'Escribe un nombre de entre 2 y 18 caracteres.');
  const option=(v,n)=>Number.isInteger(v)&&v>=0&&v<n?v:0;
  return {name,color:option(raw.color,COLORS.length),hat:option(raw.hat,HATS.length),skin:option(raw.skin,SKINS.length),outfitColor:option(raw.outfitColor??raw.color,COLORS.length),trimColor:option(raw.trimColor??2,COLORS.length),pants:option(raw.pants,PANTS.length),glasses:option(raw.glasses,GLASSES.length),bag:option(raw.bag,BAGS.length),accessory:option(raw.accessory,ACCESSORIES.length)};
}
function makePlayer(raw,room,now){const p=profile(raw);let color=p.color;for(let i=0;i<COLORS.length;i++){if(!room.players.some(p=>!p.removed&&p.color===color))break;color=(color+1)%COLORS.length;}
  const n=room.players.length,a=n*2.4;return {...p,color,floor:0,vent:null,ventSince:0,ventReady:0,transition:null,id:uid(),token:uid()+uid(),x:LOBBY.spawn.x+Math.cos(a)*80,y:LOBBY.spawn.y+Math.sin(a)*70,facing:1,alive:true,role:null,tasks:[],input:{x:0,y:0},moveAt:now,motionAt:now,motionAnchor:now,motionSpent:0,motionSeq:0,lastSeen:now,lastChat:0,emergencies:1,killReady:0,detainedUntil:0,ghostEmojis:[],ghostReady:0,removed:false};}
export function createRoom(raw,now=Date.now()){const room={version:1,contentVersion:4,code:roomCode(),created:now,updated:now,phase:'lobby',host:null,config:{...DEFAULTS},players:[],bodies:[],chat:[],events:[],meeting:null,result:null,sabotage:null,sabotageReady:0,gameNumber:0,revealUntil:0,teachers:[],ghostMessages:[]};const p=makePlayer(raw,room,now);room.players.push(p);room.host=p.id;event(room,'join',`${p.name} ha creado la sala.`,now);return {room,player:p};}
export function joinRoom(room,raw,now){assert(room.contentVersion===4,'Esta sala pertenece a la versión anterior. Crea una sala nueva del colegio.',409);tick(room,now);assert(room.phase==='lobby','Esta partida ya ha comenzado. Espera a la siguiente.');assert(room.players.filter(p=>!p.removed).length<10,'La sala está llena (10 jugadores).');const pr=profile(raw);assert(!room.players.some(p=>!p.removed&&p.name.toLowerCase()===pr.name.toLowerCase()),'Ese nombre ya está en la sala. Usa otro.');const p=makePlayer(raw,room,now);room.players.push(p);event(room,'join',`${p.name} ha entrado.`,now);return p;}
const active=room=>room.players.filter(p=>!p.removed);
const alive=room=>active(room).filter(p=>p.alive);
export function event(room,type,text,now,extra={}){room.events.push({id:uid(),type,text,time:now,...extra});room.events=room.events.slice(-20);}
function stopPlayers(room,now){for(const p of room.players){if(p.vent)p.ventReady=Math.max(p.ventReady||0,now+VENT_COOLDOWN);p.input={x:0,y:0};p.moveAt=now;p.puzzle=null;p.repair=null;p.vent=null;p.ventSince=0;p.transition=null;}}
function spawn(room,map,now){active(room).forEach((p,i)=>{const a=i*Math.PI*2/Math.max(1,active(room).length);p.floor=map.floor??0;p.vent=null;p.ventSince=0;p.transition=null;p.x=map.spawn.x+Math.cos(a)*80;p.y=map.spawn.y+Math.sin(a)*70;p.moveAt=now;p.motionAt=now;p.motionAnchor=now;p.motionSpent=0;p.input={x:0,y:0};});}
function finish(room,winner,reason,now){if(room.phase==='ended')return;room.phase='ended';room.result={winner,reason,time:now};room.pendingFinish=null;room.sabotage=null;room.meeting=null;room.teachers=[];stopPlayers(room,now);event(room,'end',reason,now);}
export function checkWin(room,now){if(!['game','meeting'].includes(room.phase))return;const living=alive(room);const impostors=living.filter(p=>p.role==='impostor').length,crew=living.length-impostors;let winner,reason;if(impostors===0){winner='crew';reason='No quedan impostores en el colegio.';}else if(crew<=impostors){winner='impostor';reason='Los impostores controlan el colegio.';}else{const tasks=active(room).filter(p=>p.role==='crew').flatMap(p=>p.tasks);if(tasks.length&&tasks.every(t=>t.done)){winner='crew';reason='La tripulación ha completado todas las tareas.';}}if(!winner||room.pendingFinish?.decisive)return;if(room.phase==='meeting'&&room.meeting?.stage==='result'){room.pendingFinish={winner,reason};return;}finish(room,winner,reason,now);}
function resolveVotes(room,now){const m=room.meeting;const votes=Object.values(m.votes),counts={};for(const v of votes)counts[v]=(counts[v]||0)+1;const ordered=Object.entries(counts).sort((a,b)=>b[1]-a[1]);let expelled=null,reason='Nadie ha recibido votos.';
  if(m.delegateTarget){const delegate=room.players.find(p=>p.id===m.delegateTarget.by),target=room.players.find(p=>p.id===m.delegateTarget.target);const correct=target?.role==='impostor'&&target.alive;const out=correct?target:delegate;out.alive=false;out.puzzle=null;out.repair=null;expelled={id:out.id,...appearanceOf(out),role:room.config.confirmEject?out.role:null};reason=correct?`${delegate.name} acertó: ${target.name} era impostor. Victoria de la tripulación.`:`${delegate.name} se equivocó y ha sido expulsado.`;if(correct)room.pendingFinish={winner:'crew',reason:`${delegate.name} descubrió al impostor ${target.name}.`,decisive:true};}
  else if(ordered.length){const [id,n]=ordered[0];if(ordered[1]?.[1]===n)reason='Empate. Nadie es expulsado.';else if(id==='skip')reason='Se ha saltado la votación.';else {const p=room.players.find(p=>p.id===id&&!p.removed&&p.alive);if(p){p.alive=false;p.puzzle=null;expelled={id:p.id,name:p.name,color:p.color,hat:p.hat,skin:p.skin,...appearanceOf(p),role:room.config.confirmEject?p.role:null};reason=`${p.name} ha sido expulsado.`;}else reason='El jugador votado ya no está en el colegio.';}}
  m.result={counts,expelled,reason};m.stage='result';m.resultUntil=now+9500;event(room,'expel',reason,now);checkWin(room,now);
}
function electHost(room,now){if(!room.players.some(p=>p.id===room.host&&!p.removed&&now-p.lastSeen<=RECONNECT_MS)){const online=active(room).filter(p=>now-p.lastSeen<=RECONNECT_MS);if(online.length)room.host=online[0].id;}}
export function tick(room,now){room.updated=now;
  // Durante una expedición una pausa de conexión no decide la partida.
  // El token permite volver al mismo puesto; en el hangar se limpian plazas inactivas.
  if(room.phase==='lobby')for(const p of room.players){if(!p.removed&&now-p.lastSeen>GRACE_MS){p.removed=true;p.alive=false;p.puzzle=null;event(room,'disconnect',`${p.name} salió por desconexión.`,now);}}
  if(room.phase!=='lobby')for(const p of active(room))if(now-p.lastSeen>RECONNECT_MS){p.input={x:0,y:0};p.moveAt=now;p.puzzle=null;p.repair=null;}
  if(room.phase==='lobby')room.players=room.players.filter(p=>!p.removed);
  electHost(room,now);
  for(const p of active(room)){if(p.transition&&now>=p.transition.until)p.transition=null;if(p.detainedUntil&&now>=p.detainedUntil){p.detainedUntil=0;p.floor=1;p.x=63*TILE;p.y=15.5*TILE;p.input={x:0,y:0};p.moveAt=now;p.motionAnchor=now;p.motionSpent=0;event(room,'released',`${p.name} ha terminado su expulsión.`,now,{victim:p.id});}}
  if(room.phase==='game'&&now>=room.revealUntil)updateTeachers(room,now);
  if(room.phase==='game')for(const p of active(room))if(p.vent&&now-(p.ventSince||now)>=VENT_LIMIT){p.vent=null;p.ventSince=0;p.ventReady=now+VENT_COOLDOWN;p.input={x:0,y:0};p.transition={kind:'vent-out',at:now,until:now+550};event(room,'vent-timeout',`${p.name} salió de la alcantarilla al agotarse el tiempo.`,now);}
  if(room.sabotage?.kind==='doors'&&now>=room.sabotage.until)room.sabotage=null;
  if(room.sabotage?.kind==='emergency'){for(const [id,c] of Object.entries(room.sabotage.confirmations))if(now-c.time>8000){delete room.sabotage.confirmations[id];room.sabotage.fixed=room.sabotage.fixed.filter(v=>v!==id);}}
  if(room.phase==='meeting'&&room.meeting){const m=room.meeting;if(m.stage==='discussion'&&now>=m.discussionEnd)m.stage='voting';if(m.stage==='voting'&&(now>=m.voteEnd||alive(room).every(p=>m.votes[p.id]!==undefined)))resolveVotes(room,now);if(room.phase==='meeting'&&m.stage==='result'&&now>=m.resultUntil){if(room.pendingFinish)finish(room,room.pendingFinish.winner,room.pendingFinish.reason,now);else {room.phase='game';room.meeting=null;room.bodies=[];spawn(room,MAP,now);for(const p of room.players)p.killReady=now+room.config.killCooldown*1000;}}}
  checkWin(room,now);
}
function requireGame(room,p,now,{living=true,vent=false}={}){assert(room.phase==='game','Esta acción solo está disponible durante la partida.');assert(now>=room.revealUntil,'Espera a que termine la presentación del rol.');assert(!p.transition||now>=p.transition.until,'Espera a que termine el traslado.');if(!vent)assert(!p.vent,'Sal del conducto antes de realizar esta acción.');if(living)assert(p.alive,'Los espectros no pueden realizar esta acción.');assert(!p.detainedUntil||now>=p.detainedUntil,'Estás en la sala de expulsados durante 30 segundos.');}
function near(room,p,target,range=USE_RANGE){return target&&!target.vent&&(p.floor??0)===(target.floor??0)&&distance(p,target)<=range&&lineOfSight(mapFor(p.floor,room.sabotage),p,target);}
function openMeeting(room,p,now,reason,body=null){room.phase='meeting';room.sabotage=null;room.sabotageReady=Math.max(room.sabotageReady,now+30000);stopPlayers(room,now);spawn(room,LOBBY,now);room.meeting={id:uid(),caller:p.name,reason,body:body?.name||null,stage:'discussion',discussionEnd:now+room.config.discussion*1000,voteEnd:now+(room.config.discussion+room.config.voting)*1000,votes:{},result:null};event(room,'meeting',reason==='body'?`${p.name} ha denunciado a ${body.name}.`:`${p.name} ha convocado una reunión.`,now);}
function blockedTask(room,kind){return room.sabotage?.kind==='electrical'&&['computer','wires','lights','code'].includes(kind)||room.sabotage?.kind==='computers'&&['computer','code'].includes(kind);}
function integrate(room,p,now){if(!['lobby','game','meeting'].includes(room.phase))return;const dt=Math.max(0,Math.min(.3,(now-p.moveAt)/1000));if(room.phase==='game'&&(now<room.revealUntil||p.detainedUntil>now))return;p.moveAt=now;if(p.puzzle||p.repair||p.vent||p.transition?.until>now)return;move(room.phase==='lobby'||room.phase==='meeting'?LOBBY:mapFor(p.floor,room.sabotage),p,p.input.x,p.input.y,dt,room.phase==='game'&&!p.alive);}
function applyMotion(room,p,packet,now){
  assert(packet&&typeof packet==='object'&&!Array.isArray(packet),'Movimiento no válido.');
  const {seq,segments,x,y}=packet;
  assert(Number.isSafeInteger(seq)&&seq>0,'Secuencia de movimiento no válida.');
  if(seq<=Number(p.motionSeq||0))return; // Una respuesta perdida puede provocar el reenvío del mismo lote.
  assert(seq===Number(p.motionSeq||0)+1,'Movimiento fuera de orden.');
  assert(Array.isArray(segments)&&segments.length<=120,'Demasiados tramos de movimiento.');
  assert(Number.isInteger(x)&&Math.abs(x)<=1&&Number.isInteger(y)&&Math.abs(y)<=1,'Dirección no válida.');
  let elapsed=0;
  for(const step of segments){assert(step&&Number.isInteger(step.x)&&Math.abs(step.x)<=1&&Number.isInteger(step.y)&&Math.abs(step.y)<=1&&Number.isFinite(step.ms)&&step.ms>0&&step.ms<=3000,'Tramo de movimiento no válido.');elapsed+=step.ms;}
  assert(elapsed<=3500&&elapsed<=Math.max(0,now-(p.motionAt??p.moveAt))+150,'Movimiento demasiado rápido.');
  assert((p.motionSpent||0)+elapsed<=now-(p.motionAnchor??p.moveAt)+150,'Movimiento demasiado rápido.');
  if(['lobby','game','meeting'].includes(room.phase)&&!(room.phase==='game'&&(now<room.revealUntil||p.detainedUntil>now))&&!p.puzzle&&!p.repair&&!p.vent&&!(p.transition?.until>now)){
    const map=room.phase==='lobby'||room.phase==='meeting'?LOBBY:mapFor(p.floor,room.sabotage),ghost=room.phase==='game'&&!p.alive;
    for(const step of segments)move(map,p,step.x,step.y,step.ms/1000,ghost);
    p.input={x,y};
  }else p.input={x:0,y:0};
  p.motionSeq=seq;p.motionAt=now;p.motionSpent=(p.motionSpent||0)+elapsed;p.moveAt=now;
}
export function command(room,token,type,data={},now=Date.now()){
  assert(typeof token==='string','Sesión no válida.',401);const p=room.players.find(p=>p.token===token&&!p.removed);assert(p,'Tu sesión ha caducado. Vuelve a entrar en la sala.',401);
  // En el hangar la plaza inactiva caduca; durante la partida se conserva.
  assert(room.contentVersion===4,'Esta sala pertenece a la versión anterior. Crea una sala nueva del colegio.',409);tick(room,now);assert(!p.removed,'Has perdido la conexión durante más de 30 segundos.',401);
  p.lastSeen=now;electHost(room,now);assert(!p.rateAt||now-p.rateAt>500||p.rateCount<18,'Demasiadas acciones. Espera un momento.',429);if(!p.rateAt||now-p.rateAt>500){p.rateAt=now;p.rateCount=0;}p.rateCount++;
  if(data._motion!==undefined)applyMotion(room,p,data._motion,now);else integrate(room,p,now);let extra={};
  if(type==='pulse'){if(data._motion===undefined){const x=Number(data.x)||0,y=Number(data.y)||0;p.input={x:Math.max(-1,Math.min(1,x)),y:Math.max(-1,Math.min(1,y))};}}
  else if(type==='profile'){assert(room.phase==='lobby','Cambia tu aspecto antes de empezar.');const pr=profile(data);assert(!active(room).some(q=>q.id!==p.id&&q.name.toLowerCase()===pr.name.toLowerCase()),'Ese nombre ya está en la sala.');assert(!active(room).some(q=>q.id!==p.id&&q.color===pr.color),'Ese color ya está ocupado.');Object.assign(p,pr);}
  else if(type==='configure'){assert(p.id===room.host,'Solo el líder puede configurar la partida.',403);assert(room.phase==='lobby','La partida ya está en marcha.');assert(data.killCooldown===undefined||data.killCooldown===30,'La recarga para matar es de 30 segundos.');const ranges={impostors:[1,2],tasks:[2,10],discussion:[5,60],voting:[15,90]};for(const [k,[min,max]] of Object.entries(ranges)){if(data[k]!==undefined){assert(Number.isInteger(data[k])&&data[k]>=min&&data[k]<=max,`Valor no válido: ${k}.`);room.config[k]=data[k];}}if(typeof data.confirmEject==='boolean')room.config.confirmEject=data.confirmEject;}
  else if(type==='start'){assert(p.id===room.host,'Solo el líder puede iniciar la partida.',403);assert(room.phase==='lobby','La partida ya ha empezado.');const playing=active(room);assert(playing.length>=room.config.impostors*3+1,`Hacen falta ${room.config.impostors*3+1} jugadores para ${room.config.impostors} impostor(es).`);assert(playing.every(q=>now-q.lastSeen<=RECONNECT_MS),'Espera a que todos los jugadores estén conectados.');const chosen=new Set(shuffle(playing).slice(0,room.config.impostors).map(q=>q.id));room.phase='game';room.gameNumber++;room.revealUntil=now+8000;room.bodies=[];room.meeting=null;room.result=null;room.chat=[];room.ghostMessages=[];room.teachers=shuffle(TEACHER_NAMES).slice(0,2).map((name,i)=>randomTeacher(i,name,now));room.sabotage=null;room.sabotageReady=now+25000;for(const q of playing){q.alive=true;q.role=chosen.has(q.id)?'impostor':'crew';q.specialRole=null;q.delegateUsed=false;q.detainedUntil=0;q.ghostEmojis=shuffle(GHOST_EMOJIS).slice(0,4);q.ghostReady=0;q.ventReady=0;q.ventSince=0;q.tasks=shuffle(STATIONS).slice(0,room.config.tasks).map(s=>({id:s.id,done:false}));q.emergencies=1;q.killReady=room.revealUntil+30000;q.puzzle=null;q.repair=null;}const crew=shuffle(playing.filter(q=>q.role==='crew')),assigned=new Set();for(const q of crew){const roll=randomInt(10000)/100;const slot=Math.floor(roll/15);if(slot<SPECIAL_ROLES.length&&!assigned.has(SPECIAL_ROLES[slot])){q.specialRole=SPECIAL_ROLES[slot];assigned.add(q.specialRole);}}spawn(room,MAP,now);event(room,'start','Ha comenzado la partida en el colegio.',now);}
  else if(type==='kill'){requireGame(room,p,now);assert(p.role==='impostor','Solo los impostores pueden matar.',403);assert(now>=p.killReady,'El arma todavía se está recargando.');const victim=room.players.find(q=>q.id===data.target&&!q.removed&&q.alive);assert(victim&&victim.role==='crew','Objetivo no válido.');assert(near(room,p,victim,KILL_RANGE),'El objetivo está fuera de alcance o detrás de una pared.');victim.alive=false;victim.puzzle=null;victim.repair=null;room.bodies.push({id:uid(),victim:victim.id,...appearanceOf(victim),floor:victim.floor,x:victim.x,y:victim.y});p.killReady=now+30000;room.actionFx={id:uid(),kind:'kill',actor:p.id,target:victim.id,at:now,until:now+2200};event(room,'death','Un alumno ha perdido la señal.',now,{victim:victim.id,victimName:victim.name,victimFloor:victim.floor});checkWin(room,now);}
  else if(type==='report'){requireGame(room,p,now);const body=room.bodies.find(b=>b.id===data.body);assert(near(room,p,body,REPORT_RANGE),'No hay un cadáver a tu alcance.');openMeeting(room,p,now,'body',body);}
  else if(type==='emergency'){requireGame(room,p,now);assert(!room.sabotage,'Resuelve el sabotaje antes de convocar una reunión.');assert(p.emergencies>0,'Ya has usado tu reunión de emergencia.');assert(p.floor===0&&distance(p,MAP.emergency)<145,'Acércate a la mesa del botón rojo en Recepción (planta 0).');p.emergencies--;openMeeting(room,p,now,'emergency');}
  else if(type==='vote'){assert(room.phase==='meeting'&&room.meeting.stage==='voting','Espera a que empiece el tiempo de votación.');assert(p.alive,'Los espectros no votan.');assert(room.meeting.votes[p.id]===undefined,'Ya has votado.');assert(data.target==='skip'||alive(room).some(q=>q.id===data.target),'Ese jugador no está disponible para votar.');room.meeting.votes[p.id]=data.target;tick(room,now);}
  else if(type==='delegateVote'){assert(room.phase==='meeting'&&room.meeting.stage==='voting','Espera a la votación.');assert(p.role==='crew'&&p.specialRole==='delegate'&&p.alive,'Solo el delegado vivo puede usar este voto.',403);assert(!p.delegateUsed,'Ya has usado tu voto decisivo.');assert(room.meeting.votes[p.id]===undefined,'Ya has votado en esta reunión.');const target=alive(room).find(q=>q.id===data.target&&q.id!==p.id);assert(target,'Elige a otro jugador vivo.');p.delegateUsed=true;room.meeting.votes[p.id]=target.id;room.meeting.delegateTarget={by:p.id,target:target.id};resolveVotes(room,now);}
  else if(type==='ghostEmoji'){
    assert(room.phase==='game'&&!p.alive,'Solo los fantasmas pueden enviar emojis.',403);
    assert(active(room).some(q=>q.alive&&q.specialRole==='believer'&&q.role==='crew'),'No hay creyente vivo en esta partida.');
    assert(now>=(p.ghostReady||0),'Solo puedes mandar un emoji cada 15 segundos.');
    assert(typeof data.emoji==='string'&&p.ghostEmojis?.includes(data.emoji),'Solo puedes elegir entre tus cuatro emojis de esta partida.');
    p.ghostReady=now+15000;room.ghostMessages.push({id:uid(),from:p.name,emoji:data.emoji,time:now});room.ghostMessages=room.ghostMessages.slice(-24);
  }
  else if(type==='chat'){assert(room.phase==='lobby'||room.phase==='meeting'||(!p.alive&&room.phase==='game'),'El chat está disponible en la sala de espera y en las reuniones.');assert(now-p.lastChat>=900,'Espera un segundo antes de enviar otro mensaje.');const text=String(data.text||'').replace(/[\u0000-\u001f\u007f\u202a-\u202e]/g,'').trim().slice(0,180);assert(text,'Escribe un mensaje.');p.lastChat=now;room.chat.push({id:uid(),name:p.name,playerId:p.id,color:p.color,text,ghost:room.phase!=='lobby'&&!p.alive,time:now});room.chat=room.chat.slice(-60);}
  else if(type==='stairs'){
    requireGame(room,p,now,{living:false});const stair=FLOORS[p.floor??0].stairs.find(s=>s.id===data.id);
    assert(insideStairs(p,stair),'Entra en las escaleras para cambiar de planta.');const target=FLOORS[1-(p.floor??0)].stairs.find(s=>s.id===stair.id);
    assert(target&&canStand(mapFor(target.floor,room.sabotage),target.x,target.y,!p.alive),'Las escaleras de destino no están disponibles.');
    p.floor=target.floor;p.x=target.x;p.y=target.y;p.input={x:0,y:0};p.transition={kind:'stairs',at:now,until:now+600};p.motionAnchor=now;p.motionSpent=0;
  }
  else if(type==='enterVent'){
    requireGame(room,p,now);assert(p.role==='impostor'||p.specialRole==='engineer','Solo el impostor o el ingeniero pueden usar las alcantarillas.',403);assert(now>=(p.ventReady||0),'Espera a que termine la recarga de 20 segundos de la alcantarilla.');
    const v=VENTS.find(v=>v.id===data.id);assert(near(room,p,v,75),'Acércate a una alcantarilla.');p.vent=v.id;p.ventSince=now;p.x=v.x;p.y=v.y;p.input={x:0,y:0};p.transition={kind:'vent-in',at:now,until:now+500};
  }
  else if(type==='travelVent'){
    requireGame(room,p,now,{vent:true});assert((p.role==='impostor'||p.specialRole==='engineer')&&p.vent,'No estás dentro de un conducto.',403);assert(now-p.ventSince<VENT_LIMIT,'Se ha agotado el tiempo dentro de la alcantarilla.');
    const from=VENTS.find(v=>v.id===p.vent),to=VENTS.find(v=>v.id===data.id);
    assert(from.links.includes(data.id)&&to,'Ese conducto no está conectado.');assert(canStand(mapFor(to.floor,room.sabotage),to.x,to.y),'El destino está bloqueado.');
    p.vent=to.id;p.floor=to.floor;p.x=to.x;p.y=to.y;p.transition={kind:'vent-travel',at:now,until:now+450};p.motionAnchor=now;p.motionSpent=0;
  }
  else if(type==='exitVent'){
    requireGame(room,p,now,{vent:true});assert((p.role==='impostor'||p.specialRole==='engineer')&&p.vent,'No estás dentro de un conducto.',403);
    assert(canStand(mapFor(p.floor,room.sabotage),p.x,p.y),'La salida está bloqueada.');p.vent=null;p.ventSince=0;p.ventReady=now+VENT_COOLDOWN;p.transition={kind:'vent-out',at:now,until:now+550};p.killReady=Math.max(p.killReady,now+2000);p.input={x:0,y:0};
  }
  else if(type==='beginTask'){
    requireGame(room,p,now,{living:false});assert(p.role==='crew','Los impostores tienen tareas de cobertura. No suman progreso.',403);
    const t=p.tasks.find(t=>t.id===data.id&&!t.done),station=t&&taskStation(t);assert(station,'Esta tarea no está pendiente.');assert(near(room,p,station),'Acércate a la tarea en la planta indicada.');
    assert(!blockedTask(room,station.kind),'Esta tarea está bloqueada por el sabotaje. Repara primero los paneles.');
    p.input={x:0,y:0};p.puzzle={id:uid(),stationId:station.id,kind:station.kind,challenge:challenge(station.kind),start:now};
    extra.task={...p.puzzle,label:station.label,minDuration:minDuration[station.kind]};
  }
  else if(type==='finishTask'){
    requireGame(room,p,now,{living:false});assert(p.role==='crew'&&p.puzzle,'No tienes una tarea activa.');const puzzle=p.puzzle,t=p.tasks.find(t=>t.id===puzzle.stationId);
    assert(data.id===puzzle.id,'La tarea ya no está activa.');assert(now-puzzle.start<=120000,'La tarea ha caducado. Ábrela otra vez.');assert(now-puzzle.start>=minDuration[puzzle.kind],'Completa la tarea con calma.');
    assert(near(room,p,taskStation(t)),'Te has alejado de la tarea.');assert(!blockedTask(room,puzzle.kind),'La tarea está bloqueada por el sabotaje.');assert(solution(puzzle.kind,puzzle.challenge,data.solution),'La solución no es correcta. Inténtalo otra vez.');
    if(puzzle.kind==='documents'){t.stage=1;extra.carrying=true;}else t.done=true;p.puzzle=null;event(room,'task',`${p.name} completó una tarea.`,now);checkWin(room,now);
  }
  else if(type==='cancel'){p.puzzle=null;p.repair=null;p.input={x:0,y:0};}
  else if(type==='sabotage'){
    requireGame(room,p,now);assert(p.role==='impostor','Solo los impostores pueden sabotear.',403);assert(!room.sabotage&&now>=room.sabotageReady,'El sabotaje todavía no está disponible.');
    const kind=data.kind||'electrical';assert(Object.hasOwn(SABOTAGES,kind),'Sabotaje no válido.');
    room.sabotage={kind,id:uid(),fixed:[],confirmations:{},started:now};room.sabotageReady=now+75000;
    if(kind==='doors'){room.sabotage.until=now+18000;room.sabotage.closed=DOORS.filter(d=>!d.room.startsWith('stairs')&&![...active(room),...room.bodies].some(q=>q.floor===d.floor&&q.x>d.x*56-35&&q.x<(d.x+d.w)*56+35&&q.y>d.y*56-35&&q.y<(d.y+d.h)*56+35)).filter((_,i)=>i%3===0).map(d=>d.id);}
    event(room,'sabotage',`¡${SABOTAGES[kind].label}! Reparad los paneles de Dirección y Profesores.`,now);
  }
  else if(type==='beginRepair'){
    requireGame(room,p,now);assert(room.sabotage,'No hay un sabotaje activo.');const s=REPAIRS.find(s=>s.id===data.id);assert(near(room,p,s),'Acércate al panel en la planta indicada.');assert(!room.sabotage.fixed.includes(s.id),'Este panel ya está reparado.');
    const kind=SABOTAGES[room.sabotage.kind].repairKind;
    p.repair={id:s.id,sabotageId:room.sabotage.id,kind,challenge:challenge(kind),start:now};p.puzzle=null;p.input={x:0,y:0};extra.repair={...p.repair,label:s.label,minDuration:minDuration[kind]};
  }
  else if(type==='finishRepair'){
    requireGame(room,p,now);assert(room.sabotage&&p.repair,'No hay una reparación activa.');const repair=p.repair;
    assert(repair.id===data.id&&repair.sabotageId===room.sabotage.id,'Esta reparación ya no está activa.');assert(now-repair.start>=minDuration[repair.kind],'Completa la reparación con calma.');assert(now-repair.start<=120000,'La reparación ha caducado.');
    assert(near(room,p,REPAIRS.find(s=>s.id===data.id)),'Te has alejado del panel.');assert(solution(repair.kind,repair.challenge,data.solution),'La reparación no es correcta.');
    if(!room.sabotage.fixed.includes(data.id))room.sabotage.fixed.push(data.id);room.sabotage.confirmations[data.id]={by:p.id,time:now};p.repair=null;
    const confirmations=Object.values(room.sabotage.confirmations);
    if(room.sabotage.fixed.length===REPAIRS.length&&(room.sabotage.kind!=='emergency'||new Set(confirmations.map(c=>c.by)).size===2&&Math.max(...confirmations.map(c=>c.time))-Math.min(...confirmations.map(c=>c.time))<=8000)){
      room.sabotage=null;for(const q of room.players)q.repair=null;event(room,'repair','El colegio vuelve a funcionar correctamente.',now);
    }else if(room.sabotage.kind==='emergency'&&confirmations.length===2){room.sabotage.fixed=[];room.sabotage.confirmations={};extra.retryCoop=true;}
  }
  else if(type==='return'){assert(room.phase==='ended','La partida todavía no ha terminado.');assert(p.id===room.host,'El líder devolverá a todos a la sala de espera.',403);room.phase='lobby';room.players=active(room);room.bodies=[];room.chat=[];room.result=null;room.pendingFinish=null;room.meeting=null;room.teachers=[];room.ghostMessages=[];for(const q of room.players){q.role=null;q.alive=true;q.detainedUntil=0;q.tasks=[];q.puzzle=null;q.repair=null;}spawn(room,LOBBY,now);}
  else if(type==='leave'){p.removed=true;p.alive=false;p.puzzle=null;if(room.phase==='lobby')room.players=room.players.filter(q=>q!==p);if(room.host===p.id)room.host=active(room)[0]?.id||null;event(room,'leave',`${p.name} ha salido.`,now);checkWin(room,now);return {left:true};}
  else throw new GameError('Acción desconocida.');
  return {...extra,state:snapshot(room,p,now)};
}
export function snapshot(room,p,now){
  const roster=active(room).map(q=>({id:q.id,...appearanceOf(q),alive:q.alive,online:now-q.lastSeen<=RECONNECT_MS,isHost:q.id===room.host,hasVoted:!!room.meeting&&room.meeting.votes[q.id]!==undefined,...(room.phase==='ended'?{role:q.role,specialRole:q.specialRole||null}:p.role==='impostor'&&q.role==='impostor'?{role:q.role}:{})}));
  const vision=p.role==='impostor'?550:room.sabotage?.kind==='lights'?170:420,map=mapFor(p.floor,room.sabotage);
  // El margen permite que el sprite entre gradualmente en el borde visible.
  const spriteVisible=q=>distance(p,q)<=vision+85&&[[0,0],[-22,-38],[22,-38],[-22,-5],[22,-5]].some(([dx,dy])=>visionLineOfSight(map,p,{x:q.x+dx,y:q.y+dy}));
  const visible=q=>(room.phase==='meeting'||q.floor===p.floor)&&(q.id===p.id||!q.vent||q.transition?.kind==='vent-in')&&(room.phase!=='game'||!p.alive||q.id===p.id||(q.alive&&spriteVisible(q)));
  const tasks=active(room).filter(q=>q.role==='crew').flatMap(q=>q.tasks);
  const self={id:p.id,...appearanceOf(p),floor:p.floor??0,x:p.x,y:p.y,facing:p.facing,alive:p.alive,role:p.role,specialRole:p.specialRole||null,delegateUsed:!!p.delegateUsed,tasks:p.tasks,killReady:p.killReady,ventReady:p.ventReady||0,ventSince:p.ventSince||0,emergencies:p.emergencies,detainedUntil:p.detainedUntil||0,ghostEmojis:!p.alive?p.ghostEmojis:[],ghostReady:p.ghostReady||0,vision,motionSeq:p.motionSeq||0,vent:p.vent,transition:p.transition};
  const meeting=room.meeting?{id:room.meeting.id,caller:room.meeting.caller,reason:room.meeting.reason,body:room.meeting.body,stage:room.meeting.stage,discussionEnd:room.meeting.discussionEnd,voteEnd:room.meeting.voteEnd,result:room.meeting.result,resultUntil:room.meeting.resultUntil,myVote:room.meeting.votes[p.id]??null,votes:room.meeting.votes,delegateTarget:room.meeting.delegateTarget||null}:null;
  const sabotage=room.sabotage?{...room.sabotage,confirmations:Object.fromEntries(Object.entries(room.sabotage.confirmations||{}).map(([id,c])=>[id,{time:c.time}]))}:null;
  const actionFx=room.actionFx&&now<room.actionFx.until&&[room.actionFx.actor,room.actionFx.target].includes(p.id)?{...room.actionFx,attacker:appearanceOf(room.players.find(q=>q.id===room.actionFx.actor)),victim:appearanceOf(room.players.find(q=>q.id===room.actionFx.target))}:null;
  return {code:room.code,serverTime:now,phase:room.phase,host:room.host,config:room.config,gameNumber:room.gameNumber,revealUntil:room.revealUntil,me:self,roster,actionFx,teachers:room.phase==='game'?room.teachers.map(({id,name,floor,x,y,facing,input,chasing})=>({id,name,floor,x,y,facing,input,chasing:!!chasing})):[],ghostMessages:p.specialRole==='believer'&&p.alive?room.ghostMessages.slice(-12):[],believerPresent:!p.alive&&active(room).some(q=>q.specialRole==='believer'&&q.alive),
    players:active(room).filter(visible).filter(q=>!p.alive||q.alive||q.id===p.id).map(q=>({id:q.id,...appearanceOf(q),floor:q.floor,x:q.x,y:q.y,facing:q.facing,alive:q.alive,input:q.input,vent:q.vent,transition:q.transition})),
    bodies:room.bodies.filter(b=>b.floor===p.floor&&(!p.alive||(distance(p,b)<=vision+35&&visionLineOfSight(map,p,b)))),progress:{done:tasks.filter(t=>t.done).length,total:tasks.length},meeting,result:room.result,sabotage,sabotageReady:room.sabotageReady,chat:room.chat.filter(m=>!m.ghost||!p.alive),events:room.events.filter(e=>e.type!=='task'&&(e.type!=='death'||e.victim===p.id||p.specialRole==='plug')).map(e=>e.type==='death'&&p.specialRole!=='plug'?{...e,victimName:undefined,victimFloor:undefined}:e).slice(-12)};
}

// Plano escolar provisional inspirado en el esquema de dos plantas recibido.
// Habitaciones y corredores son rectángulos en casillas; las etiquetas solo se dibujan en el minimapa.
const T=56;
const room=(id,name,x,y,w,h,type='classroom',color='#d6b878',door='bottom')=>({id,name,x,y,w,h,type,color,door});
const floors=[
 {floor:0,name:'Colegio · Planta 0',width:70,height:50,rooms:[
  {...room('red','Salón rojo',2,3,13,20,'hall','#cf7884','right'),extraDoors:[{side:'bottom',x:4}]},
  room('office1','Despacho de Vaquero',16,3,8,8,'office'),
  room('office2','Despacho',24,3,8,8,'office'),
  room('vaquero','Despacho',32,3,8,8,'office','#9baacf'),
  room('office3','Despacho',40,3,13,8,'office'),
  room('office4','Despacho',16,15,8,8,'office','#caa880','top'),
  room('office5','Despacho',24,15,8,8,'office','#caa880','top'),
  room('office6','Despacho',39,15,7,8,'office','#caa880','top'),
  room('meeting','Sala de reuniones',46,15,7,8,'meeting','#a4bca4','top'),
  {...room('reception','Recepción',53,3,15,20,'reception','#78b8b1','left'),extraDoors:[{side:'bottom',x:60}]},
  room('stairs-west','Escaleras',38,28,8,6,'stairs','#a9b5c6','left'),
  room('direction','Dirección',38,35,8,5,'office','#c9a776','left'),
  room('extra','Clase',38,41,8,3,'classroom','#c8b47e','left'),
  room('bath0','Baño',38,45,8,4,'bath','#89bdc9','left')
 ],corridors:[{x:15,y:11,w:38,h:4},{x:2,y:23,w:66,h:4},{x:32,y:27,w:6,h:23}]},
 {floor:1,name:'Colegio · Planta 1',width:70,height:46,rooms:[
  room('eso-a','4.º ESO A',2,3,8,10),room('eso-b','4.º ESO B',10,3,8,10),
  room('first-a','1.º Bach. A',18,3,8,10),room('first-b','1.º Bach. B',26,3,8,10),
  room('second-b','2.º Bach. B',34,3,8,10),room('second-c','2.º Bach. C',42,3,8,10),
  room('second-d','2.º Bach. D',50,3,8,10),room('optional','Optativas',58,3,10,10),
  room('german','Alemán',3,18,9,9,'classroom','#bbacd3','top'),
  room('second-a','2.º Bach. A',13,18,9,9,'classroom','#d6b878','top'),
  room('eso-c','4.º ESO C',23,18,8,9,'classroom','#d6b878','top'),
  room('staff','Sala de profesores',38,18,10,9,'office','#97aecc','top'),
  room('first-c','1.º Bach. C',49,18,9,9,'classroom','#d6b878','top'),
  room('expelled','Sala de expulsados',59,18,9,9,'classroom','#c69b99','top'),
  room('stairs-west','Escaleras',38,28,8,6,'stairs','#a9b5c6','left'),
  room('eso-d','4.º ESO D',38,35,8,5,'classroom','#d6b878','left'),
  room('bath1','Baño',38,41,8,4,'bath','#89bdc9','left')
 ],corridors:[{x:2,y:13,w:66,h:5},{x:32,y:18,w:6,h:27}]}
];
for(const map of floors){
 map.doors=[];map.props=[];map.decor=[];
 for(const r of map.rooms){
  // Puertas de tres casillas: el personaje cabe holgadamente incluso junto al marco.
  if(r.door==='left'||r.door==='right')map.doors.push({id:`${map.floor}-${r.id}`,floor:map.floor,x:r.door==='left'?r.x:r.x+r.w-1,y:(r.id==='reception'||r.id==='red')?11:r.y+Math.max(0,Math.floor((r.h-3)/2)),w:1,h:Math.min(3,r.h),room:r.id,side:r.door});
  else map.doors.push({id:`${map.floor}-${r.id}`,floor:map.floor,x:r.x+Math.floor((r.w-3)/2),y:r.door==='top'?r.y:r.y+r.h-1,w:3,h:1,room:r.id,side:r.door});
  for(const extra of r.extraDoors||[])map.doors.push({id:`${map.floor}-${r.id}-${extra.y}`,floor:map.floor,x:extra.side==='bottom'?extra.x:extra.side==='right'?r.x+r.w-1:r.x,y:extra.side==='bottom'?r.y+r.h-1:extra.y,w:extra.side==='bottom'?3:1,h:extra.side==='bottom'?1:3,room:r.id,side:extra.side});
  const add=(x,y,w,h,kind)=>map.props.push({x,y,w,h,kind});
  if(r.type==='classroom'){
   // Pizarra pegada a la pared lateral, lejos del umbral (también en las aulas inferiores).
   add(r.door==='left'?r.x+r.w-.62:r.x+.22,r.y+.8,.4,Math.min(3,r.h-1.6),'side-board');
   // Pupitres agrupados sin cerrar la ruta entre entrada y fondo del aula.
   for(let y=r.y+2.1;y<r.y+r.h-3;y+=2.6)for(let x=r.x+(r.door==='left'?3.4:1.4);x<r.x+r.w-1.6;x+=2.9)add(x,y,1.25,.85,'desk');
   map.decor.push({kind:'window',x:r.x+.4,y:r.y+2.2,w:.3,h:2});
  }else if(r.type==='office'||r.type==='meeting'){
   add(r.x+1,r.y+1,Math.min(2.2,r.w-2),.8,'office-desk');
   add(r.x+r.w-1.3,r.y+1.5,.5,1.5,'shelf');
   if(r.type==='meeting')add(r.x+3,r.y+3,Math.max(2,r.w-6),1.2,'meeting-table');
  }else if(r.type==='hall'){
   // Escenario en el oeste y butacas orientadas hacia él. Pasillo libre
   // junto al escenario y salida inferior accesible.
   add(r.x+.6,r.y+1,1.45,r.h-2,'stage');
   for(let y=r.y+2.5;y<r.y+r.h-3;y+=2.2)for(let x=r.x+4.8;x<r.x+r.w-1.8;x+=2.25)add(x,y,.65,.65,'red-chair-left');
  }else if(r.type==='bath'){
   add(r.x+r.w-1.5,r.y+.5,.7,1,'toilet');
  }else if(r.type==='reception'){
   add(r.x+1,r.y+1,4,.9,'reception-desk');add(r.x+8,r.y+4,2,.7,'bench');
  }else if(r.type==='stairs')map.decor.push({kind:'stairs',x:r.x+1,y:r.y+1,w:r.w-2,h:r.h-2});
  if(r.type==='classroom')map.decor.push({kind:'notice',x:r.x+r.w-1.1,y:r.y+.3,w:.6,h:.5});
  map.decor.push({kind:'room-detail',x:r.x+.5,y:r.y+.45,w:r.w-1,h:r.h-1,type:r.type,id:r.id});
 }
 for(const corridor of map.corridors){
  const horizontal=corridor.w>corridor.h;
  for(let n=3;n<(horizontal?corridor.w:corridor.h)-2;n+=4)map.decor.push({kind:'hall-detail',x:horizontal?corridor.x+n:corridor.x+.25,y:horizontal?corridor.y+.2:corridor.y+n,w:horizontal?1.4:1.3,h:horizontal?corridor.h-.4:1.2});
 }
 // Tabiques reales, con el hueco de la puerta. Luz y jugadores comparten el
 // mismo contorno; las mesas permanecen colisionables pero no tapan la luz.
 for(const r of map.rooms){
  const doors=map.doors.filter(d=>d.room===r.id),wall=(x,y,w,h)=>{if(w>0&&h>0)map.props.push({x,y,w,h,kind:'wall'});};
  for(const side of ['top','bottom']){
   const yy=side==='top'?r.y:r.y+r.h,hi=r.x+r.w;let at=r.x;
   for(const d of doors.filter(d=>d.side===side).sort((a,b)=>a.x-b.x)){wall(at,yy-.08,d.x-at,.16);at=d.x+d.w;}wall(at,yy-.08,hi-at,.16);
  }
  for(const side of ['left','right']){
   const xx=side==='left'?r.x:r.x+r.w,hi=r.y+r.h;let at=r.y;
   for(const d of doors.filter(d=>d.side===side).sort((a,b)=>a.y-b.y)){wall(xx-.08,at,.16,d.y-at);at=d.y+d.h;}wall(xx-.08,at,.16,hi-at);
  }
 }
 map.visionWalls=map.props.filter(p=>p.kind==='wall');
 map.stairs=map.rooms.filter(r=>r.type==='stairs').map(r=>({id:r.id,floor:map.floor,x:(r.x+1.1)*T,y:(r.y+r.h/2)*T,area:{x:r.x,y:r.y,w:r.w,h:r.h},label:map.floor?'Bajar a planta 0':'Subir a planta 1'}));
 map.stations=[];map.repair=[];map.vents=[];
}
const station=(floor,id,roomId,label,kind,tx,ty,extra={})=>{const s={floor,id,room:roomId,label,kind,x:tx*T,y:ty*T,...extra};floors[floor].stations.push(s);return s;};
station(1,'chalk','eso-a','Limpiar la pizarra','chalk',5.5,5.2);
station(1,'desks','eso-b','Ordenar pupitres y sillas','desks',14,11.5);
station(1,'projector','first-a','Conectar el proyector','wires',22,5.2);
station(1,'computer','first-b','Reiniciar el ordenador','computer',30,5.2);
station(0,'documents','office1','Llevar documentos a Dirección','documents',20,6,{delivery:{floor:0,room:'direction',x:42*T,y:37*T,label:'Entregar documentos en Dirección',kind:'delivery'}});
station(1,'book','staff','Buscar un libro','book',43.5,25.5);
station(1,'exams','second-a','Clasificar exámenes','exams',18,25.5);
station(1,'supplies','optional','Ordenar material escolar','supplies',63,11.5);
station(0,'bell','reception','Arreglar el timbre','bell',64,11);
station(1,'german','german','Actividad de alemán','german',8,25.5);
station(0,'papers','red','Recoger papeles','papers',10,12);
station(1,'lights','second-b','Reparar las luces','lights',38,5.2);
station(0,'code','vaquero','Introducir un código','code',36,6);
station(0,'folders','office2','Organizar carpetas','folders',28,6);
station(0,'bath','bath0','Comprobar los baños','bath',41,47);
station(0,'archives','office3','Archivar expedientes','folders',49,6);
station(0,'minutes','meeting','Clasificar actas','exams',50,21);
station(0,'attendance','reception','Registrar asistencia','code',62,18);
station(0,'curtains','red','Recoger el escenario','papers',9,20);
station(0,'direction-files','direction','Ordenar la documentación','folders',42,37);
station(1,'library-check','optional','Revisar la biblioteca','book',64,6);
station(1,'lab-lights','second-c','Calibrar luces del laboratorio','lights',46,6);
station(1,'projector-two','first-c','Conectar proyector del aula','wires',53,24);
station(1,'teacher-computer','staff','Reiniciar ordenador docente','computer',42,21);
station(1,'bath-up','bath1','Revisar los lavabos','bath',42,43);
floors[0].spawn={floor:0,x:59*T,y:12.5*T};floors[1].spawn={floor:1,x:34.5*T,y:15.5*T};
floors[0].emergency={floor:0,x:61*T,y:9.5*T};
// El botón de emergencia está sobre una mesa central transitable a su alrededor.
floors[0].props.push({x:60.2,y:8.8,w:1.6,h:1.4,kind:'meeting-button-table'});
for(const [floor,x,y,roomId] of [[0,44,37.5,'direction'],[1,46,25.5,'staff']])floors[floor].repair.push({id:`repair-${floor?'b':'a'}`,floor,x:x*T,y:y*T,label:`Panel ${floor?'B · Profesores · P1':'A · Dirección · P0'}`,room:roomId});
const vents=[
 {id:'red',floor:0,x:14*T,y:8*T,label:'Salón rojo',links:['vaquero','eso-c','office5','main']},
 {id:'vaquero',floor:0,x:38.5*T,y:10.5*T,label:'Vaquero',links:['red','staff']},
 {id:'direction',floor:0,x:44*T,y:38*T,label:'Dirección',links:['staff','second-d','lab']},
 {id:'staff',floor:1,x:46*T,y:23.5*T,label:'Profesores',links:['direction','vaquero','main']},
 {id:'eso-c',floor:1,x:29*T,y:24.5*T,label:'4.º ESO C',links:['red','second-d']},
 {id:'second-d',floor:1,x:56*T,y:10.5*T,label:'2.º Bach. D',links:['direction','eso-c']},
 {id:'reception',floor:0,x:66*T,y:10.5*T,label:'Recepción',links:['expelled','direction','office5']},
 {id:'office5',floor:0,x:29*T,y:20*T,label:'Despachos',links:['red','library','reception']},
 {id:'library',floor:1,x:64*T,y:8*T,label:'Biblioteca',links:['office5','expelled']},
 {id:'main',floor:0,x:20*T,y:25.5*T,label:'Pasillo principal',links:['staff','lab','red']},
 {id:'lab',floor:1,x:46*T,y:10*T,label:'Laboratorio',links:['main','direction']},
 {id:'expelled',floor:1,x:66*T,y:24*T,label:'Expulsados',links:['reception','second-d','library']}
];
for(const v of vents)floors[v.floor].vents.push(v);
export const FLOORS=floors;
export const STATIONS=floors.flatMap(m=>m.stations);
export const REPAIRS=floors.flatMap(m=>m.repair);
export const VENTS=vents;
export const DOORS=floors.flatMap(m=>m.doors);
export const SABOTAGES={
 lights:{label:'Apagar luces',description:'La visión de los tripulantes se reduce. Reorienta los circuitos de ambos paneles.',repairKind:'lights'},
 doors:{label:'Bloquear puertas',description:'Algunas aulas se cierran durante 18 s. Los paneles hidráulicos pueden abrirlas antes.',repairKind:'bath'},
 electrical:{label:'Sistema eléctrico',description:'Proyectores, luces y ordenadores quedan inutilizados. Restablece los cables en ambos paneles.',repairKind:'wires'},
 bell:{label:'Avería del timbre',description:'La alarma suena y no se puede consultar el plano. Repite las notas en ambos paneles.',repairKind:'bell'},
 computers:{label:'Desactivar ordenadores',description:'Las tareas de ordenador y código quedan bloqueadas. Reconfigura ambos paneles.',repairKind:'computer'},
 emergency:{label:'Emergencia cooperativa',description:'Dos personas deben confirmar paneles distintos con menos de 8 s de diferencia.',repairKind:'code'}
};
export const SCHOOL_LOBBY={floor:0,name:'Estar en clase',width:20,height:16,rooms:[room('lobby','Estar en clase',1,1,18,14)],corridors:[],props:[
 {x:3,y:2,w:12,h:.7,kind:'blackboard'},
 ...[5,9].flatMap(y=>[3,7,11,15].map(x=>({x,y,w:1.7,h:1.1,kind:'desk'}))),
 {x:17.5,y:2,w:1,h:2,kind:'shelf'}],decor:[{kind:'window',x:1.5,y:3,w:.3,h:3},{kind:'window',x:1.5,y:9,w:.3,h:3}],spawn:{floor:0,x:10*T,y:7.3*T},stations:[],repair:[],stairs:[],vents:[],doors:[]};
export function taskStation(t){const s=STATIONS.find(s=>s.id===t.id);return s&&t.stage===1&&s.delivery?{...s,...s.delivery}:s;}
export function mapFor(floor=0,sabotage=null){const base=FLOORS[floor===1?1:0];if(sabotage?.kind!=='doors')return base;const closed=new Set(sabotage.closed||[]),doors=base.doors.filter(d=>closed.has(d.id)).map(d=>({...d,kind:'closed-door'}));return {...base,props:[...base.props,...doors],visionWalls:[...base.visionWalls,...doors]};}
export function appearanceOf(p){return {name:p.name,color:p.color,hat:p.hat,skin:p.skin,outfitColor:p.outfitColor??p.color,trimColor:p.trimColor??2,pants:p.pants||0,glasses:p.glasses||0,bag:p.bag||0,accessory:p.accessory||0};}

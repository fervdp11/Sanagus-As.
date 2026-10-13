import {createRoom,joinRoom,command,snapshot,GameError,roomCode} from './engine.js';
export const MAX_BODY=8192;
export async function api(store,path,body,now=Date.now(),ip='local') {
  try {
    if(path==='/api/health')return {status:200,body:{ok:true,game:'Sanagus As',version:'2.6.0',transport:'authoritative-http'}};
    if(path==='/api/rooms')return {status:200,body:{rooms:await store.listOpen(now)}};
    if(!body||typeof body!=='object'||Array.isArray(body))throw new GameError('Mensaje JSON no válido.');
    if(body.data!==undefined&&(!body.data||typeof body.data!=='object'||Array.isArray(body.data)))throw new GameError('Datos de acción no válidos.');
    if(path==='/api/create'){await store.limit(ip,now);const {room,player}=createRoom(body.profile,now);let saved=false;for(let i=0;i<8&&!saved;i++){if(i)room.code=roomCode();saved=await store.create(room);}if(!saved)throw new GameError('No se ha podido crear la sala. Vuelve a intentarlo.',503);return {status:200,body:{session:{code:room.code,token:player.token},state:snapshot(room,player,now)}};}
    if(!['/api/join','/api/room'].includes(path))throw new GameError('Ruta no encontrada.',404);
    if(path==='/api/join')await store.limit(ip,now);
    const code=String(body.code||'').toUpperCase().replace(/\s/g,'');if(!/^[A-Z2-9]{6}$/.test(code))throw new GameError('El código debe tener 6 letras o números.');
    const result=await store.transact(code,room=>{if(path==='/api/join'){const p=joinRoom(room,body.profile,now);return {session:{code:room.code,token:p.token},state:snapshot(room,p,now)};}return command(room,body.token,body.type,body.data||{},now);});
    return {status:200,body:result};
  } catch(e){if(e instanceof GameError)return {status:e.status,body:{error:e.message}};console.error('Sanagus API:',e);return {status:503,body:{error:'El servidor está ocupado. Reintentando conexión…'}};}
}

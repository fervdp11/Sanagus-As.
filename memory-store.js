import {GameError} from '../game/engine.js';
export class MemoryStore {
  constructor(){this.rooms=new Map();this.rates=new Map();}
  async create(room){if(this.rooms.size>200){for(const [c,r] of this.rooms)if(Date.now()-r.updated>3600000||!r.players.some(p=>!p.removed))this.rooms.delete(c);}if(this.rooms.size>=200)throw new GameError('Servidor lleno. Inténtalo más tarde.',503);if(this.rooms.has(room.code))return false;this.rooms.set(room.code,structuredClone(room));return true;}
  async transact(code,fn){const original=this.rooms.get(code);if(!original||Date.now()-original.updated>86400000)throw new GameError('No existe esa sala. Comprueba el código.',404);const room=structuredClone(original),result=fn(room);room.version++;this.rooms.set(code,room);return result;}
  async listOpen(now){return [...this.rooms.values()].filter(r=>r.contentVersion===4&&r.phase==='lobby'&&r.players.length<10&&r.players.some(p=>!p.removed&&now-p.lastSeen<=6000)).sort((a,b)=>b.updated-a.updated).slice(0,24).map(r=>({code:r.code,host:r.players.find(p=>p.id===r.host)?.name||'Tripulación',players:r.players.filter(p=>!p.removed).length,maxPlayers:10,impostors:r.config.impostors}));}
  async limit(ip,now){let r=this.rates.get(ip);if(!r||now-r.start>600000){r={start:now,n:0};this.rates.set(ip,r);}if(++r.n>50)throw new GameError('Demasiadas entradas. Espera unos minutos.',429);if(this.rates.size>5000)for(const [k,v] of this.rates)if(now-v.start>600000)this.rates.delete(k);}
}

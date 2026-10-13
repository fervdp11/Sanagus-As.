// Servidor local/producción: cero dependencias externas. Node 22 o superior.
import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {api,MAX_BODY} from '../game/api.js';
import {MemoryStore} from './memory-store.js';
const root=fileURLToPath(new URL('../public/',import.meta.url));
export function makeServer(store=new MemoryStore()){
  return http.createServer(async(req,res)=>{
    const pathname=new URL(req.url,'http://localhost').pathname;
    const headers={'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','Cache-Control':'no-store'};
    if(pathname.startsWith('/api/')){
      let originOK=true;try{if(req.headers.origin)originOK=new URL(req.headers.origin).host===req.headers.host;}catch{originOK=false;}
      if(!originOK){res.writeHead(403,headers);res.end(JSON.stringify({error:'Origen no autorizado.'}));return;}
      if(req.method!=='POST'&&!(req.method==='GET'&&['/api/health','/api/rooms'].includes(pathname))){res.writeHead(405,headers);res.end();return;}
      let chunks=[],size=0;try {for await(const chunk of req){size+=chunk.length;if(size>MAX_BODY){res.writeHead(413,headers);res.end(JSON.stringify({error:'Mensaje demasiado grande.'}));return;}chunks.push(chunk);}const body=size?JSON.parse(Buffer.concat(chunks).toString()):{};const r=await api(store,pathname,body,Date.now(),req.socket.remoteAddress);res.writeHead(r.status,{...headers,'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(r.body));}catch{res.writeHead(400,headers);res.end(JSON.stringify({error:'Mensaje JSON no válido.'}));}return;
    }
    if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405,headers);res.end();return;}
    const route=pathname==='/'?'/index.html':pathname;const resolved=path.resolve(root,'.'+route);
    if(!resolved.startsWith(root)||route.includes('..')){res.writeHead(403,headers);res.end();return;}
    try{const bytes=await readFile(resolved);const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.json':'application/json'}[path.extname(resolved)]||'application/octet-stream';res.writeHead(200,{...headers,'Content-Type':mime+'; charset=utf-8'});res.end(req.method==='HEAD'?undefined:bytes);}catch{res.writeHead(404,headers);res.end('No encontrado');}
  });
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const port=Number(process.env.PORT)||3000;const server=makeServer();server.listen(port,'0.0.0.0',()=>console.log(`Sanagus As · http://localhost:${port}\nEn tu red: http://IP-DE-TU-PC:${port}\nServidor activo. Ctrl+C para cerrar.`));}

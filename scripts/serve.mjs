import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname,sep} from 'node:path';
const root=resolve(import.meta.dirname,'..');
const port=Number(process.env.PORT||4173);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json','.json':'application/json'};
const publicFiles=new Set(['index.html','app.js','core.js','styles.css','sw.js','manifest.webmanifest']);
http.createServer(async(req,res)=>{
  try{
    let path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    // Also serve a project subpath for testing GitHub Pages compatibility.
    if(path==='/SoGhiCa'){res.writeHead(302,{Location:'/SoGhiCa/'});res.end();return;}
    path=path.replace(/^\/SoGhiCa\//,'/');
    if(path.endsWith('/'))path+='index.html';
    const relative=path.replace(/^\//,'');
    if(!publicFiles.has(relative)&&!/^assets\/[a-z0-9-]+\.(png|svg)$/.test(relative)){res.writeHead(404);res.end('Not found');return;}
    const file=resolve(root,relative);
    if(!file.startsWith(root+sep)||(await stat(file)).isDirectory())throw new Error('Not found');
    const body=await readFile(file);
    res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(body);
  }catch{res.writeHead(404);res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`Sổ Ghi Ca: http://localhost:${port}/SoGhiCa/`));

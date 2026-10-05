import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
const root=new URL('../',import.meta.url);
const html=await readFile(new URL('index.html',root),'utf8');
test('every local HTML asset exists and form labels point to unique controls',async()=>{
  const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length,'Duplicate element ids');
  for(const match of html.matchAll(/\sfor="([^"]+)"/g))assert.ok(ids.includes(match[1]),`Missing label target: ${match[1]}`);
  for(const match of html.matchAll(/(?:href|src)="\.\/([^"#]+)"/g))assert.ok((await readFile(new URL(match[1],root))).length,`Empty asset: ${match[1]}`);
  for(const match of html.matchAll(/href="#(i-[^"]+)"/g))assert.ok(ids.includes(match[1]),`Missing icon symbol: ${match[1]}`);
  assert.ok(html.includes('viewport-fit=cover'));assert.ok(html.includes('apple-touch-icon'));assert.ok(!html.includes('user-scalable=no'));
});
test('manifest is project-path portable and PNG icons have declared dimensions',async()=>{
  const manifest=JSON.parse(await readFile(new URL('manifest.webmanifest',root),'utf8'));
  assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');assert.equal(manifest.display,'standalone');assert.equal(manifest.id,undefined);
  for(const icon of manifest.icons){const bytes=await readFile(new URL(icon.src,root));assert.equal(bytes.subarray(1,4).toString(),'PNG');assert.equal(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`,icon.sizes);}
  const apple=await readFile(new URL('assets/apple-touch-icon.png',root));assert.equal(apple.readUInt32BE(16),180);
});
async function workerHarness(){
  const scope='https://example.test/SoGhiCa/';const handlers={};const cachesMap=new Map();const requested=[];let claimed=false;let skipped=false;
  const key=request=>typeof request==='string'?request:request instanceof URL?request.href:request.url;
  const fetchLocal=async request=>{const url=new URL(key(request));requested.push(url.href);assert.ok(url.href.startsWith(scope));const path=url.pathname.slice('/SoGhiCa/'.length)||'index.html';return new Response(await readFile(new URL(path,root)));};
  const caches={async keys(){return [...cachesMap.keys()];},async delete(name){return cachesMap.delete(name);},async open(name){if(!cachesMap.has(name))cachesMap.set(name,new Map());const files=cachesMap.get(name);return {async addAll(requests){const responses=await Promise.all(requests.map(fetchLocal));requests.forEach((r,i)=>files.set(key(r),responses[i]));},async match(request){return files.get(key(request))?.clone();}};}};
  const self={registration:{scope},location:new URL(scope+'sw.js'),clients:{async claim(){claimed=true;}},skipWaiting(){skipped=true;},addEventListener(name,handler){handlers[name]=handler;}};
  runInNewContext(await readFile(new URL('sw.js',root),'utf8'),{self,caches,URL,Request,fetch:fetchLocal,Set});
  return {scope,handlers,caches,cachesMap,requested,get claimed(){return claimed;},get skipped(){return skipped;}};
}
test('service worker installs all offline assets and deletes only its own old caches',async()=>{
  const h=await workerHarness();await h.caches.open(`soghica-${h.scope}-v0`);await h.caches.open('other-app-cache');await h.caches.open('soghica-https://example.test/Other/-v1');
  let installing;h.handlers.install({waitUntil(p){installing=p;}});await installing;assert.equal(h.requested.length,11);
  let activating;h.handlers.activate({waitUntil(p){activating=p;}});await activating;
  assert.equal(h.claimed,true);assert.equal(h.skipped,false);const names=await h.caches.keys();assert.ok(!names.includes(`soghica-${h.scope}-v0`));assert.ok(names.includes('other-app-cache'));assert.ok(names.includes('soghica-https://example.test/Other/-v1'));
  h.handlers.message({data:{type:'SKIP_WAITING'}});assert.equal(h.skipped,true);
});
test('offline navigation and scripts are served from cache with no extra network access',async()=>{
  const h=await workerHarness();let installing;h.handlers.install({waitUntil(p){installing=p;}});await installing;const fetches=h.requested.length;
  let response;h.handlers.fetch({request:{method:'GET',mode:'navigate',url:h.scope+'?source=home'},respondWith(p){response=p;}});assert.ok((await (await response).text()).includes('Sổ Ghi Ca'));
  h.handlers.fetch({request:new Request(h.scope+'app.js'),respondWith(p){response=p;}});assert.ok((await (await response).text()).includes('validateShift'));assert.equal(h.requested.length,fetches);
  let intercepted=false;h.handlers.fetch({request:new Request('https://example.test/Other/'),respondWith(){intercepted=true;}});assert.equal(intercepted,false);
});

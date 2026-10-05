const CACHE_PREFIX = `soghica-${self.registration.scope}-`;
const CACHE_NAME = `${CACHE_PREFIX}v2`;
const FILES = ['./','./index.html','./styles.css','./app.js','./core.js','./manifest.webmanifest','./assets/icon.svg','./assets/icon-192.png','./assets/icon-512.png','./assets/icon-maskable.png','./assets/apple-touch-icon.png'];
const APP_URLS = new Set(FILES.map(path=>new URL(path,self.registration.scope).href));
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(FILES.map(path=>new Request(new URL(path,self.registration.scope),{cache:'reload'})))));
});
self.addEventListener('activate',event=>{
  event.waitUntil((async()=>{for(const name of await caches.keys())if(name.startsWith(CACHE_PREFIX)&&name!==CACHE_NAME)await caches.delete(name);await self.clients.claim();})());
});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;
  if(event.request.mode==='navigate'){
    event.respondWith(caches.open(CACHE_NAME).then(cache=>cache.match(new URL('./index.html',self.registration.scope))).then(response=>response||fetch(event.request)));
  }else if(APP_URLS.has(url.href)){
    event.respondWith(caches.open(CACHE_NAME).then(cache=>cache.match(event.request)).then(response=>response||fetch(event.request)));
  }
});

const CACHE_PREFIX = `soghica-${self.registration.scope}-`;
const CACHE_NAME = `${CACHE_PREFIX}v10`;
const FILES = ['./','./index.html','./styles.css?v=10','./app.js?v=10','./core.js?v=10','./manifest.webmanifest','./assets/icon.svg','./assets/icon-192.png','./assets/icon-512.png','./assets/icon-maskable.png','./assets/apple-touch-icon.png'];
const APP_URLS = new Set(FILES.map(path=>new URL(path,self.registration.scope).href));
self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(FILES.map(path=>new Request(new URL(path,self.registration.scope),{cache:'reload'})))).then(()=>{
    const host=new URL(self.registration.scope).hostname;
    if(host==='localhost'||host==='127.0.0.1')return self.skipWaiting();
  }));
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
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE_NAME);
      try{
        const response=await fetch(event.request);
        if(response.ok)await cache.put(new URL('./index.html',self.registration.scope),response.clone());
        return response;
      }catch{return cache.match(new URL('./index.html',self.registration.scope));}
    })());
  }else if(APP_URLS.has(url.href)){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE_NAME);
      try{
        const response=await fetch(event.request);
        if(response.ok)await cache.put(event.request,response.clone());
        return response;
      }catch{return cache.match(event.request);}
    })());
  }
});

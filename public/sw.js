const CACHE_NAME="zxh-xurvyna-shell-v1";
const APP_SHELL=["/","/manifest.json","/favicon.jpg","/assets/xurvyna-app-icon-192.jpg","/assets/xurvyna-app-icon-512.jpg"];
self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET"||new URL(event.request.url).origin!==self.location.origin)return;
  if(event.request.mode==="navigate"){
    event.respondWith(fetch(event.request).catch(()=>caches.match("/")));
  }
});
const CACHE_NAME = 'gold-monitor-v2';
const CACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './assets/chart.umd.min.js',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/apple-touch-icon.png',
  './assets/favicon-32.png'
];

// 安装：预缓存核心文件
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CACHE_URLS))
  );
  self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 请求拦截：HTML 网络优先（确保更新及时），静态资源缓存优先
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // 外部 API 请求不缓存（实时行情）
  if (url.origin !== location.origin) return;
  const isHTML = e.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/';
  if(isHTML){
    // 网络优先，失败回退缓存
    e.respondWith(
      fetch(e.request).then(resp => {
        if(resp && resp.status === 200){
          const respClone = resp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, respClone));
        }
        return resp;
      }).catch(() => caches.match(e.request))
    );
  }else{
    // 静态资源：缓存优先，后台更新
    e.respondWith(
      caches.match(e.request).then(cached => {
        const fetchPromise = fetch(e.request).then(resp => {
          if(resp && resp.status === 200){
            const respClone = resp.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(e.request, respClone));
          }
          return resp;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
  }
});

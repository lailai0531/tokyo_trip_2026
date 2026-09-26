const CACHE_NAME = 'tokyo-trip-v1';
// 填入所有需要離線讀取的檔案路徑
const urlsToCache = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/localforage/1.10.0/localforage.min.js'
];

// 1. 安裝階段：將指定的檔案存入手機快取空間
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// 2. 攔截請求階段：無網路時從快取讀取資料
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // 如果在快取中找到對應的檔案，就回傳快取；否則透過網路抓取
        return response || fetch(event.request);
      })
  );
});
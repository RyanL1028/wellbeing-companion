/**
 * Wellbeing-Companion — Service Worker
 * Provides offline support via cache-first strategy.
 * After first visit, the app works without internet.
 */
const CACHE_NAME = 'wellness-v2';

// Assets to cache on install (all HTML pages + static resources)
const PRE_CACHE = [
    '/',
    '/mental-health',
    '/physical-health',
    '/nutrition',
    '/study-life',
    '/auth',
    '/static/style.css?v=3',
    '/static/storage.js',
    '/static/app.js',
    '/static/auth.js',
    '/static/firebase-config.js',
    '/static/manifest.json'
];

// Install event — pre-cache all core assets
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            console.log('[SW] Caching core assets');
            return cache.addAll(PRE_CACHE);
        })
    );
    // Activate immediately — don't wait for old worker to die
    self.skipWaiting();
});

// Activate event — clean up old caches
self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(names) {
            return Promise.all(
                names.filter(function(name) {
                    return name !== CACHE_NAME;
                }).map(function(name) {
                    console.log('[SW] Deleting old cache:', name);
                    return caches.delete(name);
                })
            );
        })
    );
    // Take control of all clients immediately
    self.clients.claim();
});

// Fetch event — cache-first strategy
self.addEventListener('fetch', function(event) {
    // Don't cache non-GET requests
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then(function(cached) {
            if (cached) {
                return cached;
            }
            // Not in cache — fetch from network and cache for next time
            return fetch(event.request).then(function(response) {
                // Only cache successful responses
                if (!response || response.status !== 200) {
                    return response;
                }
                var clone = response.clone();
                caches.open(CACHE_NAME).then(function(cache) {
                    cache.put(event.request, clone);
                });
                return response;
            }).catch(function() {
                // Network failed, no cache — return a simple offline page
                if (event.request.headers.get('accept').includes('text/html')) {
                    return new Response(
                        '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
                        '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
                        '<title>Offline — Wellbeing-Companion</title>' +
                        '<style>body{font-family:system-ui,sans-serif;display:flex;' +
                        'align-items:center;justify-content:center;height:100vh;' +
                        'margin:0;background:#f0f4f8;color:#333;text-align:center}' +
                        '.card{background:#fff;padding:2rem;border-radius:12px;' +
                        'box-shadow:0 2px 8px rgba(0,0,0,.1);max-width:320px}' +
                        'h1{color:#4CAF50;margin:0 0 .5rem}</style></head>' +
                        '<body><div class="card"><h1>📡</h1><h1>You\'re Offline</h1>' +
                        '<p>But you can still use the app! Any data you enter will be ' +
                        'saved and ready when you reconnect.</p></div></body></html>',
                        { headers: { 'Content-Type': 'text/html' } }
                    );
                }
            });
        })
    );
});

/**
 * Wellbeing-Companion — Service Worker
 * Offline support + smart reminders via notifications.
 */
const CACHE_NAME = 'wellness-v8';

const PRE_CACHE = [
    '/',
    '/mental-health',
    '/physical-health',
    '/nutrition',
    '/study-life',
    '/sleep',
    '/auth',
    '/static/style.css?v=5',
    '/static/storage.js',
    '/static/app.js',
    '/static/auth.js',
    '/static/firebase-config.js',
    '/static/manifest.json'
];

// ---- Reminders ----

let reminderInterval = null;
let lastSent = {};
let reminderConfig = {};

const NOTIFICATIONS = {
    water: { title: '💧 Drink Water!', body: 'Stay hydrated — grab a glass of water now.', icon: '/static/icons/icon-192.png', tag: 'r-water' },
    stretch: { title: '🤸 Stretch Break', body: 'You\'ve been sitting for a while. Take 2 minutes to stretch!', icon: '/static/icons/icon-192.png', tag: 'r-stretch' },
    bed: { title: '🌙 Time to Wind Down', body: 'Stop doomscrolling! Put your phone away and relax.', icon: '/static/icons/icon-192.png', tag: 'r-bed' },
    study: { title: '📚 Study Time', body: 'Ready to focus? Start a Pomodoro session!', icon: '/static/icons/icon-192.png', tag: 'r-study' }
};

function startReminders(config) {
    stopReminders();
    reminderConfig = config || {};
    lastSent = {};

    var hasAny = Object.values(reminderConfig).some(function(v) { return v; });
    if (!hasAny) return;

    // SW timer — runs even when PWA is backgrounded on iOS
    reminderInterval = setInterval(checkAndNotify, 15000); // every 15 seconds
}

function stopReminders() {
    if (reminderInterval) { clearInterval(reminderInterval); reminderInterval = null; }
}

let ticks = 0;

function checkAndNotify() {
    if (Notification.permission !== 'granted') return;
    ticks++;

    // Fire every 2 ticks (30s) for water/stretch, any time
    if (ticks % 2 === 0) {
        if (reminderConfig.water) notify('water');
        if (reminderConfig.stretch) notify('stretch');
    }

    // Bed: every 4 ticks (60s) after 9pm
    var hour = new Date().getHours();
    if (reminderConfig.bed && hour >= 21 && ticks % 4 === 0) {
        notify('bed');
    }
}

function notify(type) {
    var n = NOTIFICATIONS[type];
    if (!n) return;
    self.registration.showNotification(n.title, {
        body: n.body, icon: n.icon, tag: n.tag + '-' + Date.now(),
        badge: n.icon, vibrate: [200, 100, 200], requireInteraction: true
    });
}

// ---- Install ----
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open(CACHE_NAME).then(function(cache) {
            console.log('[SW] Caching core assets');
            return cache.addAll(PRE_CACHE);
        })
    );
    self.skipWaiting();
});

// ---- Activate ----
self.addEventListener('activate', function(event) {
    event.waitUntil(
        caches.keys().then(function(names) {
            return Promise.all(
                names.filter(function(name) { return name !== CACHE_NAME; })
                    .map(function(name) { return caches.delete(name); })
            );
        })
    );
    self.clients.claim();
});

// ---- Fetch ----
self.addEventListener('fetch', function(event) {
    if (event.request.method !== 'GET') return;
    event.respondWith(
        caches.match(event.request).then(function(cached) {
            if (cached) return cached;
            return fetch(event.request).then(function(response) {
                if (!response || response.status !== 200) return response;
                var clone = response.clone();
                caches.open(CACHE_NAME).then(function(cache) {
                    cache.put(event.request, clone);
                });
                return response;
            }).catch(function() {
                if (event.request.headers.get('accept').includes('text/html')) {
                    return new Response(
                        '<!DOCTYPE html><html><head><meta charset="UTF-8">' +
                        '<meta name="viewport" content="width=device-width,initial-scale=1.0">' +
                        '<title>Offline — Wellbeing-Companion</title>' +
                        '<style>body{font-family:system-ui,sans-serif;display:flex;' +
                        'align-items:center;justify-content:center;height:100vh;' +
                        'margin:0;background:#f0f4f8;color:#333;text-align:center}' +
                        '.card{background:#fff;padding:2rem;border-radius:12px;' +
                        'box-shadow:0 2px 8px rgba(0,0,0,.1);max-width:320px}' +
                        'h1{color:#4CAF50;margin:0 0 .5rem}</style></head>' +
                        '<body><div class="card"><h1>📡</h1><h1>You\'re Offline</h1>' +
                        '<p>You can still use the app! Data will sync when you reconnect.</p></div></body></html>',
                        { headers: { 'Content-Type': 'text/html' } }
                    );
                }
            });
        })
    );
});

// ---- Push ----
self.addEventListener('push', function(event) {
    if (event.data) {
        try { var data = event.data.json(); notify(data.type); } catch(e) {}
    }
});

// ---- Notification click ----
self.addEventListener('notificationclick', function(event) {
    event.notification.close();
    event.waitUntil(
        self.clients.matchAll({ type: 'window' }).then(function(clients) {
            if (clients.length > 0) {
                clients[0].focus();
            } else {
                self.clients.openWindow('/');
            }
        })
    );
});

// ---- Messages from page ----
self.addEventListener('message', function(event) {
    if (!event.data) return;
    if (event.data.action === 'start-reminders') {
        startReminders(event.data.config);
    } else if (event.data.action === 'stop-reminders') {
        stopReminders();
    } else if (event.data.action === 'test-notification') {
        notify(event.data.type || 'bed');
    }
});

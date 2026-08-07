const CACHE_NAME = "azury-admin-v2";

const APP_FILES = [
    "./",
    "./index.html",
    "./manifest.json",
    "./css/admin-dev.css",
    "./js/admin-dev.js",
    "./js/supabase-dev.js",
    "./icons/icon-192.png",
    "./icons/icon-512.png"
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then(cache => cache.addAll(APP_FILES))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches
            .keys()
            .then(keys =>
                Promise.all(
                    keys
                        .filter(key => key !== CACHE_NAME)
                        .map(key => caches.delete(key))
                )
            )
            .then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", event => {
    const request = event.request;
    const url = new URL(request.url);

    if (
        request.method !== "GET" ||
        url.origin !== self.location.origin
    ) {
        return;
    }

    event.respondWith(
        fetch(request)
            .then(response => {
                const copy = response.clone();

                caches
                    .open(CACHE_NAME)
                    .then(cache => cache.put(request, copy));

                return response;
            })
            .catch(() =>
                caches.match(request).then(cachedResponse => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }

                    if (request.mode === "navigate") {
                        return caches.match("./index.html");
                    }

                    return Response.error();
                })
            )
    );
});

self.addEventListener("push", event => {
    let payload = {};

    try {
        payload = event.data
            ? event.data.json()
            : {};
    } catch (error) {
        payload = {
            body: event.data
                ? event.data.text()
                : "Novo pedido recebido na Azury."
        };
    }

    const codigo =
        payload.codigo ||
        payload.orderCode ||
        "";

    const title =
        payload.title ||
        (codigo
            ? `🔔 Novo pedido ${codigo}`
            : "🔔 Novo pedido Azury");

    const body =
        payload.body ||
        "Um novo pedido acabou de chegar.";

    const orderId =
        payload.pedido_id ||
        payload.orderId ||
        null;

    const notificationUrl =
        payload.url ||
        "./index.html";

    const options = {
        body,
        icon: "./icons/icon-192.png",
        badge: "./icons/icon-192.png",

        tag: orderId
            ? `azury-pedido-${orderId}`
            : `azury-pedido-${Date.now()}`,

        renotify: true,

        requireInteraction: true,

        vibrate: [
            250,
            120,
            250,
            120,
            500
        ],

        data: {
            url: notificationUrl,
            pedido_id: orderId,
            codigo
        },

        actions: [
            {
                action: "abrir",
                title: "Ver pedido"
            }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(
            title,
            options
        )
    );
});

self.addEventListener("notificationclick", event => {
    event.notification.close();

    const targetUrl =
        new URL(
            event.notification.data?.url ||
            "./index.html",
            self.location.href
        ).href;

    event.waitUntil(
        clients
            .matchAll({
                type: "window",
                includeUncontrolled: true
            })
            .then(windowClients => {
                for (const client of windowClients) {
                    const clientUrl =
                        new URL(client.url);

                    if (
                        clientUrl.origin ===
                        self.location.origin
                    ) {
                        client.postMessage({
                            type: "AZURY_OPEN_ORDER",

                            pedido_id:
                                event.notification.data?.pedido_id ||
                                null,

                            codigo:
                                event.notification.data?.codigo ||
                                null
                        });

                        return client
                            .focus()
                            .then(() => {
                                if (
                                    "navigate" in client &&
                                    client.url !== targetUrl
                                ) {
                                    return client.navigate(
                                        targetUrl
                                    );
                                }

                                return client;
                            });
                    }
                }

                return clients.openWindow(
                    targetUrl
                );
            })
    );
});

self.addEventListener("message", event => {
    if (
        event.data?.type ===
        "SKIP_WAITING"
    ) {
        self.skipWaiting();
    }
});
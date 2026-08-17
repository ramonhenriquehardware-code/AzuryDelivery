const CACHE_NAME = "azury-pwa-v2";

const APP_SHELL = [
    "./",
    "./index.html",
    "./manifest.webmanifest",

    "../css/reset.css",
    "../css/variables.css",
    "../css/buttons.css",
    "../css/header.css",
    "../css/hero.css",
    "../css/cardapio.css",
    "../css/sobre.css",
    "../css/cta.css",
    "../css/footer.css",
    "../styles.css",

    "./js/supabase.js",
    "./js/sessao.js",
    "./js/cardapio-supabase.js",

    "../Imagens/favicon-azury.png"
];


self.addEventListener(
    "install",
    event => {
        event.waitUntil(
            caches
                .open(CACHE_NAME)
                .then(cache =>
                    cache.addAll(APP_SHELL)
                )
                .catch(error => {
                    console.warn(
                        "Azury PWA: alguns arquivos não puderam ser adicionados ao cache inicial.",
                        error
                    );
                })
        );

        self.skipWaiting();
    }
);


self.addEventListener(
    "activate",
    event => {
        event.waitUntil(
            caches
                .keys()
                .then(keys =>
                    Promise.all(
                        keys
                            .filter(
                                key =>
                                    key !== CACHE_NAME
                            )
                            .map(
                                key =>
                                    caches.delete(key)
                            )
                    )
                )
                .then(() =>
                    self.clients.claim()
                )
        );
    }
);


self.addEventListener(
    "fetch",
    event => {
        const request =
            event.request;

        if (
            request.method !== "GET"
        ) {
            return;
        }


        const url =
            new URL(
                request.url
            );


        if (
            url.origin !==
            self.location.origin
        ) {
            return;
        }


        if (
            request.mode ===
            "navigate"
        ) {
            event.respondWith(
                fetch(request)
                    .then(response => {
                        if (
                            response &&
                            response.ok
                        ) {
                            const copy =
                                response.clone();

                            caches
                                .open(CACHE_NAME)
                                .then(cache =>
                                    cache.put(
                                        request,
                                        copy
                                    )
                                );
                        }

                        return response;
                    })
                    .catch(() =>
                        caches.match(
                            "./index.html"
                        )
                    )
            );

            return;
        }


        event.respondWith(
            caches
                .match(request)
                .then(cached => {

                    const networkRequest =
                        fetch(request)
                            .then(response => {

                                if (
                                    response &&
                                    response.ok
                                ) {
                                    const copy =
                                        response.clone();

                                    caches
                                        .open(
                                            CACHE_NAME
                                        )
                                        .then(cache =>
                                            cache.put(
                                                request,
                                                copy
                                            )
                                        );
                                }

                                return response;
                            })
                            .catch(() =>
                                cached
                            );


                    return (
                        cached ||
                        networkRequest
                    );
                })
        );
    }
);
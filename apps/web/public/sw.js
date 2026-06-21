// Минимальный service worker — нужен, чтобы сайт считался устанавливаемым PWA.
// Кэширование не делаем (всегда свежий контент из сети); просто проксируем запросы.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {
  // passthrough: пусть браузер обрабатывает запросы как обычно
});

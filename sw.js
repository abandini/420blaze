/* 420Blazin Strain Finder service worker.
 * Scope: /strain-finder only (registered with {scope:"/strain-finder"}).
 * Goals: open instantly on a phone, work on bad dispensary Wi-Fi, never show
 * menu data older than a day without going back to the network first.
 *
 * Strategy
 *  - Page shell (/strain-finder, css, js, fonts, icons): stale-while-revalidate.
 *  - Feed JSON (/data/*.json): serve the cached copy if it is under FEED_MAX_AGE
 *    old and refresh it in the background, telling the page when fresh data
 *    landed so it can offer a reload. Older than that: network first, cached
 *    copy only as an offline fallback. The page shows the feed's own "updated"
 *    date, never a timestamp from this cache.
 *  - Analytics, fonts CDN, cross-origin: pass through untouched.
 * Bump VERSION whenever the shell changes so old caches are dropped.
 */
var VERSION = "sf-v1";
var SHELL_CACHE = VERSION + "-shell";
var FEED_CACHE = VERSION + "-feed";
var FEED_MAX_AGE = 24 * 60 * 60 * 1000; // 1 day
var NETWORK_TIMEOUT = 6000;

var SHELL_URLS = [
  "/strain-finder",
  "/css/style.css",
  "/js/script.js",
  "/js/tracking.js",
  "/favicon.svg",
  "/images/pwa/icon-192.png"
];

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(SHELL_CACHE).then(function (c) {
      // Add one by one so a single miss does not fail the install.
      return Promise.all(SHELL_URLS.map(function (u) {
        return c.add(new Request(u, { cache: "reload" })).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) {
        return k.indexOf("sf-") === 0 && k.indexOf(VERSION) !== 0;
      }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

function isFeed(url) {
  return url.origin === self.location.origin && /^\/data\/.+\.json$/.test(url.pathname);
}
function isShell(url, req) {
  if (url.origin !== self.location.origin) return false;
  if (req.mode === "navigate") return url.pathname === "/strain-finder" || url.pathname === "/strain-finder.html";
  return /^\/(css|js|images|favicon)/.test(url.pathname) && !/tracking|ingest/.test(url.pathname);
}
function cachedAt(res) {
  var d = res && res.headers.get("date");
  return d ? new Date(d).getTime() : 0;
}
function withTimeout(p, ms) {
  return new Promise(function (resolve, reject) {
    var t = setTimeout(function () { reject(new Error("timeout")); }, ms);
    p.then(function (v) { clearTimeout(t); resolve(v); }, function (err) { clearTimeout(t); reject(err); });
  });
}
function notifyClients(msg) {
  return self.clients.matchAll({ type: "window" }).then(function (cs) {
    cs.forEach(function (c) { c.postMessage(msg); });
  });
}

function handleFeed(req) {
  var url = new URL(req.url);
  return caches.open(FEED_CACHE).then(function (cache) {
    return cache.match(url.pathname).then(function (hit) {
      var fresh = hit && (Date.now() - cachedAt(hit)) < FEED_MAX_AGE;
      var fetchAndStore = fetch(new Request(url.pathname, { cache: "no-cache" })).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          // Stamp our own Date header so age checks work even if the CDN omits one.
          var h = new Headers(copy.headers); h.set("date", new Date().toUTCString());
          return copy.blob().then(function (b) {
            // Record the decoded body size: CDN responses are compressed and often
            // omit content-length, so this is the change detector.
            h.set("x-sf-size", String(b.size));
            var stamped = new Response(b, { status: 200, headers: h });
            return cache.put(url.pathname, stamped).then(function () { res.sfSize = b.size; return res; });
          });
        }
        return res;
      });
      if (fresh) {
        // Serve cached now; refresh in the background and tell the page if it changed.
        var prevSize = hit.headers.get("x-sf-size");
        fetchAndStore.then(function (res) {
          if (res && res.ok && prevSize && res.sfSize && String(res.sfSize) !== prevSize) {
            notifyClients({ type: "feed-updated", path: url.pathname });
          }
        }).catch(function () {});
        return hit;
      }
      return withTimeout(fetchAndStore, NETWORK_TIMEOUT).catch(function () {
        if (hit) { notifyClients({ type: "feed-offline", path: url.pathname }); return hit; }
        return new Response("", { status: 504, statusText: "offline" });
      });
    });
  });
}

function handleShell(req) {
  var key = req.mode === "navigate" ? "/strain-finder" : req;
  return caches.open(SHELL_CACHE).then(function (cache) {
    return cache.match(key).then(function (hit) {
      var net = fetch(req).then(function (res) {
        if (res && res.ok && res.type !== "opaque") cache.put(key, res.clone());
        return res;
      });
      if (hit) { net.catch(function () {}); return hit; }
      return net;
    });
  });
}

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (isFeed(url)) { e.respondWith(handleFeed(req)); return; }
  if (isShell(url, req)) { e.respondWith(handleShell(req)); return; }
  // everything else (PostHog ingest, Cloudflare beacon, fonts, CDN) passes through
});

self.addEventListener("message", function (e) {
  if (e.data && e.data.type === "skip-waiting") self.skipWaiting();
});

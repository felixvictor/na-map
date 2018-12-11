importScripts("workbox/precache-manifest.e5155c78790a6f2ccfba45930603166b.js", "workbox/workbox-v3.6.3/workbox-sw.js");
workbox.setConfig({modulePathPrefix: "workbox/workbox-v3.6.3"});
/* global
workbox: true */

if (workbox) {
    console.log("Yay! Workbox is loaded 🎉");
    workbox.skipWaiting();
    workbox.clientsClaim();
    workbox.precaching.precacheAndRoute(self.__precacheManifest);
} else {
    console.log("Boo! Workbox didn't load 😬");
}


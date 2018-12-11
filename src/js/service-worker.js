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

// analytics.js

window.dataLayer = window.dataLayer || [];

export function gtag() {
    window.dataLayer.push(arguments);
}

export default function naAnalytics() {
    gtag("js", new Date());
    gtag("config", "UA-109520372-1");
}

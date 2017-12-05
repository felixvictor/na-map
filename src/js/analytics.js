// analytics.js

export default function naAnalytics() {
    window.dataLayer = window.dataLayer || [];
    function gtag() {
        dataLayer.push(arguments);
    }

    gtag("js", new Date());
    gtag("config", "UA-109520372-1");
}

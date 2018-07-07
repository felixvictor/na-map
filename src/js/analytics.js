// analytics.js

window.dataLayer = window.dataLayer || [];

/**
 * Google tag manager
 * @return {void}
 */
function gtag() {
    window.dataLayer.push(arguments);
}

/**
 * Register event
 * @param {string} category Event category
 * @param {string} label Event label
 * @return {void}
 */
export function registerEvent(category, label) {
    if (typeof window.google_tag_manager !== "undefined" && window.google_tag_manager.dataLayer.gtmLoad) {
        gtag("event", "click", {
            event_category: category,
            event_label: label
        });
    }
}

/**
 * Init google tag manager
 * @return {void}
 */
export default function initAnalytics() {
    gtag("js", new Date());
    gtag("config", "UA-109520372-1");
}

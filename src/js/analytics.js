// analytics.js

const GA_TRACKING_ID = "UA-109520372-1";
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
 * Register page
 * @param {string} title Page title
 * @param {string} path The path portion of location. This value must start with a slash (/) character.
 * @return {void}
 */
export function registerPage(title, path) {
    if (typeof window.google_tag_manager !== "undefined" && window.google_tag_manager.dataLayer.gtmLoad) {
        gtag("config", GA_TRACKING_ID, {
            page_title: title,
            page_path: path
        });
    }
}

/**
 * Init google tag manager
 * @return {void}
 */
export function initAnalytics() {
    gtag("js", new Date());
    gtag("config", GA_TRACKING_ID);
}

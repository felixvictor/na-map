/**
 * This file is part of na-map.
 *
 * @file      Google analytics.
 * @module    analytics
 * @author    iB aka Felix Victor
 * @copyright 2017, 2018
 * @license   http://www.gnu.org/licenses/gpl.html
 */

/* global ga */

import { appName, appVersion } from "./common";

const GA_TRACKING_ID = "UA-109520372-1";
window.ga = function() {
    // eslint-disable-next-line prefer-rest-params
    ga.q.push(arguments);
};

ga.q = [];

/**
 * Register event
 * @param {string} category Event category
 * @param {string} label Event label
 * @param {number} value Event value
 * @return {void}
 */
export const registerEvent = (category, label, value = 1) => {
    ga("send", {
        hitType: "event",
        eventCategory: category,
        eventLabel: label,
        eventValue: value
    });
};

/**
 * Register page
 * @param {string} title Page title
 * @return {void}
 */
export const registerPage = title => {
    ga("send", {
        hitType: "pageview",
        title
    });
};

/**
 * Init google tag manager
 * {@link https://stackoverflow.com/a/29552301}
 * @return {void}
 */
export const initAnalytics = () => {
    ga.l = Number(new Date());
    ga("create", GA_TRACKING_ID, "auto");
    ga("set", "anonymizeIp", true);
    ga("set", "transport", "beacon");
    ga("send", "pageview");

    /**
     * Log any script error to Google Analytics.
     *
     * Third-party scripts without CORS will only provide "Script Error." as an error message.
     *
     * @param  {String} errorMessage Error message.
     * @return {Boolean} When the function returns true, this prevents the firing of the default event handler.
     */
    window.addEventListener("error", errorMessage => {
        const exceptionDescription = [
            `Message: ${errorMessage.message} @ ${errorMessage.filename}-${errorMessage.lineno}:${errorMessage.colno}`,
            `Error object: ${JSON.stringify(errorMessage.error)}`
        ].join(" - ");

        ga("send", "exception", {
            exDescription: exceptionDescription,
            exFatal: false,
            appName,
            appVersion
        });

        return false;
    });
};

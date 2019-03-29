/* eslint-disable prefer-rest-params */
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
    ga.q.push(arguments);
};

ga.q = [];

/**
 * Register event
 * @param {string} category Event category
 * @param {string} label Event label
 * @param {string} value Event value
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
    const originalWindowErrorCallback = window.onerror;

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
     * @param  {String}           errorMessage Error message.
     * @param  {String}           url          URL where error was raised.
     * @param  {Number}           lineNumber   Line number where error was raised.
     * @param  {Number|undefined} columnNumber Column number for the line where the error occurred.
     * @param  {Object|undefined} errorObject  Error Object.
     * @return {Boolean}                       When the function returns true, this prevents the
     *                                         firing of the default event handler.
     */
    window.addEventListener("error", (errorMessage, url, lineNumber, columnNumber, errorObject) => {
      
            // In case the "errorObject" is available, use its data, else fallback
            // on the default "errorMessage" provided:
            let exceptionDescription = errorMessage;
            if (typeof errorObject !== "undefined" && typeof errorObject.message !== "undefined") {
                exceptionDescription = errorObject.message;
            }

            // Format the message to log to Analytics (might also use "errorObject.stack" if defined):
            exceptionDescription += " @ " + url + ":" + lineNumber + ":" + columnNumber;

            ga("send", "exception", {
                exDescription: exceptionDescription,
                exFatal: false, // Some Error types might be considered as fatal.
                appName,
                appVersion
            });
       

        // If the previous "window.onerror" callback can be called, pass it the data:
        if (typeof originalWindowErrorCallback === "function") {
            return originalWindowErrorCallback(errorMessage, url, lineNumber, columnNumber, errorObject);
        }

        // Otherwise, Let the default handler run:
        return false;
    });
};

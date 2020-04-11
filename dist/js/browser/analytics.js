/*!
 * This file is part of na-map.
 *
 * @file      Google analytics.
 * @module    analytics
 * @author    iB aka Felix Victor
 * @copyright 2017, 2018, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import { appName, appVersion } from "../common/common-browser";
import { GA_TRACKING_ID } from "../common/common-var";
window.ga = (commandArray) => {
    ga.q.push(commandArray);
};
ga.q = [];
export const registerEvent = (category, label, value = 1) => {
    ga("send", {
        hitType: "event",
        eventCategory: category,
        eventLabel: label,
        eventValue: value,
    });
};
export const registerPage = (title) => {
    ga("send", {
        hitType: "pageview",
        title,
    });
};
export const initAnalytics = () => {
    ga.l = Number(new Date());
    ga("create", GA_TRACKING_ID, "auto");
    ga("set", "anonymizeIp", true);
    ga("set", "transport", "beacon");
    ga("send", "pageview");
    window.addEventListener("error", (errorMessage) => {
        const exceptionDescription = [
            `Message: ${errorMessage.message} @ ${errorMessage.filename}-${errorMessage.lineno}:${errorMessage.colno}`,
            `Error object: ${JSON.stringify(errorMessage.error)}`,
        ].join(" - ");
        ga("send", "exception", {
            exDescription: exceptionDescription,
            exFatal: false,
            appName,
            appVersion,
        });
        return false;
    });
};
//# sourceMappingURL=analytics.js.map
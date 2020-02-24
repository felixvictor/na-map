import { appName, appVersion } from "./common-browser";
const GA_TRACKING_ID = "UA-109520372-1";
window.ga = (arguments) => {
    ga.q.push(arguments);
};
ga.q = [];
export const registerEvent = (category, label, value = 1) => {
    ga("send", {
        hitType: "event",
        eventCategory: category,
        eventLabel: label,
        eventValue: value
    });
};
export const registerPage = (title) => {
    ga("send", {
        hitType: "pageview",
        title
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

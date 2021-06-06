/*!
 * This file is part of na-map.
 *
 * @file      Google analytics.
 * @module    analytics
 * @author    iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

/* global ga */

import { appName, appVersion } from "common/common-browser"
import { GA_TRACKING_ID } from "common/common-var"

// @ts-expect-error
window.ga = function (): void {
    // eslint-disable-next-line prefer-rest-params
    ga.q.push(arguments)
}

ga.q = []

/**
 * Register event
 * @param category - Event category
 * @param label - Event label
 * @param value - Event label
 */
export const registerEvent = (category: string, label: string, value = 1): void => {
    ga("send", {
        hitType: "event",
        eventCategory: category,
        eventLabel: label,
        eventValue: value,
    })
}

/**
 * Register page
 * @param title - Page title
 */
export const registerPage = (title: string): void => {
    ga("send", {
        hitType: "pageview",
        title,
    })
}

/**
 * Init google tag manager
 * {@link https://stackoverflow.com/a/29552301}
 */
export const initAnalytics = (): void => {
    ga.l = Date.now()
    ga("create", GA_TRACKING_ID, "auto")
    ga("set", "anonymizeIp", true)
    ga("set", "transport", "beacon")
    ga("send", "pageview")

    /**
     * Log any script error to Google Analytics.
     * Third-party scripts without CORS will only provide "Script Error." as an error message.
     */
    window.addEventListener("error", (errorMessage: ErrorEvent): boolean => {
        // When the function returns true, this prevents the firing of the default event handler
        const exceptionDescription = [
            `Message: ${errorMessage.message} @ ${errorMessage.filename}-${errorMessage.lineno}:${errorMessage.colno}`,
            `Error object: ${JSON.stringify(errorMessage.error)}`,
        ].join(" - ")

        ga("send", "exception", {
            exDescription: exceptionDescription,
            exFatal: false,
            appName,
            appVersion,
        })

        return false
    })
}

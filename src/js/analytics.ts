/**
 * This file is part of na-map.
 *
 * @file      Google analytics.
 * @module    analytics
 * @author    iB aka Felix Victor
 * @copyright 2017, 2018, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

/* global ga */

import { appName, appVersion } from "../node/common"

const GA_TRACKING_ID = "UA-109520372-1"
// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
window.ga = (): void => {
    // eslint-disable-next-line prefer-rest-params
    ga.q.push(arguments)
}

ga.q = []

/**
 * Register event
 */
export const registerEvent = (
    category: string, // Event category
    label: string, // Event label
    value = 1 // Event label
): void => {
    ga("send", {
        hitType: "event",
        eventCategory: category,
        eventLabel: label,
        eventValue: value
    })
}

/**
 * Register page
 */
export const registerPage = (
    title: string // Page title
): void => {
    ga("send", {
        hitType: "pageview",
        title
    })
}

/**
 * Init google tag manager
 * {@link https://stackoverflow.com/a/29552301}
 */
export const initAnalytics = (): void => {
    ga.l = Number(new Date())
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
            `Error object: ${JSON.stringify(errorMessage.error)}`
        ].join(" - ")

        ga("send", "exception", {
            exDescription: exceptionDescription,
            exFatal: false,
            appName,
            appVersion
        })

        return false
    })
}

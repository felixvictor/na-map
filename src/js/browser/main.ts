/*!
 * This file is part of na-map.
 *
 * @file Main file.
 * @author iB aka Felix Victor
 * @copyright Felix Victor 2017 to 2021
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { initAnalytics, registerPage } from "./analytics"
import { ServerId, serverIds } from "common/servers"

import Cookie from "util/cookie"
import RadioButton from "util/radio-button"
import { ShipCompareSearchParamsRead } from "./game-tools/compare-ships/search-params-read"

import "scss/main.scss"

/**
 *  Workaround for google translate uses indexOf on svg text
 *  {@link https://stackoverflow.com/a/53351574}
 */
declare global {
    interface SVGAnimatedString {
        indexOf: () => number
    }
}
SVGAnimatedString.prototype.indexOf = function (this: SVGAnimatedString): number {
    // @ts-expect-error
    return this.baseVal.indexOf.apply(this.baseVal, arguments) // eslint-disable-line prefer-spread,prefer-rest-params,unicorn/prefer-prototype-methods
}

/**
 * Base Id
 */
const baseId = "server-name"

/**
 * Possible values for server names (first is default value)
 */
const radioButtonValues = serverIds

/**
 * Server name cookie
 */
const cookie = new Cookie({ id: baseId, values: radioButtonValues })

/**
 * Server name radio buttons
 */
const radios = new RadioButton(baseId, radioButtonValues)

/**
 * Get server name from cookie or use default value
 * @returns Server name
 */
const getServerName = (): ServerId => {
    const r = cookie.get()

    radios.set(r)

    return r
}

const getSearchParams = (): URLSearchParams => new URLSearchParams(new URL(document.location.href).search)

/**
 * Change server name
 */
const serverNameSelected = (): void => {
    const serverId = radios.get()

    cookie.set(serverId)
    document.location.reload()
}

/**
 * Setup listeners
 */
const setupListener = (): void => {
    document.querySelector(`#${baseId}`)?.addEventListener("change", () => {
        serverNameSelected()
    })

    // {@link https://jsfiddle.net/bootstrapious/j6zkyog8/}
    $(".dropdown-menu [data-bs-toggle='dropdown']").on("click", (event) => {
        event.preventDefault()
        event.stopPropagation()

        const element = $(event.currentTarget)

        element.siblings().toggleClass("show")

        if (!element.next().hasClass("show")) {
            element.parents(".dropdown-menu").first().find(".show").removeClass("show")
        }

        element.parents(".nav-item.dropdown.show").on("hidden.bs.dropdown", () => {
            $(".dropdown-submenu .show").removeClass("show")
        })
    })
}

/**
 * Load map
 * @param serverId - Server id
 * @param searchParams - Query arguments
 */
const loadMap = async (serverId: ServerId, searchParams: URLSearchParams): Promise<void> => {
    const Map = await import(/* webpackChunkName: "map" */ "./map/na-map")
    const map = new Map.NAMap(serverId, searchParams)
    await map.MapInit()
}

/**
 * Load game tools
 */
const loadGameTools = async (serverId: ServerId, readParams?: ShipCompareSearchParamsRead): Promise<void> => {
    const gameTools = await import(/* webpackChunkName: "game-tools" */ "./game-tools")
    gameTools.init(serverId, readParams)
}

/**
 * Load map tools
 */
const loadMapTools = async (): Promise<void> => {
    const mapTools = await import(/* webpackChunkName: "map-tools" */ "./map-tools")
    mapTools.init()
}

const load = async (): Promise<void> => {
    const serverId = getServerName()
    const searchParams = getSearchParams()
    const readParams = new ShipCompareSearchParamsRead(searchParams)

    // Remove search string from URL
    // {@link https://stackoverflow.com/a/5298684}
    history.replaceState("", document.title, window.location.origin + window.location.pathname)

    await loadMap(serverId, searchParams)

    if (readParams.isCurrentVersion()) {
        void loadGameTools(serverId, readParams)
    } else {
        ;(document.querySelector("#game-tools-dropdown") as HTMLElement).addEventListener(
            "show.bs.dropdown",
            async () => loadGameTools(serverId, undefined),
            { once: true }
        )
    }

    ;(document.querySelector("#map-tools-dropdown") as HTMLElement).addEventListener(
        "show.bs.dropdown",
        async () => loadMapTools(),
        { once: true }
    )
}

/**
 * Main function
 */
const main = (): void => {
    initAnalytics()
    registerPage("Homepage")

    setupListener()
    void load()
}

main()

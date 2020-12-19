/*!
 * This file is part of na-map.
 *
 * @file Main file.
 * @author iB aka Felix Victor
 * @copyright 2017, 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { initAnalytics, registerPage } from "./analytics"
import { serverIds } from "../common/servers"

import Cookie from "./util/cookie"
import RadioButton from "./util/radio-button"

import "../../scss/main.scss"

/**
 *  Workaround for google translate uses indexOf on svg text
 *  {@link https://stackoverflow.com/a/53351574}
 */
declare global {
    interface SVGAnimatedString {
        indexOf: () => Record<string, unknown>
    }
}
SVGAnimatedString.prototype.indexOf = function (this: SVGAnimatedString): Record<string, unknown> {
    return this.baseVal.indexOf.apply(this.baseVal, arguments) // eslint-disable-line prefer-spread,prefer-rest-params
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
const getServerName = (): string => {
    const r = cookie.get()

    radios.set(r)

    return r
}

const getSearchParams = (): URLSearchParams => new URL(document.location.href).searchParams

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
    $(".dropdown-menu [data-toggle='dropdown']").on("click", (event) => {
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
 * Load map and set resize event
 * @param serverId - Server id
 * @param searchParams - Query arguments
 */
const loadMap = async (serverId: string, searchParams: URLSearchParams): Promise<void> => {
    const Map = await import(/* webpackChunkName: "map" */ "./map/na-map")
    const map = new Map.NAMap(serverId, searchParams)
    await map.MapInit()

    window.addEventListener("resize", () => {
        map.resize()
    })
}

/**
 * Load game tools
 * @param serverId - Server id
 * @param searchParams - Query arguments
 */
const loadGameTools = async (serverId: string, searchParams: URLSearchParams): Promise<void> => {
    const gameTools = await import(/* webpackChunkName: "game-tools" */ "./game-tools")
    gameTools.init(serverId, searchParams)
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

    // Remove search string from URL
    // {@link https://stackoverflow.com/a/5298684}
    history.replaceState("", document.title, window.location.origin + window.location.pathname)

    await loadMap(serverId, searchParams)

    if (searchParams.get("v")) {
        void loadGameTools(serverId, searchParams)
    } else {
        document
            .querySelector("#game-tools-dropdown")
            ?.addEventListener("click", async () => loadGameTools(serverId, searchParams), { once: true })
    }

    document.querySelector("#map-tools-dropdown")?.addEventListener("click", async () => loadMapTools(), { once: true })
}

/**
 * Main function
 */
const main = (): void => {
    initAnalytics()
    registerPage("Homepage")

    setupListener()
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    load()
}

main()

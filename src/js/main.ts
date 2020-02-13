/**
 * This file is part of na-map.
 *
 * @file Main file.
 * @author iB aka Felix Victor
 * @copyright 2017, 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { initAnalytics, registerPage } from "./analytics";
import { Server, servers } from "./servers";
import { putImportError } from "./util";
import Cookie from "./util/cookie";
import RadioButton from "./util/radio-button.ts";

import "../scss/main.scss";

/**
 *  Workaround for google translate uses indexOf on svg text
 *  {@link https://stackoverflow.com/a/53351574}
 */
// eslint-disable-next-line @typescript-eslint/ban-ts-ignore
// @ts-ignore
SVGAnimatedString.prototype.indexOf = (): object =>
    // eslint-disable-next-line prefer-spread,prefer-rest-params,@typescript-eslint/ban-ts-ignore
    // @ts-ignore
    // eslint-disable-next-line prefer-spread
    this.baseVal.indexOf.apply(this.baseVal, arguments)

/**
 * Base Id
 */
const baseId = "server-name"

/**
 * Possible values for server names (first is default value)
 */
const radioButtonValues = servers.map((server: Server) => server.id)

/**
 * Server name cookie
 * @type {Cookie}
 */
const cookie = new Cookie({ id: baseId, values: radioButtonValues })

/**
 * Server name radio buttons
 * @type {RadioButton}
 */
const radios = new RadioButton(baseId, radioButtonValues)

/**
 * Get server name from cookie or use default value
 */
const getServerName = (): string => {
    // Server name

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
    ;(document.getElementById(baseId) as HTMLInputElement).addEventListener("change", () => serverNameSelected())

    // {@link https://jsfiddle.net/bootstrapious/j6zkyog8/}
    $(".dropdown-menu [data-toggle='dropdown']").on("click", event => {
        event.preventDefault()
        event.stopPropagation()

        const element = $(event.currentTarget)

        element.siblings().toggleClass("show")

        if (!element.next().hasClass("show")) {
            element
                .parents(".dropdown-menu")
                .first()
                .find(".show")
                .removeClass("show")
        }

        element.parents(".nav-item.dropdown.show").on("hidden.bs.dropdown", () => {
            $(".dropdown-submenu .show").removeClass("show")
        })
    })
}

/**
 * Load map and set resize event
 */
const loadMap = async (
    serverId: string, // Server id
    searchParams: URLSearchParams // Query arguments
): Promise<void> => {
    try {
        const Map = await import(/*  webpackPreload: true, webpackChunkName: "map" */ "./map/map")
        const map = new Map.Map(serverId, searchParams)
        await map.MapInit()

        window.addEventListener("resize", () => {
            map.resize()
        })
    } catch (error) {
        putImportError(error)
    }
}

/**
 * Load game tools
 */
const loadGameTools = async (
    serverId: string, // Server id
    searchParams: URLSearchParams // Query arguments
): Promise<void> => {
    try {
        const gameTools = await import(/* webpackChunkName: "game-tools" */ "./game-tools")
        gameTools.init(serverId, searchParams)
    } catch (error) {
        putImportError(error)
    }
}

const load = async (): Promise<void> => {
    const serverId = getServerName()
    const searchParams = getSearchParams()

    // Remove search string from URL
    // {@link https://stackoverflow.com/a/5298684}
    history.replaceState("", document.title, window.location.origin + window.location.pathname)

    await loadMap(serverId, searchParams)
    if (searchParams.get("v")) {
        loadGameTools(serverId, searchParams)
    } else {
        ;(document.getElementById("game-tools-dropdown") as HTMLInputElement).addEventListener(
            "click",
            () => loadGameTools(serverId, searchParams),
            { once: true }
        )
    }
}

/**
 * Main function
 */
const main = (): void => {
    initAnalytics()
    registerPage("Homepage")

    setupListener()
    load()
}

main()

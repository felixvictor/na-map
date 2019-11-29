/**
 * This file is part of na-map.
 *
 * @file Main file.
 * @author iB aka Felix Victor
 * @copyright 2017, 2018, 2019
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { initAnalytics, registerPage } from "./analytics";
import { servers } from "./servers";
import { putImportError } from "./util";
import Cookie from "./util/cookie";
import RadioButton from "./util/radio-button";

import "../scss/main.scss";

/**
 *  Workaround for google translate uses indexOf on svg text
 *  {@link https://stackoverflow.com/a/53351574}
 *  @return {object} Shim
 */
SVGAnimatedString.prototype.indexOf = function() {
    // eslint-disable-next-line prefer-spread,prefer-rest-params
    return this.baseVal.indexOf.apply(this.baseVal, arguments);
};

/**
 * Base Id
 * @type {string}
 */
const baseId = "server-name";

/**
 * Possible values for server names (first is default value)
 * @type {string[]}
 * @private
 */
const radioButtonValues = servers.map(server => server.id);

/**
 * Server name cookie
 * @type {Cookie}
 */
const cookie = new Cookie({ id: baseId, values: radioButtonValues });

/**
 * Server name radio buttons
 * @type {RadioButton}
 */
const radios = new RadioButton(baseId, radioButtonValues);

/**
 * Get server name from cookie or use default value
 * @returns {string} - server name
 */
const getServerName = () => {
    const r = cookie.get();

    radios.set(r);

    return r;
};

const getSearchParams = () => new URL(document.location).searchParams;

/**
 * Change server name
 * @return {void}
 */
const serverNameSelected = () => {
    const serverId = radios.get();
    cookie.set(serverId);
    document.location.reload();
};

/**
 * Setup listeners
 * @return {void}
 */
const setupListener = () => {
    document.getElementById(baseId).addEventListener("change", () => serverNameSelected());

    // https://www.codeply.com/go/1Iz3DxS60l
    $(".dropdown-menu a.dropdown-toggle").on("click", event => {
        const menu$ = $(event.currentTarget);
        if (!menu$.next().hasClass("show")) {
            menu$
                .parents(".dropdown-menu")
                .first()
                .find(".show")
                .removeClass("show");
        }

        const subMenu$ = menu$.next(".dropdown-menu");
        subMenu$.toggleClass("show");
        $(this)
            .parents("li.nav-item.dropdown.show")
            .on("hidden.bs.dropdown", () => {
                $(".dropdown-submenu .show").removeClass("show");
            });
        return false;
    });

    /*
        $(".dropdown-menu").on("click.bs.dropdown.data-api", event => {
            const menu$ = $(event.currentTarget);
            console.log("click.bs.dropdown.data-api", menu$);
            //event.preventDefault();
            //event.stopPropagation();
           // debugger;
            $(".dropdown-menu.show")
                .not(".inner")
                .removeClass("show");
        });
        */

    $(".dropdown").on("hidden.bs.dropdown", () => {
        $(".dropdown-menu.show")
            .not(".inner")
            .removeClass("show");
    });
};

/**
 * Load map and set resize event
 * @param {string} serverId - Server id
 * @param {URLSearchParams} searchParams - Query arguments
 * @return {void}
 */
const loadMap = async (serverId, searchParams) => {
    try {
        const Map = await import(/*  webpackPreload: true, webpackChunkName: "map" */ "./map/map");
        const map = new Map.Map(serverId, searchParams);
        await map.MapInit();

        window.addEventListener("resize", () => {
            map.resize();
        });
    } catch (error) {
        putImportError(error);
    }
};

/**
 * Load game tools
 * @param {string} serverId - Server id
 * @param {URLSearchParams} searchParams - Query arguments
 * @return {void}
 */
const loadGameTools = async (serverId, searchParams) => {
    try {
        const gameTools = await import(/* webpackChunkName: "game-tools" */ "./game-tools");
        gameTools.init(serverId, searchParams);
    } catch (error) {
        putImportError(error);
    }
};

const load = async () => {
    const serverId = getServerName();
    const searchParams = getSearchParams();

    // Remove search string from URL
    // {@link https://stackoverflow.com/a/5298684}
    history.replaceState("", document.title, window.location.origin + window.location.pathname);

    await loadMap(serverId, searchParams);
    if (searchParams.get("v")) {
        loadGameTools(serverId, searchParams);
    } else {
        document
            .getElementById("game-tools-dropdown")
            .addEventListener("click", () => loadGameTools(serverId, searchParams), { once: true });
    }
};

/**
 * @returns {void}
 */
function main() {
    initAnalytics();
    registerPage("Homepage");

    setupListener();
    load();
}

main();

/**
 * This file is part of na-map.
 *
 * @file Main file.
 * @author iB aka Felix Victor
 * @copyright 2017, 2018
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import "bootstrap/js/dist/util";
import "bootstrap/js/dist/button";
import "bootstrap/js/dist/dropdown";
import "bootstrap/js/dist/modal";
import "bootstrap/js/dist/toast";
import "bootstrap/js/dist/tooltip";

import { library as faLibrary, dom as faDom } from "@fortawesome/fontawesome-svg-core";
import { faCalendar, faCalendarCheck, faClock, faCopy } from "@fortawesome/free-regular-svg-icons";
import {
    faArrowDown,
    faArrowUp,
    faChevronLeft,
    faChevronRight,
    faCog,
    faDonate,
    faEraser,
    faInfoCircle,
    faPaste,
    faSort,
    faSortDown,
    faSortUp,
    faTimes,
    faTrash
} from "@fortawesome/free-solid-svg-icons";

import { initAnalytics, registerPage } from "./analytics";
import { servers } from "./servers";
import Cookie from "./util/cookie";
import RadioButton from "./util/radio-button";

import "../scss/main.scss";

/**
 * @returns {void}
 */
function main() {
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
    // eslint-disable-next-line space-before-function-paren
    const getServerName = async () => {
        const r = cookie.get();

        radios.set(r);

        return r;
    };

    // eslint-disable-next-line space-before-function-paren
    const getSearchParams = async () => new URL(document.location).searchParams;

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
    // eslint-disable-next-line space-before-function-paren
    const loadMap = async (serverId, searchParams) => {
        const { Map } = await import(/*  webpackPreload: true, webpackChunkName: "map" */ "./map/map");
        const map = new Map(serverId, searchParams);

        window.addEventListener("resize", () => {
            map.resize();
        });
    };

    /**
     * Load game tools
     * @param {string} serverId - Server id
     * @param {URLSearchParams} searchParams - Query arguments
     * @return {void}
     */
    // eslint-disable-next-line space-before-function-paren
    const loadGameTools = async (serverId, searchParams) => {
        try {
            const gameTools = await import(/* webpackChunkName: "game-tools" */ "./game-tools");
            gameTools.init(serverId, searchParams);
        } catch (error) {
            throw new Error(error);
        }
    };

    // eslint-disable-next-line space-before-function-paren
    const load = async () => {
        await Promise.all([getServerName(), getSearchParams()]).then(([serverId, searchParams]) => {
            // Remove search string from URL
            // {@link https://stackoverflow.com/a/5298684}
            history.replaceState("", document.title, window.location.origin + window.location.pathname);

            loadMap(serverId, searchParams);
            loadGameTools(serverId, searchParams);
        });
    };

    faLibrary.add(
        faArrowDown,
        faArrowUp,
        faCalendar,
        faCalendarCheck,
        faChevronLeft,
        faChevronRight,
        faClock,
        faCog,
        faCopy,
        faDonate,
        faEraser,
        faInfoCircle,
        faPaste,
        faSort,
        faSortDown,
        faSortUp,
        faTimes,
        faTrash
    );
    faDom.watch();

    initAnalytics();
    registerPage("Homepage", "/");

    setupListener();
    load();
}

main();

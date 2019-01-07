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
import "bootstrap/js/dist/collapse";
import "bootstrap/js/dist/dropdown";
import "bootstrap/js/dist/modal";
import "bootstrap/js/dist/tooltip";

import fontawesome from "@fortawesome/fontawesome";
import { faCalendar, faCalendarCheck, faClock, faCopy } from "@fortawesome/fontawesome-free-regular";
import {
    faArrowDown,
    faArrowUp,
    faChevronLeft,
    faChevronRight,
    faPaste,
    faSort,
    faSortDown,
    faSortUp,
    faTimes,
    faTrash
} from "@fortawesome/fontawesome-free-solid";

import { initAnalytics, registerPage } from "./analytics";
import { appName } from "./common";
import { getCookie, setCookie } from "./util";

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
     * Server name cookie
     * @type {cookieData}
     */
    const serverNameCookie = { name: `${appName}--${baseId}`, values: ["eu1", "eu2"], default: "eu1" };

    /**
     * Get server name from cookie or use default value
     * @returns {string} - server name
     */
    const getServerName = () => {
        const serverName = getCookie(serverNameCookie);

        document.getElementById(`${baseId}-${serverName}`).checked = true;

        return serverName;
    };

    /**
     * Get server name from cookie or use default value
     * @type {string}
     */
    let serverName = getServerName();

    /**
     * Store server name in cookie
     * @return {void}
     */
    const storeServerName = () => {
        setCookie(serverNameCookie, serverName);
    };

    /**
     * Change server name
     * @return {void}
     */
    const serverNameSelected = () => {
        serverName = document.querySelector("input[name='serverName']:checked").value;
        // If data is invalid
        if (!serverNameCookie.values.includes(serverName)) {
            serverName = serverNameCookie.default;
            document.getElementById(`${baseId}-${serverName}`).checked = true;
        }
        storeServerName();
        document.location.reload();
    };

    /**
     * Setup listeners
     * @return {void}
     */
    const setupListener = () => {
        document.getElementById(baseId).addEventListener("change", () => serverNameSelected());

        // https://stackoverflow.com/questions/44467377/bootstrap-4-multilevel-dropdown-inside-navigation/48953349#48953349
        $(".dropdown-submenu > a").on("click", event => {
            const submenu$ = $(event.currentTarget);

            $(".dropdown-submenu .dropdown-menu").removeClass("show");
            submenu$.next(".dropdown-menu").addClass("show");
            event.stopPropagation();
        });

        $(".dropdown").on("hidden.bs.dropdown", () => {
            $(".dropdown-menu.show")
                .not(".inner")
                .removeClass("show");
        });
    };

    /**
     * Load map and set resize event
     * @return {void}
     */
    const loadMap = async () => {
        let map;

        try {
            const { Map } = await import(/* webpackChunkName: "map" */ "./map/map");
            map = new Map(serverName);
        } catch (error) {
            throw new Error(error);
        }

        window.onresize = () => {
            map.resize();
        };
    };

    /**
     * Load game tools
     * @return {void}
     */
    const loadGameTools = async () => {
        try {
            const gameTools = await import(/* webpackChunkName: "game-tools" */ "./game-tools");
            gameTools.init();
        } catch (error) {
            throw new Error(error);
        }
    };

    fontawesome.library.add(
        faArrowDown,
        faArrowUp,
        faCalendar,
        faCalendarCheck,
        faChevronLeft,
        faChevronRight,
        faClock,
        faCopy,
        faPaste,
        faSort,
        faSortDown,
        faSortUp,
        faTimes,
        faTrash
    );

    initAnalytics();
    registerPage("Homepage", "/");

    setupListener();
    loadMap();
    loadGameTools();
}

main();

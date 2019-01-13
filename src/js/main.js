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
import "bootstrap/js/dist/toast";
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

import Cookie from "./util/cookie";
import { initAnalytics, registerPage } from "./analytics";
import { getRadioButton, setRadioButton } from "./util";

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
    const radioButtonValues = ["eu1", "eu2"];

    /**
     * Server name cookie
     * @type {Cookie}
     */
    const cookie = new Cookie(baseId, radioButtonValues);

    /**
     * Get server name from cookie or use default value
     * @returns {string} - server name
     */
    const getServerName = () => {
        const r = cookie.get();

        setRadioButton(`${baseId}-${r}`);

        return r;
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
        cookie.set(serverName);
    };

    /**
     * Change server name
     * @return {void}
     */
    const serverNameSelected = () => {
        serverName = getRadioButton(baseId);
        // If data is invalid
        if (!radioButtonValues.includes(serverName)) {
            [serverName] = radioButtonValues;
            setRadioButton(`${baseId}-${serverName}`);
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

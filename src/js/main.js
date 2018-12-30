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
    faTimes,
    faTrash
} from "@fortawesome/fontawesome-free-solid";
import Cookies from "js-cookie";

import { initAnalytics, registerPage } from "./analytics";

import "../scss/main.scss";

/**
 * @returns {void}
 */
function main() {
    /**
     * server name cookie name
     * @type {string}
     */
    const serverNameCookieName = "na-map--server-name";

    /**
     * Default server name
     * @type {string}
     */
    const serverNameDefault = "eu1";

    /**
     * Get server name from cookie or use default value
     * @returns {string} - server name
     */
    function getServerName() {
        // Use default value if cookie is not stored
        const r = Cookies.get(serverNameCookieName) || serverNameDefault;
        $(`#server-name-${r}`).prop("checked", true);
        return r;
    }

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
        if (serverName !== serverNameDefault) {
            Cookies.set(serverNameCookieName, serverName);
        } else {
            Cookies.remove(serverNameCookieName);
        }
    };

    /**
     * Change server name
     * @return {void}
     */
    const serverNameSelected = () => {
        serverName = $("input[name='serverName']:checked").val();
        storeServerName();
        document.location.reload();
    };

    /**
     * Setup listeners
     * @return {void}
     */
    const setupListener = () => {
        $("#server-name").change(() => serverNameSelected());

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
        faCalendar,
        faCalendarCheck,
        faClock,
        faCopy,
        faArrowDown,
        faArrowUp,
        faChevronLeft,
        faChevronRight,
        faPaste,
        faTimes,
        faTrash
    );

    initAnalytics();
    registerPage("Homepage", "/");

    // Set cookies defaults (expiry 365 days)
    Cookies.defaults = {
        expires: 365
    };

    setupListener();
    loadMap();
    loadGameTools();
}

main();

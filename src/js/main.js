/**
 * This file is part of na-map.
 *
 * @file Main file.
 * @author iB aka Felix Victor
 * @copyright 2017, 2018
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import "bootstrap/js/dist/button";
import "bootstrap/js/dist/collapse";
import "bootstrap/js/dist/dropdown";
import "bootstrap/js/dist/modal";
import "bootstrap/js/dist/tooltip";
import "bootstrap/js/dist/util";

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

import naDisplay from "./na-display";
import naAnalytics from "./analytics";

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
        let r = Cookies.get(serverNameCookieName);
        // Use default value if cookie is not stored
        r = typeof r !== "undefined" ? r : serverNameDefault;
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
    function storeServerName() {
        if (serverName !== serverNameDefault) {
            Cookies.set(serverNameCookieName, serverName);
        } else {
            Cookies.remove(serverNameCookieName);
        }
    }

    /**
     * Change server name
     * @return {void}
     */
    function serverNameSelected() {
        serverName = $("input[name='serverName']:checked").val();
        storeServerName();
        document.location.reload();
    }

    /**
     * Setup listeners
     * @return {void}
     */
    function setupListener() {
        // Adapted https://github.com/bootstrapthemesco/bootstrap-4-multi-dropdown-navbar
        $(".dropdown-menu a.dropdown-toggle").on("click", event => {
            const $el = $(event.currentTarget);
            const $parent = $el.offsetParent(".dropdown-menu");

            if (!$el.next().hasClass("show")) {
                $el
                    .parents(".dropdown-menu")
                    .first()
                    .find(".show")
                    .not(".inner")
                    .removeClass("show");
            }
            $el.next(".dropdown-menu").toggleClass("show");
            $el.parent("li").toggleClass("show");
            $el.parents("li.nav-item.dropdown.show").on("hidden.bs.dropdown", event2 => {
                const el2 = $(event2.currentTarget)
                    .find(".dropdown-menu .show")
                    .not(".inner");
                el2.removeClass("show");
            });
            if (!$parent.parent().hasClass("navbar-nav")) {
                $el.next().css({ top: $el[0].offsetTop, left: $parent.outerWidth() - 4 });
            }

            return false;
        });
        $("#server-name").change(() => serverNameSelected());
    }

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

    naAnalytics();
    setupListener();
    naDisplay(serverName);
}

main();

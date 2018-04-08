/*
 Main

 iB 2017
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

import naDisplay from "./na-display";
import naAnalytics from "./analytics";

function main() {
    const greetings = $("#modal-greetings");

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

        greetings
            .on("click", ".btn, .close", event => {
                $(event.currentTarget).addClass("modal-greetings-result"); // mark which button was clicked
            })
            .on("hide.bs.modal", () => {
                const serverName = greetings.find(".modal-greetings-result").attr("data-server");
                naDisplay(serverName); // invoke the callback with result
            });
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

    window.onload = () => {
        greetings.modal("show");
    };
}

main();

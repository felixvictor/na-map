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
import "bootstrap-4-multi-dropdown-navbar/js/bootstrap-4-navbar";

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
    $("#modal-greetings")
        .on("click", ".btn, .close", function() {
            $(this).addClass("modal-greetings-result"); // mark which button was clicked
        })
        .on("hide.bs.modal", function() {
            const serverName = $(this)
                .find(".modal-greetings-result")
                .attr("data-server");
            naDisplay(serverName); // invoke the callback with result
        });
    window.onload = function() {
        $("#modal-greetings").modal("show");
    };
}

main();

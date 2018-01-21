/*
 Main

 iB 2017
 */

import "bootstrap/js/dist/collapse";
import "bootstrap/js/dist/dropdown";
import "bootstrap/js/dist/modal";
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
    $("#modal")
        .on("click", ".btn, .close", function() {
            $(this).addClass("modal-result"); // mark which button was clicked
        })
        .on("hide.bs.modal", function() {
            const serverName = $(this)
                .find(".modal-result")
                .attr("data-server");
            naDisplay(serverName); // invoke the callback with result
        });
    window.onload = function() {
        $("#modal").modal("show");
    };
}

main();

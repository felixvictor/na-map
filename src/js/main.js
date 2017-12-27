/*
 Main

 iB 2017
 */

import naDisplay from "./na-display";
import naAnalytics from "./analytics.js";
import "bootstrap/js/dist/modal";
import "bootstrap/js/dist/util";

function main() {
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
        //$("#modal").modal("show");
    };
    naDisplay();
}

main();

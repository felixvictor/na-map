/*
    Main

    iB 2017
 */

import naDisplay from "./na-display";
import naAnalytics from "./analytics.js";
import "bootstrap/js/dist/modal";
import "bootstrap/js/dist/tooltip";
import "bootstrap/js/dist/util";

function main() {
    naAnalytics();
    naDisplay();
    window.onload = function() {
        $("#modal")
            .modal("show")
            .on("hidden.bs.modal", function(e) {
                $('[data-toggle="tooltip"]').tooltip({
                    delay: { show: 100, hide: 100 },
                    html: true,
                    placement: "auto"
                });
            });
    };
}

main();

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
    jQuery(document).ready(function($) {
        // Open modal
        $("#modal").modal("show");
        $('[data-toggle="tooltip"]').tooltip({
            delay: { show: 500, hide: 100 },
            html: true,
            placement: "auto"
        });
    });
}

main();

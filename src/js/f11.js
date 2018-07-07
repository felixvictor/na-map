/*
    f11.js
*/

/* global d3 : false
 */

import { between, formatF11 } from "./util";
import { convertCoordX, convertCoordY, convertInvCoordX, convertInvCoordY } from "./common";
import { registerEvent } from "./analytics";

export default class F11 {
    constructor(map) {
        this._map = map;
        this._minCoord = this._map.coord.min;
        this._maxCoord = this._map.coord.max;

        this._setupSvg();
        this._setupListener();
    }

    _setupSvg() {
        this._g = d3
            .select("#na-svg")
            .insert("g")
            .classed("f11", true);
    }

    _setupListener() {
        $("#f11").submit(event => {
            registerEvent("Menu", "Move to F11");
            this._f11Submitted();
            event.preventDefault();
        });

        $("#copy-coord").click(() => this._copyCoordClicked());

        document.addEventListener("paste", event => {
            this._pasteF11FromClipboard(event);
            event.preventDefault();
        });
    }

    _f11Submitted() {
        const x = +$("#x-coord").val() * -1000,
            z = +$("#z-coord").val() * -1000;

        this._goToF11(x, z);
    }

    // https://stackoverflow.com/questions/22581345/click-button-copy-to-clipboard-using-jquery
    static _copyF11ToClipboard(F11coord) {
        const temp = $("<input>");

        $("body").append(temp);
        temp.val(F11coord).select();
        document.execCommand("copy");
        temp.remove();
    }

    _copyCoordClicked() {
        const x = $("#x-coord").val(),
            z = $("#z-coord").val();

        if (!Number.isNaN(x) && !Number.isNaN(z)) {
            const F11String = `F11 coordinates X: ${x}k Z: ${z}k`;
            this.constructor._copyF11ToClipboard(F11String);
        }
    }

    _addF11StringToInput(F11String) {
        const regex = /F11 coordinates X: ([-+]?[0-9]*)k Z: ([-+]?[0-9]*)k/g,
            match = regex.exec(F11String);

        if (match && !Number.isNaN(+match[1]) && !Number.isNaN(+match[2])) {
            const x = +match[1] * 1000,
                z = +match[2] * 1000;
            if (!Number.isNaN(Number(x)) && !Number.isNaN(Number(z))) {
                this._goToF11(x, z);
            }
        }
    }

    _pasteF11FromClipboard(e) {
        const F11String =
            // eslint-disable-next-line no-nested-ternary
            e.clipboardData && e.clipboardData.getData
                ? e.clipboardData.getData("text/plain") // Standard
                : window.clipboardData && window.clipboardData.getData
                    ? window.clipboardData.getData("Text") // MS
                    : false;

        // If one of the F11 input elements is in focus
        if (document.activeElement.id === "x-coord" || document.activeElement.id === "z-coord") {
            // test for number
            if (!Number.isNaN(+F11String)) {
                // paste number in input element
                $(`#${document.activeElement.id}`)
                    .val(F11String)
                    .select();
            }
        } else {
            // Paste F11string
            this._addF11StringToInput(F11String);
        }
    }

    _printF11Coord(x, y, F11X, F11Y) {
        const g = this._g.append("g").attr("transform", `translate(${x},${y})`);
        g.append("circle").attr("r", 10);
        g
            .append("text")
            .attr("dx", "-.6em")
            .attr("dy", "-.5em")
            .text(formatF11(F11X));
        g
            .append("text")
            .attr("dx", "-.6em")
            .attr("dy", ".5em")
            .text(formatF11(F11Y));
    }

    _goToF11(F11XIn, F11YIn) {
        const F11X = Number(F11XIn),
            F11Y = Number(F11YIn),
            x = convertCoordX(F11X, F11Y),
            y = convertCoordY(F11X, F11Y);

        if (between(x, this._minCoord, this._maxCoord, true) && between(y, this._minCoord, this._maxCoord, true)) {
            this._printF11Coord(x, y, F11X, F11Y);
            this._map.zoomAndPan(x, y, 1);
        }
    }

    printCoord(x, y) {
        const F11X = convertInvCoordX(x, y),
            F11Y = convertInvCoordY(x, y);

        this._printF11Coord(x, y, F11X, F11Y);
    }

    transform(transform) {
        this._g.attr("transform", transform);
    }

    clearMap() {
        this._g.selectAll("*").remove();
    }
}

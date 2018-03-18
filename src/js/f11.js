/*
    f11.js
*/

/* global d3 : false
 */

import { between, formatCoord } from "./util";

export default class F11 {
    constructor(map) {
        this._map = map;
        this._minCoord = this._map.coord.min;
        this._maxCoord = this._map.coord.max;
        this._transformMatrix = {
            A: -0.00499866779363828,
            B: -0.00000021464254980645,
            C: 4096.88635151897,
            D: 4096.90282787469
        };
        this._transformMatrixInv = {
            A: -200.053302087577,
            B: -0.00859027897636011,
            C: 819630.836437126,
            D: -819563.745651571
        };

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
            this._f11Submitted();
            event.preventDefault();
        });

        $("#copy-coord").click(() => {
            this._copyCoordClicked();
        });

        document.addEventListener("paste", event => {
            this._pasteF11FromClipboard(event);
            event.preventDefault();
        });
    }

    _f11Submitted() {
        const x = +$("#x-coord").val(),
            z = +$("#z-coord").val();

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
            const F11String = `F11 coordinates X: ${x} Z: ${z}`;
            this.constructor._copyF11ToClipboard(F11String);
        }
    }

    _addF11StringToInput(F11String) {
        const regex = /F11 coordinates X: ([-+]?[0-9]*\.?[0-9]+) Z: ([-+]?[0-9]*\.?[0-9]+)/g,
            match = regex.exec(F11String);

        if (match && !Number.isNaN(+match[1]) && !Number.isNaN(+match[2])) {
            const x = +match[1],
                z = +match[2];
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
        g.append("circle").attr("r", 20);
        g
            .append("text")
            .attr("dx", "-1.5em")
            .attr("dy", "-.5em")
            .text(formatCoord(F11X));
        g
            .append("text")
            .attr("dx", "-1.5em")
            .attr("dy", ".5em")
            .text(formatCoord(F11Y));
    }

    _goToF11(F11X, F11Y) {
        // F11 coord to svg coord
        const convertCoordX = (x, y) =>
            this._transformMatrix.A * x + this._transformMatrix.B * y + this._transformMatrix.C;

        // F11 coord to svg coord
        const convertCoordY = (x, y) =>
            this._transformMatrix.B * x - this._transformMatrix.A * y + this._transformMatrix.D;

        const x = convertCoordX(F11X, F11Y),
            y = convertCoordY(F11X, F11Y);

        if (between(x, this._minCoord, this._maxCoord, true) && between(y, this._minCoord, this._maxCoord, true)) {
            this._printF11Coord(x, y, Number(F11X), Number(F11Y));
            this._map.zoomAndPan(x, y, 1);
        }
    }

    printCoord(x, y) {
        // svg coord to F11 coord
        const convertInvCoordX = () =>
            this._transformMatrixInv.A * x + this._transformMatrixInv.B * y + this._transformMatrixInv.C;

        // svg coord to F11 coord
        const convertInvCoordY = () =>
            this._transformMatrixInv.B * x - this._transformMatrixInv.A * y + this._transformMatrixInv.D;

        const F11X = convertInvCoordX(x, y) * -1,
            F11Y = convertInvCoordY(x, y) * -1;

        this._printF11Coord(x, y, F11X, F11Y);
    }

    transform(transform) {
        this._g.attr("transform", transform);
    }

    clearMap() {
        this._g.selectAll("*").remove();
    }
}

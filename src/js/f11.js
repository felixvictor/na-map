/*
    f11.js
*/

/* global d3 : false
 */

import { between, formatCoord } from "./util";

export default class F11 {
    constructor(minCoord, maxCoord) {
        this.minCoord = minCoord;
        this.maxCoord = maxCoord;
        this.transformMatrix = {
            A: -0.00499866779363828,
            B: -0.00000021464254980645,
            C: 4096.88635151897,
            D: 4096.90282787469
        };
        this.transformMatrixInv = {
            A: -200.053302087577,
            B: -0.00859027897636011,
            C: 819630.836437126,
            D: -819563.745651571
        };

        this.setupSvg();
        this.setupListener();
    }

    setupSvg() {
        this.g = d3.select("#na-svg")
            .insert("g")
            .classed("f11", true);
    }

    setupListener() {
        $("#f11").submit(event => {
            this.f11Submitted(event);
        });

        $("#copy-coord").click(() => {
            this.copyCoordClicked();
        });

        document.addEventListener("paste", event => {
            this.pasteF11FromClipboard(event);
            event.preventDefault();
        });
    }

    f11Submitted(event) {
        const x = +$("#x-coord").val(),
            z = +$("#z-coord").val();

        this.goToF11(x, z);
        event.preventDefault();
    }

    // https://stackoverflow.com/questions/22581345/click-button-copy-to-clipboard-using-jquery
    static copyF11ToClipboard(F11coord) {
        const temp = $("<input>");

        $("body").append(temp);
        temp.val(F11coord).select();
        document.execCommand("copy");
        temp.remove();
    }

    copyCoordClicked() {
        const x = $("#x-coord").val(),
            z = $("#z-coord").val();

        if (!Number.isNaN(x) && !Number.isNaN(z)) {
            const F11String = `F11 coordinates X: ${x} Z: ${z}`;
            this.copyF11ToClipboard(F11String);
        }
    }

    pasteF11FromClipboard(e) {
        function addF11StringToInput(F11String) {
            const regex = /F11 coordinates X: ([-+]?[0-9]*\.?[0-9]+) Z: ([-+]?[0-9]*\.?[0-9]+)/g,
                match = regex.exec(F11String);

            if (match && !Number.isNaN(+match[1]) && !Number.isNaN(+match[2])) {
                const x = +match[1],
                    z = +match[2];
                if (!Number.isNaN(Number(x)) && !Number.isNaN(Number(z))) {
                    this.goToF11(x, z);
                }
            }
        }

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
            addF11StringToInput(F11String);
        }
    }

    printF11Coord(x, y, F11X, F11Y) {
        const g = this.g.append("g").attr("transform", `translate(${x},${y})`);
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

    printCoord(x, y) {
        // svg coord to F11 coord
        const convertInvCoordX = () =>
            this.transformMatrixInv.A * x + this.transformMatrixInv.B * y + this.transformMatrixInv.C;

        // svg coord to F11 coord
        const convertInvCoordY = () =>
            this.transformMatrixInv.B * x - this.transformMatrixInv.A * y + this.transformMatrixInv.D;

        const F11X = convertInvCoordX(x, y) * -1,
            F11Y = convertInvCoordY(x, y) * -1;

        this.printF11Coord(x, y, F11X, F11Y);
    }

    goToF11(F11XIn, F11YIn) {
        // F11 coord to svg coord
        const convertCoordX = (x, y) =>
            this.transformMatrix.A * x + this.transformMatrix.B * y + this.transformMatrix.C;

        // F11 coord to svg coord
        const convertCoordY = (x, y) =>
            this.transformMatrix.B * x - this.transformMatrix.A * y + this.transformMatrix.D;

        const F11X = Number(F11XIn),
            F11Y = Number(F11YIn);
        const x = convertCoordX(F11X, F11Y),
            y = convertCoordY(F11X, F11Y);

        if (between(x, this.minCoord, this.maxCoord, true) && between(y, this.minCoord, this.maxCoord, true)) {
            this.printF11Coord(x, y, F11X, F11Y);
            //app.zoomAndPan(x, y, 1);
        }
    }

    transform(transform) {
        this.g.attr("transform", transform);
    }

    clearMap() {
        this.g.selectAll("*").remove();
    }
}

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

        $("#copy-coord").click(() => {
            registerEvent("Menu", "Copy F11 coordinates");
            this._copyCoordClicked();
        });
    }

    static getXCoord() {
        return +$("#x-coord").val();
    }

    static getZCoord() {
        return +$("#z-coord").val();
    }

    _f11Submitted() {
        const x = F11.getXCoord() * -1000,
            z = F11.getZCoord() * -1000;

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
        const x = F11.getXCoord(),
            z = F11.getZCoord();

        if (!Number.isNaN(x) && !Number.isNaN(z)) {
            const F11Url = new URL(window.location);
            F11Url.searchParams.set("x", x);
            F11Url.searchParams.set("z", z);
            this.constructor._copyF11ToClipboard(F11Url);
        }
    }

    _printF11Coord(x, y, F11X, F11Y) {
        const g = this._g.append("g").attr("transform", `translate(${x},${y})`);
        g.append("circle").attr("r", 10);
        g.append("text")
            .attr("dx", "-.6em")
            .attr("dy", "-.5em")
            .text(formatF11(F11X));
        g.append("text")
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

    checkF11Coord() {
        const urlParams = new URL(document.location).searchParams;

        if (urlParams.has("x") && urlParams.has("z")) {
            const x = +urlParams.get("x") * -1000,
                z = +urlParams.get("z") * -1000;

            registerEvent("Menu", "Paste F11 coordinates");
            this._goToF11(x, z);
        } else {
            // Remove trailing hash from URL
            history.pushState("", "", window.location.pathname);
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

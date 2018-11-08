/*
    f11.js
*/

import { select as d3Select } from "d3-selection";
import { between, formatF11 } from "./util";
import { convertCoordX, convertCoordY, convertInvCoordX, convertInvCoordY, insertBaseModal } from "./common";
import { registerEvent } from "./analytics";
import ShipCompare from "./ship-compare";
import WoodCompare from "./wood-compare";

/**
 * F11
 */
export default class F11 {
    constructor(map, coord) {
        this._map = map;
        this._coord = coord;

        this._baseName = "Go to F11";
        this._baseId = "go-to-f11";
        this._buttonId = `button-${this._baseId}`;
        this._modalId = `modal-${this._baseId}`;

        this._setupSvg();
        this._setupListener();
    }

    _setupSvg() {
        this._g = d3Select("#na-svg")
            .insert("g")
            .classed("f11", true);
    }

    _navbarClick(event) {
        registerEvent("Menu", "Go to F11");
        event.stopPropagation();
        this._f11Selected();
    }

    _setupListener() {
        document.getElementById(`${this._buttonId}`).addEventListener("click", event => this._navbarClick(event));
    }

    _injectModal() {
        insertBaseModal(this._modalId, this._baseName, "sm");
        /*

           <div class="dropdown-menu large-width p-2" id="moveToMenu" aria-labelledby="moveToDropdown">
                <div class="alert alert-primary" role="alert">
                    Use F11 in open world.
                </div>
                <form id="f11">
                    <div class="input-group mb-3">
                        <input class="form-control" id="x-coord" type="number" required placeholder="X" max="819"
                               min="-819" step="1">
                        <div class="input-group-append">
                            <span class="input-group-text">k</span>
                        </div>
                    </div>
                    <div class="input-group mb-3">
                        <input class="form-control" id="z-coord" type="number" required placeholder="Z" max="819"
                               min="-819" step="1">
                        <div class="input-group-append">
                            <span class="input-group-text">k</span>
                        </div>
                    </div>
                    <div class="alert alert-primary" role="alert">
                        <small>In k units (divide by 1,000).<br>Example: <em>43</em> for value of <em>43,162.5</em>.
                        </small>
                    </div>
                    <div class="float-right btn-group" role="group">
                        <button class="btn btn-outline-secondary" id="copy-coord" title="Copy to clipboard"
                                type="button"><i class="far fa-copy"></i>
                        </button>
                        <button class="btn btn-outline-secondary" type="submit">Move to</button>
                    </div>
                </form>
            </div>

 */
        const body = d3Select(`#${this._modalId} .modal-body`);
        const slider = body
            .append("form")
            .append("div")
            .attr("class", "form-group");

        $("#copy-coord").click(() => {
            registerEvent("Menu", "Copy F11 coordinates");
            this._copyCoordClicked();
        });
    }

    /**
     * Init modal
     * @returns {void}
     */
    _initModal() {
        this._injectModal();
    }

    _useUserInput() {}

    /**
     * Action when selected
     * @returns {void}
     */
    _f11Selected() {
        // If the modal has no content yet, insert it
        if (!document.getElementById(this._modalId)) {
            this._initModal();
        }
        // Show modal
        $(`#${this._modalId}`)
            .modal("show")
            .on("hidden.bs.modal", () => {
                this._useUserInput();
            });
    }

    static getXCoord() {
        return +$("#x-coord").val();
    }

    static getZCoord() {
        return +$("#z-coord").val();
    }

    _useUserInput() {
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

        if (between(x, this._coord.min, this._coord.max, true) && between(y, this._coord.min, this._coord.max, true)) {
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

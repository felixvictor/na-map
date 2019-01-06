/**
 * This file is part of na-map.
 *
 * @file      Show F11 coordinates.
 * @module    map-tools/show-f11
 * @author    iB aka Felix Victor
 * @copyright 2018
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { select as d3Select } from "d3-selection";
import { between, formatF11 } from "../util";
import { convertCoordX, convertCoordY, convertInvCoordX, convertInvCoordY, insertBaseModal } from "../common";
import { registerEvent } from "../analytics";

/**
 * ShowF11
 */
export default class ShowF11 {
    constructor(map, coord) {
        this._map = map;
        this._coord = coord;

        this._baseName = "Go to F11";
        this._baseId = "go-to-f11";
        this._buttonId = `button-${this._baseId}`;
        this._modalId = `modal-${this._baseId}`;
        this._formId = `form-${this._baseId}`;
        this._xInputId = `input-x-${this._baseId}`;
        this._zInputId = `input-z-${this._baseId}`;
        this._copyButtonId = `copy-coord-${this._baseId}`;
        this._submitButtonId = `submit-${this._baseId}`;

        this._modal$ = null;

        this._setupSvg();
        this._setupListener();
    }

    _setupSvg() {
        this._g = d3Select("#na-svg")
            .append("g")
            .classed("f11", true);
    }

    _navbarClick(event) {
        registerEvent("Menu", "Go to F11");
        event.stopPropagation();
        this._f11Selected();
    }

    _setupListener() {
        document.getElementById(`${this._buttonId}`).addEventListener("click", event => this._navbarClick(event));
        window.onkeydown = event => {
            if (event.code === "F11" && event.shiftKey) {
                this._navbarClick(event);
            }
        };
    }

    _injectModal() {
        insertBaseModal(this._modalId, this._baseName, "sm");

        const body = d3Select(`#${this._modalId} .modal-body`);
        const form = body
            .append("form")
            .attr("id", this._formId)
            .attr("role", "form");
        this._formSel = form.node();

        form.append("div")
            .classed("alert alert-primary", true)
            .text("Use F11 in open world.");

        const inputGroup1 = form
            .append("div")
            .classed("form-group", true)
            .append("div")
            .classed("input-group", true);
        inputGroup1.append("label").attr("for", this._xInputId);
        inputGroup1
            .append("input")
            .classed("form-control", true)
            .attr("id", this._xInputId)
            .attr("type", "number")
            .attr("required", "")
            .attr("placeholder", "X coordinate")
            .attr("min", "-819")
            .attr("max", "819")
            .attr("step", "1")
            .attr("tabindex", "1");

        inputGroup1
            .append("div")
            .classed("input-group-append", true)
            .append("span")
            .classed("input-group-text", true)
            .text("k");

        const inputGroup2 = form
            .append("div")
            .classed("form-group", true)
            .append("div")
            .classed("input-group", true);
        inputGroup2.append("label").attr("for", this._zInputId);
        inputGroup2
            .append("input")
            .classed("form-control", true)
            .attr("id", this._zInputId)
            .attr("type", "number")
            .attr("required", "")
            .attr("placeholder", "Z coordinate")
            .attr("step", "1")
            .attr("min", "-819")
            .attr("max", "819")
            .attr("tabindex", "2");
        inputGroup2
            .append("div")
            .classed("input-group-append", true)
            .append("span")
            .classed("input-group-text", true)
            .text("k");

        form.append("div")
            .classed("alert alert-primary", true)
            .append("small")
            .html("In k units (divide by 1,000).<br>Example: <em>43</em> for value of <em>43,162.5</em>.");

        const buttonGroup = form
            .append("div")
            .classed("float-right btn-group", true)
            .attr("role", "group");

        const button = buttonGroup
            .append("button")
            .classed("btn btn-outline-secondary", true)
            .attr("id", this._copyButtonId)
            .attr("title", "Copy to clipboard (ctrl-c)")
            .attr("type", "button");
        button.append("i").classed("far fa-copy", true);
        buttonGroup
            .append("button")
            .classed("btn btn-outline-secondary", true)
            .attr("id", this._submitButtonId)
            .attr("title", "Go to")
            .attr("type", "submit")
            .text("Go to");

        const footer = d3Select(`#${this._modalId} .modal-footer`);
        footer.remove();
    }

    /**
     * Init modal
     * @returns {void}
     */
    _initModal() {
        this._injectModal();
    }

    /**
     * Action when selected
     * @returns {void}
     */
    _f11Selected() {
        // If the modal has no content yet, insert it
        if (!this._modal$) {
            this._initModal();
            this._modal$ = $(`#${this._modalId}`);
            this._xInputSel = document.getElementById(this._xInputId);
            this._zInputSel = document.getElementById(this._zInputId);
            // Submit handler
            this._formSel.onsubmit = event => {
                this._modal$.modal("hide");
                event.preventDefault();
                this._useUserInput();
            };

            // Copy coordinates to clipboard (ctrl-c key event)
            this._modal$.on("keydown", event => {
                if (event.code === "KeyC" && event.ctrlKey) {
                    this._copyCoordClicked(event);
                }
            });
            // Copy coordinates to clipboard (click event)
            document.getElementById(this._copyButtonId).addEventListener("click", event => {
                this._copyCoordClicked(event);
            });
        }

        // Show modal
        this._modal$.modal("show");
        this._xInputSel.focus();
        this._xInputSel.select();
    }

    _getInputValue(elem) {
        const { value } = elem;
        return value === "" ? Infinity : +value;
    }

    _getXCoord() {
        return this._getInputValue(this._xInputSel);
    }

    _getZCoord() {
        return this._getInputValue(this._zInputSel);
    }

    _useUserInput() {
        const x = this._getXCoord() * -1000;
        const z = this._getZCoord() * -1000;

        if (Number.isFinite(x) && Number.isFinite(z)) {
            this._goToF11(x, z);
        }
    }

    _copyCoordClicked(event) {
        /**
         * Copy to clipboard (fallback solution)
         * @param {string} text - String
         * @return {bool} Success
         */
        const copyToClipboardFallback = text => {
            if (document.queryCommandSupported && document.queryCommandSupported("copy")) {
                const input = document.createElement("input");

                input.type = "text";
                input.value = text;
                input.style = "position: absolute; left: -1000px; top: -1000px";
                this._modal$.append(input);
                input.select();

                try {
                    return document.execCommand("copy");
                } catch (error) {
                    console.error("Copy to clipboard failed.", error);
                    return false;
                } finally {
                    input.remove();
                }
            } else {
                console.error(`Insufficient rights to copy ${text} to clipboard`);
                return false;
            }
        };

        /**
         * Copy to clipboard (clipboard API)
         * @param {string} text - String
         * @return {void}
         */
        const copyToClipboard = text =>
            navigator.permissions.query({ name: "clipboard-write" }).then(
                // Permission "clipboard-write"
                result => {
                    if (result.state === "granted" || result.state === "prompt") {
                        return navigator.clipboard.writeText(text).then(
                            () => true,
                            () => {
                                console.error(`Cannot copy ${text} to clipboard`);
                                return false;
                            }
                        );
                    }
                },
                // No permission "clipboard-write"
                () => copyToClipboardFallback(text)
            );

        registerEvent("Menu", "Copy F11 coordinates");
        event.preventDefault();

        const x = this._getXCoord();
        const z = this._getZCoord();

        if (Number.isFinite(x) && Number.isFinite(z)) {
            const F11Url = new URL(window.location);

            F11Url.searchParams.set("x", x);
            F11Url.searchParams.set("z", z);

            copyToClipboard(F11Url.href);
        }
    }

    _printF11Coord(x, y, F11X, F11Y) {
        let circleSize = 10;
        const g = this._g.append("g").attr("transform", `translate(${x},${y})`);
        const rect = g.append("rect");
        g.append("circle").attr("r", circleSize);

        // Include padding
        circleSize *= 1.6;
        const F11Xtext = g
            .append("text")
            .attr("dx", `${-circleSize}px`)
            .attr("dy", `${-circleSize / 2}px`)
            .text(formatF11(F11X));
        const F11Ytext = g
            .append("text")
            .attr("dx", `${-circleSize}px`)
            .attr("dy", `${circleSize / 2}px`)
            .text(formatF11(F11Y));

        const F11Xdim = F11Xtext.node().getBBox();
        const F11Ydim = F11Ytext.node().getBBox();
        const height = Math.round(F11Xdim.height + F11Ydim.height);
        const width = Math.round(Math.max(F11Xdim.width, F11Ydim.width) + 5);
        rect.attr("x", -width - circleSize)
            .attr("y", -height / 2)
            .attr("height", height)
            .attr("width", width + circleSize);
    }

    _goToF11(F11XIn, F11YIn) {
        const F11X = +F11XIn;
        const F11Y = +F11YIn;
        const x = Math.floor(convertCoordX(F11X, F11Y));
        const y = Math.floor(convertCoordY(F11X, F11Y));

        if (between(x, this._coord.min, this._coord.max, true) && between(y, this._coord.min, this._coord.max, true)) {
            this._printF11Coord(x, y, F11X, F11Y);
            this._map.zoomAndPan(x, y, 1);
        }
    }

    checkF11Coord() {
        const urlParams = new URL(document.location).searchParams;

        if (urlParams.has("x") && urlParams.has("z")) {
            const x = +urlParams.get("x") * -1000;
            const z = +urlParams.get("z") * -1000;

            registerEvent("Menu", "Paste F11 coordinates");
            this._goToF11(x, z);
        } else {
            // Remove trailing hash from URL
            history.pushState("", "", window.location.pathname);
        }
    }

    printCoord(x, y) {
        const F11X = convertInvCoordX(x, y);
        const F11Y = convertInvCoordY(x, y);

        this._printF11Coord(x, y, F11X, F11Y);
    }

    transform(transform) {
        this._g.attr("transform", transform);
    }

    clearMap() {
        this._g.selectAll("*").remove();
    }
}

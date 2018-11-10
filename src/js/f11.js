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
        this._formId = `form-${this._baseId}`;
        this._xInputId = `input-x-${this._baseId}`;
        this._zInputId = `input-z-${this._baseId}`;
        this._copyButtonId = `copy-coord-${this._baseId}`;
        this._submitButtonId = `submit-${this._baseId}`;

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
            .attr("title", "Copy to clipboard")
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
        if (!document.getElementById(this._modalId)) {
            this._initModal();
            document.getElementById(this._formId).onsubmit = event => {
                $(`#${this._modalId}`).modal("hide");
                event.preventDefault();
                this._useUserInput();
            };
            document.getElementById(`${this._copyButtonId}`).addEventListener("click", () => {
                registerEvent("Menu", "Copy F11 coordinates");
                this._copyCoordClicked();
            });
        }

        // Show modal
        $(`#${this._modalId}`).modal("show");
        d3Select(`#${this._xInputId}`)
            .node()
            .focus();
    }

    _getInputValue(id) {
        let { value } = document.getElementById(id);
        if (value === "") {
            value = Infinity;
        } else {
            value = +value;
        }
        return value;
    }

    _getXCoord() {
        return this._getInputValue(this._xInputId);
    }

    _getZCoord() {
        return this._getInputValue(this._zInputId);
    }

    _useUserInput() {
        const x = this._getXCoord() * -1000,
            z = this._getZCoord() * -1000;

        if (x !== -Infinity && z !== -Infinity) {
            this._goToF11(x, z);
        }
    }

    _copyCoordClicked() {
        /**
         * {@link https://stackoverflow.com/questions/400212/how-do-i-copy-to-the-clipboard-in-javascript}
         * @param {string} text - String
         * @return {void}
         */
        const copyToClipboard = text => {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();

            try {
                const successful = document.execCommand("copy"),
                    msg = successful ? "successful" : "unsuccessful";
                console.log(`Copying text to clipboard was ${msg}`);
            } catch (err) {
                console.error("Cannot copy text to clipboard", err);
            }

            document.body.removeChild(textArea);
        };

        console.log("_copyCoordClicked");
        const x = this._getXCoord(),
            z = this._getZCoord();

        if (!Number.isNaN(x) && !Number.isNaN(z)) {
            const F11Url = new URL(window.location);

            F11Url.searchParams.set("x", x);
            F11Url.searchParams.set("z", z);
            copyToClipboard(F11Url);
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

        console.log("checkF11Coord", { urlParams }, urlParams.has("x") && urlParams.has("z"));

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

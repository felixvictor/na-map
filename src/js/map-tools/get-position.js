/**
 * This file is part of na-map.
 *
 * @file      Get position.
 * @module    get-position
 * @author    iB aka Felix Victor
 * @copyright 2018
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import "bootstrap/js/dist/util";
import "bootstrap/js/dist/modal";
import { select as d3Select } from "d3-selection";

import { registerEvent } from "../analytics";
import { circleRadiusFactor, convertInvCoordX, convertInvCoordY, insertBaseModal } from "../common";
import { copyF11ToClipboard, sortBy } from "../util";
import Toast from "../util/toast";

/**
 * JavaScript implementation of Trilateration to find the position of a
 * point (P4) from three known points in 3D space (P1, P2, P3) and their
 * distance from the point in question.
 *
 * The solution used here is based on the derivation found on the Wikipedia
 * page of Trilateration: https://en.wikipedia.org/wiki/Trilateration
 *
 * This library does not need any 3rd party tools as all the non-basic
 * geometric functions needed are declared inside the trilaterate() function.
 *
 * See the GitHub page: https://github.com/gheja/trilateration.js
 */

/**
 * Calculates the coordinates of a point in 3D space from three known points
 * and the distances between those points and the point in question.
 *
 * If no solution found then null will be returned.
 *
 * If two solutions found then both will be returned, unless the fourth
 * parameter (return_middle) is set to true when the middle of the two solution
 * will be returned.
 *
 * @param {object} p1 Point and distance: { x, y, z, r }
 * @param {object} p2 Point and distance: { x, y, z, r }
 * @param {object} p3 Point and distance: { x, y, z, r }
 * @param {boolean} returnMiddle If two solutions found then return the center of them
 * @return {object|Array|null} { x, y, z } or [ { x, y, z }, { x, y, z } ] or null
 */
function trilaterate(p1, p2, p3, returnMiddle = false) {
    // based on: https://en.wikipedia.org/wiki/Trilateration

    // some additional local functions declared here for
    // scalar and vector operations

    const sqr = a => a * a;

    const norm = a => Math.sqrt(sqr(a.x) + sqr(a.y) + sqr(a.z));

    const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;

    const vectorSubtract = (a, b) => ({
        x: a.x - b.x,
        y: a.y - b.y,
        z: a.z - b.z
    });

    const vectorAdd = (a, b) => ({
        x: a.x + b.x,
        y: a.y + b.y,
        z: a.z + b.z
    });

    const vectorDivide = (a, b) => ({
        x: a.x / b,
        y: a.y / b,
        z: a.z / b
    });

    const vectorMultiply = (a, b) => ({
        x: a.x * b,
        y: a.y * b,
        z: a.z * b
    });

    const vectorCross = (a, b) => ({
        x: a.y * b.z - a.z * b.y,
        y: a.z * b.x - a.x * b.z,
        z: a.x * b.y - a.y * b.x
    });

    const ex = vectorDivide(vectorSubtract(p2, p1), norm(vectorSubtract(p2, p1)));
    const i = dot(ex, vectorSubtract(p3, p1));
    let a = vectorSubtract(vectorSubtract(p3, p1), vectorMultiply(ex, i));
    const ey = vectorDivide(a, norm(a));
    const ez = vectorCross(ex, ey);
    const d = norm(vectorSubtract(p2, p1));
    const j = dot(ey, vectorSubtract(p3, p1));

    const x = (sqr(p1.r) - sqr(p2.r) + sqr(d)) / (2 * d);
    const y = (sqr(p1.r) - sqr(p3.r) + sqr(i) + sqr(j)) / (2 * j) - (i / j) * x;

    let b = sqr(p1.r) - sqr(x) - sqr(y);

    // floating point math flaw in IEEE 754 standard
    // see https://github.com/gheja/trilateration.js/issues/2
    if (Math.abs(b) < 0.0000000001) {
        b = 0;
    }

    const z = Math.sqrt(b);

    // no solution found
    if (isNaN(z)) {
        return null;
    }

    a = vectorAdd(p1, vectorAdd(vectorMultiply(ex, x), vectorMultiply(ey, y)));
    const p4a = vectorAdd(a, vectorMultiply(ez, z));
    const p4b = vectorSubtract(a, vectorMultiply(ez, z));

    if (z === 0 || returnMiddle) {
        return a;
    }

    return [p4a, p4b];
}

/**
 * Get position
 */
export default class TrilateratePosition {
    /**
     * @param {object} ports - Port data
     */
    constructor(ports) {
        this._ports = ports;

        // Number of input port distances
        this._NumberOfInputs = 3;
        this._baseName = "Get position";
        this._baseId = "get-position";
        this._buttonId = `button-${this._baseId}`;
        this._modalId = `modal-${this._baseId}`;
        this._modal$ = null;

        this._select = [];
        this._input = [];
        this._selector = [];
        [...new Array(this._NumberOfInputs).keys()].forEach(inputNumber => {
            this._select[inputNumber] = `${this._baseId}-${inputNumber}-select`;
            this._input[inputNumber] = `${this._baseId}-${inputNumber}-input`;
        });

        this._setupListener();
    }

    _navbarClick(event) {
        registerEvent("Menu", "Get position");
        event.stopPropagation();
        this._positionSelected();
    }

    /**
     * Setup menu item listener
     * @returns {void}
     */
    _setupListener() {
        document.getElementById(`${this._buttonId}`).addEventListener("click", event => this._navbarClick(event));
    }

    _injectModal() {
        insertBaseModal(this._modalId, this._baseName, "", "Go");

        const body = d3Select(`#${this._modalId} .modal-body`);
        body.append("div")
            .attr("class", "alert alert-primary")
            .attr("role", "alert")
            .text("Use in-game trader tool.");

        const form = body.append("form");
        const dataList = form.append("datalist").attr("id", "defaultDistances");
        [5, 10, 15, 20, 30, 50, 100, 200].forEach(distance => {
            dataList.append("option").attr("value", distance);
        });

        [...new Array(this._NumberOfInputs).keys()].forEach(inputNumber => {
            const formRow = form.append("div").attr("class", "form-row");
            formRow
                .append("div")
                .attr("class", "col-md-6")
                .append("label")
                .append("select")
                .attr("name", this._select[inputNumber])
                .attr("id", this._select[inputNumber])
                .attr("class", "selectpicker");
            formRow
                .append("div")
                .attr("class", "col-md-6")
                .append("input")
                .attr("id", this._input[inputNumber])
                .attr("name", this._input[inputNumber])
                .attr("type", "number")
                .attr("class", "form-control")
                .attr("placeholder", "Distance in k")
                .attr("step", 1)
                .attr("list", "defaultDistances")
                .attr("min", 0)
                .attr("max", 1000);
        });
    }

    _setupSelects() {
        const selectPorts = this._ports.portDataDefault
            .map(d => ({
                id: d.id,
                coord: [d.coordinates[0], d.coordinates[1]],
                name: d.name,
                nation: d.nation
            }))
            .sort(sortBy(["name"]));

        const options = `${selectPorts
            .map(port => `<option data-subtext="${port.nation}">${port.name}</option>`)
            .join("")}`;

        [...new Array(this._NumberOfInputs).keys()].forEach(inputNumber => {
            this._selector[inputNumber] = document.getElementById(this._select[inputNumber]);

            this._selector[inputNumber].insertAdjacentHTML("beforeend", options);
            $(this._selector[inputNumber]).selectpicker({
                dropupAuto: false,
                liveSearch: true,
                liveSearchNormalize: true,
                liveSearchPlaceholder: "Search ...",
                title: "Select port",
                virtualScroll: true
            });
        });
    }

    /**
     * Init modal
     * @returns {void}
     */
    _initModal() {
        this._injectModal();
        this._setupSelects();
    }

    /**
     * Use user input and show position
     * @return {void}
     * @private
     */
    _useUserInput() {
        /**
         * Show and go to Position
         * @return {void}
         */
        const showAndGoToPosition = () => {
            const circles = this._ports.portData.map(port => ({
                x: port.coordinates[0],
                y: port.coordinates[1],
                z: 0,
                r: port.distance
            }));

            const position = trilaterate(circles[0], circles[1], circles[2], true);

            // If intersection is found
            if (position) {
                position.x = Math.round(position.x);
                position.y = Math.round(position.y);

                this._ports._map._f11.printCoord(position.x, position.y);
                this._ports._map.zoomAndPan(position.x, position.y, 1);

                const coordX = Math.round(convertInvCoordX(position.x, position.y) / -1000);
                const coordY = Math.round(convertInvCoordY(position.x, position.y) / -1000);
                copyF11ToClipboard(coordX, coordY);

                // eslint-disable-next-line no-new
                new Toast("Get position", "Coordinates copied to clipboard.");
            } else {
                // eslint-disable-next-line no-new
                new Toast("Get position", "No intersection found.");
            }
        };

        const roundingFactor = 1.04;

        /*
        const ports = new Map([
            ["Les Cayes", 21 * circleRadiusFactor],
            ["Saint-Louis", 29 * circleRadiusFactor],
            ["Tiburon", 34 * circleRadiusFactor],
            ["Kingston / Port Royal", 132 * circleRadiusFactor]
        ]);
        const ports = new Map([
            ["Gracias a Dios", 52 * roundingFactor * circleRadiusFactor],
            ["Port Morant", 296 * roundingFactor * circleRadiusFactor],
            ["Santanillas", 82 * roundingFactor * circleRadiusFactor]
        ]);
        */

        const ports = new Map();

        [...new Array(this._NumberOfInputs).keys()].forEach(inputNumber => {
            const port = this._selector[inputNumber].selectedIndex
                ? this._selector[inputNumber].options[this._selector[inputNumber].selectedIndex].text
                : "";
            const distance = Number(document.getElementById(this._input[inputNumber]).value);

            if (distance && port !== "") {
                ports.set(port, distance * roundingFactor * circleRadiusFactor);
            }
        });

        if (ports.size === this._NumberOfInputs) {
            this._ports.setShowRadiusSetting("position");
            this._ports.portData = JSON.parse(
                JSON.stringify(
                    this._ports.portDataDefault
                        .filter(port => ports.has(port.name))
                        .map(port => {
                            // eslint-disable-next-line prefer-destructuring,no-param-reassign
                            port.distance = ports.get(port.name);
                            return port;
                        })
                )
            );
            this._ports.update();
            showAndGoToPosition();
        } else {
            // eslint-disable-next-line no-new
            new Toast("Get position", "Not enough data.");
        }
    }

    /**
     * Action when selected
     * @returns {void}
     */
    _positionSelected() {
        // If the modal has no content yet, insert it
        if (!this._modal$) {
            this._initModal();
            this._modal$ = $(`#${this._modalId}`);
        }

        // Show modal
        this._modal$.modal("show").one("hidden.bs.modal", () => {
            this._useUserInput();
        });
    }
}

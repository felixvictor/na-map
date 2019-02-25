/**
 * This file is part of na-map.
 *
 * @file      Get position.
 * @module    get-position
 * @author    iB aka Felix Victor
 * @copyright 2018
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { curveBasis as d3CurveBasis, line as d3Line } from "d3-shape";
import { select as d3Select } from "d3-selection";
import { intersectionArea as vennIntersectionArea } from "venn.js/src/circleintersection";

import { registerEvent } from "../analytics";
import { circleRadiusFactor, insertBaseModal } from "../common";
import { sortBy } from "../util";

import Toast from "../util/toast";

/**
 * Get position
 */
export default class TrilateratePosition {
    /**
     */
    constructor(ports) {
        this._ports = ports;

        // Number of input port distances
        this._inputs = 4;
        this._baseName = "Get position";
        this._baseId = "get-position";
        this._buttonId = `button-${this._baseId}`;
        this._modalId = `modal-${this._baseId}`;

        this._modal$ = null;

        this._setupSvg();
        this._setupListener();
    }

    _setupSvg() {
        this._gPosition = d3Select("#ports")
            .append("g")
            .attr("data-ui-component", "position");
        this._path = this._gPosition.append("path").attr("class", "bubble pos");
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

        Array.from(Array(this._inputs).keys()).forEach(row => {
            const select = `${this._baseId}-${row}-select`,
                input = `${this._baseId}-${row}-input`;
            const formRow = form.append("div").attr("class", "form-row");
            formRow
                .append("div")
                .attr("class", "col-md-6")
                .append("label")
                .append("select")
                .attr("name", select)
                .attr("id", select);
            formRow
                .append("div")
                .attr("class", "col-md-6")
                .append("input")
                .attr("id", input)
                .attr("name", input)
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
        const selectPickerDefaults = {
            noneSelectedText: "",
            dropupAuto: false
        };
        const selectPickerLiveSearch = JSON.parse(JSON.stringify(selectPickerDefaults));
        selectPickerLiveSearch.liveSearch = true;
        selectPickerLiveSearch.liveSearchPlaceholder = "Search ...";
        selectPickerLiveSearch.liveSearchNormalize = true;

        selectPickerLiveSearch.noneSelectedText = "Select port";

        const selectPorts = this._ports.portDataDefault
            .map(d => ({
                id: d.id,
                coord: [d.coordinates[0], d.coordinates[1]],
                name: d.name,
                nation: d.nation
            }))
            .sort(sortBy(["name"]));

        const options = `${selectPorts
            .map(
                port =>
                    `<option data-subtext="${port.nation}" value="${port.coord}" data-id="${port.id}">${
                        port.name
                    }</option>`
            )
            .join("")}`;

        Array.from(Array(this._inputs).keys()).forEach(row => {
            const select = `${this._baseId}-${row}-select`,
                selector = document.getElementById(select),
                selector$ = $(`#${select}`);

            selector.insertAdjacentHTML("beforeend", options);
            selector$
                .selectpicker(selectPickerLiveSearch)
                .val("default")
                .selectpicker("refresh");
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
            /**
             * Get additional points to better represent position area
             * Adapted from {@link https://github.com/benfred/bens-blog-code/blob/master/circle-intersection/circle-intersection-vis.js}
             * @param {object} area - Position area
             * @return {Array<number, number>} Points
             */
            const getAreaPoints = area => {
                const points = [],
                    samples = 32;

                area.arcs.forEach(arc => {
                    const { p1, p2, circle } = arc;
                    const a1 = Math.atan2(p1.x - circle.x, p1.y - circle.y),
                        a2 = Math.atan2(p2.x - circle.x, p2.y - circle.y);

                    let angleDiff = a2 - a1;
                    if (angleDiff < 0) {
                        angleDiff += 2 * Math.PI;
                    }

                    const angleDelta = angleDiff / samples;
                    Array.from(Array(samples).keys()).forEach(i => {
                        const angle = a2 - angleDelta * i;

                        const extended = {
                            x: circle.x + circle.radius * Math.sin(angle),
                            y: circle.y + circle.radius * Math.cos(angle)
                        };
                        points.push([Math.floor(extended.x), Math.floor(extended.y)]);
                    });
                });

                return points;
            };

            /**
             * @typedef {object} Area
             * @property {number} arcArea - Arc area
             * @property {object} arcs - Arcs
             * @property {number} area - Area
             * @property {Array<number, number>} innerPoints - Inner points of intersection
             * @property {Array<number, number>} intersectionPoints - Points of all intersection circles
             * @property {number} polygonArea - Polygon Area
             */

            /**
             * Display position area
             * @param {Area} area - Position area
             * @return {void}
             */
            const displayArea = area => {
                const points = getAreaPoints(area);

                const line = d3Line().curve(d3CurveBasis);
                this._path.attr("d", line(points));
            };

            /**
             * Get intersection Area
             * @return {Area} Intersection data
             */
            const getIntersectionArea = () => {
                const circles = this._ports.portData.map(port => ({
                        x: port.coordinates[0],
                        y: port.coordinates[1],
                        radius: port.distance
                    })),
                    stats = {};

                vennIntersectionArea(circles, stats);
                return stats;
            };

            const area = getIntersectionArea();

            // If intersection is found
            if (area.innerPoints.length) {
                displayArea(area);

                const bbox = this._path.node().getBBox();
                const centroid = { x: bbox.x + bbox.width / 2, y: bbox.y + bbox.height / 2 };

                this._ports._map._f11.printCoord(centroid.x, centroid.y);
                this._ports._map.zoomAndPan(centroid.x, centroid.y, 1);
            } else {
                new Toast("Get position", "No intersection found.");
            }
        };

        const roundingFactor = 1.05;

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

        Array.from(Array(this._inputs).keys()).forEach(row => {
            const select = `${this._baseId}-${row}-select`,
                selectSelector$ = $(`#${select}`),
                input = `${this._baseId}-${row}-input`,
                inputSelector$ = $(`#${input}`);

            const port = selectSelector$.find(":selected")[0] ? selectSelector$.find(":selected")[0].text : "";
            const distance = +inputSelector$.val();

            if (distance && port !== "") {
                ports.set(port, distance * roundingFactor * circleRadiusFactor);
            }
        });

        if (ports.size >= 2) {
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

    /**
     * Clear map
     * @return {void}
     */
    clearMap() {
        this._path.attr("d", null);
    }
}

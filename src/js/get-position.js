/**
 * This file is part of na-map.
 *
 * @file      Get position.
 * @module    get-position
 * @author    iB aka Felix Victor
 * @copyright 2018
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { range as d3Range } from "d3-array";
import { scaleLinear as d3ScaleLinear } from "d3-scale";
import { select as d3Select } from "d3-selection";

import { registerEvent } from "./analytics";
import { circleRadiusFactor, insertBaseModal } from "./common";

/**
 * Get position
 */
export default class TriangulatePosition {
    /**
     */
    constructor(ports) {
        this._ports = ports;

        this._minutesForFullCircle = 48;
        this._fullCircle = 360;
        this._degreesPerMinute = this._fullCircle / this._minutesForFullCircle;
        this._degreesSegment = 15;
        this._minOWSpeed = 2;
        this._owSpeedFactor = 2;

        this._speedScale = d3ScaleLinear().domain(d3Range(0, this._fullCircle, this._degreesSegment));

        this._defaultShipName = "None";
        this._defaultShipSpeed = 19;
        this._defaultStartWindDegrees = 0;

        // Number of input port distances
        this._inputs = 4;
        this._baseName = "Get position";
        this._baseId = "get-position";
        this._buttonId = `button-${this._baseId}`;
        this._modalId = `modal-${this._baseId}`;

        this._initData();
        this._setupListener();
    }

    _initData() {}

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
        document.getElementById("positionNavbar").addEventListener("click", event => this._navbarClick(event));
    }

    _injectModal() {
        insertBaseModal(this._modalId, this._baseName, "", "Go");

        const body = d3Select(`#${this._modalId} .modal-body`);
        body.append("p").text("Get distances from in-game trader tool");
        const form = body.append("form");

        const dataList = form.append("datalist").attr("id", "defaultDistances");
        [5, 10, 15, 20, 30, 50, 100, 200].forEach(distance => {
            dataList.append("option").attr("value", distance);
        });

        Array.from(Array(this._inputs).keys()).forEach(row => {
            const select = `${this._baseId}-${row}-select`,
                input = `${this._baseId}-${row}-input`;
            const formRow = form.append("div").classed("form-row", true);
            formRow
                .append("div")
                .classed("col-md-6", true)
                .append("label")
                .append("select")
                .attr("name", select)
                .attr("id", select);
            formRow
                .append("div")
                .classed("col-md-5", true)
                .append("input")
                .attr("id", input)
                .attr("name", input)
                .attr("type", "number")
                .classed("form-control", true)
                .attr("placeholder", "Distance in k")
                .attr("step", 5)
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
                coord: [d.geometry.coordinates[0], d.geometry.coordinates[1]],
                name: d.properties.name,
                nation: this._ports.pbData.ports.filter(port => port.id === d.id).map(port => port.nation)
            }))
            .sort((a, b) => {
                if (a.name < b.name) {
                    return -1;
                }
                if (a.name > b.name) {
                    return 1;
                }
                return 0;
            });

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

    _useUserInput() {
        const ports = new Map();

        Array.from(Array(this._inputs).keys()).forEach(row => {
            const select = `${this._baseId}-${row}-select`,
                selectSelector$ = $(`#${select}`),
                input = `${this._baseId}-${row}-input`,
                inputSelector$ = $(`#${input}`);

            const port = selectSelector$.find(":selected")[0] ? selectSelector$.find(":selected")[0].text : "",
                distance = +inputSelector$.val();

            if (distance && port !== "") {
                ports.set(port, distance * circleRadiusFactor);
            }
        });

        this._ports.showRadiusSetting = "position";
        this._ports.portData = this._ports.portDataDefault.filter(port => ports.has(port.properties.name)).map(port => {
            // eslint-disable-next-line prefer-destructuring,no-param-reassign
            port.properties.distance = ports.get(port.properties.name);
            return port;
        });
        this._ports.update();
    }

    /**
     * Action when selected
     * @returns {void}
     */
    _positionSelected() {
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
}

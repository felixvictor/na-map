/*!
 * This file is part of na-map.
 *
 * @file      Port ownership list.
 * @module    game-tools/list-port-ownerships
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import "bootstrap/js/dist/util";
import "bootstrap/js/dist/modal";
import "bootstrap-select/js/bootstrap-select";
import { areaLabel as d3AreaLabel } from "d3-area-label";
import { extent as d3Extent, max as d3Max, min as d3Min } from "d3-array";
import { axisBottom as d3AxisBottom } from "d3-axis";
import { scaleLinear as d3ScaleLinear, scaleOrdinal as d3ScaleOrdinal, scaleTime as d3ScaleTime, } from "d3-scale";
import { select as d3Select } from "d3-selection";
import { area as d3Area, curveBasis as d3CurveBasis, stack as d3Stack, stackOffsetNone as d3StackOffsetNone, } from "d3-shape";
import TimelinesChart from "timelines-chart";
import { registerEvent } from "../analytics";
import { nations, putImportError } from "../../common/common";
import { colourList, insertBaseModal } from "../../common/common-browser";
export default class ListPortOwnerships {
    constructor() {
        this._ownershipData = {};
        this._nationData = {};
        this._baseName = "Port ownership";
        this._baseId = "ownership-list";
        this._buttonId = `button-${this._baseId}`;
        this._modalId = `modal-${this._baseId}`;
        this._colourScale = d3ScaleOrdinal().range(colourList);
        this._setupListener();
    }
    static getHeight() {
        const factor = 0.75;
        return Math.floor(top.innerHeight * factor);
    }
    _getWidth() {
        var _a;
        return (_a = Math.floor(this._mainDiv.node().offsetWidth)) !== null && _a !== void 0 ? _a : 0;
    }
    async _loadAndSetupData() {
        try {
            this._nationData = (await import("Lib/gen-generic/nations.json"))
                .default;
            this._ownershipData = (await import("Lib/gen-generic/ownership.json")).default;
        }
        catch (error) {
            putImportError(error);
        }
    }
    _setupListener() {
        var _a;
        let firstClick = true;
        (_a = document.querySelector(`#${this._buttonId}`)) === null || _a === void 0 ? void 0 : _a.addEventListener("click", async (event) => {
            if (firstClick) {
                firstClick = false;
                await this._loadAndSetupData();
            }
            registerEvent("Tools", this._baseName);
            event.stopPropagation();
            this._ownershipListSelected();
        });
    }
    _injectModal() {
        insertBaseModal({ id: this._modalId, title: this._baseName });
        const select = `${this._baseId}-select`;
        const body = d3Select(`#${this._modalId} .modal-body`);
        body.append("label").append("select").attr("name", select).attr("id", select);
        this._mainDiv = body.append("div").attr("id", `${this._baseId}`);
        this._div = this._mainDiv.append("div");
        this._svg = this._mainDiv.append("svg").attr("class", "area");
    }
    _getOptions() {
        return `${this._ownershipData
            .map((region) => `<option value="${region.region}">${region.region}</option>;`)
            .join("")}`;
    }
    _setupSelect() {
        const select$ = $(`#${this._baseId}-select`);
        const options = this._getOptions();
        select$.append(options);
    }
    _setupSelectListener() {
        const select$ = $(`#${this._baseId}-select`);
        select$
            .addClass("selectpicker")
            .on("change", (event) => this._regionSelected(event))
            .selectpicker({ noneSelectedText: "Select region" })
            .val("default")
            .selectpicker("refresh");
    }
    _initModal() {
        this._injectModal();
        this._setupSelect();
        this._setupSelectListener();
    }
    _ownershipListSelected() {
        let emptyModal = false;
        if (!document.querySelector(`#${this._modalId}`)) {
            emptyModal = true;
            this._initModal();
        }
        $(`#${this._modalId}`)
            .on("shown.bs.modal", () => {
            if (emptyModal) {
                this._injectArea();
                emptyModal = false;
            }
        })
            .modal("show");
    }
    _injectArea() {
        const width = this._getWidth();
        const maxHeight = 1000;
        const height = Math.min(maxHeight, ListPortOwnerships.getHeight());
        const margin = { right: 32, bottom: 32, left: 32 };
        const keys = nations.filter((nation) => nation.id !== 9).map((nation) => nation.short);
        const nationData = this._nationData;
        nationData.keys = keys;
        const stacked = d3Stack()
            .offset(d3StackOffsetNone)
            .keys(keys)(nationData);
        const setXAxis = (g) => {
            const xTimeScale = d3ScaleTime()
                .domain(d3Extent(nationData, (d) => new Date(d.date)))
                .range([margin.left, width - margin.right]);
            g.attr("transform", `translate(0,${height - margin.bottom})`).call(d3AxisBottom(xTimeScale)
                .ticks(width / 80)
                .tickSizeOuter(0));
            g.attr("font-size", ".8rem").attr("font-family", "");
        };
        const getArea = () => {
            const xScale = d3ScaleLinear()
                .domain(d3Extent(nationData, (d) => new Date(d.date)))
                .range([margin.left, width - margin.right]);
            const yScale = d3ScaleLinear()
                .domain([d3Min(stacked[0], (d) => d[0]), d3Max(stacked[stacked.length - 1], (d) => d[1])])
                .range([height - margin.bottom, 0]);
            const area = d3Area()
                .x((d) => xScale(new Date(d.data.date)))
                .y0((d) => yScale(d[0]))
                .y1((d) => yScale(d[1]))
                .curve(d3CurveBasis);
            return area;
        };
        const render = () => {
            const area = getArea();
            const labelNames = new Map(nations.map((nation) => [nation.short, nation.name]));
            this._colourScale.domain(keys);
            this._svg
                .selectAll("path")
                .data(stacked)
                .join((enter) => enter
                .append("path")
                .attr("fill", (d) => this._colourScale(d.key))
                .attr("stroke", (d) => this._colourScale(d.key))
                .attr("d", area));
            this._svg
                .selectAll(".area-label")
                .data(stacked)
                .join((enter) => enter
                .append("text")
                .attr("class", "area-label")
                .text((d) => labelNames.get(d.key))
                .attr("transform", d3AreaLabel(area)));
        };
        this._svg.attr("width", width).attr("height", height);
        render();
        this._svg.append("g").call(setXAxis);
    }
    _injectChart(data) {
        TimelinesChart()
            .data(data)
            .enableAnimations(false)
            .timeFormat("%-d %B %Y")
            .zQualitative(true)
            .zColorScale(this._colourScale)
            .width(this._getWidth())(this._div.node());
    }
    _regionSelected(event) {
        const regionSelected = $(event.currentTarget).find(":selected").val();
        this._div.selectAll("*").remove();
        const regionData = this._ownershipData
            .filter((region) => region.region === regionSelected)
            .map((region) => region.data)[0];
        this._injectChart(regionData);
    }
}
//# sourceMappingURL=list-port-ownerships.js.map
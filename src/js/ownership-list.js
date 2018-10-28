/**
 * This file is part of na-map.
 *
 * @file      Port ownership list.
 * @module    ownership-list
 * @author    iB aka Felix Victor
 * @copyright 2018
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { areaLabel as d3AreaLabel } from "d3-area-label";
import { extent as d3Extent, max as d3Max, min as d3Min } from "d3-array";
import { axisBottom as d3AxisBottom } from "d3-axis";
import { scaleLinear as d3ScaleLinear, scaleOrdinal as d3ScaleOrdinal, scaleTime as d3ScaleTime } from "d3-scale";
import { select as d3Select } from "d3-selection";
import {
    area as d3Area,
    curveBasis as d3CurveBasis,
    stack as d3Stack,
    stackOffsetNone as d3StackOffsetNone
} from "d3-shape";
import TimelinesChart from "timelines-chart";

import { registerEvent } from "./analytics";
import { insertBaseModal, nations } from "./common";

// https://stackoverflow.com/questions/1144783/how-to-replace-all-occurrences-of-a-string-in-javascript
// eslint-disable-next-line no-extend-native,func-names
String.prototype.replaceAll = function(search, replacement) {
    const target = this;
    return target.replace(new RegExp(search, "g"), replacement);
};

/**
 *
 */
export default class OwnershipList {
    /**
     * @param {object} ownershipData - Port ownership data over time
     * @param {object} nationData - Nation data over time
     */
    constructor(ownershipData, nationData) {
        this._ownershipData = ownershipData;
        this._nationData = nationData;

        this._baseName = "Port ownership";
        this._baseId = "ownership-list";
        this._buttonId = `button-${this._baseId}`;
        this._modalId = `modal-${this._baseId}`;

        // http://tools.medialab.sciences-po.fr/iwanthue/
        this._colourScale = d3ScaleOrdinal().range([
            "#72823a",
            "#825fc8",
            "#78b642",
            "#cd47a3",
            "#50b187",
            "#d34253",
            "#628bcc",
            "#cb9f3d",
            "#cc88c9",
            "#ca5b2b",
            "#b55576",
            "#c27b58"
        ]);

        this._setupListener();
    }

    /**
     * Setup listener
     * @return {void}
     * @private
     */
    _setupListener() {
        $(`#${this._buttonId}`).on("click", event => {
            registerEvent("Tools", this._baseName);
            event.stopPropagation();
            this._ownershipListSelected();
        });
    }

    /**
     * Inject modal
     * @return {void}
     * @private
     */
    _injectModal() {
        insertBaseModal(this._modalId, this._baseName);

        const div = d3Select(`#${this._modalId} .modal-body`)
            .append("div")
            .attr("id", `${this._baseId}`);
        this._div = div.append("div");
        this._svg = div.append("svg").attr("class", "area");
    }

    /**
     * Init modal
     * @return {void}
     * @private
     */
    _initModal() {
        this._injectModal();
    }

    /**
     * Action when menu item is clicked
     * @return {void}
     * @private
     */
    _ownershipListSelected() {
        let emptyModal = false;

        // If the modal has no content yet, insert it
        if (!document.getElementById(this._modalId)) {
            emptyModal = true;
            this._initModal();
        }
        // Show modal
        $(`#${this._modalId}`)
            .on("shown.bs.modal", () => {
                // Inject chart after modal is shown to calculate modal width
                if (emptyModal) {
                    // this._injectChart();
                    this._injectArea();
                    emptyModal = false;
                }
            })
            .modal("show");
    }

    static getHeight() {
        // eslint-disable-next-line no-restricted-globals
        return Math.floor(top.innerHeight * 0.75);
    }

    _getWidth() {
        return Math.floor(document.getElementById(this._baseId).offsetWidth);
    }

    /**
     * Inject chart
     * @return {void}
     * @private
     */
    _injectChart() {
        const chart = TimelinesChart()
            .data(this._ownershipData)
            .timeFormat("%-d %B %Y")
            .zQualitative(true)
            .zColorScale(this._colourScale)
            .width(this._getWidth())(this._div.node());
    }

    _injectArea() {
        /**
         * Get x date value
         * @param {*} d - data
         * @return {Date}
         */
        const xValue = d => new Date(d.date);

        const width = this._getWidth(),
            // eslint-disable-next-line no-restricted-globals
            height = OwnershipList.getHeight(),
            margin = { top: 0, right: 32, bottom: 32, left: 32 };

        const labelNames = new Map(
                nations.filter(nation => nation.id !== 9).map(nation => [nation.short, nation.name])
            ),
            keys = nations.filter(nation => nation.id !== 9).map(nation => nation.short),
            nationData = this._nationData;
        nationData.keys = keys;

        const stack = d3Stack()
                .offset(d3StackOffsetNone)
                .keys(nationData.keys),
            stacked = stack(nationData);

        const xScale = d3ScaleLinear()
                .domain(d3Extent(nationData, d => xValue(d)))
                .range([margin.left, width - margin.right]),
            yScale = d3ScaleLinear()
                .domain([d3Min(stacked[0], d => d[0]), d3Max(stacked[stacked.length - 1], d => d[1])])
                .range([height - margin.bottom, 0]);

        this._colourScale.domain(nationData.keys);

        const xTimeScale = d3ScaleTime()
                .domain(d3Extent(nationData, d => xValue(d)))
                .range([margin.left, width - margin.right]),
            xAxis = g =>
                g.attr("transform", `translate(0,${height - margin.bottom})`).call(
                    d3AxisBottom(xTimeScale)
                        .ticks(width / 80)
                        .tickSizeOuter(0)
                );

        const area = d3Area()
            .x(d => xScale(xValue(d.data)))
            .y0(d => yScale(d[0]))
            .y1(d => yScale(d[1]))
            .curve(d3CurveBasis);

        /**
         * Render chart
         * @return {void}
         */
        const render = () => {
            const paths = this._svg.selectAll("path").data(stacked);
            paths
                .enter()
                .append("path")
                .merge(paths)
                .attr("fill", d => this._colourScale(d.key))
                .attr("stroke", d => this._colourScale(d.key))
                .attr("d", area);

            const labels = this._svg.selectAll(".area-label").data(stacked);
            labels
                .enter()
                .append("text")
                .attr("class", "area-label")
                .merge(labels)
                .text(d => labelNames.get(d.key))
                .attr("transform", d3AreaLabel(area));
        };

        this._svg.attr("width", width).attr("height", height);
        render();
        this._svg.append("g").call(xAxis);
    }
}

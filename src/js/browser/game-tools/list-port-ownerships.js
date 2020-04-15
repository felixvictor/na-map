/*!
 * This file is part of na-map.
 *
 * @file      Port ownership list.
 * @module    game-tools/list-port-ownerships
 * @author    iB aka Felix Victor
 * @copyright 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */

/// <reference types="bootstrap" />
import "bootstrap/js/dist/util"
/// <reference types="bootstrap" />
import "bootstrap/js/dist/modal"
import "bootstrap-select/js/bootstrap-select"
import { areaLabel as d3AreaLabel } from "d3-area-label"
import { extent as d3Extent, max as d3Max, min as d3Min } from "d3-array"
import { axisBottom as d3AxisBottom } from "d3-axis"
import { scaleLinear as d3ScaleLinear, scaleOrdinal as d3ScaleOrdinal, scaleTime as d3ScaleTime } from "d3-scale"
import { select as d3Select } from "d3-selection"
import {
    area as d3Area,
    curveBasis as d3CurveBasis,
    stack as d3Stack,
    stackOffsetNone as d3StackOffsetNone
} from "d3-shape"
import TimelinesChart from "timelines-chart"

import { registerEvent } from "../analytics"
import { colourList, insertBaseModal, nations } from "../../common/interfaces"
import { putImportError } from "../util"

/**
 *
 */
export default class ListPortOwnerships {
    constructor() {
        this._baseName = "Port ownership"
        this._baseId = "ownership-list"
        this._buttonId =`button-${this._baseId}`
        this._modalId =`modal-${this._baseId}`

        this._colourScale = d3ScaleOrdinal().range(colourList)

        this._setupListener()
    }

    async _loadAndSetupData() {
        try {
            this._nationData = (
                await import(/* webpackChunkName: "data-nations" */ "~Lib/gen-generic/nations.json")
            ).default
            this._ownershipData = (
                await import(/* webpackChunkName: "data-ownership" */ "~Lib/gen-generic/ownership.json")
            ).default
        } catch (error) {
            putImportError(error)
        }
    }

    /**
     * Setup listener
     * @return {void}
     * @private
     */
    _setupListener() {
        let firstClick = true

        document.getElementById(this._buttonId).addEventListener("click", async event => {
            if (firstClick) {
                firstClick = false
                await this._loadAndSetupData()
            }

            registerEvent("Tools", this._baseName)
            event.stopPropagation()
            this._ownershipListSelected()
        })
    }

    /**
     * Inject modal
     * @return {void}
     * @private
     */
    _injectModal() {
        insertBaseModal(this._modalId, this._baseName)

        const select =`${this._baseId}-select`
        const body = d3Select(`#${this._modalId} .modal-body`)

        body.append("label")
            .append("select")
            .attr("name", select)
            .attr("id", select)

        const div = body.append("div").attr("id",`${this._baseId}`)
        this._div = div.append("div")
        this._svg = div.append("svg").attr("class", "area")
    }

    _getOptions() {
        return`${this._ownershipData
            .map(region =>`<option value="${region.region}">${region.region}</option>;`)
            .join("")}`
    }

    _setupSelect() {
        const select$ = $(`#${this._baseId}-select`)
        const options = this._getOptions()
        select$.append(options)
    }

    _setupSelectListener() {
        const select$ = $(`#${this._baseId}-select`)

        select$
            .addClass("selectpicker")
            .on("change", event => this._regionSelected(event))
            .selectpicker({ noneSelectedText: "Select region" })
            .val("default")
            .selectpicker("refresh")
    }

    /**
     * Init modal
     * @return {void}
     * @private
     */
    _initModal() {
        this._injectModal()
        this._setupSelect()
        this._setupSelectListener()
    }

    /**
     * Action when menu item is clicked
     * @return {void}
     * @private
     */
    _ownershipListSelected() {
        let emptyModal = false

        // If the modal has no content yet, insert it
        if (!document.getElementById(this._modalId)) {
            emptyModal = true
            this._initModal()
        }

        // Show modal
        $(`#${this._modalId}`)
            .on("shown.bs.modal", () => {
                // Inject chart after modal is shown to calculate modal width
                if (emptyModal) {
                    this._injectArea()
                    emptyModal = false
                }
            })
            .modal("show")
    }

    /**
     * Get <factor> height of current window
     * @return {number} Height
     */
    static getHeight() {
        const factor = 0.75
        return Math.floor(top.innerHeight * factor)
    }

    /**
     * Get width of baseId
     * @return {number} Width
     * @private
     */
    _getWidth() {
        return Math.floor(document.getElementById(this._baseId).offsetWidth)
    }

    /**
     * Get x date value
     * @param {*} d - data
     * @return {Date} x value
     */
    static xValue(d) {
        return new Date(d.date)
    }

    /**
     * Inject stacked area
     * @return {void}
     * @private
     */
    _injectArea() {
        const width = this._getWidth()
        const maxHeight = 1000
        const height = Math.min(maxHeight, ListPortOwnerships.getHeight())
        const margin = { right: 32, bottom: 32, left: 32 }

        const keys = nations.filter(nation => nation.id !== 9).map(nation => nation.short)
        const nationData = this._nationData
        nationData.keys = keys

        const stack = d3Stack()
            .offset(d3StackOffsetNone)
            .keys(nationData.keys)
        const stacked = stack(nationData)

        /**
         * Set x axis
         * @param {*} g - g element
         * @return {void}
         */
        const setXAxis = g => {
            const xTimeScale = d3ScaleTime()
                .domain(d3Extent(nationData, d => ListPortOwnerships.xValue(d)))
                .range([margin.left, width - margin.right])
            g.attr("transform",`translate(0,${height - margin.bottom})`).call(
                d3AxisBottom(xTimeScale)
                    .ticks(width / 80)
                    .tickSizeOuter(0)
            )
            g.attr("font-size", ".8rem").attr("font-family", "")
        }

        /**
         * Get area
         * @return {function} Area
         */
        const getArea = () => {
            const xScale = d3ScaleLinear()
                .domain(d3Extent(nationData, d => ListPortOwnerships.xValue(d)))
                .range([margin.left, width - margin.right])
            const yScale = d3ScaleLinear()
                .domain([d3Min(stacked[0], d => d[0]), d3Max(stacked[stacked.length - 1], d => d[1])])
                .range([height - margin.bottom, 0])

            const area = d3Area()
                .x(d => xScale(ListPortOwnerships.xValue(d.data)))
                .y0(d => yScale(d[0]))
                .y1(d => yScale(d[1]))
                .curve(d3CurveBasis)

            return area
        }

        /**
         * Render chart
         * @return {void}
         */
        const render = () => {
            const area = getArea()
            const labelNames = new Map(nations.map(nation => [nation.short, nation.name]))
            this._colourScale.domain(nationData.keys)

            // Paths
            this._svg
                .selectAll("path")
                .data(stacked)
                .join(enter =>
                    enter
                        .append("path")
                        .attr("fill", d => this._colourScale(d.key))
                        .attr("stroke", d => this._colourScale(d.key))
                        .attr("d", area)
                )

            // Labels
            this._svg
                .selectAll(".area-label")
                .data(stacked)
                .join(enter =>
                    enter
                        .append("text")
                        .attr("class", "area-label")
                        .text(d => labelNames.get(d.key))
                        .attr("transform", d3AreaLabel(area))
                )
        }

        this._svg.attr("width", width).attr("height", height)
        render()
        this._svg.append("g").call(setXAxis)
    }

    /**
     * Inject chart
     * @param {*} data - Data
     * @return {void}
     * @private
     */
    _injectChart(data) {
        TimelinesChart()
            .data(data)
            .enableAnimations(false)
            .timeFormat("%-d %B %Y")
            .zQualitative(true)
            .zColorScale(this._colourScale)
            .width(this._getWidth())(this._div.node())
    }

    /**
     * Show data for selected region
     * @param {Object} event Event
     * @return {void}
     * @private
     */
    _regionSelected(event) {
        const regionSelected = $(event.currentTarget)
            .find(":selected")
            .val()

        // Remove current display
        this._div.selectAll("*").remove()

        const regionData = this._ownershipData
            .filter(region => region.region === regionSelected)
            .map(region => region.data)[0]
        this._injectChart(regionData)
    }
}

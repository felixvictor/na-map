/**
 * This file is part of na-map.
 *
 * @file      Display grid.
 * @module    map-tools/display-grid
 * @author    iB aka Felix Victor
 * @copyright 2017, 2018
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { axisBottom as d3AxisBottom, axisRight as d3AxisRight } from "d3-axis";
import { event as d3Event, select as d3Select } from "d3-selection";
import { scaleLinear as d3ScaleLinear } from "d3-scale";

import { formatF11, roundToThousands } from "../util";
import { convertInvCoordX, convertInvCoordY } from "../common";

/**
 * Display grid
 */
export default class DisplayGrid {
    /**
     *
     * @param {map.Map} map - The main map
     */
    constructor(map) {
        /**
         * The main map
         * @type {map.Map}
         * @private
         */
        this._map = map;

        /**
         * Show status
         * @type {Boolean}
         * @private
         */
        this._isShown = this._map._showLayer === "on";

        /**
         * Minimum world coordinate
         * @type {Number}
         * @private
         */
        this._minCoord = this._map.coord.min;

        /**
         * Maximum world coordinate
         * @type {Number}
         * @private
         */
        this._maxCoord = this._map.coord.max;

        /**
         * Height of map svg (screen coordinates)
         * @type {Number}
         * @private
         */
        this._height = this._map.height;

        /**
         * Width of map svg (screen coordinates)
         * @type {Number}
         * @private
         */
        this._width = this._map.width;

        /**
         * Font size in px
         * @type {Number}
         * @private
         */
        this._defaultFontSize = this._map.rem;

        this._xBackgroundHeight = this._map.xGridBackgroundHeight;
        this._yBackgroundWidth = this._map.yGridBackgroundWidth;

        this._setupSvg();
    }

    /**
     * Setup grid svg
     * @return {void}
     * @private
     */
    _setupSvg() {
        this._setupScale();
        this._setupAxis();
    }

    /**
     * Setup scale
     * @return {void}
     * @private
     */
    _setupScale() {
        /**
         * X scale
         * @type {Object}
         */
        this._xScale = d3ScaleLinear()
            .clamp(true)
            .domain([
                convertInvCoordX(this._minCoord, this._minCoord),
                convertInvCoordX(this._maxCoord, this._maxCoord)
            ])
            .range([this._minCoord, this._maxCoord]);

        /**
         * Y scale
         * @type {Object}
         */
        this._yScale = d3ScaleLinear()
            .clamp(true)
            .domain([
                convertInvCoordY(this._minCoord, this._minCoord),
                convertInvCoordY(this._maxCoord, this._maxCoord)
            ])
            .range([this._minCoord, this._maxCoord]);
    }

    /**
     * Setup axis
     * @return {void}
     * @private
     */
    _setupAxis() {
        const ticks = this._getTicks(65);

        /**
         * X axis
         * @type {Object}
         */
        this._xAxis = d3AxisBottom(this._xScale)
            .tickFormat(formatF11)
            .tickValues(ticks)
            .tickSize(this._maxCoord);

        /**
         * Y Axis
         * @type {Object}
         */
        this._yAxis = d3AxisRight(this._yScale)
            .tickFormat(formatF11)
            .tickValues(ticks)
            .tickSize(this._maxCoord);

        // svg groups
        this._divXAxis = d3Select("#axis-x");
        this._svgXAxis = d3Select("#axis-x svg");
        this._svgXAxis
            .attr("height", this._xBackgroundHeight)
            .attr("width", this._width)
            .append("rect")
            .attr("height", this._xBackgroundHeight)
            .attr("width", this._width);
        this._gXAxis = this._svgXAxis.append("g");

        this._divYAxis = d3Select("#axis-y");
        this._svgYAxis = d3Select("#axis-y svg");
        this._svgYAxis
            .attr("height", this._height - this._xBackgroundHeight)
            .attr("width", this._yBackgroundWidth)
            .append("rect")
            .attr("height", this._height - this._xBackgroundHeight)
            .attr("width", this._yBackgroundWidth);
        this._gYAxis = this._svgYAxis.append("g");

        // Initialise both axis first
        this._displayAxis();
        // Set default values
        this._setupXAxis();
        this._setupYAxis();
    }

    /**
     * Construct a list of ordered ticks [-maxCoord/2 .. 0 .. maxCoord/2]
     * @param {Number} items Number of ticks
     * @returns {Number[]} Tick list
     * @private
     */
    _getTicks(items) {
        const min = Math.round(convertInvCoordY(this._minCoord, this._minCoord)),
            max = Math.round(convertInvCoordY(this._maxCoord, this._maxCoord)),
            increment = (max - min) / (items - 1);

        /**
         * List of ticks (positive values [increment .. max])
         * @type {number[]}
         */
        const tPos = [];
        for (let i = increment; i < max; i += increment) {
            tPos.push(Math.round(i));
        }
        tPos.push(max);

        /**
         * List of ticks (negative values [-max .. 0])
         * @type {number[]}
         */
        const tNeg = tPos
            // copy values from tPos
            .slice(0)
            // reverse items
            .reverse()
            // convert to negatives
            .map(d => -d);
        tNeg.push(0);

        // Concat negative and positive values
        return tNeg.concat(tPos);
    }

    /**
     * Setup x axis
     * @return {void}
     * @private
     */
    _setupXAxis() {
        this._gXAxis
            .selectAll(".tick text")
            .attr("dx", "-0.3em")
            .attr("dy", "2em");
        this._gXAxis
            .attr("text-anchor", "end")
            .attr("fill", null)
            .attr("font-family", null);
    }

    /**
     * Setup y axis
     * @return {void}
     * @private
     */
    _setupYAxis() {
        this._gYAxis
            .attr("text-anchor", "end")
            .attr("fill", null)
            .attr("font-family", null);
        this._gYAxis
            .selectAll(".tick text")
            .attr("dx", "3.5em")
            .attr("dy", "-.3em");
    }

    /**
     * Display axis
     * @return {void}
     * @private
     */
    _displayAxis() {
        this._displayXAxis();
        this._displayYAxis();
    }

    /**
     * Display x axis
     * @return {void}
     * @private
     */
    _displayXAxis() {
        const tk = d3Event ? d3Event.transform.k : 1,
            ty = d3Event ? d3Event.transform.y : 0,
            dx = ty / tk < this._width ? ty / tk : 0,
            padding = -this._maxCoord - dx,
            fontSize = roundToThousands(this._defaultFontSize / tk),
            strokeWidth = roundToThousands(1 / tk);

        this._gXAxis
            .attr("font-size", fontSize)
            .attr("stroke-width", strokeWidth)
            .call(this._xAxis.tickPadding(padding));
        this._gXAxis.select(".domain").remove();
    }

    /**
     * Display y axis
     * @return {void}
     * @private
     */
    _displayYAxis() {
        const tk = d3Event ? d3Event.transform.k : 1,
            tx = d3Event ? d3Event.transform.x : 0,
            dy = tx / tk < this._height ? tx / tk : 0,
            padding = -this._maxCoord - dy,
            fontSize = roundToThousands(this._defaultFontSize / tk),
            strokeWidth = roundToThousands(1 / tk);

        this._gYAxis
            .attr("font-size", fontSize)
            .attr("stroke-width", strokeWidth)
            .call(this._yAxis.tickPadding(padding));
        this._gYAxis.select(".domain").remove();
    }

    /**
     * Set show status
     * @param {Boolean} show - True if grid is shown
     * @return {void}
     */
    set show(show) {
        this._isShown = show;
    }

    /**
     * Get show status
     * @return {Boolean} True if grid is shown
     */
    get show() {
        return this._isShown;
    }

    /**
     * Set zoom level
     * @param {String} zoomLevel - Zoom level
     * @return {void}
     * @public
     */
    set zoomLevel(zoomLevel) {
        this._zoomLevel = zoomLevel;
    }

    get zoomLevel() {
        return this._zoomLevel;
    }

    /**
     * Update grid (shown or not shown)
     * @return {void}
     * @public
     */
    update() {
        let show = false;

        if (this._isShown && this.zoomLevel !== "initial") {
            show = true;
        }

        // Show or hide axis
        this._divXAxis.classed("d-none", !show);
        this._divYAxis.classed("d-none", !show);
    }

    /**
     * Set axis transform
     * @param {Transform} transform - Current transformation
     * @return {void}
     * @public
     */
    transform(transform) {
        this._gXAxis.attr("transform", transform);
        this._gYAxis.attr("transform", transform);
        this._displayAxis();
    }
}

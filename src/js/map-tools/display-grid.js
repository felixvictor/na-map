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
        this._isShown = this._map._showLayer === "grid";

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

        /**
         * Text padding in px
         * @type {Number}
         * @private
         */
        this._textPadding = this._defaultFontSize / 2;

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
        this._gAxis = this._map.svg.insert("g", "g.pb").classed("axis d-none", true);
        this._gXAxis = this._gAxis.append("g").classed("axis-x", true);
        this._gYAxis = this._gAxis.append("g").classed("axis-y", true);
        this._setupBackground();

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

    _setBackgroundHeightAndWidth() {
        this._xBackground.attr("height", this._xBackgroundHeight).attr("width", this._width);
        this._yBackground.attr("height", this._height).attr("width", this._yBackgroundWidth);
    }

    /**
     * Setup background
     * @return {void}
     */
    _setupBackground() {
        this._gBackground = this._map.svg.insert("g", "g.axis").classed("grid-background d-none", true);
        // Background for x axis legend
        this._xBackground = this._gBackground.append("rect");
        // Background for y axis legend
        this._yBackground = this._gBackground.append("rect");

        this._setBackgroundHeightAndWidth();
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
     * Set zoom level
     * @param {String} zoomLevel - Zoom level
     * @return {void}
     * @public
     */
    set zoomLevel(zoomLevel) {
        this._zoomLevel = zoomLevel;
    }

    /**
     * Update grid (shown or not shown)
     * @return {void}
     * @public
     */
    update(height = null, width = null) {
        let show = false;
        let topMargin = 0;
        let leftMargin = 0;

        if (this._isShown && this._zoomLevel !== "initial") {
            show = true;
            topMargin = this._xBackgroundHeight;
            leftMargin = this._yBackgroundWidth;

            if (height && width) {
                this._height = height;
                this._width = width;
                this._setBackgroundHeightAndWidth();
            }
        }

        // Show or hide axis
        this._gAxis.classed("d-none", !show);
        this._gBackground.classed("d-none", !show);

        // Move summary up or down
        d3Select("#port-summary").style("margin-top", `${topMargin}px`);
        d3Select("#journey-summary").style("margin-top", `${topMargin}px`);
        this._map._windPrediction.setPosition(topMargin, leftMargin);
    }

    /**
     * Set axis transform
     * @param {Transform} transform - Current transformation
     * @return {void}
     * @public
     */
    transform(transform) {
        this._gAxis.attr("transform", transform);
        this._displayAxis();
    }
}

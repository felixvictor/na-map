/**
 * This file is part of na-map.
 *
 * @file      Display grid.
 * @module    grid
 * @author    iB aka Felix Victor
 * @copyright 2017, 2018
 * @license   http://www.gnu.org/licenses/gpl.html
 */

/* global d3 : false
 */

import { formatF11 } from "./util";
import { convertInvCoordX, convertInvCoordY } from "./common";

/**
 * Display grid
 * @param {NAMap} map - The main map
 */
export default class Grid {
    // eslint-disable-next-line require-jsdoc
    constructor(map) {
        /**
         * The main map
         * @type {NAMap}
         */
        this._map = map;

        /**
         * Show status (grid shown by default)
         * @type {Boolean}
         * @private
         */
        this._isShown = true;

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
        this._height = this._map._height;

        /**
         * Width of map svg (screen coordinates)
         * @type {Number}
         * @private
         */
        this._width = this._map._width;

        /**
         * Top margin of screen
         * @type {Number}
         * @private
         */
        this._topMargin = this._map.margin.top;

        /**
         * Left margin of screen
         * @type {Number}
         * @private
         */
        this._leftMargin = this._map.margin.left;

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
        this._xScale = d3
            .scaleLinear()
            .clamp(true)
            .domain([
                convertInvCoordX(this._maxCoord, this._maxCoord),
                convertInvCoordX(this._minCoord, this._minCoord)
            ])
            .range([this._minCoord, this._maxCoord]);

        /**
         * Y scale
         * @type {Object}
         */
        this._yScale = d3
            .scaleLinear()
            .clamp(true)
            .domain([
                convertInvCoordY(this._maxCoord, this._maxCoord),
                convertInvCoordY(this._minCoord, this._minCoord)
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
        this._xAxis = d3
            .axisBottom(this._xScale)
            .tickFormat(formatF11)
            .tickValues(ticks)
            .tickSize(this._maxCoord);

        /**
         * Y Axis
         * @type {Object}
         */
        this._yAxis = d3
            .axisRight(this._yScale)
            .tickFormat(formatF11)
            .tickValues(ticks)
            .tickSize(this._maxCoord);

        // svg groups
        this._gAxis = this._map._svg
            .append("g")
            .classed("axis", true)
            .attr("display", "none");
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
        const tk = d3.event ? d3.event.transform.k : 1,
            ty = d3.event ? d3.event.transform.y : 0,
            dx = ty / tk < this._width ? ty / tk : 0;
        this._gXAxis.call(this._xAxis.tickPadding(-this._maxCoord - dx));
        this._gXAxis.attr("font-size", this._defaultFontSize / tk).attr("stroke-width", 1 / tk);
        this._gXAxis.select(".domain").remove();
    }

    /**
     * Display y axis
     * @return {void}
     * @private
     */
    _displayYAxis() {
        const tk = d3.event ? d3.event.transform.k : 1,
            tx = d3.event ? d3.event.transform.x : 0,
            dy = tx / tk < this._height ? tx / tk : 0;
        this._gYAxis.call(this._yAxis.tickPadding(-this._maxCoord - dy));
        this._gYAxis.attr("font-size", this._defaultFontSize / tk).attr("stroke-width", 1 / tk);
        this._gYAxis.select(".domain").remove();
    }

    /**
     * Setup background
     * @return {void}
     */
    _setupBackground() {
        this._gBackground = this._map._svg
            .insert("g", "g.axis")
            .classed("grid-background", true)
            .attr("display", "none");
        // Background for x axis legend
        this._gBackground
            .append("rect")
            .attr("height", this._xBackgroundHeight)
            .attr("width", this._width);
        // Background for y axis legend
        this._gBackground
            .append("rect")
            .attr("height", this._height)
            .attr("width", this._yBackgroundWidth);
    }

    /**
     * Set show status
     * @param {Boolean} show - True if grid is shown
     * @return {void}
     */
    setShow(show) {
        this._isShown = show;
    }

    /**
     * Set zoom level
     * @param {String} zoomLevel - Zoom level
     * @return {void}
     * @public
     */
    setZoomLevel(zoomLevel) {
        this._zoomLevel = zoomLevel;
    }

    /**
     * Update grid (shown or not shown)
     * @return {void}
     * @public
     */
    update() {
        if (this._isShown && this._zoomLevel !== "initial") {
            // Show axis
            this._gAxis.attr("display", "inherit");
            this._gBackground.attr("display", "inherit");
            // Move summary down
            d3.select("#summary").style("top", `${this._topMargin + 3 * 16}px`);
        } else {
            // Hide axis
            this._gAxis.attr("display", "none");
            this._gBackground.attr("display", "none");
            // Move summary up
            d3.select("#summary").style("top", `${this._topMargin}px`);
        }
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

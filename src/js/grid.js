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
         * Minimum world coordinate
         * @type {Number}
         */
        this._minCoord = this._map.coord.min;

        /**
         * Maximum world coordinate
         * @type {Number}
         */
        this._maxCoord = this._map.coord.max;

        /**
         * Height of map svg (screen coordinates)
         * @type {Number}
         */
        this._height = this._map._height;

        /**
         * Width of map svg (screen coordinates)
         * @type {Number}
         */
        this._width = this._map._width;

        this._setupSvg();
    }

    /**
     * Setup grid svg
     * @return {void}
     * @private
     */
    _setupSvg() {
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
            .rangeRound([this._minCoord, this._maxCoord]);

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
            .rangeRound([this._minCoord, this._maxCoord]);

        /**
         * X axis
         * @type {Object}
         */
        this._xAxis = d3
            .axisBottom(this._xScale)
            .tickFormat(formatF11)
            .ticks(this._maxCoord / 256)
            .tickSize(this._maxCoord);

        /**
         * Y scale
         * @type {Object}
         */
        this._yAxis = d3
            .axisRight(this._yScale)
            .tickFormat(formatF11)
            .ticks(this._maxCoord / 256)
            .tickSize(this._maxCoord);

        this._setupAxis();
    }

    /**
     * Setup axis
     * @return {void}
     * @private
     */
    _setupAxis() {
        this._gAxis = this._map._svg.append("g").classed("axis", true);
        this._gXAxis = this._gAxis.append("g").classed("axis-x", true);
        this._gYAxis = this._gAxis.append("g").classed("axis-y", true);

        // Initialise both axis first
        this._displayAxis();
        // Set default values
        this._setupXAxis();
        this._setupYAxis();
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
            .attr("dy", "1.2em");
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
        this._gXAxis.attr("font-size", 16 / tk).attr("stroke-width", 1 / tk);
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
        this._gYAxis.attr("font-size", 16 / tk).attr("stroke-width", 1 / tk);
        this._gYAxis.select(".domain").remove();
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

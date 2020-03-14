/*!
 * This file is part of na-map.
 *
 * @file      Display grid.
 * @module    map-tools/display-grid
 * @author    iB aka Felix Victor
 * @copyright 2017, 2018, 2019
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import { axisBottom as d3AxisBottom, axisRight as d3AxisRight } from "d3-axis";
import { event as d3Event, select as d3Select } from "d3-selection";
import { scaleLinear as d3ScaleLinear } from "d3-scale";
import { roundToThousands } from "../util";
import { convertInvCoordX, convertInvCoordY } from "../../common/common-math";
import { formatF11 } from "../../common/common-format";
export default class DisplayGrid {
    constructor(map) {
        this._map = map;
        this._isShown = this._map._showGrid === "on";
        this._minCoord = this._map.coord.min;
        this._maxCoord = this._map.coord.max;
        this._height = this._map.height;
        this._width = this._map.width;
        this._defaultFontSize = this._map.rem;
        this._xBackgroundHeight = this._map.xGridBackgroundHeight;
        this._yBackgroundWidth = this._map.yGridBackgroundWidth;
        this._setupSvg();
    }
    _setupSvg() {
        this._setupScale();
        this._setupAxis();
    }
    _setupScale() {
        this._xScale = d3ScaleLinear()
            .clamp(true)
            .domain([
            convertInvCoordX(this._minCoord, this._minCoord),
            convertInvCoordX(this._maxCoord, this._maxCoord)
        ])
            .range([this._minCoord, this._maxCoord]);
        this._yScale = d3ScaleLinear()
            .clamp(true)
            .domain([
            convertInvCoordY(this._minCoord, this._minCoord),
            convertInvCoordY(this._maxCoord, this._maxCoord)
        ])
            .range([this._minCoord, this._maxCoord]);
    }
    _setupAxis() {
        const ticks = this._getTicks(65);
        this._xAxis = d3AxisBottom(this._xScale)
            .tickFormat(formatF11)
            .tickValues(ticks)
            .tickSize(this._maxCoord);
        this._yAxis = d3AxisRight(this._yScale)
            .tickFormat(formatF11)
            .tickValues(ticks)
            .tickSize(this._maxCoord);
        this._svgMap = d3Select("#na-svg");
        this._svgXAxis = this._svgMap.insert("svg", "g.pb").attr("class", "axis d-none");
        this._gXAxis = this._svgXAxis.append("g");
        this._svgYAxis = this._svgMap.insert("svg", "g.pb").attr("class", "axis d-none");
        this._gYAxis = this._svgYAxis.append("g");
        this._displayAxis();
        this._setupXAxis();
        this._setupYAxis();
    }
    _getTicks(items) {
        const min = Math.round(convertInvCoordY(this._minCoord, this._minCoord));
        const max = Math.round(convertInvCoordY(this._maxCoord, this._maxCoord));
        const increment = (max - min) / (items - 1);
        const tPos = [];
        for (let i = increment; i < max; i += increment) {
            tPos.push(Math.round(i));
        }
        tPos.push(max);
        const tNeg = tPos
            .slice(0)
            .reverse()
            .map(d => -d);
        tNeg.push(0);
        return tNeg.concat(tPos);
    }
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
    _displayAxis() {
        const tk = d3Event ? d3Event.transform.k : 1;
        const fontSize = roundToThousands(this._defaultFontSize / tk);
        const strokeWidth = roundToThousands(1 / tk);
        const tx = d3Event ? d3Event.transform.y : 0;
        const dx = tx / tk < this._width ? tx / tk : 0;
        const paddingX = -this._maxCoord - dx;
        const ty = d3Event ? d3Event.transform.x : 0;
        const dy = ty / tk < this._height ? ty / tk : 0;
        const paddingY = -this._maxCoord - dy;
        this._gXAxis
            .attr("font-size", fontSize)
            .attr("stroke-width", strokeWidth)
            .call(this._xAxis.tickPadding(paddingX));
        this._gYAxis
            .attr("font-size", fontSize)
            .attr("stroke-width", strokeWidth)
            .call(this._yAxis.tickPadding(paddingY));
    }
    set show(show) {
        this._isShown = show;
    }
    get show() {
        return this._isShown;
    }
    set zoomLevel(zoomLevel) {
        this._zoomLevel = zoomLevel;
    }
    get zoomLevel() {
        return this._zoomLevel;
    }
    update() {
        let show = false;
        if (this._isShown && this.zoomLevel !== "initial") {
            show = true;
        }
        this._map.gridOverlay.classList.toggle("overlay-grid", show);
        this._map.gridOverlay.classList.toggle("overlay-no-grid", !show);
        this._svgXAxis.classed("d-none", !show);
        this._svgYAxis.classed("d-none", !show);
    }
    transform(transform) {
        this._gXAxis.attr("transform", transform);
        this._gYAxis.attr("transform", transform);
        this._displayAxis();
    }
}
//# sourceMappingURL=display-grid.js.map
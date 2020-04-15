/*!
 * This file is part of na-map.
 *
 * @file      Display grid.
 * @module    map-tools/display-grid
 * @author    iB aka Felix Victor
 * @copyright 2017, 2018, 2019
 * @license   http://www.gnu.org/licenses/gpl.html
 */
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, privateMap, value) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to set private field on non-instance");
    }
    privateMap.set(receiver, value);
    return value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, privateMap) {
    if (!privateMap.has(receiver)) {
        throw new TypeError("attempted to get private field on non-instance");
    }
    return privateMap.get(receiver);
};
var _isShown, _map, _minCoord, _maxCoord, _height, _width, _defaultFontSize, _xBackgroundHeight, _yBackgroundWidth, _xScale, _yScale, _xAxis, _yAxis, _zoomLevel, _svgMap, _svgXAxis, _svgYAxis, _gXAxis, _gYAxis;
import { axisBottom as d3AxisBottom, axisRight as d3AxisRight } from "d3-axis";
import { event as d3Event, select as d3Select } from "d3-selection";
import { scaleLinear as d3ScaleLinear } from "d3-scale";
import { convertInvCoordX, convertInvCoordY, roundToThousands } from "../../common/common-math";
import { formatF11 } from "../../common/common-format";
export default class DisplayGrid {
    constructor(map) {
        _isShown.set(this, void 0);
        _map.set(this, void 0);
        _minCoord.set(this, void 0);
        _maxCoord.set(this, void 0);
        _height.set(this, void 0);
        _width.set(this, void 0);
        _defaultFontSize.set(this, void 0);
        _xBackgroundHeight.set(this, void 0);
        _yBackgroundWidth.set(this, void 0);
        _xScale.set(this, void 0);
        _yScale.set(this, void 0);
        _xAxis.set(this, void 0);
        _yAxis.set(this, void 0);
        _zoomLevel.set(this, void 0);
        _svgMap.set(this, void 0);
        _svgXAxis.set(this, void 0);
        _svgYAxis.set(this, void 0);
        _gXAxis.set(this, void 0);
        _gYAxis.set(this, void 0);
        __classPrivateFieldSet(this, _map, map);
        __classPrivateFieldSet(this, _isShown, __classPrivateFieldGet(this, _map).showGrid === "on");
        __classPrivateFieldSet(this, _minCoord, __classPrivateFieldGet(this, _map).coord.min);
        __classPrivateFieldSet(this, _maxCoord, __classPrivateFieldGet(this, _map).coord.max);
        __classPrivateFieldSet(this, _height, __classPrivateFieldGet(this, _map).height);
        __classPrivateFieldSet(this, _width, __classPrivateFieldGet(this, _map).width);
        __classPrivateFieldSet(this, _defaultFontSize, __classPrivateFieldGet(this, _map).rem);
        __classPrivateFieldSet(this, _xBackgroundHeight, __classPrivateFieldGet(this, _map).xGridBackgroundHeight);
        __classPrivateFieldSet(this, _yBackgroundWidth, __classPrivateFieldGet(this, _map).yGridBackgroundWidth);
        this._setupSvg();
    }
    _setupSvg() {
        this._setupScale();
        this._setupAxis();
    }
    _setupScale() {
        __classPrivateFieldSet(this, _xScale, d3ScaleLinear()
            .clamp(true)
            .domain([
            convertInvCoordX(__classPrivateFieldGet(this, _minCoord), __classPrivateFieldGet(this, _minCoord)),
            convertInvCoordX(__classPrivateFieldGet(this, _maxCoord), __classPrivateFieldGet(this, _maxCoord)),
        ])
            .range([__classPrivateFieldGet(this, _minCoord), __classPrivateFieldGet(this, _maxCoord)]));
        __classPrivateFieldSet(this, _yScale, d3ScaleLinear()
            .clamp(true)
            .domain([
            convertInvCoordY(__classPrivateFieldGet(this, _minCoord), __classPrivateFieldGet(this, _minCoord)),
            convertInvCoordY(__classPrivateFieldGet(this, _maxCoord), __classPrivateFieldGet(this, _maxCoord)),
        ])
            .range([__classPrivateFieldGet(this, _minCoord), __classPrivateFieldGet(this, _maxCoord)]));
    }
    _setupAxis() {
        const ticks = this._getTicks(65);
        __classPrivateFieldSet(this, _xAxis, d3AxisBottom(__classPrivateFieldGet(this, _xScale))
            .tickFormat((domainValue) => formatF11(domainValue))
            .tickValues(ticks)
            .tickSize(__classPrivateFieldGet(this, _maxCoord)));
        __classPrivateFieldSet(this, _yAxis, d3AxisRight(__classPrivateFieldGet(this, _yScale))
            .tickFormat((domainValue) => formatF11(domainValue))
            .tickValues(ticks)
            .tickSize(__classPrivateFieldGet(this, _maxCoord)));
        __classPrivateFieldSet(this, _svgMap, d3Select("#na-svg"));
        __classPrivateFieldSet(this, _svgXAxis, __classPrivateFieldGet(this, _svgMap).insert("svg", "g.pb").attr("class", "axis d-none"));
        __classPrivateFieldSet(this, _gXAxis, __classPrivateFieldGet(this, _svgXAxis).append("g"));
        __classPrivateFieldSet(this, _svgYAxis, __classPrivateFieldGet(this, _svgMap).insert("svg", "g.pb").attr("class", "axis d-none"));
        __classPrivateFieldSet(this, _gYAxis, __classPrivateFieldGet(this, _svgYAxis).append("g"));
        this._displayAxis();
        this._setupXAxis();
        this._setupYAxis();
    }
    _getTicks(items) {
        const min = Math.round(convertInvCoordY(__classPrivateFieldGet(this, _minCoord), __classPrivateFieldGet(this, _minCoord)));
        const max = Math.round(convertInvCoordY(__classPrivateFieldGet(this, _maxCoord), __classPrivateFieldGet(this, _maxCoord)));
        const increment = (max - min) / (items - 1);
        const tPos = [];
        for (let i = increment; i < max; i += increment) {
            tPos.push(Math.round(i));
        }
        tPos.push(max);
        const tNeg = tPos
            .slice(0)
            .reverse()
            .map((d) => -d);
        tNeg.push(0);
        return tNeg.concat(tPos);
    }
    _setupXAxis() {
        __classPrivateFieldGet(this, _gXAxis).selectAll(".tick text").attr("dx", "-0.3em").attr("dy", "2em");
        __classPrivateFieldGet(this, _gXAxis).attr("text-anchor", "end").attr("fill", null).attr("font-family", null);
    }
    _setupYAxis() {
        __classPrivateFieldGet(this, _gYAxis).attr("text-anchor", "end").attr("fill", null).attr("font-family", null);
        __classPrivateFieldGet(this, _gYAxis).selectAll(".tick text").attr("dx", "3.5em").attr("dy", "-.3em");
    }
    _displayAxis() {
        const tk = d3Event ? d3Event.transform.k : 1;
        const fontSize = roundToThousands(__classPrivateFieldGet(this, _defaultFontSize) / tk);
        const strokeWidth = roundToThousands(1 / tk);
        const tx = d3Event ? d3Event.transform.y : 0;
        const dx = tx / tk < __classPrivateFieldGet(this, _width) ? tx / tk : 0;
        const paddingX = -__classPrivateFieldGet(this, _maxCoord) - dx;
        const ty = d3Event ? d3Event.transform.x : 0;
        const dy = ty / tk < __classPrivateFieldGet(this, _height) ? ty / tk : 0;
        const paddingY = -__classPrivateFieldGet(this, _maxCoord) - dy;
        __classPrivateFieldGet(this, _gXAxis).attr("font-size", fontSize)
            .attr("stroke-width", strokeWidth)
            .call(__classPrivateFieldGet(this, _xAxis).tickPadding(paddingX));
        __classPrivateFieldGet(this, _gYAxis).attr("font-size", fontSize)
            .attr("stroke-width", strokeWidth)
            .call(__classPrivateFieldGet(this, _yAxis).tickPadding(paddingY));
    }
    get show() {
        return __classPrivateFieldGet(this, _isShown);
    }
    set show(show) {
        __classPrivateFieldSet(this, _isShown, show);
    }
    get zoomLevel() {
        return __classPrivateFieldGet(this, _zoomLevel);
    }
    set zoomLevel(zoomLevel) {
        __classPrivateFieldSet(this, _zoomLevel, zoomLevel);
    }
    update() {
        let show = false;
        if (__classPrivateFieldGet(this, _isShown) && this.zoomLevel !== "initial") {
            show = true;
        }
        __classPrivateFieldGet(this, _map).gridOverlay.classList.toggle("overlay-grid", show);
        __classPrivateFieldGet(this, _map).gridOverlay.classList.toggle("overlay-no-grid", !show);
        __classPrivateFieldGet(this, _svgXAxis).classed("d-none", !show);
        __classPrivateFieldGet(this, _svgYAxis).classed("d-none", !show);
    }
    transform(transform) {
        __classPrivateFieldGet(this, _gXAxis).attr("transform", transform.toString());
        __classPrivateFieldGet(this, _gYAxis).attr("transform", transform.toString());
        this._displayAxis();
    }
}
_isShown = new WeakMap(), _map = new WeakMap(), _minCoord = new WeakMap(), _maxCoord = new WeakMap(), _height = new WeakMap(), _width = new WeakMap(), _defaultFontSize = new WeakMap(), _xBackgroundHeight = new WeakMap(), _yBackgroundWidth = new WeakMap(), _xScale = new WeakMap(), _yScale = new WeakMap(), _xAxis = new WeakMap(), _yAxis = new WeakMap(), _zoomLevel = new WeakMap(), _svgMap = new WeakMap(), _svgXAxis = new WeakMap(), _svgYAxis = new WeakMap(), _gXAxis = new WeakMap(), _gYAxis = new WeakMap();
//# sourceMappingURL=display-grid.js.map
/*!
 * This file is part of na-map.
 *
 * @file      Display map.
 * @module    map/map
 * @author    iB aka Felix Victor
 * @copyright 2017, 2018, 2019, 2020
 * @license   http://www.gnu.org/licenses/gpl.html
 */
import "bootstrap/js/dist/util";
import "bootstrap/js/dist/modal";
import * as d3Range from "d3-array";
import * as d3Selection from "d3-selection";
import * as d3Zoom from "d3-zoom";
import { registerEvent } from "../analytics";
import { appDescription, appTitle, appVersion, insertBaseModal } from "../../common/common-browser";
import { displayClan, roundToThousands } from "../util";
import Cookie from "../util/cookie";
import RadioButton from "../util/radio-button";
import DisplayPbZones from "./display-pb-zones";
import DisplayPorts from "./display-ports";
import SelectPorts from "./select-ports";
import ShowF11 from "../map-tools/show-f11";
import DisplayGrid from "../map-tools/display-grid";
import Journey from "../map-tools/make-journey";
import PredictWind from "../map-tools/predict-wind";
import WindRose from "../map-tools/wind-rose";
import ShowTrades from "../map-tools/show-trades";
import { defaultFontSize, nearestPow2 } from "../../common/common-math";
class NAMap {
    constructor(serverName, searchParams) {
        this._minScale = 0;
        this.width = 0;
        this.height = 0;
        this._currentScale = 0;
        this.serverName = serverName;
        this._searchParams = searchParams;
        this.rem = defaultFontSize;
        this.xGridBackgroundHeight = Math.floor(3 * this.rem);
        this.yGridBackgroundWidth = Math.floor(4 * this.rem);
        this.coord = {
            min: 0,
            max: 8192
        };
        this._tileSize = 256;
        this._maxScale = 2 ** 3;
        this._wheelDelta = 0.5;
        this._PBZoneZoomThreshold = 1.5;
        this._labelZoomThreshold = 0.5;
        this._doubleClickActionId = "double-click-action";
        this._doubleClickActionValues = ["compass", "f11"];
        this._doubleClickActionCookie = new Cookie({
            id: this._doubleClickActionId,
            values: this._doubleClickActionValues
        });
        this._doubleClickActionRadios = new RadioButton(this._doubleClickActionId, this._doubleClickActionValues);
        this._doubleClickAction = this._getDoubleClickAction();
        this._showGridId = "show-grid";
        this._showGridValues = ["off", "on"];
        this._showGridCookie = new Cookie({ id: this._showGridId, values: this._showGridValues });
        this._showGridRadios = new RadioButton(this._showGridId, this._showGridValues);
        this._showGrid = this._getShowGridValue();
        this.gridOverlay = document.getElementsByClassName("overlay")[0];
        this._setHeightWidth();
        this._setupScale();
        this._setupSvg();
        this._setSvgSize();
        this._setupListener();
    }
    async MapInit() {
        await this._setupData();
    }
    _getDoubleClickAction() {
        const r = this._doubleClickActionCookie.get();
        this._doubleClickActionRadios.set(r);
        return r;
    }
    _getShowGridValue() {
        const r = this._showGridCookie.get();
        this._showGridRadios.set(r);
        return r;
    }
    async _setupData() {
        this._f11 = new ShowF11(this, this.coord);
        this._ports = new DisplayPorts(this);
        await this._ports.init();
        this._pbZone = new DisplayPbZones(this._ports);
        this._grid = new DisplayGrid(this);
        this._journey = new Journey(this.rem);
        this._windPrediction = new PredictWind();
        this._windRose = new WindRose();
        this._portSelect = new SelectPorts(this._ports, this._pbZone, this);
        this.showTrades = new ShowTrades(this.serverName, this._portSelect, this._minScale, this.coord.min, this.coord.max);
        await this.showTrades.showOrHide();
    }
    static _stopProperty() {
        if (d3Selection.event.defaultPrevented) {
            d3Selection.event.stopPropagation();
        }
    }
    _setupListener() {
        this._svg
            .on("dblclick.zoom", null)
            .on("click", NAMap._stopProperty, true)
            .on("dblclick", (_d, i, nodes) => this._doDoubleClickAction(nodes[i]));
        document.getElementById("propertyDropdown")?.addEventListener("click", () => {
            registerEvent("Menu", "Select port on property");
        });
        document.getElementById("settingsDropdown")?.addEventListener("click", () => {
            registerEvent("Menu", "Settings");
        });
        document.getElementById("button-download-pb-calc")?.addEventListener("click", () => {
            registerEvent("Tools", "Download pb calculator");
        });
        document.getElementById("reset")?.addEventListener("click", () => {
            this._clearMap();
        });
        document.getElementById("about")?.addEventListener("click", () => {
            this._showAbout();
        });
        document.getElementById("double-click-action")?.addEventListener("change", () => this._doubleClickSelected());
        document.getElementById("show-grid")?.addEventListener("change", () => this._showGridSelected());
    }
    _setupScale() {
        this._minScale = nearestPow2(Math.min(this.width / this.coord.max, this.height / this.coord.max));
        this._currentScale = this._minScale;
    }
    _setupSvg() {
        this._zoom = d3Zoom
            .zoom()
            .wheelDelta(() => -this._wheelDelta * Math.sign(d3Selection.event.deltaY))
            .translateExtent([
            [
                this.coord.min - this.yGridBackgroundWidth * this._minScale,
                this.coord.min - this.xGridBackgroundHeight * this._minScale
            ],
            [this.coord.max, this.coord.max]
        ])
            .scaleExtent([this._minScale, this._maxScale])
            .on("zoom", () => this._naZoomed());
        this._svg = d3Selection
            .select("#na-map")
            .append("svg")
            .attr("id", "na-svg")
            .call(this._zoom);
        this._svg.append("defs");
        this._gMap = this._svg.append("g").classed("map", true);
    }
    _doubleClickSelected() {
        this._doubleClickAction = this._doubleClickActionRadios.get();
        this._doubleClickActionCookie.set(this._doubleClickAction);
        this._clearMap();
    }
    _showGridSelected() {
        this._showGrid = this._showGridRadios.get();
        this._grid.show = this._showGrid === "on";
        this._showGridCookie.set(this._showGrid);
        this._refreshLayer();
    }
    _refreshLayer() {
        this._grid.update();
    }
    _displayMap(transform) {
        const { x: tx, y: ty, k: tk } = transform;
        const log2tileSize = Math.log2(this._tileSize);
        const maxTileZoom = Math.log2(this.coord.max) - log2tileSize;
        const maxCoordScaled = this.coord.max * tk;
        const x0 = 0;
        const y0 = 0;
        const x1 = this.width;
        const y1 = this.height;
        const width = Math.floor(maxCoordScaled < x1 ? x1 - 2 * tx : maxCoordScaled);
        const height = Math.floor(maxCoordScaled < y1 ? y1 - 2 * ty : maxCoordScaled);
        const scale = Math.log2(tk);
        const tileZoom = Math.min(maxTileZoom, Math.ceil(Math.log2(Math.max(width, height))) - log2tileSize);
        const p = Math.round((tileZoom - scale - maxTileZoom) * 10) / 10;
        const k = this._wheelDelta ** p;
        const tileSizeScaled = this._tileSize * k;
        const dx = maxCoordScaled < x1 ? tx : 0;
        const dy = maxCoordScaled < y1 ? ty : 0;
        const cols = d3Range.range(Math.max(0, Math.floor((x0 - tx) / tileSizeScaled)), Math.max(0, Math.min(Math.ceil((x1 - tx - dx) / tileSizeScaled), 2 ** tileZoom)));
        const rows = d3Range.range(Math.max(0, Math.floor((y0 - ty) / tileSizeScaled)), Math.max(0, Math.min(Math.ceil((y1 - ty - dy) / tileSizeScaled), 2 ** tileZoom)));
        const tiles = [];
        for (const row of rows) {
            for (const col of cols) {
                tiles.push({
                    z: tileZoom,
                    row,
                    col,
                    id: `${tileZoom.toString()}-${row.toString()}-${col.toString()}`
                });
            }
        }
        const transformNew = d3Zoom.zoomIdentity.translate(tx, ty).scale(roundToThousands(k));
        this._updateMap(tiles, transformNew);
    }
    _updateMap(tiles, transform) {
        this._gMap
            .attr("transform", transform.toString())
            .selectAll("image")
            .data(tiles, d => d.id)
            .join(enter => enter
            .append("image")
            .attr("xlink:href", d => `images/map/${d.z}/${d.row}/${d.col}.webp`)
            .attr("x", d => d.col * this._tileSize)
            .attr("y", d => d.row * this._tileSize)
            .attr("width", this._tileSize + 1)
            .attr("height", this._tileSize + 1));
    }
    _clearMap() {
        this._windPrediction.clearMap();
        this._windRose.clearMap();
        this._f11.clearMap();
        this._ports.clearMap();
        this._portSelect.clearMap();
        this.showTrades.clearMap();
        $(".selectpicker")
            .val("default")
            .selectpicker("refresh");
    }
    static _initModal(id) {
        insertBaseModal(id, `${appTitle} <span class="text-primary small">v${appVersion}</span>`, "");
        const body = d3Selection.select(`#${id} .modal-body`);
        body.html(`<p>${appDescription} Please check the <a href="https://forum.game-labs.net/topic/23980-yet-another-map-naval-action-map/"> Game-Labs forum post</a> for further details. Feedback is very welcome.</p><p>Designed by iB aka Felix Victor, clan Bastard Sons ${displayClan("(BASTD)")}</a>.</p>`);
    }
    _showAbout() {
        const modalId = "modal-about";
        const modal$ = $(`#${modalId}`);
        if (!modal$.length) {
            NAMap._initModal(modalId);
        }
        modal$.modal("show");
    }
    _doDoubleClickAction(self) {
        const coord = d3Selection.mouse(self);
        const transform = d3Zoom.zoomTransform(self);
        const [mx, my] = coord;
        const { k: tk, x: tx, y: ty } = transform;
        const x = (mx - tx) / tk;
        const y = (my - ty) / tk;
        if (this._doubleClickAction === "f11") {
            this._f11.printCoord(x, y);
        }
        else {
            this._journey.plotCourse(x, y);
        }
        this.zoomAndPan(x, y, 1);
    }
    _setZoomLevelAndData() {
        if (d3Selection.event.transform.k !== this._currentScale) {
            this._currentScale = d3Selection.event.transform.k;
            if (this._currentScale > this._PBZoneZoomThreshold) {
                if (this.zoomLevel !== "pbZone") {
                    this.zoomLevel = "pbZone";
                }
            }
            else if (this._currentScale > this._labelZoomThreshold) {
                if (this.zoomLevel !== "portLabel") {
                    this.zoomLevel = "portLabel";
                }
            }
            else if (this.zoomLevel !== "initial") {
                this.zoomLevel = "initial";
            }
            this._setFlexOverlayHeight();
            this._grid.update();
        }
        this._pbZone.refresh();
        this._ports.update(this._currentScale);
    }
    _naZoomed() {
        this._currentTranslate = {
            x: Math.floor(d3Selection.event.transform.x),
            y: Math.floor(d3Selection.event.transform.y)
        };
        const zoomTransform = d3Zoom.zoomIdentity
            .translate(this._currentTranslate.x, this._currentTranslate.y)
            .scale(roundToThousands(d3Selection.event.transform.k));
        const lowerBound = zoomTransform.invert([this.coord.min, this.coord.min]);
        const upperBound = zoomTransform.invert([this.width, this.height]);
        this._ports.setBounds(lowerBound, upperBound);
        this._pbZone.setBounds(lowerBound, upperBound);
        this.showTrades.setBounds(lowerBound, upperBound);
        this._displayMap(zoomTransform);
        this._grid.transform(zoomTransform);
        this._ports.transform(zoomTransform);
        this._journey.transform(zoomTransform);
        this._pbZone.transform(zoomTransform);
        this._f11.transform(zoomTransform);
        this.showTrades.transform(zoomTransform);
        this._setZoomLevelAndData();
    }
    _checkF11Coord() {
        if (this._searchParams.has("x") && this._searchParams.has("z")) {
            this._f11.goToF11FromParam(this._searchParams);
        }
    }
    _init() {
        this.zoomLevel = "initial";
        this.initialZoomAndPan();
        this._checkF11Coord();
        this._setFlexOverlayHeight();
    }
    set zoomLevel(zoomLevel) {
        this._zoomLevel = zoomLevel;
        this._ports.zoomLevel = zoomLevel;
        this._grid.zoomLevel = zoomLevel;
    }
    get zoomLevel() {
        return this._zoomLevel;
    }
    resize() {
        const zoomTransform = d3Zoom.zoomIdentity
            .translate(this._currentTranslate.x, this._currentTranslate.y)
            .scale(this._currentScale);
        this._setHeightWidth();
        this._setSvgSize();
        this._setFlexOverlayHeight();
        this._displayMap(zoomTransform);
        this._grid.update();
    }
    getDimensions() {
        const selector = document.getElementsByClassName("overlay")[0];
        return selector.getBoundingClientRect();
    }
    _getWidth() {
        const { width } = this.getDimensions();
        return Math.floor(width);
    }
    _getHeight() {
        const { top } = this.getDimensions();
        const fullHeight = document.documentElement.clientHeight - this.rem;
        return Math.floor(fullHeight - top);
    }
    _setHeightWidth() {
        this.width = this._getWidth();
        this.height = this._getHeight();
    }
    _setSvgSize() {
        this._svg.attr("width", this.width).attr("height", this.height);
    }
    _setFlexOverlayHeight() {
        const height = this.height - (this._grid.show && this.zoomLevel !== "initial" ? this.xGridBackgroundHeight : 0);
        document.getElementById("summary-column")?.setAttribute("style", `height:${height}px`);
    }
    initialZoomAndPan() {
        this._svg.call(this._zoom.scaleTo, this._minScale);
    }
    zoomAndPan(x, y, scale) {
        const transform = d3Zoom.zoomIdentity
            .scale(scale)
            .translate(Math.round(-x + this.width / 2 / scale), Math.round(-y + this.height / 2 / scale));
        this._svg.call(this._zoom.transform, transform);
    }
    goToPort() {
        if (this._ports.currentPort.id === "0") {
            this.initialZoomAndPan();
        }
        else {
            this.zoomAndPan(this._ports.currentPort.coord.x, this._ports.currentPort.coord.y, 2);
        }
    }
}
export { NAMap };
//# sourceMappingURL=NAMap.js.map
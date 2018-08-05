/**
 * This file is part of na-map.
 *
 * @file      Display naval action map.
 * @module    map
 * @author    iB aka Felix Victor
 * @copyright 2017, 2018
 * @license   http://www.gnu.org/licenses/gpl.html
 */

/* global d3 : false
 */

import { feature as topojsonFeature } from "topojson-client";
import moment from "moment";
import "moment/locale/en-gb";
import Cookies from "js-cookie";

import { defaultFontSize } from "./common";
import {
    nearestPow2,
    checkFetchStatus,
    getJsonFromFetch,
    getTextFromFetch,
    putFetchError,
    roundToThousands
} from "./util";

import Course from "./course";
import F11 from "./f11";
import Grid from "./grid";
import PBZone from "./pbzone";
import PortDisplay from "./port";
import PortSelect from "./port-select";
import ShipCompare from "./ship-compare";
import Teleport from "./teleport";
import WindPrediction from "./wind-prediction";
import WoodCompare from "./wood-compare";
import Module from "./module-list";
import Recipe from "./recipe-list";
import Ingredient from "./ingredient-list";
import Building from "./building-list";
import { registerEvent } from "./analytics";

/**
 * Display naval action map
 */
export default class Map {
    /**
     * @param {string} serverName - Naval action server name
     */
    constructor(serverName) {
        /**
         * Naval action server name
         * @type {string}
         * @private
         */
        this._serverName = serverName;

        /**
         * Font size in px
         * @type {Number}
         * @private
         */
        this._rem = defaultFontSize;

        /**
         * Left padding for brand icon
         * @type {Number}
         * @private
         */
        this._navbarBrandPaddingLeft = Math.floor(1.618 * this._rem); // equals 1.618rem

        /**
         * Left padding for brand icon
         * @type {Number}
         * @private
         */
        this._xGridBackgroundHeight = Math.floor(3 * this._rem);

        /**
         * Left padding for brand icon
         * @type {Number}
         * @private
         */
        this._yGridBackgroundWidth = Math.floor(4 * this._rem);

        /**
         * Margins of the map svg
         * @type {Object}
         * @property {Number} top - Top margin
         * @property {Number} right - Right margin
         * @property {Number} bottom - Bottom margin
         * @property {Number} left - Left margin
         * @private
         */
        this._margin = {
            top: Math.floor($(".navbar").height() + this._navbarBrandPaddingLeft),
            right: this._navbarBrandPaddingLeft,
            bottom: this._navbarBrandPaddingLeft,
            left: this._navbarBrandPaddingLeft
        };

        /**
         * Outer bounds (world coordinates)
         * @type {Object}
         * @property {Number} min - Minimum world coordinate
         * @property {Number} max - Maximum world coordinate
         * @private
         */
        this._coord = {
            min: 0,
            max: 8192
        };

        /**
         * Width of map svg (screen coordinates)
         * @type {Number}
         * @private
         */
        // eslint-disable-next-line no-restricted-globals
        this._width = Math.floor(top.innerWidth - this._margin.left - this._margin.right);

        /**
         * Height of map svg (screen coordinates)
         * @type {Number}
         * @private
         */
        // eslint-disable-next-line no-restricted-globals
        this._height = Math.floor(top.innerHeight - this._margin.top - this._margin.bottom);

        this._tileSize = 256;
        this._maxScale = 2 ** 3; // power of 2
        this._wheelDelta = 0.5;
        this._zoomLevel = "initial";
        this._PBZoneZoomThreshold = 1.5;
        this._labelZoomThreshold = 0.5;

        this._minScale = nearestPow2(Math.min(this._width / this._coord.max, this._height / this._coord.max));

        /**
         * Current map scale
         * @type {Number}
         * @private
         */
        this._currentScale = this._minScale;

        /**
         * DoubleClickAction cookie name
         * @type {string}
         * @private
         * @private
         */
        this._doubleClickActionCookieName = "na-map--double-click";

        /**
         * Default DoubleClickAction setting
         * @type {string}
         * @private
         * @private
         */
        this._doubleClickActionDefault = "compass";

        /**
         * Get DoubleClickAction setting from cookie or use default value
         * @type {string}
         * @private
         */
        this._doubleClickAction = this._getDoubleClickAction();

        /**
         * showLayer cookie name
         * @type {string}
         * @private
         */
        this._showLayerCookieName = "na-map--show-layer";

        /**
         * Default showLayer setting
         * @type {string}
         * @private
         */
        this._showLayerDefault = "grid";

        /**
         * Get showLayer setting from cookie or use default value
         * @type {string}
         * @private
         */
        this._showLayer = this._getShowLayer();

        this._setupSvg();
        this._setupListener();
        this._setupProps();
        this._readData(this._getCacheMode());
    }

    /**
     * Read cookie for doubleClickAction
     * @return {string} doubleClickAction
     * @private
     */
    _getDoubleClickAction() {
        let r = Cookies.get(this.doubleClickActionCookieName);
        // Use default value if cookie is not stored
        r = typeof r !== "undefined" ? r : this.doubleClickActionDefault;
        console.log("_getDoubleClickAction", r);
        return r;
    }

    /**
     * Read cookie for showLayer
     * @return {string} showLayer
     * @private
     */
    _getShowLayer() {
        let r = Cookies.get(this.showLayerCookieName);
        // Use default value if cookie is not stored
        r = typeof r !== "undefined" ? r : this.showLayerDefault;
        console.log("_getShowLayer", r);
        return r;
    }

    _getCacheMode() {
        console.log("     _getCacheMode");
        let cacheMode = "default";
        const lastUpdateData = fetch("update.txt", { cache: "reload" })
            .then(checkFetchStatus)
            .then(getTextFromFetch);
        Promise.all([lastUpdateData])
            .then(values => {
                let serverDayStart = moment()
                    .utc()
                    .hour(11)
                    .minute(0);
                if (serverDayStart.isAfter(moment().utc())) {
                    serverDayStart = serverDayStart.subtract(1, "day");
                }
                const lastUpdate = moment(values[0], "YYYY-MM-DD H.mm");
                /*
                    console.log(
                        "serverDayStart",
                        serverDayStart.format("dddd D MMMM H.mm"),
                        "lastUpdate",
                        lastUpdate.format("dddd D MMMM H.mm"),
                        "lastUpdate.isBefore(serverDayStart)",
                        lastUpdate.isBefore(serverDayStart, "hour")
                    );
                    */
                if (lastUpdate.isBefore(serverDayStart, "hour")) {
                    cacheMode = "reload";
                }
            })
            .catch(putFetchError);
        return cacheMode;
    }

    _assignData(data) {
        // Port ids of capturable ports
        let portIds = [];

        function getFeature(object) {
            return object.filter(port => portIds.includes(port.id)).map(d => ({
                type: "Feature",
                id: d.id,
                geometry: d.geometry
            }));
        }

        const portData = topojsonFeature(data.ports, data.ports.objects.ports);
        this._ports = new PortDisplay(
            portData.features,
            data.pb,
            this.serverName,
            this.margin.top,
            this.margin.right,
            this.minScale
        );

        // Port ids of capturable ports
        portIds = portData.features.filter(port => !port.properties.nonCapturable).map(port => port.id);

        let pbCircles = topojsonFeature(data.pbZones, data.pbZones.objects.pbCircles);
        pbCircles = getFeature(pbCircles.features);

        let forts = topojsonFeature(data.pbZones, data.pbZones.objects.forts);
        forts = getFeature(forts.features);

        let towers = topojsonFeature(data.pbZones, data.pbZones.objects.towers);
        towers = getFeature(towers.features);

        let joinCircles = topojsonFeature(data.pbZones, data.pbZones.objects.joinCircles);
        joinCircles = getFeature(joinCircles.features);

        this._pbZone = new PBZone(pbCircles, forts, towers, joinCircles, this._ports);

        const shipData = JSON.parse(JSON.stringify(data.ships.shipData));
        this._shipCompare = new ShipCompare(shipData);

        const woodData = JSON.parse(JSON.stringify(data.woods));
        this._woodCompare = new WoodCompare(woodData);

        const moduleData = JSON.parse(JSON.stringify(data.modules));
        this._moduleList = new Module(moduleData);

        const recipeData = JSON.parse(JSON.stringify(data.recipes.recipe));
        this._recipeList = new Recipe(recipeData, moduleData);

        const ingredientData = JSON.parse(JSON.stringify(data.recipes.ingredient));
        this._ingredientList = new Ingredient(ingredientData, moduleData);

        const buildingData = JSON.parse(JSON.stringify(data.buildings));
        this._buildingList = new Building(buildingData);

        this._teleport = new Teleport(this.coord.min, this.coord.max, this._ports);
        this._portSelect = new PortSelect(this, this._ports, this._pbZone);
        this._windPrediction = new WindPrediction(this.margin.left, this.margin.top);
        this._f11 = new F11(this);
        this._grid = new Grid(this);
        this._course = new Course(this.rem);
    }

    _readData(cacheMode) {
        console.log("_readData");
        const naMapJsonData = fetch(`${this.serverName}.json`, { cache: cacheMode })
            .then(checkFetchStatus)
            .then(getJsonFromFetch);
        const pbJsonData = fetch(`${this.serverName}-pb.json`, { cache: cacheMode })
            .then(checkFetchStatus)
            .then(getJsonFromFetch);
        const pbZonesJsonData = fetch("pb.json", { cache: cacheMode })
            .then(checkFetchStatus)
            .then(getJsonFromFetch);
        const shipJsonData = fetch("ships.json", { cache: cacheMode })
            .then(checkFetchStatus)
            .then(getJsonFromFetch);
        const woodJsonData = fetch("woods.json", { cache: cacheMode })
            .then(checkFetchStatus)
            .then(getJsonFromFetch);
        const moduleJsonData = fetch("modules.json", { cache: cacheMode })
            .then(checkFetchStatus)
            .then(getJsonFromFetch);
        const recipeJsonData = fetch("recipes.json", { cache: cacheMode })
            .then(checkFetchStatus)
            .then(getJsonFromFetch);
        const buildingJsonData = fetch("buildings.json", { cache: cacheMode })
            .then(checkFetchStatus)
            .then(getJsonFromFetch);
        Promise.all([
            naMapJsonData,
            pbJsonData,
            pbZonesJsonData,
            shipJsonData,
            woodJsonData,
            moduleJsonData,
            recipeJsonData,
            buildingJsonData
        ])
            .then(values => {
                this._assignData({
                    ports: values[0],
                    pb: values[1],
                    pbZones: values[2],
                    ships: values[3],
                    woods: values[4],
                    modules: values[5],
                    recipes: values[6],
                    buildings: values[7]
                });
                this._init();
            })
            .catch(putFetchError);
    }

    _setupListener() {
        console.log("_setupListener");
        function stopProp() {
            if (d3.event.defaultPrevented) {
                d3.event.stopPropagation();
            }
        }

        this.svg
            .on("dblclick.zoom", null)
            .on("click", stopProp, true)
            .on("dblclick", (d, i, nodes) => this._doDoubleClickAction(nodes[i]));

        $("#reset").on("click", () => {
            this._clearMap();
        });

        $("#propertyDropdown").on("click", () => {
            registerEvent("Menu", "Select port on property");
        });
        $("#settingsDropdown").on("click", () => {
            registerEvent("Menu", "Settings");
        });
        $("#button-download-pb-calc").on("click", () => {
            registerEvent("Tools", "Download pb calculator");
        });

        $("#doubleClick-action").change(() => this._doubleClickSelected());

        $("#show-layer").change(() => this._showLayerSelected());

        $("#about").on("click", () => {
            this._showAbout();
        });
    }

    _setupSvg() {
        console.log("_setupSvg");
        // noinspection JSSuspiciousNameCombination
        this.zoom = d3
            .zoom()
            .scaleExtent([this.minScale, this.maxScale])
            .translateExtent([
                [
                    this.coord.min - this.yGridBackgroundWidth * this.minScale,
                    this.coord.min - this.xGridBackgroundHeight * this.minScale
                ],
                [this.coord.max, this.coord.max]
            ])
            .wheelDelta(() => -this.wheelDelta * Math.sign(d3.event.deltaY))
            .on("zoom", () => this._naZoomed());

        this.svg = d3
            .select("#na")
            .append("svg")
            .attr("id", "na-svg")
            .attr("width", this.width)
            .attr("height", this.height)
            .style("position", "absolute")
            .style("top", `${this.margin.top}px`)
            .style("left", `${this.margin.left}px`)
            .call(this.zoom);

        this.svg.append("defs");

        this.g = this.svg.append("g").classed("map", true);
    }

    _setupProps() {
        $(`#doubleClick-action-${this.doubleClickAction}`).prop("checked", true);
        $(`#show-layer-${this.showLayer}`).prop("checked", true);
    }

    /**
     * Store show setting in cookie
     * @return {void}
     * @private
     */
    _storeDoubleClickActionSetting() {
        if (this.doubleClickAction !== this.doubleClickActionDefault) {
            Cookies.set(this.doubleClickActionCookieName, this.doubleClickAction);
        } else {
            Cookies.remove(this.doubleClickActionCookieName);
        }
    }

    _doubleClickSelected() {
        this.doubleClickAction = $("input[name='doubleClickAction']:checked").val();
        this._storeDoubleClickActionSetting();
        this._clearMap();
    }

    /**
     * Store show setting in cookie
     * @return {void}
     * @private
     */
    _storeShowLayerSetting() {
        if (this.showLayer !== this.showLayerDefault) {
            Cookies.set(this.showLayerCookieName, this.showLayer);
        } else {
            Cookies.remove(this.showLayerCookieName);
        }
    }

    _showLayerSelected() {
        this.showLayer = $("input[name='showLayer']:checked").val();
        this._storeShowLayerSetting();
        this._refreshLayer();
    }

    _refreshLayer() {
        const showGrid = this.showLayer === "grid",
            showTeleport = this.showLayer === "teleport";

        this._grid.show = showGrid;
        this._grid.update();

        this._teleport.show = showTeleport;
        this._teleport.setData();
        this._teleport.update();
    }

    _displayMap(transform) {
        // Based on d3-tile v0.0.3
        // https://github.com/d3/d3-tile/blob/0f8cc9f52564d4439845f651c5fab2fcc2fdef9e/src/tile.js
        const log2tileSize = Math.log2(this.tileSize),
            maxTileZoom = Math.log2(this.coord.max) - log2tileSize,
            x0 = 0,
            y0 = 0,
            x1 = this.width,
            y1 = this.height,
            width = Math.floor(
                this.coord.max * transform.k < this.width ? this.width - 2 * transform.x : this.coord.max * transform.k
            ),
            height = Math.floor(
                this.coord.max * transform.k < this.height
                    ? this.height - 2 * transform.y
                    : this.coord.max * transform.k
            ),
            scale = Math.log2(transform.k);

        const tileZoom = Math.min(maxTileZoom, Math.ceil(Math.log2(Math.max(width, height))) - log2tileSize),
            p = Math.round(tileZoom * 10 - scale * 10 - maxTileZoom * 10) / 10,
            k = this.wheelDelta ** p;

        const { x } = transform,
            { y } = transform,
            // crop right side
            dx = this.coord.max * transform.k < this.width ? transform.x : 0,
            // crop bottom
            dy = this.coord.max * transform.k < this.height ? transform.y : 0,
            cols = d3.range(
                Math.max(0, Math.floor((x0 - x) / this.tileSize / k)),
                Math.max(0, Math.min(Math.ceil((x1 - x - dx) / this.tileSize / k), 2 ** tileZoom))
            ),
            rows = d3.range(
                Math.max(0, Math.floor((y0 - y) / this.tileSize / k)),
                Math.max(0, Math.min(Math.ceil((y1 - y - dy) / this.tileSize / k), 2 ** tileZoom))
            ),
            tiles = [];

        rows.forEach(row => {
            cols.forEach(col => {
                tiles.push([col, row, tileZoom]);
            });
        });

        tiles.translate = [x, y];
        tiles.scale = k;

        this._updateMap(tiles);
    }

    _updateMap(tiles) {
        // noinspection JSSuspiciousNameCombination
        const tileTransform = d3.zoomIdentity
            .translate(Math.round(tiles.translate[0]), Math.round(tiles.translate[1]))
            .scale(Math.round(tiles.scale * 1000) / 1000);

        const image = this.g
            .attr("transform", tileTransform)
            .selectAll("image")
            .data(tiles, d => d);

        image.exit().remove();

        image
            .enter()
            .append("image")
            .attr("xlink:href", d => `images/map/${d[2]}/${d[1]}/${d[0]}.jpg`)
            .attr("x", d => d[0] * this.tileSize)
            .attr("y", d => d[1] * this.tileSize)
            .attr("width", this.tileSize)
            .attr("height", this.tileSize);
    }

    _clearMap() {
        this._windPrediction.clearMap();
        this._course.clearMap();
        this._f11.clearMap();
        this._ports.clearMap();
        this._portSelect.clearMap();
        $(".selectpicker")
            .val("default")
            .selectpicker("refresh");
    }

    _showAbout() {
        $("#modal-about").modal("show");
    }

    _doDoubleClickAction(self) {
        const coord = d3.mouse(self),
            transform = d3.zoomTransform(self);
        const mx = coord[0],
            my = coord[1],
            tk = transform.k,
            tx = transform.x,
            ty = transform.y;

        const x = (mx - tx) / tk,
            y = (my - ty) / tk;

        if (this.doubleClickAction === "f11") {
            this._f11.printCoord(x, y);
        } else {
            this._course.plotCourse(x, y);
        }

        this.zoomAndPan(x, y, 1);
    }

    _updateCurrent() {
        this._pbZone.refresh();
        this._grid.update();
        this._teleport.setData();
        this._teleport.update();
        this._ports.update(this.currentScale);
    }

    _setZoomLevelAndData() {
        if (d3.event.transform.k !== this.currentScale) {
            this.currentScale = d3.event.transform.k;
            if (this.currentScale > this.PBZoneZoomThreshold) {
                if (this.zoomLevel !== "pbZone") {
                    this.zoomLevel = "pbZone";
                }
            } else if (this.currentScale > this.labelZoomThreshold) {
                if (this.zoomLevel !== "portLabel") {
                    this.zoomLevel = "portLabel";
                }
            } else if (this.zoomLevel !== "initial") {
                this.zoomLevel = "initial";
            }
            this._updateCurrent();
        }
    }

    /**
     * Zoom svg groups
     * @return {void}
     * @private
     */
    _naZoomed() {
        this._setZoomLevelAndData();

        /**
         * D3 transform ({@link https://github.com/d3/d3-zoom/blob/master/src/transform.js})
         * @external Transform
         * @property {number} x - X Coordinate
         * @property {number} y - Y Coordinate
         * @property {number} k - Scale factor
         */

        /**
         * Current transform
         * @type {Transform}
         */
        const zoomTransform = d3.zoomIdentity
            .translate(Math.round(d3.event.transform.x), Math.round(d3.event.transform.y))
            .scale(roundToThousands(d3.event.transform.k));

        this._displayMap(zoomTransform);
        this._grid.transform(zoomTransform);
        this._ports.transform(zoomTransform);
        this._teleport.transform(zoomTransform);
        this._course.transform(zoomTransform);
        this._pbZone.transform(zoomTransform);
        this._f11.transform(zoomTransform);
    }

    _initialZoomAndPan() {
        this.svg.call(this.zoom.scaleTo, this.minScale);
    }

    _init() {
        this.zoomLevel = "initial";
        this._initialZoomAndPan();
        this._refreshLayer();

        this._ports.clearMap(this.minScale);
        this._f11.checkF11Coord();
    }

    get coord() {
        return this._coord;
    }

    set currentScale(scale) {
        this._currentScale = scale;
    }

    get currentScale() {
        return this._currentScale;
    }

    get doubleClickActionCookieName() {
        return this._doubleClickActionCookieName;
    }

    set doubleClickAction(action) {
        this._doubleClickAction = action;
    }

    get doubleClickAction() {
        return this._doubleClickAction;
    }

    get doubleClickActionDefault() {
        return this._doubleClickActionDefault;
    }

    set g(g) {
        this._g = g;
    }

    get g() {
        return this._g;
    }

    get height() {
        return this._height;
    }

    get margin() {
        return this._margin;
    }

    get labelZoomThreshold() {
        return this._labelZoomThreshold;
    }

    get maxScale() {
        return this._maxScale;
    }

    get minScale() {
        return this._minScale;
    }

    get PBZoneZoomThreshold() {
        return this._PBZoneZoomThreshold;
    }

    get rem() {
        return this._rem;
    }

    set svg(svg) {
        this._svg = svg;
    }

    get svg() {
        return this._svg;
    }

    get serverName() {
        return this._serverName;
    }

    get showLayerCookieName() {
        return this._showLayerCookieName;
    }

    get showLayer() {
        return this._showLayer;
    }

    set showLayer(layer) {
        this._showLayer = layer;
    }

    get showLayerDefault() {
        return this._showLayerDefault;
    }

    get tileSize() {
        return this._tileSize;
    }

    get width() {
        return this._width;
    }

    get wheelDelta() {
        return this._wheelDelta;
    }

    get xGridBackgroundHeight() {
        return this._xGridBackgroundHeight;
    }

    get yGridBackgroundWidth() {
        return this._yGridBackgroundWidth;
    }

    set zoom(zoom) {
        this._zoom = zoom;
    }

    set zoomLevel(zoomLevel) {
        this._zoomLevel = zoomLevel;
        this._ports.zoomLevel = zoomLevel;
        this._grid.zoomLevel = zoomLevel;
        this._teleport.zoomLevel = zoomLevel;
    }

    get zoomLevel() {
        return this._zoomLevel;
    }

    get zoom() {
        return this._zoom;
    }

    zoomAndPan(x, y, scale) {
        const transform = d3.zoomIdentity
            .scale(scale)
            .translate(Math.round(-x + this.width / 2 / scale), Math.round(-y + this.height / 2 / scale));
        this.svg.call(this.zoom.transform, transform);
    }

    goToPort() {
        if (this._ports.currentPort.id !== "0") {
            this.zoomAndPan(this._ports.currentPort.coord.x, this._ports.currentPort.coord.y, 2);
        } else {
            this.initialZoomAndPan();
        }
    }
}

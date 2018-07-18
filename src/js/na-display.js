/**
 * This file is part of na-map.
 *
 * @file      Display naval action map.
 * @module    na-display
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

import "bootstrap/js/dist/tooltip";
import "bootstrap/js/dist/util";

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
import Building from "./building-list";
import { registerEvent } from "./analytics";

/**
 * Display naval action map
 * @param {string} serverName - Naval action server name
 * @returns {void}
 */
export default function naDisplay(serverName) {
    let map,
        ports,
        teleport,
        portSelect,
        shipCompare,
        woodCompare,
        moduleList,
        recipeList,
        buildingList,
        windPrediction,
        f11,
        course,
        grid,
        pbZone,
        shipData,
        woodData,
        moduleData,
        recipeData,
        buildingData;

    /** Main map */
    class NAMap {
        /**
         * Constructor
         */
        constructor() {
            /**
             * Font size in px
             * @type {Number}
             */
            this.rem = defaultFontSize;

            /**
             * Left padding for brand icon
             * @type {Number}
             */
            this._navbarBrandPaddingLeft = Math.floor(1.618 * this.rem); // equals 1.618rem

            /**
             * Left padding for brand icon
             * @type {Number}
             */
            this.xGridBackgroundHeight = Math.floor(3 * this.rem);

            /**
             * Left padding for brand icon
             * @type {Number}
             */
            this.yGridBackgroundWidth = Math.floor(4 * this.rem);

            /**
             * Margins of the map svg
             * @type {Object}
             * @property {Number} top - Top margin
             * @property {Number} right - Right margin
             * @property {Number} bottom - Bottom margin
             * @property {Number} left - Left margin
             */
            this.margin = {
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
             */
            this.coord = {
                min: 0,
                max: 8192
            };

            /**
             * Width of map svg (screen coordinates)
             * @type {Number}
             */
            // eslint-disable-next-line no-restricted-globals
            this._width = Math.floor(top.innerWidth - this.margin.left - this.margin.right);

            /**
             * Height of map svg (screen coordinates)
             * @type {Number}
             */
            // eslint-disable-next-line no-restricted-globals
            this._height = Math.floor(top.innerHeight - this.margin.top - this.margin.bottom);

            this._tileSize = 256;
            this._maxScale = 2 ** 3; // power of 2
            this._wheelDelta = 0.5;
            this._zoomLevel = "initial";
            this._PBZoneZoomThreshold = 1.5;
            this._labelZoomThreshold = 0.5;

            this.minScale = nearestPow2(Math.min(this._width / this.coord.max, this._height / this.coord.max));

            /**
             * Current map scale
             * @type {Number}
             */
            this.currentScale = this.minScale;

            /**
             * DoubleClickAction cookie name
             * @type {string}
             * @private
             */
            this._doubleClickActionCookieName = "na-map--double-click";

            /**
             * Default DoubleClickAction setting
             * @type {string}
             * @private
             */
            this._doubleClickActionDefault = "compass";

            /**
             * Get DoubleClickAction setting from cookie or use default value
             * @type {string}
             * @private
             */
            this._doubleClickAction = this._getDoubleClickActionSetting();

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
            this._showLayer = this._getShowLayerSetting();

            this._setupSvg();
            this._setupListener();
        }

        _setupListener() {
            function stopProp() {
                if (d3.event.defaultPrevented) {
                    d3.event.stopPropagation();
                }
            }

            this._svg
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
            // noinspection JSSuspiciousNameCombination
            this._zoom = d3
                .zoom()
                .scaleExtent([this.minScale, this._maxScale])
                .translateExtent([
                    [
                        this.coord.min - this.yGridBackgroundWidth * this.minScale,
                        this.coord.min - this.xGridBackgroundHeight * this.minScale
                    ],
                    [this.coord.max, this.coord.max]
                ])
                .wheelDelta(() => -this._wheelDelta * Math.sign(d3.event.deltaY))
                .on("zoom", () => this._naZoomed());

            this._svg = d3
                .select("#na")
                .append("svg")
                .attr("id", "na-svg")
                .attr("width", this._width)
                .attr("height", this._height)
                .style("position", "absolute")
                .style("top", `${this.margin.top}px`)
                .style("left", `${this.margin.left}px`)
                .call(this._zoom);

            this._svg.append("defs");

            this._g = this._svg.append("g").classed("map", true);
        }

        /**
         * Get show setting from cookie or use default value
         * @returns {string} - Show setting
         * @private
         */
        _getDoubleClickActionSetting() {
            let r = Cookies.get(this._doubleClickActionCookieName);
            // Use default value if cookie is not stored
            r = typeof r !== "undefined" ? r : this._doubleClickActionDefault;
            $(`#doubleClick-action-${r}`).prop("checked", true);
            return r;
        }

        /**
         * Store show setting in cookie
         * @return {void}
         * @private
         */
        _storeDoubleClickActionSetting() {
            if (this._doubleClickAction !== this._doubleClickActionDefault) {
                Cookies.set(this._doubleClickActionCookieName, this._doubleClickAction);
            } else {
                Cookies.remove(this._doubleClickActionCookieName);
            }
        }

        _doubleClickSelected() {
            this._doubleClickAction = $("input[name='doubleClickAction']:checked").val();
            this._storeDoubleClickActionSetting();
            this._clearMap();
        }

        /**
         * Get show setting from cookie or use default value
         * @returns {string} - Show setting
         * @private
         */
        _getShowLayerSetting() {
            let r = Cookies.get(this._showLayerCookieName);
            // Use default value if cookie is not stored
            r = typeof r !== "undefined" ? r : this._showLayerDefault;
            $(`#show-layer-${r}`).prop("checked", true);
            return r;
        }

        /**
         * Store show setting in cookie
         * @return {void}
         * @private
         */
        _storeShowLayerSetting() {
            if (this._showLayer !== this._showLayerDefault) {
                Cookies.set(this._showLayerCookieName, this._showLayer);
            } else {
                Cookies.remove(this._showLayerCookieName);
            }
        }

        _showLayerSelected() {
            this._showLayer = $("input[name='showLayer']:checked").val();
            this._storeShowLayerSetting();
            this._refreshLayer();
        }

        _refreshLayer() {
            const showGrid = this._showLayer === "grid",
                showTeleport = this._showLayer === "teleport";

            grid.setShow(showGrid);
            grid.update();

            teleport.setShow(showTeleport);
            teleport.setData();
            teleport.update();
        }

        _displayMap(transform) {
            // Based on d3-tile v0.0.3
            // https://github.com/d3/d3-tile/blob/0f8cc9f52564d4439845f651c5fab2fcc2fdef9e/src/tile.js
            const log2tileSize = Math.log2(this._tileSize),
                maxTileZoom = Math.log2(this.coord.max) - log2tileSize,
                x0 = 0,
                y0 = 0,
                x1 = this._width,
                y1 = this._height,
                width = Math.floor(
                    this.coord.max * transform.k < this._width
                        ? this._width - 2 * transform.x
                        : this.coord.max * transform.k
                ),
                height = Math.floor(
                    this.coord.max * transform.k < this._height
                        ? this._height - 2 * transform.y
                        : this.coord.max * transform.k
                ),
                scale = Math.log2(transform.k);

            const tileZoom = Math.min(maxTileZoom, Math.ceil(Math.log2(Math.max(width, height))) - log2tileSize),
                p = Math.round(tileZoom * 10 - scale * 10 - maxTileZoom * 10) / 10,
                k = this._wheelDelta ** p;

            const { x } = transform,
                { y } = transform,
                // crop right side
                dx = this.coord.max * transform.k < this._width ? transform.x : 0,
                // crop bottom
                dy = this.coord.max * transform.k < this._height ? transform.y : 0,
                cols = d3.range(
                    Math.max(0, Math.floor((x0 - x) / this._tileSize / k)),
                    Math.max(0, Math.min(Math.ceil((x1 - x - dx) / this._tileSize / k), 2 ** tileZoom))
                ),
                rows = d3.range(
                    Math.max(0, Math.floor((y0 - y) / this._tileSize / k)),
                    Math.max(0, Math.min(Math.ceil((y1 - y - dy) / this._tileSize / k), 2 ** tileZoom))
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

            const image = this._g
                .attr("transform", tileTransform)
                .selectAll("image")
                .data(tiles, d => d);

            image.exit().remove();

            image
                .enter()
                .append("image")
                .attr("xlink:href", d => `images/map/${d[2]}/${d[1]}/${d[0]}.jpg`)
                .attr("x", d => d[0] * this._tileSize)
                .attr("y", d => d[1] * this._tileSize)
                .attr("width", this._tileSize)
                .attr("height", this._tileSize);
        }

        _clearMap() {
            windPrediction.clearMap();
            course.clearMap();
            f11.clearMap();
            ports.clearMap();
            portSelect.clearMap();
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

            if (this._doubleClickAction === "f11") {
                f11.printCoord(x, y);
            } else {
                course.plotCourse(x, y);
            }

            this.zoomAndPan(x, y, 1);
        }

        _setZoomLevel(zoomLevel) {
            this._zoomLevel = zoomLevel;
            ports.setZoomLevel(zoomLevel);
            grid.setZoomLevel(zoomLevel);
            teleport.setZoomLevel(zoomLevel);
        }

        _updateCurrent() {
            pbZone.refresh();
            grid.update();
            teleport.setData();
            teleport.update();
            ports.update(this.currentScale);
        }

        _setZoomLevelAndData() {
            if (d3.event.transform.k !== this.currentScale) {
                this.currentScale = d3.event.transform.k;
                if (this.currentScale > this._PBZoneZoomThreshold) {
                    if (this._zoomLevel !== "pbZone") {
                        this._setZoomLevel("pbZone");
                    }
                } else if (this.currentScale > this._labelZoomThreshold) {
                    if (this._zoomLevel !== "portLabel") {
                        this._setZoomLevel("portLabel");
                    }
                } else if (this._zoomLevel !== "initial") {
                    this._setZoomLevel("initial");
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
            grid.transform(zoomTransform);
            ports.transform(zoomTransform);
            teleport.transform(zoomTransform);
            course.transform(zoomTransform);
            pbZone.transform(zoomTransform);
            f11.transform(zoomTransform);
        }

        _initialZoomAndPan() {
            this._svg.call(this._zoom.scaleTo, this.minScale);
        }

        init() {
            this._setZoomLevel("initial");
            this._initialZoomAndPan();
            this._refreshLayer();
        }

        zoomAndPan(x, y, scale) {
            const transform = d3.zoomIdentity
                .scale(scale)
                .translate(Math.round(-x + this._width / 2 / scale), Math.round(-y + this._height / 2 / scale));
            this._svg.call(this._zoom.transform, transform);
        }

        goToPort() {
            if (ports.currentPort.id !== "0") {
                this.zoomAndPan(ports.currentPort.coord.x, ports.currentPort.coord.y, 2);
            } else {
                this.initialZoomAndPan();
            }
        }
    }

    function setup() {
        // Set cookies defaults (expiry 365 days)
        Cookies.defaults = { expires: 365 };

        shipCompare = new ShipCompare(shipData);
        woodCompare = new WoodCompare(woodData);
        moduleList = new Module(moduleData);
        recipeList = new Recipe(recipeData);
        buildingList = new Building(buildingData);
        teleport = new Teleport(map.coord.min, map.coord.max, ports);
        portSelect = new PortSelect(map, ports, pbZone);
        windPrediction = new WindPrediction(map.margin.left, map.margin.top);
        f11 = new F11(map);
        grid = new Grid(map);
        course = new Course(map.rem);

        moment.locale("en-gb");
        map.init();
        ports.clearMap(map.minScale);
    }

    function init(data) {
        map = new NAMap();
        // Read map data
        const portData = topojsonFeature(data.ports, data.ports.objects.ports).features;
        ports = new PortDisplay(portData, data.pb, serverName, map.margin.top, map.margin.right, map.minScale);

        let pbZoneData = topojsonFeature(data.pbZones, data.pbZones.objects.pbZones);
        // Port ids of capturable ports
        const portIds = portData.filter(port => !port.properties.nonCapturable).map(port => port.id);
        pbZoneData = pbZoneData.features.filter(port => portIds.includes(port.id)).map(d => ({
            type: "Feature",
            id: d.id,
            geometry: d.geometry
        }));
        let fortData = topojsonFeature(data.pbZones, data.pbZones.objects.forts);
        fortData = fortData.features.map(d => ({
            type: "Feature",
            id: d.id,
            geometry: d.geometry
        }));
        let towerData = topojsonFeature(data.pbZones, data.pbZones.objects.towers);
        towerData = towerData.features.map(d => ({
            type: "Feature",
            id: d.id,
            geometry: d.geometry
        }));
        pbZone = new PBZone(pbZoneData, fortData, towerData, ports);

        shipData = JSON.parse(JSON.stringify(data.ships.shipData));
        woodData = JSON.parse(JSON.stringify(data.woods));
        moduleData = JSON.parse(JSON.stringify(data.modules));
        recipeData = JSON.parse(JSON.stringify(data.recipes.recipe));
        buildingData = JSON.parse(JSON.stringify(data.buildings));

        setup();
    }

    function readData(cacheMode) {
        const naMapJsonData = fetch(`${serverName}.json`, { cache: cacheMode })
            .then(checkFetchStatus)
            .then(getJsonFromFetch);
        const pbJsonData = fetch(`${serverName}-pb.json`, { cache: cacheMode })
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
            .then(values =>
                init({
                    ports: values[0],
                    pb: values[1],
                    pbZones: values[2],
                    ships: values[3],
                    woods: values[4],
                    modules: values[5],
                    recipes: values[6],
                    buildings: values[7]
                })
            )
            .catch(putFetchError);
    }

    let cacheMode = "default";
    const lastUpdateData = fetch("update.txt", { cache: cacheMode })
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
            // console.log(serverDayStart.format("dddd D MMMM YYYY H:mm"), lastUpdate.format("dddd D MMMM YYYY H:mm"));

            if (lastUpdate.isBefore(serverDayStart, "hour")) {
                cacheMode = "reload";
            }
        })
        .catch(putFetchError);

    readData(cacheMode);
}

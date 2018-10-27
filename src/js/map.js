/**
 * This file is part of na-map.
 *
 * @file      Display naval action map.
 * @module    map
 * @author    iB aka Felix Victor
 * @copyright 2017, 2018
 * @license   http://www.gnu.org/licenses/gpl.html
 */

import { range as d3Range } from "d3-array";
import { event as d3Event, mouse as d3Mouse, select as d3Select } from "d3-selection";
import { zoom as d3Zoom, zoomIdentity as d3ZoomIdentity, zoomTransform as d3ZoomTransform } from "d3-zoom";
import { feature as topojsonFeature } from "topojson-client";
import Cookies from "js-cookie";

import ResizeObserver from "resize-observer-polyfill";
import { getContentRect } from "resize-observer-polyfill/src/utils/geometry";

import { appDescription, appTitle, appVersion, defaultFontSize, insertBaseModal } from "./common";
import { nearestPow2, checkFetchStatus, getJsonFromFetch, putFetchError, roundToThousands } from "./util";

import Building from "./building-list";
import CannonList from "./cannon-list";
import F11 from "./f11";
import Grid from "./grid";
import Ingredient from "./ingredient-list";
import Journey from "./make-journey";
import Module from "./module-list";
import PBZone from "./pbzone";
import OwnershipList from "./ownership-list";
import PortDisplay from "./port";
import PortSelect from "./port-select";
import Recipe from "./recipe-list";
import ShipCompare from "./ship-compare";
import Teleport from "./teleport";
import WindPrediction from "./wind-prediction";
import WoodCompare from "./wood-compare";
import WoodList from "./wood-list";
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
         * @type {Array<fileName: string, name: string>}
         * @private
         */
        this._dataSource = [
            {
                fileName: `${serverName}.json`,
                name: "ports"
            },
            {
                fileName: `${serverName}-pb.json`,
                name: "pb"
            },
            {
                fileName: "pb.json",
                name: "pbZones"
            },
            {
                fileName: "ships.json",
                name: "ships"
            },
            {
                fileName: "cannons.json",
                name: "cannons"
            },
            {
                fileName: "woods.json",
                name: "woods"
            },
            {
                fileName: "modules.json",
                name: "modules"
            },
            {
                fileName: "recipes.json",
                name: "recipes"
            },
            {
                fileName: "buildings.json",
                name: "buildings"
            },
            {
                fileName: "ownership.json",
                name: "ownership"
            },
            {
                fileName: "nations.json",
                name: "nations"
            }
        ];

        /**
         * Font size in px
         * @type {Number}
         * @private
         */
        this.rem = defaultFontSize;

        /**
         * Left padding for brand icon
         * @type {Number}
         * @private
         */
        this._navbarBrandPaddingLeft = Math.floor(1.618 * this.rem); // equals 1.618rem

        /**
         * Left padding for brand icon
         * @type {Number}
         * @private
         */
        this.xGridBackgroundHeight = Math.floor(3 * this.rem);

        /**
         * Left padding for brand icon
         * @type {Number}
         * @private
         */
        this.yGridBackgroundWidth = Math.floor(4 * this.rem);

        /**
         * Outer bounds (world coordinates)
         * @type {Object}
         * @property {Number} min - Minimum world coordinate
         * @property {Number} max - Maximum world coordinate
         * @private
         */
        this.coord = {
            min: 0,
            max: 8192
        };

        this._navbarSelector = document.querySelector(".navbar");

        this._tileSize = 256;
        this._maxScale = 2 ** 3; // power of 2
        this._wheelDelta = 0.5;
        this._PBZoneZoomThreshold = 1.5;
        this._labelZoomThreshold = 0.5;

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
        this._setSvgSize();
        this._setupListener();
        this._setupProps();
        this._readData();
    }

    /**
     * Read cookie for doubleClickAction
     * @return {string} doubleClickAction
     * @private
     */
    _getDoubleClickAction() {
        let r = Cookies.get(this._doubleClickActionCookieName);
        // Use default value if cookie is not stored
        r = typeof r !== "undefined" ? r : this._doubleClickActionDefault;
        return r;
    }

    /**
     * Read cookie for showLayer
     * @return {string} showLayer
     * @private
     */
    _getShowLayer() {
        let r = Cookies.get(this._showLayerCookieName);
        // Use default value if cookie is not stored
        r = typeof r !== "undefined" ? r : this._showLayerDefault;
        return r;
    }

    _setupData(data) {
        const portData = topojsonFeature(data.ports, data.ports.objects.ports);
        // Port ids of capturable ports
        const portIds = portData.features.filter(port => !port.properties.nonCapturable).map(port => port.id);

        function getFeature(object) {
            return object.filter(port => portIds.includes(port.id)).map(d => ({
                type: "Feature",
                id: d.id,
                geometry: d.geometry
            }));
        }

        this._ports = new PortDisplay(
            portData.features,
            data.pb,
            this._serverName,
            this.margin.top,
            this.margin.right,
            this._minScale
        );

        let pbCircles = topojsonFeature(data.pbZones, data.pbZones.objects.pbCircles);
        pbCircles = getFeature(pbCircles.features);

        let forts = topojsonFeature(data.pbZones, data.pbZones.objects.forts);
        forts = getFeature(forts.features);

        let towers = topojsonFeature(data.pbZones, data.pbZones.objects.towers);
        towers = getFeature(towers.features);

        let joinCircles = topojsonFeature(data.pbZones, data.pbZones.objects.joinCircles);
        joinCircles = getFeature(joinCircles.features);

        this._pbZone = new PBZone(pbCircles, forts, towers, joinCircles, this._ports);

        const woodData = JSON.parse(JSON.stringify(data.woods));
        this._woodCompare = new WoodCompare(woodData, "wood");
        this._woodList = new WoodList(woodData);

        const shipData = JSON.parse(JSON.stringify(data.ships.shipData));
        this._shipCompare = new ShipCompare(shipData, woodData);

        const cannonData = JSON.parse(JSON.stringify(data.cannons));
        this._cannonList = new CannonList(cannonData);

        const ownershipData = JSON.parse(JSON.stringify(data.ownership)),
            nationData = JSON.parse(JSON.stringify(data.nations));
        this._ownershipList = new OwnershipList(ownershipData, nationData);

        const moduleData = JSON.parse(JSON.stringify(data.modules));
        this._moduleList = new Module(moduleData);

        const recipeData = JSON.parse(JSON.stringify(data.recipes.recipe));
        this._recipeList = new Recipe(recipeData, moduleData);

        const ingredientData = JSON.parse(JSON.stringify(data.recipes.ingredient));
        this._ingredientList = new Ingredient(ingredientData, moduleData);

        const buildingData = JSON.parse(JSON.stringify(data.buildings));
        this._buildingList = new Building(buildingData);

        this._journey = new Journey(shipData, woodData, this.rem, this.margin.top, this.margin.right);
        this._teleport = new Teleport(this.coord, this._ports);
        this._portSelect = new PortSelect(this._ports, this._pbZone);
        this._windPrediction = new WindPrediction(this.margin.left, this.margin.top);
        this._f11 = new F11(this, this.coord);
        this._grid = new Grid(this);

        this._init();
    }

    _readData() {
        const jsonData = [],
            readData = {};
        this._dataSource.forEach((datum, i) => {
            jsonData[i] = fetch(datum.fileName)
                .then(checkFetchStatus)
                .then(getJsonFromFetch);
        });

        Promise.all(jsonData)
            .then(values => {
                values.forEach((value, i) => {
                    readData[this._dataSource[i].name] = values[i];
                });

                this._setupData(readData);
            })
            .catch(putFetchError);
    }

    _setupListener() {
        function stopProp() {
            if (d3Event.defaultPrevented) {
                d3Event.stopPropagation();
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
        this.svg = d3Select("#na")
            .append("svg")
            .attr("id", "na-svg")
            .style("position", "absolute");

        this.svg.append("defs");

        this._g = this.svg.append("g").classed("map", true);
    }

    _setupProps() {
        $(`#doubleClick-action-${this._doubleClickAction}`).prop("checked", true);
        $(`#show-layer-${this._showLayer}`).prop("checked", true);
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

        this._grid.show = showGrid;
        this._grid.update();

        this._teleport.show = showTeleport;
        this._teleport.setData();
        this._teleport.update();
    }

    _displayMap(transform) {
        // Based on d3-tile v0.0.3
        // https://github.com/d3/d3-tile/blob/0f8cc9f52564d4439845f651c5fab2fcc2fdef9e/src/tile.js
        const log2tileSize = Math.log2(this._tileSize),
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
            k = this._wheelDelta ** p;

        const { x } = transform,
            { y } = transform,
            // crop right side
            dx = this.coord.max * transform.k < this.width ? transform.x : 0,
            // crop bottom
            dy = this.coord.max * transform.k < this.height ? transform.y : 0,
            cols = d3Range(
                Math.max(0, Math.floor((x0 - x) / this._tileSize / k)),
                Math.max(0, Math.min(Math.ceil((x1 - x - dx) / this._tileSize / k), 2 ** tileZoom))
            ),
            rows = d3Range(
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
        const tileTransform = d3ZoomIdentity
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
        this._windPrediction.clearMap();
        this._journey.clearMap();
        this._f11.clearMap();
        this._ports.clearMap();
        this._portSelect.clearMap();
        $(".selectpicker")
            .val("default")
            .selectpicker("refresh");
    }

    _showAbout() {
        function initModal(id) {
            insertBaseModal(id, `${appTitle} <span class="text-primary small">v${appVersion}</span>`, "");

            const body = d3Select(`#${id} .modal-body`);
            body.html(
                `<p>${appDescription} Please check the <a href="https://forum.game-labs.net/topic/23980-yet-another-map-naval-action-map/"> Game-Labs forum post</a> for further details. Feedback is very welcome.</p><p>Designed by iB aka Felix Victor, clan <a href="https://bccnavalaction.freeforums.net/">British Captains’ Club (BCC)</a>.</p>`
            );
        }

        const id = "modal-about";
        // If the modal has no content yet, insert it
        if (!document.getElementById(id)) {
            initModal(id);
        }
        // Show modal
        $(`#${id}`).modal("show");
    }

    _doDoubleClickAction(self) {
        const coord = d3Mouse(self),
            transform = d3ZoomTransform(self);
        const mx = coord[0],
            my = coord[1],
            tk = transform.k,
            tx = transform.x,
            ty = transform.y;

        const x = (mx - tx) / tk,
            y = (my - ty) / tk;

        if (this._doubleClickAction === "f11") {
            this._f11.printCoord(x, y);
        } else {
            this._journey.plotCourse(x, y);
        }

        this._zoomAndPan(x, y, 1);
    }

    _updateCurrent() {
        this._pbZone.refresh();
        this._grid.update();
        this._teleport.setData();
        this._teleport.update();
        this._ports.update(this._currentScale);
    }

    _setZoomLevelAndData() {
        if (d3Event.transform.k !== this._currentScale) {
            this._currentScale = d3Event.transform.k;
            if (this._currentScale > this._PBZoneZoomThreshold) {
                if (this._zoomLevel !== "pbZone") {
                    this.zoomLevel = "pbZone";
                }
            } else if (this._currentScale > this._labelZoomThreshold) {
                if (this._zoomLevel !== "portLabel") {
                    this.zoomLevel = "portLabel";
                }
            } else if (this._zoomLevel !== "initial") {
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
        const zoomTransform = d3ZoomIdentity
            .translate(Math.round(d3Event.transform.x), Math.round(d3Event.transform.y))
            .scale(roundToThousands(d3Event.transform.k));

        this._displayMap(zoomTransform);
        this._grid.transform(zoomTransform);
        this._ports.transform(zoomTransform);
        this._teleport.transform(zoomTransform);
        this._journey.transform(zoomTransform);
        this._pbZone.transform(zoomTransform);
        this._f11.transform(zoomTransform);
    }

    _initialZoomAndPan() {
        this.svg.call(this._zoom.scaleTo, this._minScale);
    }

    _getNavbarHeight() {
        return Math.round(getContentRect(this._navbarSelector).height);
    }

    _init() {
        console.log("_init");

        this.zoomLevel = "initial";
        this._initialZoomAndPan();
        this._refreshLayer();

        this._ports.clearMap(this._minScale);
        this._f11.checkF11Coord();

        const observer = new ResizeObserver(entries => {
            entries.forEach(entry => {
                const { left, top, width, height } = entry.contentRect;
                console.log("Element", entry.target);
                console.log("Element's size", width, "px x", height, "px");
                console.log("Element's paddings", top, "px ;", left, "px");
            });
            console.log("observer");
            console.log(this._navbarHeight, this._getNavbarHeight());

            if (this._navbarHeight !== this._getNavbarHeight()) {
                this.resize();
            }
        });

        // Setup listener (size change of navbar)
        [this._navbarSelector].forEach(element => observer.observe(element));
    }

    set zoomLevel(zoomLevel) {
        this._zoomLevel = zoomLevel;
        this._ports.zoomLevel = zoomLevel;
        this._grid.zoomLevel = zoomLevel;
        this._teleport.zoomLevel = zoomLevel;
    }

    resize() {
        console.log("resize");
        this._setSvgSize();
        this._ports.setSummarySize(this.margin.top, this.margin.right);
    }

    _setSvgSize() {
        console.log("setSvgSize");

        this._navbarHeight = this._getNavbarHeight();

        /**
         * Margins of the map svg
         * @type {Object}
         * @property {Number} top - Top margin
         * @property {Number} right - Right margin
         * @property {Number} bottom - Bottom margin
         * @property {Number} left - Left margin
         * @private
         */
        this.margin = {
            top: Math.floor(this._navbarHeight + this._navbarBrandPaddingLeft),
            right: this._navbarBrandPaddingLeft,
            bottom: this._navbarBrandPaddingLeft,
            left: this._navbarBrandPaddingLeft
        };

        /**
         * Width of map svg (screen coordinates)
         * @type {Number}
         * @private
         */
        // eslint-disable-next-line no-restricted-globals
        this.width = Math.floor(top.innerWidth - this.margin.left - this.margin.right);

        /**
         * Height of map svg (screen coordinates)
         * @type {Number}
         * @private
         */
        // eslint-disable-next-line no-restricted-globals
        this.height = Math.floor(top.innerHeight - this.margin.top - this.margin.bottom);

        this._minScale = nearestPow2(Math.min(this.width / this.coord.max, this.height / this.coord.max));

        /**
         * Current map scale
         * @type {Number}
         * @private
         */
        this._currentScale = this._minScale;
        this._zoomLevel = "initial";
        this._zoom = d3Zoom()
            .wheelDelta(() => -this._wheelDelta * Math.sign(d3Event.deltaY))
            .translateExtent([
                [
                    this.coord.min - this.yGridBackgroundWidth * this._minScale,
                    this.coord.min - this.xGridBackgroundHeight * this._minScale
                ],
                [this.coord.max, this.coord.max]
            ])
            .scaleExtent([this._minScale, this._maxScale])
            .on("zoom", () => this._naZoomed());

        this.svg
            .attr("width", this.width)
            .attr("height", this.height)
            .style("top", `${this.margin.top}px`)
            .style("left", `${this.margin.left}px`)
            .call(this._zoom);
    }

    zoomAndPan(x, y, scale) {
        const transform = d3ZoomIdentity
            .scale(scale)
            .translate(Math.round(-x + this.width / 2 / scale), Math.round(-y + this.height / 2 / scale));
        this.svg.call(this._zoom.transform, transform);
    }

    goToPort() {
        if (this._ports.currentPort.id !== "0") {
            this._zoomAndPan(this._ports.currentPort.coord.x, this._ports.currentPort.coord.y, 2);
        } else {
            this._initialZoomAndPan();
        }
    }
}

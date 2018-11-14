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

        this._currentTranslate = {};

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

        this._setHeightWidth();
        this._setupScale();
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

        this._f11 = new F11(this, this.coord);
        this._ports = new PortDisplay(portData.features, data.pb, this);

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

        this._journey = new Journey(shipData, woodData, this.rem);
        this._portSelect = new PortSelect(this._ports, this._pbZone);
        this._windPrediction = new WindPrediction();
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

    _setupScale() {
        this._minScale = nearestPow2(Math.min(this.width / this.coord.max, this.height / this.coord.max));

        /**
         * Current map scale
         * @type {Number}
         * @private
         */
        this._currentScale = this._minScale;
    }

    _setupSvg() {
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

        this.svg = d3Select("#na-map")
            .append("svg")
            .attr("id", "na-svg")
            .call(this._zoom);

        this.svg.append("defs");

        this._gMap = this.svg.append("g").classed("map", true);
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
        const showGrid = this._showLayer === "grid";

        this._grid.show = showGrid;
        this._grid.update();
    }

    _displayMap(transform) {
        // Based on d3-tile v0.0.3
        // https://github.com/d3/d3-tile/blob/0f8cc9f52564d4439845f651c5fab2fcc2fdef9e/src/tile.js
        const { x: tx, y: ty, k: tk } = transform,
            log2tileSize = Math.log2(this._tileSize),
            maxTileZoom = Math.log2(this.coord.max) - log2tileSize,
            maxCoordScaled = this.coord.max * tk,
            x0 = 0,
            y0 = 0,
            x1 = this.width,
            y1 = this.height,
            width = Math.floor(maxCoordScaled < this.width ? this.width - 2 * tx : maxCoordScaled),
            height = Math.floor(maxCoordScaled < this.height ? this.height - 2 * ty : maxCoordScaled),
            scale = Math.log2(tk);

        const tileZoom = Math.min(maxTileZoom, Math.ceil(Math.log2(Math.max(width, height))) - log2tileSize),
            p = Math.round((tileZoom - scale - maxTileZoom) * 10) / 10,
            k = this._wheelDelta ** p,
            tileSizeScaled = this._tileSize * k;

        const // crop right side
            dx = maxCoordScaled < this.width ? tx : 0,
            // crop bottom
            dy = maxCoordScaled < this.height ? ty : 0,
            cols = d3Range(
                Math.max(0, Math.floor((x0 - tx) / tileSizeScaled)),
                Math.max(0, Math.min(Math.ceil((x1 - tx - dx) / tileSizeScaled), 2 ** tileZoom))
            ),
            rows = d3Range(
                Math.max(0, Math.floor((y0 - ty) / tileSizeScaled)),
                Math.max(0, Math.min(Math.ceil((y1 - ty - dy) / tileSizeScaled), 2 ** tileZoom))
            ),
            tiles = [];

        rows.forEach(row => {
            cols.forEach(col => {
                tiles.push({
                    z: tileZoom,
                    row,
                    col,
                    id: `${tileZoom.toString()}-${row.toString()}-${col.toString()}`
                });
            });
        });
        tiles.transform = d3ZoomIdentity.translate(tx, ty).scale(roundToThousands(k));

        this._updateMap(tiles);
    }

    _updateMap(tiles) {
        const image = this._gMap
            .attr("transform", tiles.transform)
            .selectAll("image")
            .data(tiles, d => d.id);

        image.exit().remove();

        image
            .enter()
            .append("image")
            .attr("xlink:href", d => `images/map/${d.z}/${d.row}/${d.col}.jpg`)
            .attr("x", d => d.col * this._tileSize)
            .attr("y", d => d.row * this._tileSize)
            .attr("width", this._tileSize)
            .attr("height", this._tileSize);
    }

    _clearMap() {
        this._windPrediction.clearMap();
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

        this.zoomAndPan(x, y, 1);
    }

    _updateCurrent() {
        this._pbZone.refresh();
        this._grid.update();
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

        this._currentTranslate.x = Math.floor(d3Event.transform.x);
        this._currentTranslate.y = Math.floor(d3Event.transform.y);

        /**
         * Current transform
         * @type {Transform}
         */
        const zoomTransform = d3ZoomIdentity
            .translate(this._currentTranslate.x, this._currentTranslate.y)
            .scale(roundToThousands(d3Event.transform.k));

        this._displayMap(zoomTransform);
        this._grid.transform(zoomTransform);
        this._ports.transform(zoomTransform);
        this._journey.transform(zoomTransform);
        this._pbZone.transform(zoomTransform);
        this._f11.transform(zoomTransform);
    }

    _init() {
        this.zoomLevel = "initial";
        this.initialZoomAndPan();
        this._refreshLayer();

        this._ports.clearMap(this._minScale);
        this._f11.checkF11Coord();
    }

    set zoomLevel(zoomLevel) {
        this._zoomLevel = zoomLevel;
        this._ports.zoomLevel = zoomLevel;
        this._grid.zoomLevel = zoomLevel;
    }

    resize() {
        const zoomTransform = d3ZoomIdentity
            .translate(this._currentTranslate.x, this._currentTranslate.y)
            .scale(this._currentScale);

        this._setHeightWidth();
        this._setSvgSize();
        this._displayMap(zoomTransform);
        this._grid.update();
    }

    _getDimensions() {
        const selector = document.getElementById("na-map");

        return selector.getBoundingClientRect();
    }

    _getWidth() {
        const { width } = this._getDimensions();

        return Math.floor(width);
    }

    _getHeight() {
        const { top } = this._getDimensions(),
            fullHeight = document.documentElement.clientHeight - this.rem;

        return Math.floor(fullHeight - top);
    }

    _setHeightWidth() {
        /**
         * Width of map svg (screen coordinates)
         * @type {Number}
         */
        this.width = this._getWidth();

        /**
         * Height of map svg (screen coordinates)
         * @type {Number}
         */
        this.height = this._getHeight();
    }

    _setSvgSize() {
        this.svg
            .attr("width", this.width)
            .attr("height", this.height)
            .call(this._zoom);
    }

    initialZoomAndPan() {
        this.svg.call(this._zoom.scaleTo, this._minScale);
    }

    zoomAndPan(x, y, scale) {
        const transform = d3ZoomIdentity
            .scale(scale)
            .translate(Math.round(-x + this.width / 2 / scale), Math.round(-y + this.height / 2 / scale));

        this.svg.call(this._zoom.transform, transform);
    }

    goToPort() {
        if (this._ports.currentPort.id !== "0") {
            this.zoomAndPan(this._ports.currentPort.coord.x, this._ports.currentPort.coord.y, 2);
        } else {
            this.initialZoomAndPan();
        }
    }
}

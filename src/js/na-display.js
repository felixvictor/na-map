/*
 Draws teleport map for Naval Action

 iB 2017, 2018
 */

/* global d3 : false
 */

import { feature as topojsonFeature } from "topojson-client";
import moment from "moment";
import "moment/locale/en-gb";

import "bootstrap/js/dist/tooltip";
import "bootstrap/js/dist/util";

import { nearestPow2, checkFetchStatus, getJsonFromFetch, putFetchError } from "./util";

import Course from "./course";
import F11 from "./f11";
import PBZone from "./pbzone";
import PortDisplay from "./port";
import PortSelect from "./port-select";
import ShipCompare from "./ship-compare";
import Teleport from "./teleport";
import WindPrediction from "./wind-prediction";

export default function naDisplay(serverName) {
    let map, ports, teleport, portSelect, shipCompare, windPrediction, f11, course, pbZone, shipData;

    class NAMap {
        constructor() {
            this._navbarBrandPaddingLeft = Math.floor(1.618 * 16); // equals 1.618rem
            // noinspection JSSuspiciousNameCombination

            this.margin = {
                top: Math.floor(parseFloat($(".navbar").css("height")) + this._navbarBrandPaddingLeft),
                right: this._navbarBrandPaddingLeft,
                bottom: this._navbarBrandPaddingLeft,
                left: this._navbarBrandPaddingLeft
            };
            this.coord = {
                min: 0,
                max: 8192
            };
            this._tileSize = 256;
            this._maxScale = 2 ** 3; // power of 2
            this._wheelDelta = 0.5;
            this._zoomLevel = "initial";
            this._PBZoneZoomThreshold = 1.5;
            this._labelZoomThreshold = 0.5;

            // eslint-disable-next-line no-restricted-globals
            this._width = Math.floor(top.innerWidth - this.margin.left - this.margin.right);
            // eslint-disable-next-line no-restricted-globals
            this._height = Math.floor(top.innerHeight - this.margin.top - this.margin.bottom);
            this._minScale = nearestPow2(Math.min(this._width / this.coord.max, this._height / this.coord.max));
            this._radioButton = "compass";

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
                .on("dblclick", (d, i, nodes) => this._doubleClickAction(nodes[i]));

            $("#reset").on("click", () => {
                this.constructor._clearMap();
            });

            $("#double-click-action").change(() => {
                this._radioButton = $("input[name='mouseFunction']:checked").val();
                this.constructor._clearMap();
            });
        }

        _setupSvg() {
            // noinspection JSSuspiciousNameCombination
            this._zoom = d3
                .zoom()
                .scaleExtent([this._minScale, this._maxScale])
                .translateExtent([[this.coord.min, this.coord.min], [this.coord.max, this.coord.max]])
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

        static _clearMap() {
            windPrediction.clearMap();
            course.clearMap();
            f11.clearMap();
            ports.clearMap();
            portSelect.clearMap();
            $(".selectpicker")
                .val("default")
                .selectpicker("refresh");
        }

        _doubleClickAction(self) {
            const coord = d3.mouse(self),
                transform = d3.zoomTransform(self);
            const mx = coord[0],
                my = coord[1],
                tk = transform.k,
                tx = transform.x,
                ty = transform.y;

            const x = (mx - tx) / tk,
                y = (my - ty) / tk;

            if (this._radioButton === "F11") {
                f11.printCoord(x, y);
            } else {
                course.plotCourse(x, y);
            }

            this.zoomAndPan(x, y, 1);
        }

        _setZoomLevel(zoomLevel) {
            this._zoomLevel = zoomLevel;
            ports.setZoomLevel(zoomLevel);
            teleport.setZoomLevel(zoomLevel);
        }

        _updateCurrent() {
            pbZone.refresh();
            teleport.setTeleportData();
            teleport.updateTeleportAreas();
            ports.update();
        }

        _updateAll() {
            if (d3.event.transform.k > this._PBZoneZoomThreshold) {
                if (this._zoomLevel !== "pbZone") {
                    this._setZoomLevel("pbZone");
                    this._updateCurrent();
                }
            } else if (d3.event.transform.k > this._labelZoomThreshold) {
                if (this._zoomLevel !== "portLabel") {
                    this._setZoomLevel("portLabel");
                    this._updateCurrent();
                }
            } else if (this._zoomLevel !== "initial") {
                this._setZoomLevel("initial");
                this._updateCurrent();
            }
        }

        _naZoomed() {
            this._updateAll();

            // noinspection JSSuspiciousNameCombination
            const zoomTransform = d3.zoomIdentity
                .translate(Math.round(d3.event.transform.x), Math.round(d3.event.transform.y))
                .scale(Math.round(d3.event.transform.k * 1000) / 1000);

            this._displayMap(zoomTransform);
            ports.transform(zoomTransform);
            teleport.transform(zoomTransform);
            course.transform(zoomTransform);
            pbZone.transform(zoomTransform);
            f11.transform(zoomTransform);
        }

        initialZoomAndPan() {
            this._svg.call(this._zoom.scaleTo, this._minScale);
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
        shipCompare = new ShipCompare(shipData);
        teleport = new Teleport(map.coord.min, map.coord.max, ports);
        portSelect = new PortSelect(map, ports, pbZone);
        windPrediction = new WindPrediction(map.margin.left, map.margin.top);
        f11 = new F11(map);
        course = new Course(ports.fontSizes.portLabel);

        moment.locale("en-gb");
        map.initialZoomAndPan();
        ports.clearMap();
    }

    function init(data) {
        map = new NAMap();
        // Read map data
        const portData = topojsonFeature(data.ports, data.ports.objects.ports).features;
        ports = new PortDisplay(portData, data.pb, serverName, map.margin.top, map.margin.right);

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

        setup();
    }

    const naMapJsonData = fetch(`${serverName}.json`)
        .then(checkFetchStatus)
        .then(getJsonFromFetch);
    const pbJsonData = fetch(`${serverName}-pb.json`)
        .then(checkFetchStatus)
        .then(getJsonFromFetch);
    const pbZonesJsonData = fetch("pb.json")
        .then(checkFetchStatus)
        .then(getJsonFromFetch);
    const shipJsonData = fetch("ships.json")
        .then(checkFetchStatus)
        .then(getJsonFromFetch);
    Promise.all([naMapJsonData, pbJsonData, pbZonesJsonData, shipJsonData])
        .then(values => init({ ports: values[0], pb: values[1], pbZones: values[2], ships: values[3] }))
        .catch(putFetchError);
}

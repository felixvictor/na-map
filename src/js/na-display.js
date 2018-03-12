/*
 Draws teleport map for Naval Action

 iB 2017
 */

/* global d3 : false
 */

import { feature as topojsonFeature } from "topojson-client";
import moment from "moment";
import "moment-timezone";
import "moment/locale/en-gb";

import "tempusdominus-bootstrap-4/build/js/tempusdominus-bootstrap-4";
import "bootstrap-select/js/bootstrap-select";

import "bootstrap/js/dist/tooltip";
import "bootstrap/js/dist/util";

import { nations } from "./common";
import PortDisplay from "./port";
import ShipCompare from "./ship-compare";
import Teleport from "./teleport";
import WindPrediction from "./wind-prediction";

export default function naDisplay(serverName) {
    // https://bocoup.com/blog/find-the-closest-power-of-2-with-javascript
    function nearestPow2(aSize) {
        return 2 ** Math.round(Math.log2(aSize));
    }

    let naSvg,
        svgDef,
        naZoom,
        mainGMap,
        mainGPBZone,
        pbZones,
        towers,
        forts,
        mainGCoord,
        gCompass,
        ports,
        teleport,
        windPrediction;
    const navbarBrandPaddingLeft = Math.floor(1.618 * 16); // equals 1.618rem
    // noinspection JSSuspiciousNameCombination
    const defaults = {
        margin: {
            top: Math.floor(parseFloat($(".navbar").css("height")) + navbarBrandPaddingLeft),
            right: navbarBrandPaddingLeft,
            bottom: navbarBrandPaddingLeft,
            left: navbarBrandPaddingLeft
        },
        coord: {
            min: 0,
            max: 8192
        },
        tileSize: 256,
        maxScale: 2 ** 4, // power of 2
        wheelDelta: 0.5,
        PBZoneZoomThreshold: 1.5,
        labelZoomThreshold: 0.5,
        mapJson: `${serverName}.json`,
        pbJson: "pb.json",
        shipJson: "ships.json",
        line: d3.line(),
        transformMatrix: {
            A: -0.00499866779363828,
            B: -0.00000021464254980645,
            C: 4096.88635151897,
            D: 4096.90282787469
        },
        transformMatrixInv: {
            A: -200.053302087577,
            B: -0.00859027897636011,
            C: 819630.836437126,
            D: -819563.745651571
        }
    };

    // eslint-disable-next-line no-restricted-globals
    defaults.width = Math.floor(top.innerWidth - defaults.margin.left - defaults.margin.right);
    // eslint-disable-next-line no-restricted-globals
    defaults.height = Math.floor(top.innerHeight - defaults.margin.top - defaults.margin.bottom);
    defaults.minScale = nearestPow2(
        Math.min(defaults.width / defaults.coord.max, defaults.height / defaults.coord.max)
    );
    defaults.log2tileSize = Math.log2(defaults.tileSize);
    defaults.maxTileZoom = Math.log2(defaults.coord.max) - defaults.log2tileSize;
    const current = {
        bFirstCoord: true,
        radioButton: "compass",
        lineData: [],
        nation: ""
    };

    function displayCountries(transform) {
        // Based on d3-tile v0.0.3
        // https://github.com/d3/d3-tile/blob/0f8cc9f52564d4439845f651c5fab2fcc2fdef9e/src/tile.js
        const x0 = 0,
            y0 = 0,
            x1 = defaults.width,
            y1 = defaults.height,
            width = Math.floor(
                defaults.coord.max * transform.k < defaults.width
                    ? defaults.width - 2 * transform.x
                    : defaults.coord.max * transform.k
            ),
            height = Math.floor(
                defaults.coord.max * transform.k < defaults.height
                    ? defaults.height - 2 * transform.y
                    : defaults.coord.max * transform.k
            ),
            scale = Math.log2(transform.k);

        const zoom = Math.min(
            defaults.maxTileZoom,
            Math.ceil(Math.log2(Math.max(width, height))) - defaults.log2tileSize
        );
        const p = Math.round(zoom * 10 - scale * 10 - defaults.maxTileZoom * 10) / 10,
            k = defaults.wheelDelta ** p;

        const { x } = transform,
            { y } = transform,
            // crop right side
            dx = defaults.coord.max * transform.k < defaults.width ? transform.x : 0,
            // crop bottom
            dy = defaults.coord.max * transform.k < defaults.height ? transform.y : 0,
            cols = d3.range(
                Math.max(0, Math.floor((x0 - x) / defaults.tileSize / k)),
                Math.max(0, Math.min(Math.ceil((x1 - x - dx) / defaults.tileSize / k), 2 ** zoom))
            ),
            rows = d3.range(
                Math.max(0, Math.floor((y0 - y) / defaults.tileSize / k)),
                Math.max(0, Math.min(Math.ceil((y1 - y - dy) / defaults.tileSize / k), 2 ** zoom))
            ),
            tiles = [];

        /*
        console.group("zoom");
        console.log("x, dx, y, dy, width, height ", x, dx, y, dy, width, height);
        console.log("k, zoom, scale ", k, zoom, scale);
        // console.log("defaults.log2tileSize ", defaults.log2tileSize);
        // console.log("defaults.maxTileZoom ", defaults.maxTileZoom);
        console.log("cols, rows ", cols, rows);
        console.groupEnd();
        */

        rows.forEach(row => {
            cols.forEach(col => {
                tiles.push([col, row, zoom]);
            });
        });

        tiles.translate = [x, y];
        tiles.scale = k;

        /*
        console.log("transform ", transform);
        console.log("tiles ", tiles);
        */

        // noinspection JSSuspiciousNameCombination
        const tileTransform = d3.zoomIdentity
            .translate(Math.round(tiles.translate[0]), Math.round(tiles.translate[1]))
            .scale(Math.round(tiles.scale * 1000) / 1000);

        const image = mainGMap
            .attr("transform", tileTransform)
            .selectAll("image")
            .data(tiles, d => d);

        image.exit().remove();

        image
            .enter()
            .append("image")
            .attr("xlink:href", d => `images/map/${d[2]}/${d[1]}/${d[0]}.jpg`)
            .attr("x", d => d[0] * defaults.tileSize)
            .attr("y", d => d[1] * defaults.tileSize)
            .attr("width", defaults.tileSize)
            .attr("height", defaults.tileSize);
    }

    function initialZoomAndPan() {
        naSvg.call(naZoom.scaleTo, defaults.minScale);
    }

    function zoomAndPan(x, y, scale) {
        const transform = d3.zoomIdentity
            .scale(scale)
            .translate(Math.round(-x + defaults.width / 2 / scale), Math.round(-y + defaults.height / 2 / scale));
        naSvg.call(naZoom.transform, transform);
    }

    function clearMap() {
        mainGCoord.selectAll("*").remove();
        windPrediction.clearMap();
        current.bFirstCoord = true;
        current.lineData.splice(0, current.lineData.length);
        ports.resetData();
        ports.updatePorts(teleport.highlightId);
    }

    function plotCourse(x, y) {
        function printCompass() {
            const compassSize = 100;

            mainGCoord
                .append("image")
                .classed("compass", true)
                .attr("x", x)
                .attr("y", y)
                .attr("transform", `translate(${-compassSize / 2},${-compassSize / 2})`)
                .attr("height", compassSize)
                .attr("width", compassSize)
                .attr("xlink:href", "icons/compass.svg");
            gCompass = mainGCoord.append("path");
        }

        function printLine() {
            // https://stackoverflow.com/questions/9970281/java-calculating-the-angle-between-two-points-in-degrees
            function rotationAngleInDegrees(centerPt, targetPt) {
                // Converts from radians to degrees
                // http://cwestblog.com/2012/11/12/javascript-degree-and-radian-conversion/
                Math.radiansToDegrees = radians => radians * 180 / Math.PI;

                let theta = Math.atan2(targetPt[1] - centerPt[1], targetPt[0] - centerPt[0]);
                theta -= Math.PI / 2.0;
                let angle = Math.radiansToDegrees(theta);
                if (angle < 0) {
                    angle += 360;
                }
                return angle;
            }

            const degrees = rotationAngleInDegrees(
                current.lineData[current.lineData.length - 1],
                current.lineData[current.lineData.length - 2]
            );
            const compass = degreesToCompass(degrees);
            gCompass
                .datum(current.lineData)
                .attr("marker-end", "url(#course-arrow)")
                .attr("d", defaults.line);

            const svg = mainGCoord
                .append("svg")
                .attr("x", x)
                .attr("y", y);
            const rect = svg.append("rect");
            const text = svg
                .append("text")
                .attr("x", "50%")
                .attr("y", "50%")
                .text(`${compass} (${Math.round(degrees)}°)`);

            const bbox = text.node().getBBox();
            const height = bbox.height + defaults.fontSize.portLabel,
                width = bbox.width + defaults.fontSize.portLabel;
            rect
                .attr("x", 0)
                .attr("y", 0)
                .attr("height", height)
                .attr("width", width);
            svg.attr("height", height).attr("width", width);
        }

        if (current.bFirstCoord) {
            clearMap();
        }

        current.lineData.push([x, y]);

        if (current.bFirstCoord) {
            printCompass(x, y);
            current.bFirstCoord = !current.bFirstCoord;
        } else {
            printLine(x, y);
        }
    }

    function printF11Coord(x, y, textX, textY) {
        const g = mainGCoord.append("g").attr("transform", `translate(${x},${y})`);
        g.append("circle").attr("r", 20);
        g
            .append("text")
            .attr("dx", "-1.5em")
            .attr("dy", "-.5em")
            .text(formatCoord(textX));
        g
            .append("text")
            .attr("dx", "-1.5em")
            .attr("dy", ".5em")
            .text(formatCoord(textY));
    }

    function goToF11(F11XIn, F11YIn) {
        // F11 coord to svg coord
        function convertCoordX(x, y) {
            return defaults.transformMatrix.A * x + defaults.transformMatrix.B * y + defaults.transformMatrix.C;
        }

        // F11 coord to svg coord
        function convertCoordY(x, y) {
            return defaults.transformMatrix.B * x - defaults.transformMatrix.A * y + defaults.transformMatrix.D;
        }

        // https://stackoverflow.com/questions/14718561/how-to-check-if-a-number-is-between-two-values
        function between(value, a, b, inclusive) {
            const min = Math.min.apply(Math, [a, b]),
                max = Math.max.apply(Math, [a, b]);
            return inclusive ? value >= min && value <= max : value > min && value < max;
        }

        const F11X = Number(F11XIn * -1),
            F11Y = Number(F11YIn * -1);
        const x = convertCoordX(F11X, F11Y),
            y = convertCoordY(F11X, F11Y);

        if (
            between(x, defaults.coord.min, defaults.coord.max, true) &&
            between(y, defaults.coord.min, defaults.coord.max, true)
        ) {
            clearMap();
            if (current.radioButton === "F11") {
                printF11Coord(x, y, F11X, F11Y);
            } else {
                plotCourse(x, y);
            }
            zoomAndPan(x, y, 1);
        }
    }

    function doubleClickAction() {
        function printCoord(x, y) {
            // svg coord to F11 coord
            function convertInvCoordX() {
                return (
                    defaults.transformMatrixInv.A * x +
                    defaults.transformMatrixInv.B * y +
                    defaults.transformMatrixInv.C
                );
            }

            // svg coord to F11 coord
            function convertInvCoordY() {
                return (
                    defaults.transformMatrixInv.B * x -
                    defaults.transformMatrixInv.A * y +
                    defaults.transformMatrixInv.D
                );
            }

            const F11X = convertInvCoordX(x, y) * -1,
                F11Y = convertInvCoordY(x, y) * -1;

            if (current.radioButton === "F11") {
                printF11Coord(x, y, F11X, F11Y);
            } else {
                plotCourse(x, y);
            }
        }

        const coord = d3.mouse(this),
            transform = d3.zoomTransform(this);
        const mx = coord[0],
            my = coord[1],
            tk = transform.k,
            tx = transform.x,
            ty = transform.y;

        const x = (mx - tx) / tk,
            y = (my - ty) / tk;

        if (current.radioButton === "F11") {
            printCoord(x, y);
        } else {
            plotCourse(x, y);
        }

        zoomAndPan(x, y, 1);
    }

    function updatePBZones() {
        pbZones.datum(current.PBZoneData).attr("d", d3.geoPath().pointRadius(4));
        towers.datum(current.towerData).attr("d", d3.geoPath().pointRadius(1.5));
        forts.datum(current.fortData).attr("d", d3.geoPath().pointRadius(2));
    }

    function setPBZoneData() {
        if (current.showPBZones && current.zoomLevel === "pbZone") {
            current.PBZoneData = {
                type: "FeatureCollection",
                features: defaults.PBZoneData.features.filter(d => d.id === current.port.id).map(d => ({
                    type: "Feature",
                    id: d.id,
                    geometry: d.geometry
                }))
            };
            current.fortData = {
                type: "FeatureCollection",
                features: defaults.fortData.features.filter(d => d.id === current.port.id).map(d => ({
                    type: "Feature",
                    id: d.id,
                    geometry: d.geometry
                }))
            };
            current.towerData = {
                type: "FeatureCollection",
                features: defaults.towerData.features.filter(d => d.id === current.port.id).map(d => ({
                    type: "Feature",
                    id: d.id,
                    geometry: d.geometry
                }))
            };
        } else {
            current.PBZoneData = {};
            current.fortData = {};
            current.towerData = {};
        }
    }

    function updateMap() {
        function setZoomLevel(zoomLevel) {
            current.zoomLevel = zoomLevel;
            ports.zoomLevel = zoomLevel;
            teleport.zoomLevel = zoomLevel;
        }
        function updateCurrent() {
            updatePBZones();
            teleport.updateTeleportAreas();
            ports.updatePorts(teleport.highlightId);
        }

        if (d3.event.transform.k > defaults.PBZoneZoomThreshold) {
            if (current.zoomLevel !== "pbZone") {
                setZoomLevel("pbZone");
                setPBZoneData();
                teleport.setTeleportData(false);
                updateCurrent();
            }
        } else if (d3.event.transform.k > defaults.labelZoomThreshold) {
            if (current.zoomLevel !== "portLabel") {
                setZoomLevel("portLabel");
                setPBZoneData();
                teleport.setTeleportData(true);
                updateCurrent();
            }
        } else if (current.zoomLevel !== "initial") {
            setZoomLevel("initial");
            setPBZoneData();
            teleport.setTeleportData(true);
            updateCurrent();
        }
    }

    function naZoomed() {
        updateMap();

        // noinspection JSSuspiciousNameCombination
        const transform = d3.zoomIdentity
            .translate(Math.round(d3.event.transform.x), Math.round(d3.event.transform.y))
            .scale(Math.round(d3.event.transform.k * 1000) / 1000);

        displayCountries(transform);
        ports.transform(transform);
        teleport.transform(transform);
        mainGPBZone.attr("transform", transform);
        mainGCoord.attr("transform", transform);
    }

    function goToPort() {
        if (current.port.id !== "0") {
            zoomAndPan(current.port.coord.x, current.port.coord.y, 2);
        } else {
            initialZoomAndPan();
        }
    }

    function setup() {
        function stopProp() {
            if (d3.event.defaultPrevented) {
                d3.event.stopPropagation();
            }
        }

        function setupSvg() {
            // noinspection JSSuspiciousNameCombination
            naZoom = d3
                .zoom()
                .scaleExtent([defaults.minScale, defaults.maxScale])
                .translateExtent([[defaults.coord.min, defaults.coord.min], [defaults.coord.max, defaults.coord.max]])
                .wheelDelta(() => -defaults.wheelDelta * Math.sign(d3.event.deltaY))
                .on("zoom", naZoomed);

            naSvg = d3
                .select("#na")
                .append("svg")
                .attr("id", "na-svg")
                .attr("width", defaults.width)
                .attr("height", defaults.height)
                .style("position", "absolute")
                .style("top", `${defaults.margin.top}px`)
                .style("left", `${defaults.margin.left}px`)
                .call(naZoom)
                .on("dblclick.zoom", null)
                .on("click", stopProp, true)
                .on("dblclick", doubleClickAction);

            svgDef = naSvg.append("defs");
            svgDef
                .append("marker")
                .attr("id", "course-arrow")
                .attr("viewBox", "0 -5 10 10")
                .attr("refX", 5)
                .attr("refY", 0)
                .attr("markerWidth", 4)
                .attr("markerHeight", 4)
                .attr("orient", "auto")
                .append("path")
                .attr("d", "M0,-5L10,0L0,5")
                .attr("class", "course-head");
            svgDef
                .append("marker")
                .attr("id", "wind-arrow")
                .attr("viewBox", "0 -5 10 10")
                .attr("refX", 5)
                .attr("refY", 0)
                .attr("markerWidth", 4)
                .attr("markerHeight", 4)
                .attr("orient", "auto")
                .append("path")
                .attr("d", "M0,-5L10,0L0,5")
                .attr("class", "wind-head");
            mainGMap = naSvg.append("g").classed("map", true);

            mainGPBZone = naSvg.append("g").classed("pb", true);
            pbZones = mainGPBZone.append("path").classed("pb-zone", true);
            towers = mainGPBZone.append("path").classed("tower", true);
            forts = mainGPBZone.append("path").classed("fort", true);
            mainGCoord = naSvg.append("g").classed("coord", true);
        }

        function setupSelects() {
            const portNames = $("#port-names"),
                goodNames = $("#good-names");

            function setupPortSelect() {
                const selectPorts = defaults.portData
                    .map(d => ({
                        id: d.id,
                        coord: [d.geometry.coordinates[0], d.geometry.coordinates[1]],
                        name: d.properties.name,
                        nation: d.properties.nation
                    }))
                    .sort((a, b) => {
                        if (a.name < b.name) {
                            return -1;
                        }
                        if (a.name > b.name) {
                            return 1;
                        }
                        return 0;
                    });

                const select = `${selectPorts
                    .map(
                        port =>
                            `<option data-subtext="${port.nation}" value="${port.coord}" data-id="${port.id}">${
                                port.name
                            }</option>`
                    )
                    .join("")}`;
                portNames.append(select);
            }

            function setupGoodSelect() {
                let selectGoods = new Map();
                const goodsPerPort = defaults.portData.map(d => {
                    let goods = d.properties.dropsTrading ? d.properties.dropsTrading : "";
                    goods += d.properties.dropsNonTrading ? `,${d.properties.dropsNonTrading}` : "";
                    goods += d.properties.producesTrading ? `,${d.properties.producesTrading}` : "";
                    goods += d.properties.producesNonTrading ? `,${d.properties.producesNonTrading}` : "";
                    return {
                        id: d.id,
                        goods
                    };
                });

                goodsPerPort.forEach(port => {
                    port.goods.split(",").forEach(good => {
                        if (good) {
                            const portIds = new Set(selectGoods.get(good)).add(port.id);
                            selectGoods.set(good, portIds);
                        }
                    });
                });
                selectGoods = new Map(Array.from(selectGoods).sort());
                let select = "";
                // eslint-disable-next-line no-restricted-syntax
                for (const [key, portIds] of selectGoods.entries()) {
                    let ids = "";
                    // eslint-disable-next-line no-restricted-syntax
                    for (const id of portIds) {
                        ids += `,${id}`;
                    }
                    select += `<option value="${ids.substr(1)}">${key}</option>`;
                }
                goodNames.append(select);
            }

            function portSelected() {
                const port = $(this).find(":selected");
                const c = port.val().split(",");
                current.port.coord.x = +c[0];
                current.port.coord.y = +c[1];
                current.port.id = port.data("id").toString();

                if (current.showPBZones) {
                    setPBZoneData();
                    updatePBZones();
                    ports.updatePorts(teleport.highlightId);
                }
                goToPort();
            }

            function goodSelected() {
                const portIds = $(this)
                    .val()
                    .split(",");
                if (portIds.includes("0")) {
                    ports.portData = defaults.portData;
                } else {
                    ports.portData = defaults.portData.filter(d => portIds.includes(d.id));
                }
                ports.updatePorts(teleport.highlightId);
            }

            portNames.addClass("selectpicker");
            goodNames.addClass("selectpicker");
            $(".selectpicker").selectpicker({
                dropupAuto: false,
                liveSearch: true,
                liveSearchPlaceholder: "Search ...",
                // accent-insensitive searching
                liveSearchNormalize: true
            });

            setupPortSelect();
            portNames.on("change", portSelected).selectpicker({
                title: "Go to a port"
            });

            setupGoodSelect();
            goodNames.on("change", goodSelected).selectpicker({
                title: "Select a good"
            });

            $(".selectpicker").selectpicker("refresh");
        }

        function setupClanSelect() {
            const propClan = $("#prop-clan");

            propClan.empty();

            const clanList = new Set();
            ports.portData.filter(d => d.properties.capturer).map(d => clanList.add(d.properties.capturer));
            const select = `<option value="0">Select a clan/Reset</option>${Array.from(clanList)
                .sort()
                .map(clan => `<option value="${clan}">${clan}</option>`)
                .join("")}`;
            propClan.append(select);
        }

        function clanSelected() {
            const clan = $("#prop-clan").val();

            if (+clan !== 0) {
                ports.portData = defaults.portData.filter(d => clan === d.properties.capturer);
            } else if (current.nation) {
                ports.portData = defaults.portData.filter(d => current.nation === d.properties.nation);
            } else {
                ports.portData = defaults.portData;
            }
            $("#propertyDropdown").dropdown("toggle");
            ports.updatePorts(teleport.highlightId);
        }

        function setupPropertyMenu() {
            const dateFormat = "dd YYYY-MM-DD",
                timeFormat = "HH:00";

            function setupNationSelect() {
                const propNation = $("#prop-nation");
                const select = `<option value="0">Select a nation/Reset</option>${nations
                    .sort((a, b) => {
                        if (a.sortName < b.sortName) {
                            return -1;
                        }
                        if (a.sortName > b.sortName) {
                            return 1;
                        }
                        return 0;
                    })
                    .map(nation => `<option value="${nation.id}">${nation.name}</option>`)
                    .join("")}`;
                propNation.append(select);
            }

            function nationSelected() {
                const nationId = $("#prop-nation").val();

                if (+nationId !== 0) {
                    current.nation = nationId;
                    ports.portData = defaults.portData.filter(d => nationId === d.properties.nation);
                    setupClanSelect();
                } else {
                    current.nation = "";
                    ports.portData = defaults.portData;
                    setupClanSelect();
                }
                $("#propertyDropdown").dropdown("toggle");
                ports.updatePorts(teleport.highlightId);
            }

            function allSelect() {
                ports.portData = defaults.portData.filter(d => d.properties.availableForAll);
                ports.updatePorts(teleport.highlightId);
            }

            function greenZoneSelect() {
                ports.portData = defaults.portData.filter(
                    d => d.properties.nonCapturable && d.properties.nation !== "FT"
                );
                ports.updatePorts(teleport.highlightId);
            }

            function capturePBRange() {
                const blackOutTimes = [8, 9, 10],
                    // 24 hours minus black-out hours
                    maxStartTime = 24 - (blackOutTimes.length + 1);
                const startTimes = new Set();
                const begin = moment($("#prop-pb-from-input").val(), timeFormat).hour();
                let end = moment($("#prop-pb-to-input").val(), timeFormat).hour();

                console.log("Between %d and %d", begin, end);

                // Range not in black-out range of 9 to 10
                if (!(blackOutTimes.includes(begin) && blackOutTimes.includes(end) && begin <= end)) {
                    startTimes.add(0);
                    if (end < begin) {
                        end += 24;
                    }
                    for (let i = begin - 2; i <= end - 3; i += 1) {
                        startTimes.add((i - 10) % maxStartTime);
                    }
                }

                /*
                console.log(startTimes);
                for (const time of startTimes.values()) {
                    console.log(
                        "%s.00\u202f–\u202f%s.00",
                        !time ? "11" : (time + 10) % 24,
                        !time ? "8" : (time + 13) % 24
                    );
                }
                */

                ports.portData = defaults.portData.filter(
                    d =>
                        !d.properties.nonCapturable &&
                        d.properties.nation !== "FT" &&
                        startTimes.has(d.properties.portBattleStartTime)
                );
                ports.updatePorts(teleport.highlightId);
            }

            function filterCaptured(begin, end) {
                console.log(
                    "Between %s and %s",
                    begin.format("dddd D MMMM YYYY h:mm"),
                    end.format("dddd D MMMM YYYY h:mm")
                );
                ports.portData = defaults.portData.filter(d =>
                    moment(d.properties.lastPortBattle).isBetween(begin, end, null, "(]")
                );
                ports.updatePorts(teleport.highlightId);
            }

            function capturedYesterday() {
                const begin = moment()
                        .utc()
                        .subtract(1, "day")
                        .hour(11)
                        .minute(0),
                    end = moment()
                        .utc()
                        .hour(11)
                        .minute(0);
                filterCaptured(begin, end);
            }

            function capturedThisWeek() {
                const currentMondayOfWeek = moment()
                    .utc()
                    .startOf("week");
                const begin = currentMondayOfWeek.hour(11), // this Monday
                    end = moment(currentMondayOfWeek)
                        .add(7, "day")
                        .hour(11); // next Monday
                filterCaptured(begin, end);
            }

            function capturedLastWeek() {
                const currentMondayOfWeek = moment()
                    .utc()
                    .startOf("week");
                const begin = moment(currentMondayOfWeek)
                        .subtract(7, "day")
                        .hour(11), // Monday last week
                    end = currentMondayOfWeek.hour(11); // this Monday
                filterCaptured(begin, end);
            }

            function captureRange() {
                const begin = moment($("#prop-from-input").val(), dateFormat).hour(11),
                    end = moment($("#prop-to-input").val(), dateFormat)
                        .add(1, "day")
                        .hour(11);
                filterCaptured(begin, end);
            }

            function setupCMSelect() {
                const propCM = $("#prop-cm");

                propCM.append(
                    $("<option>", {
                        value: 0,
                        text: "Select amount"
                    })
                );
                const cmList = new Set();
                ports.portData
                    .filter(d => d.properties.capturer)
                    .map(d => cmList.add(d.properties.conquestMarksPension));
                cmList.forEach(cm => {
                    propCM.append(
                        $("<option>", {
                            value: cm,
                            text: cm
                        })
                    );
                });
            }

            function CMSelect() {
                const value = parseInt($("#prop-cm").val(), 10);

                if (value !== 0) {
                    ports.portData = defaults.portData.filter(d => value === d.properties.conquestMarksPension);
                } else {
                    ports.portData = defaults.portData;
                }
                $("#propertyDropdown").dropdown("toggle");
                ports.updatePorts(teleport.highlightId);
            }

            setupNationSelect();
            $("#prop-nation")
                .on("click", event => event.stopPropagation())
                .on("change", nationSelected);

            setupClanSelect();
            $("#prop-clan")
                .on("click", event => event.stopPropagation())
                .on("change", clanSelected);

            $("#menu-prop-all").on("click", () => allSelect());
            $("#menu-prop-green").on("click", () => greenZoneSelect());

            // noinspection JSJQueryEfficiency
            $("#prop-pb-from").datetimepicker({
                format: timeFormat
            });
            // noinspection JSJQueryEfficiency
            $("#prop-pb-to").datetimepicker({
                format: timeFormat
            });
            $("#prop-pb-range").submit(event => {
                capturePBRange();
                $("#propertyDropdown").dropdown("toggle");
                event.preventDefault();
            });

            $("#menu-prop-yesterday").on("click", () => capturedYesterday());
            $("#menu-prop-this-week").on("click", () => capturedThisWeek());
            $("#menu-prop-last-week").on("click", () => capturedLastWeek());

            // noinspection JSJQueryEfficiency
            $("#prop-from").datetimepicker({
                format: dateFormat
            });
            // noinspection JSJQueryEfficiency
            $("#prop-to").datetimepicker({
                format: dateFormat,
                useCurrent: false
            });
            // noinspection JSJQueryEfficiency
            $("#prop-from").on("change.datetimepicker", e => {
                $("#prop-to").datetimepicker("minDate", e.date);
            });
            // noinspection JSJQueryEfficiency
            $("#prop-to").on("change.datetimepicker", e => {
                $("#prop-from").datetimepicker("maxDate", e.date);
            });

            $("#prop-range").submit(event => {
                captureRange();
                $("#propertyDropdown").dropdown("toggle");
                event.preventDefault();
            });

            setupCMSelect();
            $("#prop-cm")
                .on("click", event => event.stopPropagation())
                .on("change", () => CMSelect());
        }

        function setupListener() {
            function setupF11Copy() {
                // https://stackoverflow.com/questions/22581345/click-button-copy-to-clipboard-using-jquery
                function copyF11ToClipboard(F11coord) {
                    const temp = $("<input>");

                    $("body").append(temp);
                    temp.val(F11coord).select();
                    document.execCommand("copy");
                    temp.remove();
                }

                $("#copy-coord").click(() => {
                    const x = $("#x-coord").val(),
                        z = $("#z-coord").val();

                    if (!Number.isNaN(x) && !Number.isNaN(z)) {
                        const F11String = `F11 coordinates X: ${x} Z: ${z}`;
                        copyF11ToClipboard(F11String);
                    }
                });
            }

            function setupF11Paste() {
                function pasteF11FromClipboard(e) {
                    function addF11StringToInput(F11String) {
                        const regex = /F11 coordinates X: ([-+]?[0-9]*\.?[0-9]+) Z: ([-+]?[0-9]*\.?[0-9]+)/g,
                            match = regex.exec(F11String);

                        if (match && !Number.isNaN(+match[1]) && !Number.isNaN(+match[2])) {
                            const x = +match[1],
                                z = +match[2];
                            if (!Number.isNaN(Number(x)) && !Number.isNaN(Number(z))) {
                                goToF11(x, z);
                            }
                        }
                    }
                    const F11String =
                        // eslint-disable-next-line no-nested-ternary
                        e.clipboardData && e.clipboardData.getData
                            ? e.clipboardData.getData("text/plain") // Standard
                            : window.clipboardData && window.clipboardData.getData
                                ? window.clipboardData.getData("Text") // MS
                                : false;

                    // If one of the F11 input elements is in focus
                    if (document.activeElement.id === "x-coord" || document.activeElement.id === "z-coord") {
                        // test for number
                        if (!Number.isNaN(+F11String)) {
                            // paste number in input element
                            $(`#${document.activeElement.id}`)
                                .val(F11String)
                                .select();
                        }
                    } else {
                        // Paste F11string
                        addF11StringToInput(F11String);
                    }
                }

                document.addEventListener("paste", event => {
                    pasteF11FromClipboard(event);
                    event.preventDefault();
                });
            }

            function setShowPBZones(showPBZones) {
                current.showPBZones = showPBZones;
                ports.showPBZones = showPBZones;
            }

            setupF11Copy();
            setupF11Paste();

            $("#f11").submit(event => {
                const x = +$("#x-coord").val(),
                    z = +$("#z-coord").val();

                goToF11(x, z);
                event.preventDefault();
            });

            $("#reset").on("click", () => {
                clearMap();
            });

            $("#double-click-action").change(() => {
                current.radioButton = $("input[name='mouseFunction']:checked").val();
                clearMap();
            });

            $("#show-pb")
                .on("click", event => event.stopPropagation())
                .on("change", () => {
                    const $input = $("#show-pb");

                    setShowPBZones($input.is(":checked"));
                    setPBZoneData();
                    updatePBZones();
                    ports.updatePortTexts();
                });

            $("#button-ship-compare").on("click", event => {
                event.stopPropagation();
                // eslint-disable-next-line no-unused-vars
                const shipCompare = new ShipCompare(defaults.shipData);
            });
        }

        moment.locale("en-gb");
        setupSvg();
        ports = new PortDisplay(defaults.portData);
        teleport = new Teleport(defaults.portData, defaults.coord.min, defaults.coord.max, ports);
        windPrediction = new WindPrediction(ports, defaults.margin.left, defaults.margin.top);
        setupSelects();
        setupPropertyMenu();
        setupListener();
        initialZoomAndPan();
    }

    function naReady(error, naMapJsonData, pbZonesJsonData, shipJsonData) {
        if (error) {
            throw error;
        }

        // Read map data
        defaults.portData = topojsonFeature(naMapJsonData, naMapJsonData.objects.ports).features;
        defaults.PBZoneData = topojsonFeature(pbZonesJsonData, pbZonesJsonData.objects.pbZones);
        defaults.fortData = topojsonFeature(pbZonesJsonData, pbZonesJsonData.objects.forts);
        defaults.towerData = topojsonFeature(pbZonesJsonData, pbZonesJsonData.objects.towers);
        current.PBZoneData = {};
        current.fortData = {};
        current.towerData = {};

        defaults.shipData = JSON.parse(JSON.stringify(shipJsonData.shipData));

        setup();
    }

    d3
        .queue()
        .defer(d3.json, defaults.mapJson)
        .defer(d3.json, defaults.pbJson)
        .defer(d3.json, defaults.shipJson)
        .await(naReady);
}

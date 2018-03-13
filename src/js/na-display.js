/*
 Draws teleport map for Naval Action

 iB 2017, 2018
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
import Course from "./course";
import F11 from "./f11";
import PBZone from "./pbzone";
import PortDisplay from "./port";
import ShipCompare from "./ship-compare";
import Teleport from "./teleport";
import WindPrediction from "./wind-prediction";

import { nearestPow2 } from "./util";

export default function naDisplay(serverName) {
    let naSvg, zoom, mainGMap, ports, teleport, windPrediction, f11, course, pbZone;
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
        line: d3.line()
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

        const tileZoom = Math.min(
            defaults.maxTileZoom,
            Math.ceil(Math.log2(Math.max(width, height))) - defaults.log2tileSize
        );
        const p = Math.round(tileZoom * 10 - scale * 10 - defaults.maxTileZoom * 10) / 10,
            k = defaults.wheelDelta ** p;

        const { x } = transform,
            { y } = transform,
            // crop right side
            dx = defaults.coord.max * transform.k < defaults.width ? transform.x : 0,
            // crop bottom
            dy = defaults.coord.max * transform.k < defaults.height ? transform.y : 0,
            cols = d3.range(
                Math.max(0, Math.floor((x0 - x) / defaults.tileSize / k)),
                Math.max(0, Math.min(Math.ceil((x1 - x - dx) / defaults.tileSize / k), 2 ** tileZoom))
            ),
            rows = d3.range(
                Math.max(0, Math.floor((y0 - y) / defaults.tileSize / k)),
                Math.max(0, Math.min(Math.ceil((y1 - y - dy) / defaults.tileSize / k), 2 ** tileZoom))
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
                tiles.push([col, row, tileZoom]);
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
        naSvg.call(zoom.scaleTo, defaults.minScale);
    }

    function zoomAndPan(x, y, scale) {
        const transform = d3.zoomIdentity
            .scale(scale)
            .translate(Math.round(-x + defaults.width / 2 / scale), Math.round(-y + defaults.height / 2 / scale));
        naSvg.call(zoom.transform, transform);
    }

    function clearMap() {
        windPrediction.clearMap();
        course.clearMap();
        f11.clearMap();
        ports.clearMap(teleport.highlightId);
    }

    function doubleClickAction() {
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
            f11.printCoord(x, y);
        } else {
            course.plotCourse(x, y);
        }

        zoomAndPan(x, y, 1);
    }

    function updateMap() {
        function setZoomLevel(zoomLevel) {
            current.zoomLevel = zoomLevel;
            ports.zoomLevel = zoomLevel;
            teleport.zoomLevel = zoomLevel;
        }

        function updateCurrent() {
            pbZone.update();
            teleport.updateTeleportAreas();
            ports.update(teleport.highlightId);
        }

        if (d3.event.transform.k > defaults.PBZoneZoomThreshold) {
            if (current.zoomLevel !== "pbZone") {
                setZoomLevel("pbZone");
                pbZone.setData();
                teleport.setTeleportData(false);
                updateCurrent();
            }
        } else if (d3.event.transform.k > defaults.labelZoomThreshold) {
            if (current.zoomLevel !== "portLabel") {
                setZoomLevel("portLabel");
                pbZone.setData();
                teleport.setTeleportData(true);
                updateCurrent();
            }
        } else if (current.zoomLevel !== "initial") {
            setZoomLevel("initial");
            pbZone.setData();
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
        course.transform(transform);
        pbZone.transform(transform);
        f11.transform(transform);
    }

    function goToPort() {
        if (ports.currentPort.id !== "0") {
            zoomAndPan(ports.currentPort.coord.x, ports.currentPort.coord.y, 2);
        } else {
            initialZoomAndPan();
        }
    }

    function setup() {
        function setupSelects() {
            const portNames = $("#port-names"),
                goodNames = $("#good-names");

            function setupPortSelect() {
                const selectPorts = ports.portDataDefault
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
                const goodsPerPort = ports.portDataDefault.map(d => {
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
                ports.currentPort.coord.x = +c[0];
                ports.currentPort.coord.y = +c[1];
                ports.currentPort.id = port.data("id").toString();

                if (pbZone.showPBZones) {
                    pbZone.refresh();
                    ports.update(teleport.highlightId);
                }
                goToPort();
            }

            function goodSelected() {
                const portIds = $(this)
                    .val()
                    .split(",");
                if (portIds.includes("0")) {
                    ports.portData = ports.portDataDefault;
                } else {
                    ports.portData = ports.portDataDefault.filter(d => portIds.includes(d.id));
                }
                ports.update(teleport.highlightId);
            }

            const selectPicker = $(".selectpicker");
            portNames.addClass("selectpicker");
            goodNames.addClass("selectpicker");
            selectPicker.selectpicker({
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

            selectPicker.selectpicker("refresh");
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
                ports.portData = ports.portDataDefault.filter(d => clan === d.properties.capturer);
            } else if (current.nation) {
                ports.portData = ports.portDataDefault.filter(d => current.nation === d.properties.nation);
            } else {
                ports.portData = ports.portDataDefault;
            }
            $("#propertyDropdown").dropdown("toggle");
            ports.update(teleport.highlightId);
        }

        function setupPropertyMenu() {
            const dateFormat = "D MMM",
                timeFormat = "HH.00";

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
                    ports.portData = ports.portDataDefault.filter(d => nationId === d.properties.nation);
                    setupClanSelect();
                } else {
                    current.nation = "";
                    ports.portData = ports.portDataDefault;
                    setupClanSelect();
                }
                $("#propertyDropdown").dropdown("toggle");
                ports.update(teleport.highlightId);
            }

            function allSelect() {
                ports.portData = ports.portDataDefault.filter(d => d.properties.availableForAll);
                ports.update(teleport.highlightId);
            }

            function greenZoneSelect() {
                ports.portData = ports.portDataDefault.filter(
                    d => d.properties.nonCapturable && d.properties.nation !== "FT"
                );
                ports.update(teleport.highlightId);
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

                ports.portData = ports.portDataDefault.filter(
                    d =>
                        !d.properties.nonCapturable &&
                        d.properties.nation !== "FT" &&
                        startTimes.has(d.properties.portBattleStartTime)
                );
                ports.update(teleport.highlightId);
            }

            function filterCaptured(begin, end) {
                console.log(
                    "Between %s and %s",
                    begin.format("dddd D MMMM YYYY h:mm"),
                    end.format("dddd D MMMM YYYY h:mm")
                );
                ports.portData = ports.portDataDefault.filter(d =>
                    moment(d.properties.lastPortBattle).isBetween(begin, end, null, "(]")
                );
                ports.update(teleport.highlightId);
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
                    ports.portData = ports.portDataDefault.filter(d => value === d.properties.conquestMarksPension);
                } else {
                    ports.portData = ports.portDataDefault;
                }
                $("#propertyDropdown").dropdown("toggle");
                ports.update(teleport.highlightId);
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
            $("#reset").on("click", () => {
                clearMap();
            });

            $("#double-click-action").change(() => {
                current.radioButton = $("input[name='mouseFunction']:checked").val();
                clearMap();
            });

            $("#button-ship-compare").on("click", event => {
                event.stopPropagation();
                // eslint-disable-next-line no-unused-vars
                const shipCompare = new ShipCompare(defaults.shipData);
            });
        }

        teleport = new Teleport(defaults.coord.min, defaults.coord.max, ports);
        windPrediction = new WindPrediction(ports, defaults.margin.left, defaults.margin.top);
        f11 = new F11(defaults.coord.min, defaults.coord.max);
        course = new Course(ports.fontSizes.portLabel);
        moment.locale("en-gb");
        setupSelects();
        setupPropertyMenu();
        setupListener();
        initialZoomAndPan();
    }

    function naReady(error, naMapJsonData, pbZonesJsonData, shipJsonData) {
        function setupSvg() {
            function stopProp() {
                if (d3.event.defaultPrevented) {
                    d3.event.stopPropagation();
                }
            }

            // noinspection JSSuspiciousNameCombination
            zoom = d3
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
                .call(zoom)
                .on("dblclick.zoom", null)
                .on("click", stopProp, true)
                .on("dblclick", doubleClickAction);

            naSvg.append("defs");

            mainGMap = naSvg.append("g").classed("map", true);
        }

        if (error) {
            throw error;
        }

        setupSvg();

        // Read map data
        const portData = topojsonFeature(naMapJsonData, naMapJsonData.objects.ports).features;
        ports = new PortDisplay(portData);

        const pbZoneData = topojsonFeature(pbZonesJsonData, pbZonesJsonData.objects.pbZones);
        const fortData = topojsonFeature(pbZonesJsonData, pbZonesJsonData.objects.forts);
        const towerData = topojsonFeature(pbZonesJsonData, pbZonesJsonData.objects.towers);
        pbZone = new PBZone(pbZoneData, fortData, towerData, ports);

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

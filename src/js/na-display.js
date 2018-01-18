/*
 Draws teleport map for Naval Action

 iB 2017
 */

/* global d3 : false
 */

import { feature as topojsonFeature } from "topojson-client";
import moment from "moment";
import "moment/locale/en-gb";
import "jquery-knob";

import "bootstrap/js/dist/tooltip";
import "bootstrap/js/dist/util";

export default function naDisplay(serverName) {
    let naSvg,
        naCanvas,
        naContext,
        svgDef,
        naZoom,
        mainGPort,
        mainGPBZone,
        pbZones,
        towers,
        forts,
        mainGVoronoi,
        mainGCoord,
        gCompass;

    const defaults = {
        margin: { top: parseInt($(".navbar").css("height"), 10), right: 20, bottom: 20, left: 20 },
        coord: {
            min: 0,
            max: 8192
        },
        portCoord: [4396, 2494], // Shroud Cay
        maxScale: 10,
        fontSize: { initial: 30, portLabel: 18, pbZone: 7 },
        circleSize: { initial: 50, portLabel: 20, pbZone: 5 },
        iconSize: 50,
        PBZoneZoomScale: 1.5,
        labelZoomScale: 0.5,
        highlightDuration: 200,
        mapJson: `${serverName}.json`,
        pbJson: "pb.json",
        image: new Image(),
        imageSrc: "images/na-map.jpg",
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
        },
        compassDirections: [
            "N",
            "NNE",
            "NE",
            "ENE",
            "E",
            "ESE",
            "SE",
            "SSE",
            "S",
            "SSW",
            "SW",
            "WSW",
            "W",
            "WNW",
            "NW",
            "NNW"
        ],
        nations: [
            { id: "DE", name: "Kingdom of Prussia", sortName: "Prussia" },
            { id: "DK", name: "Danmark-Norge", sortName: "Danmark-Norge" },
            { id: "ES", name: "España", sortName: "España" },
            { id: "FR", name: "France", sortName: "France" },
            { id: "FT", name: "Free Town", sortName: "Free Town" },
            { id: "GB", name: "Great Britain", sortName: "Great Britain" },
            { id: "NT", name: "Neutral", sortName: "Neutral" },
            { id: "PL", name: "Commonwealth of Poland", sortName: "Poland" },
            { id: "PR", name: "Pirates", sortName: "Pirates" },
            { id: "RU", name: "Russian Empire", sortName: "Russian Empire" },
            { id: "SE", name: "Sverige", sortName: "Sverige" },
            { id: "US", name: "United States", sortName: "United States" },
            { id: "VP", name: "Verenigde Provinciën", sortName: "Verenigde Provinciën" }
        ]
    };
    // eslint-disable-next-line no-restricted-globals
    defaults.width = top.innerWidth - defaults.margin.left - defaults.margin.right;
    // eslint-disable-next-line no-restricted-globals
    defaults.height = top.innerHeight - defaults.margin.top - defaults.margin.bottom;
    defaults.minScale = Math.min(defaults.height, defaults.width) / Math.max(defaults.coord.max, defaults.coord.max);
    defaults.coord.voronoi = [
        [defaults.coord.min - 1, defaults.coord.min - 1],
        [defaults.coord.max + 1, defaults.coord.max + 1]
    ];
    // limit how far away the mouse can be from finding a voronoi site
    defaults.voronoiRadius = Math.max(defaults.height, defaults.width);

    const current = {
        portCoord: defaults.portCoord,
        fontSize: defaults.fontSize.initial,
        circleSize: defaults.circleSize.initial,
        bFirstCoord: true,
        radioButton: "compass",
        lineData: [],
        nation: ""
    };

    const thousandsWithBlanks = x => x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");

    const formatCoord = x => {
        let r = thousandsWithBlanks(Math.abs(Math.trunc(x)));
        if (x < 0) {
            r = `\u2212\u202f${r}`;
        }
        return r;
    };

    // https://stackoverflow.com/questions/7490660/converting-wind-direction-in-angles-to-text-words
    function degreesToCompass(degrees) {
        const val = Math.floor(degrees / 22.5 + 0.5);
        return defaults.compassDirections[val % 16];
    }

    function displayCountries(transform) {
        naContext.setTransform(1, 0, 0, 1, 0, 0);
        naContext.clearRect(0, 0, defaults.width, defaults.height);
        naContext.setTransform(transform.k, 0, 0, transform.k, transform.x, transform.y);
        naContext.drawImage(defaults.image, 0, 0);
    }

    function updatePorts() {
        function updateCircles() {
            function naTooltipData(d) {
                let h = `<table><tbody<tr><td><i class="flag-icon ${
                    d.availableForAll ? `${d.nation}a` : d.nation
                }"></i></td>`;
                h += `<td><span class="port-name">${d.name}</span>`;
                h += d.availableForAll ? " (accessible to all nations)" : "";
                h += "</td></tr></tbody></table>";
                h += `<p>${d.shallow ? "Shallow" : "Deep"}`;
                h += " water port";
                if (d.countyCapital) {
                    h += " (county capital)";
                }
                if (d.capturer) {
                    h += ` captured by ${d.capturer} ${moment(d.lastPortBattle).fromNow()}`;
                }
                h += "<br>";
                if (!d.nonCapturable) {
                    const pbTimeRange = !d.portBattleStartTime
                        ? "11.00\u202f–\u202f8.00"
                        : `${(d.portBattleStartTime + 10) % 24}.00\u202f–\u202f${(d.portBattleStartTime + 13) % 24}.00`;
                    h += `Port battle ${pbTimeRange}, ${thousandsWithBlanks(d.brLimit)} BR, `;
                    switch (d.portBattleType) {
                        case "Large":
                            h += "1<sup>st</sup>";
                            break;
                        case "Medium":
                            h += "4<sup>th</sup>";
                            break;
                        default:
                            h += "6<sup>th</sup>";
                            break;
                    }

                    h += "\u202frate AI";
                    h += `, ${d.conquestMarksPension}\u202fconquest point`;
                    h += d.conquestMarksPension > 1 ? "s" : "";
                    h += `<br>Tax income ${thousandsWithBlanks(d.taxIncome)} (${d.portTax *
                        100}\u202f%), net income ${formatCoord(d.netIncome)}`;
                    h += d.tradingCompany ? `, trading company level\u202f${d.tradingCompany}` : "";
                    h += d.laborHoursDiscount ? ", labor hours discount" : "";
                } else {
                    h += "Not capturable";
                    h += `<br>${d.portTax * 100}\u2009% tax`;
                }
                h += "</p>";
                h += "<table class='table table-sm'>";
                if (d.produces.length) {
                    h += `<tr><td>Produces</td><td>${d.produces.join(", ")}</td></tr>`;
                }
                if (d.drops.length) {
                    h += `<tr><td>Drops</td><td>${d.drops.join(", ")}</tr>`;
                }
                if (d.consumes.length) {
                    h += `<tr><td>Consumes</td><td>${d.consumes.join(", ")}</tr>`;
                }
                h += "</table>";

                return h;
            }

            function portMouseover(d, i, nodes) {
                const port = d3.select(nodes[i]);

                port.attr("data-toggle", "tooltip").attr("title", () => naTooltipData(d.properties));
                // eslint-disable-next-line no-underscore-dangle
                $(port._groups[0])
                    .tooltip({
                        delay: { show: defaults.highlightDuration, hide: defaults.highlightDuration },
                        html: true,
                        placement: "auto"
                    })
                    .tooltip("show");
            }

            // Data join
            const circleUpdate = mainGPort.selectAll("circle").data(current.portData, d => d.id);

            // Remove old circles
            circleUpdate.exit().remove();

            // Update kept circles
            // circleUpdate; // not needed

            // Add new circles
            const circleEnter = circleUpdate
                .enter()
                .append("circle")
                .attr("cx", d => d.geometry.coordinates[0])
                .attr("cy", d => d.geometry.coordinates[1])
                .attr("r", current.circleSize)
                .attr(
                    "fill",
                    d => `url(#${d.properties.availableForAll ? `${d.properties.nation}a` : d.properties.nation})`
                )
                .on("mouseover", portMouseover);

            // Apply to both old and new
            circleUpdate
                .merge(circleEnter)
                .attr("r", d => (d.id === current.highlightId ? current.circleSize * 3 : current.circleSize));
        }

        function updateTexts() {
            // Data join
            const textUpdate = mainGPort.selectAll("text").data(current.portLabelData, d => d.id);

            // Remove old text
            textUpdate.exit().remove();

            // Update kept texts
            // textUpdate; // not needed

            // Add new texts
            const textEnter = textUpdate
                .enter()
                .append("text")
                .text(d => d.name);

            // Apply to both old and new
            textUpdate
                .merge(textEnter)
                .attr(
                    "x",
                    d =>
                        d.id === current.highlightId
                            ? d.coord.x + d.dx * 3 * current.dFactor
                            : d.coord.x + d.dx * current.dFactor
                )
                .attr("y", d => {
                    if (current.dFactor) {
                        return d.id === current.highlightId
                            ? d.coord.y + d.dy * 3 * current.dFactor
                            : d.coord.y + d.dy * current.dFactor;
                    }
                    return d.id === current.highlightId
                        ? d.coord.y + current.fontSize * 5
                        : d.coord.y + current.fontSize * 2.2;
                })
                .attr(
                    "font-size",
                    d => (d.id === current.highlightId ? `${current.fontSize * 2}px` : `${current.fontSize}px`)
                )
                .attr("text-anchor", d => {
                    if (current.dFactor) {
                        return d.dx < 0 ? "end" : "start";
                    }
                    return "middle";
                });
        }

        updateCircles();
        updateTexts();
    }

    function updateTeleportAreas() {
        function mouseover(d, i, nodes) {
            const ref = d3.mouse(nodes[i]),
                mx = ref[0],
                my = ref[1];

            // use the new diagram.find() function to find the voronoi site closest to
            // the mouse, limited by max distance defined by defaults.voronoiRadius
            const site = defaults.voronoiDiagram.find(mx, my, defaults.voronoiRadius);
            if (site) {
                current.highlightId = site.data.id;
                updateTeleportAreas();
                updatePorts();
            }
        }

        // Data join
        const pathUpdate = mainGVoronoi.selectAll("path").data(current.TeleportData, d => d.data.id);

        // Remove old paths
        pathUpdate.exit().remove();

        // Update kept paths
        // pathUpdate; // not needed

        // Add new paths (teleport areas)
        const pathEnter = pathUpdate
            .enter()
            .append("path")
            .attr("d", d => (d ? `M${d.join("L")}Z` : null))
            .on("mouseover", mouseover);

        // Apply to both old and new
        pathUpdate.merge(pathEnter).classed("highlight-voronoi", d => d.data.id === current.highlightId);
    }

    function initialZoomAndPan() {
        naSvg.call(naZoom.scaleTo, defaults.minScale);
    }

    function zoomAndPan(x, y, scale) {
        const transform = d3.zoomIdentity
            .scale(scale)
            .translate(-x + defaults.width / 2 / scale, -y + defaults.height / 2 / scale);
        naSvg.call(naZoom.transform, transform);
    }

    function clearMap() {
        mainGCoord.selectAll("*").remove();
        current.bFirstCoord = true;
        current.lineData.splice(0, current.lineData.length);
        current.portData = defaults.portData;
        $("#good-names").get(0).selectedIndex = 0;
        updatePorts();
    }

    function plotCourse(x, y, style = "course") {
        function printCompass() {
            const compassSize = style === "course" ? 100 : 30;

            mainGCoord
                .append("image")
                .attr("class", "compass")
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
            gCompass.datum(current.lineData).attr("d", defaults.line);

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
            const height = bbox.height + defaults.fontSize,
                width = bbox.width + defaults.fontSize;
            rect
                .attr("x", 0)
                .attr("y", 0)
                .attr("height", height)
                .attr("width", width);
            svg.attr("height", height).attr("width", width);
        }

        current.lineData.push([x, y]);
        //        console.log(x, y);
        //        console.log(current.lineData);
        if (current.bFirstCoord) {
            printCompass(x, y, style);
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
        // eslint-disable-next-line no-extend-native
        Number.prototype.between = (a, b, inclusive) => {
            const min = Math.min.apply(Math, [a, b]),
                max = Math.max.apply(Math, [a, b]);
            return inclusive ? this >= min && this <= max : this > min && this < max;
        };

        const F11X = +F11XIn * -1,
            F11Y = +F11YIn * -1;
        const x = convertCoordX(F11X, F11Y),
            y = convertCoordY(F11X, F11Y);

        if (
            x.between(defaults.coord.min, defaults.coord.max, true) &&
            y.between(defaults.coord.min, defaults.coord.max, true)
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
        towers.datum(current.fortData).attr("d", d3.geoPath().pointRadius(1.5));
        forts.datum(current.towerData).attr("d", d3.geoPath().pointRadius(2));
    }

    function naZoomed() {
        function updateMap() {
            function setCurrent(zoomStage) {
                current.zoomStage = zoomStage;
                current.circleSize = defaults.circleSize[current.zoomStage];
                current.fontSize = defaults.fontSize[current.zoomStage];
                updatePBZones();
                updateTeleportAreas();
                updatePorts();
            }

            if (d3.event.transform.k > defaults.PBZoneZoomScale) {
                if (current.zoomStage !== "pbZone") {
                    current.PBZoneData = defaults.PBZoneData;
                    current.fortData = defaults.fortData;
                    current.towerData = defaults.towerData;
                    current.portLabelData = defaults.portLabelData;
                    current.dFactor = 0.5;
                    current.highlightId = null;
                    current.TeleportData = {};
                    setCurrent("pbZone");
                }
            } else if (d3.event.transform.k > defaults.labelZoomScale) {
                if (current.zoomStage !== "portLabel") {
                    current.PBZoneData = {};
                    current.fortData = {};
                    current.towerData = {};
                    current.portLabelData = defaults.portLabelData;
                    current.dFactor = 0;
                    current.highlightId = null;
                    current.TeleportData = defaults.voronoiDiagram.polygons();
                    setCurrent("portLabel");
                }
            } else if (current.zoomStage !== "initial") {
                current.PBZoneData = {};
                current.fortData = {};
                current.towerData = {};
                current.portLabelData = {};
                current.dFactor = 0;
                current.highlightId = null;
                current.TeleportData = defaults.voronoiDiagram.polygons();
                setCurrent("initial");
            }
        }

        //updateMap();
        // console.log(`zoomed d3.event.transform: ${JSON.stringify(d3.event.transform)}`);
        displayCountries(d3.event.transform);

        mainGVoronoi.attr("transform", d3.event.transform);
        mainGPort.attr("transform", d3.event.transform);
        mainGPBZone.attr("transform", d3.event.transform);
        mainGCoord.attr("transform", d3.event.transform);
    }

    function setup() {
        function stopProp() {
            if (d3.event.defaultPrevented) {
                d3.event.stopPropagation();
            }
        }

        // https://gist.github.com/kobben/5932448
        function setupPath() {
            function affineTransformation(a, b, c, d, tx, ty) {
                return d3.geoTransform({
                    point(x, y) {
                        this.stream.point(a * x + b * y + tx, c * x + d * y + ty);
                    }
                });
            }
            // eslint-disable-next-line prefer-spread
            const flattenArray = arr => [].concat.apply([], arr.map(element => element));
            defaults.xExtent = d3.extent(
                [].concat(
                    defaults.portData.map(d => d.geometry.coordinates[0]),
                    flattenArray(
                        defaults.PBZoneData.features.map(d => [].concat(d.geometry.coordinates.map(p => p[0])))
                    ),
                    flattenArray(defaults.fortData.features.map(d => [].concat(d.geometry.coordinates.map(p => p[0])))),
                    flattenArray(defaults.towerData.features.map(d => [].concat(d.geometry.coordinates.map(p => p[0]))))
                )
            );
            defaults.yExtent = d3.extent(
                [].concat(
                    defaults.portData.map(d => d.geometry.coordinates[1]),
                    flattenArray(
                        defaults.PBZoneData.features.map(d => [].concat(d.geometry.coordinates.map(p => p[1])))
                    ),
                    flattenArray(defaults.fortData.features.map(d => [].concat(d.geometry.coordinates.map(p => p[1])))),
                    flattenArray(defaults.towerData.features.map(d => [].concat(d.geometry.coordinates.map(p => p[1]))))
                )
            );
            defaults.dataWidth = defaults.xExtent[1] - defaults.xExtent[0];
            defaults.dataHeight = defaults.yExtent[1] - defaults.yExtent[0];

            defaults.path = d3
                .geoPath()
                .projection(
                    affineTransformation(
                        defaults.minScale,
                        0,
                        0,
                        defaults.minScale,
                        defaults.dataWidth / 2 * defaults.minScale,
                        -defaults.dataHeight / 2 * defaults.minScale
                    )
                );
        }

        function setupCanvas() {
            naCanvas = d3
                .select("#na")
                .append("canvas")
                .attr("width", defaults.width)
                .attr("height", defaults.height)
                .style("position", "absolute")
                .style("top", `${defaults.margin.top}px`)
                .style("left", `${defaults.margin.left}px`)
                .on("click", stopProp, true);
            naContext = naCanvas.node().getContext("2d");

            defaults.image.onload = () => {
                initialZoomAndPan();
            };
            defaults.image.src = defaults.imageSrc;
        }

        function setupSvg() {
            const zoomPadding = defaults.coord.max / 50;
            naZoom = d3
                .zoom()
                .scaleExtent([defaults.minScale, defaults.maxScale])
                .translateExtent([
                    [defaults.coord.min - zoomPadding, defaults.coord.min - zoomPadding],
                    [defaults.coord.max + zoomPadding, defaults.coord.max + zoomPadding]
                ])
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
                .attr("id", "arrow")
                .attr("viewBox", "0 -5 10 10")
                .attr("refX", 5)
                .attr("refY", 0)
                .attr("markerWidth", 4)
                .attr("markerHeight", 4)
                .attr("orient", "auto")
                .append("path")
                .attr("d", "M0,-5L10,0L0,5")
                .attr("class", "arrow-head");

            mainGVoronoi = naSvg.append("g").attr("class", "voronoi");
            mainGPort = naSvg.append("g").attr("class", "port");
            mainGPBZone = naSvg.append("g").attr("class", "pb");
            pbZones = mainGPBZone.append("path").classed("pb-zone", true);
            towers = mainGPBZone.append("path").classed("tower", true);
            forts = mainGPBZone.append("path").classed("fort", true);
            mainGCoord = naSvg.append("g").attr("class", "coord");
        }

        function setupPorts() {
            defaults.portLabelData = defaults.portData.map(d => ({
                id: d.id,
                coord: { x: d.geometry.coordinates[0], y: d.geometry.coordinates[1] },
                name: d.properties.name,
                dx: d.properties.dx,
                dy: d.properties.dy
            }));

            defaults.nations.map(d => d.id).forEach(nation => {
                svgDef
                    .append("pattern")
                    .attr("id", nation)
                    .attr("width", "100%")
                    .attr("height", "100%")
                    .attr("viewBox", `0 0 ${defaults.iconSize} ${defaults.iconSize}`)
                    .append("image")
                    .attr("height", defaults.iconSize)
                    .attr("width", defaults.iconSize)
                    .attr("href", `icons/${nation}.svg`);
                svgDef
                    .append("pattern")
                    .attr("id", `${nation}a`)
                    .attr("width", "100%")
                    .attr("height", "100%")
                    .attr("viewBox", `0 0 ${defaults.iconSize} ${defaults.iconSize}`)
                    .append("image")
                    .attr("height", defaults.iconSize)
                    .attr("width", defaults.iconSize)
                    .attr("href", `icons/${nation}a.svg`);
            });
        }

        function setupTeleportAreas() {
            // Extract port coordinates
            const teleportPorts = defaults.portData
                // Use only ports that deep water ports and not a county capital
                .filter(d => !d.properties.shallow && !d.properties.countyCapital)
                // Map to coordinates array
                .map(d => ({
                    id: d.id,
                    coord: { x: d.geometry.coordinates[0], y: d.geometry.coordinates[1] }
                }));

            defaults.voronoiDiagram = d3
                .voronoi()
                .extent(defaults.coord.voronoi)
                .x(d => d.coord.x)
                .y(d => d.coord.y)(teleportPorts);
        }

        function setupSelects() {
            function setupPortSelect() {
                const portNames = $("#port-names");
                const selectPorts = defaults.portData
                    .map(d => ({
                        coord: [d.geometry.coordinates[0], d.geometry.coordinates[1]],
                        name: d.properties.name
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
                portNames.append(
                    $("<option>", {
                        value: 0,
                        text: "Go to a port"
                    })
                );
                selectPorts.forEach(port => {
                    portNames.append(
                        $("<option>", {
                            value: port.coord,
                            text: port.name
                        })
                    );
                });
            }

            function setupGoodSelect() {
                const goodNames = $("#good-names");
                let selectGoods = new Map();
                const goodsPerPort = defaults.portData.map(d => {
                    let goods = d.properties.drops;
                    goods += d.properties.produces ? `,${d.properties.produces}` : "";
                    return {
                        id: d.id,
                        goods
                    };
                });

                goodsPerPort.forEach(port => {
                    port.goods.split(",").forEach(good => {
                        if (good) {
                            const ports = new Set(selectGoods.get(good)).add(port.id);
                            selectGoods.set(good, ports);
                        }
                    });
                });
                selectGoods = new Map(Array.from(selectGoods).sort());
                goodNames.append(
                    $("<option>", {
                        value: 0,
                        text: "Select a good"
                    })
                );
                // eslint-disable-next-line no-restricted-syntax
                for (const [key, portIds] of selectGoods.entries()) {
                    let ids = "";
                    // eslint-disable-next-line no-restricted-syntax
                    for (const id of portIds) {
                        ids += `,${id}`;
                    }
                    goodNames.append(
                        $("<option>", {
                            value: ids.substr(1),
                            text: key
                        })
                    );
                }
            }

            function goToPort(coord) {
                const c = coord.split(","),
                    x = +c[0],
                    y = +c[1];

                current.portCoord = [x, y];
                zoomAndPan(x, y, 2);
            }

            setupPortSelect();
            $("#port-names").on("change", () => {
                const value = $("#port-names").val();
                if (value !== 0) {
                    goToPort(value);
                } else {
                    current.portCoord = defaults.portCoord;
                    initialZoomAndPan();
                }
            });
            setupGoodSelect();
            $("#good-names").on("change", () => {
                const portIds = $("#good-names")
                    .val()
                    .split(",");
                if (portIds.includes("0")) {
                    current.portData = defaults.portData;
                } else {
                    current.portData = defaults.portData.filter(d => portIds.includes(d.id));
                }
                updatePorts();
            });
        }

        function setupClanSelect() {
            const propClan = $("#prop-clan");

            propClan.empty();
            propClan.append(
                $("<option>", {
                    value: 0,
                    text: "Select a clan"
                })
            );

            const clanList = new Set();
            current.portData.filter(d => d.properties.capturer).map(d => clanList.add(d.properties.capturer));
            Array.from(clanList)
                .sort()
                .forEach(clan => {
                    propClan.append(
                        $("<option>", {
                            value: clan,
                            text: clan
                        })
                    );
                });
        }

        function clanSelect() {
            const clan = $("#prop-clan").val();

            if (+clan !== 0) {
                current.portData = defaults.portData.filter(d => clan === d.properties.capturer);
            } else if (current.nation) {
                current.portData = defaults.portData.filter(d => current.nation === d.properties.nation);
            } else {
                current.portData = defaults.portData;
            }
            $("#propertyDropdown").dropdown("toggle");
            updatePorts();
        }

        function setupPropertyMenu() {
            function setupNationSelect() {
                const propNation = $("#prop-nation");

                propNation.append(
                    $("<option>", {
                        value: 0,
                        text: "Select a nation"
                    })
                );
                defaults.nations
                    .sort((a, b) => {
                        if (a.sortName < b.sortName) {
                            return -1;
                        }
                        if (a.sortName > b.sortName) {
                            return 1;
                        }
                        return 0;
                    })
                    .forEach(nation => {
                        propNation.append(
                            $("<option>", {
                                value: nation.id,
                                text: nation.name
                            })
                        );
                    });
            }

            function nationSelect() {
                const nationId = $("#prop-nation").val();

                if (+nationId !== 0) {
                    current.nation = nationId;
                    current.portData = defaults.portData.filter(d => nationId === d.properties.nation);
                    setupClanSelect();
                } else {
                    current.nation = "";
                    current.portData = defaults.portData;
                    setupClanSelect();
                }
                $("#propertyDropdown").dropdown("toggle");
                updatePorts();
            }

            function allSelect() {
                current.portData = defaults.portData.filter(d => d.properties.availableForAll);
                updatePorts();
            }

            function filterCaptured(begin, end) {
                current.portData = defaults.portData.filter(d =>
                    moment(d.properties.lastPortBattle).isBetween(begin, end, null, "()")
                );
                updatePorts();
            }

            function capturedYesterday() {
                const begin = moment({ hour: 11, minute: 0 }).subtract(1, "day"),
                    end = moment({ hour: 8, minute: 0 });
                filterCaptured(begin, end);
            }

            function capturedThisWeek() {
                const begin = moment({ hour: 11, minute: 0 }).day(-6), // this Monday
                    end = moment({ hour: 8, minute: 0 }).day(1); // next Monday
                filterCaptured(begin, end);
            }

            function capturedLastWeek() {
                const begin = moment({ hour: 11, minute: 0 }).day(-13), // Monday last week
                    end = moment({ hour: 8, minute: 0 }).day(-6); // this Monday
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
                current.portData
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
                    current.portData = defaults.portData.filter(d => value === d.properties.conquestMarksPension);
                } else {
                    current.portData = defaults.portData;
                }
                $("#propertyDropdown").dropdown("toggle");
                updatePorts();
            }

            setupNationSelect();
            $("#prop-nation")
                .on("click", event => event.stopPropagation())
                .on("change", () => nationSelect());
            setupClanSelect();
            $("#prop-clan")
                .on("click", event => event.stopPropagation())
                .on("change", () => clanSelect());
            $("#menu-prop-all").on("click", () => allSelect());

            $("#menu-prop-yesterday").on("click", () => capturedYesterday());
            $("#menu-prop-this-week").on("click", () => capturedThisWeek());
            $("#menu-prop-last-week").on("click", () => capturedLastWeek());

            setupCMSelect();
            $("#prop-cm")
                .on("click", event => event.stopPropagation())
                .on("change", () => CMSelect());
        }

        setupPath();
        setupCanvas();
        setupSvg();
        setupPorts();
        setupTeleportAreas();
        setupSelects();
        setupPropertyMenu();
        moment.locale("en-gb");
    }

    function predictWind(currentUserWind, predictUserTime) {
        function compassToDegrees(compass) {
            const degree = 360 / defaults.compassDirections.length;
            return defaults.compassDirections.indexOf(compass) * degree;
        }

        function printPredictedWind(predictedWindDegrees, predictTime, currentWind, currentTime) {
            const targetScale = 2,
                x = current.portCoord[0],
                y = current.portCoord[1],
                xCompass = x - defaults.width / 8 / targetScale,
                yCompass = y - defaults.height / 8 / targetScale;

            function printWindLine() {
                const length = 40,
                    radians = Math.PI / 180 * (predictedWindDegrees - 90),
                    dx = length * Math.cos(radians),
                    dy = length * Math.sin(radians),
                    compass = degreesToCompass(predictedWindDegrees),
                    compassSize = 30;

                current.lineData = [];
                current.lineData.push([Math.round(xCompass + dx / 2), Math.round(yCompass + dy / 2)]);
                current.lineData.push([Math.round(xCompass - dx / 2), Math.round(yCompass - dy / 2)]);

                gCompass
                    .datum(current.lineData)
                    .attr("d", defaults.line)
                    .attr("class", "wind")
                    .attr("marker-end", "url(#arrow)");

                const rect = mainGCoord.append("rect");
                const svg = mainGCoord.append("svg");
                const text1 = svg
                    .append("text")
                    .attr("x", "50%")
                    .attr("y", "33%")
                    .attr("class", "wind-text")
                    .text(`From ${compass} at ${predictTime}`);
                const text2 = svg
                    .append("text")
                    .attr("x", "50%")
                    .attr("y", "66%")
                    .attr("class", "wind-text-current")
                    .text(`Currently at ${currentTime} from ${currentWind}`);
                const bbox1 = text1.node().getBoundingClientRect(),
                    bbox2 = text2.node().getBoundingClientRect(),
                    height = (Math.max(bbox1.height, bbox2.height) * 2 + defaults.fontSize.portLabel) / targetScale,
                    width = (Math.max(bbox1.width, bbox2.width) + defaults.fontSize.portLabel) / targetScale;
                svg
                    .attr("x", xCompass - width / 2)
                    .attr("y", yCompass + 20)
                    .attr("height", height)
                    .attr("width", width);
                rect
                    .attr("x", xCompass - width / 2)
                    .attr("y", yCompass + 20 - (height + compassSize))
                    .attr("height", height + compassSize * 2)
                    .attr("width", width);
            }

            clearMap();
            zoomAndPan(x, y, targetScale);
            plotCourse(xCompass, yCompass, targetScale, "wind");
            printWindLine();
        }

        const secondsForFullCircle = 48 * 60,
            fullCircle = 360,
            degreesPerSecond = fullCircle / secondsForFullCircle;
        let currentWindDegrees;

        const regex = /(\d+)[\s:.](\d+)/,
            match = regex.exec(predictUserTime),
            predictHours = parseInt(match[1], 10),
            predictMinutes = parseInt(match[2], 10);

        // Set current wind in degrees
        if (Number.isNaN(Number(currentUserWind))) {
            currentWindDegrees = compassToDegrees(currentUserWind);
        } else {
            currentWindDegrees = +currentUserWind;
        }

        const currentDate = moment()
                .utc()
                .seconds(0)
                .milliseconds(0),
            predictDate = moment(currentDate)
                .hour(predictHours)
                .minutes(predictMinutes);
        if (predictDate.isBefore(currentDate)) {
            predictDate.add(1, "day");
        }

        const timeDiffInSec = predictDate.diff(currentDate, "seconds");
        const predictedWindDegrees = Math.abs(currentWindDegrees - degreesPerSecond * timeDiffInSec + 360) % 360;

        // console.log(`currentUserWind: ${currentUserWind} currentWindDegrees: ${currentWindDegrees}`);
        // console.log(`   currentDate: ${currentDate.format()} predictDate: ${predictDate.format()}`);
        // console.log(`   predictedWindDegrees: ${predictedWindDegrees} predictUserTime: ${predictUserTime}`);
        printPredictedWind(
            predictedWindDegrees,
            predictDate.format("H.mm"),
            currentUserWind,
            currentDate.format("H.mm")
        );
    }

    function naReady(error, naMapJsonData, pbZonesJsonData) {
        if (error) {
            throw error;
        }

        // Read map data
        defaults.portData = topojsonFeature(naMapJsonData, naMapJsonData.objects.ports).features;
        current.portData = defaults.portData;
        defaults.PBZoneData = topojsonFeature(pbZonesJsonData, pbZonesJsonData.objects.pbZones);
        defaults.fortData = topojsonFeature(pbZonesJsonData, pbZonesJsonData.objects.forts);
        defaults.towerData = topojsonFeature(pbZonesJsonData, pbZonesJsonData.objects.towers);

        setup();

        // updatePorts(current.portData.filter(d => ["234", "237", "238", "239", "240"].includes(d.id)));

        /*
        let predictTime = moment().utc(),
            direction = "nne".toUpperCase();
        console.log(`---->   predictTime: ${predictTime.format()}`);
        predictWind(direction, `${predictTime.hours()}:${predictTime.minutes()}`);
        predictTime.add(48 / 4, "minutes");
        console.log(`---->   predictTime: ${predictTime.format()}`);
        predictWind(direction, `${predictTime.hours()}:${predictTime.minutes()}`);
        */

        // https://stackoverflow.com/questions/22581345/click-button-copy-to-clipboard-using-jquery
        function copyF11ToClipboard(F11coord) {
            const temp = $("<input>");

            $("body").append(temp);
            temp.val(F11coord).select();
            document.execCommand("copy");
            temp.remove();
        }

        function pasteF11FromClipboard(e) {
            function addF11StringToInput(F11String) {
                const regex = /F11 coordinates X: ([-+]?[0-9]*\.?[0-9]+) Z: ([-+]?[0-9]*\.?[0-9]+)/g,
                    match = regex.exec(F11String);

                if (match && !Number.isNaN(+match[1]) && !Number.isNaN(+match[2])) {
                    const x = +match[1],
                        z = +match[2];
                    if (!Number.isNaN(x) && !Number.isNaN(z)) {
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

        $("#copy-coord").click(() => {
            const x = $("#x-coord").val(),
                z = $("#z-coord").val();

            if (!Number.isNaN(x) && !Number.isNaN(z)) {
                const F11String = `F11 coordinates X: ${x} Z: ${z}`;
                copyF11ToClipboard(F11String);
            }
        });

        document.addEventListener("paste", event => {
            pasteF11FromClipboard(event);
            event.preventDefault();
        });

        $("#f11").submit(event => {
            const x = $("#x-coord").val(),
                z = $("#z-coord").val();
            goToF11(x, z);
            event.preventDefault();
        });

        $("#direction").knob({
            bgColor: "#ede1d2", // primary-200
            thickness: 0.2,
            min: 0,
            max: 359,
            step: 360 / defaults.compassDirections.length,
            cursor: true,
            fgColor: "#917f68", // primary-700
            draw() {
                $(this.i).css("class", "knob");
            },
            format: input => degreesToCompass(input)
        });

        $("#windPrediction").submit(event => {
            const currentWind = $("#direction")
                    .val()
                    .toUpperCase(),
                time = $("#time").val();

            predictWind(currentWind, time);
            $("#predictDropdown").dropdown("toggle");
            event.preventDefault();
        });

        $("#reset").on("click", () => {
            clearMap();
        });

        $(".radio-group").change(() => {
            current.radioButton = $("input[name='mouseFunction']:checked").val();
            clearMap();
        });
    }

    d3
        .queue()
        .defer(d3.json, defaults.mapJson)
        .defer(d3.json, defaults.pbJson)
        .await(naReady);
}

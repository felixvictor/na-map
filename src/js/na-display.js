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
import "round-slider/src/roundslider";
import "tempusdominus-bootstrap-4/build/js/tempusdominus-bootstrap-4";
import "bootstrap-hardskilled-extend-select";

import "bootstrap/js/dist/tooltip";
import "bootstrap/js/dist/util";

export default function naDisplay(serverName) {
    let naSvg,
        naCanvas,
        naContext,
        svgDef,
        naZoom,
        mainGPort,
        mainGText,
        mainGPBZone,
        pbZones,
        towers,
        forts,
        mainGVoronoi,
        mainGCoord,
        gCompass,
        svgWind;
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
        port: { id: "366", coord: { x: 4396, y: 2494 } }, // Shroud Cay
        maxScale: 10,
        fontSize: { initial: 30, portLabel: 18, pbZone: 7 },
        circleSize: { initial: 50, portLabel: 20, pbZone: 5 },
        iconSize: 50,
        PBZoneZoomScale: 1.5,
        labelZoomScale: 0.5,
        highlightDuration: 200,
        mapJson: `${serverName}.json`,
        pbJson: "pb.json",
        shipJson: "ships.json",
        image: new Image(),
        imageSrc: "images/na-map.jpg",
        line: d3.line(),
        shipSvgWidth: 350,
        shipSvgHeight: 350,
        numSegments: 25,
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
    defaults.width = Math.floor(top.innerWidth - defaults.margin.left - defaults.margin.right);
    // eslint-disable-next-line no-restricted-globals
    defaults.height = Math.floor(top.innerHeight - defaults.margin.top - defaults.margin.bottom);
    defaults.minScale = Math.min(defaults.width / defaults.coord.max, defaults.height / defaults.coord.max);
    defaults.coord.voronoi = [
        [defaults.coord.min - 1, defaults.coord.min - 1],
        [defaults.coord.max + 1, defaults.coord.max + 1]
    ];
    // limit how far away the mouse can be from finding a voronoi site
    defaults.voronoiRadius = Math.max(defaults.height, defaults.width);
    defaults.segmentRadians = 2 * Math.PI / defaults.numSegments;

    const current = {
        port: { id: defaults.port.id, coord: defaults.port.coord },
        fontSize: defaults.fontSize.initial,
        circleSize: defaults.circleSize.initial,
        bFirstCoord: true,
        radioButton: "compass",
        lineData: [],
        shipAData: {},
        shipBData: {},
        nation: "",
        showTeleportAreas: false
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
        naContext.save();
        naContext.clearRect(0, 0, defaults.width, defaults.height);
        naContext.translate(transform.x, transform.y);
        naContext.scale(transform.k * defaults.imageScaleFactor, transform.k * defaults.imageScaleFactor);
        naContext.drawImage(defaults.image, 0, 0);
        naContext.getImageData(0, 0, defaults.width, defaults.height);
        naContext.restore();

        /*
        const transform = d3.zoomIdentity
            .scale(scale)
            .translate(-x + defaults.width / 2 / scale, -y + defaults.height / 2 / scale);
        */
        /*
        const sx = -transform.x,
            sy = -transform.y ,
            sWidth = defaults.width / transform.k,
            sHeight = defaults.height / transform.k,
            dx = defaults.coord.min+transform.x,
            dy = defaults.coord.min+ transform.y,
            dWidth = defaults.width+ defaults.width / 2,
            dHeight = defaults.height+ defaults.height / 2;
        naContext.drawImage(defaults.image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
        console.log(sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
        */
    }

    function updatePortCirclePosition() {
        mainGPort
            .selectAll("circle")
            .attr("r", d => (d.id === current.highlightId ? current.circleSize * 3 : current.circleSize));
    }

    function updatePortCircles(portData) {
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
            if (d.producesTrading.length || d.producesNonTrading.length) {
                h += "<tr><td>Produces</td><td>";
                if (d.producesNonTrading.length) {
                    h += `<span class="non-trading">${d.producesNonTrading.join(", ")}</span>`;
                    if (d.producesTrading.length) {
                        h += "<br>";
                    }
                }
                if (d.producesTrading.length) {
                    h += `${d.producesTrading.join(", ")}`;
                }
                h += "</td></tr>";
            }
            if (d.dropsTrading.length || d.dropsNonTrading.length) {
                h += "<tr><td>Drops</td><td>";
                if (d.dropsNonTrading.length) {
                    h += `<span class="non-trading">${d.dropsNonTrading.join(", ")}</span>`;
                    if (d.dropsTrading.length) {
                        h += "<br>";
                    }
                }
                if (d.dropsTrading.length) {
                    h += `${d.dropsTrading.join(", ")}`;
                }
                h += "</td></tr>";
            }
            if (d.consumesTrading.length || d.consumesNonTrading.length) {
                h += "<tr><td>Consumes</td><td>";
                if (d.consumesNonTrading.length) {
                    h += `<span class="non-trading">${d.consumesNonTrading.join(", ")}</span>`;
                    if (d.consumesTrading.length) {
                        h += "<br>";
                    }
                }
                if (d.consumesTrading.length) {
                    h += `${d.consumesTrading.join(", ")}`;
                }
                h += "</td></tr>";
            }
            h += "</table>";

            return h;
        }

        function showPortDetails(d, i, nodes) {
            const port = d3.select(nodes[i]);

            port.attr("data-toggle", "tooltip");
            // eslint-disable-next-line no-underscore-dangle
            $(port._groups[0])
                .tooltip({
                    delay: { show: defaults.highlightDuration, hide: defaults.highlightDuration },
                    html: true,
                    placement: "auto",
                    title: naTooltipData(d.properties),
                    trigger: "manual"
                })
                .tooltip("show");
        }

        function hidePortDetails(d, i, nodes) {
            // eslint-disable-next-line no-underscore-dangle
            $(d3.select(nodes[i])._groups[0]).tooltip("hide");
        }

        // Data join
        const circleUpdate = mainGPort.selectAll("circle").data(portData, d => d.id);

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
            .attr(
                "fill",
                d => `url(#${d.properties.availableForAll ? `${d.properties.nation}a` : d.properties.nation})`
            )
            .on("click", showPortDetails)
            .on("mouseout", hidePortDetails);

        // Apply to both old and new
        // circleUpdate.merge(circleEnter); // not needed

        updatePortCirclePosition();
    }

    function updatePortTextPositions() {
        if (current.zoomLevel === "initial") {
            mainGText.attr("display", "none");
        } else {
            mainGText.attr("display", "inherit");

            const deltaY = current.circleSize + current.fontSize,
                deltaY2 = deltaY * 2;

            mainGText
                .selectAll("text")
                .text(d => d.properties.name)
                .attr("x", d => {
                    if (current.zoomLevel !== "pbZone") {
                        return d.geometry.coordinates[0];
                    }
                    return current.showPBZones && d.id === current.port.id
                        ? d.geometry.coordinates[0] + d.properties.dx
                        : d.geometry.coordinates[0];
                })
                .attr("y", d => {
                    if (current.zoomLevel !== "pbZone") {
                        return d.id === current.highlightId
                            ? d.geometry.coordinates[1] + deltaY2
                            : d.geometry.coordinates[1] + deltaY;
                    }
                    return current.showPBZones && d.id === current.port.id
                        ? d.geometry.coordinates[1] + d.properties.dy
                        : d.geometry.coordinates[1] + deltaY;
                })
                .attr(
                    "font-size",
                    d => (d.id === current.highlightId ? `${current.fontSize * 2}px` : `${current.fontSize}px`)
                )
                .attr("text-anchor", d => {
                    if (current.showPBZones && current.zoomLevel === "pbZone" && d.id === current.port.id) {
                        return d.properties.dx < 0 ? "end" : "start";
                    }
                    return "middle";
                });
        }
    }

    function updatePortTexts(portData) {
        // Data join
        const textUpdate = mainGText.selectAll("text").data(portData, d => d.id);

        // Remove old text
        textUpdate.exit().remove();

        // Update kept texts
        // textUpdate; // not needed

        // Add new texts
        textUpdate.enter().append("text");

        // Apply to both old and new
        // textUpdate.merge(textEnter); // not needed

        updatePortTextPositions();
    }

    function updatePorts(portData) {
        updatePortCircles(portData);
        updatePortTexts(portData);
    }

    function updateTeleportAreas(highlightId) {
        let teleportData = {};

        function mouseover(d, i, nodes) {
            const ref = d3.mouse(nodes[i]),
                mx = ref[0],
                my = ref[1];

            // use the new diagram.find() function to find the voronoi site closest to
            // the mouse, limited by max distance defined by defaults.voronoiRadius
            const site = defaults.voronoiDiagram.find(mx, my, defaults.voronoiRadius);
            if (site) {
                updateTeleportAreas(site.data.id);
                updatePortCirclePosition();
                updatePortTextPositions();
            }
        }

        function setTeleportData() {
            if (current.showTeleportAreas && current.zoomLevel !== "pbZone") {
                teleportData = defaults.voronoiDiagram.polygons();
            }
        }

        if (!highlightId) {
            setTeleportData();
        }
        current.highlightId = highlightId;

        // Data join
        const pathUpdate = mainGVoronoi.selectAll("path").data(teleportData, d => d.data.id);

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
        function resetPorts() {
            const portData = JSON.parse(JSON.stringify(defaults.portData));
            updatePorts(portData);
        }

        mainGCoord.selectAll("*").remove();
        svgWind.selectAll("*").remove();
        current.bFirstCoord = true;
        current.lineData.splice(0, current.lineData.length);
        resetPorts();
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
        let PBZoneData = {},
            fortData = {},
            towerData = {};

        function setPBZoneData() {
            if (current.showPBZones && current.zoomLevel === "pbZone") {
                PBZoneData = {
                    type: "FeatureCollection",
                    features: defaults.PBZoneData.features.filter(d => d.id === current.port.id).map(d => ({
                        type: "Feature",
                        id: d.id,
                        geometry: d.geometry
                    }))
                };
                fortData = {
                    type: "FeatureCollection",
                    features: defaults.fortData.features.filter(d => d.id === current.port.id).map(d => ({
                        type: "Feature",
                        id: d.id,
                        geometry: d.geometry
                    }))
                };
                towerData = {
                    type: "FeatureCollection",
                    features: defaults.towerData.features.filter(d => d.id === current.port.id).map(d => ({
                        type: "Feature",
                        id: d.id,
                        geometry: d.geometry
                    }))
                };
            }
        }

        setPBZoneData();
        pbZones.datum(PBZoneData).attr("d", d3.geoPath().pointRadius(4));
        towers.datum(towerData).attr("d", d3.geoPath().pointRadius(1.5));
        forts.datum(fortData).attr("d", d3.geoPath().pointRadius(2));
    }

    function updateMap() {
        function setCurrent() {
            current.circleSize = defaults.circleSize[current.zoomLevel];
            current.fontSize = defaults.fontSize[current.zoomLevel];

            updatePBZones();
            updateTeleportAreas(null);
            updatePortCirclePosition();
            updatePortTextPositions();
        }

        if (d3.event.transform.k > defaults.PBZoneZoomScale) {
            if (current.zoomLevel !== "pbZone") {
                current.zoomLevel = "pbZone";
                setCurrent();
            }
        } else if (d3.event.transform.k > defaults.labelZoomScale) {
            if (current.zoomLevel !== "portLabel") {
                current.zoomLevel = "portLabel";
                setCurrent();
            }
        } else if (current.zoomLevel !== "initial") {
            current.zoomLevel = "initial";
            setCurrent();
        }
    }

    function naZoomed() {
        updateMap();
        // console.log(`zoomed d3.event.transform: ${JSON.stringify(d3.event.transform)}`);
        displayCountries(d3.event.transform);

        mainGVoronoi.attr("transform", d3.event.transform);
        mainGPort.attr("transform", d3.event.transform);
        mainGPBZone.attr("transform", d3.event.transform);
        mainGCoord.attr("transform", d3.event.transform);
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
                naContext.mozImageSmoothingEnabled = false;
                naContext.webkitImageSmoothingEnabled = false;
                naContext.msImageSmoothingEnabled = false;
                naContext.imageSmoothingEnabled = false;
                defaults.imageScaleFactor = defaults.coord.max / defaults.image.height;
                clearMap();
                initialZoomAndPan();
            };
            defaults.image.src = defaults.imageSrc;
        }

        function setupSvg() {
            naZoom = d3
                .zoom()
                .scaleExtent([defaults.minScale, defaults.maxScale])
                .translateExtent([[defaults.coord.min, defaults.coord.min], [defaults.coord.max, defaults.coord.max]])
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
            mainGVoronoi = naSvg.append("g").classed("voronoi", true);
            mainGPort = naSvg.append("g").classed("port", true);
            mainGText = mainGPort.append("g");
            mainGPBZone = naSvg.append("g").classed("pb", true);
            pbZones = mainGPBZone.append("path").classed("pb-zone", true);
            towers = mainGPBZone.append("path").classed("tower", true);
            forts = mainGPBZone.append("path").classed("fort", true);
            mainGCoord = naSvg.append("g").classed("coord", true);
            svgWind = d3
                .select("body")
                .append("div")
                .attr("id", "wind")
                .append("svg")
                .style("position", "absolute")
                .style("top", `${defaults.margin.top}px`)
                .style("left", `${defaults.margin.left}px`)
                .classed("coord", true);
        }

        function setupPorts() {
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
                        id: d.id,
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

                const select = `<option value="" data-id="0">Reset</option>${selectPorts
                    .map(port => `<option value="${port.coord}" data-id="${port.id}">${port.name}</option>`)
                    .join("")}`;
                portNames.append(select);
            }

            function setupGoodSelect() {
                const goodNames = $("#good-names");
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
                            const ports = new Set(selectGoods.get(good)).add(port.id);
                            selectGoods.set(good, ports);
                        }
                    });
                });
                selectGoods = new Map(Array.from(selectGoods).sort());
                let select = '<option value="0">Reset</option>';
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
                    updatePBZones();
                    updatePortTextPositions();
                }
                goToPort();
            }

            function goodSelected() {
                const portIds = $(this)
                    .val()
                    .split(",");
                const portData = portIds.includes("0")
                    ? JSON.parse(JSON.stringify(defaults.portData))
                    : defaults.portData.filter(d => portIds.includes(d.id));
                updatePorts(portData);
            }

            setupPortSelect();
            $("#port-names")
                .on("change", portSelected)
                .prop("selectedIndex", -1)
                .extendSelect({
                    // Search input placeholder:
                    search: "Find",
                    // Title if option not selected:
                    notSelectedTitle: "Go to a port",
                    // Message if select list empty:
                    empty: "Not found"
                });

            setupGoodSelect();
            $("#good-names")
                .on("change", goodSelected)
                .prop("selectedIndex", -1)
                .extendSelect({
                    // Search input placeholder:
                    search: "Find",
                    // Title if option not selected:
                    notSelectedTitle: "Select a good",
                    // Message if select list empty:
                    empty: "Not found"
                });
        }

        function setupClanSelect() {
            const propClan = $("#prop-clan");

            propClan.empty();

            const clanList = new Set();
            defaults.portData.filter(d => d.properties.capturer).forEach(d => clanList.add(d.properties.capturer));
            const select = `<option value="0">Select a clan/Reset</option>${Array.from(clanList)
                .sort()
                .map(clan => `<option value="${clan}">${clan}</option>`)
                .join("")}`;
            propClan.append(select);
        }

        function clanSelected() {
            const clan = $("#prop-clan").val();
            let portData = {};
            if (+clan !== 0) {
                portData = defaults.portData.filter(d => clan === d.properties.capturer);
            } else if (current.nation) {
                portData = defaults.portData.filter(d => current.nation === d.properties.nation);
            } else {
                portData = JSON.parse(JSON.stringify(defaults.portData));
            }
            $("#propertyDropdown").dropdown("toggle");
            updatePorts(portData);
        }

        function setupPropertyMenu() {
            const dateFormat = "dd YYYY-MM-DD",
                timeFormat = "HH:00";

            function setupNationSelect() {
                const propNation = $("#prop-nation");
                const select = `<option value="0">Select a nation/Reset</option>${defaults.nations
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
                let portData = {};

                if (+nationId !== 0) {
                    current.nation = nationId;
                    portData = defaults.portData.filter(d => nationId === d.properties.nation);
                    setupClanSelect();
                } else {
                    current.nation = "";
                    portData = JSON.parse(JSON.stringify(defaults.portData));
                    setupClanSelect();
                }
                $("#propertyDropdown").dropdown("toggle");
                updatePorts(portData);
            }

            function allSelect() {
                const portData = defaults.portData.filter(d => d.properties.availableForAll);
                updatePorts(portData);
            }

            function greenZoneSelect() {
                const portData = defaults.portData.filter(
                    d => d.properties.nonCapturable && d.properties.nation !== "FT"
                );
                updatePorts(portData);
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

                const portData = defaults.portData.filter(
                    d =>
                        !d.properties.nonCapturable &&
                        d.properties.nation !== "FT" &&
                        startTimes.has(d.properties.portBattleStartTime)
                );
                updatePorts(portData);
            }

            function filterCaptured(begin, end) {
                console.log(
                    "Between %s and %s",
                    begin.format("dddd D MMMM YYYY h:mm"),
                    end.format("dddd D MMMM YYYY h:mm")
                );
                const portData = defaults.portData.filter(d =>
                    moment(d.properties.lastPortBattle).isBetween(begin, end, null, "(]")
                );
                updatePorts(portData);
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
                defaults.portData
                    .filter(d => d.properties.capturer)
                    .forEach(d => cmList.add(d.properties.conquestMarksPension));
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

                const portData =
                    value !== 0
                        ? defaults.portData.filter(d => value === d.properties.conquestMarksPension)
                        : JSON.parse(JSON.stringify(defaults.portData));
                $("#propertyDropdown").dropdown("toggle");
                updatePorts(portData);
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
            function setupWindPrediction() {
                function predictWind(currentUserWind, predictUserTime) {
                    function compassToDegrees(compass) {
                        const degree = 360 / defaults.compassDirections.length;
                        return defaults.compassDirections.indexOf(compass) * degree;
                    }

                    function printPredictedWind(predictedWindDegrees, predictTime, currentWind, currentTime) {
                        const compassSize = 100,
                            height = 300,
                            width = 300,
                            xCompass = width / 2,
                            yCompass = height / 3;
                        const targetScale = 2,
                            { x } = current.port.coord,
                            { y } = current.port.coord;

                        function printWindLine() {
                            const length = compassSize * 1.3,
                                radians = Math.PI / 180 * (predictedWindDegrees - 90),
                                dx = length * Math.cos(radians),
                                dy = length * Math.sin(radians),
                                compass = degreesToCompass(predictedWindDegrees);

                            current.lineData = [];
                            current.lineData.push([Math.round(xCompass + dx / 2), Math.round(yCompass + dy / 2)]);
                            current.lineData.push([Math.round(xCompass - dx / 2), Math.round(yCompass - dy / 2)]);

                            svgWind.attr("height", height).attr("width", width);
                            const rect = svgWind.append("rect");
                            svgWind
                                .append("image")
                                .classed("compass", true)
                                .attr("x", xCompass - compassSize / 2)
                                .attr("y", yCompass - compassSize / 2)
                                .attr("height", compassSize)
                                .attr("width", compassSize)
                                .attr("xlink:href", "icons/compass.svg");
                            svgWind
                                .append("path")
                                .datum(current.lineData)
                                .attr("d", defaults.line)
                                .classed("wind", true)
                                .attr("marker-end", "url(#wind-arrow)");

                            const svg = svgWind.append("svg");
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
                                lineHeight = parseInt(
                                    window
                                        .getComputedStyle(document.getElementById("wind"))
                                        .getPropertyValue("line-height"),
                                    10
                                ),
                                textHeight = Math.max(bbox1.height, bbox2.height) * 2 + lineHeight,
                                textWidth = Math.max(bbox1.width, bbox2.width) + lineHeight;
                            svg
                                .attr("x", (width - textWidth) / 2)
                                .attr("y", "60%")
                                .attr("height", textHeight)
                                .attr("width", textWidth);
                            rect
                                .attr("x", 0)
                                .attr("y", 0)
                                .attr("height", height)
                                .attr("width", width);
                        }

                        clearMap();
                        zoomAndPan(x, y, targetScale);
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
                    const predictedWindDegrees =
                        Math.abs(currentWindDegrees - degreesPerSecond * timeDiffInSec + 360) % 360;

                    // console.log(`currentUserWind: ${currentUserWind} currentWindDegrees: ${currentWindDegrees}`);
                    // console.log(`   currentDate: ${currentDate.format()} predictDate: ${predictDate.format()}`);
                    // console.log(`   predictedWindDegrees: ${predictedWindDegrees} predictUserTime: ${predictUserTime}`);
                    printPredictedWind(
                        predictedWindDegrees,
                        predictDate.format("H.mm"),
                        degreesToCompass(currentUserWind),
                        currentDate.format("H.mm")
                    );
                }

                /*
let predictTime = moment().utc(),
    direction = "nne".toUpperCase();
console.log(`---->   predictTime: ${predictTime.format()}`);
predictWind(direction, `${predictTime.hours()}:${predictTime.minutes()}`);
predictTime.add(48 / 4, "minutes");
console.log(`---->   predictTime: ${predictTime.format()}`);
predictWind(direction, `${predictTime.hours()}:${predictTime.minutes()}`);
*/

                $.fn.datetimepicker.Constructor.Default = $.extend({}, $.fn.datetimepicker.Constructor.Default, {
                    icons: {
                        time: "far fa-clock",
                        date: "far fa-calendar",
                        up: "fas fa-arrow-up",
                        down: "fas fa-arrow-down",
                        previous: "fas fa-chevron-left",
                        next: "fas fa-chevron-right",
                        today: "far fa-calendar-check",
                        clear: "fas fa-trash",
                        close: "fas fa-times"
                    },
                    timeZone: "UTC"
                });

                $("#wind-time").datetimepicker({
                    format: "LT"
                });

                // workaround from https://github.com/soundar24/roundSlider/issues/71
                // eslint-disable-next-line func-names,no-underscore-dangle
                const { _getTooltipPos } = $.fn.roundSlider.prototype;
                // eslint-disable-next-line func-names,no-underscore-dangle
                $.fn.roundSlider.prototype._getTooltipPos = function() {
                    if (!this.tooltip.is(":visible")) {
                        $("body").append(this.tooltip);
                    }
                    const pos = _getTooltipPos.call(this);
                    this.container.append(this.tooltip);
                    return pos;
                };

                window.tooltip = args => degreesToCompass(args.value);

                $("#direction").roundSlider({
                    sliderType: "default",
                    handleSize: "+1",
                    startAngle: 90,
                    width: 20,
                    radius: 110,
                    min: 0,
                    max: 359,
                    step: 360 / defaults.compassDirections.length,
                    editableTooltip: false,
                    tooltipFormat: "tooltip",
                    create() {
                        this.control.css("display", "block");
                    }
                });

                $("#windPrediction").submit(event => {
                    const currentWind = $("#direction").roundSlider("option", "value"),
                        time = $("#wind-time-input")
                            .val()
                            .trim();
                    // console.log(`currentWind ${currentWind} time ${time}`);
                    predictWind(currentWind, time);
                    $("#predictDropdown").dropdown("toggle");
                    event.preventDefault();
                });
            }

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

            setupWindPrediction();
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

            $("#show-teleport")
                .on("click", event => event.stopPropagation())
                .on("change", () => {
                    const $input = $("#show-teleport");

                    current.showTeleportAreas = $input.is(":checked");
                    updateTeleportAreas(null);
                });

            $("#show-pb")
                .on("click", event => event.stopPropagation())
                .on("change", () => {
                    const $input = $("#show-pb");

                    current.showPBZones = $input.is(":checked");
                    updatePBZones();
                    updatePortTextPositions();
                });
        }

        setupCanvas();
        setupSvg();
        setupPorts();
        setupTeleportAreas();
        setupSelects();
        setupPropertyMenu();
        setupListener();
        moment.locale("en-gb");
    }

    function shipCompare() {
        function shipSelected(shipId, shipNumber) {
            function isEmpty(obj) {
                return Object.getOwnPropertyNames(obj).length === 0 && obj.constructor === Object;
            }

            function setBackground(svgId) {
                const svg = d3.select(svgId).select("g"),
                    outerRadius = Math.min(defaults.shipSvgWidth, defaults.shipSvgHeight) / 2,
                    innerRadius = 0.3 * outerRadius;

                defaults.colorScale = d3
                    .scaleLinear()
                    .domain([defaults.minSpeed, 0, 10, 12, defaults.maxSpeed])
                    .range(["#a62e39", "#fbf8f5", "#2a6838", "#419f57", "#6cc380"])
                    .interpolate(d3.interpolateHcl);

                defaults.radiusScaleAbsolute = d3
                    .scaleLinear()
                    .domain([defaults.minSpeed, 0, defaults.maxSpeed])
                    .range([10, innerRadius, outerRadius]);

                // Arc for text
                const knotsArc = d3
                    .arc()
                    .outerRadius(d => defaults.radiusScaleAbsolute(d) + 2)
                    .innerRadius(d => defaults.radiusScaleAbsolute(d) + 1)
                    .startAngle(-Math.PI / 2)
                    .endAngle(Math.PI / 2);

                // Tick/Grid data
                const ticks = [12, 8, 4, 0];
                const tickLabels = ["12 knots", "8 knots", "4 knots", "0 knots"];

                // Add the circles for each tick
                svg
                    .selectAll(".circle")
                    .data(ticks)
                    .enter()
                    .append("circle")
                    .attr("class", "knots-circle")
                    .attr("r", d => defaults.radiusScaleAbsolute(d))
                    .attr("id", (d, i) => `tick${i}`);

                // Add the paths for the text
                svg
                    .selectAll(".label")
                    .data(ticks)
                    .enter()
                    .append("path")
                    .attr("d", knotsArc)
                    .attr("id", (d, i) => `tic${i}`);

                // And add the text
                svg
                    .selectAll(".label")
                    .data(ticks)
                    .enter()
                    .append("text")
                    .attr("class", "knots-text")
                    .append("textPath")
                    .attr("xlink:href", (d, i) => `#tic${i}`)
                    .text((d, i) => tickLabels[i])
                    .attr("startOffset", "16%");
            }

            function setBackgroundGradient(svgId) {
                const svg = d3.select(svgId).select("g");

                // Extra scale since the color scale is interpolated
                const gradientScale = d3
                    .scaleLinear()
                    .domain([defaults.minSpeed, defaults.maxSpeed])
                    .range([0, defaults.shipSvgWidth]);

                // Calculate the variables for the gradient
                const numStops = 30;
                const gradientDomain = gradientScale.domain();
                gradientDomain[2] = gradientDomain[1] - gradientDomain[0];
                const gradientPoint = [];
                for (let i = 0; i < numStops; i++) {
                    gradientPoint.push(i * gradientDomain[2] / (numStops - 1) + gradientDomain[0]);
                }

                // Create the gradient
                svg
                    .append("defs")
                    .append("radialGradient")
                    .attr("id", "gradient")
                    .attr("cx", 0.5)
                    .attr("cy", 0.25)
                    .attr("r", 0.5)
                    .selectAll("stop")
                    .data(d3.range(numStops))
                    .enter()
                    .append("stop")
                    .attr("offset", (d, i) => gradientScale(gradientPoint[i]) / defaults.shipSvgWidth)
                    .attr("stop-color", (d, i) => defaults.colorScale(gradientPoint[i]));
            }

            function drawProfile(profileData, svgId) {
                const svg = d3.select(svgId).select("g");
                const pie = d3
                    .pie()
                    .sort(null)
                    .value(1);

                const arcs = pie(profileData.speedDegrees);

                const curve = d3.curveCatmullRomClosed,
                    line = d3
                        .radialLine()
                        .angle((d, i) => i * defaults.segmentRadians)
                        .radius(d => defaults.radiusScaleAbsolute(d.data))
                        .curve(curve);

                const path = svg.append("path");
                const markers = svg.append("g").attr("class", "markers");
                path
                    .attr("d", line(arcs))
                    .attr("stroke-width", "5px")
                    .attr("stroke", "url(#gradient)");

                const sel = markers.selectAll("circle").data(arcs);
                sel
                    .enter()
                    .append("circle")
                    .merge(sel)
                    .attr("r", "5")
                    .attr("cy", (d, i) => Math.cos(i * defaults.segmentRadians) * -defaults.radiusScaleAbsolute(d.data))
                    .attr("cx", (d, i) => Math.sin(i * defaults.segmentRadians) * defaults.radiusScaleAbsolute(d.data))
                    .attr("fill", d => defaults.colorScale(d.data))
                    .style("opacity", 0.5)
                    .append("title")
                    .text(d => `${Math.round(d.data * 10) / 10} knots`);
            }

            function drawDifferenceProfile(svgId) {
                const svg = d3.select(svgId).select("g");

                const colorScale = d3
                    .scaleLinear()
                    .domain(["A", "B"])
                    .range(["#a62e39", "#fbf8f5", "#2a6838", "#419f57", "#6cc380"]);

                const pie = d3
                    .pie()
                    .sort(null)
                    .value(1);
                const arcsA = pie(current.shipAData.speedDegrees),
                    arcsB = pie(current.shipBData.speedDegrees);
                const curve = d3.curveCatmullRomClosed,
                    lineA = d3
                        .radialLine()
                        .angle((d, i) => i * defaults.segmentRadians)
                        .radius(d => defaults.radiusScaleAbsolute(d.data))
                        .curve(curve),
                    lineB = d3
                        .radialLine()
                        .angle((d, i) => i * defaults.segmentRadians)
                        .radius(d => defaults.radiusScaleAbsolute(d.data))
                        .curve(curve);

                const pathA = svg.append("path");
                const pathB = svg.append("path");
                const markersA = svg.append("g").attr("class", "markers");
                const markersB = svg.append("g").attr("class", "markers");

                pathA
                    .transition()
                    .attr("d", lineA(arcsA))
                    .attr("class", "arcs arcsA");

                const selA = markersA.selectAll("circle").data(arcsA);
                selA
                    .enter()
                    .append("circle")
                    .merge(selA)
                    .attr("r", "5")
                    .attr("cy", (d, i) => Math.cos(i * defaults.segmentRadians) * -defaults.radiusScaleAbsolute(d.data))
                    .attr("cx", (d, i) => Math.sin(i * defaults.segmentRadians) * defaults.radiusScaleAbsolute(d.data))
                    .attr("fill", d => colorScale(d.data))
                    .style("opacity", 0.2)
                    .append("title")
                    .text(d => `${Math.round(d.data * 10) / 10} knots`);

                pathB.attr("d", lineB(arcsB)).attr("class", "arcs arcsB");

                const selB = markersB.selectAll("circle").data(arcsB);
                selB
                    .enter()
                    .append("circle")
                    .merge(selB)
                    .attr("r", "5")
                    .attr("cy", (d, i) => Math.cos(i * defaults.segmentRadians) * -defaults.radiusScaleAbsolute(d.data))
                    .attr("cx", (d, i) => Math.sin(i * defaults.segmentRadians) * defaults.radiusScaleAbsolute(d.data))
                    .attr("fill", d => colorScale(d.data))
                    .style("opacity", 0.2)
                    .append("title")
                    .text(d => `${Math.round(d.data * 10) / 10} knots`);
            }

            function getOrdinal(n) {
                const s = ["th", "st", "nd", "rd"],
                    v = n % 100;
                return n + (s[(v - 20) % 10] || s[v] || s[0]);
            }

            function getCannonsPerDeck(ship) {
                let s = ship.healthInfo.Deck4.toString();
                [ship.healthInfo.Deck3, ship.healthInfo.Deck2, ship.healthInfo.Deck1].forEach(cannons => {
                    s = `${cannons} | ${s}`;
                });
                return s;
            }

            function printText(ship, svgId) {
                const p = d3.select(svgId).select("p");
                let text = "";
console.log(ship);
                text += `${ship.name} (${getOrdinal(ship.class)} rate) <small>${ship.battleRating} battle rating`;
                text += "<br>";
                text += `${ship.decks} decks (${getCannonsPerDeck(ship)} cannons)`;
                text += "<br>";
                text += `Minimal speed: ${ship.minSpeed.toFixed(2)}, maximal speed: ${ship.maxSpeed.toFixed(2)} knots`;
                text += "<br>";
                text += `Turning speed: ${ship.maxTurningSpeed.toFixed(2)}`;
                text += "<br>";
                text += `Armor: ${ship.healthInfo.LeftArmor} sides, ${ship.healthInfo.FrontArmor} front, ${
                    ship.healthInfo.BackArmor
                } back, ${ship.healthInfo.InternalStructure} structure, ${ship.healthInfo.Sails} sails, ${
                    ship.healthInfo.Pump
                } pump, ${ship.healthInfo.Rudder} rudder`;
                text += "<br>";
                text += `${ship.healthInfo.Crew} crew (${ship.minCrewRequired} minimal)`;
                text += "<br>";
                text += `${ship.maxWeight} hold in ${ship.holdSize} compartments (${ship.shipMass} ship mass)`;
                text += "</small>";

                p.html(text);
            }

            function printTextCompare(svgId) {
                function getDiff(a, b, decimals = 0) {
                    let text = "<span class='";
                    text += a < b ? "mm" : "pp";
                    text += `'>${(a - b).toFixed(decimals)}</span>`;
                    return text;
                }

                const p = d3.select(svgId).select("p");
                let text = "";
                const ship = {
                    class: getDiff(current.shipAData.class, current.shipBData.class),
                    battleRating: getDiff(current.shipAData.battleRating, current.shipBData.battleRating),
                    decks: getDiff(current.shipAData.decks, current.shipBData.decks),
                    minSpeed: getDiff(current.shipAData.minSpeed, current.shipBData.minSpeed, 2),
                    maxSpeed: getDiff(current.shipAData.maxSpeed, current.shipBData.maxSpeed, 2),
                    maxTurningSpeed: getDiff(current.shipAData.maxTurningSpeed, current.shipBData.maxTurningSpeed, 2),
                    healthInfo: {
                        Deck1: getDiff(current.shipAData.healthInfo.Deck1, current.shipBData.healthInfo.Deck1),
                        Deck2: getDiff(current.shipAData.healthInfo.Deck2, current.shipBData.healthInfo.Deck2),
                        Deck3: getDiff(current.shipAData.healthInfo.Deck3, current.shipBData.healthInfo.Deck3),
                        Deck4: getDiff(current.shipAData.healthInfo.Deck4, current.shipBData.healthInfo.Deck4),
                        LeftArmor: getDiff(
                            current.shipAData.healthInfo.LeftArmor,
                            current.shipBData.healthInfo.LeftArmor
                        ),
                        FrontArmor: getDiff(
                            current.shipAData.healthInfo.FrontArmor,
                            current.shipBData.healthInfo.FrontArmor
                        ),
                        BackArmor: getDiff(
                            current.shipAData.healthInfo.BackArmor,
                            current.shipBData.healthInfo.BackArmor
                        ),
                        InternalStructure: getDiff(
                            current.shipAData.healthInfo.InternalStructure,
                            current.shipBData.healthInfo.InternalStructure
                        ),
                        Sails: getDiff(current.shipAData.healthInfo.Sails, current.shipBData.healthInfo.Sails),
                        Pump: getDiff(current.shipAData.healthInfo.Pump, current.shipBData.healthInfo.Pump),
                        Rudder: getDiff(current.shipAData.healthInfo.Rudder, current.shipBData.healthInfo.Rudder),
                        Crew: getDiff(current.shipAData.healthInfo.Crew, current.shipBData.healthInfo.Crew)
                    },
                    minCrewRequired: getDiff(current.shipAData.minCrewRequired, current.shipBData.minCrewRequired),
                    maxWeight: getDiff(current.shipAData.maxWeight, current.shipBData.maxWeight),
                    holdSize: getDiff(current.shipAData.holdSize, current.shipBData.holdSize),
                    shipMass: getDiff(current.shipAData.shipMass, current.shipBData.shipMass)
                };
                console.log(ship);
                text += `${current.shipAData.name} (compared to ${current.shipBData.name}) <small>${
                    ship.battleRating
                } battle rating`;
                text += "<br>";
                text += `${ship.decks} decks (${getCannonsPerDeck(ship)} cannons)`;
                text += "<br>";
                text += `Minimal speed: ${ship.minSpeed}, maximal speed: ${ship.maxSpeed} knots`;
                text += "<br>";
                text += `Turning speed: ${ship.maxTurningSpeed}`;
                text += "<br>";
                text += `Armor: ${ship.healthInfo.LeftArmor} sides, ${ship.healthInfo.FrontArmor} front, ${
                    ship.healthInfo.BackArmor
                } back, ${ship.healthInfo.InternalStructure} structure, ${ship.healthInfo.Sails} sails, ${
                    ship.healthInfo.Pump
                } pump, ${ship.healthInfo.Rudder} rudder`;
                text += "<br>";
                text += `${ship.healthInfo.Crew} crew (${ship.minCrewRequired} minimal)`;
                text += "<br>";
                text += `${ship.maxWeight} hold in ${ship.holdSize} compartments (${ship.shipMass} ship mass)`;
                text += "</small>";

                p.html(text);
            }

            // console.log(`ship id: ${shipId}`);
            const profileData = defaults.shipData.filter(ship => ship.id === +shipId)[0];
            const svgId = `#ship${shipNumber}`;
            if (shipNumber === "A") {
                if (isEmpty(current.shipAData)) {
                    setBackground(svgId);
                    setBackgroundGradient(svgId);
                    current.shipAData = JSON.parse(JSON.stringify(profileData));
                }
            } else if (isEmpty(current.shipBData)) {
                setBackground(svgId);
                setBackgroundGradient(svgId);
                current.shipBData = JSON.parse(JSON.stringify(profileData));
            }
            // console.log(`profileData: ${JSON.stringify(profileData)}`);
            drawProfile(profileData, svgId);
            printText(profileData, svgId);
            if (!isEmpty(current.shipAData) && !isEmpty(current.shipBData)) {
                setBackground("#ship-compare");
                drawDifferenceProfile("#ship-compare");
                printTextCompare("#ship-compare");
            }
        }

        function shipCompareSetup() {
            function setupShipSelect(id) {
                const shipSelect = $(id);
                const selectShips = defaults.shipData.sort((a, b) => {
                    if (a.name < b.name) {
                        return -1;
                    }
                    if (a.name > b.name) {
                        return 1;
                    }
                    return 0;
                });
                shipSelect.append(
                    $("<option>", {
                        value: 0,
                        text: "Select a ship"
                    })
                );
                selectShips.forEach(ship => {
                    shipSelect.append(
                        $("<option>", {
                            value: ship.id,
                            text: ship.name
                        })
                    );
                });
            }

            setupShipSelect("#shipA-select");
            setupShipSelect("#shipB-select");
            $("#shipA-select").change(() => {
                shipSelected($("#shipA-select").val(), "A");
            });
            $("#shipB-select").change(() => {
                shipSelected($("#shipB-select").val(), "B");
            });

            defaults.minSpeed = d3.min(defaults.shipData, d => d.minSpeed);
            defaults.maxSpeed = d3.max(defaults.shipData, d => d.maxSpeed);

            d3
                .select("#shipA")
                .append("svg")
                .attr("width", defaults.shipSvgWidth)
                .attr("height", defaults.shipSvgHeight)
                .attr("class", "profile")
                .attr("fill", "none")
                .append("g")
                .attr("transform", `translate(${defaults.shipSvgWidth / 2}, ${defaults.shipSvgHeight / 2})`);
            d3.select("#shipA").append("p");
            d3
                .select("#shipB")
                .append("svg")
                .attr("width", defaults.shipSvgWidth)
                .attr("height", defaults.shipSvgHeight)
                .attr("class", "profile")
                .attr("fill", "none")
                .append("g")
                .attr("transform", `translate(${defaults.shipSvgWidth / 2}, ${defaults.shipSvgHeight / 2})`);
            d3.select("#shipB").append("p");
            d3
                .select("#ship-compare")
                .append("svg")
                .attr("width", defaults.shipSvgWidth)
                .attr("height", defaults.shipSvgHeight)
                .attr("class", "profile")
                .attr("fill", "none")
                .append("g")
                .attr("transform", `translate(${defaults.shipSvgWidth / 2}, ${defaults.shipSvgHeight / 2})`);
            d3.select("#ship-compare").append("p");
        }

        shipCompareSetup();
    }

    // function naReady(error, naMapJsonData, pbZonesJsonData) {
    function naReady(error, shipJsonData) {
        if (error) {
            throw error;
        }

        // Read map data
        /*
        defaults.portData = topojsonFeature(naMap, naMap.objects.ports).features;
        current.portData = defaults.portData;
        defaults.PBZoneData = topojsonFeature(pbZones, pbZones.objects.pbZones);
        defaults.fortData = topojsonFeature(pbZones, pbZones.objects.forts);
        defaults.towerData = topojsonFeature(pbZones, pbZones.objects.towers);
        */
        defaults.shipData = JSON.parse(JSON.stringify(shipJsonData.shipData));

        // setup();
        /*
        zoomAndPan(initial.transform);
        //updatePorts(current.portData.filter(d => ["234", "237", "238", "239", "240"].includes(d.id)));
        updatePorts();
        */

        shipCompare();

        /*
        let predictTime = moment().utc(),
            direction = "nne".toUpperCase();
        console.log(`---->   predictTime: ${predictTime.format()}`);
        predictWind(direction, `${predictTime.hours()}:${predictTime.minutes()}`);
        predictTime.add(48 / 4, "minutes");
        console.log(`---->   predictTime: ${predictTime.format()}`);
        predictWind(direction, `${predictTime.hours()}:${predictTime.minutes()}`);
        */

        /*
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

        defaults.portData = topojsonFeature(naMapJsonData, naMapJsonData.objects.ports).features;
        defaults.PBZoneData = topojsonFeature(pbZonesJsonData, pbZonesJsonData.objects.pbZones);
        defaults.fortData = topojsonFeature(pbZonesJsonData, pbZonesJsonData.objects.forts);
        defaults.towerData = topojsonFeature(pbZonesJsonData, pbZonesJsonData.objects.towers);

        setup();
        */
    }

    /*
        profileData.shipData.forEach((d, i) => {
            drawProfile(d, i);
        });
        */

    d3
        .queue()
        // .defer(d3.json, defaults.mapJson)
        // .defer(d3.json, "eu1.json")
        // .defer(d3.json, defaults.pbJson)
        .defer(d3.json, defaults.shipJson)
        .await(naReady);
}

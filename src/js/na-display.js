/*
 Draws teleport map for Naval Action

 iB 2017
 */

import { feature as topojsonFeature } from "topojson-client";

import "bootstrap/js/dist/collapse";
import "bootstrap/js/dist/tooltip";
import "bootstrap/js/dist/util";

export default function naDisplay(serverName) {
    let naSvg, naCanvas, naContext, svgDef, naZoom;
    let mainGPort,
        mainGPBZone,
        mainGVoronoi,
        mainGCoord,
        gCompass,
        naVoronoiDiagram,
        pathVoronoi,
        naTeleportPorts,
        gPorts;
    let naPortData, currentPortData, naPBZoneData, naFortData, naTowerData;
    const naMargin = { top: 20, right: 20, bottom: 20, left: 20 };

    const naWidth = top.innerWidth - naMargin.left - naMargin.right,
        naHeight = top.innerHeight - naMargin.top - naMargin.bottom;
    const iconSize = 50;
    let highlightId;
    const highlightDuration = 200;
    const maxCoord = 8192;
    const minCoord = 0;
    const voronoiCoord = [[minCoord - 1, minCoord - 1], [maxCoord + 1, maxCoord + 1]];
    const Trans = {
        A: 0.00494444554690109,
        B: 0.0000053334600512813,
        C: 4082.20289162021,
        D: 4111.1164516551
    };
    const TransInv = {
        A: 202.246910593215,
        B: 0.2181591055887,
        C: -826509.800732941,
        D: 830570.031704516
    };

    const initialScale = 0.3,
        initialTransform = d3.zoomIdentity.translate(-100, -500).scale(initialScale);
    const PBZoneZoomScale = 1.5,
        labelZoomScale = 0.5;
    let bPBZoneDisplayed = false,
        bPortLabelDisplayed = true;
    const defaultFontSize = 16;
    let currentFontSize = defaultFontSize;
    const defaultCircleSize = 10;
    let currentCircleSize = defaultCircleSize;
    // limit how far away the mouse can be from finding a voronoi site
    const voronoiRadius = Math.min(naHeight, naWidth);
    let radioButton = "compass",
        bFirstCoord = true,
        line = d3.line(),
        lineData = [];
    let naImage = new Image();
    const naMapJson = `${serverName}.json`,
        pbJson = "pb.json",
        naImageSrc = "images/na-map.jpg";

    function naDisplayCountries(transform) {
        naContext.save();
        naContext.clearRect(0, 0, naWidth, naHeight);
        naContext.translate(transform.x, transform.y);
        naContext.scale(transform.k, transform.k);
        naDrawImage();
        naContext.restore();
    }

    function naStopProp() {
        if (d3.event.defaultPrevented) {
            d3.event.stopPropagation();
        }
    }

    function naSetupSvg() {
        naZoom = d3
            .zoom()
            .scaleExtent([0.15, 10])
            .on("zoom", naZoomed);

        naSvg = d3
            .select("#na")
            .append("svg")
            .attr("id", "na-svg")
            .attr("width", naWidth)
            .attr("height", naHeight)
            .style("position", "absolute")
            .style("top", `${naMargin.top}px`)
            .style("left", `${naMargin.left}px`)
            .call(naZoom)
            .on("dblclick.zoom", null)
            .on("click", naStopProp, true)
            .on("dblclick", doubleClickAction);

        svgDef = naSvg.append("defs");

        mainGVoronoi = naSvg.append("g").attr("class", "voronoi");
        mainGPort = naSvg.append("g").attr("class", "port");
        mainGPBZone = naSvg
            .append("g")
            .attr("class", "pb")
            .style("display", "none");
        mainGCoord = naSvg.append("g").attr("class", "coord");
    }

    function doubleClickAction() {
        const coord = d3.mouse(this),
            transform = d3.zoomTransform(this);
        const mx = coord[0],
            my = coord[1],
            tk = transform.k;
        let tx = transform.x,
            ty = transform.y;

        let x = (-tx + mx) / tk,
            y = (-ty + my) / tk;
        if (radioButton === "F11") {
            printCoord(x, y);
        } else {
            plotCourse(x, y);
        }
        tx = -x + mx;
        ty = -y + my;
        naZoomAndPan(d3.zoomIdentity.translate(tx, ty).scale(1));
    }

    function plotCourse(x, y) {
        function printCompass(x, y) {
            const compassSize = 100;

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

        function printLine(x, y) {
            // Converts from radians to degrees
            // http://cwestblog.com/2012/11/12/javascript-degree-and-radian-conversion/
            Math.radiansToDegrees = function(radians) {
                return radians * 180 / Math.PI;
            };

            // https://stackoverflow.com/questions/9970281/java-calculating-the-angle-between-two-points-in-degrees
            function rotationAngleInDegrees(centerPt, targetPt) {
                let theta = Math.atan2(targetPt[1] - centerPt[1], targetPt[0] - centerPt[0]);
                theta -= Math.PI / 2.0;
                let angle = Math.radiansToDegrees(theta);
                if (angle < 0) {
                    angle += 360;
                }
                return angle;
            }

            // https://stackoverflow.com/questions/7490660/converting-wind-direction-in-angles-to-text-words
            function degreesToCompass(degrees) {
                const val = Math.floor(degrees / 22.5 + 0.5);
                const compassDirections = [
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
                ];
                return compassDirections[val % 16];
            }

            const degrees = rotationAngleInDegrees(lineData[lineData.length - 1], lineData[lineData.length - 2]);
            const compass = degreesToCompass(degrees);
            gCompass.datum(lineData).attr("d", line);

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
            const height = bbox.height + defaultFontSize,
                width = bbox.width + defaultFontSize;
            rect
                .attr("x", 0)
                .attr("y", 0)
                .attr("height", height)
                .attr("width", width);
            svg.attr("height", height).attr("width", width);
        }

        lineData.push([x, y]);
        if (bFirstCoord) {
            printCompass(x, y);
            bFirstCoord = !bFirstCoord;
        } else {
            printLine(x, y);
        }
    }

    function printCoord(x, y) {
        // svg coord to F11 coord
        function convertInvCoordX(x, y) {
            return TransInv.A * x + TransInv.B * y + TransInv.C;
        }

        // svg coord to F11 coord
        function convertInvCoordY(x, y) {
            return TransInv.B * x - TransInv.A * y + TransInv.D;
        }

        const F11X = convertInvCoordX(x, y),
            F11Y = convertInvCoordY(x, y);

        if (radioButton === "F11") {
            printF11Coord(x, y, F11X, F11Y);
        } else {
            plotCourse(x, y);
        }
    }

    function goToF11(F11X, F11Y) {
        // F11 coord to svg coord
        function convertCoordX(x, y) {
            return Trans.A * x + Trans.B * y + Trans.C;
        }
        // F11 coord to svg coord
        function convertCoordY(x, y) {
            return Trans.B * x - Trans.A * y + Trans.D;
        }

        const x = convertCoordX(F11X, F11Y),
            y = convertCoordY(F11X, F11Y);

        naClearMap();
        if (radioButton === "F11") {
            printF11Coord(x, y, F11X, F11Y);
        } else {
            plotCourse(x, y);
        }

        const tx = -x + naWidth / 2,
            ty = -y + naHeight / 2;

        naZoomAndPan(d3.zoomIdentity.translate(tx, ty).scale(1));
    }

    const thousandsWithBlanks = x => {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u2009");
    };

    const formatCoord = x => {
        let r = thousandsWithBlanks(Math.abs(Math.trunc(x)));
        if (x < 0) {
            r = `\u2212\u2009${r}`;
        }
        return r;
    };

    function printF11Coord(x, y, textX, textY) {
        let g = mainGCoord.append("g").attr("transform", `translate(${x},${y})`);
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

    function naSetupCanvas() {
        naCanvas = d3
            .select("#na")
            .append("canvas")
            .attr("width", naWidth)
            .attr("height", naHeight)
            .style("position", "absolute")
            .style("top", `${naMargin.top}px`)
            .style("left", `${naMargin.left}px`)
            .on("click", naStopProp, true);
        naContext = naCanvas.node().getContext("2d");

        naImage.onload = function() {
            naDisplayCountries(initialTransform);
        };
        naImage.src = naImageSrc;
    }

    function naDrawImage() {
        naContext.drawImage(naImage, 0, 0);
        naContext.getImageData(0, 0, naWidth, naHeight);
    }

    function naSetupMap(scale) {
        if (PBZoneZoomScale < scale) {
            if (!bPBZoneDisplayed) {
                naTogglePBZones();
                naToggleDisplayTeleportAreas();
                highlightId = null;
                bPBZoneDisplayed = true;
            }
        } else {
            if (bPBZoneDisplayed) {
                naTogglePBZones();
                naToggleDisplayTeleportAreas();
                bPBZoneDisplayed = false;
            }
        }

        if (labelZoomScale > scale) {
            if (bPortLabelDisplayed) {
                bPortLabelDisplayed = false;
            }
        } else {
            if (!bPortLabelDisplayed) {
                bPortLabelDisplayed = true;
            }
        }
        updatePorts();
    }

    function naZoomed() {
        let transform = d3.event.transform;
        //console.log(`transform: ${JSON.stringify(transform)}`);

        naSetupMap(transform.k);
        naDisplayCountries(transform);

        mainGPort.attr("transform", transform);
        mainGVoronoi.attr("transform", transform);
        mainGPBZone.attr("transform", transform);
        mainGCoord.attr("transform", transform);

        currentCircleSize = defaultCircleSize / transform.k;
        mainGPort.selectAll("circle").attr("r", currentCircleSize);
        mainGPort.selectAll("text").attr("dx", d => d.properties.dx / transform.k);
        mainGPort.selectAll("text").attr("dy", d => d.properties.dy / transform.k);
        if (bPortLabelDisplayed) {
            currentFontSize = defaultFontSize / transform.k;
            mainGPort.selectAll("text").style("font-size", currentFontSize);
            if (highlightId && !bPBZoneDisplayed) {
                naVoronoiHighlight();
            }
        }
    }

    function setupPorts() {
        const nations = ["DE", "DK", "ES", "FR", "FT", "GB", "NT", "PL", "PR", "RU", "SE", "US", "VP"];

        nations.forEach(function(nation) {
            svgDef
                .append("pattern")
                .attr("id", nation)
                .attr("width", "100%")
                .attr("height", "100%")
                .attr("viewBox", `0 0 ${iconSize} ${iconSize}`)
                .append("image")
                .attr("height", iconSize)
                .attr("width", iconSize)
                .attr("href", `icons/${nation}.svg`);
        });
    }

    function updatePorts() {
        function naTooltipData(d) {
            let h = `<table><tbody<tr><td><i class='flag-icon ${d.nation}'></i></td>`;
            h += `<td><span class='port-name'>${d.name}</span>`;
            h += d.availableForAll ? " (accessible to all nations)" : "";
            h += "</td></tr></tbody></table>";
            h += `<p>${d.shallow ? "Shallow" : "Deep"}`;
            h += " water port";
            if (d.countyCapital) {
                h += ", county capital";
            }
            if (d.capturer) {
                h += ` owned by ${d.capturer}`;
            }
            h += "<br>";
            if (!d.nonCapturable) {
                const pbTimeRange = !d.portBattleStartTime
                    ? "11.00\u2009–\u20098.00"
                    : `${(d.portBattleStartTime + 10) % 24}.00\u2009–\u2009${(d.portBattleStartTime + 13) % 24}.00`;
                h += `Port battle: ${pbTimeRange}, ${thousandsWithBlanks(d.brLimit)} BR, `;
                switch (d.portBattleType) {
                    case "Large":
                        h += "1<sup>st</sup>";
                        break;
                    case "Medium":
                        h += "4<sup>th</sup>";
                        break;
                    case "Small":
                        h += "6<sup>th</sup>";
                        break;
                }

                h += " rate AI";
                h += `, ${d.conquestMarksPension} conquest point`;
                h += d.conquestMarksPension > 1 ? "s" : "";
            } else {
                h += "Not capturable";
            }
            h += `<br>${d.portTax * 100}\u2009% port tax`;
            h += d.tradingCompany ? `, trading company level ${d.tradingCompany}` : "";
            h += d.laborHoursDiscount ? ", labor hours discount" : "";
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

        function portMouseover(d) {
            if (highlightId) {
                naVoronoiHighlight();
            }
            d3
                .select(this)
                .attr("data-toggle", "tooltip")
                .attr("title", d => naTooltipData(d.properties));
            $(`#c${d.id}`)
                .tooltip({
                    delay: { show: highlightDuration, hide: highlightDuration },
                    html: true,
                    placement: "auto"
                })
                .tooltip("show");
        }

        // Data join
        gPorts = mainGPort.selectAll("g.port").data(currentPortData, d => d.id);

        // Enter
        let nodeGroupsEnter = gPorts
            .enter()
            .append("g")
            .attr("class", "port")
            .attr("transform", d => `translate(${d.geometry.coordinates[0]},${d.geometry.coordinates[1]})`);
        nodeGroupsEnter.append("circle");
        nodeGroupsEnter.append("text");

        // Update
        // Add flags
        gPorts
            .merge(nodeGroupsEnter)
            .select("circle")
            .attr("id", d => {
                return `c${d.id}`;
            })
            .attr("r", currentCircleSize)
            .attr("fill", d => `url(#${d.properties.nation})`)
            .on("mouseover", portMouseover);
        // Add labels
        if (bPortLabelDisplayed) {
            gPorts
                .merge(nodeGroupsEnter)
                .select("text")
                .attr("dx", d => d.properties.dx)
                .attr("dy", d => d.properties.dy)
                .attr("text-anchor", d => {
                    if (d.properties.dx < 0) {
                        return "end";
                    } else {
                        return "start";
                    }
                })
                .text(d => d.properties.name)
                .attr("class", d => {
                    let f = "na-port-out";
                    if (!d.properties.shallow && !d.properties.countyCapital) {
                        f = "na-port-in";
                    }
                    return f;
                });
        } else {
            gPorts
                .merge(nodeGroupsEnter)
                .select("text")
                .text("");
        }
        // Remove old
        gPorts.exit().remove();
    }

    function naSetupPBZones() {
        mainGPBZone
            .append("path")
            .datum(naPBZoneData)
            .attr("class", "pb-zone")
            .attr("d", d3.geoPath().pointRadius(4));

        mainGPBZone
            .append("path")
            .datum(naTowerData)
            .attr("class", "tower")
            .attr("d", d3.geoPath().pointRadius(1.5));

        mainGPBZone
            .append("path")
            .datum(naFortData)
            .attr("class", "fort")
            .attr("d", d3.geoPath().pointRadius(2));
    }

    function naTogglePBZones() {
        mainGPBZone.style("display", mainGPBZone.active ? "none" : "inherit");
        mainGPBZone.active = !mainGPBZone.active;
    }

    function naSetupTeleportAreas() {
        // Extract port coordinates
        naTeleportPorts = naPortData
            // Use only ports that deep water ports and not a county capital
            .filter(d => !d.properties.shallow && !d.properties.countyCapital)
            // Map to coordinates array
            .map(d => ({
                id: d.id,
                coord: { x: d.geometry.coordinates[0], y: d.geometry.coordinates[1] }
            }));

        pathVoronoi = mainGVoronoi
            .selectAll(".voronoi")
            .data(naTeleportPorts)
            .enter()
            .append("path")
            .attr("id", d => `v${d.id}`);

        naVoronoiDiagram = d3
            .voronoi()
            .extent(voronoiCoord)
            .x(d => d.coord.x)
            .y(d => d.coord.y)(naTeleportPorts);

        // Draw teleport areas
        pathVoronoi
            .data(naVoronoiDiagram.polygons())
            .attr("d", d => (d ? `M${d.join("L")}Z` : null))
            .on("mouseover", function() {
                let ref = d3.mouse(this);
                const mx = ref[0],
                    my = ref[1];

                // use the new diagram.find() function to find the voronoi site closest to
                // the mouse, limited by max distance defined by voronoiRadius
                const site = naVoronoiDiagram.find(mx, my, voronoiRadius);
                if (site) {
                    highlightId = site.data.id;
                    naVoronoiHighlight();
                }
            })
            .on("mouseout", function() {
                naVoronoiHighlight();
            });
        naToggleDisplayTeleportAreas();
    }

    function naToggleDisplayTeleportAreas() {
        mainGVoronoi.style("display", mainGVoronoi.active ? "none" : "inherit");
        mainGVoronoi.active = !mainGVoronoi.active;
    }

    function naVoronoiHighlight() {
        mainGVoronoi.selectAll("path").attr("class", function() {
            return d3.select(this).attr("id") === `v${highlightId}` ? "highlight-voronoi" : "";
        });
        mainGPort.selectAll("circle").attr("r", d => {
            return d.id === highlightId ? currentCircleSize * 3 : currentCircleSize;
        });
        if (bPortLabelDisplayed) {
            mainGPort
                .selectAll("text")
                .attr("dx", d => {
                    return d.id === highlightId ? d.properties.dx * 3 : d.properties.dx;
                })
                .attr("dy", d => {
                    return d.id === highlightId ? d.properties.dy * 3 : d.properties.dy;
                })
                .style("font-size", d => {
                    return d.id === highlightId ? `${currentFontSize * 2}px` : `${currentFontSize}px`;
                });
        }
    }

    function naZoomAndPan(transform) {
        let t = {};
        if (JSON.stringify(transform) === JSON.stringify(initialTransform)) {
            t = { delay: 0, duration: 0 };
        } else {
            t = { delay: 500, duration: 500 };
        }

        naSvg
            .transition()
            .delay(t.delay)
            .duration(t.duration)
            .call(naZoom.transform, transform);
    }

    function naClearMap() {
        mainGCoord.remove();
        mainGCoord = naSvg.append("g").attr("class", "coord");
        bFirstCoord = true;
        lineData.splice(0, lineData.length);
        currentPortData = naPortData;
        updatePorts();
    }

    function setupSelects() {
        function setupPortSelect() {
            const portNames = $("#port-names");
            const selectPorts = naPortData
                .map(d => ({ coord: [d.geometry.coordinates[0], d.geometry.coordinates[1]], name: d.properties.name }))
                .sort(function(a, b) {
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
                    text: "Select a port"
                })
            );
            selectPorts.forEach(function(port) {
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
            let goodsPerPort = naPortData.map(d => {
                let goods = d.properties.drops;
                goods += d.properties.produces ? `,${d.properties.produces}` : "";
                return {
                    id: d.id,
                    goods: goods
                };
            });

            goodsPerPort.forEach(function(port) {
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
            for (const [key, portIds] of selectGoods.entries()) {
                let ids = "";
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

        setupPortSelect();
        $("#port-names").change(() => {
            zoomToPort($("#port-names").val());
        });
        setupGoodSelect();
        $("#good-names").change(() => {
            const portIds = $("#good-names")
                .val()
                .split(",");
            if (portIds.includes("0")) {
                currentPortData = naPortData;
            } else {
                currentPortData = naPortData.filter(d => portIds.includes(d.id));
            }
            updatePorts();
        });
    }

    function zoomToPort(coord) {
        const c = coord.split(","),
            x = c[0],
            y = c[1];
        const tx = -x + naHeight / 2,
            ty = -y + naWidth / 2;

        naZoomAndPan(d3.zoomIdentity.translate(tx, ty).scale(1));
    }

    function naReady(error, naMap, pbZones) {
        if (error) {
            throw error;
        }

        // Read map data
        naPortData = topojsonFeature(naMap, naMap.objects.ports).features;
        currentPortData = naPortData;
        naPBZoneData = topojsonFeature(pbZones, pbZones.objects.pbzones);
        naFortData = topojsonFeature(pbZones, pbZones.objects.forts);
        naTowerData = topojsonFeature(pbZones, pbZones.objects.towers);

        naSetupCanvas();
        naSetupSvg();
        naSetupTeleportAreas();
        setupPorts();
        naSetupPBZones();
        setupSelects();
        naZoomAndPan(initialTransform);
        //updatePorts(currentPortData.filter(d => ["234", "237", "238", "239", "240"].includes(d.id)));
        updatePorts();

        d3.select("#form").style("display", "inherit");
        $("form").submit(function(event) {
            const x = $("#x-coord").val(),
                z = $("#z-coord").val();
            goToF11(x, z);
            event.preventDefault();
        });
        $("#reset").on("click", function() {
            naClearMap();
        });
        $(".radio-group").change(function() {
            radioButton = $("input[name='mouseFunction']:checked").val();
            naClearMap();
        });
    }

    naSetupSvg();
    /*
    const profileData = [
        {
            id: 1,
            name: "Cerberus",
            maxSpeed: 13.51336736,
            minSpeed: -5.045659745,
            speedDegrees: [
                -5.045659745,
                -0.833999419,
                1.838961022,
                6.599438361,
                8.596795061,
                10.06530579,
                11.44757313,
                12.53398738,
                13.29694155,
                13.51336736,
                13.20285597,
                12.81767647,
                12.81767647,
                13.20285597,
                13.51336736,
                13.29694155,
                12.53398738,
                11.44757313,
                10.06530579,
                8.596795061,
                6.599438361,
                1.838961022,
                -0.833999419,
                -5.045659745
            ]
        }
    ];
*/
    d3.json("ships.json", function(profileData) {
        function drawProfile(profileData, i) {
            let width = 350,
                height = 350,
                svgPerRow = 11,
                outerRadius = Math.min(width, height) / 2,
                innerRadius = 0.3 * outerRadius;

            const colorScale = d3
                .scaleLinear()
                .domain([profileData.minSpeed, 0, 10, 12, profileData.maxSpeed])
                .range(["#a62e39", "#fbf8f5", "#6cc380", "#419f57", "#2a6838"]);

            let pie = d3
                .pie()
                .sort(null)
                .value(24);
            const arcs = pie(profileData.speedDegrees);

            const radiusScaleRelative = d3
                .scaleLinear()
                .domain([profileData.minSpeed, 0, profileData.maxSpeed])
                .range([10, innerRadius, outerRadius]);

            const radiusScaleAbsolute = d3
                .scaleLinear()
                .domain([minSpeed, 0, maxSpeed])
                .range([10, innerRadius, outerRadius]);

            let speedArc = d3
                .arc()
                .innerRadius(innerRadius)
                .outerRadius(d => {
                    //return radiusScaleRelative(d.data);
                    return radiusScaleAbsolute(d.data);
                });

            let outlineArc = d3
                .arc()
                .innerRadius(innerRadius)
                .outerRadius(outerRadius);

            const xScale = d3.scaleLinear().range([0, 2 * Math.PI]),
                yScale = d3.scaleSqrt().range([0, outerRadius]);
            let line = d3
                .line()
                .x(d => {
                    console.log(`d: ${JSON.stringify(d)}`);
                    return xScale(radiusScaleAbsolute(d.data));
                })
                .y((d, i) => i * 10)
                .curve(d3.curveCatmullRom.alpha(0.5));

            let svg = naSvg
                .append("svg")
                //.attr("width", width)
                //.attr("height", height)
                .attr("class", "profile")
                .append("g")
                .attr(
                    "transform",
                    `translate(${width / 2 + width * (i % svgPerRow)}, ${height / 2 +
                        height * Math.trunc(i / svgPerRow)})`
                );

            let innerpath = svg
                .selectAll(".solidArc")
                .data(arcs)
                .enter()
                .append("path")
                .attr("fill", d => colorScale(d.data))
                .attr("class", "solidArc")
                .attr("d", speedArc);

            let outerPath = svg
                .selectAll(".outlineArc")
                .data(arcs)
                .enter()
                .append("path")
                .attr("class", "outlineArc")
                .attr("d", outlineArc);

            let label = svg
                .selectAll("text")
                .data(arcs)
                .enter()
                .append("text")
                .each(function(d, i) {
                    const c = outlineArc.centroid(d);
                    d3
                        .select(this)
                        .attr("x", c[0])
                        .attr("y", c[1])
                        .attr("dy", "0.33em")
                        //.text(((i + 1) * 15) % 360);
                        .text(Math.round(d.data * 10) / 10);
                });

            svg
                .append("path")
                .data(arcs)
                .attr("class", "line")
                .style("stroke", d => colorScale(d.data))
                .attr("id", `tag${i}`) // assign ID
                .attr("d", line);

            // Add the scatterplot
            svg
                .selectAll("dot")
                .data(arcs)
                .enter()
                .append("circle")
                .attr("r", 4)
                .attr("cx", function(d) {
                    return d.data;
                })
                .attr("cy", function(d) {
                    return d.data;
                });
            svg
                .append("text")
                .attr("class", "aster-score")
                .text(profileData.name);
        }

        //console.log(`profileData: ${JSON.stringify(profileData.shipdata)}`);

        const minSpeed = d3.min(profileData.shipData, d => d.minSpeed);
        const maxSpeed = d3.max(profileData.shipData, d => d.maxSpeed);
        console.log(`minSpeed: ${minSpeed}`);
        console.log(`maxSpeed: ${maxSpeed}`);
        profileData.shipData.sort(function(a, b) {
            if (a.class < b.class) {
                return -1;
            }
            if (a.class > b.class) {
                return 1;
            }
            if (a.name < b.name) {
                return -1;
            }
            if (a.name > b.name) {
                return 1;
            }
            return 0;
        });

        profileData.shipData.forEach((d, i) => {
            drawProfile(d, i);
        });
    });

    /*
    d3
        .queue()
        .defer(d3.json, naMapJson)
        .defer(d3.json, pbJson)
        .await(naReady);
        */
}

/*

        let width = 500,
            height = 500,
            radius = Math.min(width, height) / 2,
            innerRadius = 0.3 * radius;

        let pie = d3
            .pie()
            .sort(null)
            .value(function(d) {
                return d.width;
            });

        let arc = d3
            .arc()
            .innerRadius(innerRadius)
            .outerRadius(function(d) {
                return (radius - innerRadius) * (d.data.score / 100.0) + innerRadius;
            });

        let outlineArc = d3
            .arc()
            .innerRadius(innerRadius)
            .outerRadius(radius);

        let svg = naSvg
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", `translate(${width / 2},${height / 2})`);

        d3.csv("aster_data.csv", function(error, data) {
            data.forEach(function(d) {
                d.order = +d.order;
                d.weight = +d.weight;
                d.score = +d.score;
                d.width = +d.weight;
            });
            let path = svg
                .selectAll(".solidArc")
                .data(pie(data))
                .enter()
                .append("path")
                .attr("fill", function(d) {
                    return d.data.color;
                })
                .attr("class", "solidArc")
                .attr("stroke", "gray")
                .attr("d", arc);
            let outerPath = svg
                .selectAll(".outlineArc")
                .data(pie(data))
                .enter()
                .append("path")
                .attr("fill", "none")
                .attr("stroke", "gray")
                .attr("class", "outlineArc")
                .attr("d", outlineArc);

            // calculate the weighted mean score
            let score =
                data.reduce(function(a, b) {
                    //console.log('a:' + a + ', b.score: ' + b.score + ', b.weight: ' + b.weight);
                    return a + b.score * b.weight;
                }, 0) /
                data.reduce(function(a, b) {
                    return a + b.weight;
                }, 0);

            svg
                .append("svg:text")
                .attr("class", "aster-score")
                .attr("dy", ".35em")
                .attr("text-anchor", "middle") // text-align: right
                .text(Math.round(score));
        });

 */

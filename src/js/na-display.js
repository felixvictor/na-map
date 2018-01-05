/*
 Draws teleport map for Naval Action

 iB 2017
 */

import { feature as topojsonFeature } from "topojson-client";

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

    let initial = { scale: 0.3, x: 0, y: 0 };
    initial.transform = d3.zoomIdentity.translate(initial.x, initial.y).scale(initial.scale);
    let defaults = {
        margin: { top: 20, right: 20, bottom: 20, left: 20 },
        coord: {
            min: 0,
            max: 8192
        },
        fontSize: 16,
        circleSize: 10,
        iconSize: 50,
        PBZoneZoomScale: 1.5,
        labelZoomScale: 0.5,
        highlightDuration: 200,
        mapJson: `${serverName}.json`,
        pbJson: "pb.json",
        imageSrc: "images/na-map.jpg",
        image: new Image(),
        line: d3.line(),
        transformMatrix: {
            A: 0.00494444554690109,
            B: 0.0000053334600512813,
            C: 4082.20289162021,
            D: 4111.1164516551
        },
        transformMatrixInv: {
            A: 202.246910593215,
            B: 0.2181591055887,
            C: -826509.800732941,
            D: 830570.031704516
        }
    };
    defaults.width = top.innerWidth - defaults.margin.left - defaults.margin.right;
    defaults.height = top.innerHeight - defaults.margin.top - defaults.margin.bottom;
    defaults.xScale = d3.scaleLinear().range(0, defaults.width);
    defaults.yScale = d3.scaleLinear().range(0, defaults.height);
    defaults.coord.voronoi = [
        [defaults.coord.min - 1, defaults.coord.min - 1],
        [defaults.coord.max + 1, defaults.coord.max + 1]
    ];
    // limit how far away the mouse can be from finding a voronoi site
    defaults.voronoiRadius = Math.min(defaults.height, defaults.width);

    let current = {
        x: initial.x,
        y: initial.y,
        fontSize: defaults.fontSize,
        circleSize: defaults.circleSize,
        highlightId: null,
        bPBZoneDisplayed: false,
        bPortLabelDisplayed: true,
        bFirstCoord: true,
        radioButton: "compass",
        lineData: []
    };

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

    function naDisplayCountries(transform) {
        function drawImage() {
            naContext.drawImage(defaults.image, 0, 0);
            naContext.getImageData(0, 0, defaults.width, defaults.height);
        }

        naContext.save();
        naContext.clearRect(0, 0, defaults.width, defaults.height);
        naContext.translate(transform.x, transform.y);
        naContext.scale(transform.k, transform.k);
        drawImage();
        naContext.restore();
    }

    function doubleClickAction() {
        function printCoord(x, y) {
            // svg coord to F11 coord
            function convertInvCoordX(x, y) {
                return defaults.transInv.A * x + defaults.transInv.B * y + defaults.transInv.C;
            }

            // svg coord to F11 coord
            function convertInvCoordY(x, y) {
                return defaults.transInv.B * x - defaults.transInv.A * y + defaults.transInv.D;
            }

            const F11X = convertInvCoordX(x, y),
                F11Y = convertInvCoordY(x, y);

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
            tk = transform.k;
        let tx = transform.x,
            ty = transform.y;

        let x = (-tx + mx) / tk,
            y = (-ty + my) / tk;
        if (current.radioButton === "F11") {
            printCoord(x, y);
        } else {
            plotCourse(x, y);
        }
        tx = -x + mx;
        ty = -y + my;
        zoomAndPan(d3.zoomIdentity.translate(tx, ty).scale(1));
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
        if (current.bFirstCoord) {
            printCompass(x, y);
            current.bFirstCoord = !current.bFirstCoord;
        } else {
            printLine(x, y);
        }
    }

    function goToF11(F11X, F11Y) {
        // F11 coord to svg coord
        function convertCoordX(x, y) {
            return defaults.transformMatrix.A * x + defaults.transformMatrix.B * y + defaults.transformMatrix.C;
        }
        // F11 coord to svg coord
        function convertCoordY(x, y) {
            return defaults.transformMatrix.B * x - defaults.transformMatrix.A * y + defaults.transformMatrix.D;
        }

        const x = convertCoordX(F11X, F11Y),
            y = convertCoordY(F11X, F11Y);

        clearMap();
        if (current.radioButton === "F11") {
            printF11Coord(x, y, F11X, F11Y);
        } else {
            plotCourse(x, y);
        }

        const tx = -x + defaults.width / 2,
            ty = -y + defaults.height / 2;

        zoomAndPan(d3.zoomIdentity.translate(tx, ty).scale(1));
    }

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

    function naZoomed() {
        function configureMap(scale) {
            function naTogglePBZones() {
                mainGPBZone.style("display", mainGPBZone.active ? "none" : "inherit");
                mainGPBZone.active = !mainGPBZone.active;
            }

            if (defaults.PBZoneZoomScale < scale) {
                if (!current.bPBZoneDisplayed) {
                    naTogglePBZones();
                    naToggleDisplayTeleportAreas();
                    current.highlightId = null;
                    current.bPBZoneDisplayed = true;
                }
            } else {
                if (current.bPBZoneDisplayed) {
                    naTogglePBZones();
                    naToggleDisplayTeleportAreas();
                    current.bPBZoneDisplayed = false;
                }
            }

            if (defaults.labelZoomScale > scale) {
                if (current.bPortLabelDisplayed) {
                    current.bPortLabelDisplayed = false;
                }
            } else {
                if (!current.bPortLabelDisplayed) {
                    current.bPortLabelDisplayed = true;
                }
            }
            updatePorts();
        }

        let transform = d3.event.transform;
        //console.log(`transform: ${JSON.stringify(transform)}`);

        configureMap(transform.k);
        naDisplayCountries(transform);

        mainGPort.attr("transform", transform);
        mainGVoronoi.attr("transform", transform);
        mainGPBZone.attr("transform", transform);
        mainGCoord.attr("transform", transform);

        current.circleSize = defaults.circleSize / transform.k;
        mainGPort.selectAll("circle").attr("r", current.circleSize);
        mainGPort.selectAll("text").attr("dx", d => d.properties.dx / transform.k);
        mainGPort.selectAll("text").attr("dy", d => d.properties.dy / transform.k);
        if (current.bPortLabelDisplayed) {
            current.fontSize = defaults.fontSize / transform.k;
            mainGPort.selectAll("text").style("font-size", current.fontSize);
            if (current.highlightId && !current.bPBZoneDisplayed) {
                naVoronoiHighlight();
            }
        }
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
            if (current.highlightId) {
                naVoronoiHighlight();
            }
            d3
                .select(this)
                .attr("data-toggle", "tooltip")
                .attr("title", d => naTooltipData(d.properties));
            $(`#c${d.id}`)
                .tooltip({
                    delay: { show: defaults.highlightDuration, hide: defaults.highlightDuration },
                    html: true,
                    placement: "auto"
                })
                .tooltip("show");
        }

        // Data join
        gPorts = mainGPort.selectAll("g.port").data(current.portData, d => d.id);

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
            .attr("r", current.circleSize)
            .attr("fill", d => `url(#${d.properties.nation})`)
            .on("mouseover", portMouseover);
        // Add labels
        if (current.bPortLabelDisplayed) {
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

    function naToggleDisplayTeleportAreas() {
        mainGVoronoi.style("display", mainGVoronoi.active ? "none" : "inherit");
        mainGVoronoi.active = !mainGVoronoi.active;
    }

    function naVoronoiHighlight() {
        mainGVoronoi.selectAll("path").attr("class", function() {
            return d3.select(this).attr("id") === `v${current.highlightId}` ? "highlight-voronoi" : "";
        });
        mainGPort.selectAll("circle").attr("r", d => {
            return d.id === current.highlightId ? current.circleSize * 3 : current.circleSize;
        });
        if (current.bPortLabelDisplayed) {
            mainGPort
                .selectAll("text")
                .attr("dx", d => {
                    return d.id === current.highlightId ? d.properties.dx * 3 : d.properties.dx;
                })
                .attr("dy", d => {
                    return d.id === current.highlightId ? d.properties.dy * 3 : d.properties.dy;
                })
                .style("font-size", d => {
                    return d.id === current.highlightId ? `${current.fontSize * 2}px` : `${current.fontSize}px`;
                });
        }
    }

    function zoomAndPan(transform) {
        let t = {};
        if (JSON.stringify(transform) === JSON.stringify(initial.transform)) {
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

    function clearMap() {
        mainGCoord.remove();
        mainGCoord = naSvg.append("g").attr("class", "coord");
        current.bFirstCoord = true;
        current.lineData.splice(0, current.lineData.length);
        current.portData = defaults.portData;
        $("#good-names").get(0).selectedIndex = 0;
        updatePorts();
    }

    function setup() {
        function stopProp() {
            if (d3.event.defaultPrevented) {
                d3.event.stopPropagation();
            }
        }

        function setupScaleDomain() {
            const flattenArray = arr => [].concat.apply([], arr.map(element => element));
            defaults.xScale.domain(
                d3.extent(
                    [].concat(
                        defaults.portData.map(d => d.geometry.coordinates[0]),
                        flattenArray(
                            defaults.PBZoneData.features.map(d => [].concat(d.geometry.coordinates.map(d => d[0])))
                        ),
                        flattenArray(
                            defaults.fortData.features.map(d => [].concat(d.geometry.coordinates.map(d => d[0])))
                        ),
                        flattenArray(
                            defaults.towerData.features.map(d => [].concat(d.geometry.coordinates.map(d => d[0])))
                        )
                    )
                )
            );
            defaults.yScale.domain(
                d3.extent(
                    [].concat(
                        defaults.portData.map(d => d.geometry.coordinates[1]),
                        flattenArray(
                            defaults.PBZoneData.features.map(d => [].concat(d.geometry.coordinates.map(d => d[1])))
                        ),
                        flattenArray(
                            defaults.fortData.features.map(d => [].concat(d.geometry.coordinates.map(d => d[1])))
                        ),
                        flattenArray(
                            defaults.towerData.features.map(d => [].concat(d.geometry.coordinates.map(d => d[1])))
                        )
                    )
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

            defaults.image.onload = function() {
                naDisplayCountries(initial.transform);
            };
            defaults.image.src = defaults.imageSrc;
        }

        function setupSvg() {
            naZoom = d3
                .zoom()
                .scaleExtent([0.15, 10])
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

            mainGVoronoi = naSvg.append("g").attr("class", "voronoi");
            mainGPort = naSvg.append("g").attr("class", "port");
            mainGPBZone = naSvg
                .append("g")
                .attr("class", "pb")
                .style("display", "none");
            mainGCoord = naSvg.append("g").attr("class", "coord");
        }

        function setupPorts() {
            const nations = ["DE", "DK", "ES", "FR", "FT", "GB", "NT", "PL", "PR", "RU", "SE", "US", "VP"];

            nations.forEach(function(nation) {
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
            });
        }

        function setupTeleportAreas() {
            // Extract port coordinates
            naTeleportPorts = defaults.portData
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
                .extent(defaults.coord.voronoi)
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
                    // the mouse, limited by max distance defined by defaults.voronoiRadius
                    const site = naVoronoiDiagram.find(mx, my, defaults.voronoiRadius);
                    if (site) {
                        current.highlightId = site.data.id;
                        naVoronoiHighlight();
                    }
                })
                .on("mouseout", function() {
                    naVoronoiHighlight();
                });
            naToggleDisplayTeleportAreas();
        }

        function setupPBZones() {
            mainGPBZone
                .append("path")
                .datum(defaults.PBZoneData)
                .attr("class", "pb-zone")
                .attr("d", d3.geoPath().pointRadius(4));

            mainGPBZone
                .append("path")
                .datum(defaults.towerData)
                .attr("class", "tower")
                .attr("d", d3.geoPath().pointRadius(1.5));

            mainGPBZone
                .append("path")
                .datum(defaults.fortData)
                .attr("class", "fort")
                .attr("d", d3.geoPath().pointRadius(2));
        }

        function setupSelects() {
            function setupPortSelect() {
                const portNames = $("#port-names");
                const selectPorts = defaults.portData
                    .map(d => ({
                        coord: [d.geometry.coordinates[0], d.geometry.coordinates[1]],
                        name: d.properties.name
                    }))
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
                let goodsPerPort = defaults.portData.map(d => {
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

            function goToPort(coord) {
                const c = coord.split(","),
                    x = c[0],
                    y = c[1];
                const tx = -x + defaults.height / 2,
                    ty = -y + defaults.width / 2;

                zoomAndPan(d3.zoomIdentity.translate(tx, ty).scale(1));
            }

            setupPortSelect();
            $("#port-names").change(() => {
                goToPort($("#port-names").val());
            });
            setupGoodSelect();
            $("#good-names").change(() => {
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

        setupScaleDomain();
        setupCanvas();
        setupSvg();
        setupTeleportAreas();
        setupPorts();
        setupPBZones();
        setupSelects();
    }

    function naReady(error, naMap, pbZones) {
        if (error) {
            throw error;
        }

        // Read map data
        defaults.portData = topojsonFeature(naMap, naMap.objects.ports).features;
        current.portData = defaults.portData;
        defaults.PBZoneData = topojsonFeature(pbZones, pbZones.objects.pbZones);
        defaults.fortData = topojsonFeature(pbZones, pbZones.objects.forts);
        defaults.towerData = topojsonFeature(pbZones, pbZones.objects.towers);

        setup();
        zoomAndPan(initial.transform);
        //updatePorts(current.portData.filter(d => ["234", "237", "238", "239", "240"].includes(d.id)));
        updatePorts();

        $("form").submit(function(event) {
            const x = $("#x-coord").val(),
                z = $("#z-coord").val();
            goToF11(x, z);
            event.preventDefault();
        });
        $("#reset").on("click", function() {
            clearMap();
        });
        $(".radio-group").change(function() {
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

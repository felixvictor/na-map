/*
 Draws teleport map for Naval Action

 iB 2017
 */

import { feature as topojsonFeature } from "topojson-client";
import moment from "moment";
import "moment/locale/en-gb";
import "jquery-knob";

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

    let defaults = {
        margin: { top: parseInt($(".navbar").css("height")), right: 20, bottom: 20, left: 20 },
        coord: {
            min: 0,
            max: 8192
        },
        maxScale: 10,
        fontSize: 16,
        circleSize: 10,
        iconSize: 50,
        PBZoneZoomScale: 1.5,
        labelZoomScale: 0.5,
        highlightDuration: 200,
        mapJson: `${serverName}.json`,
        pbJson: "pb.json",
        shipJson: "ships.json",
        imageSrc: "images/na-map.jpg",
        image: new Image(),
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
        ]
    };
    defaults.width = top.innerWidth - defaults.margin.left - defaults.margin.right;
    defaults.height = top.innerHeight - defaults.margin.top - defaults.margin.bottom;
    defaults.minScale = Math.min(defaults.width / defaults.coord.max, defaults.height / defaults.coord.max);
    let initial = {
        scale: defaults.minScale,
        x: -defaults.coord.max / 2 * defaults.minScale,
        y: -defaults.coord.max / 2 * defaults.minScale
    };
    initial.transform = d3.zoomIdentity.translate(initial.x, initial.y).scale(initial.scale);
    defaults.xScale = d3
        .scaleLinear()
        .clamp(true)
        .range([0, defaults.width]);
    defaults.yScale = d3
        .scaleLinear()
        .clamp(true)
        .range([0, defaults.height]);
    defaults.coord.voronoi = [
        [defaults.coord.min - 1, defaults.coord.min - 1],
        [defaults.coord.max + 1, defaults.coord.max + 1]
    ];
    // limit how far away the mouse can be from finding a voronoi site
    defaults.voronoiRadius = Math.min(defaults.height, defaults.width);

    let current = {
        transform: { x: initial.x, y: initial.y, scale: initial.scale },
        fontSize: defaults.fontSize,
        circleSize: defaults.circleSize,
        highlightId: null,
        bPBZoneDisplayed: false,
        bPortLabelDisplayed: true,
        bFirstCoord: true,
        radioButton: "compass",
        lineData: [],
        shipAData: {},
        shipBData: {}
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

    // https://stackoverflow.com/questions/7490660/converting-wind-direction-in-angles-to-text-words
    function degreesToCompass(degrees) {
        const val = Math.floor(degrees / 22.5 + 0.5);
        return defaults.compassDirections[val % 16];
    }

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
                return (
                    defaults.transformMatrixInv.A * x +
                    defaults.transformMatrixInv.B * y +
                    defaults.transformMatrixInv.C
                );
            }

            // svg coord to F11 coord
            function convertInvCoordY(x, y) {
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

        let x = (mx - tx) / tk,
            y = (my - ty) / tk;

        if (current.radioButton === "F11") {
            printCoord(x, y);
        } else {
            plotCourse(x, y);
        }

        zoomAndPan(d3.zoomIdentity.translate(-x, -y).scale(1));
    }

    function plotCourse(x, y, style = "course") {
        function printCompass(x, y, style) {
            const compassSize = "course" === style ? 100 : 30;

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
            // https://stackoverflow.com/questions/9970281/java-calculating-the-angle-between-two-points-in-degrees
            function rotationAngleInDegrees(centerPt, targetPt) {
                // Converts from radians to degrees
                // http://cwestblog.com/2012/11/12/javascript-degree-and-radian-conversion/
                Math.radiansToDegrees = function(radians) {
                    return radians * 180 / Math.PI;
                };

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
        if (current.bFirstCoord) {
            printCompass(x, y, style);
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
        F11X *= -1;
        F11Y *= -1;
        const x = convertCoordX(F11X, F11Y),
            y = convertCoordY(F11X, F11Y);

        clearMap();
        if (current.radioButton === "F11") {
            printF11Coord(x, y, F11X, F11Y);
        } else {
            plotCourse(x, y);
        }
        zoomAndPan(d3.zoomIdentity.translate(-x, -y).scale(1));
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
                h += " (county capital)";
            }
            if (d.capturer) {
                h += ` captured by ${d.capturer} ${moment(d.lastPortBattle).fromNow()}`;
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

        current.transform.x = transform.x;
        current.transform.y = transform.y;
        current.transform.scale = transform.k;
        transform.x += defaults.width / 2;
        transform.y += defaults.height / 2;

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

                zoomAndPan(d3.zoomIdentity.translate(-x, -y).scale(1));
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
        moment.locale("en-gb");
    }

    function predictWind(currentWind, predictTime) {
        function compassToDegrees(compass) {
            const degree = 360 / defaults.compassDirections.length;
            return defaults.compassDirections.indexOf(compass) * degree;
        }

        function printPredictedWind(predictedWindDegrees, predictTime, currentWind, currentTime) {
            function printWindLine(x, dx, y, dy, degrees) {
                const compass = degreesToCompass(degrees);

                current.lineData.push([x + dx / 2, y + dy / 2]);
                current.lineData.push([x - dx / 2, y - dy / 2]);

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
                    height = Math.max(bbox1.height, bbox2.height) * 2 + defaults.fontSize,
                    width = Math.max(bbox1.width, bbox2.width) + defaults.fontSize;
                svg
                    .attr("x", x - width / 2)
                    .attr("y", y + 20)
                    .attr("height", height)
                    .attr("width", width);
                rect
                    .attr("x", x - width / 2)
                    .attr("y", y - 20 - defaults.fontSize / 2)
                    .attr("height", height + 40 + defaults.fontSize)
                    .attr("width", width);
            }

            const targetScale = 4,
                scale = targetScale / current.transform.scale,
                x = -current.transform.x * scale,
                xCompass = -current.transform.x / current.transform.scale - defaults.width / 25,
                y = -current.transform.y * scale,
                yCompass = -current.transform.y / current.transform.scale - defaults.height / 25,
                length = 40,
                radians = Math.PI / 180 * (predictedWindDegrees - 90),
                dx = length * Math.cos(radians),
                dy = length * Math.sin(radians);

            clearMap();
            plotCourse(xCompass, yCompass, "wind");
            printWindLine(xCompass, dx, yCompass, dy, predictedWindDegrees);
            zoomAndPan(d3.zoomIdentity.translate(-x, -y).scale(targetScale));
        }

        const secondsForFullCircle = 48 * 60,
            fullCircle = 360,
            degreesPerSecond = fullCircle / secondsForFullCircle;
        let currentWindDegrees;

        const regex = /(\d+)[\s:.](\d+)/;
        let match = regex.exec(predictTime),
            predictHours = parseInt(match[1]),
            predictMinutes = parseInt(match[2]);

        // Set current wind in degrees
        if (isNaN(currentWind)) {
            currentWindDegrees = compassToDegrees(currentWind);
        } else {
            currentWindDegrees = +currentWind;
        }

        let currentDate = moment()
                .utc()
                .seconds(0)
                .milliseconds(0),
            predictDate = moment(currentDate)
                .hour(predictHours)
                .minutes(predictMinutes);
        if (predictDate.isBefore(currentDate)) {
            predictDate.add(1, "day");
        }

        let timeDiffInSec = predictDate.diff(currentDate, "seconds");
        let predictedWindDegrees = Math.abs(currentWindDegrees - degreesPerSecond * timeDiffInSec + 360) % 360;

        //console.log(`currentWind: ${currentWind} currentWindDegrees: ${currentWindDegrees}`);
        //console.log(`   currentDate: ${currentDate.format()} predictDate: ${predictDate.format()}`);
        //console.log(`   predictedWindDegrees: ${predictedWindDegrees} predictTime: ${predictTime}`);
        printPredictedWind(predictedWindDegrees, predictDate.format("H.mm"), currentWind, currentDate.format("H.mm"));
    }

    function shipCompare() {
        function shipCompareSetup() {
            function setupShipSelect(id) {
                const shipSelect = $(id);
                const selectShips = defaults.shipData.sort(function(a, b) {
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

            const width = 350,
                height = 350;
            defaults.svgShipA = d3
                .select("#shipA")
                .append("svg")
                .attr("width", width)
                .attr("height", height)
                .attr("class", "profile")
                .attr("fill", "none")
                .append("g")
                .attr("transform", `translate(${width / 2}, ${height / 2})`);
            defaults.svgShipB = d3
                .select("#shipB")
                .append("svg")
                .attr("width", width)
                .attr("height", height)
                .attr("class", "profile")
                .attr("fill", "none")
                .append("g")
                .attr("transform", `translate(${width / 2}, ${height / 2})`);
            defaults.svgShipCompare = d3
                .select("#ship-compare")
                .append("svg")
                .attr("width", width)
                .attr("height", height)
                .attr("class", "profile")
                .attr("fill", "none")
                .append("g")
                .attr("transform", `translate(${width / 2}, ${height / 2 + 20})`);
        }

        function shipSelected(shipId, shipNumber) {
            function isEmpty(obj) {
                return Object.getOwnPropertyNames(obj).length === 0 && obj.constructor === Object;
            }

            function drawProfile(profileData, svg) {
                let width = +svg.attr("width"),
                    height = +svg.attr("height"),
                    outerRadius = Math.min(width, height) / 2,
                    innerRadius = 0.3 * outerRadius;

                const colorScale = d3
                    .scaleLinear()
                    .domain([profileData.minSpeed, 0, 10, 12, profileData.maxSpeed])
                    .range(["#a62e39", "#fbf8f5", "#2a6838", "#419f57", "#6cc380"])
                    .interpolate(d3.interpolateHcl);

                let pie = d3
                    .pie()
                    .sort(null)
                    .value(1);
                const arcs = pie(profileData.speedDegrees);

                const radiusScaleRelative = d3
                    .scaleLinear()
                    .domain([profileData.minSpeed, 0, profileData.maxSpeed])
                    .range([10, innerRadius, outerRadius]);

                const radiusScaleAbsolute = d3
                    .scaleLinear()
                    .domain([minSpeed, 0, maxSpeed])
                    .range([10, innerRadius, outerRadius]);

                // Extra scale since the color scale is interpolated
                const gradientScale = d3
                    .scaleLinear()
                    .domain([minSpeed, maxSpeed])
                    .range([0, width]);

                // Calculate the variables for the gradient
                const numStops = 30;
                let gradientDomain = gradientScale.domain();
                gradientDomain[2] = gradientDomain[1] - gradientDomain[0];
                let gradientPoint = [];
                for (let i = 0; i < numStops; i++) {
                    gradientPoint.push(i * gradientDomain[2] / (numStops - 1) + gradientDomain[0]);
                } //for i

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
                    .attr("offset", function(d, i) {
                        return gradientScale(gradientPoint[i]) / width;
                    })
                    .attr("stop-color", function(d, i) {
                        return colorScale(gradientPoint[i]);
                    });

                // Arc for text
                let knotsArc = d3
                    .arc()
                    .outerRadius(d => radiusScaleAbsolute(d) + 2)
                    .innerRadius(d => radiusScaleAbsolute(d) + 1)
                    .startAngle(-Math.PI / 2)
                    .endAngle(Math.PI / 2);

                // Tick/Grid data
                const ticks = [12, 8, 4, 0];
                const tickLabels = ["12 knots", "8 knots", "4 knots", "0 knots"];

                //Add the circles for each tick
                let grid = svg
                    .selectAll(".circle")
                    .data(ticks)
                    .enter()
                    .append("circle")
                    .attr("class", "knots-circle")
                    .attr("r", d => radiusScaleAbsolute(d))
                    .attr("id", (d, i) => `tick${i}`);

                //Add the paths for the text
                svg
                    .selectAll(".label")
                    .data(ticks)
                    .enter()
                    .append("path")
                    .attr("d", knotsArc)
                    .attr("id", (d, i) => `tic${i}`);

                //And add the text
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

                const numSegments = 25,
                    segmentRadians = 2 * Math.PI / numSegments;
                let curve = d3.curveCatmullRomClosed,
                    line = d3
                        .radialLine()
                        .angle((d, i) => i * segmentRadians)
                        .radius(d => radiusScaleAbsolute(d.data))
                        .curve(curve);
                let path = svg.append("path");
                let markers = svg.append("g").attr("class", "markers");
                path
                    .attr("d", line(arcs))
                    .attr("stroke-width", "5px")
                    .attr("stroke", "url(#gradient)");

                let sel = markers.selectAll("circle").data(arcs);
                sel
                    .enter()
                    .append("circle")
                    .merge(sel)
                    .attr("r", "5")
                    .attr("cy", (d, i) => Math.cos(i * segmentRadians) * -radiusScaleAbsolute(d.data))
                    .attr("cx", (d, i) => Math.sin(i * segmentRadians) * radiusScaleAbsolute(d.data))
                    .attr("fill", d => colorScale(d.data))
                    .style("opacity", 0.5)
                    .append("title")
                    .text(d => `${Math.round(d.data * 10) / 10} knots`);
            }

            function drawDifferenceProfile() {
                let width = 350,
                    height = 350,
                    outerRadius = Math.min(width, height) / 2,
                    innerRadius = 0.3 * outerRadius;

                const colorScale = d3
                    .scaleLinear()
                    .domain(["A", "B"])
                    .range(["#a62e39", "#fbf8f5", "#2a6838", "#419f57", "#6cc380"]);

                svg.select("g").remove();
                let pie = d3
                    .pie()
                    .sort(null)
                    .value(1);
                const arcsA = pie(current.shipAData.speedDegrees),
                    arcsB = pie(current.shipBData.speedDegrees);

                const radiusScaleRelative = d3
                    .scaleLinear()
                    .domain([profileData.minSpeed, 0, profileData.maxSpeed])
                    .range([10, innerRadius, outerRadius]);

                const radiusScaleAbsolute = d3
                    .scaleLinear()
                    .domain([minSpeed, 0, maxSpeed])
                    .range([10, innerRadius, outerRadius]);

                let svg = defaults.svgShipCompare;

                // Arc for text
                let knotsArc = d3
                    .arc()
                    .outerRadius(d => radiusScaleAbsolute(d) + 2)
                    .innerRadius(d => radiusScaleAbsolute(d) + 1)
                    .startAngle(-Math.PI / 2)
                    .endAngle(Math.PI / 2);

                // Tick/Grid data
                const ticks = [12, 8, 4, 0];
                const tickLabels = ["12 knots", "8 knots", "4 knots", "0 knots"];

                //Add the circles for each tick
                let grid = svg
                    .selectAll(".circle")
                    .data(ticks)
                    .enter()
                    .append("circle")
                    .attr("class", "knots-circle")
                    .attr("r", d => radiusScaleAbsolute(d))
                    .attr("id", (d, i) => `tick${i}`);

                //Add the paths for the text
                svg
                    .selectAll(".label")
                    .data(ticks)
                    .enter()
                    .append("path")
                    .attr("d", knotsArc)
                    .attr("id", (d, i) => `tic${i}`);

                //And add the text
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

                const numSegments = 25,
                    segmentRadians = 2 * Math.PI / numSegments;
                let curve = d3.curveCatmullRomClosed,
                    line = d3
                        .radialLine()
                        .angle((d, i) => i * segmentRadians)
                        .radius(d => radiusScaleAbsolute(d.data))
                        .curve(curve);

                let pathA = svg.append("path");
                let pathB = svg.append("path");
                let markersA = svg.append("g").attr("class", "markers");
                let markersB = svg.append("g").attr("class", "markers");

                pathA
                    .transition()
                    .attr("d", line(arcsA))
                    .attr("class", "arcs arcsA");

                let selA = markersA.selectAll("circle").data(arcsA);
                selA
                    .enter()
                    .append("circle")
                    .merge(selA)
                    .attr("r", "5")
                    .attr("cy", (d, i) => Math.cos(i * segmentRadians) * -radiusScaleAbsolute(d.data))
                    .attr("cx", (d, i) => Math.sin(i * segmentRadians) * radiusScaleAbsolute(d.data))
                    .attr("fill", d => colorScale(d.data))
                    .style("opacity", 0.2)
                    .append("title")
                    .text(d => `${Math.round(d.data * 10) / 10} knots`);

                pathB.attr("d", line(arcsB)).attr("class", "arcs arcsB");

                let selB = markersB.selectAll("circle").data(arcsB);
                selB
                    .enter()
                    .append("circle")
                    .merge(selB)
                    .attr("r", "5")
                    .attr("cy", (d, i) => Math.cos(i * segmentRadians) * -radiusScaleAbsolute(d.data))
                    .attr("cx", (d, i) => Math.sin(i * segmentRadians) * radiusScaleAbsolute(d.data))
                    .attr("fill", d => colorScale(d.data))
                    .style("opacity", 0.2)
                    .append("title")
                    .text(d => `${Math.round(d.data * 10) / 10} knots`);
            }

            //console.log(`ship id: ${shipId}`);
            let profileData = defaults.shipData.filter(ship => ship.id === +shipId)[0];
            let svg;
            if ("A" === shipNumber) {
                current.shipAData = profileData;
                svg = defaults.svgShipA;
            } else {
                current.shipBData = profileData;
                svg = defaults.svgShipB;
            }
            //console.log(`profileData: ${JSON.stringify(profileData)}`);
            drawProfile(profileData, svg);
            if (!isEmpty(current.shipAData) && !isEmpty(current.shipBData)) {
                console.log("compare");
                drawDifferenceProfile();
            }
        }
        //console.log(`shipData: ${JSON.stringify(defaults.shipData)}`);

        const minSpeed = d3.min(defaults.shipData, d => d.minSpeed);
        const maxSpeed = d3.max(defaults.shipData, d => d.maxSpeed);
        console.log(`minSpeed: ${minSpeed}`);
        console.log(`maxSpeed: ${maxSpeed}`);

        shipCompareSetup();
    }

    function naReady(error, naMap, pbZones, shipData) {
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
        defaults.shipData = shipData.shipData;

        //setup();
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

        $("#f11").submit(function(event) {
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
            draw: function() {
                $(this.i).css("class", "knob");
            },
            format: input => degreesToCompass(input)
        });
        $("#windPrediction").submit(function(event) {
            const currentWind = $("#direction")
                    .val()
                    .toUpperCase(),
                time = $("#time").val();
            predictWind(currentWind, time);
            $("#predictDropdown").dropdown("toggle");
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

    /*
        profileData.shipData.forEach((d, i) => {
            drawProfile(d, i);
        });
        */

    d3
        .queue()
        //.defer(d3.json, defaults.mapJson)
        .defer(d3.json, "eu1.json")
        .defer(d3.json, defaults.pbJson)
        .defer(d3.json, defaults.shipJson)
        .await(naReady);
}

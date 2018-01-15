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
    let mainGPort, mainGPBZone, mainGVoronoi, mainGCoord, gCompass, naVoronoiDiagram, pathVoronoi, naTeleportPorts;

    let defaults = {
        margin: { top: parseInt($(".navbar").css("height")), right: 20, bottom: 20, left: 20 },
        coord: {
            min: 0,
            max: 8192
        },
        maxScale: 10,
        fontSize: 6,
        circleSize: 2,
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
        nation: ""
    };

    const thousandsWithBlanks = x => {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u202f");
    };

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

        //https://stackoverflow.com/questions/14718561/how-to-check-if-a-number-is-between-two-values
        Number.prototype.between = function(a, b, inclusive) {
            const min = Math.min.apply(Math, [a, b]),
                max = Math.max.apply(Math, [a, b]);
            return inclusive ? this >= min && this <= max : this > min && this < max;
        };

        F11X = +F11X * -1;
        F11Y = +F11Y * -1;
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
            zoomAndPan(d3.zoomIdentity.translate(-x, -y).scale(1));
        }
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
                if (!mainGPBZone.active) {
                    setupPBZones();
                    mainGPBZone.active = true;
                } else {
                    mainGPBZone.remove();
                    mainGPBZone = naSvg.append("g").attr("class", "pb");
                    mainGPBZone.active = false;
                }
            }

            if (defaults.PBZoneZoomScale < scale) {
                if (!current.bPBZoneDisplayed) {
                    naTogglePBZones();
                    toggleDisplayTeleportAreas();
                    current.highlightId = null;
                    current.bPBZoneDisplayed = true;
                }
            } else {
                if (current.bPBZoneDisplayed) {
                    naTogglePBZones();
                    toggleDisplayTeleportAreas();
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
            updatePorts(scale);
        }

        let transform = d3.event.transform;
        //console.log(`transform: ${JSON.stringify(transform)}`);

        configureMap(transform.k);
        naDisplayCountries(transform);

        mainGVoronoi.attr("transform", transform);
        mainGPBZone.attr("transform", transform);
        mainGCoord.attr("transform", transform);

        if (current.bPortLabelDisplayed) {
            if (current.highlightId && !current.bPBZoneDisplayed) {
                naVoronoiHighlight();
            }
        }
    }

    function updatePorts(scale = current.transform.scale) {
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
                    case "Small":
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
        let circle = mainGPort.selectAll("circle").data(current.portData, d => d.id);
        let text = mainGPort.selectAll("text").data(current.portData, d => d.id);

        // Remove old circles
        circle.exit().remove();
        // Remove old text
        text.exit().remove();

        // Update kept circles
        console.log(`defaults.circleSize ${defaults.circleSize}`);
        console.log(`  scale ${scale}`);
        console.log(`  vor current.circleSize ${current.circleSize}`);
        current.circleSize = defaults.circleSize / scale;
        console.log(`  nach current.circleSize ${current.circleSize}`);
        circle.attr("r", current.circleSize);
        // Update kept texts
        if (current.bPortLabelDisplayed) {
            current.fontSize = defaults.fontSize / scale;
            text.style("font-size", current.fontSize);
        }

        // Add new circles
        circle
            .enter()
            .append("circle")
            .attr("id", d => {
                return `c${d.id}`;
            })
            .attr("cx", d => defaults.xScale(d.geometry.coordinates[0]))
            .attr("cy", d => defaults.yScale(d.geometry.coordinates[1]))
            .attr("r", current.circleSize)
            .attr("fill", d => {
                const icon = d.properties.availableForAll ? `${d.properties.nation}a` : d.properties.nation;
                return `url(#${icon})`;
            })
            .on("mouseover", portMouseover);

        // Add new texts
        if (current.bPortLabelDisplayed) {
            text
                .enter()
                .append("text")
                .attr("x", d => defaults.xScale(d.geometry.coordinates[0] - d.properties.dx))
                .attr("y", d => defaults.yScale(d.geometry.coordinates[1] - d.properties.dy))
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
        }
    }

    function toggleDisplayTeleportAreas() {
        if (!mainGVoronoi.active) {
            setupTeleportAreas();
            mainGVoronoi.active = true;
        } else {
            mainGVoronoi.remove();
            mainGVoronoi = naSvg.append("g").attr("class", "voronoi");
            mainGVoronoi.active = false;
        }
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
        current.transform.x = transform.x;
        current.transform.y = transform.y;
        current.transform.scale = transform.k;
        transform.x += defaults.width / 2;
        transform.y += defaults.height / 2;

        naSvg.call(naZoom.transform, transform);
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
            mainGPBZone = naSvg.append("g").attr("class", "pb");
            mainGCoord = naSvg.append("g").attr("class", "coord");
        }

        function setupPorts() {
            defaults.nations.map(d => d.id).forEach(function(nation) {
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
                        text: "Go to a port"
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
            $("#port-names").on("change", () => {
                const value = $("#port-names").val();
                if (0 !== +value) {
                    goToPort(value);
                } else {
                    zoomAndPan(d3.zoomIdentity.translate(initial.x, initial.y).scale(initial.scale));
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
                    .sort(function(a, b) {
                        if (a.sortName < b.sortName) {
                            return -1;
                        }
                        if (a.sortName > b.sortName) {
                            return 1;
                        }
                        return 0;
                    })
                    .forEach(function(nation) {
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

                if (0 !== +nationId) {
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

            function setupClanSelect() {
                const propClan = $("#prop-clan");

                propClan.empty();
                propClan.append(
                    $("<option>", {
                        value: 0,
                        text: "Select a clan"
                    })
                );

                let clanList = new Set();
                current.portData.filter(d => d.properties.capturer).map(d => clanList.add(d.properties.capturer));
                Array.from(clanList)
                    .sort()
                    .forEach(function(clan) {
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

                if (0 !== +clan) {
                    current.portData = defaults.portData.filter(d => clan === d.properties.capturer);
                } else {
                    if (current.nation) {
                        current.portData = defaults.portData.filter(d => current.nation === d.properties.nation);
                    } else {
                        current.portData = defaults.portData;
                    }
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
                let cmList = new Set();
                current.portData
                    .filter(d => d.properties.capturer)
                    .map(d => cmList.add(d.properties.conquestMarksPension));
                cmList.forEach(function(cm) {
                    propCM.append(
                        $("<option>", {
                            value: cm,
                            text: cm
                        })
                    );
                });
            }

            function CMSelect() {
                const value = parseInt($("#prop-cm").val());

                if (0 !== value) {
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

        setupScaleDomain();
        setupCanvas();
        setupSvg();
        setupPorts();
        toggleDisplayTeleportAreas();
        setupSelects();
        setupPropertyMenu();
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
                e.clipboardData && e.clipboardData.getData
                    ? e.clipboardData.getData("text/plain") // Standard
                    : window.clipboardData && window.clipboardData.getData
                      ? window.clipboardData.getData("Text") // MS
                      : false;

            // If one of the F11 input elements is in focus
            if ("x-coord" === document.activeElement.id || "z-coord" === document.activeElement.id) {
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

        $("#copy-coord").click(function() {
            const x = $("#x-coord").val(),
                z = $("#z-coord").val();

            if (!Number.isNaN(x) && !Number.isNaN(z)) {
                const F11String = `F11 coordinates X: ${x} Z: ${z}`;
                copyF11ToClipboard(F11String);
            }
        });

        document.addEventListener("paste", function(event) {
            pasteF11FromClipboard(event);
            event.preventDefault();
        });

        $("#f11").submit(function(event) {
            const x = $("#x-coord").val(),
                z = $("#z-coord").val();
            console.log("F11");
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

    d3
        .queue()
        .defer(d3.json, defaults.mapJson)
        .defer(d3.json, defaults.pbJson)
        .await(naReady);
}

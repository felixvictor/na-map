/*
 Draws teleport map for Naval Action

 iB 2017
 */

import { feature as topojsonFeature } from "topojson-client";

import "bootstrap/js/dist/collapse";
import "bootstrap/js/dist/tooltip";
import "bootstrap/js/dist/util";

export default function naDisplay(serverName) {
    let naSvg, naCanvas, naContext, naDefs, naZoom;
    let gPorts,
        gPBZones,
        gVoronoi,
        gCoord,
        gCompass,
        naVoronoiDiagram,
        pathVoronoi,
        naTeleportPorts,
        naPort,
        naPortLabel;
    let naPortData, naPBZoneData, naFortData, naTowerData;
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
    let IsPBZoneDisplayed = false,
        HasLabelRemoved = false;
    const defaultFontSize = 16;
    let currentFontSize = defaultFontSize;
    const defaultCircleSize = 10;
    let currentCircleSize = defaultCircleSize;
    // limit how far away the mouse can be from finding a voronoi site
    const voronoiRadius = Math.min(naHeight, naWidth);
    let radioButton = "compass",
        firstCoord = true,
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

        naDefs = naSvg.append("defs");

        gVoronoi = naSvg.append("g").attr("class", "voronoi");
        gPorts = naSvg.append("g").attr("class", "port");
        gPBZones = naSvg
            .append("g")
            .attr("class", "pb")
            .style("display", "none");
        gCoord = naSvg.append("g").attr("class", "coord");
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

            gCoord
                .append("image")
                .attr("class", "compass")
                .attr("x", x)
                .attr("y", y)
                .attr("transform", `translate(${-compassSize / 2},${-compassSize / 2})`)
                .attr("height", compassSize)
                .attr("width", compassSize)
                .attr("xlink:href", "icons/compass.svg");
            gCompass = gCoord.append("path");
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

            const svg = gCoord
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
        if (firstCoord) {
            printCompass(x, y);
            firstCoord = !firstCoord;
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

    const formatCoord = x => {
        const thousandsWithBlanks = x => {
            return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "\u2009");
        };

        let r = thousandsWithBlanks(Math.abs(Math.trunc(x)));
        if (x < 0) {
            r = `\u2212\u2009${r}`;
        }
        return r;
    };

    function printF11Coord(x, y, textX, textY) {
        let g = gCoord.append("g").attr("transform", `translate(${x},${y})`);
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
            if (!IsPBZoneDisplayed) {
                naTogglePBZones();
                naToggleDisplayTeleportAreas();
                highlightId = null;
                IsPBZoneDisplayed = true;
            }
        } else {
            if (IsPBZoneDisplayed) {
                naTogglePBZones();
                naToggleDisplayTeleportAreas();
                IsPBZoneDisplayed = false;
            }
        }

        if (labelZoomScale > scale) {
            if (!HasLabelRemoved) {
                naRemoveLabel();
                HasLabelRemoved = true;
            }
        } else {
            if (HasLabelRemoved) {
                naDisplayLabel();
                HasLabelRemoved = false;
            }
        }
    }

    function naZoomed() {
        let transform = d3.event.transform;

        naSetupMap(transform.k);
        naDisplayCountries(transform);

        gPorts.attr("transform", transform);
        gVoronoi.attr("transform", transform);
        gPBZones.attr("transform", transform);
        gCoord.attr("transform", transform);

        currentCircleSize = defaultCircleSize / transform.k;
        gPorts.selectAll("circle").attr("r", currentCircleSize);
        gPorts.selectAll("text").attr("dx", d => d.properties.dx / transform.k);
        gPorts.selectAll("text").attr("dy", d => d.properties.dy / transform.k);
        if (!HasLabelRemoved) {
            currentFontSize = defaultFontSize / transform.k;
            gPorts.selectAll("text").style("font-size", currentFontSize);
            if (highlightId && !IsPBZoneDisplayed) {
                naVoronoiHighlight();
            }
        }
    }

    function naDisplayPorts() {
        function naTooltipData(d) {
            let h = `<table><tbody<tr><td><i class='flag-icon ${d.nation}'></i></td>`;
            h += `<td class='port-name'>${d.name}</td></tr></tbody></table>`;
            h += `<p>${d.shallow ? "Shallow" : "Deep"}`;
            h += " water port";
            if (d.countyCapital) {
                h += ", county capital";
            }
            if (d.capturer) {
                h += `, owned by ${d.capturer}`;
            }
            h += "<br>";
            if (!d.nonCapturable) {
                h += `Port battle: ${d.brLimit} BR limit, `;
                switch (d.portBattleType) {
                    case "Large":
                        h += "1st";
                        break;
                    case "Medium":
                        h += "4th";
                        break;
                    case "Small":
                        h += "6th";
                        break;
                }
                h += " rate AI ships";
                h += `, ${d.conquestMarksPension} conquest point`;
                h += d.conquestMarksPension > 1 ? "s" : "";
            } else {
                h += "Not capturable";
            }
            h += `<br>${d.portTax * 100}% port tax`;
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

        const nations = ["DE", "DK", "ES", "FR", "FT", "GB", "NT", "PL", "PR", "RU", "SE", "US", "VP"];

        nations.forEach(function(nation) {
            naDefs
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

        naPort = gPorts
            .selectAll(".port")
            .data(naPortData.features)
            .enter()
            .append("g")
            .attr("transform", d => `translate(${d.geometry.coordinates[0]},${d.geometry.coordinates[1]})`);

        // Port flags
        naPort
            .append("circle")
            .attr("id", d => `c${d.id}`)
            .attr("r", currentCircleSize)
            .attr("fill", d => `url(#${d.properties.nation})`)
            .on("mouseover", function(d) {
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
            });
        naDisplayLabel();
    }

    function naDisplayLabel() {
        naPort
            .append("text")
            .attr("dx", d => d.properties.dx)
            .attr("dy", d => d.properties.dy)
            .attr("orig-dx", d => d.properties.dx)
            .attr("orig-dy", d => d.properties.dy)
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

    function naRemoveLabel() {
        gPorts.selectAll("text").remove();
    }

    function naSetupPBZones() {
        gPBZones
            .append("path")
            .datum(naPBZoneData)
            .attr("class", "pb-zone")
            .attr("d", d3.geoPath().pointRadius(4));

        gPBZones
            .append("path")
            .datum(naTowerData)
            .attr("class", "tower")
            .attr("d", d3.geoPath().pointRadius(2));

        gPBZones
            .append("path")
            .datum(naFortData)
            .attr("class", "fort")
            .attr("d", d3.geoPath().pointRadius(2));
    }

    function naTogglePBZones() {
        gPBZones.style("display", gPBZones.active ? "none" : "inherit");
        gPBZones.active = !gPBZones.active;
    }

    function naSetupTeleportAreas() {
        // Extract port coordinates
        naTeleportPorts = naPortData.features
            // Use only ports that deep water ports and not a county capital
            .filter(d => !d.properties.shallow && !d.properties.countyCapital)
            // Map to coordinates array
            .map(d => ({
                id: d.id,
                coord: { x: d.geometry.coordinates[0], y: d.geometry.coordinates[1] }
            }));

        pathVoronoi = gVoronoi
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
        gVoronoi.style("display", gVoronoi.active ? "none" : "inherit");
        gVoronoi.active = !gVoronoi.active;
    }

    function naVoronoiHighlight() {
        gVoronoi.selectAll("path").attr("class", function() {
            return d3.select(this).attr("id") === `v${highlightId}` ? "highlight-voronoi" : "";
        });
        gPorts
            .selectAll("circle")
            .transition()
            .duration(highlightDuration)
            .attr("r", d => {
                return d.id === highlightId ? currentCircleSize * 3 : currentCircleSize;
            });
        if (!HasLabelRemoved) {
            gPorts
                .selectAll("text")
                .transition()
                .duration(highlightDuration)
                .attr("dx", d => {
                    return d.id === highlightId ? d.properties.dx * 3 : d.properties.dx;
                })
                .attr("dy", d => {
                    return d.id === highlightId ? d.properties.dy * 3 : d.properties.dy;
                })
                .style("font-size", d => {
                    return d.id === highlightId ? currentFontSize * 2 : currentFontSize;
                });
        }
    }

    function naZoomAndPan(transform) {
        naSvg
            .transition()
            .delay(500)
            .duration(500)
            .call(naZoom.transform, transform);
    }

    function naClearMap() {
        gCoord.remove();
        gCoord = naSvg.append("g").attr("class", "coord");
        firstCoord = true;
        lineData.splice(0, lineData.length);
    }

    function setupSelects() {
        function setupPortSelect() {
            const portNames = $("#port-names");
            const selectPorts = naPortData.features
                .map(d => ({ id: d.id, name: d.properties.name }))
                .sort(function(a, b) {
                    if (a.name < b.name) {
                        return -1;
                    }
                    if (a.name > b.name) {
                        return 1;
                    }
                    return 0;
                });
            selectPorts.forEach(function(port) {
                let option = document.createElement("option");
                option.text = port.id;
                option.innerHTML = port.name;
                portNames.append(option);
            });
        }

        function setupGoodSelect() {
            const goodNames = $("#port-names");
            const selectGoods = {};
            const goods = naPortData.features.map(d => ({
                id: d.id,
                drops: d.properties.drops,
                produces: d.properties.produces
            }));
            console.log(`goods: ${JSON.stringify(goods)}`);
            selectGoods.forEach(function(good) {
                let option = document.createElement("option");
                option.text = good.id;
                option.innerHTML = good.name;
                goodNames.append(option);
            });
        }
        setupPortSelect();
        setupGoodSelect();
    }

    function naReady(error, naMap, pbZones) {
        if (error) {
            throw error;
        }

        // Read map data
        naPortData = topojsonFeature(naMap, naMap.objects.ports);
        naPBZoneData = topojsonFeature(pbZones, pbZones.objects.pbzones);
        naFortData = topojsonFeature(pbZones, pbZones.objects.forts);
        naTowerData = topojsonFeature(pbZones, pbZones.objects.towers);

        naSetupCanvas();
        naSetupSvg();
        naSetupTeleportAreas();
        naDisplayPorts();
        naSetupPBZones();
        setupSelects();
        naZoomAndPan(initialTransform);

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

    d3
        .queue()
        .defer(d3.json, naMapJson)
        .defer(d3.json, pbJson)
        .await(naReady);
}

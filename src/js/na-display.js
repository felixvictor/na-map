/*
    Draws teleport map for Naval Action

    iB 2017
 */
/*
    Draws teleport map for Naval Action

    iB 2017
 */

import { queue as d3Queue } from "d3-queue";
import { geoPath as d3GeoPath } from "d3-geo";
import { json as d3Json, request as d3Request } from "d3-request";
// event needs live-binding
import { event as currentD3Event, mouse as currentD3mouse, select as d3Select } from "d3-selection";
import { voronoi as d3Voronoi } from "d3-voronoi";
import { zoom as d3Zoom, zoomIdentity as d3ZoomIdentity } from "d3-zoom";

import { feature as topojsonFeature } from "topojson-client";

import "bootstrap/js/dist/tooltip";
import "bootstrap/js/dist/util";

export default function naDisplay(serverName) {
    const d3 = {
            json: d3Json,
            geoPath: d3GeoPath,
            queue: d3Queue,
            request: d3Request,
            select: d3Select,
            voronoi: d3Voronoi,
            zoom: d3Zoom,
            zoomIdentity: d3ZoomIdentity
        },
        topojson = {
            feature: topojsonFeature
        };

    let naSvg, naCanvas, naContext, naDefs, naZoom;
    let gPorts, gPBZones, gVoronoi, pathVoronoi, naPort;
    let naPortData, naPBZoneData, naFortData, naTowerData;
    const naMargin = { top: 20, right: 20, bottom: 20, left: 20 };

    const naWidth = top.innerWidth - naMargin.left - naMargin.right,
        naHeight = top.innerHeight - naMargin.top - naMargin.bottom;
    let IsZoomed = false,
        HasLabelRemoved = false;
    const iconSize = 50;
    const defaultFontSize = parseInt(window.getComputedStyle(document.getElementById("na")).fontSize);
    let currentFontSize = defaultFontSize;
    const lineHeight = parseInt(window.getComputedStyle(document.getElementById("na")).lineHeight);
    const defaultCircleSize = 10,
        defaultDx = 0,
        defaultDy = lineHeight * 1.1;
    let currentCircleSize = defaultCircleSize,
        currentDy = defaultDy;
    let naCurrentVoronoi, highlightId;
    let naImage = new Image();
    const naMapJson = serverName + ".json",
        pbJson = "pb.json",
        naImageSrc = "images/na-map.jpg";

    function naSetupCanvas() {
        function naStopProp() {
            if (currentD3Event.defaultPrevented) {
                currentD3Event.stopPropagation();
            }
        }

        naCanvas = d3
            .select("#na")
            .append("canvas")
            .attr("width", naWidth)
            .attr("height", naHeight)
            .style("position", "absolute")
            .style("top", naMargin.top + "px")
            .style("left", naMargin.left + "px")
            .on("click", naStopProp, true);
        naContext = naCanvas.node().getContext("2d");

        naSvg = d3
            .select("#na")
            .append("svg")
            .attr("id", "na-svg")
            .attr("width", naWidth)
            .attr("height", naHeight)
            .style("position", "absolute")
            .style("top", naMargin.top)
            .style("left", naMargin.left)
            .on("click", naStopProp, true);

        naZoom = d3
            .zoom()
            .scaleExtent([0.15, 10])
            .on("zoom", naZoomed);
        naSvg.call(naZoom);

        naDefs = naSvg.append("defs");
        gVoronoi = naSvg.append("g").attr("class", "voronoi");
        gPorts = naSvg.append("g").attr("class", "port");
    }

    function naDrawImage() {
        naContext.drawImage(naImage, 0, 0);
        naContext.getImageData(0, 0, naWidth, naHeight);
    }

    function naZoomed() {
        const PBZonesZoomExtent = 1.5;
        const labelZoomExtent = 0.5;

        let transform = currentD3Event.transform;

        function naZoomCountries() {
            naContext.save();
            naContext.clearRect(0, 0, naWidth, naHeight);
            naContext.translate(transform.x, transform.y);
            naContext.scale(transform.k, transform.k);
            naDrawImage();
            naContext.restore();
        }

        if (PBZonesZoomExtent < transform.k) {
            if (!IsZoomed) {
                naDisplayPBZones();
                naRemoveTeleportAreas();
                IsZoomed = true;
            }
        } else {
            if (IsZoomed) {
                naRemovePBZones();
                naDisplayTeleportAreas();
                IsZoomed = false;
            }
        }

        if (labelZoomExtent > transform.k) {
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

        naZoomCountries();
        gPorts.attr("transform", transform);
        gVoronoi.attr("transform", transform);
        if (IsZoomed) {
            gPBZones.attr("transform", transform);
        }

        currentCircleSize = defaultCircleSize / transform.k;
        gPorts.selectAll("circle").attr("r", currentCircleSize);
        if (!HasLabelRemoved) {
            currentDy = defaultDy / transform.k;
            currentFontSize = defaultFontSize / transform.k;
            gPorts
                .selectAll("text")
                .attr("dy", currentDy)
                .style("font-size", currentFontSize);
            if (highlightId) {
                naVoronoiHighlight(naCurrentVoronoi, highlightId);
            }
        }
    }

    function naDisplayCountries() {
        naImage.onload = function() {
            naDrawImage();
        };
        naImage.src = naImageSrc;
    }

    function naDisplayPorts() {
        function naTooltipData(d) {
            let h = "<table><tbody<tr><td><i class='flag-icon " + d.nation + "'></i></td>";
            h += "<td class='port-name'>" + d.name + "</td></tr></tbody></table>";
            h += "<p>" + (d.shallow ? "Shallow" : "Deep");
            h += " water port";
            if (d.countyCapital) {
                h += ", county capital";
            }
            if (d.capturer) {
                h += ", owned by " + d.capturer;
            }
            h += "<br>";
            if (!d.nonCapturable) {
                h += "Port battle: " + d.brLimit + " BR limit, ";
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
            } else {
                h += "Not capturable";
            }
            h += "</p>";
            h += "<table class='table table-sm'>";
            if (d.produces.length) {
                h += "<tr><td>Produces</td><td>" + d.produces.join(", ") + "</td></tr>";
            }
            if (d.drops.length) {
                h += "<tr><td>Drops</td><td>" + d.drops.join(", ") + "</tr>";
            }
            if (d.consumes.length) {
                h += "<tr><td>Consumes</td><td>" + d.consumes.join(", ") + "</tr>";
            }
            h += "</table>";

            return h;
        }

        const nations = ["DE", "DK", "ES", "FR", "FT", "GB", "NL", "NT", "PL", "PR", "RU", "SE", "US"];

        nations.forEach(function(nation) {
            naDefs
                .append("pattern")
                .attr("id", nation)
                .attr("width", "100%")
                .attr("height", "100%")
                .attr("viewBox", "0 0 " + iconSize + " " + iconSize)
                .append("image")
                .attr("height", iconSize)
                .attr("width", iconSize)
                .attr("href", "icons/" + nation + ".svg");
        });

        naPort = gPorts
            .selectAll(".port")
            .data(naPortData.features)
            .enter()
            .append("g")
            .attr("id", function(d) {
                return "p" + d.id;
            })
            .attr("transform", function(d) {
                return "translate(" + d.geometry.coordinates[0] + "," + d.geometry.coordinates[1] + ")";
            });

        // Port flags
        naPort
            .append("circle")
            .attr("r", defaultCircleSize)
            .attr("fill", function(d) {
                return "url(#" + d.properties.nation + ")";
            })
            .on("mouseover", function(d) {
                if (highlightId) {
                    naVoronoiHighlight(naCurrentVoronoi, highlightId);
                }
                d3
                    .select(this)
                    .attr("data-toggle", "tooltip")
                    .attr("title", function(d) {
                        return naTooltipData(d.properties);
                    });
                $("#p" + d.id + " circle")
                    .tooltip({
                        delay: { show: 100, hide: 100 },
                        html: true,
                        placement: "auto"
                    })
                    .tooltip("show");
            });
        naDisplayLabel();
    }

    function naDisplayLabel() {
        // Port text colour
        naPort
            .append("text")
            .attr("dx", defaultDx)
            .attr("dy", defaultDy)
            .text(function(d) {
                return d.properties.name;
            })
            .attr("class", function(d) {
                let f;
                if (!d.properties.shallow && !d.properties.countyCapital) {
                    f = "na-port-in";
                } else {
                    f = "na-port-out";
                }
                return f;
            });
    }

    function naRemoveLabel() {
        gPorts.selectAll("text").remove();
    }

    function naDisplayPBZones() {
        gPBZones = naSvg.append("g").attr("class", "pb");

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

    function naRemovePBZones() {
        gPBZones.remove();
    }

    function naDisplayTeleportAreas() {
        // Extract port coordinates
        let teleportPorts = naPortData.features
            // Use only ports that deep water ports and not a county capital
            .filter(d => !d.properties.shallow && !d.properties.countyCapital)
            // Map to coordinates array
            .map(d => ({ id: d.id, coord: { x: d.geometry.coordinates[0], y: d.geometry.coordinates[1] } }));

        pathVoronoi = gVoronoi
            .selectAll(".voronoi")
            .data(teleportPorts)
            .enter()
            .append("path");

        // limit how far away the mouse can be from finding a voronoi site
        const voronoiRadius = naWidth / 10;
        const naVoronoiDiagram = d3
            .voronoi()
            .extent([[-1, -1], [naWidth + 1, naHeight + 1]])
            .x(d => d.coord.x)
            .y(d => d.coord.y)(teleportPorts);

        // Draw teleport areas
        pathVoronoi
            .data(naVoronoiDiagram.polygons())
            .attr("d", d => (d ? "M" + d.join("L") + "Z" : null))
            .on("mouseover", function() {
                let ref = currentD3mouse(this);
                const mx = ref[0],
                    my = ref[1];

                // use the new diagram.find() function to find the voronoi site closest to
                // the mouse, limited by max distance defined by voronoiRadius
                const site = naVoronoiDiagram.find(mx, my, voronoiRadius);
                if (site) {
                    naCurrentVoronoi = pathVoronoi._groups[0][site.index];
                    highlightId = site.data.id;
                    naVoronoiHighlight(naCurrentVoronoi, highlightId);
                }
            })
            .on("mouseout", function() {
                if (highlightId) {
                    naVoronoiUnHighlight(naCurrentVoronoi, highlightId);
                }
            });
    }

    function naRemoveTeleportAreas() {
        pathVoronoi.remove();
    }

    function naVoronoiHighlight(voronoi, portId) {
        voronoi.classList.add("highlight-voronoi");
        d3
            .select("#p" + portId)
            .select("circle")
            .attr("r", currentCircleSize * 3);
        d3
            .select("#p" + portId)
            .select("text")
            .attr("dy", currentFontSize * 4)
            .style("font-size", currentFontSize * 2);
    }

    function naVoronoiUnHighlight(voronoi, portId) {
        voronoi.classList.remove("highlight-voronoi");
        d3
            .select("#p" + portId)
            .select("circle")
            .attr("r", currentCircleSize);
        d3
            .select("#p" + portId)
            .select("text")
            .attr("dy", currentDy)
            .style("font-size", currentFontSize);
    }

    function naReady(error, naMap, pbZones) {
        if (error) {
            throw error;
        }

        // Read map data
        naPortData = topojson.feature(naMap, naMap.objects.ports);
        naPBZoneData = topojson.feature(pbZones, pbZones.objects.pbzones);
        naFortData = topojson.feature(pbZones, pbZones.objects.forts);
        naTowerData = topojson.feature(pbZones, pbZones.objects.towers);

        naSetupCanvas();

        naDisplayCountries();
        naDisplayTeleportAreas();
        naDisplayPorts();
    }

    d3
        .queue()
        .defer(d3.json, naMapJson)
        .defer(d3.json, pbJson)
        .await(naReady);
}

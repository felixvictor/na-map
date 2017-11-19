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
import { zoom as d3Zoom } from "d3-zoom";

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
            zoom: d3Zoom
        },
        topojson = {
            feature: topojsonFeature
        };

    let naSvg, naDefs, naZoom;
    let gPorts, gPBZones, gCountries, gVoronoi, naPort;
    let naPortData, naPBZoneData, naFortData, naTowerData;
    let IsZoomed = false,
        HasLabelRemoved = false;
    const portCircleSize = 10,
        portLabelDx = 10,
        portLabelDy = 20;
    const naWidth = 8196,
        naHeight = 8196;
    const naFontSize = parseInt(window.getComputedStyle(document.getElementById("na")).fontSize);
    const naMapJson = serverName + ".json",
        pbJson = "pb.json",
        naImage = "images/na-map.jpg";

    function naSetupCanvas() {
        function naStopProp() {
            if (currentD3Event.defaultPrevented) {
                currentD3Event.stopPropagation();
            }
        }

        naSvg = d3
            .select("#na")
            .append("svg")
            .attr("id", "na-svg")
            .attr("width", naWidth)
            .attr("height", naHeight)
            .on("click", naStopProp, true);

        naSvg
            .append("rect")
            .attr("class", "background")
            .attr("width", naWidth)
            .attr("height", naHeight);

        naZoom = d3
            .zoom()
            .scaleExtent([0.15, 10])
            .on("zoom", naZoomed);
        naSvg.call(naZoom);

        naDefs = naSvg.append("defs");
    }

    function naZoomed() {
        const PBZonesZoomExtent = 1.5;
        const labelZoomExtent = 0.5;

        let transform = currentD3Event.transform;

        if (PBZonesZoomExtent < transform.k) {
            if (!IsZoomed) {
                naDisplayPBZones();
                IsZoomed = true;
            }
        } else {
            if (IsZoomed) {
                naRemovePBZones();
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

        gCountries.attr("transform", transform);
        gPorts.attr("transform", transform);
        gVoronoi.attr("transform", transform);
        if (IsZoomed) {
            gPBZones.attr("transform", transform);
        }

        gPorts.selectAll("circle").attr("r", portCircleSize / transform.k);
        if (!HasLabelRemoved) {
            gPorts
                .selectAll("text")
                .attr("dx", portLabelDx / transform.k)
                .attr("dy", portLabelDy / transform.k)
                .style("font-size", naFontSize / transform.k);
        }
    }

    function naDisplayCountries() {
        gCountries = naSvg.append("g").attr("class", "country");

        gCountries
            .append("image")
            .attr("width", naWidth)
            .attr("height", naHeight)
            .attr("href", naImage);
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
                .attr("viewBox", "0 0 50 50")
                .append("image")
                .attr("height", "50")
                .attr("width", "50")
                .attr("href", "icons/" + nation + ".svg");
        });

        gPorts = naSvg.append("g").attr("class", "port");

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
            .attr("id", function(d) {
                return "c" + d.id;
            })
            .attr("r", portCircleSize)
            .attr("fill", function(d) {
                return "url(#" + d.properties.nation + ")";
            })
            .on("mouseover", function(d) {
                d3
                    .select(this)
                    .attr("data-toggle", "tooltip")
                    .attr("title", function(d) {
                        return naTooltipData(d.properties);
                    });
                $("#c" + d.id)
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
            .attr("dx", portLabelDx)
            .attr("dy", portLabelDy)
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
        let naCurrentVoronoi;

        // Extract port coordinates
        let ports = naPortData.features
            // Use only ports that deep water ports and not a county capital
            .filter(function(d) {
                return !d.properties.shallow && !d.properties.countyCapital;
            })
            // Map to coordinates array
            .map(function(d) {
                return [d.geometry.coordinates[0], d.geometry.coordinates[1]];
            });

        // Append group with class .voronoi
        gVoronoi = naSvg.append("g").attr("class", "voronoi");

        let pathVoronoi = gVoronoi
            .selectAll(".voronoi")
            .data(ports)
            .enter()
            .append("path");

        // limit how far away the mouse can be from finding a voronoi site
        const voronoiRadius = naWidth / 10;
        const naVoronoi = d3.voronoi().extent([[-1, -1], [naWidth + 1, naHeight + 1]]);
        const naVoronoiDiagram = naVoronoi(ports);

        // Draw teleport areas
        pathVoronoi
            .data(naVoronoi.polygons(ports))
            .attr("d", function(d) {
                return d ? "M" + d.join("L") + "Z" : null;
            })
            .on("mouseover", function(d) {
                // get the current mouse position
                let ref = currentD3mouse(this);
                const mx = ref[0],
                    my = ref[1];

                // use the new diagram.find() function to find the voronoi site closest to
                // the mouse, limited by max distance defined by voronoiRadius
                const site = naVoronoiDiagram.find(mx, my, voronoiRadius);
                //console.log("site: " + JSON.stringify(site.data));
                //console.log("pathVoronoi._groups[0][site.index]: " + JSON.stringify(pathVoronoi._groups[0]));
                if (site) {
                    naCurrentVoronoi = pathVoronoi._groups[0][site.index];
                    naCurrentVoronoi.classList.add("highlight-voronoi");
                }
                // highlight the point if we found one, otherwise hide the highlight circle
                //naVoronoiHighlight(site.data, site.index);
            })
            .on("mouseout", function() {
                // hide the highlight circle when the mouse leaves the chart
                //naVoronoiHighlight(null);
                if (naCurrentVoronoi) {
                    naCurrentVoronoi.classList.remove("highlight-voronoi");
                }
            });
    }

    // callback to highlight a point
    function naVoronoiHighlight(d, id) {
        console.log("d: " + d);
        // no point to highlight - hide the circle and clear the text
        if (!d) {
            d3.select("#p" + id).attr("r", 10);
            // otherwise, show the highlight circle at the correct position
        } else {
            d3
                .select("#p" + id)
                .style("display", "")
                .attr("r", 30);
        }
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

/*
    Draws teleport map for Naval Action

    iB 2017
 */

import { geoEquirectangular as d3geoEquirectangular, geoPath as d3GeoPath } from "d3-geo";
import { queue as d3Queue } from "d3-queue";
import { json as d3Json, request as d3Request } from "d3-request";
// event needs live-binding
import { event as currentD3Event, mouse as currentD3mouse, select as d3Select } from "d3-selection";
import { voronoi as d3Voronoi } from "d3-voronoi";
import { zoom as d3Zoom } from "d3-zoom";

import {
    layoutTextLabel as fcLayoutTextLabel,
    layoutGreedy as fcLayoutGreedy,
    layoutLabel as fcLayoutLabel
} from "d3fc-label-layout";

import { feature as topojsonFeature } from "topojson-client";

export default function naDisplay(serverName) {
    const d3 = {
            geoEquirectangular: d3geoEquirectangular,
            geoPath: d3GeoPath,
            json: d3Json,
            queue: d3Queue,
            request: d3Request,
            select: d3Select,
            voronoi: d3Voronoi,
            zoom: d3Zoom
        },
        fc = {
            layoutTextLabel: fcLayoutTextLabel,
            layoutGreedy: fcLayoutGreedy,
            layoutLabel: fcLayoutLabel
        },
        topojson = {
            feature: topojsonFeature
        };

    let naWidth, naHeight;
    let naProjection, naPath, naSvg, naDefs, naZoom;
    let gPorts, gCountries, gVoronoi, naCurrentVoronoi;
    let naCountries, naPorts;
    const naFontSize = parseInt(window.getComputedStyle(document.getElementById("na")).fontSize);
    const naMapJson = serverName + ".json";

    function naSetupProjection() {
        const naMargin = { top: 0, right: 0, bottom: 0, left: 0 };
        const minWidth = 4000;
        let naBounds, naBoundsWidth, naBoundsHeight;

        naPath = d3.geoPath().projection(naProjection);
        naWidth = document.getElementById("na").offsetWidth - naMargin.left - naMargin.right;
        naWidth = minWidth > naWidth ? minWidth : naWidth;
        naBounds = naPath.bounds(naCountries);
        naBoundsWidth = naBounds[1][0] - naBounds[0][0];
        naBoundsHeight = naBounds[1][1] - naBounds[0][1];
        naHeight = naWidth / (naBoundsWidth / naBoundsHeight) - naMargin.top - naMargin.bottom;

        naProjection = d3
            .geoEquirectangular()
            .fitExtent(
                [[-naBoundsWidth, -naBoundsHeight], [naWidth + naBoundsWidth, naHeight + naBoundsHeight]],
                naCountries
            );
        naPath = d3.geoPath().projection(naProjection);
    }

    function naSetupCanvas() {
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
            .scaleExtent([0.6, 3])
            .on("zoom", naZoomed);

        naSvg.call(naZoom);

        naDefs = naSvg.append("defs");
    }

    function naZoomed() {
        let transform = currentD3Event.transform;

        gCountries.attr("transform", transform);
        gPorts.attr("transform", transform);
        gVoronoi.attr("transform", transform);

        gPorts.selectAll(".label text").style("font-size", function(d) {
            return naFontSize / transform.k;
        });

        gPorts.selectAll(".label circle").attr("r", 10 / transform.k);
    }

    function naStopProp() {
        if (currentD3Event.defaultPrevented) {
            currentD3Event.stopPropagation();
        }
    }

    function naDisplayCountries() {
        gCountries = naSvg.append("g");

        gCountries
            .append("path")
            .attr("class", "na-country")
            .datum(naCountries)
            .attr("d", naPath);
    }

    function naDisplayPorts() {
        const labelPadding = 3;

        const naNations = ["DE", "DK", "ES", "FR", "FT", "GB", "NL", "NT", "PL", "PR", "RU", "SE", "US"];

        naNations.forEach(function(nation) {
            naDefs
                .append("pattern")
                .attr("id", nation)
                .attr("width", "100%")
                .attr("height", "100%")
                .attr("viewBox", "0 0 50 50")
                .append("image")
                .attr("x", "0")
                .attr("y", "0")
                .attr("height", "50")
                .attr("width", "50")
                .attr("xlink:href", "icons/" + nation + ".svg");
        });

        // the component used to render each label
        let textLabel = fc
            .layoutTextLabel()
            .padding(labelPadding)
            .value(function(d) {
                return d.properties.name;
            });

        let strategy = fc.layoutGreedy();

        // create the layout that positions the labels
        let labels = fc
            .layoutLabel(strategy)
            .size(function(_, i, g) {
                // measure the label and add the required padding
                let textSize = d3
                    .select(g[i])
                    .select("text")
                    .node()
                    .getBBox();
                return [textSize.width, textSize.height];
            })
            .position(function(d) {
                return naProjection(d.geometry.coordinates);
            })
            .component(textLabel);

        // render!
        gPorts = naSvg
            .append("g")
            .datum(naPorts.features)
            .call(labels);

        // Port text colour
        gPorts
            .selectAll(".label text")
            .attr("dx", 10)
            .attr("class", function(d) {
                let f;
                if (!d.properties.shallow && !d.properties.countyCapital) {
                    f = "na-port-in";
                } else {
                    f = "na-port-out";
                }
                return f;
            });

        gPorts.selectAll(".label rect").attr("class", "label-rect");

        // Port circle colour and size
        gPorts
            .selectAll(".label circle")
            .attr("id", function(d) {
                return "p" + d.properties.id;
            })
            .attr("r", 10)
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
                $("#p" + d.properties.id)
                    .tooltip({
                        delay: { show: 100, hide: 100 },
                        html: true,
                        placement: "auto"
                    })
                    .tooltip("show");
            });
    }

    function naTooltipData(d) {
        let h;
        h = "<table><tbody<tr><td><i class='flag-icon " + d.nation + "'></i></td>";
        h += "<td class='port-name'>" + d.name + "</td></tr></tbody></table>";
        h += "<p>" + (d.shallow ? "Shallow" : "Deep");
        h += " water port";
        if (d.countyCapital) {
            h += ", county capital";
        }
        if (d.capturer) {
            h += ", owned by " + d.capturer;
        }
        if (!d.nonCapturable) {
            h += ", " + d.brLimit + " BR limit, ";
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
            h += ", not capturable";
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

    function naDisplayTeleportAreas() {
        // Extract port coordinates
        let ports = naPorts.features
            // Use only ports that deep water ports and not a county capital
            .filter(function(d) {
                return !d.properties.shallow && !d.properties.countyCapital;
            })
            // Map to coordinates array
            .map(function(d) {
                return [d.geometry.coordinates[0], d.geometry.coordinates[1]];
            });

        // Append group with class .voronoi
        gVoronoi = naSvg
            .append("g")
            .attr("class", "voronoi")
            .call(naZoom)
            .selectAll(".voronoi")
            .data(ports)
            .enter()
            .append("g");

        // limit how far away the mouse can be from finding a voronoi site
        const voronoiRadius = naWidth / 10;
        const naVoronoi = d3.voronoi().extent([[-1, -1], [naWidth + 1, naHeight + 1]]);
        const naVoronoiDiagram = naVoronoi(ports.map(naProjection));

        // Draw teleport areas
        gVoronoi
            .append("path")
            .data(naVoronoi.polygons(ports.map(naProjection)))
            .attr("d", function(d) {
                return d ? "M" + d.join("L") + "Z" : null;
            })
            .attr("pointer-events", "visibleFill")
            .on("mouseover", function(d) {
                // get the current mouse position
                let ref = currentD3mouse(this);
                const mx = ref[0],
                    my = ref[1];

                // use the new diagram.find() function to find the voronoi site closest to
                // the mouse, limited by max distance defined by voronoiRadius
                const site = naVoronoiDiagram.find(mx, my, voronoiRadius);
                //console.log("site: " + site.index);
                naCurrentVoronoi = gVoronoi._groups[0][site.index];
                naCurrentVoronoi.classList.add("highlight-voronoi");
                // highlight the point if we found one, otherwise hide the highlight circle
                //naVoronoiHighlight(site.data, site.index);
            })
            .on("mouseout", function() {
                // hide the highlight circle when the mouse leaves the chart
                //naVoronoiHighlight(null);
                naCurrentVoronoi.classList.remove("highlight-voronoi");
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

    function naReady(error, naMap) {
        if (error) {
            throw error;
        }

        // Read map data
        naCountries = topojson.feature(naMap, naMap.objects.countries);
        naPorts = topojson.feature(naMap, naMap.objects.ports);

        naSetupProjection();
        naSetupCanvas();

        naDisplayTeleportAreas();
        naDisplayCountries();
        naDisplayPorts();
    }

    d3
        .queue()
        .defer(d3.json, naMapJson)
        .await(naReady);
}

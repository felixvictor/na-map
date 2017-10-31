/*
    Draws teleport map for Naval Action

    iB 2017
 */

import { geoEquirectangular as d3geoEquirectangular, geoPath as d3GeoPath } from "d3-geo";
import { queue as d3Queue } from "d3-queue";
import { json as d3Json, request as d3Request } from "d3-request";
// event needs live-binding
import { event as currentD3Event, select as d3Select } from "d3-selection";
import { voronoi as d3Voronoi } from "d3-voronoi";
import { zoom as d3Zoom } from "d3-zoom";

import {
    layoutTextLabel as fcLayoutTextLabel,
    layoutGreedy as fcLayoutGreedy,
    layoutLabel as fcLayoutLabel
} from "d3fc-label-layout";

import { feature as topojsonFeature } from "topojson-client";

export default function naDisplay() {
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
    let gPorts, gCountries, gVoronoi;
    let naCountries, naPorts;
    const naMapJson = "na.json";

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
        const transform = currentD3Event.transform;

        gCountries.attr("transform", transform);
        gPorts.attr("transform", transform);
        gVoronoi.attr("transform", transform);

        gPorts.selectAll(".label text").style("font-size", function(d) {
            let f;
            if (!d.properties.shallow && !d.properties.countyCapital) {
                f = "14 / transform.k";
            } else {
                f = "14 / transform.k";
            }
            return f;
        });

        gPorts.selectAll(".label circle").attr("r", 10 / transform.k);
    }

    function naStopProp() {
        if (currentD3Event.defaultPrevented) {
            currentD3Event.stopPropagation();
        }
    }

    function naDisplayCountries() {
        let naFilter = naDefs.append("filter").attr("id", "border");

        naFilter
            .append("feColorMatrix")
            .attr("in", "SourceGraphic")
            .attr("type", "matrix")
            .attr("values", "0 0 0 0 0.6  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 1 0")
            .attr("result", "f1coloredMask");

        naFilter
            .append("feGaussianBlur")
            .attr("in", "f1coloredMask")
            .attr("stdDeviation", 15)
            .attr("result", "f1blur");

        naFilter
            .append("feColorMatrix")
            .attr("in", "SourceGraphic")
            .attr("type", "matrix")
            .attr("values", "0 0 0 0 0   0 0 0 0 0   0 0 0 0 0   0 0 0 500 0")
            .attr("result", "f2mask");
        naFilter
            .append("feMorphology")
            .attr("in", "f2mask")
            .attr("radius", "1")
            .attr("operator", "erode")
            .attr("result", "f2r1");
        naFilter
            .append("feGaussianBlur")
            .attr("in", "f2r1")
            .attr("stdDeviation", "4")
            .attr("result", "f2r2");
        naFilter
            .append("feColorMatrix")
            .attr("in", "f2r2")
            .attr("type", "matrix")
            .attr("values", "1 0 0 0 0.58  0 1 0 0 0.36  0 0 1 0 0.11  0 0 0 -1 1")
            .attr("result", "f2r3");
        naFilter
            .append("feComposite")
            .attr("operator", "in")
            .attr("in", "f2r3")
            .attr("in2", "f2mask")
            .attr("result", "f2comp");

        let feMerge = naFilter.append("feMerge");
        feMerge.append("feMergeNode").attr("in", "f1blur");
        feMerge.append("feMergeNode").attr("in", "f2comp");
        feMerge.append("feMergeNode").attr("in", "SourceGraphic");

        gCountries = naSvg.append("g");

        gCountries
            .append("path")
            .attr("class", "na-country")
            .datum(naCountries)
            .attr("d", naPath)
            .style("filter", "url(#border)");
    }

    function naDisplayPorts() {
        const labelPadding = 3;

        const naNations = 12;

        for (let i = 0; i <= naNations; i++) {
            naDefs
                .append("pattern")
                .attr("id", "n" + i)
                .attr("x", "0%")
                .attr("y", "0%")
                .attr("width", "100%")
                .attr("height", "100%")
                .attr("viewBox", "0 0 50 50")
                .append("image")
                .attr("x", "0")
                .attr("y", "0")
                .attr("height", "50")
                .attr("width", "50")
                .attr("xlink:href", "icons/n" + i + ".svg");
        }

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
            .attr("r", 10)
            .attr("fill", function(d) {
                return "url(#" + d.properties.nation + ")";
            })
            .attr("data-toggle", "tooltip")
            .attr("title", function(d) {
                return naTooltip(d.properties);
            });
    }

    function naTooltip(d) {
        let h;
        h = "<table><tbody<tr><td class='align-middle'><i class='flag-icon " + d.nation + "'></i></td>";
        h += "<td class='align-middle port-name'>" + d.name + "</td></tr></tbody></table>";
        h += "<p class='text-left'>" + (d.shallow ? "Shallow" : "Deep");
        h += " water port";
        if (d.countyCapital) {
            h += ", county capital";
        }
        h += ", " + d.brLimit + " BR limit";
        if (d.capturer) {
            h += ", owned by " + d.capturer;
        }
        h += "</p>";
        h += "<table class='table table-sm'>";
        if (d.produces.length) {
            h +=
                "<tr><th scope='row' class='text-left'>Produces</th><td class='text-left'>" +
                d.produces.join(", ") +
                "</td></tr>";
        }
        if (d.drops.length) {
            h +=
                "<tr><th scope='row' class='text-left'>Drops</th><td class='text-left'>" + d.drops.join(", ") + "</tr>";
        }
        if (d.consumes.length) {
            h +=
                "<tr><th scope='row' class='text-left'>Consumes</th><td class='text-left'>" +
                d.consumes.join(", ") +
                "</tr>";
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

        // Draw teleport areas
        gVoronoi
            .append("path")
            .data(
                d3
                    .voronoi()
                    .extent([[-1, -1], [naWidth + 1, naHeight + 1]])
                    .polygons(ports.map(naProjection))
            )
            .attr("d", function(d) {
                return d ? "M" + d.join("L") + "Z" : null;
            });
    }

    // Replace nation with live data from server
    function naSetNation(naServerData) {
        naPorts.features.map(function(d) {
            // Ports from external json
            let t = Ports.filter(function(live) {
                return live.Id === d.properties.id;
            });
            d.properties.nation = "n" + t[0].Nation;
            d.properties.capturer = t[0].Capturer;
        });
    }

    function naReady(error, naMap, naServerData) {
        if (error) {
            throw error;
        }

        // Read map data
        naCountries = topojson.feature(naMap, naMap.objects.countries);
        naPorts = topojson.feature(naMap, naMap.objects.ports);

        naSetupProjection();
        naSetupCanvas();

        naSetNation(naServerData);
        naDisplayTeleportAreas();
        naDisplayCountries();
        naDisplayPorts();
    }

    d3
        .queue()
        .defer(d3.json, naMapJson)
        .await(naReady);
}

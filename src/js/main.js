/*
    Draws teleport map for Naval Action

    iB 2017
 */

import { geoEquirectangular as d3geoEquirectangular, geoPath as d3GeoPath } from "d3-geo";
import { json as d3Json } from "d3-request";
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

naDisplay();

function naDisplay() {
    const d3 = {
            geoEquirectangular: d3geoEquirectangular,
            geoPath: d3GeoPath,
            json: d3Json,
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
    let naProjection, naPath, naSvg, gPorts, gCountries, gVoronoi, naZoom;
    let naCountries, naPorts;
    let naJson = "50m-na.json";

    function naSetupProjection() {
        const naMargin = { top: 0, right: 0, bottom: 0, left: 0 };
        const minWidth = 4000;
        let naBounds, naBoundsWidth, naBoundsHeight;

        naPath = d3.geoPath().projection(naProjection);
        naWidth = document.getElementById("na").offsetWidth - naMargin.left - naMargin.right;
        naWidth = minWidth > naWidth ? minWidth : naWidth;
        naBounds = naPath.bounds(naPorts);
        naBoundsWidth = naBounds[1][0] - naBounds[0][0];
        naBoundsHeight = naBounds[1][1] - naBounds[0][1];
        naHeight = naWidth / (naBoundsWidth / naBoundsHeight) - naMargin.top - naMargin.bottom;
        naProjection = d3.geoEquirectangular().fitExtent([[-40, -50], [naWidth, naHeight]], naCountries);
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
            .scaleExtent([1, 3])
            .on("zoom", naZoomed);

        naSvg.call(naZoom);
    }

    function naZoomed() {
        naSvg.attr("transform", currentD3Event.transform);
    }

    function naStopProp() {
        if (currentD3Event.defaultPrevented) {
            currentD3Event.stopPropagation();
        }
    }

    function naDisplayCountries() {
        gCountries = naSvg
            .append("g")
            .attr("class", "na-country")
            .append("path")
            .datum(naCountries)
            .attr("d", naPath);
    }

    function naDisplayPorts() {
        const labelPadding = 3;

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
                return [textSize.width + labelPadding * 2, textSize.height + labelPadding * 2];
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
        gPorts.selectAll(".label text").attr("class", function(d) {
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
            .attr("r", 4)
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

    d3.json(naJson, function(error, naMap) {
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
    });
}

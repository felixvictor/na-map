/*
    Draws teleport map for Naval Action

    iB 2017
 */

import { geoEquirectangular as d3geoEquirectangular, geoPath as d3GeoPath } from "d3-geo";
import { json as d3Json } from "d3-request";
import { event as d3Event, select as d3Select } from "d3-selection";
import { voronoi as d3Voronoi } from "d3-voronoi";
import { zoom as d3Zoom } from "d3-zoom";

import {
    layoutTextLabel as fcLayoutTextLabel,
    layoutGreedy as fcLayoutGreedy,
    layoutLabel as fcLayoutLabel
} from "d3fc-label-layout";

import { feature as topojsonFeature } from "topojson-client";

jQuery(document).ready(function($) {
    "use strict";

    naDisplay();
});

function naDisplay() {
    const d3 = {
            event: d3Event,
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
    let naProjection, naPath, naSvg;
    let naCountries, naPorts;
    let naJson = "50m-na.json";

    function naSetupProjection() {
        const naMargin = { top: 0, right: 0, bottom: 0, left: 0 };
        const minWidth = 768;

        naPath = d3.geoPath().projection(naProjection);
        naWidth = document.getElementById("na").offsetWidth - naMargin.left - naMargin.right;
        naWidth = minWidth > naWidth ? minWidth : naWidth;
        const naBounds = naPath.bounds(naPorts);
        const naBoundsWidth = naBounds[1][0] - naBounds[0][0];
        const naBoundsHeight = naBounds[1][1] - naBounds[0][1];
        naHeight = naWidth / (naBoundsWidth / naBoundsHeight) - naMargin.top - naMargin.bottom;
        naProjection = d3
            .geoEquirectangular()
            .fitExtent([[-naBoundsWidth / 2, -naBoundsHeight], [naWidth, naHeight]], naCountries);
        naPath = d3.geoPath().projection(naProjection);
    }

    function naSetupCanvas() {
        naSvg = d3
            .select("#na")
            .append("svg")
            .attr("id", "na-svg")
            .attr("width", naWidth)
            .attr("height", naHeight);
    }

    function naDisplayCountries() {
        naSvg
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
        naSvg
            .append("g")
            .datum(naPorts.features)
            .call(labels);

        // Port text colour
        naSvg.selectAll(".label text").attr("class", function(d) {
            let f;
            if (!d.properties.shallow && !d.properties.countyCapital) {
                f = "na-port-in";
            } else {
                f = "na-port-out";
            }
            return f;
        });

        naSvg.selectAll(".label rect").attr("class", "label-rect");

        // Port circle colour and size
        naSvg
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
        let port = naSvg
            .append("g")
            .attr("class", "voronoi")
            .selectAll(".voronoi")
            .data(ports)
            .enter()
            .append("g");

        // Draw teleport areas
        port
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

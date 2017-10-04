/*

 */

jQuery(document).ready(function ($) {
    "use strict";

    naDisplay();
});

function naDisplay() {
    var naWidth, naHeight, naTopo, naCities, naBounds, naProjection, naPath, naSvg, naG, naLHeight;
    var naCountries, naPorts;
    var naJson = "topojson/50m-na.json";

    function naSetupColours() {
    }

    function naSetupProjection() {
        // http://stackoverflow.com/questions/14492284/center-a-map-in-d3-given-a-geojson-object
        naProjection = d3
            .geoEquirectangular()
            .scale(1)
            .translate([0, 0]);
        naPath = d3.geoPath()
            .projection(naProjection);
    }

    function naUpdateProjection() {
        const naMargin = {top: 0, right: 0, bottom: -50, left: 0};
        var naScale, naTranslate, boundsWidth, boundsHeight;

        naWidth = document.getElementById("na").offsetWidth - naMargin.left - naMargin.right;
        naWidth = 768 > naWidth ? 768 : naWidth;
        boundsWidth = naBounds[1][0] - naBounds[0][0];
        boundsHeight = naBounds[1][1] - naBounds[0][1];
        naHeight = naWidth / (boundsWidth / boundsHeight) - naMargin.top - naMargin.bottom;
        naScale = 1 / Math.max(boundsWidth / naWidth, boundsHeight / naHeight);
        naTranslate = [
            (naWidth - naScale * (naBounds[1][0] + naBounds[0][0])) / 2,
            (naHeight - naScale * (naBounds[1][1] + naBounds[0][1])) / 2
        ];
        naProjection.scale(naScale).translate(naTranslate);
    }

    function naSetupCanvas() {
        naSvg = d3
            .select("#na")
            .append("svg")
            .attr("width", naWidth)
            .attr("height", naHeight)
            .attr("id", "na-svg");

        //naG = naSvg.append("g").attr("id", "na-path");
    }

    function naDisplayCountries() {
        naSvg.append("path")
            .datum(naCountries)
            .attr("class", "na-country")
            .attr("d", naPath);
    }


    function naDisplayPorts() {

        naSvg
            .append("path")
            .datum(naPorts)
            .attr("class", "na-port")
            .attr("d", naPath);

        /*
        naSvg
            .selectAll(".label")
            .data(naPorts.features)
            .enter()
            .append("g")
            .attr("class", "na-team-name")
            .attr("transform", function (d) {
                return "translate(" + naPath.centroid(d) + ")";
            });

        const labelPadding = 3;

        // the component used to render each label
        var textLabel = fc
            .layoutTextLabel()
            .padding(labelPadding)
            .value(function (d) {
                return d.properties.name + " (" + d.properties.nation + ")";
            });

        //var strategy = fc.layoutAnnealing();
        var strategy = fc.layoutGreedy();

        // create the layout that positions the labels
        var labels = fc
            .layoutLabel(strategy)
            .size(function (_, i, g) {
                // measure the label and add the required padding
                var textSize = d3
                    .select(g[i])
                    .select("text")
                    .node()
                    .getBBox();
                return [textSize.width + labelPadding * 2, textSize.height + labelPadding * 2];
            })
            .position(function (d) {
                return naProjection(d.geometry.coordinates);
            })
            .component(textLabel);

        // render!
        naSvg.datum(naPorts.features).call(labels);

        naSvg.selectAll(".label text").attr("fill", function (d) {
            return bettyContrastColour(naColorScaleCKmeans(d.properties.count), textColourBright, textColourDark);
        });

        naSvg.selectAll(".label rect").attr("fill", function (d) {
            var f;
            if (undefined === d.properties.count) {
                f = naFirstColour;
            } else {
                f = naColorScaleCKmeans(d.properties.count);
            }
            return f;
        });

        naSvg
            .selectAll(".label")
            .attr("data-toggle", "tooltip")
            .attr("data-html", "true")

        */

        /*
        .attr("title", function (d) {
            var html = "";
            if (undefined !== d.properties.count) {
                if ("t" === bettyTableParam.tournamentType) {
                    html = "<i class='flag-icon trnmnt " + d.properties.iso2.toLowerCase() + "'></i>";
                    html += d.properties.name;
                } else {
                    html = "<i class='flag-icon lg " + d.properties.teamShortName + "'></i>";
                    html += d.properties.teamName;
                }
                html += ": ";
                html += 0 === d.properties.count ? "Keine" : d.properties.count;
                html += 1 < d.properties.count ? " Stimmen" : " Stimme";
            }
            return html;
        });
        */
    }


    /*
        d3.queue()
            .defer(d3.json, naJson)
            .await(ready);

        function ready(error, naMap) {
            if (error) throw error;

            var projection = d3.geoEquirectangular();

            var path = d3.geoPath()
                .projection(projection)
                .pointRadius(1.5)
            ;

            naSvg.append("path")
                .datum(topojson.feature(naMap, naMap.objects.countries))
                .attr("class", "land")
                .attr("d", path);
            naSvg.append("path")
                .datum(topojson.feature(naMap, naMap.objects.ports))
                .attr("class", "points")
                .attr("d", path);

            svg.append("path")
                .datum(d3.voronoi()
                    .extent([[-1, -1], [width + 1, height + 1]])
                    .polygons(airports.map(projection)))
                .attr("class", "voronoi")
                .attr("d", function(d) {
                    return "M" + d
                        .filter(function(d) { return d != null; })
                        .map(function(d) { return d.join("L"); })
                        .join("ZM") + "Z";
                });
        }
    */

    d3.json(naJson, function (error, naMap) {
        if (error) throw error;

        naCountries = topojson.feature(naMap, naMap.objects.countries);
        naPorts = topojson.feature(naMap, naMap.objects.ports);
        console.log("naPorts: ", naPorts.features);
        /*
        naTopo.forEach(function (f) {
            const naCountryDetail = naBets.filter(function (a) {
                return a.region === f.properties.iso;
            });
            if (0 < naCountryDetail.length) {
                f.properties.count = naCountryDetail[0].count;
                f.properties.name = naCountryDetail[0].name;
                f.properties.iso2 = naCountryDetail[0].iso2;
            }
        });
        */

        naSetupColours();
        naSetupProjection();
        // update projection
        naBounds = naPath.bounds(topojson.feature(naMap, naMap.objects.countries));
        naUpdateProjection();
        naSetupCanvas();
        naDisplayCountries();

        naLHeight = window.getComputedStyle(document.getElementById("na")).getPropertyValue("line-height");
        naDisplayPorts();

        var ports = naPorts.features.map(function (d) {
            return [d.geometry.coordinates[0], d.geometry.coordinates[1]];
        });
        //console.log("ports: ", ports);


        var port = naSvg
            .selectAll(".voronoi")
            .data(ports)
            .enter().append("g")
            .attr("class", "voronoi");

        port.append("path")
            .data(d3.voronoi()
                .extent([[-1, -1], [naWidth + 1, naHeight + 1]])
                .polygons(ports.map(naProjection))
            )
            .attr("d", function (d) {
                //console.log("d: " + d);
                return d ? "M" + d.join("L") + "Z" : null;
            })
        ;
    });
}

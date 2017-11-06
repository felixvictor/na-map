
function naDisplayTeleportAreas() {
    // Extract port coordinates
    let ports = naPorts.features
    // Use only ports that deep water ports and not a county capital
        .filter(function(d) {
            return !d.properties.shallow && !d.properties.countyCapital;
        })
        // Map to coordinates array
        .map(function(d) {
            return { coord: [d.geometry.coordinates[0], d.geometry.coordinates[1]], id: d.properties.id };
            //                return [d.geometry.coordinates[0], d.geometry.coordinates[1]];
        });
    let projectedPorts = ports
    // Map to coordinates array
        .map(function(d) {
            return d.coord;
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

    const naVoronoiDiagram = naVoronoi(projectedPorts.map(naProjection));
    console.log("ports", projectedPorts);
    console.log("ports.map(naProjection)", projectedPorts.map(naProjection));
    // Draw teleport areas
    gVoronoi
        .append("path")
        .data(naVoronoi.polygons(ports.coord.map(naProjection)))
        .attr("id", function(d) {
            //console.log("d: ", d);
            return "v" + d.id;
        })
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
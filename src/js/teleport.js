/*
	teleport.js
*/

/* global d3 : false
 */

export default class Teleport {
    constructor(minCoord, maxCoord, ports) {
        this.ports = ports;
        this.showTeleportAreas = false;
        this.voronoiCoord = [[minCoord - 1, minCoord - 1], [maxCoord + 1, maxCoord + 1]];
        this.teleportPorts = this.getPortData();
        this.voronoiDiagram = this.getVoronoiDiagram();
        this.teleportData = {};
        this.highlightId = null;
        this.g = d3.select("#na-svg")
            .insert("g", ".port")
            .classed("voronoi", true);

        this.setupListener();
    }

    setupListener() {
        $("#show-teleport")
            .on("click", event => event.stopPropagation())
            .on("change", () => {
                const $input = $("#show-teleport");

                this.showTeleportAreas = $input.is(":checked");
                this.updateTeleportAreas();
            });
    }

    getPortData() {
        // Use only ports that deep water ports and not a county capital
        return (
            this.ports.portDataDefault
                .filter(d => !d.properties.shallow && !d.properties.countyCapital)
                // Map to coordinates array
                .map(d => ({
                    id: d.id,
                    coord: {
                        x: d.geometry.coordinates[0],
                        y: d.geometry.coordinates[1]
                    }
                }))
        );
    }

    getVoronoiDiagram() {
        return d3.voronoi()
            .extent(this.voronoiCoord)
            .x(d => d.coord.x)
            .y(d => d.coord.y)(this.teleportPorts);
    }

    setTeleportData(teleportLevel) {
        if (this.showTeleportAreas && teleportLevel) {
            this.teleportData = this.voronoiDiagram.polygons();
        } else {
            this.teleportData = {};
        }
        this.highlightId = null;
    }

    mouseover(event) {
        // console.log(event);
        /*
        const ref = d3.mouse(nodes[i]),
            mx = ref[0],
            my = ref[1];

        // use the new diagram.find() function to find the voronoi site closest to
        // the mouse, limited by max distance defined by voronoiRadius
        console.log("mouseover ", this.voronoiDiagram);
        const site = this.getVoronoiDiagram().find(mx, my, this.voronoiRadius);
        if (site) {
            this.highlightId = site.data.id;
            this.updateTeleportAreas();
            // update(zoomLevel);
        }
        */
        this.highlightId = event.data.id;
        this.updateTeleportAreas();
        this.ports.update(this.highlightId);
    }

    updateTeleportAreas() {
        // Data join
        const pathUpdate = this.g.selectAll("path").data(this.teleportData, d => d.data.id);

        // Remove old paths
        pathUpdate.exit().remove();

        // Update kept paths
        // pathUpdate; // not needed

        // Add new paths (teleport areas)
        const pathEnter = pathUpdate
            .enter()
            .append("path")
            .attr("d", d => (d ? `M${d.join("L")}Z` : null))
            .on("mouseover", event => this.mouseover(event));

        // Apply to both old and new
        pathUpdate.merge(pathEnter).classed("highlight-voronoi", d => d.data.id === this.highlightId);
    }

    transform(transform) {
        this.g.attr("transform", transform);
    }
}
